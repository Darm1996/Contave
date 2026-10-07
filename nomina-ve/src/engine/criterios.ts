// Criterios configurables por empresa para reglas ambiguas o con práctica
// divergente (sección 6 del documento de la Fase 1). Cada opción por defecto
// es la más conservadora para la empresa frente a una fiscalización o un
// reclamo, salvo indicación en contrario. Las marcadas "PENDIENTE DE
// CONFIRMAR" esperan la decisión del usuario.

export interface CriteriosEmpresa {
  /** A1. LOTTT_DEFECTO: alícuota de utilidades sobre (salario diario + alícuota BV). SOLO_SALARIO: sobre el salario diario. */
  metodoAlicuotas: 'LOTTT_DEFECTO' | 'SOLO_SALARIO'
  /** A2. Trimestres de la garantía: contados desde la fecha de ingreso o trimestres calendario. */
  trimestreGarantia: 'SERVICIO' | 'CALENDARIO'
  /** Art. 142 lit. a: "el derecho se adquiere desde el momento de iniciar el trimestre". Al egreso, ¿se abona el trimestre en curso? */
  abonarTrimestreEnCursoAlEgreso: boolean
  /** A5. Contribución de pensiones de quien ingresa/egresa a mitad de mes: mínimo completo o prorrateado. */
  pensionesMinimoParcial: 'COMPLETO' | 'PRORRATEADO'
  /** A7. Utilidades: salario normal promedio devengado en el ejercicio (regla legal) o el último salario. */
  baseUtilidades: 'PROMEDIO_DEVENGADO' | 'ULTIMO_SALARIO' | 'EL_MAYOR'
  /** A8. INCES patronal (PENDIENTE DE CONFIRMAR): por defecto usa la bandera base_inces de cada concepto. */
  /** A10. Días de descanso y feriados comprendidos en las vacaciones se pagan además de los días hábiles. */
  pagarDescansosEnVacaciones: boolean
  /** A11 (PENDIENTE DE CONFIRMAR). Indemnización Art. 92 incluye los intereses de prestaciones pendientes. */
  art92IncluyeIntereses: boolean
  /** A12. Intereses de prestaciones: capitalizar mensualmente o pagar anualmente. */
  interesesPrestaciones: 'CAPITALIZAR' | 'PAGAR_ANUAL'
  /** A13. Descontar el cestaticket en proporción a las faltas injustificadas. */
  descontarCestaticketFaltasInjustificadas: boolean
  /** Lit. e: "5 días de salario" — por defecto salario integral (más conservador) o salario normal. */
  salarioLiteralE: 'INTEGRAL' | 'NORMAL'
}

export const CRITERIOS_POR_DEFECTO: CriteriosEmpresa = {
  metodoAlicuotas: 'LOTTT_DEFECTO',
  trimestreGarantia: 'SERVICIO',
  abonarTrimestreEnCursoAlEgreso: true,
  pensionesMinimoParcial: 'COMPLETO',
  baseUtilidades: 'PROMEDIO_DEVENGADO',
  pagarDescansosEnVacaciones: true,
  art92IncluyeIntereses: true,
  interesesPrestaciones: 'CAPITALIZAR',
  descontarCestaticketFaltasInjustificadas: true,
  salarioLiteralE: 'INTEGRAL',
}
