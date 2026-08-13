/**
 * Repetición espaciada — algoritmo SM-2 (SuperMemo 2), el mismo
 * principio detrás de Anki: cada vez que repasas una flashcard,
 * calificas qué tan fácil te resultó recordarla (0 a 5). Esa
 * calificación ajusta cuándo vuelve a aparecer:
 *
 *  - Calificación baja (< 3, "no me acordaba"): se reinicia el
 *    progreso de esa tarjeta y vuelve a aparecer al día siguiente.
 *  - Calificación alta (≥ 3): el intervalo hasta el próximo repaso
 *    crece (1 día → 6 días → intervalo_anterior × facilidad), y la
 *    "facilidad" de la tarjeta sube o baja según qué tan cómoda fue
 *    la respuesta — tarjetas que cuesta recordar incluso cuando
 *    "aciertas" quedan con intervalos más cortos a futuro.
 *
 * Es una función pura: no conoce fechas del sistema ni persistencia.
 * `calcularProximaFechaRevision` sí toma una fecha base como argumento
 * explícito, para poder testear sin depender del reloj real.
 */

export type CalidadRespuesta = 0 | 1 | 2 | 3 | 4 | 5;

export interface EstadoTarjeta {
  /** Repeticiones consecutivas exitosas (calidad ≥ 3). */
  repeticiones: number;
  /** Factor de facilidad (EF de SM-2). Empieza en 2.5, nunca baja de 1.3 — */
  facilidad: number;
  /** Intervalo en días hasta el próximo repaso. */
  intervaloDias: number;
}

export const ESTADO_TARJETA_NUEVA: EstadoTarjeta = {
  repeticiones: 0,
  facilidad: 2.5,
  intervaloDias: 0,
};

const FACILIDAD_MINIMA = 1.3;
const UMBRAL_CALIDAD_ACEPTABLE = 3;

/**
 * Calcula el nuevo estado de una flashcard después de calificar un
 * repaso. No muta `estadoAnterior`.
 */
export function actualizarEstadoTarjeta(
  estadoAnterior: EstadoTarjeta,
  calidad: CalidadRespuesta,
): EstadoTarjeta {
  if (calidad < 0 || calidad > 5) {
    throw new Error("calidad debe estar entre 0 y 5.");
  }

  // La facilidad se recalcula siempre, incluso si la respuesta fue
  // mala — es la fórmula estándar de SM-2.
  const facilidadCruda =
    estadoAnterior.facilidad + (0.1 - (5 - calidad) * (0.08 + (5 - calidad) * 0.02));
  const facilidad = Math.max(FACILIDAD_MINIMA, facilidadCruda);

  if (calidad < UMBRAL_CALIDAD_ACEPTABLE) {
    // No se acordaba: se reinicia el conteo de repeticiones exitosas y
    // vuelve mañana, sin importar cuánto llevaba de intervalo antes.
    return { repeticiones: 0, facilidad, intervaloDias: 1 };
  }

  const repeticiones = estadoAnterior.repeticiones + 1;

  let intervaloDias: number;
  if (repeticiones === 1) {
    intervaloDias = 1;
  } else if (repeticiones === 2) {
    intervaloDias = 6;
  } else {
    intervaloDias = Math.round(estadoAnterior.intervaloDias * facilidad);
  }

  return { repeticiones, facilidad, intervaloDias };
}

/**
 * Fecha (ISO 8601, solo fecha) en que corresponde el próximo repaso,
 * dado un estado ya actualizado y la fecha del repaso que se acaba de
 * hacer.
 */
export function calcularProximaFechaRevision(
  estado: EstadoTarjeta,
  fechaRepaso: Date,
): string {
  const proxima = new Date(fechaRepaso);
  proxima.setDate(proxima.getDate() + estado.intervaloDias);
  return proxima.toISOString().slice(0, 10);
}

/**
 * true si una tarjeta con la fecha de próxima revisión dada ya debe
 * mostrarse hoy (o está atrasada).
 */
export function tarjetaPendienteHoy(proximaFechaRevisionISO: string | null, hoy: Date): boolean {
  if (!proximaFechaRevisionISO) return true; // tarjeta nunca repasada
  return proximaFechaRevisionISO <= hoy.toISOString().slice(0, 10);
}
