import { describe, expect, it } from "vitest";
import {
  calcularAnticipoDeclaracionEstimada,
  calcularConciliacionFiscal,
  calcularISLRTarifaProgresiva,
  calcularRebajaPorNuevasInversiones,
  calcularRetencionISLR,
  type TramoISLR,
} from "@/lib/motores/islr";
import type { ValorConFuente } from "@/lib/motores/tipos";

const parametro = (valor: number, fecha = "2026-01-01"): ValorConFuente => ({
  valor,
  fecha,
  fuenteOficial: "Parámetro de prueba",
  verificado: true,
});

describe("calcularRetencionISLR", () => {
  it("calcula la retención simple (sin sustraendo, persona jurídica)", () => {
    const r = calcularRetencionISLR({
      montoSujetoARetencion: 10000,
      porcentajeRetencion: parametro(5),
    });
    expect(r.montoRetenido).toBe(500);
  });

  it("aplica el sustraendo en UT para persona natural residente", () => {
    const r = calcularRetencionISLR({
      montoSujetoARetencion: 10000,
      porcentajeRetencion: parametro(3),
      sustraendoUT: parametro(10, "2026-01-01"),
      valorUT: parametro(9, "2026-01-01"),
    });
    // retencionBruta = 300; sustraendoVES = 10*9=90; 300-90=210
    expect(r.montoRetenido).toBe(210);
  });

  it("no retiene un monto negativo si el sustraendo supera la retención bruta", () => {
    const r = calcularRetencionISLR({
      montoSujetoARetencion: 100,
      porcentajeRetencion: parametro(3),
      sustraendoUT: parametro(100, "2026-01-01"),
      valorUT: parametro(9, "2026-01-01"),
    });
    expect(r.montoRetenido).toBe(0);
  });

  it("rechaza sustraendoUT sin valorUT", () => {
    expect(() =>
      calcularRetencionISLR({
        montoSujetoARetencion: 100,
        porcentajeRetencion: parametro(3),
        sustraendoUT: parametro(10),
      }),
    ).toThrow(/valorUT/);
  });

  it("rechaza porcentaje fuera de 0-100", () => {
    expect(() =>
      calcularRetencionISLR({ montoSujetoARetencion: 100, porcentajeRetencion: parametro(150) }),
    ).toThrow(/0 y 100/);
  });
});

describe("calcularConciliacionFiscal", () => {
  it("suma no deducibles y resta no gravables de la utilidad contable", () => {
    const r = calcularConciliacionFiscal({
      utilidadContableAntesISLR: 100000,
      partidasNoDeducibles: 20000,
      partidasNoGravables: 15000,
    });
    expect(r.enriquecimientoNetoFiscal).toBe(105000);
  });

  it("puede dar un enriquecimiento fiscal menor que la utilidad contable", () => {
    const r = calcularConciliacionFiscal({
      utilidadContableAntesISLR: 100000,
      partidasNoDeducibles: 0,
      partidasNoGravables: 30000,
    });
    expect(r.enriquecimientoNetoFiscal).toBe(70000);
  });

  it("rechaza partidas negativas (el signo ya está implícito en la categoría)", () => {
    expect(() =>
      calcularConciliacionFiscal({
        utilidadContableAntesISLR: 100000,
        partidasNoDeducibles: -1,
        partidasNoGravables: 0,
      }),
    ).toThrow(/no pueden ser negativas/);
  });
});

