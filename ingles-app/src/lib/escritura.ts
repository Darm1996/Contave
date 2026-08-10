// Corrector de textos libres. No pretende ser un profesor humano: caza los
// errores que un hispanohablante comete una y otra vez, comprueba que se usó
// lo que pedía la consigna y devuelve una guía para revisar el resto.

import { contarPalabras, normalizar } from './texto'
import type { TareaEscritura } from './tipos'

export interface Hallazgo {
  gravedad: 'error' | 'aviso' | 'bien'
  mensaje: string
  /** Fragmento del texto donde se detectó. */
  fragmento?: string
  sugerencia?: string
}

export interface Correccion {
  puntaje: number
  palabras: number
  hallazgos: Hallazgo[]
  faltanExpresiones: string[]
  resumen: string
}

interface Regla {
  patron: RegExp
  mensaje: string
  sugerencia?: string
  gravedad?: 'error' | 'aviso'
}

// Cada regla nace de un error real y frecuente del hispanohablante.
const REGLAS: Regla[] = [
  {
    patron: /\bi\s+have\s+\d+\s+years?\b/i,
    mensaje: 'La edad se dice con el verbo to be, no con "have".',
    sugerencia: 'I am 25 years old.',
  },
  {
    patron: /\b(i|we|they|you)\s+ha(ve|s)\s+\w+\s+years?\s+(working|living|studying|here)\b/i,
    mensaje: 'La duración no se dice con "have + años". Se usa el present perfect con "for".',
    sugerencia: 'I have worked here for three years.',
  },
  {
    patron: /\b(i|you|we|they)\s+no\s+(have|like|want|know|understand|speak|work|go)\b/i,
    mensaje: 'La negación en inglés no es "no + verbo".',
    sugerencia: "I don't have / I don't like",
  },
  {
    patron: /\b(he|she|it)\s+no\s+\w+/i,
    mensaje: 'La negación en tercera persona es "doesn\'t + verbo".',
    sugerencia: "He doesn't work here.",
  },
  {
    patron: /\bdo(es)?\s+(he|she|it|you|they|we|i)\s+\w+s\b/i,
    mensaje: 'Después de do/does el verbo va sin -s.',
    sugerencia: 'Does he work here?',
    gravedad: 'aviso',
  },
  {
    patron: /\bdid\s+(he|she|it|you|they|we|i)\s+(went|saw|had|made|took|came|said|bought|got)\b/i,
    mensaje: 'Después de "did" el verbo vuelve a su forma base.',
    sugerencia: 'Did you go? (no "did you went")',
  },
  {
    patron: /\bdidn'?t\s+(went|saw|had|made|took|came|said|bought|got|was|were)\b/i,
    mensaje: 'Después de "didn\'t" el verbo va en forma base.',
    sugerencia: "I didn't go.",
  },
  {
    patron: /\b(he|she|it)\s+(work|live|like|want|need|study|go|have|do|make|take|speak|play|watch)\b(?!\w)/i,
    mensaje: 'Falta la -s de la tercera persona del singular.',
    sugerencia: 'He works / She lives / It has',
    gravedad: 'aviso',
  },
  {
    patron: /\b(more|most)\s+(better|worse|bigger|older|younger|taller|cheaper|easier)\b/i,
    mensaje: 'Ese comparativo ya lleva -er: no se le añade "more".',
    sugerencia: 'better (no "more better")',
  },
  {
    patron: /\bmore\s+(tall|big|small|old|young|cheap|fast|easy|nice|short)\b/i,
    mensaje: 'Los adjetivos cortos forman el comparativo con -er, no con "more".',
    sugerencia: 'taller, bigger, cheaper',
  },
  {
    patron: /\b(taller|bigger|better|worse|cheaper|older|younger|more \w+)\s+that\b/i,
    mensaje: 'En las comparaciones se usa "than", no "that".',
    sugerencia: 'bigger than me',
  },
  {
    patron: /\bif\s+(i|you|he|she|we|they)\s+will\b/i,
    mensaje: 'Después de "if" nunca va "will": va presente.',
    sugerencia: "If it rains, I'll stay home.",
  },
  {
    patron: /\bif\s+(i|you|he|she|we|they)\s+would\b/i,
    mensaje: 'Después de "if" no va "would": va pasado simple.',
    sugerencia: 'If I had money, I would travel.',
  },
  {
    patron: /\b(can|must|should|will|would|could)\s+to\s+\w+/i,
    mensaje: 'Después de un verbo modal el verbo va sin "to".',
    sugerencia: 'I can go / You should rest',
  },
  {
    patron: /\b(cans|musts|shoulds|wills)\b/i,
    mensaje: 'Los verbos modales nunca llevan -s.',
    sugerencia: 'She can swim.',
  },
  {
    patron: /\bi\s+am\s+agree\b/i,
    mensaje: '"Agree" ya es un verbo: no lleva to be.',
    sugerencia: 'I agree.',
  },
  {
    patron: /\bhave\s+(ate|went|saw|did|took|wrote|spoke|broke|gave|drove)\b/i,
    mensaje: 'Después de "have" va el participio, no el pasado simple.',
    sugerencia: 'I have eaten / I have gone / I have seen',
  },
  {
    patron: /\b(have|has)\s+\w+\s+(yesterday|last (week|month|year|night)|\d{4}|ago)\b/i,
    mensaje: 'Con un tiempo concreto (yesterday, last week, in 2020) va pasado simple, no present perfect.',
    sugerencia: 'I went there last year.',
  },
  {
    patron: /\b(i|we|they|you)\s+(am|are|is)\s+here\s+since\b/i,
    mensaje: 'La duración hasta hoy va en present perfect.',
    sugerencia: 'I have been here since 2020.',
  },
  {
    patron: /\bin\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    mensaje: 'Los días de la semana llevan "on".',
    sugerencia: 'on Monday',
  },
  {
    patron: /\bin\s+home\b/i,
    mensaje: 'Se dice "at home".',
    sugerencia: 'I am at home.',
  },
  {
    patron: /\b(informations|advices|furnitures|homeworks|peoples|moneys)\b/i,
    mensaje: 'Ese sustantivo es incontable: nunca lleva -s.',
    sugerencia: 'some information, some advice',
  },
  {
    patron: /\b(bigs|smalls|talls|olds|news|goods|reds|blues)\s+\w+/i,
    mensaje: 'Los adjetivos no tienen plural en inglés.',
    sugerencia: 'big houses (no "bigs houses")',
  },
  {
    patron: /\bpeople\s+is\b/i,
    mensaje: '"People" es plural: lleva "are".',
    sugerencia: 'People are friendly.',
  },
  {
    patron: /\bi\s+am\s+\w+ing\s+(every day|always|usually|never)\b/i,
    mensaje: 'Con rutinas se usa el presente simple, no el continuo.',
    sugerencia: 'I go to work every day.',
    gravedad: 'aviso',
  },
  {
    patron: /\b(i|he|she|we|they)\s+am\s+(know|want|like|need)\w*/i,
    mensaje: 'Los verbos de estado (know, want, like, need) no van en continuo.',
    sugerencia: 'I know the answer.',
  },
  {
    patron: /\bsaid\s+(me|him|her|us|them)\b/i,
    mensaje: '"Say" no lleva persona detrás; para eso está "tell".',
    sugerencia: 'He told me / He said that...',
  },
  {
    patron: /\bhave\s+\d+\s+years?\s+old\b/i,
    mensaje: 'La edad va con to be.',
    sugerencia: 'She is 30 years old.',
  },
  {
    patron: /\bdon'?t\s+have\s+(nothing|nobody|never)\b/i,
    mensaje: 'El inglés no admite doble negación.',
    sugerencia: "I don't have anything / I have nothing",
  },
  {
    patron: /\bthe\s+(life|love|people|money|english|spanish)\s+is\b/i,
    mensaje: 'Para hablar en general, el inglés no usa "the".',
    sugerencia: 'Life is beautiful.',
    gravedad: 'aviso',
  },
  {
    patron: /\bi\s+have\s+\d+\s+(brother|sister|child|son|daughter)\b/i,
    mensaje: 'Si el número es mayor que uno, el sustantivo va en plural.',
    sugerencia: 'I have two brothers.',
    gravedad: 'aviso',
  },
]

