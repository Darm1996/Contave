'use client'

// Reconocimiento de voz para practicar pronunciación: el navegador transcribe
// lo que dices y comparamos esa transcripción con la frase objetivo. No es un
// medidor de acento perfecto, pero detecta muy bien la palabra que no se
// entiende, que es justo lo que hay que corregir al principio.

import { useCallback, useEffect, useRef, useState } from 'react'
import { distancia, normalizar } from './texto'

interface ResultadoReconocimiento {
  transcripcion: string
  confianza: number
}

type Reconocedor = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: any) => void) | null
  onerror: ((e: any) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

function crearReconocedor(): Reconocedor | null {
  if (typeof window === 'undefined') return null
  const w = window as any
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
  if (!Ctor) return null
  return new Ctor() as Reconocedor
}

export function hayMicrofono(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as any
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition)
}

export interface AnalisisPronunciacion {
  puntaje: number // 0-100
  transcripcion: string
  /** Palabras del objetivo que no se reconocieron. */
  palabrasFalladas: string[]
  comentario: string
  aprobado: boolean
}

/** Compara lo que se entendió con la frase que se debía decir. */
export function analizarPronunciacion(
  objetivo: string,
  transcripcion: string
): AnalisisPronunciacion {
  const obj = normalizar(objetivo)
  const dicho = normalizar(transcripcion)

  if (!dicho) {
    return {
      puntaje: 0,
      transcripcion,
      palabrasFalladas: [],
      comentario: 'No se escuchó nada. Acerca el micrófono y habla con volumen normal.',
      aprobado: false,
    }
  }

  const palabrasObj = obj.split(' ')
  const palabrasDichas = dicho.split(' ')

  // Una palabra cuenta como reconocida si aparece igual o casi igual.
  const falladas: string[] = []
  const disponibles = [...palabrasDichas]
  for (const p of palabrasObj) {
    const idx = disponibles.findIndex(
      (d) => d === p || distancia(d, p) <= (p.length > 4 ? 1 : 0)
    )
    if (idx >= 0) disponibles.splice(idx, 1)
    else falladas.push(p)
  }

  const reconocidas = palabrasObj.length - falladas.length
  const base = palabrasObj.length ? reconocidas / palabrasObj.length : 0
  // Penaliza palabras inventadas de más (señal de que se entendió otra cosa).
  const exceso = Math.max(0, disponibles.length - 1) * 0.05
  const puntaje = Math.max(0, Math.round((base - exceso) * 100))

  let comentario: string
  if (puntaje >= 90) comentario = '¡Excelente! Se te entendió completo.'
  else if (puntaje >= 70)
    comentario = `Bien. Repite marcando estas palabras: ${falladas.join(', ')}.`
  else if (puntaje >= 40)
    comentario = `Se entendió a medias. Escucha al profesor otra vez y fíjate en: ${falladas.join(', ')}.`
  else
    comentario = `Se entendió "${transcripcion}". Escucha la frase completa y repítela más despacio.`

  return { puntaje, transcripcion, palabrasFalladas: falladas, comentario, aprobado: puntaje >= 70 }
}

export function useMicrofono(lang = 'en-US') {
  const [escuchando, setEscuchando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Se comprueba tras montar: en el servidor no existe `window`, y si lo
  // consultáramos durante el render el HTML no coincidiría con el del navegador.
  const [soportado, setSoportado] = useState(false)
  const refRec = useRef<Reconocedor | null>(null)
  const refResolve = useRef<((r: ResultadoReconocimiento) => void) | null>(null)

  useEffect(() => {
    setSoportado(hayMicrofono())
  }, [])

  useEffect(() => {
    return () => {
      try {
        refRec.current?.abort()
      } catch {
        /* el reconocedor ya estaba detenido */
      }
    }
  }, [])

  const escuchar = useCallback((): Promise<ResultadoReconocimiento> => {
    return new Promise((resolve) => {
      const rec = crearReconocedor()
      if (!rec) {
        setError('Tu navegador no permite usar el micrófono para esto. Usa Chrome o Edge.')
        resolve({ transcripcion: '', confianza: 0 })
        return
      }

      refRec.current = rec
      refResolve.current = resolve
      let entregado = false
      const entregar = (r: ResultadoReconocimiento) => {
        if (entregado) return
        entregado = true
        resolve(r)
      }

      rec.lang = lang
      rec.continuous = false
      rec.interimResults = false
      rec.maxAlternatives = 3

      rec.onstart = () => {
        setError(null)
        setEscuchando(true)
      }
      rec.onresult = (e: any) => {
        const alt = e.results?.[0]?.[0]
        entregar({
          transcripcion: alt?.transcript ?? '',
          confianza: alt?.confidence ?? 0,
        })
      }
      rec.onerror = (e: any) => {
        const codigo = e?.error
        if (codigo === 'not-allowed' || codigo === 'service-not-allowed') {
          setError('Necesitas dar permiso al micrófono en el navegador.')
        } else if (codigo === 'no-speech') {
          setError('No se escuchó nada. Intenta de nuevo.')
        } else if (codigo === 'network') {
          setError('El reconocimiento de voz necesita conexión a internet.')
        } else {
          setError('No se pudo escuchar. Intenta de nuevo.')
        }
        entregar({ transcripcion: '', confianza: 0 })
      }
      rec.onend = () => {
        setEscuchando(false)
        entregar({ transcripcion: '', confianza: 0 })
      }

      try {
        rec.start()
      } catch {
        entregar({ transcripcion: '', confianza: 0 })
      }
    })
  }, [lang])

  const detener = useCallback(() => {
    try {
      refRec.current?.stop()
    } catch {
      /* nada que detener */
    }
    setEscuchando(false)
  }, [])

  return { escuchar, detener, escuchando, error, soportado }
}
