// Catálogo de códigos de parámetros y valores semilla de referencia.
//
// IMPORTANTE: los valores semilla vienen de la tabla [PARÁMETROS VIGENTES] del
// prompt maestro y se cargan con `verificado: false`. Deben confirmarse contra
// la Gaceta Oficial antes de procesar un período. Las fechas `vigenteDesde`
// marcadas "confirmar" son de carga inicial, no fechas oficiales.
//
// Los parámetros PENDIENTES (sin valor conocido) NO tienen semilla: el motor
// se detendrá pidiéndolos cuando se necesiten.
import type { Parametro, Unidad } from './parametros'

export const P = {
  SALARIO_MINIMO_MENSUAL: 'SALARIO_MINIMO_MENSUAL',
  INGRESO_MINIMO_INTEGRAL: 'INGRESO_MINIMO_INTEGRAL',
  CESTATICKET_MENSUAL: 'CESTATICKET_MENSUAL',

  IVSS_PATRONAL_MINIMO_PCT: 'IVSS_PATRONAL_MINIMO_PCT',
  IVSS_PATRONAL_MEDIO_PCT: 'IVSS_PATRONAL_MEDIO_PCT',
  IVSS_PATRONAL_MAXIMO_PCT: 'IVSS_PATRONAL_MAXIMO_PCT',
  IVSS_TRABAJADOR_PCT: 'IVSS_TRABAJADOR_PCT',
  IVSS_TOPE_SM: 'IVSS_TOPE_SM',
  RPE_PATRONAL_PCT: 'RPE_PATRONAL_PCT',
  RPE_TRABAJADOR_PCT: 'RPE_TRABAJADOR_PCT',
  RPE_TOPE_SM: 'RPE_TOPE_SM',
  FAOV_PATRONAL_PCT: 'FAOV_PATRONAL_PCT',
  FAOV_TRABAJADOR_PCT: 'FAOV_TRABAJADOR_PCT',
  INCES_PATRONAL_PCT: 'INCES_PATRONAL_PCT',
  INCES_TRABAJADOR_UTILIDADES_PCT: 'INCES_TRABAJADOR_UTILIDADES_PCT',
  INCES_MIN_TRABAJADORES: 'INCES_MIN_TRABAJADORES',
  PENSIONES_ALICUOTA_PCT: 'PENSIONES_ALICUOTA_PCT',
  LOPCYMAT_ALICUOTA_PCT: 'LOPCYMAT_ALICUOTA_PCT',

  TASA_INTERES_PRESTACIONES_PCT: 'TASA_INTERES_PRESTACIONES_PCT',
  TASA_INTERES_MORA_PCT: 'TASA_INTERES_MORA_PCT',
  UNIDAD_TRIBUTARIA: 'UNIDAD_TRIBUTARIA',
  ISLR_UMBRAL_RETENCION_UT: 'ISLR_UMBRAL_RETENCION_UT',
  DEPORTE_APORTE_PCT: 'DEPORTE_APORTE_PCT',
  DEPORTE_UMBRAL_UT: 'DEPORTE_UMBRAL_UT',

  HORA_EXTRA_RECARGO_PCT: 'HORA_EXTRA_RECARGO_PCT',
  HORA_EXTRA_MAX_SEMANA: 'HORA_EXTRA_MAX_SEMANA',
  HORA_EXTRA_MAX_ANIO: 'HORA_EXTRA_MAX_ANIO',
  BONO_NOCTURNO_RECARGO_PCT: 'BONO_NOCTURNO_RECARGO_PCT',
  FERIADO_DESCANSO_RECARGO_PCT: 'FERIADO_DESCANSO_RECARGO_PCT',
  JORNADA_DIURNA_HORAS_DIA: 'JORNADA_DIURNA_HORAS_DIA',
  JORNADA_NOCTURNA_HORAS_DIA: 'JORNADA_NOCTURNA_HORAS_DIA',
  JORNADA_MIXTA_HORAS_DIA: 'JORNADA_MIXTA_HORAS_DIA',
  JORNADA_DIURNA_HORAS_SEMANA: 'JORNADA_DIURNA_HORAS_SEMANA',
  JORNADA_NOCTURNA_HORAS_SEMANA: 'JORNADA_NOCTURNA_HORAS_SEMANA',
  JORNADA_MIXTA_HORAS_SEMANA: 'JORNADA_MIXTA_HORAS_SEMANA',

  VACACIONES_DIAS_BASE: 'VACACIONES_DIAS_BASE',
  VACACIONES_DIAS_ADICIONAL_MAX: 'VACACIONES_DIAS_ADICIONAL_MAX',
  BONO_VAC_DIAS_BASE: 'BONO_VAC_DIAS_BASE',
  BONO_VAC_DIAS_MAX: 'BONO_VAC_DIAS_MAX',
  BONO_VAC_DIAS_ADICIONALES_EMPRESA: 'BONO_VAC_DIAS_ADICIONALES_EMPRESA',
  UTILIDADES_DIAS_MIN: 'UTILIDADES_DIAS_MIN',
  UTILIDADES_DIAS_MAX: 'UTILIDADES_DIAS_MAX',
  UTILIDADES_DIAS_EMPRESA: 'UTILIDADES_DIAS_EMPRESA',

  PREST_GARANTIA_DIAS_TRIMESTRE: 'PREST_GARANTIA_DIAS_TRIMESTRE',
  PREST_DIAS_ADIC_POR_ANIO: 'PREST_DIAS_ADIC_POR_ANIO',
  PREST_DIAS_ADIC_MAX: 'PREST_DIAS_ADIC_MAX',
  PREST_RETRO_DIAS_POR_ANIO: 'PREST_RETRO_DIAS_POR_ANIO',
  PREST_RETRO_FRACCION_MESES: 'PREST_RETRO_FRACCION_MESES',
  PREST_MENOS_3M_DIAS_POR_MES: 'PREST_MENOS_3M_DIAS_POR_MES',
  PREST_MENOS_3M_LIMITE_MESES: 'PREST_MENOS_3M_LIMITE_MESES',
  PREST_ANTICIPO_MAX_PCT: 'PREST_ANTICIPO_MAX_PCT',
  LIQUIDACION_PLAZO_DIAS: 'LIQUIDACION_PLAZO_DIAS',

  PRENATAL_SEMANAS: 'PRENATAL_SEMANAS',
  POSTNATAL_SEMANAS: 'POSTNATAL_SEMANAS',
  PATERNIDAD_DIAS: 'PATERNIDAD_DIAS',
  INAMOVILIDAD_MATERNIDAD_ANIOS: 'INAMOVILIDAD_MATERNIDAD_ANIOS',
  INAMOVILIDAD_PATERNIDAD_ANIOS: 'INAMOVILIDAD_PATERNIDAD_ANIOS',
  PRESCRIPCION_PRESTACIONES_ANIOS: 'PRESCRIPCION_PRESTACIONES_ANIOS',
  PRESCRIPCION_OTROS_ANIOS: 'PRESCRIPCION_OTROS_ANIOS',
} as const

