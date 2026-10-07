// Jornada y recargos — LOTTT Arts. 117, 118, 119, 120, 173 y 178.
import { D, fmt, pct, r2, type Decimal, type Num } from './decimal'
import { P } from './catalogo-parametros'
import type { ParametrosVigentes } from './parametros'
import type { Alerta, Fecha, Resultado, TipoJornada } from './tipos'

const HORAS_DIA = { DIURNA: P.JORNADA_DIURNA_HORAS_DIA, NOCTURNA: P.JORNADA_NOCTURNA_HORAS_DIA, MIXTA: P.JORNADA_MIXTA_HORAS_DIA } as const
const HORAS_SEMANA = { DIURNA: P.JORNADA_DIURNA_HORAS_SEMANA, NOCTURNA: P.JORNADA_NOCTURNA_HORAS_SEMANA, MIXTA: P.JORNADA_MIXTA_HORAS_SEMANA } as const

/** LOTTT Art. 173: máximo diario según tipo de jornada (8 / 7 / 7,5 horas). */
export const horasJornadaDiaria = (tipo: TipoJornada, fecha: Fecha, params: ParametrosVigentes): Decimal => params.valor(HORAS_DIA[tipo], fecha)
export const horasJornadaSemanal = (tipo: TipoJornada, fecha: Fecha, params: ParametrosVigentes): Decimal => params.valor(HORAS_SEMANA[tipo], fecha)

/** Valor de la hora ordinaria = salario diario ÷ horas de la jornada diaria. */
export const valorHora = (salarioDiario: Num, tipo: TipoJornada, fecha: Fecha, params: ParametrosVigentes): Decimal =>
  D(salarioDiario).div(horasJornadaDiaria(tipo, fecha, params))

/**
 * Horas extraordinarias (LOTTT Art. 118): valor de la hora + recargo mínimo
 * del 50 %. Alerta si se superan los límites de Art. 178 (10 h semanales,
 * 100 h anuales).
 * @param horasSemanaMax mayor número de horas extra en una misma semana del período.
 * @param horasAcumuladasAnio horas extra ya pagadas en el año, sin contar las de este período.
 */
export function horasExtra(
  horas: Num,
  salarioDiario: Num,
  tipo: TipoJornada,
  fecha: Fecha,
  params: ParametrosVigentes,
  opciones: { horasSemanaMax?: Num; horasAcumuladasAnio?: Num } = {},
): Resultado {
  const vh = valorHora(salarioDiario, tipo, fecha, params)
  const recargo = params.valor(P.HORA_EXTRA_RECARGO_PCT, fecha)
  const valorExtra = vh.plus(pct(vh, recargo))
  const monto = r2(valorExtra.times(horas))
  const alertas: Alerta[] = []
  const maxSemana = params.valor(P.HORA_EXTRA_MAX_SEMANA, fecha)
  const maxAnio = params.valor(P.HORA_EXTRA_MAX_ANIO, fecha)
  const semana = D(opciones.horasSemanaMax ?? horas)
  if (semana.gt(maxSemana))
    alertas.push({ nivel: 'ADVERTENCIA', codigo: 'HORAS_EXTRA_SEMANA', mensaje: `${fmt(semana)} horas extra en una semana superan el límite de ${fmt(maxSemana)} (LOTTT Art. 178)` })
  const anual = D(opciones.horasAcumuladasAnio ?? 0).plus(horas)
  if (anual.gt(maxAnio))
    alertas.push({ nivel: 'ADVERTENCIA', codigo: 'HORAS_EXTRA_ANIO', mensaje: `${fmt(anual)} horas extra en el año superan el límite de ${fmt(maxAnio)} (LOTTT Art. 178)` })
  return {
    valor: monto,
    desglose: [
      { descripcion: `Valor hora (jornada ${tipo.toLowerCase()})`, formula: `${fmt(salarioDiario, 4)} ÷ ${fmt(horasJornadaDiaria(tipo, fecha, params), 1)}`, valor: fmt(vh, 6) },
      { descripcion: `Valor hora extra (+${fmt(recargo, 0)} %)`, valor: fmt(valorExtra, 6) },
      { descripcion: 'Horas extra', formula: `${fmt(valorExtra, 6)} × ${fmt(horas)}`, valor: fmt(monto) },
    ],
    baseLegal: ['LOTTT Art. 118', 'LOTTT Art. 178'],
    alertas,
  }
}

/**
 * Bono nocturno (LOTTT Art. 117): recargo mínimo del 30 % sobre el valor de
 * la hora de la jornada diurna, por cada hora trabajada en horario nocturno.
 */
export function bonoNocturno(horasNocturnas: Num, salarioDiario: Num, fecha: Fecha, params: ParametrosVigentes): Resultado {
  const vhDiurna = valorHora(salarioDiario, 'DIURNA', fecha, params)
  const recargo = params.valor(P.BONO_NOCTURNO_RECARGO_PCT, fecha)
  const monto = r2(pct(vhDiurna, recargo).times(horasNocturnas))
  return {
    valor: monto,
    desglose: [
      { descripcion: 'Valor hora jornada diurna', valor: fmt(vhDiurna, 6) },
      { descripcion: `Bono nocturno (${fmt(recargo, 0)} % × horas)`, formula: `${fmt(vhDiurna, 6)} × ${fmt(recargo, 0)} % × ${fmt(horasNocturnas)}`, valor: fmt(monto) },
    ],
    baseLegal: ['LOTTT Art. 117'],
    alertas: [],
  }
}

/**
 * Día feriado o de descanso trabajado (LOTTT Arts. 119 y 120): además del
 * salario del día (ya incluido en el sueldo del período), se paga el día
 * trabajado con un recargo del 50 % → salario diario × (1 + 50 %).
 * Se alerta para otorgar el descanso compensatorio cuando aplique.
 */
export function diaFeriadoODescansoTrabajado(dias: Num, salarioDiario: Num, fecha: Fecha, params: ParametrosVigentes, esDescanso: boolean): Resultado {
  const recargo = params.valor(P.FERIADO_DESCANSO_RECARGO_PCT, fecha)
  const valorDia = D(salarioDiario).plus(pct(salarioDiario, recargo))
  const monto = r2(valorDia.times(dias))
  return {
    valor: monto,
    desglose: [{ descripcion: `Día ${esDescanso ? 'de descanso' : 'feriado'} trabajado (+${fmt(recargo, 0)} %)`, formula: `${fmt(salarioDiario, 4)} × (1 + ${fmt(recargo, 0)} %) × ${fmt(dias)}`, valor: fmt(monto) }],
    baseLegal: [esDescanso ? 'LOTTT Art. 119' : 'LOTTT Art. 120'],
    alertas: esDescanso
      ? [{ nivel: 'INFO', codigo: 'DESCANSO_COMPENSATORIO', mensaje: 'Día de descanso trabajado: otorgue el día de descanso compensatorio (LOTTT Art. 119).' }]
      : [],
  }
}
