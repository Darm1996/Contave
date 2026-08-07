'use client'
// Piezas visuales compartidas del módulo Restaurante.
//
// El módulo lo usa gente que está en la cocina o en la caja, no un contador
// frente a una hoja de cálculo. Por eso todo aquí es más redondeado, con más
// aire y colores pastel: tarjetas suaves, números grandes y legibles, y
// etiquetas en el idioma del negocio ("lo que entró", "a quién le debo").

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { formatoUSD } from '@/lib/restaurante/calculos'

/** Paletas pastel por acento. Se declaran completas porque Tailwind necesita
 *  ver la clase escrita para incluirla en el CSS final. */
const TONOS: Record<string, { suave: string; texto: string; borde: string; punto: string }> = {
  emerald: { suave: 'bg-emerald-50 dark:bg-emerald-950/40', texto: 'text-emerald-700 dark:text-emerald-300', borde: 'border-emerald-100 dark:border-emerald-900', punto: 'bg-emerald-400' },
  rose: { suave: 'bg-rose-50 dark:bg-rose-950/40', texto: 'text-rose-700 dark:text-rose-300', borde: 'border-rose-100 dark:border-rose-900', punto: 'bg-rose-400' },
  amber: { suave: 'bg-amber-50 dark:bg-amber-950/40', texto: 'text-amber-700 dark:text-amber-300', borde: 'border-amber-100 dark:border-amber-900', punto: 'bg-amber-400' },
  sky: { suave: 'bg-sky-50 dark:bg-sky-950/40', texto: 'text-sky-700 dark:text-sky-300', borde: 'border-sky-100 dark:border-sky-900', punto: 'bg-sky-400' },
  violet: { suave: 'bg-violet-50 dark:bg-violet-950/40', texto: 'text-violet-700 dark:text-violet-300', borde: 'border-violet-100 dark:border-violet-900', punto: 'bg-violet-400' },
  indigo: { suave: 'bg-indigo-50 dark:bg-indigo-950/40', texto: 'text-indigo-700 dark:text-indigo-300', borde: 'border-indigo-100 dark:border-indigo-900', punto: 'bg-indigo-400' },
  cyan: { suave: 'bg-cyan-50 dark:bg-cyan-950/40', texto: 'text-cyan-700 dark:text-cyan-300', borde: 'border-cyan-100 dark:border-cyan-900', punto: 'bg-cyan-400' },
  teal: { suave: 'bg-teal-50 dark:bg-teal-950/40', texto: 'text-teal-700 dark:text-teal-300', borde: 'border-teal-100 dark:border-teal-900', punto: 'bg-teal-400' },
  orange: { suave: 'bg-orange-50 dark:bg-orange-950/40', texto: 'text-orange-700 dark:text-orange-300', borde: 'border-orange-100 dark:border-orange-900', punto: 'bg-orange-400' },
  slate: { suave: 'bg-slate-50 dark:bg-slate-900/60', texto: 'text-slate-700 dark:text-slate-300', borde: 'border-slate-100 dark:border-slate-800', punto: 'bg-slate-400' },
  stone: { suave: 'bg-stone-50 dark:bg-stone-900/60', texto: 'text-stone-700 dark:text-stone-300', borde: 'border-stone-100 dark:border-stone-800', punto: 'bg-stone-400' },
  gray: { suave: 'bg-gray-50 dark:bg-gray-900/60', texto: 'text-gray-700 dark:text-gray-300', borde: 'border-gray-100 dark:border-gray-800', punto: 'bg-gray-400' },
}

export function tono(color: string) {
  return TONOS[color] || TONOS.slate
}

