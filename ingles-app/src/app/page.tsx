'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  Flame,
  Lightbulb,
  Mic,
  MessageSquare,
  PenLine,
  Layers,
  ListChecks,
  Play,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { Barra, Boton, Etiqueta, Tarjeta, Titulo, cx } from '@/components/ui'
import {
  calcularRacha,
  estadoLeccion,
  nivelPorXP,
  porcentajeSemana,
  tarjetasPendientes,
  useHidratado,
  useProgreso,
} from '@/lib/progreso'
import { construirPlan, consejoDelDia, type Actividad } from '@/lib/plan-diario'
import { ESTADISTICAS, TOTAL_SEMANAS, semanaPorNumero } from '@/contenido/curriculo'
import { hoyISO } from '@/lib/srs'

const ICONOS: Record<Actividad['icono'], typeof BookOpen> = {
  repaso: Layers,
  gramatica: BookOpen,
  vocabulario: Sparkles,
  ejercicios: ListChecks,
  dialogo: MessageSquare,
  escritura: PenLine,
  habla: Mic,
}

export default function Hoy() {
  const hidratado = useHidratado()
  const { nombre, setNombre, semanaActual, lecciones, tarjetas, dias, xpTotal, ajustes } =
    useProgreso()

  const semana = semanaPorNumero(semanaActual) ?? semanaPorNumero(1)!
  const estado = estadoLeccion(lecciones, semanaActual)
  const pendientes = useMemo(() => tarjetasPendientes(tarjetas), [tarjetas])
  const plan = useMemo(
    () => construirPlan(semana, estado, pendientes.length),
    [semana, estado, pendientes.length]
  )

  const racha = calcularRacha(dias)
  const hoy = dias[hoyISO()]
  const minutosHoy = hoy?.minutos ?? 0
  const nivel = nivelPorXP(xpTotal)

  if (!hidratado) return <Esqueleto />
  if (!nombre) return <Bienvenida onListo={setNombre} />

  return (
    <div className="aparecer">
      <Titulo sub={`Semana ${semana.numero} de ${TOTAL_SEMANAS} · ${semana.titulo}`}>
        Hola, {nombre} 👋
      </Titulo>

      {/* Marcadores */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        <Marcador
          icono={<Flame size={18} className="text-amber-600" />}
          valor={racha}
          etiqueta={racha === 1 ? 'día seguido' : 'días seguidos'}
        />
        <Marcador
          icono={<Trophy size={18} className="text-blue-700 dark:text-blue-400" />}
          valor={xpTotal}
          etiqueta="puntos"
        />
        <Marcador
          icono={<Play size={18} className="text-green-700 dark:text-green-400" />}
          valor={`${minutosHoy}′`}
          etiqueta={`de ${ajustes.metaDiaria}′ hoy`}
        />
      </div>

      {/* Meta diaria */}
      <Tarjeta className="mb-5">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <p className="font-semibold">
            Nivel {nivel.nivel} · <span className="texto-suave font-normal">{nivel.titulo}</span>
          </p>
          <p className="text-sm texto-suave">{nivel.faltan} pts para el siguiente</p>
        </div>
        <Barra valor={nivel.pct} />
        <div className="mt-3 flex items-baseline justify-between gap-3">
          <p className="text-sm texto-suave">Meta de hoy: {ajustes.metaDiaria} minutos</p>
          <p className="text-sm font-medium">
            {Math.min(100, Math.round((minutosHoy / ajustes.metaDiaria) * 100))}%
          </p>
        </div>
        <Barra
          className="mt-1.5"
          tono={minutosHoy >= ajustes.metaDiaria ? 'exito' : 'acento'}
          valor={(minutosHoy / ajustes.metaDiaria) * 100}
        />
      </Tarjeta>

      {/* Sesión de hoy */}
      <section className="mb-5">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-bold">Tu sesión de hoy</h2>
          <span className="text-sm texto-suave">
            {plan.minutosTotales > 0 ? `≈ ${plan.minutosTotales} min` : '¡Todo hecho!'}
          </span>
        </div>

        {plan.siguiente && (
          <Boton href={plan.siguiente.ruta} tamano="lg" full className="mb-3">
            <Play size={20} /> Continuar: {plan.siguiente.titulo}
          </Boton>
        )}

        <ul className="flex flex-col gap-2">
          {plan.actividades.map((a) => {
            const Icono = ICONOS[a.icono]
            return (
              <li key={a.id}>
                <Link
                  href={a.ruta}
                  className={cx(
                    'flex items-center gap-3 rounded-2xl border p-3 transition-colors superficie',
                    'hover:bg-black/[0.03] dark:hover:bg-white/[0.05]',
                    a.hecho && 'opacity-60'
                  )}
                >
                  <span
                    className={cx(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                      a.hecho
                        ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    )}
                  >
                    <Icono size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">
                      {a.titulo} {a.hecho && '✓'}
                    </span>
                    <span className="block truncate text-sm texto-suave">{a.descripcion}</span>
                  </span>
                  <span className="shrink-0 text-xs texto-suave">{a.minutos}′</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Semana actual */}
      <Tarjeta className="mb-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="font-bold">
            Semana {semana.numero}: {semana.titulo}
          </h2>
          <Etiqueta tono="marca">{semana.nivel}</Etiqueta>
        </div>
        <p className="mb-3 text-sm texto-suave">{semana.objetivo}</p>
        <Barra valor={porcentajeSemana(estado)} tono="exito" />
        <div className="mt-3 flex flex-wrap gap-2">
          <Boton href={`/semana/${semana.numero}`} variante="secundario" tamano="sm">
            Ver la semana completa
          </Boton>
          <Boton href="/plan" variante="fantasma" tamano="sm">
            Plan de 6 meses
          </Boton>
        </div>
      </Tarjeta>

      {/* Consejo */}
      <Tarjeta className="mb-5 border-amber-300/60 bg-amber-50/70 dark:bg-amber-950/20">
        <div className="flex gap-3">
          <Lightbulb size={20} className="mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold">Consejo del día</p>
            <p className="mt-1 text-sm">{consejoDelDia()}</p>
          </div>
        </div>
      </Tarjeta>

      <p className="text-center text-xs texto-suave">
        {ESTADISTICAS.palabras} palabras · {ESTADISTICAS.ejercicios} ejercicios ·{' '}
        {ESTADISTICAS.temasGramatica} temas de gramática
      </p>
    </div>
  )
}

function Marcador({
  icono,
  valor,
  etiqueta,
}: {
  icono: React.ReactNode
  valor: string | number
  etiqueta: string
}) {
  return (
    <div className="superficie rounded-2xl border p-3 text-center shadow-sm">
      <div className="mb-1 flex justify-center">{icono}</div>
      <p className="text-xl font-bold leading-none">{valor}</p>
      <p className="mt-1 text-[11px] leading-tight texto-suave">{etiqueta}</p>
    </div>
  )
}

function Esqueleto() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-9 w-52 animate-pulse rounded-lg bg-black/[0.07] dark:bg-white/[0.08]" />
      <div className="h-24 animate-pulse rounded-2xl bg-black/[0.06] dark:bg-white/[0.06]" />
      <div className="h-40 animate-pulse rounded-2xl bg-black/[0.06] dark:bg-white/[0.06]" />
    </div>
  )
}

function Bienvenida({ onListo }: { onListo: (nombre: string) => void }) {
  const [valor, setValor] = useState('')

  return (
    <div className="aparecer mx-auto max-w-md pt-8">
      <div className="mb-6 text-center">
        <p className="mb-3 text-5xl" aria-hidden>
          🎧
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Inglés desde cero</h1>
        <p className="mt-2 texto-suave">
          Un plan real de 6 meses, con un profesor que habla en voz alta y te corrige.
        </p>
      </div>

      <Tarjeta className="mb-4">
        <ul className="flex flex-col gap-3 text-sm">
          <Punto>
            <b>{ESTADISTICAS.semanas} semanas</b> estructuradas de A0 a B1, sin saltos.
          </Punto>
          <Punto>
            <b>Seis voces</b> con acentos distintos: británico, americano, australiano e indio.
          </Punto>
          <Punto>
            <b>{ESTADISTICAS.palabras} palabras</b> con repaso espaciado, para que no se te olviden.
          </Punto>
          <Punto>
            <b>{ESTADISTICAS.ejercicios} ejercicios</b> de gramática, escucha, escritura y
            pronunciación con micrófono.
          </Punto>
        </ul>
      </Tarjeta>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (valor.trim()) onListo(valor.trim())
        }}
      >
        <label htmlFor="nombre" className="mb-1.5 block text-sm font-medium">
          ¿Cómo te llamas?
        </label>
        <input
          id="nombre"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Tu nombre"
          autoComplete="given-name"
          className="mb-3 w-full rounded-xl border superficie px-4 py-3"
        />
        <Boton type="submit" tamano="lg" full disabled={!valor.trim()}>
          Empezar el curso
        </Boton>
      </form>

      <p className="mt-4 text-center text-xs texto-suave">
        No hay cuentas ni contraseñas. Todo tu progreso se guarda en este dispositivo.
      </p>
    </div>
  )
}

function Punto({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-0.5 text-blue-700 dark:text-blue-400">✓</span>
      <span>{children}</span>
    </li>
  )
}
