'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Ear, ListChecks, Mic, MessageSquare, PenLine, Shuffle } from 'lucide-react'
import { Boton, Etiqueta, Tarjeta, Titulo, Vacio, cx } from '@/components/ui'
import { TandaEjercicios } from '@/components/ejercicios'
import {
  ejercicioPorId,
  ejerciciosPorDestreza,
  todosLosDialogos,
  todosLosEjercicios,
} from '@/contenido/curriculo'
import { mezclar } from '@/lib/texto'
import { useHidratado, useProgreso } from '@/lib/progreso'
import type { Ejercicio } from '@/lib/tipos'

type Modo = null | 'errores' | 'mixto' | 'escucha' | 'gramatica' | 'habla' | 'escritura'

const MODOS: {
  id: Exclude<Modo, null>
  titulo: string
  descripcion: string
  icono: typeof Ear
}[] = [
  {
    id: 'errores',
    titulo: 'Mis errores',
    descripcion: 'Solo los ejercicios que has fallado. Es la práctica más rentable.',
    icono: AlertTriangle,
  },
  {
    id: 'mixto',
    titulo: 'Examen rápido',
    descripcion: '15 ejercicios al azar de todo lo que has visto.',
    icono: Shuffle,
  },
  {
    id: 'escucha',
    titulo: 'Solo escucha',
    descripcion: 'Dictados: oír y escribir. Lo que más cuesta al principio.',
    icono: Ear,
  },
  {
    id: 'gramatica',
    titulo: 'Solo gramática',
    descripcion: 'Estructuras, tiempos verbales y orden de las palabras.',
    icono: ListChecks,
  },
  {
    id: 'habla',
    titulo: 'Solo hablar',
    descripcion: 'Repetir frases en voz alta con el micrófono.',
    icono: Mic,
  },
  {
    id: 'escritura',
    titulo: 'Solo traducir',
    descripcion: 'Del español al inglés, sin opciones donde esconderse.',
    icono: PenLine,
  },
]

export default function Practica() {
  const hidratado = useHidratado()
  const { semanaActual, errores } = useProgreso()
  const [modo, setModo] = useState<Modo>(null)

  const ejercicios = useMemo<Ejercicio[]>(() => {
    if (!modo) return []
    if (modo === 'errores') {
      return errores.map((id) => ejercicioPorId(id)).filter(Boolean) as Ejercicio[]
    }
    if (modo === 'mixto') {
      const vistos = todosLosEjercicios().filter((e) => e.semana <= semanaActual)
      return mezclar(vistos).slice(0, 15)
    }
    return mezclar(ejerciciosPorDestreza(modo, semanaActual)).slice(0, 15)
  }, [modo, semanaActual, errores])

  const dialogos = useMemo(
    () => todosLosDialogos().filter((d) => d.semana <= semanaActual),
    [semanaActual]
  )

  if (!hidratado) return null

  if (modo) {
    const info = MODOS.find((m) => m.id === modo)!
    return (
      <div className="aparecer">
        <Titulo volver="/practica" sub={info.descripcion}>
          {info.titulo}
        </Titulo>
        <button
          onClick={() => setModo(null)}
          className="mb-4 text-sm text-blue-700 hover:underline dark:text-blue-400"
        >
          ← Elegir otra práctica
        </button>
        {ejercicios.length ? (
          <TandaEjercicios ejercicios={ejercicios} />
        ) : (
          <Vacio>
            {modo === 'errores'
              ? '¡No tienes errores pendientes! Cuando falles algún ejercicio aparecerá aquí para que lo repitas.'
              : 'Todavía no hay ejercicios de este tipo en las semanas que has estudiado. Avanza un poco más en el plan.'}
          </Vacio>
        )}
      </div>
    )
  }

  return (
    <div className="aparecer">
      <Titulo sub="Práctica libre con todo lo que ya has visto, sin seguir el orden del plan.">
        Práctica
      </Titulo>

      <ul className="mb-6 grid gap-2 sm:grid-cols-2">
        {MODOS.map(({ id, titulo, descripcion, icono: Icono }) => {
          const cuantos =
            id === 'errores'
              ? errores.length
              : id === 'mixto'
                ? todosLosEjercicios().filter((e) => e.semana <= semanaActual).length
                : ejerciciosPorDestreza(id, semanaActual).length

          return (
            <li key={id}>
              <button
                onClick={() => setModo(id)}
                className={cx(
                  'flex h-full w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors superficie',
                  'hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
                )}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  <Icono size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-semibold">
                    {titulo}
                    {id === 'errores' && errores.length > 0 && (
                      <Etiqueta tono="error">{errores.length}</Etiqueta>
                    )}
                  </span>
                  <span className="mt-0.5 block text-sm texto-suave">{descripcion}</span>
                  <span className="mt-1 block text-xs texto-suave">
                    {cuantos} disponibles
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <h2 className="mb-3 text-lg font-bold">Diálogos para escuchar</h2>
      <p className="mb-3 text-sm texto-suave">
        Vuelve a cualquier conversación que ya hayas visto. Escucharlas varias veces, en semanas
        distintas, es de lo que más entrena el oído.
      </p>
      <Tarjeta padding={false}>
        <ul>
          {dialogos.map((d) => (
            <li key={d.semana} className="border-b last:border-0" style={{ borderColor: 'var(--borde)' }}>
              <Link
                href={`/semana/${d.semana}/dialogo`}
                className="flex items-center gap-3 p-3 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
              >
                <MessageSquare size={18} className="shrink-0 texto-suave" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{d.titulo}</span>
                  <span className="block truncate text-sm texto-suave">{d.contexto}</span>
                </span>
                <Etiqueta>S{d.semana}</Etiqueta>
              </Link>
            </li>
          ))}
        </ul>
      </Tarjeta>

      <Boton className="mt-5" href="/plan" variante="secundario" full>
        Ver el plan completo
      </Boton>
    </div>
  )
}
