// Comparación de respuestas escritas. El objetivo es aceptar lo que un profesor
// aceptaría (mayúsculas, puntuación, contracciones) y rechazar lo que corregiría.

const CONTRACCIONES: Record<string, string> = {
  "i'm": 'i am',
  "you're": 'you are',
  "he's": 'he is',
  "she's": 'she is',
  "it's": 'it is',
  "we're": 'we are',
  "they're": 'they are',
  "i've": 'i have',
  "you've": 'you have',
  "we've": 'we have',
  "they've": 'they have',
  "i'll": 'i will',
  "you'll": 'you will',
  "he'll": 'he will',
  "she'll": 'she will',
  "we'll": 'we will',
  "they'll": 'they will',
  "i'd": 'i would',
  "you'd": 'you would',
  "don't": 'do not',
  "doesn't": 'does not',
  "didn't": 'did not',
  "isn't": 'is not',
  "aren't": 'are not',
  "wasn't": 'was not',
  "weren't": 'were not',
  "can't": 'can not',
  cannot: 'can not',
  "couldn't": 'could not',
  "won't": 'will not',
  "wouldn't": 'would not',
  "shouldn't": 'should not',
  "haven't": 'have not',
  "hasn't": 'has not',
  "hadn't": 'had not',
  "let's": 'let us',
  "there's": 'there is',
  "that's": 'that is',
  "what's": 'what is',
  "where's": 'where is',
  "who's": 'who is',
  "how's": 'how is',
}

/** Pasa un texto a su forma canónica para comparar. */
export function normalizar(texto: string): string {
  let t = texto.toLowerCase().trim()
  // Unifica apóstrofos tipográficos con el apóstrofo recto.
  t = t.replace(/[‘’ʼ]/g, "'")
  // Expande contracciones para que "I'm" y "I am" cuenten igual.
  t = t.replace(/[a-z]+'[a-z]+|cannot/g, (m) => CONTRACCIONES[m] ?? m)
  // Quita puntuación y espacios repetidos.
  t = t.replace(/[.,!?;:"“”()\-–—]/g, ' ')
  t = t.replace(/\s+/g, ' ').trim()
  return t
}

/** Distancia de edición entre dos cadenas. */
export function distancia(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let fila = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const nueva = [i]
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1
      nueva[j] = Math.min(fila[j] + 1, nueva[j - 1] + 1, fila[j - 1] + costo)
    }
    fila = nueva
  }
  return fila[b.length]
}

export interface Veredicto {
  correcto: boolean
  /** true cuando falló por poco: una letra, un acento, una tilde. */
  casi: boolean
  /** Comentario en español para el estudiante. */
  comentario: string
}

/**
 * Compara la respuesta del estudiante con la esperada y con las alternativas
 * aceptadas. Devuelve además un comentario que explica el fallo cuando se puede.
 */
export function evaluarTexto(
  respuesta: string,
  esperada: string,
  aceptadas: string[] = []
): Veredicto {
  const dada = normalizar(respuesta)
  const objetivos = [esperada, ...aceptadas].map(normalizar).filter(Boolean)

  if (!dada) return { correcto: false, casi: false, comentario: 'No escribiste nada.' }
  if (objetivos.includes(dada)) return { correcto: true, casi: false, comentario: '¡Correcto!' }

  // ¿Falló por muy poco? Comparamos contra el objetivo más parecido.
  let mejor = objetivos[0]
  let mejorDist = Infinity
  for (const o of objetivos) {
    const d = distancia(dada, o)
    if (d < mejorDist) {
      mejorDist = d
      mejor = o
    }
  }

  const umbral = Math.max(1, Math.floor(mejor.length * 0.12))
  if (mejorDist <= umbral) {
    return {
      correcto: false,
      casi: true,
      comentario: `Casi. Revisa la ortografía: la respuesta es "${esperada}".`,
    }
  }

  // Diagnóstico por palabras: qué sobra y qué falta.
  const pd = dada.split(' ')
  const pe = mejor.split(' ')
  const faltan = pe.filter((p) => !pd.includes(p))
  const sobran = pd.filter((p) => !pe.includes(p))

  if (faltan.length === 1 && sobran.length === 0) {
    return {
      correcto: false,
      casi: true,
      comentario: `Te falta una palabra: "${faltan[0]}".`,
    }
  }
  if (faltan.length === 0 && sobran.length === 1) {
    return {
      correcto: false,
      casi: true,
      comentario: `Sobra la palabra "${sobran[0]}".`,
    }
  }
  if (faltan.length === 0 && sobran.length === 0 && pd.length === pe.length) {
    return {
      correcto: false,
      casi: true,
      comentario: 'Las palabras están bien, pero el orden no. En inglés el orden es fijo.',
    }
  }

  return {
    correcto: false,
    casi: false,
    comentario: `La respuesta correcta es: "${esperada}".`,
  }
}

/** Cuenta palabras de un texto libre. */
export function contarPalabras(texto: string): number {
  const t = texto.trim()
  if (!t) return 0
  return t.split(/\s+/).length
}

/** Mezcla un arreglo sin modificar el original. */
export function mezclar<T>(arr: T[]): T[] {
  const copia = [...arr]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}
