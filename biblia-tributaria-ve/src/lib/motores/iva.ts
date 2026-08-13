import type { TrazaCalculo, ValorConFuente } from "./tipos";

/**
 * Motor de IVA (Ley de Impuesto al Valor Agregado).
 *
 * Cuatro piezas independientes, cada una testeada por separado:
 *  1. calcularIVADocumento — el IVA causado por un documento individual.
 *  2. calcularRetencionIVA — la retención (75% o 100%) que un agente de
 *     retención practica sobre el IVA de una compra.
 *  3. calcularProrrateoCreditoFiscal — Art. 34 LIVA: cuando hay ventas
 *     gravadas y exentas/exoneradas en el mismo período, el crédito
 *     fiscal de uso mixto se prorratea.
 *  4. calcularDeclaracionIVAMensual — consolida débito fiscal, crédito
 *     fiscal deducible, retenciones soportadas y excedente del período
 *     anterior en el impuesto a pagar (o el nuevo excedente).
 */

// ───────────────────────────────────────────────────────────────────────
// 1. IVA de un documento
// ───────────────────────────────────────────────────────────────────────

interface InsumosIVADocumento {
  baseImponibleGravada: number;
  alicuota: ValorConFuente; // porcentaje, p.ej. 16
}

interface ResultadoIVADocumento {
  montoIVA: number;
  traza: TrazaCalculo;
}

export function calcularIVADocumento(insumos: InsumosIVADocumento): ResultadoIVADocumento {
  const { baseImponibleGravada, alicuota } = insumos;

  if (baseImponibleGravada < 0) {
    throw new Error("baseImponibleGravada no puede ser negativa.");
  }
  if (alicuota.valor < 0) {
    throw new Error("La alícuota no puede ser negativa.");
  }

  const montoIVA = baseImponibleGravada * (alicuota.valor / 100);

  const traza: TrazaCalculo = {
    formula: "montoIVA = baseImponibleGravada × (alicuota / 100)",
    insumos: { baseImponibleGravada, alicuotaValor: alicuota.valor, alicuotaFecha: alicuota.fecha },
    parametrosUsados: [
      {
        nombre: "Alícuota general de IVA",
        valor: alicuota.valor,
        fecha: alicuota.fecha,
        fuenteOficial: alicuota.fuenteOficial,
        verificado: alicuota.verificado,
      },
    ],
    resultado: { montoIVA },
  };

  return { montoIVA, traza };
}

// ───────────────────────────────────────────────────────────────────────
// 2. Retención de IVA (75% / 100%)
// ───────────────────────────────────────────────────────────────────────

interface InsumosRetencionIVA {
  montoIVA: number;
  porcentajeRetencion: ValorConFuente; // 75 o 100
}

interface ResultadoRetencionIVA {
  montoRetencion: number;
  montoAPagarAlProveedor: number; // el IVA que sí se paga en la factura (no retenido)
  traza: TrazaCalculo;
}

export function calcularRetencionIVA(insumos: InsumosRetencionIVA): ResultadoRetencionIVA {
  const { montoIVA, porcentajeRetencion } = insumos;

  if (montoIVA < 0) {
    throw new Error("montoIVA no puede ser negativo.");
  }
  if (porcentajeRetencion.valor !== 75 && porcentajeRetencion.valor !== 100) {
    throw new Error("porcentajeRetencion debe ser 75 o 100.");
  }

  const montoRetencion = montoIVA * (porcentajeRetencion.valor / 100);
  const montoAPagarAlProveedor = montoIVA - montoRetencion;

  const traza: TrazaCalculo = {
    formula: "montoRetencion = montoIVA × (porcentajeRetencion / 100)",
    insumos: { montoIVA, porcentajeRetencionValor: porcentajeRetencion.valor },
    parametrosUsados: [
      {
        nombre: "Porcentaje de retención de IVA",
        valor: porcentajeRetencion.valor,
        fecha: porcentajeRetencion.fecha,
        fuenteOficial: porcentajeRetencion.fuenteOficial,
        verificado: porcentajeRetencion.verificado,
      },
    ],
    resultado: { montoRetencion, montoAPagarAlProveedor },
  };

  return { montoRetencion, montoAPagarAlProveedor, traza };
}

// ───────────────────────────────────────────────────────────────────────
// 3. Prorrateo de crédito fiscal (Art. 34 LIVA)
// ───────────────────────────────────────────────────────────────────────

interface InsumosProrrateoCreditoFiscal {
  ventasGravadas: number;
  ventasExentas: number;
  ventasExoneradas: number;
  creditoFiscalProrrateable: number; // Σ IVA de compras de uso mixto del período
}

interface ResultadoProrrateoCreditoFiscal {
  prorrata: number;
  creditoFiscalDeducible: number;
  creditoFiscalNoDeducible: number;
  traza: TrazaCalculo;
}

