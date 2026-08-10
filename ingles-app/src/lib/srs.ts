// Repaso espaciado (SM-2). Es lo que hace que el vocabulario se quede a los
// 6 meses en vez de olvidarse a la semana: cada palabra vuelve justo antes de
// que la vayas a olvidar, y las que fallas vuelven mucho más seguido.

import type { CalidadRespuesta, Tarjeta } from './tipos'

export function hoyISO(d: Date = new Date()): string {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return z.toISOString().slice(0, 10)
}

export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(fecha + 'T00:00:00')
  d.setDate(d.getDate() + dias)
  return hoyISO(d)
}

export function diasEntre(desde: string, hasta: string): number {
  const a = new Date(desde + 'T00:00:00').getTime()
  const b = new Date(hasta + 'T00:00:00').getTime()
  return Math.round((b - a) / 86400000)
}

export function nuevaTarjeta(id: string, semana: number): Tarjeta {
  return {
    id,
    facilidad: 2.5,
    intervalo: 0,
    repeticiones: 0,
    proximo: hoyISO(),
    fallos: 0,
    semana,
  }
}

/**
 * Actualiza una tarjeta según la calidad de la respuesta (0-5).
 * Menos de 3 = fallo: la tarjeta vuelve a empezar y reaparece el mismo día.
 */
export function repasar(tarjeta: Tarjeta, calidad: CalidadRespuesta): Tarjeta {
  const t = { ...tarjeta }

  if (calidad < 3) {
    t.repeticiones = 0
    t.intervalo = 0
    t.fallos += 1
    t.proximo = hoyISO() // se repite en la misma sesión
  } else {
    t.repeticiones += 1
    if (t.repeticiones === 1) t.intervalo = 1
    else if (t.repeticiones === 2) t.intervalo = 6
    else t.intervalo = Math.round(t.intervalo * t.facilidad)
    t.proximo = sumarDias(hoyISO(), t.intervalo)
  }

  // Ajuste del factor de facilidad de SM-2.
  const nf = t.facilidad + (0.1 - (5 - calidad) * (0.08 + (5 - calidad) * 0.02))
  t.facilidad = Math.max(1.3, Number(nf.toFixed(2)))
  return t
}

/** Tarjetas que tocan hoy (o que ya se pasaron de fecha). */
export function pendientes(tarjetas: Tarjeta[], fecha = hoyISO()): Tarjeta[] {
  return tarjetas
    .filter((t) => t.proximo <= fecha)
    .sort((a, b) => {
      // Primero lo más atrasado; a igualdad, lo que más se ha fallado.
      if (a.proximo !== b.proximo) return a.proximo < b.proximo ? -1 : 1
      return b.fallos - a.fallos
    })
}

/** Cuántas tarjetas ya se consideran "aprendidas" (intervalo largo). */
export function dominadas(tarjetas: Tarjeta[]): number {
  return tarjetas.filter((t) => t.intervalo >= 21).length
}

/**
 * Convierte el resultado de un ejercicio en una calidad SM-2.
 * `casi` (un error de dedo) no se castiga igual que no saberlo.
 */
export function calidadDesdeResultado(
  correcto: boolean,
  casi: boolean,
  conAyuda = false
): CalidadRespuesta {
  if (correcto) return conAyuda ? 3 : 5
  if (casi) return 2
  return 0
}
