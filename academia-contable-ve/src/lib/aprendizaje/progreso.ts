import { supabase } from "@/lib/supabase/client";
import { ESTADO_TARJETA_NUEVA, type EstadoTarjeta } from "./repeticion-espaciada";
import * as local from "./progreso-local";

/**
 * Capa única de persistencia de progreso: si hay usuario autenticado,
 * lee/escribe en Supabase (tablas acve_progreso_lecciones y
 * acve_progreso_flashcards); si no, cae a localStorage
 * (progreso-local.ts), modo invitado. Los componentes no necesitan
 * saber cuál de los dos se está usando.
 */

export interface ProgresoLeccion {
  aprobado: boolean;
  mejorPorcentaje: number;
}

export interface EstadoFlashcardGuardado {
  estado: EstadoTarjeta;
  proximaFechaRevisionISO: string | null;
}

export async function registrarResultadoLeccion(
  userId: string | null,
  leccionId: string,
  porcentaje: number,
  aprobado: boolean,
): Promise<void> {
  if (!userId) {
    local.registrarResultadoLeccion(leccionId, porcentaje, aprobado);
    return;
  }

  const { data: existente } = await supabase
    .from("acve_progreso_lecciones")
    .select("mejor_porcentaje, aprobado")
    .eq("usuario_id", userId)
    .eq("leccion_id", leccionId)
    .maybeSingle();

  await supabase.from("acve_progreso_lecciones").upsert(
    {
      usuario_id: userId,
      leccion_id: leccionId,
      aprobado: aprobado || Boolean(existente?.aprobado),
      mejor_porcentaje: Math.max(porcentaje, existente?.mejor_porcentaje ?? 0),
      ultima_vez: new Date().toISOString(),
    },
    { onConflict: "usuario_id,leccion_id" },
  );
}

export async function obtenerProgresoLeccion(
  userId: string | null,
  leccionId: string,
): Promise<ProgresoLeccion | null> {
  if (!userId) {
    const p = local.obtenerProgresoLeccion(leccionId);
    return p ? { aprobado: p.aprobado, mejorPorcentaje: p.mejorPorcentaje } : null;
  }

  const { data } = await supabase
    .from("acve_progreso_lecciones")
    .select("aprobado, mejor_porcentaje")
    .eq("usuario_id", userId)
    .eq("leccion_id", leccionId)
    .maybeSingle();

  if (!data) return null;
  return { aprobado: data.aprobado, mejorPorcentaje: data.mejor_porcentaje };
}

export async function guardarEstadoFlashcard(
  userId: string | null,
  flashcardId: string,
  estado: EstadoTarjeta,
  proximaFechaRevisionISO: string,
): Promise<void> {
  if (!userId) {
    local.guardarEstadoFlashcard(flashcardId, estado, proximaFechaRevisionISO);
    return;
  }

  await supabase.from("acve_progreso_flashcards").upsert(
    {
      usuario_id: userId,
      flashcard_id: flashcardId,
      repeticiones: estado.repeticiones,
      facilidad: estado.facilidad,
      intervalo_dias: estado.intervaloDias,
      proxima_fecha_revision: proximaFechaRevisionISO,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "usuario_id,flashcard_id" },
  );
}

export async function obtenerEstadoFlashcard(
  userId: string | null,
  flashcardId: string,
): Promise<EstadoFlashcardGuardado> {
  if (!userId) return local.obtenerEstadoFlashcard(flashcardId);

  const { data } = await supabase
    .from("acve_progreso_flashcards")
    .select("repeticiones, facilidad, intervalo_dias, proxima_fecha_revision")
    .eq("usuario_id", userId)
    .eq("flashcard_id", flashcardId)
    .maybeSingle();

  if (!data) return { estado: ESTADO_TARJETA_NUEVA, proximaFechaRevisionISO: null };

  return {
    estado: {
      repeticiones: data.repeticiones,
      facilidad: Number(data.facilidad),
      intervaloDias: data.intervalo_dias,
    },
    proximaFechaRevisionISO: data.proxima_fecha_revision,
  };
}

/** Trae de una sola vez el estado de repaso de todas las flashcards del usuario (evita N consultas). */
export async function obtenerTodosLosEstadosFlashcards(
  userId: string | null,
): Promise<Record<string, EstadoFlashcardGuardado>> {
  if (!userId) return local.obtenerTodosLosEstadosFlashcardsLocal();

  const { data } = await supabase
    .from("acve_progreso_flashcards")
    .select("flashcard_id, repeticiones, facilidad, intervalo_dias, proxima_fecha_revision")
    .eq("usuario_id", userId);

  const mapa: Record<string, EstadoFlashcardGuardado> = {};
  for (const fila of data ?? []) {
    mapa[fila.flashcard_id] = {
      estado: {
        repeticiones: fila.repeticiones,
        facilidad: Number(fila.facilidad),
        intervaloDias: fila.intervalo_dias,
      },
      proximaFechaRevisionISO: fila.proxima_fecha_revision,
    };
  }
  return mapa;
}

/** Trae de una sola vez el progreso de todas las lecciones del usuario (evita N consultas). */
export async function obtenerTodoElProgresoLecciones(
  userId: string | null,
): Promise<Record<string, ProgresoLeccion>> {
  if (!userId) return local.obtenerTodoElProgresoLeccionesLocal();

  const { data } = await supabase
    .from("acve_progreso_lecciones")
    .select("leccion_id, aprobado, mejor_porcentaje")
    .eq("usuario_id", userId);

  const mapa: Record<string, ProgresoLeccion> = {};
  for (const fila of data ?? []) {
    mapa[fila.leccion_id] = { aprobado: fila.aprobado, mejorPorcentaje: fila.mejor_porcentaje };
  }
  return mapa;
}
