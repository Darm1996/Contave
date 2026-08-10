'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, CalendarDays, GraduationCap, Layers, Settings } from 'lucide-react'
import { cx } from './ui'

const ENLACES = [
  { href: '/', etiqueta: 'Hoy', icono: GraduationCap },
  { href: '/plan', etiqueta: 'Plan', icono: CalendarDays },
  { href: '/vocabulario', etiqueta: 'Repaso', icono: Layers },
  { href: '/practica', etiqueta: 'Práctica', icono: BookOpen },
  { href: '/ajustes', etiqueta: 'Ajustes', icono: Settings },
]

function activo(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

export function Navegacion() {
  const pathname = usePathname()

  return (
    <>
      {/* Escritorio: barra lateral fija */}
      <nav className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r superficie p-4 md:flex">
        <Link href="/" className="mb-6 flex items-center gap-2 px-2">
          <span className="text-2xl" aria-hidden>
            🎧
          </span>
          <span className="text-lg font-bold leading-tight">
            Inglés
            <span className="block text-xs font-normal texto-suave">de cero a fluido</span>
          </span>
        </Link>

        <ul className="flex flex-col gap-1">
          {ENLACES.map(({ href, etiqueta, icono: Icono }) => (
            <li key={href}>
              <Link
                href={href}
                className={cx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition-colors',
                  activo(pathname, href)
                    ? 'bg-blue-700 text-white'
                    : 'hover:bg-black/[0.05] dark:hover:bg-white/[0.08]'
                )}
              >
                <Icono size={19} />
                {etiqueta}
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-auto px-2 text-xs texto-suave">
          Tu progreso se guarda en este dispositivo.
        </p>
      </nav>

      {/* Móvil: barra inferior */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t superficie md:hidden">
        <ul className="mx-auto flex max-w-lg">
          {ENLACES.map(({ href, etiqueta, icono: Icono }) => {
            const on = activo(pathname, href)
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={on ? 'page' : undefined}
                  className={cx(
                    'flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
                    on ? 'text-blue-700 dark:text-blue-400' : 'texto-suave'
                  )}
                >
                  <Icono size={21} />
                  {etiqueta}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
