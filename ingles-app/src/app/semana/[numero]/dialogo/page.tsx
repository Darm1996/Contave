'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { Check, Mic, Pause, Play, Users } from 'lucide-react'
import { Boton, Etiqueta, Tarjeta, Titulo, cx } from '@/components/ui'
import { BotonAudio } from '@/components/boton-audio'
import { semanaPorNumero } from '@/contenido/curriculo'
import { PERFILES, callar, hablarSecuencia, perfilPorId } from '@/lib/voz'
import { analizarPronunciacion, useMicrofono } from '@/lib/microfono'
import { useProgreso } from '@/lib/progreso'

/** Asigna una voz a cada personaje del diálogo. */
function asignarPersonajes(hablantes: string[]): Record<string, string> {
  const mapa: Record<string, string> = {}
  let libres = PERFILES.map((p) => p.id)

  for (const h of hablantes) {
    // Los diálogos usan los nombres de los perfiles, así que casi siempre
    // hay coincidencia directa.
    const directo = PERFILES.find((p) => p.nombre.toLowerCase() === h.toLowerCase())
    const id = directo?.id ?? libres[0] ?? PERFILES[0].id
    mapa[h] = id
    libres = libres.filter((x) => x !== id)
  }
  return mapa
}

export default function DialogoSemana() {
  const { numero } = useParams<{ numero: string }>()
  const n = Number(numero)
  const semana = semanaPorNumero(n)
  const { completar, registrarActividad, ajustes } = useProgreso()

  const [reproduciendo, setReproduciendo] = useState(false)
  const [lineaActiva, setLineaActiva] = useState(-1)
  const [modoRol, setModoRol] = useState<string | null>(null)
  const detener = useRef<(() => void) | null>(null)

  const hablantes = useMemo(
    () => (semana ? [...new Set(semana.dialogo.lineas.map((l) => l.hablante))] : []),
    [semana]
  )
  const voces = useMemo(() => asignarPersonajes(hablantes), [hablantes])

  useEffect(() => {
    return () => {
      detener.current?.()
      callar()
    }
  }, [])

  if (!semana) return <Tarjeta>Esa semana no existe.</Tarjeta>

  const dialogo = semana.dialogo

  function reproducirTodo() {
    if (reproduciendo) {
      detener.current?.()
      setReproduciendo(false)
      setLineaActiva(-1)
      return
    }
    setReproduciendo(true)
    detener.current = hablarSecuencia(
      dialogo.lineas
        // En modo rol se saltan las líneas del personaje que interpreta el estudiante.
        .map((l) => ({ texto: modoRol && l.hablante === modoRol ? '' : l.en, perfilId: voces[l.hablante] }))
        .map((l) => ({ ...l, texto: l.texto || ' ' })),
      {
        velocidad: ajustes.velocidad,
        alCambiar: setLineaActiva,
        alTerminar: () => {
          setReproduciendo(false)
          setLineaActiva(-1)
        },
      }
    )
  }

  function terminar() {
    completar(n, 'dialogo')
    registrarActividad({ minutos: 5, xp: 25 })
  }

  return (
    <div className="aparecer">
      <Titulo volver={`/semana/${n}`} sub={dialogo.contexto}>
        {dialogo.titulo}
      </Titulo>

      {/* Reparto */}
      <Tarjeta className="mb-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold texto-suave">
          <Users size={16} /> REPARTO
        </div>
        <div className="flex flex-wrap gap-3">
          {hablantes.map((h) => {
            const perfil = perfilPorId(voces[h])
            return (
              <div key={h} className="flex items-center gap-2 rounded-xl border px-3 py-2">
                <span className="text-lg" aria-hidden>
                  {perfil.bandera}
                </span>
                <div>
                  <p className="text-sm font-medium leading-tight">{h}</p>
                  <p className="text-xs texto-suave">{perfil.acento}</p>
                </div>
              </div>
            )
          })}
        </div>
      </Tarjeta>

      <div className="mb-4 flex flex-wrap gap-2">
        <Boton onClick={reproducirTodo} variante={reproduciendo ? 'secundario' : 'primario'}>
          {reproduciendo ? <Pause size={18} /> : <Play size={18} />}
          {reproduciendo ? 'Detener' : 'Escuchar la conversación'}
        </Boton>
        {hablantes.map((h) => (
          <Boton
            key={h}
            variante={modoRol === h ? 'acento' : 'secundario'}
            tamano="sm"
            onClick={() => setModoRol(modoRol === h ? null : h)}
          >
            <Mic size={15} /> Ser {h}
          </Boton>
        ))}
      </div>

      {modoRol && (
        <Tarjeta className="mb-4 border-amber-300/70 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20">
          <p className="text-sm">
            Estás interpretando a <b>{modoRol}</b>. Sus líneas están tapadas: léelas solo si te
            atascas, y di tu parte en voz alta cuando toque.
          </p>
        </Tarjeta>
      )}

      <Tarjeta className="mb-5" padding={false}>
        <ul>
          {dialogo.lineas.map((l, i) => {
            const perfil = perfilPorId(voces[l.hablante])
            const esMiRol = modoRol === l.hablante
            return (
              <li
                key={i}
                className={cx(
                  'border-b p-3 transition-colors last:border-0',
                  lineaActiva === i && 'bg-blue-50 dark:bg-blue-950/40'
                )}
                style={{ borderColor: 'var(--borde)' }}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span aria-hidden>{perfil.bandera}</span>
                  <span className="text-sm font-semibold">{l.hablante}</span>
                  {esMiRol && <Etiqueta tono="acento">tú</Etiqueta>}
                </div>
                <div className="flex items-start gap-3">
                  <BotonAudio texto={l.en} perfilId={voces[l.hablante]} tamano="sm" conLento />
                  <div className="min-w-0 flex-1">
                    {esMiRol ? <LineaTapada en={l.en} /> : <p className="font-medium">{l.en}</p>}
                    <p className="mt-0.5 text-sm texto-suave">{l.es}</p>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </Tarjeta>

      <PracticaLinea lineas={dialogo.lineas.map((l) => l.en)} />

      <Tarjeta className="mt-5 text-center">
        <p className="mb-3 text-sm texto-suave">
          Escúchalo tres veces: la primera para entender, la segunda leyendo, la tercera repitiendo
          en voz alta al mismo tiempo que el profesor.
        </p>
        <Boton href={`/semana/${n}/pronunciacion`} onClick={terminar} full>
          <Check size={18} /> Terminado, ir a pronunciación
        </Boton>
      </Tarjeta>
    </div>
  )
}

function LineaTapada({ en }: { en: string }) {
  const [visible, setVisible] = useState(false)
  if (visible) return <p className="font-medium">{en}</p>
  return (
    <button
      onClick={() => setVisible(true)}
      className="rounded-lg bg-black/[0.07] px-3 py-1.5 text-sm texto-suave dark:bg-white/[0.1]"
    >
      Te toca hablar — toca para ver la línea
    </button>
  )
}

/** Graba una línea del diálogo y la compara con lo que se debía decir. */
function PracticaLinea({ lineas }: { lineas: string[] }) {
  const { escuchar, escuchando, soportado, error } = useMicrofono()
  const [indice, setIndice] = useState(0)
  const [analisis, setAnalisis] = useState<ReturnType<typeof analizarPronunciacion> | null>(null)
  const { registrarActividad } = useProgreso()

  if (!soportado) return null

  async function grabar() {
    const r = await escuchar()
    if (!r.transcripcion) return
    const a = analizarPronunciacion(lineas[indice], r.transcripcion)
    setAnalisis(a)
    registrarActividad({ xp: a.aprobado ? 10 : 3 })
  }

  return (
    <Tarjeta>
      <h2 className="mb-1 font-bold">Repite una línea</h2>
      <p className="mb-3 text-sm texto-suave">
        Escucha, repite y comprueba si se te entiende. Frase {indice + 1} de {lineas.length}.
      </p>

      <div className="mb-3 flex items-start gap-3 rounded-xl border border-dashed p-3">
        <BotonAudio texto={lineas[indice]} conLento />
        <p className="flex-1 font-medium">{lineas[indice]}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Boton onClick={grabar} disabled={escuchando} variante="acento">
          <Mic size={17} /> {escuchando ? 'Escuchando...' : 'Grabar mi voz'}
        </Boton>
        <Boton
          variante="secundario"
          onClick={() => {
            setAnalisis(null)
            setIndice((i) => (i + 1) % lineas.length)
          }}
        >
          Siguiente frase
        </Boton>
      </div>

      {error && <p className="mt-2 text-sm text-red-700 dark:text-red-400">{error}</p>}

      {analisis && (
        <div className="aparecer mt-3 rounded-xl border p-3">
          <p className="font-semibold">Se entendió el {analisis.puntaje}%</p>
          <p className="mt-1 text-sm">{analisis.comentario}</p>
          <p className="mt-1 text-sm texto-suave italic">Oí: "{analisis.transcripcion}"</p>
        </div>
      )}
    </Tarjeta>
  )
}
