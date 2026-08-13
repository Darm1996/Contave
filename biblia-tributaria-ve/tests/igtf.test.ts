import { describe, expect, it } from "vitest";
import { calcularDeclaracionIGTFQuincenal, calcularIGTF, esOperacionSujetaIGTF } from "@/lib/motores/igtf";
import type { ValorConFuente } from "@/lib/motores/tipos";

const parametro = (valor: number, fecha = "2026-01-01"): ValorConFuente => ({
  valor,
  fecha,
  fuenteOficial: "Parámetro de prueba",
  verificado: true,
});

describe("esOperacionSujetaIGTF", () => {
  it("sujeta cualquier pago en divisas o cripto, sea o no contribuyente especial", () => {
    expect(
      esOperacionSujetaIGTF({
        esContribuyenteEspecial: false,
        pagoEnDivisasOCripto: true,
        pagoEnEfectivoNacional: false,
      }).sujetaAIGTF,
    ).toBe(true);

    expect(
      esOperacionSujetaIGTF({
        esContribuyenteEspecial: true,
        pagoEnDivisasOCripto: true,
        pagoEnEfectivoNacional: false,
      }).sujetaAIGTF,
    ).toBe(true);
  });

  it("sujeta el pago en efectivo nacional solo si es contribuyente especial", () => {
    expect(
      esOperacionSujetaIGTF({
        esContribuyenteEspecial: true,
        pagoEnDivisasOCripto: false,
        pagoEnEfectivoNacional: true,
      }).sujetaAIGTF,
    ).toBe(true);

    expect(
      esOperacionSujetaIGTF({
        esContribuyenteEspecial: false,
        pagoEnDivisasOCripto: false,
        pagoEnEfectivoNacional: true,
      }).sujetaAIGTF,
    ).toBe(false);
  });

  it("no sujeta un pago nacional ordinario sin ninguno de los dos hechos", () => {
    expect(
      esOperacionSujetaIGTF({
        esContribuyenteEspecial: false,
        pagoEnDivisasOCripto: false,
        pagoEnEfectivoNacional: false,
      }).sujetaAIGTF,
    ).toBe(false);
  });
});

describe("calcularIGTF", () => {
  it("calcula el monto cuando la operación está sujeta", () => {
    const sujecion = esOperacionSujetaIGTF({
      esContribuyenteEspecial: false,
      pagoEnDivisasOCripto: true,
      pagoEnEfectivoNacional: false,
    });
    const r = calcularIGTF({ montoOperacion: 1000, alicuota: parametro(3), sujecion });
    expect(r.montoIGTF).toBe(30);
    expect(r.traza.parametrosUsados).toHaveLength(1);
  });

  it("da monto cero y sin parámetros usados cuando la operación no está sujeta", () => {
    const sujecion = esOperacionSujetaIGTF({
      esContribuyenteEspecial: false,
      pagoEnDivisasOCripto: false,
      pagoEnEfectivoNacional: true,
    });
    const r = calcularIGTF({ montoOperacion: 1000, alicuota: parametro(3), sujecion });
    expect(r.montoIGTF).toBe(0);
    expect(r.traza.parametrosUsados).toHaveLength(0);
  });

  it("rechaza montoOperacion negativo", () => {
    const sujecion = esOperacionSujetaIGTF({
      esContribuyenteEspecial: false,
      pagoEnDivisasOCripto: true,
      pagoEnEfectivoNacional: false,
    });
    expect(() => calcularIGTF({ montoOperacion: -1, alicuota: parametro(3), sujecion })).toThrow(
      /montoOperacion/,
    );
  });
});

describe("calcularDeclaracionIGTFQuincenal", () => {
  it("suma solo las operaciones con montoIGTF mayor que cero", () => {
    const r = calcularDeclaracionIGTFQuincenal([
      { descripcion: "Pago en USD", montoIGTF: 30 },
      { descripcion: "Pago nacional ordinario", montoIGTF: 0 },
      { descripcion: "Pago en cripto", montoIGTF: 15 },
    ]);
    expect(r.totalIGTF).toBe(45);
    expect(r.cantidadOperacionesSujetas).toBe(2);
  });

  it("da total cero para una lista vacía", () => {
    const r = calcularDeclaracionIGTFQuincenal([]);
    expect(r.totalIGTF).toBe(0);
    expect(r.cantidadOperacionesSujetas).toBe(0);
  });
});
