// Utilidades de fechas sobre cadenas ISO 'AAAA-MM-DD' (UTC, sin horas).
//
// Convención del motor para antigüedad: la fecha de egreso es el ÚLTIMO día
// trabajado. Por eso el tiempo de servicio se mide en [ingreso, egreso + 1).
// Ej.: ingreso 15-01-2025, egreso 14-07-2025 = exactamente 6 meses;
//      egreso 15-07-2025 = 6 meses y 1 día.
import { ErrorMotor, type Fecha } from './tipos'

const MS_DIA = 86_400_000

export function aDate(f: Fecha): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) throw new ErrorMotor('FECHA_INVALIDA', `Fecha inválida: "${f}" (use AAAA-MM-DD)`)
  const [a, m, d] = f.split('-').map(Number) as [number, number, number]
  const dt = new Date(Date.UTC(a, m - 1, d))
  if (dt.getUTCMonth() !== m - 1) throw new ErrorMotor('FECHA_INVALIDA', `Fecha inexistente: "${f}"`)
  return dt
}

export function aFecha(d: Date): Fecha {
  return d.toISOString().slice(0, 10)
}

export const crear = (anio: number, mes: number, dia: number): Fecha => aFecha(new Date(Date.UTC(anio, mes - 1, dia)))

export function sumarDias(f: Fecha, dias: number): Fecha {
  return aFecha(new Date(aDate(f).getTime() + dias * MS_DIA))
}

/** Suma meses ajustando al último día del mes cuando no existe (31-ene + 1 mes = 28/29-feb). */
export function sumarMeses(f: Fecha, meses: number): Fecha {
  const d = aDate(f)
  const total = d.getUTCFullYear() * 12 + d.getUTCMonth() + meses
  const anio = Math.floor(total / 12)
  const mes = total % 12
  const ultimo = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate()
  return aFecha(new Date(Date.UTC(anio, mes, Math.min(d.getUTCDate(), ultimo))))
}

/** Días naturales entre dos fechas (b − a). */
export function diasEntre(a: Fecha, b: Fecha): number {
  return Math.round((aDate(b).getTime() - aDate(a).getTime()) / MS_DIA)
}

export const comparar = (a: Fecha, b: Fecha): number => (a < b ? -1 : a > b ? 1 : 0)
export const enRango = (f: Fecha, desde: Fecha, hasta: Fecha | null): boolean => f >= desde && (hasta === null || f <= hasta)

export const diaSemana = (f: Fecha): number => aDate(f).getUTCDay() // 0 = domingo, 1 = lunes

export function ultimoDiaMes(anio: number, mes: number): Fecha {
  return aFecha(new Date(Date.UTC(anio, mes, 0)))
}

export const anioDe = (f: Fecha) => aDate(f).getUTCFullYear()
export const mesDe = (f: Fecha) => aDate(f).getUTCMonth() + 1

/** Recorre cada día del rango [desde, hasta] (ambos inclusive). */
export function* cadaDia(desde: Fecha, hasta: Fecha): Generator<Fecha> {
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) yield f
}

/** Lunes contenidos en [desde, hasta] (base del cálculo semanal de IVSS y RPE). */
export function lunesEnRango(desde: Fecha, hasta: Fecha): Fecha[] {
  const r: Fecha[] = []
  for (const f of cadaDia(desde, hasta)) if (diaSemana(f) === 1) r.push(f)
  return r
}

export interface Antiguedad {
  anios: number
  meses: number // meses completos adicionales a los años
  dias: number // días adicionales a años y meses
  mesesTotales: number
}

/** Antigüedad entre ingreso y egreso (egreso = último día trabajado, inclusive). */
export function antiguedad(ingreso: Fecha, egreso: Fecha): Antiguedad {
  if (egreso < ingreso) throw new ErrorMotor('FECHAS_INVERTIDAS', 'La fecha de egreso es anterior a la de ingreso')
  const finExclusivo = sumarDias(egreso, 1)
  let mesesTotales = 0
  while (sumarMeses(ingreso, mesesTotales + 1) <= finExclusivo) mesesTotales++
  const dias = diasEntre(sumarMeses(ingreso, mesesTotales), finExclusivo)
  return { anios: Math.floor(mesesTotales / 12), meses: mesesTotales % 12, dias, mesesTotales }
}

/** Meses completos de servicio en [desde, hasta] (inclusive). */
export const mesesCompletos = (desde: Fecha, hasta: Fecha): number => antiguedad(desde, hasta).mesesTotales

/** Domingo de Pascua (algoritmo anónimo gregoriano / Meeus-Jones-Butcher). */
export function domingoPascua(anio: number): Fecha {
  const a = anio % 19
  const b = Math.floor(anio / 100)
  const c = anio % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return crear(anio, mes, dia)
}
