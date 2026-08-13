/**
 * Navbar superior: identidad del producto + selector de empresa activa +
 * usuario. El selector de empresa y el menú de usuario quedan como
 * marcadores visuales por ahora — se conectan a Supabase Auth y a la
 * tabla `empresa_usuarios` cuando se implemente el Módulo 1.
 */
export function Navbar() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--borde)] px-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold tracking-tight">
          Biblia y Simulador VE
        </span>
        <span className="cifra rounded-sm bg-gris-100 px-1.5 py-0.5 text-[10px] text-gris-500 dark:bg-gris-800">
          v0.1
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <button
          type="button"
          className="rounded-md border border-[var(--borde)] px-3 py-1.5 text-gris-600 hover:border-acento hover:text-acento dark:text-gris-300"
        >
          Empresa activa: —
        </button>
        <button
          type="button"
          className="h-8 w-8 rounded-full bg-gris-200 text-xs font-medium text-gris-700 dark:bg-gris-800 dark:text-gris-200"
          aria-label="Cuenta de usuario"
        >
          ?
        </button>
      </div>
    </header>
  );
}
