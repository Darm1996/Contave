'use client'

import Link from 'next/link'
import { CheckCircle2, Circle, Lock } from 'lucide-react'
import { Barra, Boton, Etiqueta, Tarjeta, Titulo, cx } from '@/components/ui'
import { MESES, TOTAL_SEMANAS } from '@/contenido/curriculo'
import { estadoLeccion, porcentajeSemana, useHidratado, useProgreso } from '@/lib/progreso'

export default function Plan() {
  const hidratado = useHidratado()
  const { lecciones, semanaActual, setSemanaActual } = useProgreso()

  const completadas = Object.values(lecciones).filter((l) => porcentajeSemana(l) === 100).length
  const global = Math.round(
    (Object.values(lecciones).reduce((n, l) => n + porcentajeSemana(l), 0) / (TOTAL_SEMANAS * 100)) *
      100
  )

  if (!hidratado) return null

  return (
    <div className="aparecer">
      <Titulo sub="Seis meses, veinticuatro semanas, de no saber nada a mantener una conversación.">
        Tu plan completo
      </Titulo>

      <Tarjeta className="mb-6">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="font-semibold">Progreso general</p>
          <p className="text-sm texto-suave">
            {completadas} de {TOTAL_SEMANAS} semanas terminadas
          </p>
        </div>
        <Barra valor={global} tono="exito" />
      </Tarjeta>

      <div className="flex flex-col gap-6">
        {MESES.map((mes) => {
          const pctMes = Math.round(
            mes.semanas.reduce((n, s) => n + porcentajeSemana(estadoLeccion(lecciones, s.numero)), 0) /
              mes.semanas.length
          )

          return (
            <section key={mes.numero}>
              <div className="mb-2 flex items-baseline gap-3">
                <h2 className="text-lg font-bold">
                  Mes {mes.numero}: {mes.titulo}
                </h2>
                <span className="text-sm texto-suave">{pctMes}%</span>
              </div>
              <p className="mb-1 text-sm texto-suave">{mes.descripcion}</p>
              <p className="mb-3 text-sm font-medium">🎯 {mes.meta}</p>

              <ul className="flex flex-col gap-2">
                {mes.semanas.map((s) => {
                  const estado = estadoLeccion(lecciones, s.numero)
                  const pct = porcentajeSemana(estado)
                  const esActual = s.numero === semanaActual
                  // No se bloquea nada: si alguien quiere adelantarse, allá él.
                  // Solo se marca lo que aún no ha empezado.
                  const empezada = pct > 0

                  return (
                    <li key={s.numero}>
                      <Link
                        href={`/semana/${s.numero}`}
                        onClick={() => setSemanaActual(s.numero)}
                        className={cx(
                          'flex items-center gap-3 rounded-2xl border p-3 transition-colors superficie',
                          'hover:bg-black/[0.03] dark:hover:bg-white/[0.05]',
                          esActual && 'border-blue-600 ring-1 ring-blue-600/30'
                        )}
                      >
                        <span className="shrink-0">
                          {pct === 100 ? (
                            <CheckCircle2 size={22} className="text-green-600" />
                          ) : empezada ? (
                            <Circle size={22} className="text-amber-500" />
                          ) : (
                            <Lock size={20} className="texto-suave opacity-40" />
                          )}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">
                              Semana {s.numero}: {s.titulo}
                            </span>
                            {esActual && <Etiqueta tono="marca">actual</Etiqueta>}
                          </span>
                          <span className="mt-0.5 block text-sm texto-suave">{s.objetivo}</span>
                          {pct > 0 && pct < 100 && <Barra className="mt-2" valor={pct} />}
                        </span>

                        <Etiqueta>{s.nivel}</Etiqueta>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>

      <Tarjeta className="mt-8">
        <h2 className="mb-2 font-bold">¿Cómo usar el plan?</h2>
        <ul className="flex flex-col gap-2 text-sm texto-suave">
          <li>
            <b className="text-[var(--texto)]">Una semana por semana.</b> Cada una son unos 25
            minutos al día durante 5 o 6 días. Ir más rápido no acelera el aprendizaje: el cerebro
            necesita las noches para consolidar.
          </li>
          <li>
            <b className="text-[var(--texto)]">No saltes el repaso.</b> Las palabras vuelven cuando
            estás a punto de olvidarlas. Ese es todo el truco.
          </li>
          <li>
            <b className="text-[var(--texto)]">Habla desde la semana 1.</b> Los ejercicios de
            micrófono son los más incómodos y los más útiles.
          </li>
          <li>
            <b className="text-[var(--texto)]">Si una semana te cuesta, repítela.</b> Es mejor que
            arrastrar el hueco durante los cinco meses siguientes.
          </li>
        </ul>
        <Boton className="mt-4" href="/" variante="secundario">
          Volver a la sesión de hoy
        </Boton>
      </Tarjeta>
    </div>
  )
}
