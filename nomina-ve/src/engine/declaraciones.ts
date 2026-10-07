// Consolidación de recibos para declaraciones por ente.
// La contribución de pensiones (base mínima por trabajador por mes) y el INCES
// patronal (trimestral, umbral de trabajadores) no se calculan recibo a
// recibo sino al consolidar el mes o el trimestre.
import { r2, sumar, type Decimal, type Num } from './decimal'
import { C } from './conceptos'
import type { CriteriosEmpresa } from './criterios'
import { diasEntre } from './fechas'
import { contribucionPensiones, diasActivoEnRango, incesPatronalTrimestral } from './parafiscales'
import type { ParametrosVigentes } from './parametros'
import type { Recibo } from './recibo'
import type { Alerta, Fecha, Resultado } from './tipos'

const totalConcepto = (recibos: readonly Recibo[], codigo: string): Decimal =>
  r2(sumar(recibos.flatMap((r) => r.lineas.filter((l) => l.codigo === codigo).map((l) => l.montoVES))))

/** Relación mensual de IVSS + RPE (se declaran juntos), FAOV e ISLR retenido. */
export function resumenMensual(recibos: readonly Recibo[]) {
  return {
    ivss: { trabajador: totalConcepto(recibos, C.IVSS_TRABAJADOR), patronal: totalConcepto(recibos, C.IVSS_PATRONAL) },
    rpe: { trabajador: totalConcepto(recibos, C.RPE_TRABAJADOR), patronal: totalConcepto(recibos, C.RPE_PATRONAL) },
    faov: { base: r2(sumar(recibos.map((r) => r.bases.faov))), trabajador: totalConcepto(recibos, C.FAOV_TRABAJADOR), patronal: totalConcepto(recibos, C.FAOV_PATRONAL) },
    islrRetenido: totalConcepto(recibos, C.ISLR_RETENCION),
    neto: r2(sumar(recibos.map((r) => r.neto))),
    aportesPatronales: r2(sumar(recibos.map((r) => r.totalAportesPatronales))),
  }
}

export interface TrabajadorMes {
  trabajadorId: string
  fechaIngreso: Fecha
  fechaEgreso: Fecha | null
  /** Recibos del trabajador cuyo pago corresponde al mes. */
  recibos: readonly Recibo[]
}

/** Contribución especial de pensiones del mes, trabajador por trabajador. */
export function pensionesMensual(
  trabajadores: readonly TrabajadorMes[],
  mes: { desde: Fecha; hasta: Fecha; tasaBCVCierre: Num },
  empresa: { exoneradaRNE: boolean; rneVence: Fecha | null },
  params: ParametrosVigentes,
  criterios: Pick<CriteriosEmpresa, 'pensionesMinimoParcial'>,
): Resultado<{ detalle: { trabajadorId: string; base: Decimal; contribucion: Decimal }[]; totalBase: Decimal; total: Decimal }> {
  const alertas: Alerta[] = []
  const detalle = trabajadores.map((t) => {
    const r = contribucionPensiones(
      {
        pagadoMes: sumar(t.recibos.map((x) => x.bases.pensiones)),
        tasaBCV: mes.tasaBCVCierre,
        diasActivo: diasActivoEnRango(mes.desde, mes.hasta, t.fechaIngreso, t.fechaEgreso),
        diasMes: diasEntre(mes.desde, mes.hasta) + 1,
        exoneradaRNE: empresa.exoneradaRNE,
        rneVence: empresa.rneVence,
        criterioMinimo: criterios.pensionesMinimoParcial,
      },
      mes.hasta,
      params,
    )
    alertas.push(...r.alertas.filter((a) => a.codigo === 'RNE_VENCIDA'))
    return { trabajadorId: t.trabajadorId, base: r.valor.base, contribucion: r.valor.contribucion }
  })
  return {
    valor: { detalle, totalBase: r2(sumar(detalle.map((d) => d.base))), total: r2(sumar(detalle.map((d) => d.contribucion))) },
    desglose: [],
    baseLegal: ['Ley de Protección de las Pensiones de Seguridad Social', 'Decreto 4.952'],
    alertas: alertas.slice(0, 1),
  }
}

/** INCES patronal del trimestre a partir de los recibos del trimestre. */
export function incesTrimestral(recibos: readonly Recibo[], numeroTrabajadores: number, finTrimestre: Fecha, params: ParametrosVigentes) {
  const base = r2(sumar(recibos.map((r) => r.bases.inces)))
  return { base, ...incesPatronalTrimestral(base, numeroTrabajadores, finTrimestre, params) }
}

