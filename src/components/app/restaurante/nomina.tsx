'use client'
// Nómina semanal.
//
// La semana se abre precargada: cada persona con su base y su parte de las
// propinas de los cierres de esos siete días. Solo queda escribir transporte,
// delivery y descuentos. Al marcarla como pagada se descuenta de la caja y
// queda registrada como gasto del mes, sin cargarla dos veces.

import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '@/lib/store'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { calcularNetoLinea, formatoUSD } from '@/lib/restaurante/calculos'
import { CalendarRange, Loader2, RotateCcw, Users, Wallet } from 'lucide-react'
import { Cargando, Cifra, Encabezado, Pastilla, SinDatos, TarjetaSuave, fechaLegible, hoyISO } from './ui'

interface Linea {
  id: string; personalId: string
  base: number; propina: number; transporte: number; delivery: number; descuento: number; neto: number
  personal: { nombre: string; cargo: string | null }
}
interface Semana {
  id: string; fechaInicio: string; fechaFin: string; estado: string; fechaPago: string | null
  totalBase: number; totalPropina: number; totalTransporte: number
  totalDelivery: number; totalDescuento: number; totalNeto: number
  lineas: Linea[]
  fondo: { nombre: string } | null
}
interface Fondo { id: string; nombre: string }

export function RestauranteNomina() {
  const [semanas, setSemanas] = useState<Semana[]>([])
  const [fondos, setFondos] = useState<Fondo[]>([])
  const [cargando, setCargando] = useState(true)
  const [trabajando, setTrabajando] = useState(false)
  const [expandida, setExpandida] = useState<string | null>(null)
  const [borrador, setBorrador] = useState<Record<string, Partial<Linea>>>({})
  const [fechaNueva, setFechaNueva] = useState(hoyISO())
  const [pagoFondo, setPagoFondo] = useState('')
  const [pagoTasa, setPagoTasa] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    const [s, f] = await Promise.all([
      apiFetch<{ semanas: Semana[] }>('/api/restaurante/nomina'),
      apiFetch<{ fondos: Fondo[] }>('/api/restaurante/fondos'),
    ])
    if (s.ok && s.data) setSemanas(s.data.semanas)
    if (f.ok && f.data) {
      setFondos(f.data.fondos)
      setPagoFondo((prev) => prev || f.data!.fondos[0]?.id || '')
    }
    setCargando(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function abrirSemana() {
    setTrabajando(true)
    const r = await apiFetch<{ semana: Semana }>('/api/restaurante/nomina', {
      method: 'POST',
      body: JSON.stringify({ fecha: fechaNueva }),
    })
    setTrabajando(false)
    if (r.ok && r.data) {
      toast.success('Semana lista con las propinas ya repartidas')
      setExpandida(r.data.semana.id)
      cargar()
    } else toast.error(r.error || 'No se pudo abrir la semana')
  }

  function editarCelda(linea: Linea, campo: keyof Linea, valor: string) {
    setBorrador((b) => ({
      ...b,
      [linea.id]: { ...b[linea.id], [campo]: valor === '' ? 0 : Number(valor) },
    }))
  }

  function valorCelda(linea: Linea, campo: 'base' | 'propina' | 'transporte' | 'delivery' | 'descuento'): number {
    const cambio = borrador[linea.id]?.[campo]
    return cambio === undefined ? linea[campo] : (cambio as number)
  }

  function netoVisible(linea: Linea): number {
    return calcularNetoLinea({
      base: valorCelda(linea, 'base'),
      propina: valorCelda(linea, 'propina'),
      transporte: valorCelda(linea, 'transporte'),
      delivery: valorCelda(linea, 'delivery'),
      descuento: valorCelda(linea, 'descuento'),
    })
  }

  async function guardarCambios(semana: Semana) {
    const cambios = semana.lineas
      .filter((l) => borrador[l.id])
      .map((l) => ({ id: l.id, ...borrador[l.id] }))
    if (!cambios.length) { toast.info('No hay cambios que guardar'); return }

    setTrabajando(true)
    const r = await apiFetch(`/api/restaurante/nomina/${semana.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ lineas: cambios }),
    })
    setTrabajando(false)
    if (r.ok) { toast.success('Nómina actualizada'); setBorrador({}); cargar() }
    else toast.error(r.error || 'No se pudo guardar')
  }

  async function pagar(semana: Semana) {
    if (!pagoFondo) { toast.error('Elige de cuál caja sale el pago'); return }
    if (!confirm(`¿Marcar como pagada la semana del ${fechaLegible(semana.fechaInicio)}? Se descontarán ${formatoUSD(semana.totalNeto)} de la caja.`)) return

    setTrabajando(true)
    const r = await apiFetch(`/api/restaurante/nomina/${semana.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ accion: 'PAGAR', fondoId: pagoFondo, tasa: pagoTasa || 0 }),
    })
    setTrabajando(false)
    if (r.ok) { toast.success('Nómina pagada'); cargar() }
    else toast.error(r.error || 'No se pudo pagar')
  }

  async function revertir(semana: Semana) {
    if (!confirm('¿Deshacer el pago de esta semana? Se quitará el gasto y el dinero volverá a la caja.')) return
    setTrabajando(true)
    const r = await apiFetch(`/api/restaurante/nomina/${semana.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ accion: 'REVERTIR' }),
    })
    setTrabajando(false)
    if (r.ok) { toast.success('Pago revertido'); cargar() }
    else toast.error(r.error || 'No se pudo revertir')
  }

  const entrada = 'h-9 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-700 dark:text-slate-200'
  const pendiente = semanas.filter((s) => s.estado === 'BORRADOR')
  const totalPendiente = pendiente.reduce((a, s) => a + s.totalNeto, 0)

  return (
    <div className="space-y-5">
      <Encabezado
        titulo="Nómina semanal"
        subtitulo="Base más propinas repartidas, transporte y delivery. La semana se abre ya calculada."
        icono={<Users className="w-5 h-5" />}
        color="violet"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Cifra etiqueta="Semanas sin pagar" valor={String(pendiente.length)} color="amber" icono={<CalendarRange className="w-4 h-4" />} />
        <Cifra etiqueta="Pendiente de pago" valor={formatoUSD(totalPendiente)} color="rose" icono={<Wallet className="w-4 h-4" />} />
        <TarjetaSuave className="flex flex-col justify-center gap-2">
          <Label className="text-xs text-slate-500">Abrir la semana de…</Label>
          <div className="flex gap-2">
            <Input type="date" value={fechaNueva} onChange={(e) => setFechaNueva(e.target.value)} className="rounded-xl" />
            <Button onClick={abrirSemana} disabled={trabajando} className="rounded-xl shrink-0">
              {trabajando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Abrir
            </Button>
          </div>
        </TarjetaSuave>
      </div>

      {cargando ? <Cargando /> : semanas.length === 0 ? (
        <TarjetaSuave>
          <SinDatos
            mensaje="Todavía no has abierto ninguna semana de nómina"
            sugerencia="Elige una fecha arriba y pulsa Abrir: el sistema trae a todo tu equipo con su base y las propinas de esa semana"
          />
        </TarjetaSuave>
      ) : (
        <div className="space-y-3">
          {semanas.map((s) => {
            const abierta = expandida === s.id
            const pagada = s.estado === 'PAGADA'
            return (
              <TarjetaSuave key={s.id} className="p-0 overflow-hidden">
                <button
                  onClick={() => setExpandida(abierta ? null : s.id)}
                  className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                >
                  <div>
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Semana del {fechaLegible(s.fechaInicio)} al {fechaLegible(s.fechaFin)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {s.lineas.length} persona(s) · base {formatoUSD(s.totalBase)} · propinas {formatoUSD(s.totalPropina)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-base font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                      {formatoUSD(s.totalNeto)}
                    </span>
                    <Pastilla color={pagada ? 'emerald' : 'amber'}>{pagada ? 'Pagada' : 'Por pagar'}</Pastilla>
                  </div>
                </button>

                {abierta && (
                  <div className="border-t border-slate-100 dark:border-slate-800">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[720px] text-sm">
                        <thead>
                          <tr className="text-left text-xs text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/40">
                            <th className="px-4 py-2.5 font-medium">Persona</th>
                            <th className="px-2 py-2.5 font-medium text-right">Base</th>
                            <th className="px-2 py-2.5 font-medium text-right">Propina</th>
                            <th className="px-2 py-2.5 font-medium text-right">Transporte</th>
                            <th className="px-2 py-2.5 font-medium text-right">Delivery</th>
                            <th className="px-2 py-2.5 font-medium text-right">Descuento</th>
                            <th className="px-3 py-2.5 font-medium text-right">A pagar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.lineas.map((l) => (
                            <tr key={l.id} className="border-t border-slate-50 dark:border-slate-800/60">
                              <td className="px-4 py-2">
                                <div className="text-slate-700 dark:text-slate-200">{l.personal.nombre}</div>
                                {l.personal.cargo && <div className="text-[11px] text-slate-400">{l.personal.cargo}</div>}
                              </td>
                              {(['base', 'propina', 'transporte', 'delivery', 'descuento'] as const).map((campo) => (
                                <td key={campo} className="px-2 py-2">
                                  <input
                                    type="number" inputMode="decimal" step="0.01" disabled={pagada}
                                    value={valorCelda(l, campo) || ''}
                                    placeholder="0"
                                    onChange={(e) => editarCelda(l, campo, e.target.value)}
                                    className="w-full h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-right text-sm tabular-nums text-slate-700 dark:text-slate-200 disabled:opacity-60"
                                  />
                                </td>
                              ))}
                              <td className="px-3 py-2 text-right font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                                {formatoUSD(netoVisible(l))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-xs">
                            <td className="px-4 py-2.5 font-medium text-slate-500">Totales</td>
                            <td className="px-2 py-2.5 text-right tabular-nums text-slate-500">{formatoUSD(s.totalBase)}</td>
                            <td className="px-2 py-2.5 text-right tabular-nums text-slate-500">{formatoUSD(s.totalPropina)}</td>
                            <td className="px-2 py-2.5 text-right tabular-nums text-slate-500">{formatoUSD(s.totalTransporte)}</td>
                            <td className="px-2 py-2.5 text-right tabular-nums text-slate-500">{formatoUSD(s.totalDelivery)}</td>
                            <td className="px-2 py-2.5 text-right tabular-nums text-slate-500">{formatoUSD(s.totalDescuento)}</td>
                            <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                              {formatoUSD(s.totalNeto)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    <div className="px-4 py-3 flex flex-wrap items-end gap-3 border-t border-slate-100 dark:border-slate-800">
                      {pagada ? (
                        <>
                          <p className="text-xs text-slate-500 flex-1">
                            Pagada el {s.fechaPago ? fechaLegible(s.fechaPago) : '—'}
                            {s.fondo ? ` desde ${s.fondo.nombre}` : ''}
                          </p>
                          <Button variant="outline" onClick={() => revertir(s)} disabled={trabajando} className="rounded-xl">
                            <RotateCcw className="w-4 h-4 mr-1" /> Deshacer pago
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button onClick={() => guardarCambios(s)} disabled={trabajando} variant="outline" className="rounded-xl">
                            {trabajando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Guardar cambios
                          </Button>
                          <div className="flex-1 min-w-[140px]">
                            <Label className="text-xs text-slate-500">Pagar desde</Label>
                            <select className={`${entrada} mt-1`} value={pagoFondo} onChange={(e) => setPagoFondo(e.target.value)}>
                              {fondos.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                            </select>
                          </div>
                          <div className="w-28">
                            <Label className="text-xs text-slate-500">Tasa</Label>
                            <Input type="number" inputMode="decimal" step="0.01" value={pagoTasa} onChange={(e) => setPagoTasa(e.target.value)} className="rounded-xl mt-1 tabular-nums" />
                          </div>
                          <Button onClick={() => pagar(s)} disabled={trabajando} className="rounded-xl">
                            Marcar como pagada
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </TarjetaSuave>
            )
          })}
        </div>
      )}
    </div>
  )
}
