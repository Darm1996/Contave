// Vacaciones y bono vacacional — LOTTT Arts. 190, 192 y 196.
import { D, fmt, r2, type Decimal } from './decimal'
import { P } from './catalogo-parametros'
import { antiguedad, diaSemana, sumarDias } from './fechas'
import type { ParametrosVigentes } from './parametros'
import type { Fecha, Resultado } from './tipos'
import { ErrorMotor } from './tipos'

/**
 * LOTTT Art. 190: 15 días hábiles de disfrute al cumplir el primer año, más
 * 1 día por cada año adicional, hasta 15 días adicionales.
 * @param anioServicio año de servicio cumplido (1 = primer aniversario).
 */
export function diasDisfruteVacaciones(anioServicio: number, fecha: Fecha, params: ParametrosVigentes): number {
  if (anioServicio < 1) return 0
  const base = params.valor(P.VACACIONES_DIAS_BASE, fecha).toNumber()
  const maxAdic = params.valor(P.VACACIONES_DIAS_ADICIONAL_MAX, fecha).toNumber()
  return base + Math.min(anioServicio - 1, maxAdic)
}

/**
 * LOTTT Art. 192: bono vacacional de 15 días de salario el primer año más
 * 1 día por año adicional, hasta 30 días; más los días adicionales de
 * política de la empresa (BONO_VAC_DIAS_ADICIONALES_EMPRESA).
 */
export function diasBonoVacacional(anioServicio: number, fecha: Fecha, params: ParametrosVigentes): number {
  if (anioServicio < 1) return 0
  const base = params.valor(P.BONO_VAC_DIAS_BASE, fecha).toNumber()
  const tope = params.valor(P.BONO_VAC_DIAS_MAX, fecha).toNumber()
  const politica = params.valor(P.BONO_VAC_DIAS_ADICIONALES_EMPRESA, fecha).toNumber()
  return Math.min(base + anioServicio - 1, tope) + politica
}

export interface ResultadoFechasVacaciones {
  fechaSalida: Fecha
  ultimoDiaDisfrute: Fecha
  fechaReintegro: Fecha
  diasHabiles: number
  diasDescanso: number
  diasFeriados: number
}

/**
 * Calcula el último día de disfrute y la fecha de reintegro contando solo días
 * hábiles: excluye los días de descanso semanal del trabajador (LOTTT Art. 173,
 * dos días continuos; por defecto sábado y domingo) y los feriados (Art. 184).
 */
export function calcularFechasVacaciones(
  fechaSalida: Fecha,
  diasHabiles: number,
  feriados: readonly Fecha[],
  diasDescansoSemana: readonly number[] = [0, 6],
): ResultadoFechasVacaciones {
  if (diasHabiles <= 0) throw new ErrorMotor('VACACIONES_DIAS', 'Los días de disfrute deben ser mayores a cero')
  const esFeriado = new Set(feriados)
  const esNoHabil = (f: Fecha) => diasDescansoSemana.includes(diaSemana(f)) || esFeriado.has(f)
  let f = fechaSalida
  let contados = 0
  let descanso = 0
  let feriado = 0
  let ultimo = fechaSalida
  while (contados < diasHabiles) {
    if (diasDescansoSemana.includes(diaSemana(f))) descanso++
    else if (esFeriado.has(f)) feriado++
    else {
      contados++
      ultimo = f
    }
    f = sumarDias(f, 1)
  }
  // El reintegro es el siguiente día hábil después del último día de disfrute.
  let reintegro = sumarDias(ultimo, 1)
  while (esNoHabil(reintegro)) {
    if (diasDescansoSemana.includes(diaSemana(reintegro))) descanso++
    else feriado++
    reintegro = sumarDias(reintegro, 1)
  }
  return { fechaSalida, ultimoDiaDisfrute: ultimo, fechaReintegro: reintegro, diasHabiles, diasDescanso: descanso, diasFeriados: feriado }
}