export type CodigoParametro = (typeof P)[keyof typeof P]

/** Parámetros sin valor de referencia: el usuario debe cargarlos con su fuente. */
export const PARAMETROS_PENDIENTES: { codigo: CodigoParametro; unidad: Unidad; descripcion: string }[] = [
  { codigo: P.TASA_INTERES_PRESTACIONES_PCT, unidad: 'PORCENTAJE', descripcion: 'Tasa anual de intereses de prestaciones publicada por el BCV (una vigencia por mes) — LOTTT Art. 143' },
  { codigo: P.TASA_INTERES_MORA_PCT, unidad: 'PORCENTAJE', descripcion: 'Tasa anual para intereses de mora en el pago de prestaciones — LOTTT Arts. 128 y 142 lit. f' },
  { codigo: P.UNIDAD_TRIBUTARIA, unidad: 'VES', descripcion: 'Valor de la Unidad Tributaria vigente' },
  { codigo: P.ISLR_UMBRAL_RETENCION_UT, unidad: 'UT', descripcion: 'Umbral anual en UT a partir del cual procede la retención de ISLR sobre sueldos — Decreto 1.808' },
  { codigo: P.DEPORTE_UMBRAL_UT, unidad: 'UT', descripcion: 'Umbral de utilidad neta en UT para el aporte de la Ley Orgánica del Deporte' },
  { codigo: P.LOPCYMAT_ALICUOTA_PCT, unidad: 'PORCENTAJE', descripcion: 'Cotización LOPCYMAT (desactivada hasta confirmar su aplicación)' },
  { codigo: P.UTILIDADES_DIAS_EMPRESA, unidad: 'DIAS', descripcion: 'Días de utilidades de la empresa (política interna, entre 30 y 120) — se carga por empresa' },
]

