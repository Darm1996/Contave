'use client'

import { useEffect, useRef, useState } from 'react'
import { Volume2, Turtle, Square } from 'lucide-react'
import { callar, hablar } from '@/lib/voz'
import { useProgreso } from '@/lib/progreso'
import { cx } from './ui'

interface Props {
  texto: string
  /** Fuerza una voz distinta a la elegida en ajustes (para los diálogos). */
  perfilId?: string
  /** Muestra también el botón de "despacio". */
  conLento?: boolean
  tamano?: 'sm' | 'md' | 'lg'
  etiqueta?: string
  className?: string
  /** Reproduce solo, una vez, al montar. */
  autoReproducir?: boolean
}

const TAMANOS = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
}

const ICONOS = { sm: 15, md: 18, lg: 24 }

export function BotonAudio({
  texto,
  perfilId,
  conLento = false,
  tamano = 'md',
  etiqueta,
  className,
  autoReproducir = false,
}: Props) {
  const { ajustes } = useProgreso()
  const [sonando, setSonando] = useState(false)
  const yaAuto = useRef(false)

  const voz = perfilId ?? ajustes.perfilVoz

  function reproducir(multiplicador = 1) {
    if (sonando) {
      callar()
      setSonando(false)
      return
    }
    setSonando(true)
    hablar(texto, {
      perfilId: voz,
      velocidad: ajustes.velocidad * multiplicador,
      alTerminar: () => setSonando(false),
    })
  }

  useEffect(() => {
    if (!autoReproducir || yaAuto.current) return
    yaAuto.current = true
    // Pequeño retraso: algunos navegadores ignoran el audio inmediato al montar.
    const t = setTimeout(() => reproducir(), 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoReproducir])

  useEffect(() => () => callar(), [])

  return (
    <span className={cx('inline-flex items-center gap-1.5', className)}>
      <button
        type="button"
        onClick={() => reproducir()}
        aria-label={etiqueta ?? `Escuchar: ${texto}`}
        className={cx(
          'inline-flex shrink-0 items-center justify-center rounded-full transition-colors',
          'bg-blue-700 text-white hover:bg-blue-800 active:scale-95',
          TAMANOS[tamano]
        )}
      >
        {sonando ? <Square size={ICONOS[tamano] - 3} fill="currentColor" /> : <Volume2 size={ICONOS[tamano]} />}
      </button>

      {conLento && (
        <button
          type="button"
          onClick={() => reproducir(0.65)}
          aria-label="Escuchar despacio"
          title="Escuchar despacio"
          className={cx(
            'inline-flex shrink-0 items-center justify-center rounded-full border transition-colors',
            'superficie hover:bg-black/[0.05] dark:hover:bg-white/[0.08]',
            TAMANOS[tamano]
          )}
        >
          <Turtle size={ICONOS[tamano]} />
        </button>
      )}
    </span>
  )
}

/** Frase en inglés con su botón de audio y traducción opcional. */
export function Frase({
  en,
  es,
  perfilId,
  conLento,
  nota,
}: {
  en: string
  es?: string
  perfilId?: string
  conLento?: boolean
  nota?: string
}) {
  const { ajustes } = useProgreso()
  const [verEs, setVerEs] = useState(ajustes.traduccionVisible)

  return (
    <div className="flex items-start gap-3">
      <BotonAudio texto={en} perfilId={perfilId} conLento={conLento} tamano="sm" />
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-snug">{en}</p>
        {es &&
          (verEs ? (
            <p className="mt-0.5 text-sm texto-suave">{es}</p>
          ) : (
            <button
              onClick={() => setVerEs(true)}
              className="mt-0.5 text-sm text-blue-700 hover:underline dark:text-blue-400"
            >
              Ver traducción
            </button>
          ))}
        {nota && <p className="mt-1 text-xs italic texto-suave">{nota}</p>}
      </div>
    </div>
  )
}
