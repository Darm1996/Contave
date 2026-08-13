/**
 * Modelo de contenido de la app de aprendizaje. Separado en dos formas
 * de repasar (§ mecánica del README): lecciones con quiz para conceptos
 * nuevos, y flashcards con repetición espaciada para reforzar lo ya
 * visto.
 */

export interface Modulo {
  id: string;
  numero: number;
  nombre: string;
  descripcion: string;
  leccionesIds: string[];
}

export interface OpcionPregunta {
  id: string;
  texto: string;
}

export interface Pregunta {
  id: string;
  enunciado: string;
  opciones: OpcionPregunta[];
  /** id de la opción correcta en `opciones`. */
  opcionCorrectaId: string;
  /** Se muestra después de responder, acierte o no — es la parte que
   *  realmente enseña, no solo dice "correcto/incorrecto". */
  explicacion: string;
}

export interface Leccion {
  id: string;
  moduloId: string;
  titulo: string;
  /** Contenido explicativo en markdown simple (párrafos, **negritas**,
   *  listas con "- "). Se parsea con un componente minimalista, sin
   *  traer una librería completa de markdown para esto. */
  contenidoMarkdown: string;
  preguntas: Pregunta[];
}

export interface Flashcard {
  id: string;
  moduloId: string;
  pregunta: string;
  respuesta: string;
}
