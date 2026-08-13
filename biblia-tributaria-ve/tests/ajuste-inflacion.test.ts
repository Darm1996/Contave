import { describe, expect, it } from "vitest";
import {
  calcularREPOMAN,
  reexpresarPartidaNoMonetaria,
  reexpresarPartidasNoMonetarias,
} from "@/lib/motores/ajuste-inflacion";
import type { ValorConFuente } from "@/lib/motores/tipos";

// Valores ilustrativos para las pruebas — NO son índices INPC reales.
const inpc = (valor: number, fecha: string): ValorConFuente => ({
  valor,
  fecha,
  fuenteOficial: "BCV (valor de prueba)",
  verificado: true,
});

describe("reexpresarPartidaNoMonetaria", () => {
  it("aplica el factor INPC_cierre/INPC_origen al valor histórico", () => {
    const r = reexpresarPartidaNoMonetaria({
      valorHistorico: 1000,
      inpcOrigen: inpc(100, "2026-01-01"),
      inpcCierre: inpc(120, "2026-06-30"),
    });

    expect(r.factorReexpresion).toBe(1.2);
    expect(r.valorReexpresado).toBe(1200);
    expect(r.ajustePorInflacion).toBe(200);
  });

  it("no genera ajuste si el INPC no cambió", () => {
    const r = reexpresarPartidaNoMonetaria({
      valorHistorico: 1000,
      inpcOrigen: inpc(100, "2026-01-01"),
      inpcCierre: inpc(100, "2026-06-30"),
    });

    expect(r.ajustePorInflacion).toBe(0);
  });

  it("incluye la traza con los dos INPC usados", () => {
    const r = reexpresarPartidaNoMonetaria({
      valorHistorico: 1000,
      inpcOrigen: inpc(100, "2026-01-01"),
      inpcCierre: inpc(120, "2026-06-30"),
    });

    expect(r.traza.parametrosUsados).toHaveLength(2);
    expect(r.traza.formula).toContain("INPC_cierre");
  });

  it("rechaza valorHistorico menor o igual a cero", () => {
    expect(() =>
      reexpresarPartidaNoMonetaria({
        valorHistorico: 0,
        inpcOrigen: inpc(100, "2026-01-01"),
        inpcCierre: inpc(120, "2026-06-30"),
      }),
    ).toThrow(/valorHistorico/);
  });

  it("rechaza si la fecha de cierre es anterior a la de origen", () => {
    expect(() =>
      reexpresarPartidaNoMonetaria({
        valorHistorico: 1000,
        inpcOrigen: inpc(100, "2026-06-30"),
        inpcCierre: inpc(120, "2026-01-01"),
      }),
    ).toThrow(/fecha de cierre/);
  });
});

describe("reexpresarPartidasNoMonetarias", () => {
  it("suma correctamente el histórico, el reexpresado y el ajuste de varias partidas", () => {
    const r = reexpresarPartidasNoMonetarias([
      {
        id: "1",
        descripcion: "Inventario",
        valorHistorico: 1000,
        inpcOrigen: inpc(100, "2026-01-01"),
        inpcCierre: inpc(120, "2026-06-30"),
      },
      {
        id: "2",
        descripcion: "Mobiliario",
        valorHistorico: 500,
        inpcOrigen: inpc(110, "2026-03-01"), // partida adquirida después, INPC de origen distinto
        inpcCierre: inpc(120, "2026-06-30"),
      },
    ]);

    expect(r.totalHistorico).toBe(1500);
    // 1000*1.2=1200 ; 500*(120/110)=545.4545...
    expect(r.totalReexpresado).toBeCloseTo(1745.4545, 3);
    expect(r.totalAjustePorInflacion).toBeCloseTo(245.4545, 3);
    expect(r.detalle).toHaveLength(2);
  });
});

describe("calcularREPOMAN", () => {
  it("genera PÉRDIDA monetaria cuando la posición neta inicial es ACTIVA (positiva) y hay inflación", () => {
    const r = calcularREPOMAN({
      posicionMonetariaNetaInicial: 10_000, // más efectivo/CxC que CxP
      inpcInicial: inpc(100, "2026-01-01"),
      inpcCierre: inpc(120, "2026-06-30"),
    });

    // factor = 1.2 → resultado = 10000 * (1 - 1.2) = -2000
    expect(r.resultadoRepoman).toBeCloseTo(-2000, 6);
    expect(r.contribuciones[0]?.resultadoMonetario).toBeCloseTo(-2000, 6);
  });

  it("genera GANANCIA monetaria cuando la posición neta inicial es PASIVA (negativa) y hay inflación", () => {
    const r = calcularREPOMAN({
      posicionMonetariaNetaInicial: -10_000, // más CxP que efectivo/CxC
      inpcInicial: inpc(100, "2026-01-01"),
      inpcCierre: inpc(120, "2026-06-30"),
    });

    expect(r.resultadoRepoman).toBeCloseTo(2000, 6);
  });

  it("es cero si no hay inflación en el período (INPC constante)", () => {
    const r = calcularREPOMAN({
      posicionMonetariaNetaInicial: 10_000,
      inpcInicial: inpc(100, "2026-01-01"),
      inpcCierre: inpc(100, "2026-06-30"),
    });

    expect(r.resultadoRepoman).toBe(0);
  });

  it("incorpora movimientos intermedios, cada uno reexpresado desde su propia fecha", () => {
    const r = calcularREPOMAN({
      posicionMonetariaNetaInicial: 0,
      inpcInicial: inpc(100, "2026-01-01"),
      inpcCierre: inpc(120, "2026-06-30"),
      movimientos: [
        {
          descripcion: "Venta de contado en marzo",
          montoNeto: 5000, // aumenta la posición monetaria neta
          inpcFecha: inpc(110, "2026-03-01"),
        },
        {
          descripcion: "Pago a proveedor en mayo",
          montoNeto: -3000, // disminuye la posición monetaria neta
          inpcFecha: inpc(115, "2026-05-01"),
        },
      ],
    });

    // Venta (posición activa +5000): 5000 * (1 - 120/110) = -454.545... (pérdida)
    // Pago (posición pasiva -3000):  -3000 * (1 - 120/115) = +130.434... (ganancia)
    expect(r.contribuciones).toHaveLength(3); // posición inicial (0) + 2 movimientos
    expect(r.contribuciones[1]?.resultadoMonetario).toBeCloseTo(-454.545, 2);
    expect(r.contribuciones[2]?.resultadoMonetario).toBeCloseTo(130.435, 2);
    expect(r.resultadoRepoman).toBeCloseTo(-324.11, 1);
  });

  it("rechaza índices INPC menores o iguales a cero", () => {
    expect(() =>
      calcularREPOMAN({
        posicionMonetariaNetaInicial: 1000,
        inpcInicial: inpc(0, "2026-01-01"),
        inpcCierre: inpc(120, "2026-06-30"),
      }),
    ).toThrow(/INPC/);
  });
});
