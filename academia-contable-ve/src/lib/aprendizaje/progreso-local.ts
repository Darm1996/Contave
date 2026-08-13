import {
  ESTADO_TARJETA_NUEVA,
  type EstadoTarjeta,
} from "./repeticion-espaciada";

/**
 * Persistencia de progreso en localStorage — usada como modo invitado
 * (sin sesión) por src/lib/aprendizaje/progreso.ts, que es la capa que
 * los componentes deben usar. Con sesión activa, progreso.ts lee/
 * escribe en Supabase en su lugar (mismas tablas de
 * supabase/migrations/0001_init.sql).
 */

const CLAVE_ALMACENAMIENTO = "academia-contable-ve:progreso";

interface ProgresoLeccion {
  leccionId: string;
  aprobado: boolean;
  mejorPorcentaje: number;
  ultimaVezISO: string;
}

interface ProgresoFlashcard {
  flashcardId: string;
  estado: EstadoTarjeta;
  proximaFechaRevisionISO: string | null;
}

interface Progreso {
  lecciones: Record<string, ProgresoLeccion>;
  flashcards: Record<string, ProgresoFlashcard>;
}

function progresoVacio(): Progreso {
  return { lecciones: {}, flashcards: {} };
}

function cargarProgreso(): Progreso {
  if (typeof window === "undefined") return progresoVacio();
  try {
    const crudo = window.localStorage.getItem(CLAVE_ALMACENAMIENTO);
    if (!crudo) return progresoVacio();
    return JSON.parse(crudo) as Progreso;
  } catch {
    return progresoVacio();
  }
}

function guardarProgreso(progreso: Progreso): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(progreso));
}

export function registrarResultadoLeccion(
  leccionId: string,
  porcentaje: number,
  aprobado: boolean,
): void {
  const progreso = cargarProgreso();
  const anterior = progreso.lecciones[leccionId];
  progreso.lecciones[leccionId] = {
    leccionId,
    aprobado: aprobado || Boolean(anterior?.aprobado),
    mejorPorcentaje: Math.max(porcentaje, anterior?.mejorPorcentaje ?? 0),
    ultimaVezISO: new Date().toISOString(),
  };
  guardarProgreso(progreso);
}

export function obtenerProgresoLeccion(leccionId: string): ProgresoLeccion | null {
  return cargarProgreso().lecciones[leccionId] ?? null;
}

export function obtenerEstadoFlashcard(flashcardId: string): {
  estado: EstadoTarjeta;
  proximaFechaRevisionISO: string | null;
} {
  const registro = cargarProgreso().flashcards[flashcardId];
  if (!registro) return { estado: ESTADO_TARJETA_NUEVA, proximaFechaRevisionISO: null };
  return { estado: registro.estado, proximaFechaRevisionISO: registro.proximaFechaRevisionISO };
}

export function guardarEstadoFlashcard(
  flashcardId: string,
  estado: EstadoTarjeta,
  proximaFechaRevisionISO: string,
): void {
  const progreso = cargarProgreso();
  progreso.flashcards[flashcardId] = { flashcardId, estado, proximaFechaRevisionISO };
  guardarProgreso(progreso);
}

export function obtenerTodosLosEstadosFlashcardsLocal(): Record<
  string,
  { estado: EstadoTarjeta; proximaFechaRevisionISO: string | null }
> {
  const progreso = cargarProgreso();
  const mapa: Record<string, { estado: EstadoTarjeta; proximaFechaRevisionISO: string | null }> = {};
  for (const [flashcardId, registro] of Object.entries(progreso.flashcards)) {
    mapa[flashcardId] = { estado: registro.estado, proximaFechaRevisionISO: registro.proximaFechaRevisionISO };
  }
  return mapa;
}

export function obtenerTodoElProgresoLeccionesLocal(): Record<
  string,
  { aprobado: boolean; mejorPorcentaje: number }
> {
  const progreso = cargarProgreso();
  const mapa: Record<string, { aprobado: boolean; mejorPorcentaje: number }> = {};
  for (const [leccionId, registro] of Object.entries(progreso.lecciones)) {
    mapa[leccionId] = { aprobado: registro.aprobado, mejorPorcentaje: registro.mejorPorcentaje };
  }
  return mapa;
}
