"use client";

import { useState } from "react";
import { calificarQuiz, type RespuestaUsuario, type ResultadoQuiz } from "@/lib/aprendizaje/quiz";
import { registrarResultadoLeccion } from "@/lib/aprendizaje/progreso";
import { useAuth } from "@/lib/auth/auth-provider";
import type { Pregunta } from "@/lib/aprendizaje/tipos";

export function QuizLeccion({ leccionId, preguntas }: { leccionId: string; preguntas: Pregunta[] }) {
  const { usuario } = useAuth();
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<ResultadoQuiz | null>(null);

  const elegirOpcion = (preguntaId: string, opcionId: string) => {
    if (resultado) return; // ya calificado, no se puede cambiar sin reintentar
    setRespuestas((prev) => ({ ...prev, [preguntaId]: opcionId }));
  };

  const enviar = () => {
    const respuestasArray: RespuestaUsuario[] = Object.entries(respuestas).map(
      ([preguntaId, opcionElegidaId]) => ({ preguntaId, opcionElegidaId }),
    );
    const r = calificarQuiz(preguntas, respuestasArray);
    setResultado(r);
    void registrarResultadoLeccion(usuario?.id ?? null, leccionId, r.porcentaje, r.aprobado);
  };

  const reintentar = () => {
    setRespuestas({});
    setResultado(null);
  };

  const todasRespondidas = preguntas.every((p) => respuestas[p.id]);

  return (
    <section className="mt-8 rounded-lg border border-[var(--borde)] p-6">
      <h2 className="text-lg font-semibold tracking-tight">Comprueba lo que aprendiste</h2>

      <div className="mt-4 space-y-6">
        {preguntas.map((p, i) => {
          const detalle = resultado?.detalle.find((d) => d.preguntaId === p.id);
          return (
            <div key={p.id}>
              <p className="text-sm font-medium">
                {i + 1}. {p.enunciado}
              </p>
              <div className="mt-2 space-y-1.5">
                {p.opciones.map((o) => {
                  const elegida = respuestas[p.id] === o.id;
                  let estilo = "border-[var(--borde)]";
                  if (resultado && detalle) {
                    if (o.id === p.opcionCorrectaId) {
                      estilo = "border-exito bg-exito/5";
                    } else if (elegida && !detalle.correcta) {
                      estilo = "border-alerta bg-alerta/5";
                    }
                  } else if (elegida) {
                    estilo = "border-acento";
                  }
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => elegirOpcion(p.id, o.id)}
                      disabled={Boolean(resultado)}
                      className={`block w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${estilo}`}
                    >
                      {o.texto}
                    </button>
                  );
                })}
              </div>
              {resultado && (
                <p className={`mt-2 text-xs ${detalle?.correcta ? "text-exito" : "text-alerta"}`}>
                  {detalle?.correcta ? "Correcto. " : "Incorrecto. "}
                  {p.explicacion}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {!resultado ? (
        <button
          type="button"
          onClick={enviar}
          disabled={!todasRespondidas}
          className="mt-6 rounded-md bg-acento px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Calificar
        </button>
      ) : (
        <div className="mt-6 flex items-center gap-4">
          <span
            className={`cifra text-lg font-semibold ${resultado.aprobado ? "text-exito" : "text-alerta"}`}
          >
            {resultado.aciertos}/{resultado.total} ({resultado.porcentaje}%)
          </span>
          <span className="text-sm text-gris-500">
            {resultado.aprobado ? "¡Aprobado!" : "Todavía no — repasa e inténtalo de nuevo."}
          </span>
          <button
            type="button"
            onClick={reintentar}
            className="ml-auto rounded-md border border-[var(--borde)] px-3 py-1.5 text-sm hover:border-acento hover:text-acento"
          >
            Reintentar
          </button>
        </div>
      )}
    </section>
  );
}
