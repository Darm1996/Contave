'use client'

// Todo el progreso vive en el navegador (localStorage). No hay cuenta ni
// servidor: la app funciona sin internet y los datos son del estudiante.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useEffect, useState } from 'react'
import type { CalidadRespuesta, RegistroDia, Tarjeta } from './tipos'
import { calidadDesdeResultado, hoyISO, nuevaTarjeta, pendientes, repasar, sumarDias } from './srs'

export interface Ajustes {
  perfilVoz: string
  /** Multiplicador de velocidad de la voz (0.6 - 1.3). */
  velocidad: number
  /** Minutos que el estudiante se compromete a estudiar al día. */
  metaDiaria: number
  /** Mostrar la traducción al español antes de intentar. */
  traduccionVisible: boolean
  /** Repetir automáticamente el audio en los ejercicios de escucha. */
  autoAudio: boolean
}

export interface EstadoLeccion {
  /** Actividades terminadas de esa semana. */
  gramatica: boolean
  vocabulario: boolean
  ejercicios: boolean
  escritura: boolean
  dialogo: boolean
  pronunciacion: boolean
  /** Mejor porcentaje logrado en la tanda de ejercicios. */
  mejorPuntaje: number
}

export interface Escrito {
  id: string
  tareaId: string
  semana: number
  texto: string
  fecha: string
  puntaje: number
}

const LECCION_VACIA: EstadoLeccion = {
  gramatica: false,
  vocabulario: false,
  ejercicios: false,
  escritura: false,
  dialogo: false,
  pronunciacion: false,
  mejorPuntaje: 0,
}

interface EstadoApp {
  nombre: string
  fechaInicio: string
  ajustes: Ajustes
  /** semana -> estado de sus actividades. */
  lecciones: Record<number, EstadoLeccion>
  /** Semana en la que el estudiante está trabajando. */
  semanaActual: number
  tarjetas: Record<string, Tarjeta>
  dias: Record<string, RegistroDia>
  escritos: Escrito[]
  xpTotal: number
  /** Ejercicios fallados que hay que volver a ver. */
  errores: string[]

  setNombre: (n: string) => void
  setAjustes: (a: Partial<Ajustes>) => void
  setSemanaActual: (n: number) => void
  completar: (semana: number, actividad: keyof Omit<EstadoLeccion, 'mejorPuntaje'>) => void
  registrarPuntaje: (semana: number, puntaje: number) => void
  sembrarTarjetas: (ids: string[], semana: number) => void
  calificarTarjeta: (id: string, calidad: CalidadRespuesta) => void
  registrarActividad: (datos: { minutos?: number; xp?: number; correcto?: boolean }) => void
  guardarEscrito: (e: Omit<Escrito, 'id' | 'fecha'>) => void
  marcarError: (id: string) => void
  limpiarError: (id: string) => void
  reiniciar: () => void
}

const INICIAL = {
  nombre: '',
  fechaInicio: hoyISO(),
  ajustes: {
    perfilVoz: 'emma',
    velocidad: 1,
    metaDiaria: 25,
    traduccionVisible: true,
    autoAudio: true,
  } as Ajustes,
  lecciones: {} as Record<number, EstadoLeccion>,
  semanaActual: 1,
  tarjetas: {} as Record<string, Tarjeta>,
  dias: {} as Record<string, RegistroDia>,
  escritos: [] as Escrito[],
  xpTotal: 0,
  errores: [] as string[],
}

