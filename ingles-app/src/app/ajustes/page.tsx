'use client'

import { useState } from 'react'
import { AlertTriangle, Check, Trash2, Volume2 } from 'lucide-react'
import { Boton, Etiqueta, Tarjeta, Titulo, cx } from '@/components/ui'
import { PERFILES, hablar, useVoces } from '@/lib/voz'
import { hayMicrofono } from '@/lib/microfono'
import { calcularRacha, nivelPorXP, useHidratado, useProgreso } from '@/lib/progreso'
import { dominadas } from '@/lib/srs'
import { TOTAL_SEMANAS } from '@/contenido/curriculo'

const DEMO = "Hello! I'm your English teacher. Let's practice together."

export default function Ajustes() {
  const hidratado = useHidratado()
  const { ajustes, setAjustes, nombre, setNombre, xpTotal, dias, tarjetas, escritos, reiniciar } =
    useProgreso()
  const { asignadas, soportado, listo, voces } = useVoces()
  const [confirmando, setConfirmando] = useState(false)

  if (!hidratado) return null

  const nivel = nivelPorXP(xpTotal)
  const diasEstudiados = Object.keys(dias).length
  const minutosTotales = Object.values(dias).reduce((n, d) => n + d.minutos, 0)

  return (
    <div className="aparecer">
      <Titulo sub="La voz del profesor, el ritmo de estudio y tus datos.">Ajustes</Titulo>

      {/* Voz del profesor */}
      <section className="mb-6">
        <h2 className="mb-1 text-lg font-bold">La voz de tu profesor</h2>
        <p className="mb-3 text-sm texto-suave">
          Cada perfil usa una voz distinta de las que tiene instaladas tu dispositivo. Cambiar de
          acento cada cierto tiempo entrena el oído mucho más que quedarse con uno solo.
        </p>

        {!soportado && listo && (
          <Tarjeta className="mb-3 border-amber-300/70 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20">
            <div className="flex gap-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
              <p className="text-sm">
                Este navegador no puede reproducir voz. En Chrome, Edge o Safari sí funciona; en
                Android e iOS también. El resto de la app funciona igual.
              </p>
            </div>
          </Tarjeta>
        )}

        <ul className="flex flex-col gap-2">
          {PERFILES.map((p) => {
            const voz = asignadas[p.id]
            const activo = ajustes.perfilVoz === p.id
            return (
              <li key={p.id}>
                <div
                  className={cx(
                    'flex items-center gap-3 rounded-2xl border p-3 transition-colors superficie',
                    activo && 'border-blue-600 ring-1 ring-blue-600/30'
                  )}
                >
                  <button
                    onClick={() => setAjustes({ perfilVoz: p.id })}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className="text-2xl" aria-hidden>
                      {p.bandera}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 font-semibold">
                        {p.nombre}
                        <Etiqueta tono={activo ? 'marca' : 'neutro'}>{p.acento}</Etiqueta>
                        {activo && <Check size={15} className="text-blue-700 dark:text-blue-400" />}
                      </span>
                      <span className="block text-sm texto-suave">{p.descripcion}</span>
                      {!voz && listo && (
                        <span className="block text-xs text-amber-700 dark:text-amber-400">
                          Tu dispositivo no tiene esta voz: sonará con la más parecida.
                        </span>
                      )}
                    </span>
                  </button>

                  <button
                    onClick={() =>
                      hablar(DEMO, { perfilId: p.id, velocidad: ajustes.velocidad })
                    }
                    aria-label={`Probar la voz de ${p.nombre}`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white hover:bg-blue-800"
                  >
                    <Volume2 size={18} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>

        {listo && voces.length > 0 && (
          <p className="mt-2 text-xs texto-suave">
            Se detectaron {voces.filter((v) => v.lang.toLowerCase().startsWith('en')).length} voces
            en inglés en este dispositivo.
          </p>
        )}
      </section>

      {/* Velocidad */}
      <Tarjeta className="mb-4">
        <label htmlFor="velocidad" className="mb-1 block font-semibold">
          Velocidad del profesor
        </label>
        <p className="mb-3 text-sm texto-suave">
          Empieza en 0.8 y sube a 1.0 cuando lo entiendas sin esfuerzo. En el mes 4 deberías estar
          escuchando a velocidad normal.
        </p>
        <div className="flex items-center gap-3">
          <span className="text-sm texto-suave">Lento</span>
          <input
            id="velocidad"
            type="range"
            min={0.6}
            max={1.3}
            step={0.05}
            value={ajustes.velocidad}
            onChange={(e) => setAjustes({ velocidad: Number(e.target.value) })}
            className="flex-1 accent-blue-700"
          />
          <span className="text-sm texto-suave">Rápido</span>
          <span className="w-12 text-right font-mono text-sm">
            {ajustes.velocidad.toFixed(2)}×
          </span>
        </div>
        <Boton
          className="mt-3"
          variante="secundario"
          tamano="sm"
          onClick={() => hablar(DEMO, { perfilId: ajustes.perfilVoz, velocidad: ajustes.velocidad })}
        >
          <Volume2 size={15} /> Probar
        </Boton>
      </Tarjeta>

      {/* Meta diaria */}
      <Tarjeta className="mb-4">
        <p className="mb-1 font-semibold">Meta diaria</p>
        <p className="mb-3 text-sm texto-suave">
          En 6 meses, 25 minutos diarios son más de 70 horas de estudio. Elige un número que puedas
          cumplir un martes cansado, no uno ideal.
        </p>
        <div className="flex flex-wrap gap-2">
          {[10, 15, 25, 40, 60].map((m) => (
            <button
              key={m}
              onClick={() => setAjustes({ metaDiaria: m })}
              className={cx(
                'rounded-xl border px-4 py-2 font-medium transition-colors',
                ajustes.metaDiaria === m
                  ? 'border-blue-600 bg-blue-700 text-white'
                  : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
              )}
            >
              {m} min
            </button>
          ))}
        </div>
      </Tarjeta>

      {/* Preferencias */}
      <Tarjeta className="mb-4">
        <p className="mb-3 font-semibold">Preferencias de estudio</p>
        <Interruptor
          activo={ajustes.traduccionVisible}
          onChange={(v) => setAjustes({ traduccionVisible: v })}
          titulo="Mostrar la traducción al español"
          descripcion="Desactívalo a partir del mes 3 para forzarte a entender sin apoyarte en el español."
        />
        <Interruptor
          activo={ajustes.autoAudio}
          onChange={(v) => setAjustes({ autoAudio: v })}
          titulo="Reproducir el audio automáticamente"
          descripcion="En los ejercicios de dictado, la frase suena sola al aparecer."
        />
      </Tarjeta>

      {/* Micrófono */}
      <Tarjeta className="mb-4">
        <p className="mb-1 font-semibold">Micrófono</p>
        <p className="text-sm texto-suave">
          {hayMicrofono()
            ? 'Tu navegador permite los ejercicios de pronunciación. La primera vez te pedirá permiso para usar el micrófono.'
            : 'Este navegador no permite reconocimiento de voz. Los ejercicios de hablar te dejarán practicar igual, pero sin corrección automática. Chrome y Edge son los que mejor lo soportan.'}
        </p>
      </Tarjeta>

      {/* Datos */}
      <Tarjeta className="mb-4">
        <p className="mb-3 font-semibold">Tu progreso</p>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Dato etiqueta="Nombre" valor={nombre || '—'} />
          <Dato etiqueta="Nivel" valor={`${nivel.nivel} · ${nivel.titulo}`} />
          <Dato etiqueta="Puntos" valor={xpTotal} />
          <Dato etiqueta="Racha" valor={`${calcularRacha(dias)} días`} />
          <Dato etiqueta="Días estudiados" valor={diasEstudiados} />
          <Dato etiqueta="Minutos totales" valor={minutosTotales} />
          <Dato etiqueta="Palabras en repaso" valor={Object.keys(tarjetas).length} />
          <Dato
            etiqueta="Palabras aprendidas"
            valor={dominadas(Object.values(tarjetas))}
          />
          <Dato etiqueta="Textos escritos" valor={escritos.length} />
          <Dato etiqueta="Semanas del curso" valor={TOTAL_SEMANAS} />
        </dl>

        <div className="mt-4">
          <label htmlFor="nombre" className="mb-1 block text-sm font-medium">
            Cambiar tu nombre
          </label>
          <input
            id="nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-xl border superficie px-3 py-2"
          />
        </div>
      </Tarjeta>

      <Tarjeta className="mb-6">
        <p className="mb-2 font-semibold">Empezar de cero</p>
        <p className="mb-3 text-sm texto-suave">
          Borra tu progreso, tus tarjetas de repaso y tus textos. Tu nombre se conserva. Esto no se
          puede deshacer.
        </p>
        {confirmando ? (
          <div className="flex flex-wrap gap-2">
            <Boton
              variante="peligro"
              onClick={() => {
                reiniciar()
                setConfirmando(false)
              }}
            >
              <Trash2 size={16} /> Sí, borrar todo
            </Boton>
            <Boton variante="secundario" onClick={() => setConfirmando(false)}>
              Cancelar
            </Boton>
          </div>
        ) : (
          <Boton variante="secundario" onClick={() => setConfirmando(true)}>
            <Trash2 size={16} /> Reiniciar mi progreso
          </Boton>
        )}
      </Tarjeta>

      <p className="text-center text-xs texto-suave">
        Todo se guarda en este navegador. Si borras los datos del sitio o usas otro dispositivo,
        empezarás de cero.
      </p>
    </div>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | number }) {
  return (
    <div>
      <dt className="texto-suave">{etiqueta}</dt>
      <dd className="font-semibold">{valor}</dd>
    </div>
  )
}

function Interruptor({
  activo,
  onChange,
  titulo,
  descripcion,
}: {
  activo: boolean
  onChange: (v: boolean) => void
  titulo: string
  descripcion: string
}) {
  return (
    <button
      onClick={() => onChange(!activo)}
      role="switch"
      aria-checked={activo}
      className="flex w-full items-start gap-3 py-2 text-left"
    >
      <span
        className={cx(
          'mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors',
          activo ? 'bg-blue-700' : 'bg-black/20 dark:bg-white/20'
        )}
      >
        <span
          className={cx(
            'h-5 w-5 rounded-full bg-white transition-transform',
            activo && 'translate-x-5'
          )}
        />
      </span>
      <span className="flex-1">
        <span className="block font-medium">{titulo}</span>
        <span className="block text-sm texto-suave">{descripcion}</span>
      </span>
    </button>
  )
}
