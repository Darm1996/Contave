'use client'

// El "profesor" habla con la síntesis de voz del navegador (Web Speech API).
// No necesita internet ni API keys: las voces vienen del sistema operativo.
// Cada perfil es un personaje con acento propio, para que el oído no se
// acostumbre a una sola forma de hablar.

import { useEffect, useState } from 'react'

export interface PerfilVoz {
  id: string
  nombre: string
  acento: string
  bandera: string
  descripcion: string
  /** Idioma preferido de la voz del sistema. */
  lang: string
  genero: 'f' | 'm'
  /** Tono y velocidad base del personaje. */
  tono: number
  velocidad: number
}

export const PERFILES: PerfilVoz[] = [
  {
    id: 'emma',
    nombre: 'Emma',
    acento: 'Británico',
    bandera: '🇬🇧',
    descripcion: 'Tu profesora principal. Habla claro y despacio, ideal para empezar.',
    lang: 'en-GB',
    genero: 'f',
    tono: 1.05,
    velocidad: 0.9,
  },
  {
    id: 'james',
    nombre: 'James',
    acento: 'Británico',
    bandera: '🇬🇧',
    descripcion: 'Voz masculina británica. Úsalo para acostumbrarte a otra voz.',
    lang: 'en-GB',
    genero: 'm',
    tono: 0.95,
    velocidad: 0.95,
  },
  {
    id: 'olivia',
    nombre: 'Olivia',
    acento: 'Estadounidense',
    bandera: '🇺🇸',
    descripcion: 'Acento americano neutro, el más común en series y trabajo.',
    lang: 'en-US',
    genero: 'f',
    tono: 1,
    velocidad: 0.95,
  },
  {
    id: 'michael',
    nombre: 'Michael',
    acento: 'Estadounidense',
    bandera: '🇺🇸',
    descripcion: 'Voz masculina americana, ritmo natural de conversación.',
    lang: 'en-US',
    genero: 'm',
    tono: 0.9,
    velocidad: 1,
  },
  {
    id: 'charlotte',
    nombre: 'Charlotte',
    acento: 'Australiano',
    bandera: '🇦🇺',
    descripcion: 'Acento australiano. Entrena el oído para acentos difíciles.',
    lang: 'en-AU',
    genero: 'f',
    tono: 1,
    velocidad: 0.95,
  },
  {
    id: 'raj',
    nombre: 'Raj',
    acento: 'Indio',
    bandera: '🇮🇳',
    descripcion: 'Inglés de India. Muy útil si vas a trabajar en tecnología.',
    lang: 'en-IN',
    genero: 'm',
    tono: 0.95,
    velocidad: 0.95,
  },
]

export function perfilPorId(id: string): PerfilVoz {
  return PERFILES.find((p) => p.id === id) ?? PERFILES[0]
}

// Nombres de voces conocidas por sistema operativo, para adivinar el género
// cuando el navegador no lo indica (que es casi siempre).
const FEMENINAS = /zira|susan|hazel|serena|samantha|karen|moira|tessa|fiona|victoria|allison|ava|joanna|salli|kimberly|amy|emma|libby|sonia|natasha|clara|aria|jenny|michelle|female|mujer/i
const MASCULINAS = /david|mark|george|daniel|alex|fred|oliver|thomas|ryan|guy|brandon|christopher|eric|matthew|justin|joey|male|hombre/i

function puntuar(voz: SpeechSynthesisVoice, perfil: PerfilVoz): number {
  const lang = voz.lang.replace('_', '-').toLowerCase()
  const objetivo = perfil.lang.toLowerCase()
  let p = 0

  if (lang === objetivo) p += 100
  else if (lang.startsWith('en')) p += 30
  else return -1 // no es inglés: descartada

  const esF = FEMENINAS.test(voz.name)
  const esM = MASCULINAS.test(voz.name)
  if (perfil.genero === 'f' && esF) p += 40
  if (perfil.genero === 'm' && esM) p += 40
  // Penaliza el género contrario, pero sin descartar: puede ser la única voz.
  if (perfil.genero === 'f' && esM) p -= 25
  if (perfil.genero === 'm' && esF) p -= 25

  // Las voces "natural"/"neural" suenan mucho mejor que las locales antiguas.
  if (/natural|neural|premium|enhanced/i.test(voz.name)) p += 20
  if (/google/i.test(voz.name)) p += 10
  if (/compact|espeak/i.test(voz.name)) p -= 15

  return p
}

/** Elige la mejor voz instalada para un perfil. */
export function resolverVoz(
  voces: SpeechSynthesisVoice[],
  perfil: PerfilVoz
): SpeechSynthesisVoice | null {
  let mejor: SpeechSynthesisVoice | null = null
  let mejorP = -1
  for (const v of voces) {
    const p = puntuar(v, perfil)
    if (p > mejorP) {
      mejorP = p
      mejor = v
    }
  }
  return mejorP >= 0 ? mejor : null
}

