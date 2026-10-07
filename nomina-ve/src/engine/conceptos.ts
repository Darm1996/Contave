// Conceptos de pago y sus banderas de incidencia (regla especial salario vs. bonos).
// Las banderas son editables por el usuario; al calcular, cada línea de recibo
// guarda una copia (snapshot) para que un período cerrado no cambie después.

export interface Banderas {
  es_salarial: boolean // forma parte del salario normal (LOTTT Art. 104)
  incide_integral: boolean // forma parte del salario integral
  base_ivss_rpe: boolean
  base_faov: boolean
  base_inces: boolean
  base_pensiones: boolean
  base_islr: boolean
  base_prestaciones: boolean
}

export type TipoConcepto = 'ASIGNACION' | 'DEDUCCION' | 'APORTE_PATRONAL' | 'INFORMATIVO'

export interface Concepto {
  codigo: string
  nombre: string
  tipo: TipoConcepto
  baseLegal: string
  banderas: Banderas
}

const TODAS: Banderas = {
  es_salarial: true,
  incide_integral: true,
  base_ivss_rpe: true,
  base_faov: true,
  base_inces: true,
  base_pensiones: true,
  base_islr: true,
  base_prestaciones: true,
}
const NINGUNA: Banderas = {
  es_salarial: false,
  incide_integral: false,
  base_ivss_rpe: false,
  base_faov: false,
  base_inces: false,
  base_pensiones: false,
  base_islr: false,
  base_prestaciones: false,
}

export const C = {
  SUELDO: 'SUELDO',
  HORAS_EXTRA: 'HORAS_EXTRA',
  BONO_NOCTURNO: 'BONO_NOCTURNO',
  FERIADO_TRABAJADO: 'FERIADO_TRABAJADO',
  DESCANSO_TRABAJADO: 'DESCANSO_TRABAJADO',
  COMISIONES: 'COMISIONES',
  BONO_PRODUCTIVIDAD: 'BONO_PRODUCTIVIDAD',
  CESTATICKET: 'CESTATICKET',
  BONIFICACION_ESPECIAL: 'BONIFICACION_ESPECIAL',
  VIATICOS: 'VIATICOS',
  ANTICIPO_PRESTACIONES: 'ANTICIPO_PRESTACIONES',
  FALTA_INJUSTIFICADA: 'FALTA_INJUSTIFICADA',
  PERMISO_NO_REMUNERADO: 'PERMISO_NO_REMUNERADO',
  IVSS_TRABAJADOR: 'IVSS_TRABAJADOR',
  RPE_TRABAJADOR: 'RPE_TRABAJADOR',
  FAOV_TRABAJADOR: 'FAOV_TRABAJADOR',
  ISLR_RETENCION: 'ISLR_RETENCION',
  INCES_UTILIDADES: 'INCES_UTILIDADES',
  IVSS_PATRONAL: 'IVSS_PATRONAL',
  RPE_PATRONAL: 'RPE_PATRONAL',
  FAOV_PATRONAL: 'FAOV_PATRONAL',
} as const