export const useProgreso = create<EstadoApp>()(
  persist(
    (set, get) => ({
      ...INICIAL,

      setNombre: (nombre) => set({ nombre }),

      setAjustes: (a) => set((s) => ({ ajustes: { ...s.ajustes, ...a } })),

      setSemanaActual: (semanaActual) => set({ semanaActual }),

      completar: (semana, actividad) =>
        set((s) => {
          const actual = s.lecciones[semana] ?? LECCION_VACIA
          if (actual[actividad]) return s // ya estaba: no duplicamos XP
          return {
            lecciones: { ...s.lecciones, [semana]: { ...actual, [actividad]: true } },
          }
        }),

      registrarPuntaje: (semana, puntaje) =>
        set((s) => {
          const actual = s.lecciones[semana] ?? LECCION_VACIA
          return {
            lecciones: {
              ...s.lecciones,
              [semana]: { ...actual, mejorPuntaje: Math.max(actual.mejorPuntaje, puntaje) },
            },
          }
        }),

      sembrarTarjetas: (ids, semana) =>
        set((s) => {
          const tarjetas = { ...s.tarjetas }
          let nuevas = 0
          for (const id of ids) {
            if (!tarjetas[id]) {
              tarjetas[id] = nuevaTarjeta(id, semana)
              nuevas++
            }
          }
          return nuevas ? { tarjetas } : s
        }),

      calificarTarjeta: (id, calidad) =>
        set((s) => {
          const t = s.tarjetas[id]
          if (!t) return s
          return { tarjetas: { ...s.tarjetas, [id]: repasar(t, calidad) } }
        }),

      registrarActividad: ({ minutos = 0, xp = 0, correcto }) =>
        set((s) => {
          const fecha = hoyISO()
          const dia: RegistroDia = s.dias[fecha] ?? {
            fecha,
            minutos: 0,
            xp: 0,
            ejerciciosHechos: 0,
            aciertos: 0,
          }
          const actualizado: RegistroDia = {
            ...dia,
            minutos: dia.minutos + minutos,
            xp: dia.xp + xp,
            ejerciciosHechos: dia.ejerciciosHechos + (correcto === undefined ? 0 : 1),
            aciertos: dia.aciertos + (correcto ? 1 : 0),
          }
          return { dias: { ...s.dias, [fecha]: actualizado }, xpTotal: s.xpTotal + xp }
        }),

      guardarEscrito: (e) =>
        set((s) => ({
          escritos: [
            { ...e, id: `${e.tareaId}-${Date.now()}`, fecha: hoyISO() },
            ...s.escritos,
          ].slice(0, 200),
        })),

      marcarError: (id) =>
        set((s) => (s.errores.includes(id) ? s : { errores: [...s.errores, id] })),

      limpiarError: (id) => set((s) => ({ errores: s.errores.filter((e) => e !== id) })),

      reiniciar: () => set({ ...INICIAL, fechaInicio: hoyISO(), nombre: get().nombre }),
    }),
    { name: 'ingles-progreso-v1' }
  )
)

/* ─── Selectores derivados ────────────────────────────────────────── */

export function estadoLeccion(
  lecciones: Record<number, EstadoLeccion>,
  semana: number
): EstadoLeccion {
  return lecciones[semana] ?? LECCION_VACIA
}

export function porcentajeSemana(e: EstadoLeccion): number {
  const partes = [e.gramatica, e.vocabulario, e.ejercicios, e.escritura, e.dialogo, e.pronunciacion]
  return Math.round((partes.filter(Boolean).length / partes.length) * 100)
}

/** Días seguidos estudiando, contando hacia atrás desde hoy. */
export function calcularRacha(dias: Record<string, RegistroDia>): number {
  let racha = 0
  let cursor = hoyISO()
  // Si hoy todavía no se ha estudiado, la racha se mide desde ayer.
  if (!dias[cursor]?.minutos && !dias[cursor]?.xp) cursor = sumarDias(cursor, -1)
  while (dias[cursor] && (dias[cursor].minutos > 0 || dias[cursor].xp > 0)) {
    racha++
    cursor = sumarDias(cursor, -1)
  }
  return racha
}

export function tarjetasPendientes(tarjetas: Record<string, Tarjeta>): Tarjeta[] {
  return pendientes(Object.values(tarjetas))
}

export { calidadDesdeResultado }

/** Evita el parpadeo de hidratación al leer localStorage en el primer render. */
export function useHidratado(): boolean {
  const [listo, setListo] = useState(false)
  useEffect(() => setListo(true), [])
  return listo
}

/** Nivel y título según XP acumulada. */
export function nivelPorXP(xp: number): { nivel: number; titulo: string; faltan: number; pct: number } {
  const porNivel = 500
  const nivel = Math.floor(xp / porNivel) + 1
  const dentro = xp % porNivel
  const titulos = [
    'Principiante',
    'Explorador',
    'Aprendiz',
    'Constante',
    'Conversador',
    'Seguro',
    'Fluido',
    'Avanzado',
  ]
  return {
    nivel,
    titulo: titulos[Math.min(nivel - 1, titulos.length - 1)],
    faltan: porNivel - dentro,
    pct: Math.round((dentro / porNivel) * 100),
  }
}