/**
 * Reparte los perfiles entre las voces disponibles evitando repetir la misma
 * voz del sistema dos veces, para que los personajes suenen distintos aunque
 * el equipo tenga pocas voces instaladas.
 */
export function asignarVoces(
  voces: SpeechSynthesisVoice[]
): Record<string, SpeechSynthesisVoice | null> {
  const inglesas = voces.filter((v) => v.lang.toLowerCase().startsWith('en'))
  const usadas = new Set<string>()
  const mapa: Record<string, SpeechSynthesisVoice | null> = {}

  for (const perfil of PERFILES) {
    const libres = inglesas.filter((v) => !usadas.has(v.voiceURI))
    const candidatas = libres.length ? libres : inglesas
    const elegida = resolverVoz(candidatas, perfil)
    mapa[perfil.id] = elegida
    if (elegida && libres.length) usadas.add(elegida.voiceURI)
  }
  return mapa
}

export interface OpcionesHabla {
  perfilId?: string
  /** Multiplicador sobre la velocidad base del perfil. */
  velocidad?: number
  alTerminar?: () => void
  alEmpezar?: () => void
}

let vocesCache: SpeechSynthesisVoice[] = []
let mapaCache: Record<string, SpeechSynthesisVoice | null> = {}

function sintesis(): SpeechSynthesis | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  return window.speechSynthesis
}

export function haySintesis(): boolean {
  return sintesis() !== null
}

function refrescarVoces() {
  const s = sintesis()
  if (!s) return
  const v = s.getVoices()
  if (v.length) {
    vocesCache = v
    mapaCache = asignarVoces(v)
  }
}

/** Detiene cualquier reproducción en curso. */
export function callar() {
  sintesis()?.cancel()
}

/** Hace que el profesor diga un texto en inglés. */
export function hablar(texto: string, opciones: OpcionesHabla = {}): void {
  const s = sintesis()
  if (!s || !texto.trim()) {
    opciones.alTerminar?.()
    return
  }
  if (!vocesCache.length) refrescarVoces()

  s.cancel()
  const perfil = perfilPorId(opciones.perfilId ?? 'emma')
  const u = new SpeechSynthesisUtterance(texto)
  const voz = mapaCache[perfil.id] ?? resolverVoz(vocesCache, perfil)
  if (voz) {
    u.voice = voz
    u.lang = voz.lang
  } else {
    u.lang = perfil.lang
  }
  u.rate = Math.min(2, Math.max(0.5, perfil.velocidad * (opciones.velocidad ?? 1)))
  u.pitch = perfil.tono
  u.onstart = () => opciones.alEmpezar?.()
  u.onend = () => opciones.alTerminar?.()
  u.onerror = () => opciones.alTerminar?.()

  // Chrome a veces ignora el primer speak() si la cola quedó en pausa.
  s.resume()
  s.speak(u)
}

/** Reproduce varias líneas seguidas, cada una con su propia voz (diálogos). */
export function hablarSecuencia(
  lineas: { texto: string; perfilId: string }[],
  opciones: { velocidad?: number; alCambiar?: (i: number) => void; alTerminar?: () => void } = {}
): () => void {
  let cancelado = false
  let i = 0

  const siguiente = () => {
    if (cancelado) return
    if (i >= lineas.length) {
      opciones.alTerminar?.()
      return
    }
    const linea = lineas[i]
    opciones.alCambiar?.(i)
    i++
    hablar(linea.texto, {
      perfilId: linea.perfilId,
      velocidad: opciones.velocidad,
      alTerminar: () => {
        // Pausa breve entre turnos para que suene a conversación.
        setTimeout(siguiente, 350)
      },
    })
  }

  siguiente()
  return () => {
    cancelado = true
    callar()
  }
}

/** Hook que expone el estado de las voces del sistema. */
export function useVoces() {
  const [voces, setVoces] = useState<SpeechSynthesisVoice[]>([])
  const [listo, setListo] = useState(false)

  useEffect(() => {
    const s = sintesis()
    if (!s) {
      setListo(true)
      return
    }
    const cargar = () => {
      const v = s.getVoices()
      if (v.length) {
        vocesCache = v
        mapaCache = asignarVoces(v)
        setVoces(v)
      }
      setListo(true)
    }
    cargar()
    s.addEventListener('voiceschanged', cargar)
    // Safari puede tardar en poblar la lista; reintentamos una vez.
    const t = setTimeout(cargar, 600)
    return () => {
      s.removeEventListener('voiceschanged', cargar)
      clearTimeout(t)
    }
  }, [])

  const asignadas = voces.length ? asignarVoces(voces) : {}
  const disponibles = PERFILES.filter((p) => asignadas[p.id])

  return {
    voces,
    listo,
    soportado: haySintesis(),
    asignadas,
    /** Perfiles que sí tienen una voz real detrás en este dispositivo. */
    disponibles: disponibles.length ? disponibles : PERFILES,
  }
}