describe("calcularISLRTarifaProgresiva", () => {
  // Tabla de tramos ilustrativa (3 tramos), NO es la tarifa oficial real.
  const tramosDePrueba: TramoISLR[] = [
    { numeroTramo: 1, limiteInferiorUT: 0, limiteSuperiorUT: 1000, porcentaje: 6, sustraendoUT: 0 },
    { numeroTramo: 2, limiteInferiorUT: 1000, limiteSuperiorUT: 3000, porcentaje: 15, sustraendoUT: 90 },
    { numeroTramo: 3, limiteInferiorUT: 3000, limiteSuperiorUT: null, porcentaje: 25, sustraendoUT: 390 },
  ];

  it("aplica el primer tramo cuando el enriquecimiento cae en su rango", () => {
    const r = calcularISLRTarifaProgresiva({
      enriquecimientoNetoFiscal: 4500, // 500 UT a valorUT=9
      valorUT: parametro(9),
      tramos: tramosDePrueba,
    });
    expect(r.enriquecimientoNetoUT).toBe(500);
    expect(r.tramoAplicado.numeroTramo).toBe(1);
    expect(r.impuestoUT).toBeCloseTo(30, 6); // 500*0.06 - 0
  });

  it("aplica el segundo tramo y su sustraendo", () => {
    const r = calcularISLRTarifaProgresiva({
      enriquecimientoNetoFiscal: 18000, // 2000 UT
      valorUT: parametro(9),
      tramos: tramosDePrueba,
    });
    expect(r.tramoAplicado.numeroTramo).toBe(2);
    expect(r.impuestoUT).toBeCloseTo(2000 * 0.15 - 90, 6); // 210
    expect(r.impuestoVES).toBeCloseTo(210 * 9, 6);
  });

  it("aplica el último tramo sin límite superior", () => {
    const r = calcularISLRTarifaProgresiva({
      enriquecimientoNetoFiscal: 45000, // 5000 UT
      valorUT: parametro(9),
      tramos: tramosDePrueba,
    });
    expect(r.tramoAplicado.numeroTramo).toBe(3);
    expect(r.impuestoUT).toBeCloseTo(5000 * 0.25 - 390, 6); // 860
  });

  it("rechaza enriquecimiento neto negativo", () => {
    expect(() =>
      calcularISLRTarifaProgresiva({
        enriquecimientoNetoFiscal: -1,
        valorUT: parametro(9),
        tramos: tramosDePrueba,
      }),
    ).toThrow(/negativo/);
  });

  it("rechaza una tabla de tramos vacía", () => {
    expect(() =>
      calcularISLRTarifaProgresiva({ enriquecimientoNetoFiscal: 1000, valorUT: parametro(9), tramos: [] }),
    ).toThrow(/al menos un tramo/);
  });
});

describe("calcularRebajaPorNuevasInversiones", () => {
  it("aplica la rebaja completa cuando no excede el impuesto determinado", () => {
    const r = calcularRebajaPorNuevasInversiones({
      montoInversion: 100000,
      porcentajeRebaja: parametro(10),
      impuestoDeterminado: 50000,
    });
    expect(r.rebajaCalculada).toBe(10000);
    expect(r.rebajaAplicada).toBe(10000);
    expect(r.impuestoNeto).toBe(40000);
  });

  it("limita la rebaja aplicada al impuesto determinado", () => {
    const r = calcularRebajaPorNuevasInversiones({
      montoInversion: 1000000,
      porcentajeRebaja: parametro(10),
      impuestoDeterminado: 50000,
    });
    expect(r.rebajaCalculada).toBe(100000);
    expect(r.rebajaAplicada).toBe(50000);
    expect(r.impuestoNeto).toBe(0);
  });
});

describe("calcularAnticipoDeclaracionEstimada", () => {
  it("calcula el anticipo como porcentaje del impuesto del ejercicio anterior", () => {
    const r = calcularAnticipoDeclaracionEstimada({
      impuestoDelEjercicioAnterior: 100000,
      porcentajeAnticipo: parametro(80),
    });
    expect(r.anticipoEstimado).toBe(80000);
  });

  it("rechaza impuesto del ejercicio anterior negativo", () => {
    expect(() =>
      calcularAnticipoDeclaracionEstimada({
        impuestoDelEjercicioAnterior: -1,
        porcentajeAnticipo: parametro(80),
      }),
    ).toThrow(/negativo/);
  });
});
