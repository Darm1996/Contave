'use client'

// Componentes base. Pequeños a propósito: la app no necesita una librería
// entera, y así el bundle se mantiene mínimo.

import Link from 'next/link'
import type { ReactNode } from 'react'

export function cx(...clases: (string | false | null | undefined)[]): string {
  return clases.filter(Boolean).join(' ')
}

export function Tarjeta({
  children,
  className,
  padding = true,
}: {
  children: ReactNode
  className?: string
  padding?: boolean
}) {
  return (
    <div
      className={cx(
        'superficie rounded-2xl border shadow-sm',
        padding && 'p-4 sm:p-5',
        className
      )}
    >
      {children}
    </div>
  )
}

type Variante = 'primario' | 'secundario' | 'fantasma' | 'acento' | 'peligro'

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-blue-700 text-white hover:bg-blue-800 active:bg-blue-900',
  acento: 'bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800',
  secundario: 'superficie border hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
  fantasma: 'hover:bg-black/[0.05] dark:hover:bg-white/[0.08]',
  peligro: 'bg-red-700 text-white hover:bg-red-800',
}

const TAMANOS = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5',
  lg: 'px-5 py-3.5 text-lg',
}

interface BotonProps {
  children: ReactNode
  onClick?: () => void
  variante?: Variante
  tamano?: keyof typeof TAMANOS
  className?: string
  disabled?: boolean
  href?: string
  type?: 'button' | 'submit'
  ariaLabel?: string
  full?: boolean
}

export function Boton({
  children,
  onClick,
  variante = 'primario',
  tamano = 'md',
  className,
  disabled,
  href,
  type = 'button',
  ariaLabel,
  full,
}: BotonProps) {
  const clases = cx(
    'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors',
    'disabled:opacity-45 disabled:pointer-events-none',
    VARIANTES[variante],
    TAMANOS[tamano],
    full && 'w-full',
    className
  )

  if (href && !disabled) {
    // El onClick sigue funcionando en la variante enlace: se usa para marcar
    // la actividad como completada justo antes de navegar.
    return (
      <Link href={href} className={clases} aria-label={ariaLabel} onClick={onClick}>
        {children}
      </Link>
    )
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clases}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  )
}

export function Etiqueta({
  children,
  tono = 'neutro',
}: {
  children: ReactNode
  tono?: 'neutro' | 'marca' | 'exito' | 'error' | 'acento'
}) {
  const tonos = {
    neutro: 'bg-black/[0.06] dark:bg-white/[0.1] texto-suave',
    marca: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
    exito: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
    error: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
    acento: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  }
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        tonos[tono]
      )}
    >
      {children}
    </span>
  )
}

export function Barra({
  valor,
  className,
  tono = 'marca',
}: {
  valor: number
  className?: string
  tono?: 'marca' | 'exito' | 'acento'
}) {
  const colores = {
    marca: 'bg-blue-700',
    exito: 'bg-green-600',
    acento: 'bg-amber-500',
  }
  const pct = Math.max(0, Math.min(100, valor))
  return (
    <div
      className={cx('h-2 w-full overflow-hidden rounded-full bg-black/[0.08] dark:bg-white/[0.12]', className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cx('h-full rounded-full transition-[width] duration-500', colores[tono])}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function Titulo({
  children,
  sub,
  volver,
}: {
  children: ReactNode
  sub?: ReactNode
  volver?: string
}) {
  return (
    <header className="mb-5">
      {volver && (
        <Link
          href={volver}
          className="mb-2 inline-flex items-center gap-1 text-sm texto-suave hover:underline"
        >
          ← Volver
        </Link>
      )}
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{children}</h1>
      {sub && <p className="mt-1.5 texto-suave">{sub}</p>}
    </header>
  )
}

export function Vacio({ children }: { children: ReactNode }) {
  return (
    <Tarjeta className="text-center">
      <p className="texto-suave py-6">{children}</p>
    </Tarjeta>
  )
}

/** Renderiza **negrita** dentro de un texto plano. */
export function TextoRico({ children }: { children: string }) {
  const partes = children.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {partes.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <strong key={i} className="font-semibold">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  )
}
