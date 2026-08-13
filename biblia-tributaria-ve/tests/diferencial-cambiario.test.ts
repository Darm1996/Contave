import { describe, expect, it } from "vitest";
import {
  calcularDiferencialCambiarioNoRealizado,
  calcularDiferencialCambiarioRealizado,
} from "@/lib/motores/diferencial-cambiario";
import type { ValorConFuente } from "@/lib/motores/tipos";

// Valores ilustrativos para las pruebas — NO son tasas BCV reales.
const tasa = (valor: number, fecha: string): ValorConFuente => ({
  valor,
  fecha,
  fuenteOficial: "BCV (valor de prueba)",
  verificado: true,
});

describe("calcularDiferencialCambiarioRealizado", () => {
  it("genera GANANCIA para un ACTIVO cuando la tasa sube", () => {
    const r = calcularDiferencialCambiarioRealizado({
      naturalezaPartida: "ACTIVO",
      montoDivisa: 100,
      tasaHistorica: tasa(40, "2026-06-01"),
      tasaNueva: tasa(50, "2026-07-01"),
    });

    expect(r.montoVesHistorico).toBe(4000);
    expect(r.montoVesNuevo).toBe(5000);
    expect(r.diferencialCambiario).toBe(1000);
    expect(r.tipoDiferencial).toBe("GANANCIA");
  });

  it("genera PERDIDA para un ACTIVO cuando la tasa baja", () => {
    const r = calcularDiferencialCambiarioRealizado({
      naturalezaPartida: "ACTIVO",
      montoDivisa: 100,
      tasaHistorica: tasa(50, "2026-06-01"),
      tasaNueva: tasa(40, "2026-07-01"),
    });

    expect(r.diferencialCambiario).toBe(-1000);
    expect(r.tipoDiferencial).toBe("PERDIDA");
  });

  it("genera PERDIDA para un PASIVO cuando la tasa sube (la deuda cuesta más VES)", () => {
    const r = calcularDiferencialCambiarioRealizado({
      naturalezaPartida: "PASIVO",
      montoDivisa: 200,
      tasaHistorica: tasa(40, "2026-06-01"),
      tasaNueva: tasa(50, "2026-07-01"),
    });

    expect(r.montoVesHistorico).toBe(8000);
    expect(r.montoVesNuevo).toBe(10000);
    expect(r.diferencialCambiario).toBe(-2000);
    expect(r.tipoDiferencial).toBe("PERDIDA");
  });

  it("genera GANANCIA para un PASIVO cuando la tasa baja", () => {
    const r = calcularDiferencialCambiarioRealizado({
      naturalezaPartida: "PASIVO",
      montoDivisa: 200,
      tasaHistorica: tasa(50, "2026-06-01"),
      tasaNueva: tasa(40, "2026-07-01"),
    });

    expect(r.diferencialCambiario).toBe(2000);
    expect(r.tipoDiferencial).toBe("GANANCIA");
  });

  it("es NEUTRO si la tasa no cambió", () => {
    const r = calcularDiferencialCambiarioRealizado({
      naturalezaPartida: "ACTIVO",
      montoDivisa: 100,
      tasaHistorica: tasa(45, "2026-06-01"),
      tasaNueva: tasa(45, "2026-07-01"),
    });

    expect(r.diferencialCambiario).toBe(0);
    expect(r.tipoDiferencial).toBe("NEUTRO");
  });

  it("incluye la traza con fórmula, insumos y parámetros usados", () => {
    const r = calcularDiferencialCambiarioRealizado({
      naturalezaPartida: "ACTIVO",
      montoDivisa: 100,
      tasaHistorica: tasa(40, "2026-06-01"),
      tasaNueva: tasa(50, "2026-07-01"),
    });

    expect(r.traza.formula).toContain("montoDivisa");
    expect(r.traza.parametrosUsados).toHaveLength(2);
    expect(r.traza.parametrosUsados[0]?.fuenteOficial).toBe("BCV (valor de prueba)");
    expect(r.traza.resultado.diferencialCambiario).toBe(1000);
  });

  it("rechaza montoDivisa menor o igual a cero", () => {
    expect(() =>
      calcularDiferencialCambiarioRealizado({
        naturalezaPartida: "ACTIVO",
        montoDivisa: 0,
        tasaHistorica: tasa(40, "2026-06-01"),
        tasaNueva: tasa(50, "2026-07-01"),
      }),
    ).toThrow(/montoDivisa/);
  });

  it("rechaza tasas menores o iguales a cero", () => {
    expect(() =>
      calcularDiferencialCambiarioRealizado({
        naturalezaPartida: "ACTIVO",
        montoDivisa: 100,
        tasaHistorica: tasa(0, "2026-06-01"),
        tasaNueva: tasa(50, "2026-07-01"),
      }),
    ).toThrow(/tasas de cambio/);
  });
});

describe("calcularDiferencialCambiarioNoRealizado", () => {
  it("aplica la misma lógica que el realizado, sobre el saldo pendiente al cierre", () => {
    const r = calcularDiferencialCambiarioNoRealizado({
      naturalezaPartida: "ACTIVO",
      montoDivisa: 60, // saldo pendiente, no el monto original de la partida
      tasaHistorica: tasa(40, "2026-06-01"),
      tasaNueva: tasa(48, "2026-06-30"),
    });

    expect(r.diferencialCambiario).toBe(480); // 60 × (48 − 40)
    expect(r.tipoDiferencial).toBe("GANANCIA");
    expect(r.traza.formula).toContain("cierre de período");
  });
});
