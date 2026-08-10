'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Mic, RotateCcw, X } from 'lucide-react'
import type { Ejercicio } from '@/lib/tipos'
import { evaluarTexto, mezclar, normalizar } from '@/lib/texto'
import { analizarPronunciacion, useMicrofono } from '@/lib/microfono'
import { useProgreso } from '@/lib/progreso'
import { Barra, Boton, Tarjeta, cx } from './ui'
import { BotonAudio } from './boton-audio'

export interface ResultadoEjercicio {
  id: string
  correcto: boolean
  casi: boolean
}

interface PropsTanda {
  ejercicios: Ejercicio[]
  titulo?: string
  /** Se llama al terminar toda la tanda. */
  alTerminar?: (resultados: ResultadoEjercicio[]) => void
}

export function TandaEjercicios({ ejercicios, alTerminar }: PropsTanda) {
  const [indice, setIndice] = useState(0)
  const [resultados, setResultados] = useState<ResultadoEjercicio[]>([])
  const { registrarActividad, marcarError, limpiarError } = useProgreso()

  const actual = ejercicios[indice]
  const terminado = indice >= ejercicios.length

  function responder(r: ResultadoEjercicio) {
    setResultados((prev) => [...prev, r])
    registrarActividad({ xp: r.correcto ? 10 : 2, correcto: r.correcto })
    if (r.correcto) limpiarError(r.id)
    else marcarError(r.id)
  }

  function siguiente() {
    const nuevo = indice + 1
    setIndice(nuevo)
    if (nuevo >= ejercicios.length) {
      alTerminar?.(resultados)
    }
  }

  useEffect(() => {
    if (terminado) alTerminar?.(resultados)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminado])

  if (!ejercicios.length) {
    return <Tarjeta>No hay ejercicios disponibles todavía.</Tarjeta>
  }

  if (terminado) {
    const aciertos = resultados.filter((r) => r.correcto).length
    const pct = Math.round((aciertos / resultados.length) * 100)
    return (
      <Tarjeta className="aparecer text-center">
        <p className="mb-1 text-5xl">{pct >= 80 ? '🎉' : pct >= 50 ? '👏' : '💪'}</p>
        <h2 className="text-2xl font-bold">
          {aciertos} de {resultados.length}
        </h2>
        <p className="mt-1 texto-suave">
          {pct >= 80
            ? '¡Muy bien! Ya puedes pasar a lo siguiente.'
            : pct >= 50
              ? 'Vas bien. Repite la tanda para afianzar lo que fallaste.'
              : 'Repasa la gramática de la semana y vuelve a intentarlo. Es normal al principio.'}
        </p>
        <Barra className="mt-4" valor={pct} tono={pct >= 80 ? 'exito' : 'acento'} />
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Boton
            variante="secundario"
            onClick={() => {
              setIndice(0)
              setResultados([])
            }}
          >
            <RotateCcw size={16} /> Repetir
          </Boton>
        </div>
      </Tarjeta>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between text-sm texto-suave">
          <span>
            Ejercicio {indice + 1} de {ejercicios.length}
          </span>
          <span>{resultados.filter((r) => r.correcto).length} aciertos</span>
        </div>
        <Barra valor={(indice / ejercicios.length) * 100} />
      </div>

      <Reactivo
        key={actual.id}
        ejercicio={actual}
        onResponder={responder}
        onSiguiente={siguiente}
        ultimo={indice === ejercicios.length - 1}
      />
    </div>
  )
}

/* ─── Un ejercicio suelto ─────────────────────────────────────────── */

interface PropsReactivo {
  ejercicio: Ejercicio
  onResponder: (r: ResultadoEjercicio) => void
  onSiguiente: () => void
  ultimo?: boolean
}

export function Reactivo({ ejercicio, onResponder, onSiguiente, ultimo }: PropsReactivo) {
  const [respondido, setRespondido] = useState(false)
  const [correcto, setCorrecto] = useState(false)
  const [comentario, setComentario] = useState('')

  function resolver(esCorrecto: boolean, casi: boolean, texto: string) {
    if (respondido) return
    setRespondido(true)
    setCorrecto(esCorrecto)
    setComentario(texto)
    onResponder({ id: ejercicio.id, correcto: esCorrecto, casi })
  }

  const comun = { ejercicio, respondido, resolver }

  return (
    <Tarjeta className="aparecer">
      <p className="mb-3 text-sm font-medium texto-suave">{ejercicio.consigna}</p>

      {ejercicio.tipo === 'opcion' && <Opcion {...comun} />}
      {(ejercicio.tipo === 'completar' || ejercicio.tipo === 'traducir') && <Escribir {...comun} />}
      {ejercicio.tipo === 'ordenar' && <Ordenar {...comun} />}
      {ejercicio.tipo === 'escuchar' && <Escuchar {...comun} />}
      {ejercicio.tipo === 'hablar' && <Hablar {...comun} />}
      {ejercicio.tipo === 'emparejar' && <Emparejar {...comun} />}

      {respondido && (
        <div
          className={cx(
            'aparecer mt-4 rounded-xl border p-3',
            correcto
              ? 'border-green-300 bg-green-50 dark:border-green-900 dark:bg-green-950/40'
              : 'border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40'
          )}
        >
          <p className="flex items-center gap-2 font-semibold">
            {correcto ? <Check size={18} /> : <X size={18} />}
            {correcto ? '¡Correcto!' : 'Casi'}
          </p>
          {comentario && <p className="mt-1 text-sm">{comentario}</p>}
          {ejercicio.explicacion && (
            <p className="mt-2 text-sm texto-suave">{ejercicio.explicacion}</p>
          )}
        </div>
      )}

      {respondido && (
        <Boton className="mt-4" full onClick={onSiguiente}>
          {ultimo ? 'Ver resultado' : 'Siguiente'}
        </Boton>
      )}
    </Tarjeta>
  )
}

interface PropsTipo {
  ejercicio: Ejercicio
  respondido: boolean
  resolver: (correcto: boolean, casi: boolean, comentario: string) => void
}

function Opcion({ ejercicio, respondido, resolver }: PropsTipo) {
  const [elegida, setElegida] = useState<string | null>(null)
  const opciones = useMemo(() => ejercicio.opciones ?? [], [ejercicio])

  return (
    <div>
      {ejercicio.texto && (
        <p className="mb-4 text-lg font-medium">{ejercicio.texto}</p>
      )}
      <div className="flex flex-col gap-2">
        {opciones.map((o) => {
          const esCorrecta = o === ejercicio.respuesta
          const elegidaEsta = elegida === o
          return (
            <button
              key={o}
              disabled={respondido}
              onClick={() => {
                setElegida(o)
                resolver(
                  esCorrecta,
                  false,
                  esCorrecta ? '' : `La respuesta correcta es: "${ejercicio.respuesta}".`
                )
              }}
              className={cx(
                'rounded-xl border px-4 py-3 text-left transition-colors',
                !respondido && 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
                respondido && esCorrecta && 'border-green-500 bg-green-50 dark:bg-green-950/50',
                respondido &&
                  elegidaEsta &&
                  !esCorrecta &&
                  'border-red-500 bg-red-50 dark:bg-red-950/50',
                respondido && !esCorrecta && !elegidaEsta && 'opacity-50'
              )}
            >
              {o}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Escribir({ ejercicio, respondido, resolver }: PropsTipo) {
  const [valor, setValor] = useState('')
  const [verPista, setVerPista] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ref.current?.focus()
  }, [])

  function comprobar() {
    if (respondido || !valor.trim()) return
    const v = evaluarTexto(valor, ejercicio.respuesta ?? '', ejercicio.aceptadas)
    resolver(v.correcto, v.casi, v.comentario)
  }

  return (
    <div>
      {ejercicio.texto && <p className="mb-4 text-lg font-medium">{ejercicio.texto}</p>}
      <input
        ref={ref}
        value={valor}
        disabled={respondido}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && comprobar()}
        placeholder="Escribe en inglés..."
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        lang="en"
        className="w-full rounded-xl border superficie px-4 py-3 text-lg"
      />

      {ejercicio.pista && !respondido && (
        <button
          onClick={() => setVerPista(true)}
          className="mt-2 text-sm text-blue-700 hover:underline dark:text-blue-400"
        >
          {verPista ? `💡 ${ejercicio.pista}` : 'Ver pista'}
        </button>
      )}

      {!respondido && (
        <Boton className="mt-3" full onClick={comprobar} disabled={!valor.trim()}>
          Comprobar
        </Boton>
      )}

      {respondido && ejercicio.respuesta && (
        <div className="mt-3 flex items-center gap-2">
          <BotonAudio texto={ejercicio.respuesta} tamano="sm" />
          <span className="text-sm texto-suave">Escucha la respuesta correcta</span>
        </div>
      )}
    </div>
  )
}

function Ordenar({ ejercicio, respondido, resolver }: PropsTipo) {
  // El barajado se hace tras montar: si se hiciera durante el render, el
  // servidor y el navegador generarían órdenes distintas y React se quejaría.
  const [piezasIniciales, setPiezasIniciales] = useState<string[]>(ejercicio.piezas ?? [])
  const [disponibles, setDisponibles] = useState<number[]>(
    (ejercicio.piezas ?? []).map((_, i) => i)
  )
  const [elegidas, setElegidas] = useState<number[]>([])

  useEffect(() => {
    const barajadas = mezclar(ejercicio.piezas ?? [])
    setPiezasIniciales(barajadas)
    setDisponibles(barajadas.map((_, i) => i))
    setElegidas([])
  }, [ejercicio])

  const frase = elegidas.map((i) => piezasIniciales[i]).join(' ')

  function comprobar() {
    if (respondido || !elegidas.length) return
    const v = evaluarTexto(frase, ejercicio.respuesta ?? '', ejercicio.aceptadas)
    resolver(v.correcto, v.casi, v.comentario)
  }

  return (
    <div>
      <div className="mb-3 min-h-[3.5rem] rounded-xl border border-dashed p-3 text-lg">
        {frase || <span className="texto-suave text-base">Toca las palabras en orden...</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        {disponibles.map((i) => (
          <button
            key={i}
            disabled={respondido}
            onClick={() => {
              setElegidas((e) => [...e, i])
              setDisponibles((d) => d.filter((x) => x !== i))
            }}
            className="rounded-lg border superficie px-3 py-2 transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
          >
            {piezasIniciales[i]}
          </button>
        ))}
      </div>

      {!respondido && (
        <div className="mt-4 flex gap-2">
          <Boton
            variante="secundario"
            onClick={() => {
              setElegidas([])
              setDisponibles(piezasIniciales.map((_, i) => i))
            }}
            disabled={!elegidas.length}
          >
            <RotateCcw size={16} /> Reiniciar
          </Boton>
          <Boton full onClick={comprobar} disabled={!elegidas.length}>
            Comprobar
          </Boton>
        </div>
      )}
    </div>
  )
}

function Escuchar({ ejercicio, respondido, resolver }: PropsTipo) {
  const [valor, setValor] = useState('')
  const { ajustes } = useProgreso()
  const texto = ejercicio.respuesta ?? ''

  function comprobar() {
    if (respondido || !valor.trim()) return
    const v = evaluarTexto(valor, texto, ejercicio.aceptadas)
    resolver(v.correcto, v.casi, v.comentario)
  }

  return (
    <div>
      <div className="mb-4 flex flex-col items-center gap-3 rounded-xl border border-dashed p-5">
        <BotonAudio
          texto={texto}
          tamano="lg"
          conLento
          autoReproducir={ajustes.autoAudio}
          etiqueta="Escuchar la frase"
        />
        <p className="text-center text-sm texto-suave">
          Escúchalo las veces que quieras. La tortuga lo repite más despacio.
        </p>
      </div>

      <input
        value={valor}
        disabled={respondido}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && comprobar()}
        placeholder="Escribe lo que oíste..."
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        lang="en"
        className="w-full rounded-xl border superficie px-4 py-3 text-lg"
      />

      {!respondido && (
        <Boton className="mt-3" full onClick={comprobar} disabled={!valor.trim()}>
          Comprobar
        </Boton>
      )}

      {respondido && <p className="mt-3 text-lg font-medium">{texto}</p>}
    </div>
  )
}

function Hablar({ ejercicio, respondido, resolver }: PropsTipo) {
  const { escuchar, escuchando, error, soportado } = useMicrofono()
  const [analisis, setAnalisis] = useState<ReturnType<typeof analizarPronunciacion> | null>(null)
  const texto = ejercicio.texto ?? ejercicio.respuesta ?? ''

  async function grabar() {
    if (respondido) return
    const r = await escuchar()
    if (!r.transcripcion) return
    const a = analizarPronunciacion(texto, r.transcripcion)
    setAnalisis(a)
    resolver(a.aprobado, a.puntaje >= 45 && !a.aprobado, a.comentario)
  }

  return (
    <div>
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-dashed p-4">
        <BotonAudio texto={texto} conLento tamano="md" />
        <p className="flex-1 text-lg font-medium">{texto}</p>
      </div>

      {!soportado ? (
        <div className="rounded-xl border p-3 text-sm texto-suave">
          Tu navegador no permite grabar voz. Puedes practicar igual diciéndolo en voz alta y
          comparándolo con el audio del profesor.
          <Boton className="mt-3" full variante="secundario" onClick={() => resolver(true, false, 'Practicado en voz alta.')}>
            Lo dije en voz alta
          </Boton>
        </div>
      ) : (
        !respondido && (
          <div className="text-center">
            <button
              onClick={grabar}
              disabled={escuchando}
              className={cx(
                'mx-auto flex h-20 w-20 items-center justify-center rounded-full text-white transition-colors',
                escuchando ? 'pulso-mic bg-amber-600' : 'bg-blue-700 hover:bg-blue-800'
              )}
              aria-label="Grabar mi voz"
            >
              <Mic size={30} />
            </button>
            <p className="mt-2 text-sm texto-suave">
              {escuchando ? 'Escuchando... di la frase ahora' : 'Toca y di la frase en voz alta'}
            </p>
            {error && <p className="mt-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
          </div>
        )
      )}

      {analisis && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="texto-suave">Se entendió</span>
            <span className="font-semibold">{analisis.puntaje}%</span>
          </div>
          <Barra
            valor={analisis.puntaje}
            tono={analisis.puntaje >= 70 ? 'exito' : 'acento'}
          />
          <p className="mt-2 text-sm texto-suave">
            El micrófono oyó: <span className="italic">"{analisis.transcripcion}"</span>
          </p>
        </div>
      )}
    </div>
  )
}

function Emparejar({ ejercicio, respondido, resolver }: PropsTipo) {
  const pares = useMemo(() => ejercicio.pares ?? [], [ejercicio])
  // Igual que en "ordenar": se baraja después de montar para que el HTML del
  // servidor coincida con el primer render del navegador.
  const [derecha, setDerecha] = useState<string[]>(pares.map((p) => p.es))
  const [seleccionEn, setSeleccionEn] = useState<string | null>(null)
  const [unidos, setUnidos] = useState<Record<string, string>>({})
  const [fallos, setFallos] = useState(0)

  useEffect(() => {
    setDerecha(mezclar(pares.map((p) => p.es)))
    setUnidos({})
    setSeleccionEn(null)
    setFallos(0)
  }, [pares])

  function intentar(es: string) {
    if (!seleccionEn || respondido) return
    const par = pares.find((p) => p.en === seleccionEn)
    if (par?.es === es) {
      const nuevos = { ...unidos, [seleccionEn]: es }
      setUnidos(nuevos)
      setSeleccionEn(null)
      if (Object.keys(nuevos).length === pares.length) {
        resolver(
          fallos === 0,
          fallos <= 2,
          fallos === 0 ? '' : `Los uniste todos, pero con ${fallos} intentos fallidos.`
        )
      }
    } else {
      setFallos((f) => f + 1)
      setSeleccionEn(null)
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-2">
          {pares.map((p) => {
            const hecho = unidos[p.en]
            return (
              <button
                key={p.en}
                disabled={Boolean(hecho) || respondido}
                onClick={() => setSeleccionEn(p.en)}
                className={cx(
                  'flex items-center justify-between gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors',
                  hecho && 'border-green-500 bg-green-50 opacity-70 dark:bg-green-950/40',
                  seleccionEn === p.en && 'border-blue-600 bg-blue-50 dark:bg-blue-950/50',
                  !hecho && 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                )}
              >
                <span className="min-w-0 truncate font-medium">{p.en}</span>
                <BotonAudio texto={p.en} tamano="sm" />
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-2">
          {derecha.map((es) => {
            const hecho = Object.values(unidos).includes(es)
            return (
              <button
                key={es}
                disabled={hecho || respondido}
                onClick={() => intentar(es)}
                className={cx(
                  'rounded-xl border px-3 py-2.5 text-left transition-colors',
                  hecho && 'border-green-500 bg-green-50 opacity-70 dark:bg-green-950/40',
                  !hecho && 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                )}
              >
                {es}
              </button>
            )
          })}
        </div>
      </div>

      <p className="mt-3 text-center text-sm texto-suave">
        Toca una palabra en inglés y luego su traducción.
        {fallos > 0 && ` · ${fallos} ${fallos === 1 ? 'fallo' : 'fallos'}`}
      </p>
    </div>
  )
}

/** Comprueba si dos textos coinciden, expuesto para otras pantallas. */
export function coincide(a: string, b: string): boolean {
  return normalizar(a) === normalizar(b)
}
