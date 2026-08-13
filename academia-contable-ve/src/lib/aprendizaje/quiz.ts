import type { Pregunta } from "./tipos";

/**
 * Calificación de un quiz de lección: puro, sin estado — recibe las
 * preguntas y las respuestas elegidas, devuelve el resultado.
 */

export const UMBRAL_APROBACION_PORCENTAJE = 70;

export interface RespuestaUsuario {
  preguntaId: string;
  opcionElegidaId: string;
}

export interface DetalleRespuesta {
  preguntaId: string;
  correcta: boolean;
  opcionElegidaId: string;
  opcionCorrectaId: string;
}

export interface ResultadoQuiz {
  aciertos: number;
  total: number;
  porcentaje: number;
  aprobado: boolean;
  detalle: DetalleRespuesta[];
}

export function calificarQuiz(
  preguntas: Pregunta[],
  respuestas: RespuestaUsuario[],
): ResultadoQuiz {
  if (preguntas.length === 0) {
    throw new Error("No se puede calificar un quiz sin preguntas.");
  }

  const respuestasPorPregunta = new Map(respuestas.map((r) => [r.preguntaId, r.opcionElegidaId]));

  const detalle: DetalleRespuesta[] = preguntas.map((p) => {
    const opcionElegidaId = respuestasPorPregunta.get(p.id) ?? "";
    return {
      preguntaId: p.id,
      correcta: opcionElegidaId === p.opcionCorrectaId,
      opcionElegidaId,
      opcionCorrectaId: p.opcionCorrectaId,
    };
  });

  const aciertos = detalle.filter((d) => d.correcta).length;
  const total = preguntas.length;
  const porcentaje = Math.round((aciertos / total) * 100);
  const aprobado = porcentaje >= UMBRAL_APROBACION_PORCENTAJE;

  return { aciertos, total, porcentaje, aprobado, detalle };
}
