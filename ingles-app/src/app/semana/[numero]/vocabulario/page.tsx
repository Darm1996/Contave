'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Check, Eye, EyeOff } from 'lucide-react'
import { Boton, Etiqueta, Tarjeta, Titulo } from '@/components/ui'
import { BotonAudio, Frase } from '@/components/boton-audio'
import { semanaPorNumero } from '@/contenido/curriculo'
import { useProgreso } from '@/lib/progreso'

export default function VocabularioSemana() {
  const { numero } = useParams<{ numero: string }>()
  const n = Number(numero)
  const semana = semanaPorNumero(n)
  const { completar, registrarActividad, sembrarTarjetas } = useProgreso()
  const [ocultarEs, setOcultarEs] = useState(false)

  if (!semana) return <Tarjeta>Esa semana no existe.</Tarjeta>

  function terminar() {
    // Al estudiar la lista, las palabras entran en el sistema de repaso
    // espaciado y volverán solas los próximos días.
    sembrarTarjetas(
      semana!.vocabulario.map((v) => v.id),
      n
    )
    completar(n, 'vocabulario')
    registrarActividad({ minutos: 5, xp: 25 })
  }

  return (
    <div className="aparecer">
      <Titulo volver={`/semana/${n}`} sub={`Semana ${n} · ${semana.vocabulario.length} palabras`}>
        Vocabulario
      </Titulo>

      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm texto-suave">Toca el altavoz para oír cada palabra.</p>
        <Boton variante="secundario" tamano="sm" onClick={() => setOcultarEs(!ocultarEs)}>
          {ocultarEs ? <Eye size={15} /> : <EyeOff size={15} />}
          {ocultarEs ? 'Ver español' : 'Taparlo'}
        </Boton>
      </div>

      <Tarjeta className="mb-6" padding={false}>
        <ul>
          {semana.vocabulario.map((p, i) => (
            <li
              key={p.id}
              className="flex items-start gap-3 border-b p-3 last:border-0"
              style={{ borderColor: 'var(--borde)' }}
            >
              <span className="w-6 shrink-0 pt-2 text-xs texto-suave">{i + 1}</span>
              <BotonAudio texto={p.en.split(' / ')[0]} tamano="sm" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {p.en}{' '}
                  {p.pron && <span className="text-sm font-normal texto-suave">/{p.pron}/</span>}
                </p>
                <p className="text-sm texto-suave">
                  {ocultarEs ? <span className="select-none opacity-0">···</span> : p.es}
                </p>
                {p.ejemplo && (
                  <p className="mt-1 text-sm italic">
                    {p.ejemplo}
                    {p.ejemploEs && !ocultarEs && (
                      <span className="not-italic texto-suave"> — {p.ejemploEs}</span>
                    )}
                  </p>
                )}
              </div>
              {p.tipo && <Etiqueta>{p.tipo}</Etiqueta>}
            </li>
          ))}
        </ul>
      </Tarjeta>

      <h2 className="mb-3 text-lg font-bold">Frases para memorizar completas</h2>
      <p className="mb-3 text-sm texto-suave">
        Estas no se analizan, se aprenden enteras. Son bloques que salen solos cuando los necesitas.
      </p>
      <Tarjeta className="mb-6">
        <div className="flex flex-col gap-4">
          {semana.frases.map((f) => (
            <Frase key={f.en} en={f.en} es={f.es} nota={f.uso} conLento />
          ))}
        </div>
      </Tarjeta>

      <Tarjeta className="text-center">
        <p className="mb-3 text-sm texto-suave">
          Al marcarlo, estas palabras entran en tu repaso espaciado: volverán solas durante los
          próximos días, justo antes de que se te olviden.
        </p>
        <Boton href={`/semana/${n}/ejercicios`} onClick={terminar} full>
          <Check size={18} /> Listo, a practicar
        </Boton>
      </Tarjeta>
    </div>
  )
}
