const modulos = [
  { id: "setup", href: "#setup", numero: 1, nombre: "Setup Corporativo" },
  { id: "multimoneda", href: "/modulo-2", numero: 2, nombre: "Multimoneda e Inflación" },
  { id: "seniat", href: "/modulo-3", numero: 3, nombre: "Ecosistema SENIAT" },
  { id: "municipal", href: "#municipal", numero: 4, nombre: "Municipal y Estadal" },
  { id: "nomina", href: "#nomina", numero: 5, nombre: "Nómina y Parafiscal" },
  { id: "estados-financieros", href: "#estados-financieros", numero: 6, nombre: "Estados Financieros" },
  { id: "auditoria", href: "#auditoria", numero: 7, nombre: "Auditoría e Inventario" },
] as const;

/**
 * Sidebar de navegación por módulo. Los módulos aún no implementados
 * quedan como anclas (#) — solo "multimoneda" enruta a una página real
 * por ahora. Se van reemplazando a medida que se profundiza en cada uno.
 */
export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-[var(--borde)] md:block">
      <nav className="flex flex-col gap-1 p-4">
        <span className="mb-2 px-2 text-xs font-medium tracking-wide text-gris-500 uppercase">
          Módulos
        </span>
        {modulos.map((m) => (
          <a
            key={m.id}
            href={m.href}
            className="group flex items-center gap-3 rounded-md px-2 py-2 text-sm text-gris-700 transition-colors hover:bg-gris-100 dark:text-gris-300 dark:hover:bg-gris-800"
          >
            <span className="cifra text-xs text-gris-400 group-hover:text-acento">
              {String(m.numero).padStart(2, "0")}
            </span>
            {m.nombre}
          </a>
        ))}
      </nav>
    </aside>
  );
}
