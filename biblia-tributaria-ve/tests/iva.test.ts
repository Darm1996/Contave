import { describe, expect, it } from "vitest";
import {
  calcularDeclaracionIVAMensual,
  calcularIVADocumento,
  calcularProrrateoCreditoFiscal,
  calcularRetencionIVA,
} from "@/lib/motores/iva";
import type { ValorConFuente } from "@/lib/motores/tipos";

// Valores ilustrativos para las pruebas — NO son la alícuota oficial vigente.
const parametro = (valor: number, fecha = "2026-01-01"): ValorConFuente => ({
  valor,
  fecha,
  fuenteOficial: "Parámetro de prueba",
  verificado: true,
});

describe("calcularIVADocumento", () => {
  it("calcula el IVA como base × alícuota/100", () => {
    const r = calcularIVADocumento({ baseImponibleGravada: 1000, alicuota: parametro(16) });
    expect(r.montoIVA).toBe(160);
  });

  it("es cero si la base imponible es cero", () => {
    const r = calcularIVADocumento({ baseImponibleGravada: 0, alicuota: parametro(16) });
    expect(r.montoIVA).toBe(0);
  });

  it("rechaza base imponible negativa", () => {
    expect(() => calcularIVADocumento({ baseImponibleGravada: -1, alicuota: parametro(16) })).toThrow(
      /baseImponibleGravada/,
    );
  });

  it("rechaza alícuota negativa", () => {
    expect(() => calcularIVADocumento({ baseImponibleGravada: 1000, alicuota: parametro(-1) })).toThrow(
      /alícuota/,
    );
  });

  it("incluye la traza con el parámetro de alícuota usado", () => {
    const r = calcularIVADocumento({ baseImponibleGravada: 1000, alicuota: parametro(16) });
    expect(r.traza.parametrosUsados).toHaveLength(1);
    expect(r.traza.parametrosUsados[0]?.valor).toBe(16);
  });
});

describe("calcularRetencionIVA", () => {
  it("retiene el 75% dejando 25% a pagar al proveedor", () => {
    const r = calcularRetencionIVA({ montoIVA: 160, porcentajeRetencion: parametro(75) });
    expect(r.montoRetencion).toBe(120);
    expect(r.montoAPagarAlProveedor).toBe(40);
  });

  it("retiene el 100% dejando 0 a pagar al proveedor", () => {
    const r = calcularRetencionIVA({ montoIVA: 160, porcentajeRetencion: parametro(100) });
    expect(r.montoRetencion).toBe(160);
    expect(r.montoAPagarAlProveedor).toBe(0);
  });

  it("rechaza un porcentaje distinto de 75 o 100", () => {
    expect(() => calcularRetencionIVA({ montoIVA: 160, porcentajeRetencion: parametro(50) })).toThrow(
      /75 o 100/,
    );
  });

  it("rechaza montoIVA negativo", () => {
    expect(() => calcularRetencionIVA({ montoIVA: -1, porcentajeRetencion: parametro(75) })).toThrow(
      /montoIVA/,
    );
  });
});

describe("calcularProrrateoCreditoFiscal", () => {
  it("prorratea el crédito fiscal según la proporción de ventas gravadas", () => {
    const r = calcularProrrateoCreditoFiscal({
      ventasGravadas: 700,
      ventasExentas: 300,
      ventasExoneradas: 0,
      creditoFiscalProrrateable: 100,
    });

    expect(r.prorrata).toBe(0.7);
    expect(r.creditoFiscalDeducible).toBeCloseTo(70, 6);
    expect(r.creditoFiscalNoDeducible).toBeCloseTo(30, 6);
  });

  it("da prorrata 1 (100% deducible) si no hay ventas exentas ni exoneradas", () => {
    const r = calcularProrrateoCreditoFiscal({
      ventasGravadas: 1000,
      ventasExentas: 0,
      ventasExoneradas: 0,
      creditoFiscalProrrateable: 50,
    });

    expect(r.prorrata).toBe(1);
    expect(r.creditoFiscalDeducible).toBe(50);
    expect(r.creditoFiscalNoDeducible).toBe(0);
  });

  it("considera exentas y exoneradas juntas en el denominador", () => {
    const r = calcularProrrateoCreditoFiscal({
      ventasGravadas: 500,
      ventasExentas: 250,
      ventasExoneradas: 250,
      creditoFiscalProrrateable: 200,
    });

    expect(r.prorrata).toBe(0.5);
    expect(r.creditoFiscalDeducible).toBe(100);
  });

  it("rechaza si no hay ventas del período", () => {
    expect(() =>
      calcularProrrateoCreditoFiscal({
        ventasGravadas: 0,
        ventasExentas: 0,
        ventasExoneradas: 0,
        creditoFiscalProrrateable: 100,
      }),
    ).toThrow(/sin ventas/);
  });

  it("rechaza ventas negativas", () => {
    expect(() =>
      calcularProrrateoCreditoFiscal({
        ventasGravadas: -1,
        ventasExentas: 0,
        ventasExoneradas: 0,
        creditoFiscalProrrateable: 100,
      }),
    ).toThrow(/ventas/);
  });
});

describe("calcularDeclaracionIVAMensual", () => {
  it("calcula impuesto a pagar cuando el débito supera al crédito y no hay retenciones", () => {
    const r = calcularDeclaracionIVAMensual({
      debitoFiscal: 1000,
      creditoFiscalDeducible: 400,
      retencionesIVASoportadas: 0,
      excedenteCreditoPeriodoAnterior: 0,
    });

    expect(r.impuestoAPagar).toBe(600);
    expect(r.excedenteCreditoSiguiente).toBe(0);
  });

  it("las retenciones soportadas reducen el impuesto a pagar", () => {
    const r = calcularDeclaracionIVAMensual({
      debitoFiscal: 1000,
      creditoFiscalDeducible: 400,
      retencionesIVASoportadas: 700,
      excedenteCreditoPeriodoAnterior: 0,
    });

    // cuota = 600; retenciones (700) superan la cuota → no se paga nada
    // y el exceso (100) pasa como excedente de crédito.
    expect(r.impuestoAPagar).toBe(0);
    expect(r.excedenteCreditoSiguiente).toBe(100);
  });

  it("genera excedente de crédito cuando el crédito supera al débito", () => {
    const r = calcularDeclaracionIVAMensual({
      debitoFiscal: 300,
      creditoFiscalDeducible: 1000,
      retencionesIVASoportadas: 50,
      excedenteCreditoPeriodoAnterior: 0,
    });

    expect(r.impuestoAPagar).toBe(0);
    expect(r.excedenteCreditoSiguiente).toBe(750); // (1000-300) + 50
  });

  it("arrastra el excedente de crédito del período anterior", () => {
    const r = calcularDeclaracionIVAMensual({
      debitoFiscal: 1000,
      creditoFiscalDeducible: 200,
      retencionesIVASoportadas: 0,
      excedenteCreditoPeriodoAnterior: 300,
    });

    // creditoTotalDisponible = 500 → cuota = 500
    expect(r.impuestoAPagar).toBe(500);
  });

  it("rechaza débito o crédito negativos", () => {
    expect(() =>
      calcularDeclaracionIVAMensual({
        debitoFiscal: -1,
        creditoFiscalDeducible: 0,
        retencionesIVASoportadas: 0,
        excedenteCreditoPeriodoAnterior: 0,
      }),
    ).toThrow(/débito y el crédito/);
  });
});
