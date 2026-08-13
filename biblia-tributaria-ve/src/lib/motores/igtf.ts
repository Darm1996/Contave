import type { TrazaCalculo, ValorConFuente } from "./tipos";

/**
 * Motor de IGTF (Impuesto a las Grandes Transacciones Financieras).
 *
 * El IGTF se activa por dos hechos distintos, que pueden coexistir:
 *  (a) el pago se hace en moneda extranjera o criptoactivo — aplica a
 *      CUALQUIER contribuyente, ordinario o especial;
 *  (b) el pagador es un Sujeto Pasivo Especial y paga en efectivo o
 *      moneda nacional sin usar el sistema financiero (fuera de la
 *      compensación bancaria ordinaria) para extinguir obligaciones.
 *
 * `esOperacionSujetaIGTF` deja esta regla explícita y trazable en vez de
 * enterrarla dentro de `calcularIGTF` — así la UI puede mostrar por qué
 * una operación quedó sujeta o no antes de mostrar el monto.
 */

interface InsumosSujecionIGTF {
  esContribuyenteEspecial: boolean;
  pagoEnDivisasOCripto: boolean;
  pagoEnEfectivoNacional: boolean;
}

interface ResultadoSujecionIGTF {
  sujetaAIGTF: boolean;
  motivo: string;
}

export function esOperacionSujetaIGTF(insumos: InsumosSujecionIGTF): ResultadoSujecionIGTF {
  const { esContribuyenteEspecial, pagoEnDivisasOCripto, pagoEnEfectivoNacional } = insumos;

  if (pagoEnDivisasOCripto) {
    return {
      sujetaAIGTF: true,
      motivo: "Pago en moneda extranjera o criptoactivo — sujeto a IGTF para cualquier contribuyente.",
    };
  }

  if (esContribuyenteEspecial && pagoEnEfectivoNacional) {
    return {
      sujetaAIGTF: true,
      motivo: "Pago en efectivo/moneda nacional por un Sujeto Pasivo Especial.",
    };
  }

  return {
    sujetaAIGTF: false,
    motivo: esContribuyenteEspecial
      ? "Contribuyente especial, pero el pago no fue en divisas/cripto ni en efectivo nacional."
      : "Contribuyente ordinario y el pago no fue en divisas ni criptoactivo.",
  };
}

// ───────────────────────────────────────────────────────────────────────
// Monto del IGTF
// ───────────────────────────────────────────────────────────────────────

interface InsumosIGTF {
  montoOperacion: number;
  alicuota: ValorConFuente;
  sujecion: ResultadoSujecionIGTF;
}

interface ResultadoIGTF {
  montoIGTF: number;
  traza: TrazaCalculo;
}

export function calcularIGTF(insumos: InsumosIGTF): ResultadoIGTF {
  const { montoOperacion, alicuota, sujecion } = insumos;

  if (montoOperacion < 0) {
    throw new Error("montoOperacion no puede ser negativo.");
  }
  if (alicuota.valor < 0) {
    throw new Error("La alícuota no puede ser negativa.");
  }

  const montoIGTF = sujecion.sujetaAIGTF ? montoOperacion * (alicuota.valor / 100) : 0;

  const traza: TrazaCalculo = {
    formula: sujecion.sujetaAIGTF
      ? "montoIGTF = montoOperacion × alicuota/100"
      : "montoIGTF = 0 (operación no sujeta a IGTF)",
    insumos: { montoOperacion, sujetaAIGTF: String(sujecion.sujetaAIGTF), motivoSujecion: sujecion.motivo },
    parametrosUsados: sujecion.sujetaAIGTF
      ? [
          {
            nombre: "Alícuota de IGTF",
            valor: alicuota.valor,
            fecha: alicuota.fecha,
            fuenteOficial: alicuota.fuenteOficial,
            verificado: alicuota.verificado,
          },
        ]
      : [],
    resultado: { montoIGTF },
  };

  return { montoIGTF, traza };
}

// ───────────────────────────────────────────────────────────────────────
// Declaración quincenal (suma de las operaciones sujetas del período)
// ───────────────────────────────────────────────────────────────────────

interface ResultadoDeclaracionIGTFQuincenal {
  totalIGTF: number;
  cantidadOperacionesSujetas: number;
  traza: TrazaCalculo;
}

export function calcularDeclaracionIGTFQuincenal(
  operaciones: Array<{ descripcion: string; montoIGTF: number }>,
): ResultadoDeclaracionIGTFQuincenal {
  const operacionesSujetas = operaciones.filter((op) => op.montoIGTF > 0);
  const totalIGTF = operacionesSujetas.reduce((acc, op) => acc + op.montoIGTF, 0);

  const traza: TrazaCalculo = {
    formula: "totalIGTF = Σ montoIGTF de las operaciones sujetas del período",
    insumos: { cantidadOperacionesTotales: operaciones.length },
    parametrosUsados: [],
    resultado: { totalIGTF, cantidadOperacionesSujetas: operacionesSujetas.length },
  };

  return { totalIGTF, cantidadOperacionesSujetas: operacionesSujetas.length, traza };
}
