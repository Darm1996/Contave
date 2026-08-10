import type { Ejercicio, Mes, Palabra, Semana } from '@/lib/tipos'
import { mes1 } from './mes-1'
import { mes2 } from './mes-2'
import { mes3 } from './mes-3'
import { mes4 } from './mes-4'
import { mes5 } from './mes-5'
import { mes6 } from './mes-6'

export const MESES: Mes[] = [mes1, mes2, mes3, mes4, mes5, mes6]

export const SEMANAS: Semana[] = MESES.flatMap((m) => m.semanas)

export const TOTAL_SEMANAS = SEMANAS.length

export function semanaPorNumero(n: number): Semana | undefined {
  return SEMANAS.find((s) => s.numero === n)
}

export function mesPorNumero(n: number): Mes | undefined {
  return MESES.find((m) => m.numero === n)
}

/** Todo el vocabulario del curso, en orden de aparición. */
export function todoElVocabulario(): (Palabra & { semana: number })[] {
  return SEMANAS.flatMap((s) => s.vocabulario.map((v) => ({ ...v, semana: s.numero })))
}

/** Vocabulario disponible hasta la semana indicada (inclusive). */
export function vocabularioHasta(semana: number): (Palabra & { semana: number })[] {
  return todoElVocabulario().filter((v) => v.semana <= semana)
}

export function palabraPorId(id: string): (Palabra & { semana: number }) | undefined {
  return todoElVocabulario().find((v) => v.id === id)
}

/** Todos los ejercicios del curso, con la semana a la que pertenecen. */
export function todosLosEjercicios(): (Ejercicio & { semana: number })[] {
  return SEMANAS.flatMap((s) => s.ejercicios.map((e) => ({ ...e, semana: s.numero })))
}

export function ejercicioPorId(id: string): (Ejercicio & { semana: number }) | undefined {
  return todosLosEjercicios().find((e) => e.id === id)
}

/** Ejercicios de una destreza concreta hasta cierta semana. Para práctica libre. */
export function ejerciciosPorDestreza(
  destreza: Ejercicio['destreza'],
  hastaSemana: number
): (Ejercicio & { semana: number })[] {
  return todosLosEjercicios().filter((e) => e.destreza === destreza && e.semana <= hastaSemana)
}

/** Todas las tareas de escritura, con su semana. */
export function todasLasTareasEscritura() {
  return SEMANAS.flatMap((s) => s.escritura.map((t) => ({ ...t, semana: s.numero })))
}

/** Todos los diálogos, para la sección de conversación. */
export function todosLosDialogos() {
  return SEMANAS.map((s) => ({ ...s.dialogo, semana: s.numero, nivel: s.nivel }))
}

export const ESTADISTICAS = {
  semanas: TOTAL_SEMANAS,
  meses: MESES.length,
  palabras: todoElVocabulario().length,
  ejercicios: todosLosEjercicios().length,
  dialogos: SEMANAS.length,
  tareasEscritura: todasLasTareasEscritura().length,
  temasGramatica: SEMANAS.reduce((n, s) => n + s.gramatica.length, 0),
}