/** Conceptos predefinidos. A9: la bonificación especial se marca gravable de ISLR (criterio conservador). */
export const CONCEPTOS_PREDEFINIDOS: Concepto[] = [
  { codigo: C.SUELDO, nombre: 'Sueldo base', tipo: 'ASIGNACION', baseLegal: 'LOTTT Art. 104', banderas: TODAS },
  { codigo: C.HORAS_EXTRA, nombre: 'Horas extraordinarias', tipo: 'ASIGNACION', baseLegal: 'LOTTT Art. 118', banderas: TODAS },
  { codigo: C.BONO_NOCTURNO, nombre: 'Bono nocturno', tipo: 'ASIGNACION', baseLegal: 'LOTTT Art. 117', banderas: TODAS },
  { codigo: C.FERIADO_TRABAJADO, nombre: 'Día feriado trabajado', tipo: 'ASIGNACION', baseLegal: 'LOTTT Art. 120', banderas: TODAS },
  { codigo: C.DESCANSO_TRABAJADO, nombre: 'Día de descanso trabajado', tipo: 'ASIGNACION', baseLegal: 'LOTTT Art. 119', banderas: TODAS },
  { codigo: C.COMISIONES, nombre: 'Comisiones', tipo: 'ASIGNACION', baseLegal: 'LOTTT Art. 104', banderas: TODAS },
  { codigo: C.BONO_PRODUCTIVIDAD, nombre: 'Bono de productividad', tipo: 'ASIGNACION', baseLegal: 'LOTTT Art. 104', banderas: TODAS },
  { codigo: C.CESTATICKET, nombre: 'Cestaticket (bono de alimentación)', tipo: 'ASIGNACION', baseLegal: 'Ley de Alimentación para los Trabajadores', banderas: { ...NINGUNA, base_pensiones: true } },
  { codigo: C.BONIFICACION_ESPECIAL, nombre: 'Bonificación especial (no salarial)', tipo: 'ASIGNACION', baseLegal: 'LOTTT Art. 105', banderas: { ...NINGUNA, base_pensiones: true, base_islr: true } },
  { codigo: C.VIATICOS, nombre: 'Viáticos', tipo: 'ASIGNACION', baseLegal: 'LOTTT Art. 105', banderas: NINGUNA },
  { codigo: C.ANTICIPO_PRESTACIONES, nombre: 'Anticipo de prestaciones sociales', tipo: 'ASIGNACION', baseLegal: 'LOTTT Art. 144', banderas: NINGUNA },
  // Las faltas y permisos no remunerados reducen el salario devengado: se registran
  // como deducción con las mismas banderas del sueldo para restar de cada base.
  { codigo: C.FALTA_INJUSTIFICADA, nombre: 'Falta injustificada', tipo: 'DEDUCCION', baseLegal: 'LOTTT Art. 104', banderas: TODAS },
  { codigo: C.PERMISO_NO_REMUNERADO, nombre: 'Permiso no remunerado', tipo: 'DEDUCCION', baseLegal: 'LOTTT Art. 104', banderas: TODAS },
  { codigo: C.IVSS_TRABAJADOR, nombre: 'S.S.O. (IVSS) trabajador', tipo: 'DEDUCCION', baseLegal: 'Ley del Seguro Social', banderas: NINGUNA },
  { codigo: C.RPE_TRABAJADOR, nombre: 'Régimen Prestacional de Empleo trabajador', tipo: 'DEDUCCION', baseLegal: 'Ley del RPE', banderas: NINGUNA },
  { codigo: C.FAOV_TRABAJADOR, nombre: 'FAOV trabajador', tipo: 'DEDUCCION', baseLegal: 'Ley del RPVH', banderas: NINGUNA },
  { codigo: C.ISLR_RETENCION, nombre: 'Retención ISLR', tipo: 'DEDUCCION', baseLegal: 'Decreto 1.808', banderas: NINGUNA },
  { codigo: C.INCES_UTILIDADES, nombre: 'INCES 0,5 % sobre utilidades', tipo: 'DEDUCCION', baseLegal: 'Ley del INCES', banderas: NINGUNA },
  { codigo: C.IVSS_PATRONAL, nombre: 'S.S.O. (IVSS) patronal', tipo: 'APORTE_PATRONAL', baseLegal: 'Ley del Seguro Social', banderas: NINGUNA },
  { codigo: C.RPE_PATRONAL, nombre: 'RPE patronal', tipo: 'APORTE_PATRONAL', baseLegal: 'Ley del RPE', banderas: NINGUNA },
  { codigo: C.FAOV_PATRONAL, nombre: 'FAOV patronal', tipo: 'APORTE_PATRONAL', baseLegal: 'Ley del RPVH', banderas: NINGUNA },
]

export function buscarConcepto(conceptos: readonly Concepto[], codigo: string): Concepto {
  const c = conceptos.find((x) => x.codigo === codigo)
  if (!c) throw new Error(`Concepto no definido: ${codigo}`)
  return c
}
