"use client";

import { useEffect, useState } from "react";
import { obtenerProgresoLeccion } from "@/lib/aprendizaje/progreso";
import { useAuth } from "@/lib/auth/auth-provider";

/** Muestra "✓ Aprobada" si el usuario ya aprobó el quiz de esta lección. */
export function InsigniaProgresoLeccion({ leccionId }: { leccionId: string }) {
  const { usuario, cargando } = useAuth();
  const [aprobado, setAprobado] = useState(false);

  useEffect(() => {
    if (cargando) return;
    let cancelado = false;
    obtenerProgresoLeccion(usuario?.id ?? null, leccionId).then((p) => {
      if (!cancelado) setAprobado(Boolean(p?.aprobado));
    });
    return () => {
      cancelado = true;
    };
  }, [leccionId, usuario?.id, cargando]);

  if (!aprobado) return null;

  return <span className="text-xs font-medium text-exito">✓ Aprobada</span>;
}
