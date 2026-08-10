'use client'

import { useParams } from 'next/navigation'
import { AlertTriangle, Check } from 'lucide-react'
import { Boton, Tarjeta, TextoRico, Titulo } from '@/components/ui'
import { Frase } from '@/components/boton-audio'
import { semanaPorNumero } from '@/contenido/curriculo'
import { useProgreso } from '@/lib/progreso'

export default function Gramatica() {
  const { numero } = useParams<{ numero: string }>()
  const n = Number(numero)
  const semana = semanaPorNumero(n)
  const { completar, registrarActividad } = useProgreso()

  if (!semana) return <Tarjeta>Esa semana no existe.</Tarjeta>

  function terminar() {
    completar(n, 'gramatica')
    registrarActividad({ minutos: 6, xp: 25 })
  }

  return (
    <div className="aparecer">
      <Titulo volver={`/semana/${n}`} sub={`Semana ${n} · ${semana.titulo}`}>
        Gramática
      </Titulo>

      <div className="flex flex-col gap-6">
        {semana.gramatica.map((tema) => (
          <Tarjeta key={tema.id}>
            <h2 className="mb-3 text-xl font-bold">{tema.titulo}</h2>

            <div className="flex flex-col gap-3">
              {tema.explicacion.map((p, i) => (
                <p key={i} className="leading-relaxed">
                  <TextoRico>{p}</TextoRico>
                </p>
              ))}
            </div>

            {tema.tabla && (
              <div className="mt-4 -mx-1 overflow-x-auto">
                <table className="w-full min-w-[22rem] border-collapse text-sm">
                  <thead>
                    <tr>
                      {tema.tabla.encabezados.map((h) => (
                        <th
                          key={h}
                          className="border-b px-3 py-2 text-left font-semibold texto-suave"
                          style={{ borderColor: 'var(--borde)' }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tema.tabla.filas.map((fila, i) => (
                      <tr key={i}>
                        {fila.map((celda, j) => (
                          <td
                            key={j}
                            className="border-b px-3 py-2 align-top"
                            style={{ borderColor: 'var(--borde)' }}
                          >
                            {celda}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-5">
              <h3 className="mb-3 text-sm font-semibold texto-suave">EJEMPLOS</h3>
              <div className="flex flex-col gap-3">
                {tema.ejemplos.map((e) => (
                  <Frase key={e.en} en={e.en} es={e.es} />
                ))}
              </div>
            </div>

            {tema.errores && tema.errores.length > 0 && (
              <div className="mt-5 rounded-xl border border-amber-300/70 bg-amber-50/60 p-3 dark:border-amber-900 dark:bg-amber-950/20">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <AlertTriangle size={16} className="text-amber-600" />
                  Errores que casi todos cometemos
                </h3>
                <ul className="flex flex-col gap-3">
                  {tema.errores.map((err) => (
                    <li key={err.mal} className="text-sm">
                      <p className="line-through opacity-70">✗ {err.mal}</p>
                      <p className="font-semibold text-green-800 dark:text-green-300">
                        ✓ {err.bien}
                      </p>
                      <p className="mt-0.5 texto-suave">{err.porque}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Tarjeta>
        ))}
      </div>

      <Tarjeta className="mt-6 text-center">
        <p className="mb-3 text-sm texto-suave">
          ¿Ya lo leíste con calma? La gramática no se aprende leyendo: se aprende usándola en los
          ejercicios.
        </p>
        <Boton href={`/semana/${n}/ejercicios`} onClick={terminar} full>
          <Check size={18} /> Entendido, ir a los ejercicios
        </Boton>
      </Tarjeta>
    </div>
  )
}