const CARGA = '2012-05-07' // Publicación de la LOTTT (GO 6.076 Ext.) — fecha de carga inicial, confirmar.

function p(codigo: CodigoParametro, valor: string, unidad: Unidad, fuente: string, vigenteDesde = CARGA, referencia?: string): Parametro {
  return { codigo, empresaId: null, valor, unidad, vigenteDesde, vigenteHasta: null, fuente, referencia, verificado: false }
}

/** Valores de referencia del prompt maestro. TODOS sin verificar. */
export const PARAMETROS_SEMILLA: Parametro[] = [
  p(P.SALARIO_MINIMO_MENSUAL, '130', 'VES', 'Decreto 4.653', '2022-03-01', 'Congelado desde marzo 2022 — VERIFICAR'),
  p(P.INGRESO_MINIMO_INTEGRAL, '240', 'USD', 'Anuncio del Ejecutivo abril 2026', '2026-05-01', 'Base mínima de la contribución de pensiones — VERIFICAR Gaceta'),
  p(P.CESTATICKET_MENSUAL, '40', 'USD', 'Ley de Alimentación para los Trabajadores — monto de referencia 2026', '2026-01-01', 'VERIFICAR'),

  p(P.IVSS_PATRONAL_MINIMO_PCT, '9', 'PORCENTAJE', 'Ley del Seguro Social y su Reglamento — riesgo mínimo'),
  p(P.IVSS_PATRONAL_MEDIO_PCT, '10', 'PORCENTAJE', 'Ley del Seguro Social y su Reglamento — riesgo medio'),
  p(P.IVSS_PATRONAL_MAXIMO_PCT, '11', 'PORCENTAJE', 'Ley del Seguro Social y su Reglamento — riesgo máximo'),
  p(P.IVSS_TRABAJADOR_PCT, '4', 'PORCENTAJE', 'Ley del Seguro Social'),
  p(P.IVSS_TOPE_SM, '5', 'SALARIOS_MINIMOS', 'Ley del Seguro Social'),
  p(P.RPE_PATRONAL_PCT, '2', 'PORCENTAJE', 'Ley del Régimen Prestacional de Empleo'),
  p(P.RPE_TRABAJADOR_PCT, '0.5', 'PORCENTAJE', 'Ley del Régimen Prestacional de Empleo'),
  p(P.RPE_TOPE_SM, '10', 'SALARIOS_MINIMOS', 'Ley del Régimen Prestacional de Empleo'),
  p(P.FAOV_PATRONAL_PCT, '2', 'PORCENTAJE', 'Ley del Régimen Prestacional de Vivienda y Hábitat'),
  p(P.FAOV_TRABAJADOR_PCT, '1', 'PORCENTAJE', 'Ley del Régimen Prestacional de Vivienda y Hábitat'),
  p(P.INCES_PATRONAL_PCT, '2', 'PORCENTAJE', 'Ley del INCES'),
  p(P.INCES_TRABAJADOR_UTILIDADES_PCT, '0.5', 'PORCENTAJE', 'Ley del INCES'),
  p(P.INCES_MIN_TRABAJADORES, '5', 'TRABAJADORES', 'Ley del INCES'),
  p(P.PENSIONES_ALICUOTA_PCT, '9', 'PORCENTAJE', 'Ley de Protección de las Pensiones de Seguridad Social (GO 6.806 Ext.) y Decreto 4.952', '2024-05-01', 'La ley permite hasta 15 % — fecha de vigencia por confirmar'),
  p(P.DEPORTE_APORTE_PCT, '1', 'PORCENTAJE', 'Ley Orgánica del Deporte, Actividad Física y Educación Física'),

  p(P.HORA_EXTRA_RECARGO_PCT, '50', 'PORCENTAJE', 'LOTTT Art. 118'),
  p(P.HORA_EXTRA_MAX_SEMANA, '10', 'HORAS', 'LOTTT Art. 178'),
  p(P.HORA_EXTRA_MAX_ANIO, '100', 'HORAS', 'LOTTT Art. 178'),
  p(P.BONO_NOCTURNO_RECARGO_PCT, '30', 'PORCENTAJE', 'LOTTT Art. 117'),
  p(P.FERIADO_DESCANSO_RECARGO_PCT, '50', 'PORCENTAJE', 'LOTTT Arts. 119 y 120'),
  p(P.JORNADA_DIURNA_HORAS_DIA, '8', 'HORAS', 'LOTTT Art. 173'),
  p(P.JORNADA_NOCTURNA_HORAS_DIA, '7', 'HORAS', 'LOTTT Art. 173'),
  p(P.JORNADA_MIXTA_HORAS_DIA, '7.5', 'HORAS', 'LOTTT Art. 173'),
  p(P.JORNADA_DIURNA_HORAS_SEMANA, '40', 'HORAS', 'LOTTT Art. 173'),
  p(P.JORNADA_NOCTURNA_HORAS_SEMANA, '35', 'HORAS', 'LOTTT Art. 173'),
  p(P.JORNADA_MIXTA_HORAS_SEMANA, '37.5', 'HORAS', 'LOTTT Art. 173'),

  p(P.VACACIONES_DIAS_BASE, '15', 'DIAS', 'LOTTT Art. 190'),
  p(P.VACACIONES_DIAS_ADICIONAL_MAX, '15', 'DIAS', 'LOTTT Art. 190'),
  p(P.BONO_VAC_DIAS_BASE, '15', 'DIAS', 'LOTTT Art. 192'),
  p(P.BONO_VAC_DIAS_MAX, '30', 'DIAS', 'LOTTT Art. 192'),
  p(P.BONO_VAC_DIAS_ADICIONALES_EMPRESA, '0', 'DIAS', 'Política interna (días por encima del mínimo legal)'),
  p(P.UTILIDADES_DIAS_MIN, '30', 'DIAS', 'LOTTT Art. 131'),
  p(P.UTILIDADES_DIAS_MAX, '120', 'DIAS', 'LOTTT Art. 131'),

  p(P.PREST_GARANTIA_DIAS_TRIMESTRE, '15', 'DIAS', 'LOTTT Art. 142 lit. a'),
  p(P.PREST_DIAS_ADIC_POR_ANIO, '2', 'DIAS', 'LOTTT Art. 142 lit. b'),
  p(P.PREST_DIAS_ADIC_MAX, '30', 'DIAS', 'LOTTT Art. 142 lit. b'),
  p(P.PREST_RETRO_DIAS_POR_ANIO, '30', 'DIAS', 'LOTTT Art. 142 lit. c'),
  p(P.PREST_RETRO_FRACCION_MESES, '6', 'MESES', 'LOTTT Art. 142 lit. c'),
  p(P.PREST_MENOS_3M_DIAS_POR_MES, '5', 'DIAS', 'LOTTT Art. 142 lit. e'),
  p(P.PREST_MENOS_3M_LIMITE_MESES, '3', 'MESES', 'LOTTT Art. 142 lit. e'),
  p(P.PREST_ANTICIPO_MAX_PCT, '75', 'PORCENTAJE', 'LOTTT Art. 144'),
  p(P.LIQUIDACION_PLAZO_DIAS, '5', 'DIAS', 'LOTTT Art. 142 lit. f'),

  p(P.PRENATAL_SEMANAS, '6', 'SEMANAS', 'LOTTT Art. 336'),
  p(P.POSTNATAL_SEMANAS, '20', 'SEMANAS', 'LOTTT Art. 336'),
  p(P.PATERNIDAD_DIAS, '14', 'DIAS', 'Ley para la Protección de las Familias, la Maternidad y la Paternidad'),
  p(P.INAMOVILIDAD_MATERNIDAD_ANIOS, '2', 'ANIOS', 'LOTTT Art. 335'),
  p(P.INAMOVILIDAD_PATERNIDAD_ANIOS, '2', 'ANIOS', 'Ley para la Protección de las Familias, la Maternidad y la Paternidad'),
  p(P.PRESCRIPCION_PRESTACIONES_ANIOS, '10', 'ANIOS', 'LOTTT Art. 51'),
  p(P.PRESCRIPCION_OTROS_ANIOS, '5', 'ANIOS', 'LOTTT Art. 51'),
]
