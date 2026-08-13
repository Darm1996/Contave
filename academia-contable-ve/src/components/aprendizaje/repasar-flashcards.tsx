"use client";

import { useEffect, useState } from "react";
import {
  actualizarEstadoTarjeta,
  calcularProximaFechaRevision,
  tarjetaPendienteHoy,
  type CalidadRespuesta,
} from "@/lib/aprendizaje/repeticion-espaciada";
import {
  guardarEstadoFlashcard,
  obtenerTodosLosEstadosFlashcards,
} from "@/lib/aprendizaje/progreso";
import { useAuth } from "@/lib/auth/auth-provider";
import type { Flashcard } from "@/lib/aprendizaje/tipos";

const OPCIONES_CALIDAD: Array<{ valor: CalidadRespuesta; etiqueta: string; estilo: string }> = [
  { valor: 0, etiqueta: "No la recordaba", estilo: "border-alerta text-alerta hover:bg-alerta/5" },
  { valor: 3, etiqueta: "Con esfuerzo", estilo: "border-[var(--borde)] hover:border-acento" },
  { valor: 5, etiqueta: "Fácil", estilo: "border-exito text-exito hover:bg-exito/5" },
];

export function RepasarFlashcards({ flashcards }: { flashcards: Flashcard[] }) {
  const { usuario, cargando } = useAuth();
  const [cargandoCola, setCargandoCola] = useState(true);
  const [cola, setCola] = useState<Flashcard[]>([]);
  const [indice, setIndice] = useState(0);
  const [totalPendientesInicial, setTotalPendientesInicial] = useState(0);
  const [mostrarRespuesta, setMostrarRespuesta] = useState(false);
  const [repasadasHoy, setRepasadasHoy] = useState(0);

  useEffect(() => {
    if (cargando) return;
    let cancelado = false;
    obtenerTodosLosEstadosFlashcards(usuario?.id ?? null).then((estados) => {
      if (cancelado) return;
      const hoy = new Date();
      const pendientes = flashcards.filter((f) =>
        tarjetaPendienteHoy(estados[f.id]?.proximaFechaRevisionISO ?? null, hoy),
      );
      setCola(pendientes);
      setTotalPendientesInicial(pendientes.length);
      setIndice(0);
      setCargandoCola(false);
    });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id, cargando]);

  const tarjetaActual = cola[indice];

  const calificar = async (calidad: CalidadRespuesta) => {
    if (!tarjetaActual) return;
    const estados = await obtenerTodosLosEstadosFlashcards(usuario?.id ?? null);
    const estadoAnterior = estados[tarjetaActual.id]?.estado;
    const nuevoEstado = actualizarEstadoTarjeta(
      estadoAnterior ?? { repeticiones: 0, facilidad: 2.5, intervaloDias: 0 },
      calidad,
    );
    const proximaFecha = calcularProximaFechaRevision(nuevoEstado, new Date());
    await guardarEstadoFlashcard(usuario?.id ?? null, tarjetaActual.id, nuevoEstado, proximaFecha);

    setRepasadasHoy((n) => n + 1);
    setMostrarRespuesta(false);
    setIndice((i) => i + 1);
  };

  if (flashcards.length === 0) {
    return (
      <p className="text-sm text-gris-500">
        Todavía no hay flashcards de este módulo.
      </p>
    );
  }

  if (cargando || cargandoCola) {
    return <p className="text-sm text-gris-500">Cargando…</p>;
  }

  if (!tarjetaActual) {
    return (
      <div className="rounded-lg border border-[var(--borde)] p-8 text-center">
        <p className="text-lg font-semibold text-exito">
          {repasadasHoy > 0 ? "¡Listo por hoy!" : "No hay flashcards pendientes"}
        </p>
        <p className="mt-2 text-sm text-gris-500">
          {repasadasHoy > 0
            ? `Repasaste ${repasadasHoy} tarjeta${repasadasHoy === 1 ? "" : "s"}. Vuelve mañana para seguir reforzando.`
            : "Todas tus flashcards están programadas para más adelante — vuelve cuando toque su próximo repaso."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-xs text-gris-500">
        {indice + 1} de {totalPendientesInicial} pendientes hoy
      </p>

      <div className="min-h-40 rounded-lg border border-[var(--borde)] bg-[var(--bg-panel)] p-6">
        <p className="text-sm font-medium text-gris-500 uppercase">Pregunta</p>
        <p className="mt-2 text-base">{tarjetaActual.pregunta}</p>

        {mostrarRespuesta && (
          <>
            <p className="mt-4 text-sm font-medium text-gris-500 uppercase">Respuesta</p>
            <p className="mt-2 text-base">{tarjetaActual.respuesta}</p>
          </>
        )}
      </div>

      {!mostrarRespuesta ? (
        <button
          type="button"
          onClick={() => setMostrarRespuesta(true)}
          className="mt-4 rounded-md bg-acento px-4 py-2 text-sm font-medium text-white"
        >
          Mostrar respuesta
        </button>
      ) : (
        <div className="mt-4">
          <p className="mb-2 text-xs text-gris-500">¿Qué tan bien la recordaste?</p>
          <div className="flex gap-2">
            {OPCIONES_CALIDAD.map((op) => (
              <button
                key={op.valor}
                type="button"
                onClick={() => void calificar(op.valor)}
                className={`rounded-md border px-3 py-2 text-sm transition-colors ${op.estilo}`}
              >
                {op.etiqueta}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