export function calcularProrrateoCreditoFiscal(
  insumos: InsumosProrrateoCreditoFiscal,
): ResultadoProrrateoCreditoFiscal {
  const { ventasGravadas, ventasExentas, ventasExoneradas, creditoFiscalProrrateable } = insumos;

  if (ventasGravadas < 0 || ventasExentas < 0 || ventasExoneradas < 0) {
    throw new Error("Las ventas no pueden ser negativas.");
  }
  if (creditoFiscalProrrateable < 0) {
    throw new Error("creditoFiscalProrrateable no puede ser negativo.");
  }

  const ventasTotales = ventasGravadas + ventasExentas + ventasExoneradas;
  if (ventasTotales === 0) {
    throw new Error("No se puede prorratear sin ventas del período (ventasTotales = 0).");
  }

  const prorrata = ventasGravadas / ventasTotales;
  const creditoFiscalDeducible = creditoFiscalProrrateable * prorrata;
  const creditoFiscalNoDeducible = creditoFiscalProrrateable - creditoFiscalDeducible;

  const traza: TrazaCalculo = {
    formula:
      "prorrata = ventasGravadas / (ventasGravadas + ventasExentas + ventasExoneradas); " +
      "creditoFiscalDeducible = creditoFiscalProrrateable × prorrata",
    insumos: { ventasGravadas, ventasExentas, ventasExoneradas, ventasTotales, creditoFiscalProrrateable },
    parametrosUsados: [],
    resultado: { prorrata, creditoFiscalDeducible, creditoFiscalNoDeducible },
  };

  return { prorrata, creditoFiscalDeducible, creditoFiscalNoDeducible, traza };
}

// ───────────────────────────────────────────────────────────────────────
// 4. Declaración mensual de IVA
// ───────────────────────────────────────────────────────────────────────

interface InsumosDeclaracionIVAMensual {
  debitoFiscal: number; // Σ IVA de ventas del período
  creditoFiscalDeducible: number; // directo + prorrateado
  retencionesIVASoportadas: number; // retenciones que le practicaron a la empresa como vendedor
  excedenteCreditoPeriodoAnterior: number;
}

interface ResultadoDeclaracionIVAMensual {
  impuestoAPagar: number;
  excedenteCreditoSiguiente: number;
  traza: TrazaCalculo;
}

export function calcularDeclaracionIVAMensual(
  insumos: InsumosDeclaracionIVAMensual,
): ResultadoDeclaracionIVAMensual {
  const { debitoFiscal, creditoFiscalDeducible, retencionesIVASoportadas, excedenteCreditoPeriodoAnterior } =
    insumos;

  if (debitoFiscal < 0 || creditoFiscalDeducible < 0) {
    throw new Error("El débito y el crédito fiscal no pueden ser negativos.");
  }
  if (retencionesIVASoportadas < 0 || excedenteCreditoPeriodoAnterior < 0) {
    throw new Error("Las retenciones soportadas y el excedente anterior no pueden ser negativos.");
  }

  // Cuota tributaria: débito fiscal menos todo el crédito disponible
  // (crédito del período + excedente del período anterior).
  const creditoTotalDisponible = creditoFiscalDeducible + excedenteCreditoPeriodoAnterior;
  const cuotaTributaria = debitoFiscal - creditoTotalDisponible;

  let impuestoAPagar = 0;
  let excedenteCreditoSiguiente = 0;

  if (cuotaTributaria > 0) {
    // Hay impuesto que pagar antes de aplicar retenciones soportadas.
    impuestoAPagar = Math.max(0, cuotaTributaria - retencionesIVASoportadas);
    // Si las retenciones soportadas exceden la cuota, el excedente pasa
    // como crédito (retención) al período siguiente.
    excedenteCreditoSiguiente = Math.max(0, retencionesIVASoportadas - cuotaTributaria);
  } else {
    // No hay cuota tributaria: todo el crédito no usado (incluyendo el
    // valor absoluto de la cuota negativa) más las retenciones
    // soportadas se traslada como excedente de crédito fiscal.
    excedenteCreditoSiguiente = -cuotaTributaria + retencionesIVASoportadas;
  }

  const traza: TrazaCalculo = {
    formula:
      "cuotaTributaria = debitoFiscal − (creditoFiscalDeducible + excedenteCreditoPeriodoAnterior); " +
      "si cuotaTributaria > 0: impuestoAPagar = max(0, cuotaTributaria − retencionesIVASoportadas); " +
      "si cuotaTributaria ≤ 0: todo el crédito no usado pasa como excedenteCreditoSiguiente",
    insumos: {
      debitoFiscal,
      creditoFiscalDeducible,
      retencionesIVASoportadas,
      excedenteCreditoPeriodoAnterior,
      cuotaTributaria,
    },
    parametrosUsados: [],
    resultado: { impuestoAPagar, excedenteCreditoSiguiente },
  };

  return { impuestoAPagar, excedenteCreditoSiguiente, traza };
}
