'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Check, Mic } from 'lucide-react'
import { Barra, Boton, Tarjeta, Titulo } from '@/components/ui'
import { BotonAudio } from '@/components/boton-audio'
import { semanaPorNumero } from '@/contenido/curriculo'
import { analizarPronunciacion, useMicrofono } from '@/lib/microfono'
import { useProgreso } from '@/lib/progreso'

export default function PronunciacionSemana() {
  const { numero } = useParams<{ numero: string }>()
  const n = Number(numero)
  const semana = semanaPorNumero(n)
  const { completar, registrarActividad } = useProgreso()

  if (!semana) return <Tarjeta>Esa semana no existe.</Tarjeta>
  const p = semana.pronunciacion

  function terminar() {
    completar(n, 'pronunciacion')
    registrarActividad({ minutos: 4, xp: 20 })
  }

  return (
    <div className="aparecer">
      <Titulo volver={`/semana/${n}`} sub={`Semana ${n}`}>
        Pronunciación
      </Titulo>

      <Tarjeta className="mb-5">
        <h2 className="mb-2 text-xl font-bold">{p.foco}</h2>
        <p className="leading-relaxed">{p.explicacion}</p>
      </Tarjeta>

      {p.paresMinimos && p.paresMinimos.length > 0 && (
        <Tarjeta className="mb-5">
          <h2 className="mb-1 font-bold">Pares mínimos</h2>
          <p className="mb-3 text-sm texto-suave">
            Dos palabras que solo se diferencian en el sonido que estás trabajando. Escucha una y
            otra hasta que oigas la diferencia; después intenta producirla.
          </p>
          <ul className="flex flex-col gap-2">
            {p.paresMinimos.map((par) => (
              <li key={par.a + par.b} className="flex items-center gap-3 rounded-xl border p-2.5">
                <div className="flex flex-1 items-center gap-2">
                  <BotonAudio texto={par.a} tamano="sm" conLento />
                  <span className="font-medium">{par.a}</span>
                </div>
                <span className="texto-suave" aria-hidden>
                  ↔
                </span>
                <div className="flex flex-1 items-center justify-end gap-2">
                  <span className="font-medium">{par.b}</span>
                  <BotonAudio texto={par.b} tamano="sm" conLento />
                </div>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}

      <Tarjeta className="mb-5">
        <h2 className="mb-3 font-bold">Practica en voz alta</h2>
        <div className="flex flex-col gap-3">
          {p.practica.map((frase) => (
            <PracticaFrase key={frase} frase={frase} />
          ))}
        </div>
      </Tarjeta>

      <Tarjeta className="text-center">
        <p className="mb-3 text-sm texto-suave">
          La pronunciación mejora por repetición, no por entenderla. Vuelve a esta página cada día
          de la semana aunque solo sean dos minutos.
        </p>
        <Boton href={`/semana/${n}/escritura`} onClick={terminar} full>
          <Check size={18} /> Practicado, ir a escritura
        </Boton>
      </Tarjeta>
    </div>
  )
}

function PracticaFrase({ frase }: { frase: string }) {
  const { escuchar, escuchando, soportado, error } = useMicrofono()
  const [analisis, setAnalisis] = useState<ReturnType<typeof analizarPronunciacion> | null>(null)
  const { registrarActividad } = useProgreso()

  // Los ejemplos entre paréntesis son ayudas escritas, no parte de la frase.
  const limpia = frase.replace(/\([^)]*\)/g, '').trim()

  async function grabar() {
    const r = await escuchar()
    if (!r.transcripcion) return
    const a = analizarPronunciacion(limpia, r.transcripcion)
    setAnalisis(a)
    registrarActividad({ xp: a.aprobado ? 8 : 3 })
  }

  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-start gap-3">
        <BotonAudio texto={limpia} conLento tamano="sm" />
        <p className="flex-1 font-medium">{frase}</p>
        {soportado && (
          <button
            onClick={grabar}
            disabled={escuchando}
            aria-label="Grabar mi voz"
            className={
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ' +
              (escuchando ? 'pulso-mic bg-amber-600' : 'bg-amber-600 hover:bg-amber-700')
            }
          >
            <Mic size={16} />
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-700 dark:text-red-400">{error}</p>}

      {analisis && (
        <div className="aparecer mt-3">
          <div className="mb-1 flex justify-between text-sm">
            <span className="texto-suave">Se entendió</span>
            <span className="font-semibold">{analisis.puntaje}%</span>
          </div>
          <Barra valor={analisis.puntaje} tono={analisis.puntaje >= 70 ? 'exito' : 'acento'} />
          <p className="mt-2 text-sm">{analisis.comentario}</p>
        </div>
      )}
    </div>
  )
}
