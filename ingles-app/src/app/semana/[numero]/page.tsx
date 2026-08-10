'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { BookOpen, Check, ListChecks, MessageSquare, Mic, PenLine, Sparkles } from 'lucide-react'
import { Barra, Boton, Etiqueta, Tarjeta, Titulo, cx } from '@/components/ui'
import { TOTAL_SEMANAS, semanaPorNumero } from '@/contenido/curriculo'
import {
  estadoLeccion,
  porcentajeSemana,
  useHidratado,
  useProgreso,
  type EstadoLeccion,
} from '@/lib/progreso'

const SECCIONES: {
  clave: keyof Omit<EstadoLeccion, 'mejorPuntaje'>
  ruta: string
  titulo: string
  icono: typeof BookOpen
  descripcion: (s: ReturnType<typeof semanaPorNumero>) => string
}[] = [
  {
    clave: 'gramatica',
    ruta: 'gramatica',
    titulo: 'Gramática',
    icono: BookOpen,
    descripcion: (s) => s!.gramatica.map((g) => g.titulo).join(' · '),
  },
  {
    clave: 'vocabulario',
    ruta: 'vocabulario',
    titulo: 'Vocabulario y frases',
    icono: Sparkles,
    descripcion: (s) => `${s!.vocabulario.length} palabras y ${s!.frases.length} frases con audio`,
  },
  {
    clave: 'ejercicios',
    ruta: 'ejercicios',
    titulo: 'Ejercicios',
    icono: ListChecks,
    descripcion: (s) => `${s!.ejercicios.length} ejercicios de todos los tipos`,
  },
  {
    clave: 'dialogo',
    ruta: 'dialogo',
    titulo: 'Diálogo',
    icono: MessageSquare,
    descripcion: (s) => s!.dialogo.titulo,
  },
  {
    clave: 'pronunciacion',
    ruta: 'pronunciacion',
    titulo: 'Pronunciación',
    icono: Mic,
    descripcion: (s) => s!.pronunciacion.foco,
  },
  {
    clave: 'escritura',
    ruta: 'escritura',
    titulo: 'Escritura',
    icono: PenLine,
    descripcion: (s) =>
      s!.escritura.length > 1 ? `${s!.escritura.length} redacciones` : s!.escritura[0].titulo,
  },
]

export default function SemanaHub() {
  const params = useParams<{ numero: string }>()
  const numero = Number(params.numero)
  const semana = semanaPorNumero(numero)
  const hidratado = useHidratado()
  const { lecciones, setSemanaActual } = useProgreso()

  if (!semana) {
    return (
      <Tarjeta>
        <p>Esa semana no existe.</p>
        <Boton className="mt-3" href="/plan">
          Ver el plan
        </Boton>
      </Tarjeta>
    )
  }

  const estado = estadoLeccion(lecciones, numero)
  const pct = porcentajeSemana(estado)

  return (
    <div className="aparecer">
      <Titulo
        volver="/plan"
        sub={`Semana ${semana.numero} de ${TOTAL_SEMANAS} · Mes ${semana.mes} · Nivel ${semana.nivel}`}
      >
        {semana.titulo}
      </Titulo>

      <Tarjeta className="mb-5">
        <p className="mb-3 font-medium">🎯 {semana.objetivo}</p>
        <p className="mb-2 text-sm font-semibold texto-suave">Al terminar la semana podrás:</p>
        <ul className="mb-4 flex flex-col gap-1.5">
          {semana.puedeHacer.map((p) => (
            <li key={p} className="flex gap-2 text-sm">
              <Check size={16} className="mt-0.5 shrink-0 text-green-600" />
              {p}
            </li>
          ))}
        </ul>
        {hidratado && <Barra valor={pct} tono="exito" />}
      </Tarjeta>

      <ul className="mb-6 flex flex-col gap-2">
        {SECCIONES.map(({ clave, ruta, titulo, icono: Icono, descripcion }) => {
          const hecho = hidratado && estado[clave]
          return (
            <li key={clave}>
              <Link
                href={`/semana/${numero}/${ruta}`}
                onClick={() => setSemanaActual(numero)}
                className={cx(
                  'flex items-center gap-3 rounded-2xl border p-3.5 transition-colors superficie',
                  'hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
                )}
              >
                <span
                  className={cx(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                    hecho
                      ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                  )}
                >
                  <Icono size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-medium">
                    {titulo}
                    {hecho && <Check size={15} className="text-green-600" />}
                  </span>
                  <span className="block truncate text-sm texto-suave">{descripcion(semana)}</span>
                </span>
                <span aria-hidden className="texto-suave">
                  ›
                </span>
              </Link>
            </li>
          )
        })}
      </ul>

      {hidratado && estado.mejorPuntaje > 0 && (
        <Tarjeta className="mb-5">
          <p className="text-sm">
            Tu mejor resultado en los ejercicios de esta semana:{' '}
            <b>{estado.mejorPuntaje}%</b>
          </p>
        </Tarjeta>
      )}

      <div className="flex flex-wrap gap-2">
        {numero > 1 && (
          <Boton href={`/semana/${numero - 1}`} variante="secundario" tamano="sm">
            ← Semana {numero - 1}
          </Boton>
        )}
        {numero < TOTAL_SEMANAS && (
          <Boton href={`/semana/${numero + 1}`} variante="secundario" tamano="sm">
            Semana {numero + 1} →
          </Boton>
        )}
      </div>
    </div>
  )
}
