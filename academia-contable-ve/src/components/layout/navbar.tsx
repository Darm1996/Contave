"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-provider";

export function Navbar() {
  const { usuario, cargando, cerrarSesion } = useAuth();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--borde)] px-4">
      <Link href="/" className="flex items-center gap-2">
        <span className="text-sm font-semibold tracking-tight">
          Academia Contable VE
        </span>
        <span className="cifra rounded-sm bg-gris-100 px-1.5 py-0.5 text-[10px] text-gris-500 dark:bg-gris-800">
          v0.1
        </span>
      </Link>

      <nav className="flex items-center gap-4 text-sm">
        <Link href="/" className="text-gris-600 hover:text-acento dark:text-gris-300">
          Módulos
        </Link>
        <Link href="/repasar" className="text-gris-600 hover:text-acento dark:text-gris-300">
          Repasar
        </Link>
        {!cargando &&
          (usuario ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-gris-400 sm:inline">{usuario.email}</span>
              <button
                type="button"
                onClick={() => cerrarSesion()}
                className="text-gris-600 hover:text-acento dark:text-gris-300"
              >
                Cerrar sesión
              </button>
            </div>
          ) : (
            <Link href="/cuenta" className="text-gris-600 hover:text-acento dark:text-gris-300">
              Iniciar sesión
            </Link>
          ))}
      </nav>
    </header>
  );
}
