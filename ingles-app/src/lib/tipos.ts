// Tipos del curso. Todo el contenido de las 24 semanas se escribe contra estas formas.

export type Nivel = 'A0' | 'A1' | 'A2' | 'B1' | 'B2'

export type Destreza =
  | 'gramatica'
  | 'vocabulario'
  | 'escritura'
  | 'escucha'
  | 'habla'
  | 'lectura'

/** Una palabra o expresión de la lista de vocabulario. */
export interface Palabra {
  /** Identificador estable; se usa como clave del repaso espaciado. */
  id: string
  en: string
  es: string
  /** Categoría gramatical, en español, para mostrar al estudiante. */
  tipo?:
    | 'sustantivo'
    | 'verbo'
    | 'adjetivo'
    | 'adverbio'
    | 'preposición'
    | 'expresión'
    | 'número'
    | 'pronombre'
    | 'conector'
  /** Ejemplo de uso real. */
  ejemplo?: string
  ejemploEs?: string
  /** Pronunciación aproximada escrita para hispanohablantes. */
  pron?: string
}

/** Un punto de gramática explicado en español. */
export interface TemaGramatica {
  id: string
  titulo: string
  /** Explicación en español, en párrafos. Se admite **negrita** simple. */
  explicacion: string[]
  /** Tabla opcional: encabezados + filas. */
  tabla?: { encabezados: string[]; filas: string[][] }
  ejemplos: { en: string; es: string }[]
  /** Errores típicos del hispanohablante. */
  errores?: { mal: string; bien: string; porque: string }[]
}

export type TipoEjercicio =
  | 'opcion' // elegir una opción
  | 'completar' // escribir la palabra que falta
  | 'traducir' // traducir español -> inglés
  | 'ordenar' // ordenar palabras para formar la oración
  | 'escuchar' // dictado: se oye y se escribe
  | 'hablar' // decir la frase en voz alta (micrófono)
  | 'emparejar' // unir inglés con español

export interface Ejercicio {
  id: string
  tipo: TipoEjercicio
  destreza: Destreza
  /** Instrucción o enunciado mostrado (en español). */
  consigna: string
  /** Texto principal del reactivo: la oración con ___, la frase a traducir, etc. */
  texto?: string
  /** Opciones para 'opcion'. */
  opciones?: string[]
  /** Respuesta correcta. Para 'emparejar' se usa `pares`. */
  respuesta?: string
  /** Otras respuestas que también son correctas. */
  aceptadas?: string[]
  /** Palabras desordenadas para 'ordenar'. */
  piezas?: string[]
  /** Pares para 'emparejar'. */
  pares?: { en: string; es: string }[]
  /** Explicación que se muestra después de responder. */
  explicacion?: string
  /** Pista opcional. */
  pista?: string
}

/** Tarea de escritura con respuesta modelo y criterios de revisión. */
export interface TareaEscritura {
  id: string
  titulo: string
  consigna: string
  minPalabras: number
  /** Palabras o estructuras que deben aparecer; el corrector las verifica. */
  debeUsar: string[]
  modelo: string
  /** Puntos que el estudiante debe revisar en su propio texto. */
  checklist: string[]
}

export interface LineaDialogo {
  hablante: string
  en: string
  es: string
}

export interface Dialogo {
  titulo: string
  contexto: string
  lineas: LineaDialogo[]
}

/** Práctica de pronunciación de la semana. */
export interface Pronunciacion {
  foco: string
  explicacion: string
  /** Pares mínimos: dos palabras que solo cambian en el sonido trabajado. */
  paresMinimos?: { a: string; b: string }[]
  practica: string[]
}

export interface Semana {
  numero: number
  mes: number
  nivel: Nivel
  titulo: string
  objetivo: string
  /** Frases "al terminar puedo...". */
  puedeHacer: string[]
  gramatica: TemaGramatica[]
  vocabulario: Palabra[]
  /** Trozos de lenguaje que se memorizan completos. */
  frases: { en: string; es: string; uso?: string }[]
  dialogo: Dialogo
  ejercicios: Ejercicio[]
  escritura: TareaEscritura[]
  pronunciacion: Pronunciacion
}

export interface Mes {
  numero: number
  titulo: string
  descripcion: string
  meta: string
  semanas: Semana[]
}

/* ─── Progreso del estudiante ─────────────────────────────────────── */

/** Estado SM-2 de una tarjeta de repaso espaciado. */
export interface Tarjeta {
  id: string
  /** Facilidad (ease factor) SM-2. */
  facilidad: number
  /** Intervalo en días. */
  intervalo: number
  /** Repeticiones consecutivas correctas. */
  repeticiones: number
  /** Fecha del próximo repaso (ISO, solo día). */
  proximo: string
  /** Cuántas veces se falló históricamente. */
  fallos: number
  /** Semana de la que proviene. */
  semana: number
}

export type CalidadRespuesta = 0 | 1 | 2 | 3 | 4 | 5

export interface RegistroDia {
  /** YYYY-MM-DD */
  fecha: string
  minutos: number
  xp: number
  ejerciciosHechos: number
  aciertos: number
}
