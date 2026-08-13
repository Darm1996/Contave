import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { InsigniaProgresoLeccion } from "@/components/aprendizaje/insignia-progreso";
import { MODULOS, obtenerLeccion } from "@/contenido";

export default function Home() {
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight">Módulos</h1>
      <p className="mt-2 text-sm text-gris-500">
        Repasa contabilidad y tributos venezolanos: lecciones con quiz
        para conceptos nuevos, y{" "}
        <Link href="/repasar" className="text-acento underline underline-offset-2">
          flashcards de repaso
        </Link>{" "}
        para lo que ya viste.
      </p>

      <div className="mt-8 space-y-4">
        {MODULOS.map((modulo) => (
          <div key={modulo.id} className="rounded-lg border border-[var(--borde)] p-5">
            <div className="flex items-center gap-2">
              <span className="cifra text-xs text-gris-400">
                {String(modulo.numero).padStart(2, "0")}
              </span>
              <h2 className="font-medium">{modulo.nombre}</h2>
            </div>
            <p className="mt-1 text-sm text-gris-500">{modulo.descripcion}</p>

            {modulo.leccionesIds.length === 0 ? (
              <p className="mt-3 text-xs text-gris-400">Próximamente</p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {modulo.leccionesIds.map((leccionId) => {
                  const leccion = obtenerLeccion(leccionId);
                  if (!leccion) return null;
                  return (
                    <li key={leccionId} className="flex items-center justify-between gap-2">
                      <Link
                        href={`/aprender/${leccionId}`}
                        className="text-sm text-acento underline-offset-2 hover:underline"
                      >
                        {leccion.titulo}
                      </Link>
                      <InsigniaProgresoLeccion leccionId={leccionId} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