/** Contenedor base: esquinas amplias, borde tenue, sin sombras duras. */
export function TarjetaSuave({
  children, className, color,
}: { children: ReactNode; className?: string; color?: string }) {
  const t = color ? tono(color) : null
  return (
    <div
      className={cn(
        'rounded-2xl border bg-white dark:bg-slate-900/60 p-4 transition-colors',
        t ? t.borde : 'border-slate-100 dark:border-slate-800',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Número grande con su etiqueta. Es la unidad de lectura del panel. */
export function Cifra({
  etiqueta, valor, detalle, color = 'slate', icono, className,
}: {
  etiqueta: string
  valor: string
  detalle?: string
  color?: string
  icono?: ReactNode
  className?: string
}) {
  const t = tono(color)
  return (
    <div className={cn('rounded-2xl border p-4', t.suave, t.borde, className)}>
      <div className="flex items-center gap-2 mb-1">
        {icono && <span className={t.texto}>{icono}</span>}
        <span className="text-[11px] uppercase tracking-wide font-medium text-slate-500 dark:text-slate-400">
          {etiqueta}
        </span>
      </div>
      <div className={cn('text-2xl font-semibold tabular-nums', t.texto)}>{valor}</div>
      {detalle && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{detalle}</div>}
    </div>
  )
}

/** Encabezado de sección con título, subtítulo y acciones a la derecha. */
export function Encabezado({
  titulo, subtitulo, icono, color = 'emerald', acciones,
}: {
  titulo: string
  subtitulo?: string
  icono?: ReactNode
  color?: string
  acciones?: ReactNode
}) {
  const t = tono(color)
  return (
    <div className="flex items-start justify-between flex-wrap gap-3">
      <div className="flex items-start gap-3">
        {icono && (
          <div className={cn('rounded-2xl p-2.5 shrink-0', t.suave, t.texto)}>{icono}</div>
        )}
        <div>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{titulo}</h2>
          {subtitulo && (
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">{subtitulo}</p>
          )}
        </div>
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </div>
  )
}

export function Pastilla({ children, color = 'slate' }: { children: ReactNode; color?: string }) {
  const t = tono(color)
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', t.suave, t.texto)}>
      {children}
    </span>
  )
}

/** Estado vacío amable: dice qué hacer, no solo que no hay datos. */
export function SinDatos({ mensaje, sugerencia }: { mensaje: string; sugerencia?: string }) {
  return (
    <div className="text-center py-10 px-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">{mensaje}</p>
      {sugerencia && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sugerencia}</p>}
    </div>
  )
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="text-center py-10 text-sm text-slate-400 dark:text-slate-500 animate-pulse">
      {texto}
    </div>
  )
}

/** Monto en dólares con color según signo (verde entra, rojo sale). */
export function Monto({ valor, tipo }: { valor: number; tipo?: 'ingreso' | 'egreso' | 'neutro' }) {
  const clase =
    tipo === 'ingreso' ? 'text-emerald-600 dark:text-emerald-400'
    : tipo === 'egreso' ? 'text-rose-600 dark:text-rose-400'
    : valor < 0 ? 'text-rose-600 dark:text-rose-400'
    : 'text-slate-700 dark:text-slate-200'
  return <span className={cn('tabular-nums font-medium', clase)}>{formatoUSD(valor)}</span>
}

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

/** Selector de mes/año usado por todas las pantallas del módulo. */
export function SelectorMes({
  ano, mes, onChange,
}: { ano: number; mes: number; onChange: (ano: number, mes: number) => void }) {
  const anoActual = new Date().getUTCFullYear()
  const anos = [anoActual - 2, anoActual - 1, anoActual, anoActual + 1]
  const base = 'h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-700 dark:text-slate-200'
  return (
    <div className="flex gap-2">
      <select className={base} value={mes} onChange={(e) => onChange(ano, Number(e.target.value))}>
        {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
      </select>
      <select className={base} value={ano} onChange={(e) => onChange(Number(e.target.value), mes)}>
        {anos.map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
    </div>
  )
}

/** Fecha de un registro, en formato corto y legible. */
export function fechaLegible(fecha: string | Date): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha
  return d.toLocaleDateString('es-VE', {
    day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'UTC',
  })
}

/** Valor de un <input type="date"> a partir de una fecha del servidor. */
export function valorInputFecha(fecha: string | Date): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha
  return d.toISOString().slice(0, 10)
}

export function hoyISO(): string {
  return new Date().toISOString().slice(0, 10)
}
