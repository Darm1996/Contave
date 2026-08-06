// Declaración Definitiva de Rentas (ISLR anual) para personas jurídicas.
// A diferencia del 34% plano usado como estimado rápido al cerrar un
// ejercicio (ejercicios.ts), esto aplica la tarifa progresiva real del
// Art. 52 de la Ley de ISLR (Tarifa N° 2) sobre la renta neta gravable,
// y descuenta los anticipos ya retenidos por terceros durante el año.
//
// Simplificación MVP de la conciliación fiscal: se parte de la utilidad
// contable antes de ISLR y solo se ajusta automáticamente por el IGTF del
// período (no deducible, Art. 4 Ley IGTF). Cualquier otra partida no
// deducible o exenta (multas, gastos sin soporte, ingresos exonerados,
// rebajas por inversión, etc.) se ingresa manualmente — la app no tiene
// forma de detectarlas automáticamente sin un motor de conciliación fiscal
// completo.

import { db } from '@/lib/db'
import { generarEstadoResultado } from './estados-financieros'
import { UT_VIGENTE_BS } from './islr'

const round2 = (n: number) => Math.round(n * 100) / 100

export interface TramoISLR {
  hastaUT: number | null // null = sin tope (último tramo)
  tarifaPct: number
  sustraendoUT: number
}

// Tarifa N° 2 (Art. 52 Ley de ISLR) — personas jurídicas domiciliadas.
export const TARIFA_2_PERSONAS_JURIDICAS: TramoISLR[] = [
  { hastaUT: 2000, tarifaPct: 15, sustraendoUT: 0 },
  { hastaUT: 3000, tarifaPct: 22, sustraendoUT: 140 },
  { hastaUT: null, tarifaPct: 34, sustraendoUT: 500 },
]

export interface CalculoISLRProgresivo {
  rentaGravableUT: number
  tramo: TramoISLR
  impuestoUT: number
  impuestoBs: number
}

export function calcularISLRProgresivo(rentaGravableBs: number, utValor: number = UT_VIGENTE_BS): CalculoISLRProgresivo {
  if (rentaGravableBs <= 0) {
    return { rentaGravableUT: 0, tramo: TARIFA_2_PERSONAS_JURIDICAS[0], impuestoUT: 0, impuestoBs: 0 }
  }
  const rentaGravableUT = rentaGravableBs / utValor
  const tramo = TARIFA_2_PERSONAS_JURIDICAS.find((t) => t.hastaUT === null || rentaGravableUT <= t.hastaUT)!
  const impuestoUT = round2(rentaGravableUT * (tramo.tarifaPct / 100) - tramo.sustraendoUT)
  const impuestoBs = round2(Math.max(impuestoUT, 0) * utValor)
  return { rentaGravableUT: round2(rentaGravableUT), tramo, impuestoUT: Math.max(impuestoUT, 0), impuestoBs }
}

export interface AjustesManualesISLR {
  partidasNoDeducibles?: number
  partidasExentas?: number
}

export interface DeclaracionAnualISLR {
  ano: number
  utValor: number
  utilidadContable: number
  igtfNoDeducible: number
  partidasNoDeduciblesManual: number
  partidasExentas: number
  rentaNetaGravable: number
  rentaGravableUT: number
  tramoAplicado: TramoISLR
  impuestoDeterminadoBs: number
  anticiposRetenciones: number
  islrPorPagar: number
  islrAFavor: number
}

export async function generarDeclaracionAnualISLR(
  empresaId: string,
  ano: number,
  ajustes: AjustesManualesISLR = {},
): Promise<DeclaracionAnualISLR> {
  const inicio = new Date(ano, 0, 1)
  const fin = new Date(ano, 11, 31, 23, 59, 59)

  const [estadoResultado, facturasIGTF, facturasVentaConRetencion] = await Promise.all([
    generarEstadoResultado(empresaId, inicio, fin),
    db.factura.findMany({ where: { empresaId, fechaEmision: { gte: inicio, lte: fin }, montoIGTF: { gt: 0 } } }),
    db.factura.findMany({ where: { empresaId, tipo: 'VENTA', fechaEmision: { gte: inicio, lte: fin }, montoRetencionISLR: { gt: 0 } } }),
  ])

  const utilidadContable = estadoResultado.utilidadAntesISLR
  const igtfNoDeducible = round2(facturasIGTF.reduce((s, f) => s + (f.montoIGTF || 0), 0))
  const partidasNoDeduciblesManual = round2(ajustes.partidasNoDeducibles || 0)
  const partidasExentas = round2(ajustes.partidasExentas || 0)

  const rentaNetaGravable = Math.max(round2(utilidadContable + igtfNoDeducible + partidasNoDeduciblesManual - partidasExentas), 0)

  const calculo = calcularISLRProgresivo(rentaNetaGravable)
  const anticiposRetenciones = round2(facturasVentaConRetencion.reduce((s, f) => s + (f.montoRetencionISLR || 0), 0))

  const islrPorPagar = round2(Math.max(calculo.impuestoBs - anticiposRetenciones, 0))
  const islrAFavor = round2(Math.max(anticiposRetenciones - calculo.impuestoBs, 0))

  return {
    ano,
    utValor: UT_VIGENTE_BS,
    utilidadContable,
    igtfNoDeducible,
    partidasNoDeduciblesManual,
    partidasExentas,
    rentaNetaGravable,
    rentaGravableUT: calculo.rentaGravableUT,
    tramoAplicado: calculo.tramo,
    impuestoDeterminadoBs: calculo.impuestoBs,
    anticiposRetenciones,
    islrPorPagar,
    islrAFavor,
  }
}
