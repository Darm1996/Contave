import { MoveHorizontal } from 'lucide-react'

// Aviso visible solo en móvil (la tabla es más ancha que la pantalla y
// requiere deslizar horizontalmente para ver las columnas de montos).
export function TableScrollHint() {
  return (
    <p className="sm:hidden flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 px-3 py-1.5 border-b border-slate-200 dark:border-slate-700">
      <MoveHorizontal className="w-3 h-3 flex-shrink-0" />
      Desliza para ver todas las columnas
    </p>
  )
}