export interface PagoVacaciones {
  diasDisfrute: number
  diasDescansoPagados: number
  diasBono: number
  montoVacaciones: Decimal
  montoBono: Decimal
}

/**
 * Pago de vacaciones y bono vacacional al salario normal vigente al disfrute
 * (LOTTT Arts. 190 y 192). Criterio A10: si `pagarDescansos`, los días de
 * descanso y feriados comprendidos en el disfrute se pagan además.
 */
export function pagoVacaciones(
  anioServicio: number,
  salarioDiarioNormal: Decimal,
  fecha: Fecha,
  params: ParametrosVigentes,
  diasDescansoYFeriadosEnDisfrute: number,
  pagarDescansos: boolean,
): Resultado<PagoVacaciones> {
  const diasDisfrute = diasDisfruteVacaciones(anioServicio, fecha, params)
  const diasBono = diasBonoVacacional(anioServicio, fecha, params)
  const diasDescansoPagados = pagarDescansos ? diasDescansoYFeriadosEnDisfrute : 0
  const montoVacaciones = r2(salarioDiarioNormal.times(diasDisfrute + diasDescansoPagados))
  const montoBono = r2(salarioDiarioNormal.times(diasBono))
  return {
    valor: { diasDisfrute, diasDescansoPagados, diasBono, montoVacaciones, montoBono },
    desglose: [
      { descripcion: `Días de disfrute (año de servicio ${anioServicio})`, valor: String(diasDisfrute) },
      { descripcion: 'Descansos y feriados dentro del disfrute pagados', valor: String(diasDescansoPagados) },
      { descripcion: 'Vacaciones', formula: `${fmt(salarioDiarioNormal, 4)} × ${diasDisfrute + diasDescansoPagados}`, valor: fmt(montoVacaciones) },
      { descripcion: 'Bono vacacional', formula: `${fmt(salarioDiarioNormal, 4)} × ${diasBono}`, valor: fmt(montoBono) },
    ],
    baseLegal: ['LOTTT Art. 190', 'LOTTT Art. 192'],
    alertas: [],
  }
}

/**
 * Vacaciones y bono vacacional fraccionados al egreso (LOTTT Art. 196):
 * proporción por meses completos trabajados desde el último aniversario.
 */
export function vacacionesFraccionadas(
  fechaIngreso: Fecha,
  fechaEgreso: Fecha,
  salarioDiarioNormal: Decimal,
  params: ParametrosVigentes,
): Resultado<{ meses: number; diasVacaciones: Decimal; diasBono: Decimal; montoVacaciones: Decimal; montoBono: Decimal }> {
  const ant = antiguedad(fechaIngreso, fechaEgreso)
  const anioEnCurso = ant.anios + 1
  const meses = ant.meses
  const diasV = D(diasDisfruteVacaciones(anioEnCurso, fechaEgreso, params)).div(12).times(meses)
  const diasB = D(diasBonoVacacional(anioEnCurso, fechaEgreso, params)).div(12).times(meses)
  const montoVacaciones = r2(diasV.times(salarioDiarioNormal))
  const montoBono = r2(diasB.times(salarioDiarioNormal))
  return {
    valor: { meses, diasVacaciones: diasV, diasBono: diasB, montoVacaciones, montoBono },
    desglose: [
      { descripcion: 'Meses completos desde el último aniversario', valor: String(meses) },
      { descripcion: 'Vacaciones fraccionadas', formula: `(${diasDisfruteVacaciones(anioEnCurso, fechaEgreso, params)} ÷ 12) × ${meses} × ${fmt(salarioDiarioNormal, 4)}`, valor: fmt(montoVacaciones) },
      { descripcion: 'Bono vacacional fraccionado', formula: `(${diasBonoVacacional(anioEnCurso, fechaEgreso, params)} ÷ 12) × ${meses} × ${fmt(salarioDiarioNormal, 4)}`, valor: fmt(montoBono) },
    ],
    baseLegal: ['LOTTT Art. 196'],
    alertas: [],
  }
}
