// Protección de la familia: pre y postnatal, paternidad e inamovilidad.
// LOTTT Arts. 335 y 336; Ley para la Protección de las Familias, la
// Maternidad y la Paternidad.
import { P } from './catalogo-parametros'
import { enRango, sumarDias, sumarMeses } from './fechas'
import type { ParametrosVigentes } from './parametros'
import type { Alerta, Fecha, MotivoEgreso } from './tipos'

export type CausaInamovilidad = 'MATERNIDAD' | 'PATERNIDAD' | 'FUERO_SINDICAL' | 'DECRETO_GENERAL' | 'OTRA'

export interface Inamovilidad {
  causa: CausaInamovilidad
  desde: Fecha
  hasta: Fecha
  fuente: string
}

export interface Licencia {
  tipo: 'PRENATAL' | 'POSTNATAL' | 'PATERNIDAD'
  desde: Fecha
  hasta: Fecha
}

/** LOTTT Art. 336: 6 semanas antes y 20 semanas después del parto. Art. 335: inamovilidad hasta 2 años después del parto. */
export function licenciaMaternidad(fechaParto: Fecha, params: ParametrosVigentes): { licencias: Licencia[]; inamovilidad: Inamovilidad } {
  const pre = params.valor(P.PRENATAL_SEMANAS, fechaParto).toNumber()
  const post = params.valor(P.POSTNATAL_SEMANAS, fechaParto).toNumber()
  const anios = params.valor(P.INAMOVILIDAD_MATERNIDAD_ANIOS, fechaParto).toNumber()
  const inicioPre = sumarDias(fechaParto, -pre * 7)
  return {
    licencias: [
      { tipo: 'PRENATAL', desde: inicioPre, hasta: sumarDias(fechaParto, -1) },
      { tipo: 'POSTNATAL', desde: fechaParto, hasta: sumarDias(fechaParto, post * 7 - 1) },
    ],
    // Desde el embarazo (inicio del prenatal como mínimo registrable) hasta 2 años después del parto.
    inamovilidad: { causa: 'MATERNIDAD', desde: inicioPre, hasta: sumarMeses(fechaParto, 12 * anios), fuente: 'LOTTT Art. 335' },
  }
}

/** Licencia de paternidad de 14 días continuos e inamovilidad de 2 años desde el nacimiento. */
export function licenciaPaternidad(fechaNacimiento: Fecha, params: ParametrosVigentes): { licencia: Licencia; inamovilidad: Inamovilidad } {
  const dias = params.valor(P.PATERNIDAD_DIAS, fechaNacimiento).toNumber()
  const anios = params.valor(P.INAMOVILIDAD_PATERNIDAD_ANIOS, fechaNacimiento).toNumber()
  return {
    licencia: { tipo: 'PATERNIDAD', desde: fechaNacimiento, hasta: sumarDias(fechaNacimiento, dias - 1) },
    inamovilidad: { causa: 'PATERNIDAD', desde: fechaNacimiento, hasta: sumarMeses(fechaNacimiento, 12 * anios), fuente: 'Ley para la Protección de las Familias, la Maternidad y la Paternidad' },
  }
}

export const esInamovible = (inamovilidades: readonly Inamovilidad[], fecha: Fecha): Inamovilidad | null =>
  inamovilidades.find((i) => enRango(fecha, i.desde, i.hasta)) ?? null

/**
 * Alerta bloqueante si se registra un despido (justificado o no) de un
 * trabajador inamovible: requiere calificación previa de la Inspectoría del
 * Trabajo. Las renuncias y el mutuo acuerdo no se bloquean, pero se avisa.
 */
export function validarEgresoInamovible(inamovilidades: readonly Inamovilidad[], fechaEgreso: Fecha, motivo: MotivoEgreso): Alerta[] {
  const fuero = esInamovible(inamovilidades, fechaEgreso)
  if (!fuero) return []
  if (motivo === 'DESPIDO_JUSTIFICADO' || motivo === 'DESPIDO_INJUSTIFICADO')
    return [{
      nivel: 'BLOQUEANTE',
      codigo: 'TRABAJADOR_INAMOVIBLE',
      mensaje: `El trabajador está amparado por inamovilidad (${fuero.causa}, ${fuero.fuente}) hasta el ${fuero.hasta}. El despido requiere calificación previa de la Inspectoría del Trabajo.`,
    }]
  return [{ nivel: 'ADVERTENCIA', codigo: 'EGRESO_INAMOVIBLE', mensaje: `Egreso de trabajador inamovible (${fuero.causa}) por ${motivo}: conserve el soporte firmado.` }]
}
