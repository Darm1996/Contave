'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { AlertCircle, Check, CheckCircle2, Eye, Info } from 'lucide-react'
import { Barra, Boton, Tarjeta, Titulo, cx } from '@/components/ui'
import { BotonAudio } from '@/components/boton-audio'
import { semanaPorNumero } from '@/contenido/curriculo'
import { corregir, type Correccion } from '@/lib/escritura'
import { contarPalabras } from '@/lib/texto'
import { useProgreso } from '@/lib/progreso'
import type { TareaEscritura } from '@/lib/tipos'

export default function EscrituraSemana() {
  const { numero } = useParams<{ numero: string }>()
  const n = Number(numero)
  const semana = semanaPorNumero(n)

  if (!semana) return <Tarjeta>Esa semana no existe.</Tarjeta>

  return (
    <div className="aparecer">
      <Titulo volver={`/semana/${n}`} sub={`Semana ${n} · ${semana.titulo}`}>
        Escritura
      </Titulo>

      <Tarjeta className="mb-5 border-blue-300/60 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20">
        <div className="flex gap-3">
          <Info size={18} className="mt-0.5 shrink-0 text-blue-700 dark:text-blue-400" />
          <p className="text-sm">
            Escribe primero sin mirar el modelo, aunque te salga mal. Corregir lo que escribiste
            enseña diez veces más que copiar lo correcto.
          </p>
        </div>
      </Tarjeta>

      <div className="flex flex-col gap-6">
        {semana.escritura.map((tarea) => (
          <Tarea key={tarea.id} tarea={tarea} semana={n} />
        ))}
      </div>
    </div>
  )
}

function Tarea({ tarea, semana }: { tarea: TareaEscritura; semana: number }) {
  const [texto, setTexto] = useState('')
  const [correccion, setCorreccion] = useState<Correccion | null>(null)
  const [verModelo, setVerModelo] = useState(false)
  const { completar, registrarActividad, guardarEscrito } = useProgreso()

  const palabras = contarPalabras(texto)

  function revisar() {
    const c = corregir(texto, tarea)
    setCorreccion(c)
    guardarEscrito({ tareaId: tarea.id, semana, texto, puntaje: c.puntaje })
    completar(semana, 'escritura')
    registrarActividad({ minutos: 10, xp: Math.round(c.puntaje / 4) })
  }

  return (
    <Tarjeta>
      <h2 className="mb-2 text-xl font-bold">{tarea.titulo}</h2>
      <p className="mb-3">{tarea.consigna}</p>

      <div className="mb-3 flex flex-wrap gap-2">
        {tarea.debeUsar.map((e) => (
          <span
            key={e}
            className={cx(
              'rounded-full px-2.5 py-0.5 text-xs font-medium',
              texto.toLowerCase().includes(e.toLowerCase())
                ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'
                : 'bg-black/[0.06] texto-suave dark:bg-white/[0.1]'
            )}
          >
            {e}
          </span>
        ))}
      </div>

      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={9}
        placeholder="Write here in English..."
        lang="en"
        spellCheck={false}
        className="w-full resize-y rounded-xl border superficie p-3 leading-relaxed"
      />

      <div className="mt-2 flex items-center justify-between text-sm texto-suave">
        <span>
          {palabras} / {tarea.minPalabras} palabras
        </span>
        {palabras >= tarea.minPalabras && <span className="text-green-700">✓ extensión suficiente</span>}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Boton onClick={revisar} disabled={palabras < 5}>
          Revisar mi texto
        </Boton>
        <Boton variante="secundario" onClick={() => setVerModelo(!verModelo)}>
          <Eye size={16} /> {verModelo ? 'Ocultar modelo' : 'Ver modelo'}
        </Boton>
      </div>

      {correccion && <Resultado correccion={correccion} tarea={tarea} />}

      {verModelo && (
        <div className="aparecer mt-4 rounded-xl border p-3">
          <div className="mb-2 flex items-center gap-2">
            <BotonAudio texto={tarea.modelo} tamano="sm" />
            <p className="text-sm font-semibold texto-suave">TEXTO MODELO</p>
          </div>
          <p className="whitespace-pre-line leading-relaxed">{tarea.modelo}</p>
        </div>
      )}

      <div className="mt-4">
        <p className="mb-2 text-sm font-semibold texto-suave">REVISA TU TEXTO</p>
        <ul className="flex flex-col gap-1.5">
          {tarea.checklist.map((c) => (
            <li key={c} className="flex gap-2 text-sm">
              <span className="texto-suave">☐</span>
              {c}
            </li>
          ))}
        </ul>
      </div>
    </Tarjeta>
  )
}

function Resultado({ correccion, tarea }: { correccion: Correccion; tarea: TareaEscritura }) {
  const iconos = {
    error: <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-600" />,
    aviso: <Info size={16} className="mt-0.5 shrink-0 text-amber-600" />,
    bien: <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-600" />,
  }

  return (
    <div className="aparecer mt-4 rounded-xl border p-4">
      <div className="mb-1 flex items-baseline justify-between">
        <p className="font-bold">Revisión automática</p>
        <p className="text-2xl font-bold">{correccion.puntaje}</p>
      </div>
      <Barra
        valor={correccion.puntaje}
        tono={correccion.puntaje >= 80 ? 'exito' : correccion.puntaje >= 50 ? 'acento' : 'marca'}
      />
      <p className="mt-2 text-sm">{correccion.resumen}</p>

      <ul className="mt-4 flex flex-col gap-3">
        {correccion.hallazgos.map((h, i) => (
          <li key={i} className="flex gap-2 text-sm">
            {iconos[h.gravedad]}
            <div>
              <p>{h.mensaje}</p>
              {h.fragmento && (
                <p className="mt-0.5 texto-suave">
                  En tu texto: <span className="italic">"{h.fragmento}"</span>
                </p>
              )}
              {h.sugerencia && (
                <p className="mt-0.5 font-medium text-green-800 dark:text-green-300">
                  ✓ {h.sugerencia}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-4 rounded-lg bg-black/[0.04] p-3 text-sm texto-suave dark:bg-white/[0.06]">
        <Check size={14} className="mr-1 inline" />
        Esta revisión detecta los errores más frecuentes, pero no lo ve todo. Compara tu texto con
        el modelo: ahí están los matices que ninguna regla automática puede corregir.
      </p>
      {correccion.faltanExpresiones.length > 0 && (
        <p className="mt-2 text-sm">
          Intenta reescribirlo incluyendo: <b>{correccion.faltanExpresiones.join(', ')}</b>. La
          consigna pedía practicar justamente eso ({tarea.titulo.toLowerCase()}).
        </p>
      )}
    </div>
  )
}
