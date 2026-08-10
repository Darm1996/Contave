import type { Metadata, Viewport } from 'next'
import { Navegacion } from '@/components/navegacion'
import './globals.css'

export const metadata: Metadata = {
  title: 'Inglés desde cero — curso de 6 meses',
  description:
    'Curso completo de inglés en español: profesor con varias voces, gramática, vocabulario con repaso espaciado, ejercicios, escritura y pronunciación.',
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Navegacion />
        {/* El padding izquierdo deja sitio a la barra lateral del escritorio;
            el inferior, a la barra de navegación del móvil. */}
        <div className="md:pl-60">
          <main className="mx-auto max-w-3xl px-4 pb-24 pt-6 md:pb-12">{children}</main>
        </div>
      </body>
    </html>
  )
}
