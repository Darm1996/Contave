'use client'

import { useMemo, useState } from 'react'
import { Layers, RotateCcw, Sparkles } from 'lucide-react'
import { Barra, Boton, Etiqueta, Tarjeta, Titulo, cx } from '@/components/ui'
import { BotonAudio } from '@/components/boton-audio'
import { palabraPorId, vocabularioHasta } from '@/contenido/curriculo'
import { dominadas } from '@/lib/srs'
import { tarjetasPendientes, useHidratado, useProgreso } from '@/lib/progreso'
import type { CalidadRespuesta } from '@/lib/tipos'

const BOTONES: { texto: string; calidad: CalidadRespuesta; clase: string; nota: string }[] = [
  { texto: 'No la sabía', calidad: 0, clase: 'bg-red-700 hover:bg-red-800 text-white', nota: 'vuelve hoy' },
  { texto: 'Me costó', calidad: 3, clase: 'bg-amber-600 hover:bg-amber-700 text-white', nota: 'vuelve pronto' },
  { texto: 'Bien', calidad: 4, clase: 'bg-blue-700 hover:bg-blue-800 text-white', nota: 'más adelante' },
  { texto: 'Fácil', calidad: 5, clase: 'bg-green-700 hover:bg-green-800 text-white', nota: 'mucho después' },
]

export default function Repaso() {
  const hidratado = useHidratado()
  const { tarjetas, calificarTarjeta, registrarActividad, sembrarTarjetas, semanaActual } =
    useProgreso()

  const [revelada, setRevelada] = useState(false)
  const [hechas, setHechas] = useState(0)
  const [invertida, setInvertida] = useState(false)

  const pendientes = useMemo(() => tarjetasPendientes(tarjetas), [tarjetas])
  const total = Object.keys(tarjetas).length
  const aprendidas = dominadas(Object.values(tarjetas))

  const actual = pendientes[0]
  const palabra = actual ? palabraPorId(actual.id) : undefined

  if (!hidratado) return null

  function calificar(calidad: CalidadRespuesta) {
    if (!actual) return
    calificarTarjeta(actual.id, calidad)
    registrarActividad({ xp: calidad >= 4 ? 5 : 2, minutos: 0, correcto: calidad >= 3 })
    setRevelada(false)
    setHechas((h) => h + 1)
  }

  // Sin tarjetas todavía: se ofrece cargar el vocabulario ya visto.
  if (total === 0) {
    const disponibles = vocabularioHasta(semanaActual)
    return (
      <div className="aparecer">
        <Titulo sub="Repaso espaciado: cada palabra vuelve justo antes de que se te olvide.">
          Repaso de vocabulario
        </Titulo>
        <Tarjeta className="text-center">
          <Layers size={36} className="mx-auto mb-3 texto-suave" />
          <p className="mb-1 font-semibold">Todavía no tienes palabras en repaso</p>
          <p className="mb-4 text-sm texto-suave">
            Las palabras entran automáticamente cuando estudias el vocabulario de cada semana.
            También puedes cargar ahora las {disponibles.length} palabras de las semanas 1 a{' '}
            {semanaActual}.
          </p>
          <Boton
            onClick={() =>
              sembrarTarjetas(
                disponibles.map((v) => v.id),
                semanaActual
              )
            }
          >
            <Sparkles size={17} /> Cargar {disponibles.length} palabras
          </Boton>
        </Tarjeta>
      </div>
    )
  }

  // Nada pendiente hoy.
  if (!actual || !palabra) {
    return (
      <div className="aparecer">
        <Titulo sub="Repaso espaciado">Repaso de vocabulario</Titulo>
        <Tarjeta className="text-center">
          <p className="mb-2 text-5xl">✅</p>
          <p className="mb-1 text-lg font-bold">Repaso terminado por hoy</p>
          <p className="text-sm texto-suave">
            {hechas > 0 && `Repasaste ${hechas} ${hechas === 1 ? 'palabra' : 'palabras'}. `}
            Vuelve mañana: el sistema te traerá las que estén a punto de olvidarse.
          </p>
        </Tarjeta>
        <Resumen total={total} aprendidas={aprendidas} />
        <Boton className="mt-4" href="/" variante="secundario" full>
          Volver a la sesión de hoy
        </Boton>
      </div>
    )
  }

  const anverso = invertida ? palabra.es : palabra.en
  const reverso = invertida ? palabra.en : palabra.es

  return (
    <div className="aparecer">
      <Titulo sub={`${pendientes.length} ${pendientes.length === 1 ? 'palabra pendiente' : 'palabras pendientes'} hoy`}>
        Repaso de vocabulario
      </Titulo>

      <div className="mb-4">
        <Barra valor={(hechas / (hechas + pendientes.length)) * 100} tono="acento" />
      </div>

      <Tarjeta className="mb-4 text-center">
        <div className="mb-3 flex items-center justify-between">
          <Etiqueta>Semana {palabra.semana}</Etiqueta>
          {actual.fallos > 0 && <Etiqueta tono="error">fallada {actual.fallos}×</Etiqueta>}
        </div>

        <div className="py-6">
          <p className="text-3xl font-bold">{anverso}</p>
          {!invertida && palabra.pron && (
            <p className="mt-1 texto-suave">/{palabra.pron}/</p>
          )}
          {!invertida && (
            <div className="mt-4 flex justify-center">
              <BotonAudio texto={palabra.en.split(' / ')[0]} conLento />
            </div>
          )}

          {revelada && (
            <div className="aparecer mt-6 border-t pt-5" style={{ borderColor: 'var(--borde)' }}>
              <p className="text-2xl font-semibold">{reverso}</p>
              {palabra.ejemplo && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <BotonAudio texto={palabra.ejemplo} tamano="sm" />
                  <p className="text-left text-sm italic">
                    {palabra.ejemplo}
                    {palabra.ejemploEs && (
                      <span className="block not-italic texto-suave">{palabra.ejemploEs}</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </Tarjeta>

      {!revelada ? (
        <Boton full tamano="lg" onClick={() => setRevelada(true)}>
          Ver la respuesta
        </Boton>
      ) : (
        <div className="aparecer grid grid-cols-2 gap-2">
          {BOTONES.map((b) => (
            <button
              key={b.texto}
              onClick={() => calificar(b.calidad)}
              className={cx('rounded-xl px-3 py-3 font-medium transition-colors', b.clase)}
            >
              {b.texto}
              <span className="block text-xs font-normal opacity-80">{b.nota}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex justify-center">
        <Boton
          variante="fantasma"
          tamano="sm"
          onClick={() => {
            setInvertida(!invertida)
            setRevelada(false)
          }}
        >
          <RotateCcw size={15} /> {invertida ? 'Ver inglés primero' : 'Ver español primero'}
        </Boton>
      </div>

      <Resumen total={total} aprendidas={aprendidas} />
    </div>
  )
}

function Resumen({ total, aprendidas }: { total: number; aprendidas: number }) {
  return (
    <Tarjeta className="mt-5">
      <div className="flex items-baseline justify-between">
        <p className="text-sm texto-suave">Palabras en tu memoria a largo plazo</p>
        <p className="font-bold">
          {aprendidas} <span className="font-normal texto-suave">/ {total}</span>
        </p>
      </div>
      <Barra className="mt-2" valor={total ? (aprendidas / total) * 100 : 0} tono="exito" />
      <p className="mt-2 text-xs texto-suave">
        Una palabra cuenta como aprendida cuando el sistema ya no necesita mostrártela en tres
        semanas.
      </p>
    </Tarjeta>
  )
}