function detectarMinusculaInicial(texto: string): Hallazgo | null {
  const oraciones = texto.split(/(?<=[.!?])\s+/).filter((o) => o.trim())
  const malas = oraciones.filter((o) => /^[a-z]/.test(o.trim()))
  if (!malas.length) return null
  return {
    gravedad: 'aviso',
    mensaje: `${malas.length} ${malas.length === 1 ? 'oración empieza' : 'oraciones empiezan'} con minúscula.`,
    fragmento: malas[0].slice(0, 40),
    sugerencia: 'Cada oración empieza con mayúscula.',
  }
}

function detectarIMinuscula(texto: string): Hallazgo | null {
  if (!/(^|\s)i(\s|'|,|\.)/.test(texto)) return null
  return {
    gravedad: 'error',
    mensaje: 'El pronombre "I" siempre va en mayúscula, esté donde esté.',
    sugerencia: 'I am, not i am',
  }
}

function detectarPalabrasEnEspanol(texto: string): Hallazgo | null {
  const sospechosas = texto.match(
    /\b(pero|porque|tambien|también|entonces|muy|mucho|cuando|donde|siempre|nunca|casa|trabajo|tiempo)\b/gi
  )
  if (!sospechosas) return null
  const unicas = [...new Set(sospechosas.map((p) => p.toLowerCase()))]
  return {
    gravedad: 'error',
    mensaje: `Hay palabras en español: ${unicas.join(', ')}.`,
    sugerencia: 'Escribe todo en inglés, aunque tengas que simplificar la idea.',
  }
}

/** Revisa un texto libre contra una tarea de escritura. */
export function corregir(texto: string, tarea: TareaEscritura): Correccion {
  const hallazgos: Hallazgo[] = []
  const palabras = contarPalabras(texto)
  const normalizado = normalizar(texto)

  // 1. Longitud.
  if (palabras < tarea.minPalabras) {
    hallazgos.push({
      gravedad: 'error',
      mensaje: `El texto es corto: ${palabras} palabras de las ${tarea.minPalabras} pedidas.`,
      sugerencia: 'Añade detalles: por qué, cuándo, con quién, cómo te sentiste.',
    })
  } else {
    hallazgos.push({
      gravedad: 'bien',
      mensaje: `Extensión correcta: ${palabras} palabras.`,
    })
  }

  // 2. Expresiones obligatorias de la consigna.
  const faltanExpresiones = tarea.debeUsar.filter(
    (e) => !normalizado.includes(normalizar(e)) && !texto.toLowerCase().includes(e.toLowerCase())
  )
  if (faltanExpresiones.length) {
    hallazgos.push({
      gravedad: 'aviso',
      mensaje: `La consigna pedía usar: ${faltanExpresiones.join(', ')}.`,
      sugerencia: 'Reescribe alguna oración para incluirlas.',
    })
  } else if (tarea.debeUsar.length) {
    hallazgos.push({
      gravedad: 'bien',
      mensaje: 'Usaste todas las estructuras que pedía la consigna.',
    })
  }

  // 3. Errores típicos.
  for (const regla of REGLAS) {
    const m = texto.match(regla.patron)
    if (m) {
      hallazgos.push({
        gravedad: regla.gravedad ?? 'error',
        mensaje: regla.mensaje,
        fragmento: m[0],
        sugerencia: regla.sugerencia,
      })
    }
  }

  // 4. Formato y mezcla de idiomas.
  const mayus = detectarMinusculaInicial(texto)
  if (mayus) hallazgos.push(mayus)
  const yo = detectarIMinuscula(texto)
  if (yo) hallazgos.push(yo)
  const espanol = detectarPalabrasEnEspanol(texto)
  if (espanol) hallazgos.push(espanol)

  // 5. Variedad: repetir siempre el mismo comienzo aplana el texto.
  const inicios = texto
    .split(/(?<=[.!?])\s+/)
    .map((o) => o.trim().split(/\s+/)[0]?.toLowerCase())
    .filter(Boolean)
  const repetidos = inicios.filter((p, i) => inicios.indexOf(p) !== i).length
  if (inicios.length >= 4 && repetidos >= inicios.length - 2) {
    hallazgos.push({
      gravedad: 'aviso',
      mensaje: 'Casi todas las oraciones empiezan igual.',
      sugerencia: 'Empieza alguna con un conector: First, Then, After that, However.',
    })
  }

  // 6. Puntaje.
  const errores = hallazgos.filter((h) => h.gravedad === 'error').length
  const avisos = hallazgos.filter((h) => h.gravedad === 'aviso').length
  let puntaje = 100 - errores * 12 - avisos * 5
  if (palabras < tarea.minPalabras) {
    puntaje -= Math.min(25, Math.round(((tarea.minPalabras - palabras) / tarea.minPalabras) * 40))
  }
  puntaje = Math.max(0, Math.min(100, puntaje))

  let resumen: string
  if (puntaje >= 90) resumen = 'Excelente. Compara con el modelo para pulir matices.'
  else if (puntaje >= 70) resumen = 'Buen texto. Corrige los puntos marcados y vuelve a leerlo en voz alta.'
  else if (puntaje >= 45) resumen = 'Vas bien, pero hay errores de estructura. Repasa la gramática de la semana.'
  else resumen = 'Reescríbelo con calma usando el modelo como guía. No pasa nada: para eso es practicar.'

  return { puntaje, palabras, hallazgos, faltanExpresiones, resumen }
}
