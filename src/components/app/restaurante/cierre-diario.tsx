'use client'
// Cierre del día: la pantalla que se usa todos los días al cerrar el local.
//
// Se escribe cuánto entró por cada medio de pago y el total en dólares se
// calcula solo con la tasa del día — que además viene precargada con la del
// último cierre, porque casi siempre es la misma o parecida. Guardar el
// mismo día otra vez lo corrige en lugar de duplicarlo.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/store'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { calcularTotalDia, formatoBs, formatoUSD, ticketPromedio } from '@/lib/restaurante/calculos'
import {
  Bike, CalendarDays, CircleDollarSign, Loader2, Pencil, Smartphone,
  Store, Trash2, CreditCard, Coins,
} from 'lucide-react'
import { Cargando, Encabezado, SelectorMes, SinDatos, TarjetaSuave, fechaLegible, hoyISO, tono, valorInputFecha } from './ui'
import { cn } from '@/lib/utils'

interface Cierre {
  id: string
  fecha: string
  tasa: number
  ventaZelle: number
  ventaEfectivoUSD: number
  ventaBs: number
  ventaPuntoVenta: number
  numVentas: number
  numDelivery: number
  numVentaDirecta: number
  propinas: number
  totalUSD: number
  nota: string | null
}

const FORM_VACIO = {
  fecha: hoyISO(),
  tasa: '',
  ventaZelle: '',
  ventaEfectivoUSD: '',
  ventaBs: '',
  ventaPuntoVenta: '',
  numVentas: '',
  numDelivery: '',
  numVentaDirecta: '',
  propinas: '',
  nota: '',
}

type Formulario = typeof FORM_VACIO

