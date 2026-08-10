'use client'

import { useParams } from 'next/navigation'
import { Boton, Tarjeta, Titulo } from '@/components/ui'
import { TandaEjercicios, type ResultadoEjercicio } from '@/components/ejercicios'
import { semanaPorNumero } from '@/contenido/curriculo'
import { useProgreso } from '@/lib/progreso'

export default function EjerciciosSemana() {
  const { numero } = useParams<{ numero: string }>()
  const n = Number(numero)
  const semana = semanaPorNumero(n)
  const { completar, registrarActividad, registrarPuntaje } = useProgreso()

  if (!semana) return <Tarjeta>Esa semana no existe.</Tarjeta>

  function alTerminar(resultados: ResultadoEjercicio[]) {
    if (!resultados.length) return
    const pct = Math.round(
      (resultados.filter((r) => r.correcto).length / resultados.length) * 100
    )
    registrarPuntaje(n, pct)
    completar(n, 'ejercicios')
    registrarActividad({ minutos: 8 })
  }

  return (
    <div className="aparecer">
      <Titulo volver={`/semana/${n}`} sub={`Semana ${n} · ${semana.titulo}`}>
        Ejercicios
      </Titulo>

      <TandaEjercicios ejercicios={semana.ejercicios} alTerminar={alTerminar} />

      <div className="mt-5 flex flex-wrap gap-2">
        <Boton href={`/semana/${n}/gramatica`} variante="secundario" tamano="sm">
          Repasar la gramática
        </Boton>
        <Boton href={`/semana/${n}/dialogo`} variante="secundario" tamano="sm">
          Ir al diálogo
        </Boton>
      </div>
    </div>
  )
}
