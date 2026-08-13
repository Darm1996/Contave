"use client";

import { useEffect, useState } from "react";
import { obtenerProgresoLeccion } from "@/lib/aprendizaje/progreso-local";

/** Muestra "✓ Aprobada" si el usuario ya aprobó el quiz de esta lección. */
export function InsigniaProgresoLeccion({ leccionId }: { leccionId: string }) {
  const [aprobado, setAprobado] = useState(false);

  useEffect(() => {
    setAprobado(Boolean(obtenerProgresoLeccion(leccionId)?.aprobado));
  }, [leccionId]);

  if (!aprobado) return null;

  return <span className="text-xs font-medium text-exito">✓ Aprobada</span>;
}