export function CierreDiario() {
  const hoy = new Date()
  const [ano, setAno] = useState(hoy.getUTCFullYear())
  const [mes, setMes] = useState(hoy.getUTCMonth() + 1)
  const [cierres, setCierres] = useState<Cierre[]>([])
  const [ultimaTasa, setUltimaTasa] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState<Formulario>(FORM_VACIO)
  const [editandoId, setEditandoId] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    const r = await apiFetch<{ cierres: Cierre[]; ultimaTasa: number }>(
      `/api/restaurante/cierres?ano=${ano}&mes=${mes}`,
    )
    if (r.ok && r.data) {
      setCierres(r.data.cierres)
      setUltimaTasa(r.data.ultimaTasa)
    }
    setCargando(false)
  }, [ano, mes])

  useEffect(() => { cargar() }, [cargar])

  // La tasa del último cierre se ofrece como sugerencia mientras el usuario
  // no haya escrito una, para ahorrarle el paso más repetitivo del día.
  const tasaEfectiva = Number(form.tasa) || ultimaTasa

  const desglose = useMemo(() => calcularTotalDia({
    ventaZelle: Number(form.ventaZelle) || 0,
    ventaEfectivoUSD: Number(form.ventaEfectivoUSD) || 0,
    ventaBs: Number(form.ventaBs) || 0,
    ventaPuntoVenta: Number(form.ventaPuntoVenta) || 0,
    tasa: tasaEfectiva,
  }), [form, tasaEfectiva])

  const ticket = ticketPromedio(desglose.totalUSD, Number(form.numVentas) || 0)

  function actualizar(campo: keyof Formulario, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }))
  }

  function limpiar() {
    setForm({ ...FORM_VACIO, fecha: hoyISO() })
    setEditandoId(null)
  }

  function editar(c: Cierre) {
    setEditandoId(c.id)
    setForm({
      fecha: valorInputFecha(c.fecha),
      tasa: String(c.tasa || ''),
      ventaZelle: c.ventaZelle ? String(c.ventaZelle) : '',
      ventaEfectivoUSD: c.ventaEfectivoUSD ? String(c.ventaEfectivoUSD) : '',
      ventaBs: c.ventaBs ? String(c.ventaBs) : '',
      ventaPuntoVenta: c.ventaPuntoVenta ? String(c.ventaPuntoVenta) : '',
      numVentas: c.numVentas ? String(c.numVentas) : '',
      numDelivery: c.numDelivery ? String(c.numDelivery) : '',
      numVentaDirecta: c.numVentaDirecta ? String(c.numVentaDirecta) : '',
      propinas: c.propinas ? String(c.propinas) : '',
      nota: c.nota || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function guardar() {
    if (!form.fecha) { toast.error('Elige la fecha del día'); return }
    setGuardando(true)
    const r = await apiFetch('/api/restaurante/cierres', {
      method: 'POST',
      body: JSON.stringify({
        fecha: form.fecha,
        tasa: tasaEfectiva,
        ventaZelle: form.ventaZelle,
        ventaEfectivoUSD: form.ventaEfectivoUSD,
        ventaBs: form.ventaBs,
        ventaPuntoVenta: form.ventaPuntoVenta,
        numVentas: form.numVentas,
        numDelivery: form.numDelivery,
        numVentaDirecta: form.numVentaDirecta,
        propinas: form.propinas,
        nota: form.nota,
      }),
    })
    setGuardando(false)
    if (r.ok) {
      toast.success(editandoId ? 'Día actualizado' : 'Día guardado')
      limpiar()
      cargar()
    } else {
      toast.error(r.error || 'No se pudo guardar el día')
    }
  }

  async function borrar(c: Cierre) {
    if (!confirm(`¿Borrar el cierre del ${fechaLegible(c.fecha)}? También se quitará de los saldos de las cajas.`)) return
    const r = await apiFetch(`/api/restaurante/cierres/${c.id}`, { method: 'DELETE' })
    if (r.ok) { toast.success('Cierre borrado'); cargar() }
    else toast.error(r.error || 'No se pudo borrar')
  }

  const totalMes = cierres.reduce((a, c) => a + (c.totalUSD || 0), 0)
  const ventasMes = cierres.reduce((a, c) => a + (c.numVentas || 0), 0)

  return (
    <div className="space-y-5">
      <Encabezado
        titulo="Cierre del día"
        subtitulo="Anota lo que se vendió hoy por cada medio de pago. El total en dólares se calcula solo."
        icono={<CalendarDays className="w-5 h-5" />}
        color="emerald"
        acciones={<SelectorMes ano={ano} mes={mes} onChange={(a, m) => { setAno(a); setMes(m) }} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TarjetaSuave className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {editandoId ? 'Corrigiendo un día ya registrado' : 'Registrar el día'}
            </h3>
            {editandoId && (
              <button onClick={limpiar} className="text-xs text-slate-500 underline underline-offset-2">
                Cancelar y empezar de nuevo
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Campo etiqueta="Fecha">
              <Input type="date" value={form.fecha} onChange={(e) => actualizar('fecha', e.target.value)} className="rounded-xl" />
            </Campo>
            <Campo etiqueta="Tasa del día (Bs. por $)" ayuda={ultimaTasa > 0 && !form.tasa ? `Usando la última: ${ultimaTasa.toFixed(2)}` : undefined}>
              <Input
                type="number" inputMode="decimal" step="0.01" placeholder={ultimaTasa > 0 ? ultimaTasa.toFixed(2) : '0.00'}
                value={form.tasa} onChange={(e) => actualizar('tasa', e.target.value)} className="rounded-xl"
              />
            </Campo>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">¿Cómo pagaron?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CampoMonto
                etiqueta="Zelle" moneda="$" color="violet" icono={<Smartphone className="w-4 h-4" />}
                valor={form.ventaZelle} onChange={(v) => actualizar('ventaZelle', v)}
              />
              <CampoMonto
                etiqueta="Efectivo en dólares" moneda="$" color="emerald" icono={<CircleDollarSign className="w-4 h-4" />}
                valor={form.ventaEfectivoUSD} onChange={(v) => actualizar('ventaEfectivoUSD', v)}
              />
              <CampoMonto
                etiqueta="Transferencias en Bs." moneda="Bs" color="sky" icono={<Coins className="w-4 h-4" />}
                valor={form.ventaBs} onChange={(v) => actualizar('ventaBs', v)}
              />
              <CampoMonto
                etiqueta="Punto de venta" moneda="Bs" color="rose" icono={<CreditCard className="w-4 h-4" />}
                valor={form.ventaPuntoVenta} onChange={(v) => actualizar('ventaPuntoVenta', v)}
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Del día</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Campo etiqueta="N° de ventas">
                <Input type="number" inputMode="numeric" placeholder="0" value={form.numVentas} onChange={(e) => actualizar('numVentas', e.target.value)} className="rounded-xl" />
              </Campo>
              <Campo etiqueta="Deliverys">
                <Input type="number" inputMode="numeric" placeholder="0" value={form.numDelivery} onChange={(e) => actualizar('numDelivery', e.target.value)} className="rounded-xl" />
              </Campo>
              <Campo etiqueta="Venta directa">
                <Input type="number" inputMode="numeric" placeholder="0" value={form.numVentaDirecta} onChange={(e) => actualizar('numVentaDirecta', e.target.value)} className="rounded-xl" />
              </Campo>
              <Campo etiqueta="Propinas ($)">
                <Input type="number" inputMode="decimal" step="0.01" placeholder="0.00" value={form.propinas} onChange={(e) => actualizar('propinas', e.target.value)} className="rounded-xl" />
              </Campo>
            </div>
          </div>

          <Campo etiqueta="Nota del día (opcional)" ayuda="Por ejemplo: feriado, no se trabajó, se fue la luz">
            <Input placeholder="Escribe algo si pasó algo fuera de lo normal" value={form.nota} onChange={(e) => actualizar('nota', e.target.value)} className="rounded-xl" />
          </Campo>

          <div className="flex gap-2 pt-1">
            <Button onClick={guardar} disabled={guardando} className="rounded-xl">
              {guardando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {editandoId ? 'Guardar corrección' : 'Guardar el día'}
            </Button>
            {(form.ventaZelle || form.ventaBs || form.ventaEfectivoUSD || form.ventaPuntoVenta) && (
              <Button variant="ghost" onClick={limpiar} className="rounded-xl">Limpiar</Button>
            )}
          </div>
        </TarjetaSuave>

        {/* Resumen en vivo del día que se está escribiendo */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/40 p-5">
            <p className="text-[11px] uppercase tracking-wide font-medium text-emerald-700/70 dark:text-emerald-300/70">
              Total del día
            </p>
            <p className="text-4xl font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums mt-1">
              {formatoUSD(desglose.totalUSD)}
            </p>
            {tasaEfectiva > 0 && (
              <p className="text-xs text-emerald-700/70 dark:text-emerald-300/70 mt-1">
                {formatoBs(desglose.totalVES)} a la tasa de {tasaEfectiva.toFixed(2)}
              </p>
            )}
            <div className="mt-4 space-y-1.5 text-xs">
              <FilaResumen etiqueta="Cobrado en dólares" valor={formatoUSD(desglose.enDolares)} />
              <FilaResumen etiqueta="Cobrado en bolívares" valor={formatoBs(desglose.enBolivares)} />
              <FilaResumen etiqueta="Eso en dólares" valor={formatoUSD(desglose.bolivaresEnUSD)} />
              {ticket > 0 && <FilaResumen etiqueta="Ticket promedio" valor={formatoUSD(ticket)} />}
            </div>
          </div>

          <TarjetaSuave>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Este mes</h3>
            <div className="space-y-1.5 text-sm">
              <FilaResumen etiqueta="Días registrados" valor={String(cierres.length)} />
              <FilaResumen etiqueta="Vendido" valor={formatoUSD(totalMes)} />
              <FilaResumen etiqueta="N° de ventas" valor={String(ventasMes)} />
            </div>
          </TarjetaSuave>
        </div>
      </div>

      <TarjetaSuave className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Días registrados</h3>
        </div>
        {cargando ? <Cargando /> : cierres.length === 0 ? (
          <SinDatos mensaje="Todavía no has registrado ningún día de este mes" sugerencia="Llena el formulario de arriba y guarda tu primer día" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/40">
                  <th className="px-4 py-2.5 font-medium">Día</th>
                  <th className="px-3 py-2.5 font-medium text-right">Zelle</th>
                  <th className="px-3 py-2.5 font-medium text-right">Efectivo $</th>
                  <th className="px-3 py-2.5 font-medium text-right">Bolívares</th>
                  <th className="px-3 py-2.5 font-medium text-right">Ventas</th>
                  <th className="px-3 py-2.5 font-medium text-right">Total</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {cierres.map((c) => (
                  <tr key={c.id} className="border-t border-slate-50 dark:border-slate-800/60 hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-2.5">
                      <div className="text-slate-700 dark:text-slate-200">{fechaLegible(c.fecha)}</div>
                      {c.nota && <div className="text-[11px] text-slate-400">{c.nota}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-500 dark:text-slate-400">
                      {c.ventaZelle ? formatoUSD(c.ventaZelle) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-500 dark:text-slate-400">
                      {c.ventaEfectivoUSD ? formatoUSD(c.ventaEfectivoUSD) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-500 dark:text-slate-400">
                      {c.ventaBs + c.ventaPuntoVenta ? formatoBs(c.ventaBs + c.ventaPuntoVenta) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Store className="w-3 h-3" />{c.numVentas}
                        {c.numDelivery > 0 && (<><Bike className="w-3 h-3 ml-1.5" />{c.numDelivery}</>)}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatoUSD(c.totalUSD)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => editar(c)} title="Corregir" className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/50">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => borrar(c)} title="Borrar" className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                  <td className="px-4 py-2.5 text-xs font-medium text-slate-500" colSpan={4}>
                    Total de {cierres.length} día(s)
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs text-slate-500 tabular-nums">{ventasMes}</td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                    {formatoUSD(totalMes)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </TarjetaSuave>
    </div>
  )
}

function Campo({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-slate-500 dark:text-slate-400">{etiqueta}</Label>
      <div className="mt-1">{children}</div>
      {ayuda && <p className="text-[11px] text-slate-400 mt-1">{ayuda}</p>}
    </div>
  )
}

function CampoMonto({
  etiqueta, moneda, color, icono, valor, onChange,
}: {
  etiqueta: string; moneda: string; color: string
  icono: React.ReactNode; valor: string; onChange: (v: string) => void
}) {
  const t = tono(color)
  return (
    <div className={cn('rounded-xl border p-3', t.suave, t.borde)}>
      <div className={cn('flex items-center gap-1.5 text-xs font-medium mb-1.5', t.texto)}>
        {icono}{etiqueta}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-sm text-slate-400 w-6 shrink-0">{moneda}</span>
        <Input
          type="number" inputMode="decimal" step="0.01" placeholder="0.00"
          value={valor} onChange={(e) => onChange(e.target.value)}
          className="rounded-lg border-0 bg-white/70 dark:bg-slate-900/50 h-9 text-base tabular-nums"
        />
      </div>
    </div>
  )
}

function FilaResumen({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500 dark:text-slate-400">{etiqueta}</span>
      <span className="font-medium text-slate-700 dark:text-slate-200 tabular-nums">{valor}</span>
    </div>
  )
}
