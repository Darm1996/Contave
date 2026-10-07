// Retención de ISLR sobre sueldos — Ley de ISLR y Decreto 1.808.
// El porcentaje lo determina el formulario AR-I del trabajador (estimación de
// ingresos, desgravámenes y rebajas). Este motor no inventa la tarifa: aplica
// el porcentaje del AR-I vigente a la fecha de pago.
import { D, fmt, pct, r2, type Num } from './decimal'
import { P } from './catalogo-parametros'
import type { ParametrosVigentes } from './parametros'
import type { Alerta, Fecha, Resultado } from './tipos'

export interface FormularioARI {
  anio: number
  variacion: 'INICIAL' | 'MAR' | 'JUN' | 'SEP' | 'DIC'
  fechaPresentacion: Fecha
  remuneracionEstimadaAnual: Num
  porcentajeRetencion: Num
}

/** AR-I más reciente presentado hasta la fecha de pago, del mismo año. */
export function ariVigente(formularios: readonly FormularioARI[], fechaPago: Fecha): FormularioARI | null {
  const anio = Number(fechaPago.slice(0, 4))
  const candidatos = formularios.filter((f) => f.anio === anio && f.fechaPresentacion <= fechaPago)
  return candidatos.sort((a, b) => (a.fechaPresentacion < b.fechaPresentacion ? 1 : -1))[0] ?? null
}

/**
 * Retención = remuneración gravable del pago × % del AR-I.
 * Si no hay AR-I se retiene 0 y se alerta. Si el parámetro de umbral en UT
 * está cargado, se alerta cuando el estimado anual lo supera sin AR-I con %.
 */
export function retencionISLR(baseGravable: Num, ari: FormularioARI | null, fechaPago: Fecha, params: ParametrosVigentes): Resultado {
  const alertas: Alerta[] = []
  if (!ari) {
    alertas.push({ nivel: 'ADVERTENCIA', codigo: 'SIN_ARI', mensaje: 'El trabajador no tiene AR-I vigente para el año: no se retiene ISLR. Verifique si está obligado (Decreto 1.808).' })
    return { valor: D(0), desglose: [{ descripcion: 'Sin AR-I: retención 0 %', valor: '0,00' }], baseLegal: ['Decreto 1.808'], alertas }
  }
  if (D(ari.porcentajeRetencion).isZero() && params.existe(P.ISLR_UMBRAL_RETENCION_UT, fechaPago) && params.existe(P.UNIDAD_TRIBUTARIA, fechaPago)) {
    const umbral = params.valor(P.ISLR_UMBRAL_RETENCION_UT, fechaPago).times(params.valor(P.UNIDAD_TRIBUTARIA, fechaPago))
    if (D(ari.remuneracionEstimadaAnual).gt(umbral))
      alertas.push({ nivel: 'ADVERTENCIA', codigo: 'ARI_REVISAR', mensaje: `Remuneración estimada ${fmt(ari.remuneracionEstimadaAnual)} supera el umbral (${fmt(umbral)}) pero el AR-I indica 0 %.` })
  }
  const monto = r2(pct(baseGravable, ari.porcentajeRetencion))
  return {
    valor: monto,
    desglose: [{ descripcion: `Retención ISLR (AR-I ${ari.variacion} ${ari.anio}: ${fmt(ari.porcentajeRetencion, 2)} %)`, formula: `${fmt(baseGravable)} × ${fmt(ari.porcentajeRetencion, 2)} %`, valor: fmt(monto) }],
    baseLegal: ['Ley de Impuesto sobre la Renta', 'Decreto 1.808'],
    alertas,
  }
}
