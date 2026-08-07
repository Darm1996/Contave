'use client'
// Fiados: lo que se llevaron y todavía no pagan (la hoja "CXC").

import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '@/lib/store'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatoUSD } from '@/lib/restaurante/calculos'
import { Banknote, Loader2, Plus } from 'lucide-react'
import { Cargando, Cifra, Encabezado, Pastilla, SinDatos, TarjetaSuave, fechaLegible, hoyISO } from './ui'

interface Cuenta {
  id: string; fecha: string; cliente: string; concepto: string | null
  montoUSD: number; montoCobrado: number; estado: string; saldo: number
}
interface Fondo { id: string; nombre: string; moneda: string }

export function RestaurantePorCobrar() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [fondos, setFondos] = useState<Fondo[]>([])
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [verTodas, setVerTodas] = useState(false)
  const [abierto, setAbierto] = useState(false)

  const [form, setForm] = useState({ fecha: hoyISO(), cliente: '', concepto: '', montoUSD: '' })
  const [cobrando, setCobrando] = useState<Cuenta | null>(null)
  const [formCobro, setFormCobro] = useState({ fecha: hoyISO(), monto: '', fondoId: '', tasa: '' })

  const cargar = useCallback(async () => {
    setCargando(true)
    const [c, f] = await Promise.all([
      apiFetch<{ cuentas: Cuenta[]; total: number }>(`/api/restaurante/cobrar?estado=${verTodas ? 'TODAS' : 'ABIERTAS'}`),
      apiFetch<{ fondos: Fondo[] }>('/api/restaurante/fondos'),
    ])
    if (c.ok && c.data) { setCuentas(c.data.cuentas); setTotal(c.data.total) }
    if (f.ok && f.data) setFondos(f.data.fondos)
    setCargando(false)
  }, [verTodas])

  useEffect(() => { cargar() }, [cargar])

  async function crear() {
    if (!form.cliente) { toast.error('Escribe a quién se le fió'); return }
    if (!form.montoUSD) { toast.error('Escribe el monto'); return }
    setGuardando(true)
    const r = await apiFetch('/api/restaurante/cobrar', { method: 'POST', body: JSON.stringify(form) })
    setGuardando(false)
    if (r.ok) {
      toast.success('Fiado registrado')
      setForm({ fecha: hoyISO(), cliente: '', concepto: '', montoUSD: '' })
      setAbierto(false)
      cargar()
    } else toast.error(r.error || 'No se pudo registrar')
  }

  function abrirCobro(c: Cuenta) {
    setCobrando(c)
    setFormCobro({ fecha: hoyISO(), monto: String(c.saldo), fondoId: fondos[0]?.id || '', tasa: '' })
  }

  async function registrarCobro() {
    if (!cobrando) return
    if (!formCobro.monto) { toast.error('Escribe el monto cobrado'); return }
    setGuardando(true)
    const r = await apiFetch('/api/restaurante/cobrar', {
      method: 'PATCH',
      body: JSON.stringify({ id: cobrando.id, ...formCobro }),
    })
    setGuardando(false)
    if (r.ok) { toast.success('Cobro registrado'); setCobrando(null); cargar() }
    else toast.error(r.error || 'No se pudo registrar el cobro')
  }

  const entrada = 'h-9 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-700 dark:text-slate-200'
  const fondoCobro = fondos.find((f) => f.id === formCobro.fondoId)

  return (
    <div className="space-y-5">
      <Encabezado
        titulo="Fiados"
        subtitulo="Lo que se llevaron y quedaron en pagar después."
        icono={<Banknote className="w-5 h-5" />}
        color="amber"
        acciones={
          <Button onClick={() => setAbierto(!abierto)} className="rounded-xl">
            <Plus className="w-4 h-4 mr-1" /> Nuevo fiado
          </Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Cifra etiqueta="Te deben" valor={formatoUSD(total)} color="amber" />
        <Cifra etiqueta="Cuentas abiertas" valor={String(cuentas.filter((c) => c.saldo > 0).length)} color="slate" />
        <TarjetaSuave className="flex items-center">
          <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
            <input type="checkbox" checked={verTodas} onChange={(e) => setVerTodas(e.target.checked)} className="rounded" />
            Ver también las ya cobradas
          </label>
        </TarjetaSuave>
      </div>

      {abierto && (
        <TarjetaSuave className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Registrar un fiado</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs text-slate-500">Fecha</Label>
              <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="rounded-xl mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">¿A quién?</Label>
              <Input placeholder="Nombre" value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} className="rounded-xl mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">¿Qué se llevó?</Label>
              <Input placeholder="Opcional" value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} className="rounded-xl mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Monto en $</Label>
              <Input type="number" inputMode="decimal" step="0.01" placeholder="0.00" value={form.montoUSD} onChange={(e) => setForm({ ...form, montoUSD: e.target.value })} className="rounded-xl mt-1 tabular-nums" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={crear} disabled={guardando} className="rounded-xl">
              {guardando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Guardar
            </Button>
            <Button variant="ghost" onClick={() => setAbierto(false)} className="rounded-xl">Cerrar</Button>
          </div>
        </TarjetaSuave>
      )}

      {cobrando && (
        <TarjetaSuave color="emerald" className="space-y-3 border-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Cobrar a {cobrando.cliente} — saldo {formatoUSD(cobrando.saldo)}
            </h3>
            <button onClick={() => setCobrando(null)} className="text-xs text-slate-500 underline underline-offset-2">Cancelar</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs text-slate-500">Fecha</Label>
              <Input type="date" value={formCobro.fecha} onChange={(e) => setFormCobro({ ...formCobro, fecha: e.target.value })} className="rounded-xl mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Monto en $</Label>
              <Input type="number" inputMode="decimal" step="0.01" value={formCobro.monto} onChange={(e) => setFormCobro({ ...formCobro, monto: e.target.value })} className="rounded-xl mt-1 tabular-nums" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">¿A cuál caja entró?</Label>
              <select className={`${entrada} mt-1`} value={formCobro.fondoId} onChange={(e) => setFormCobro({ ...formCobro, fondoId: e.target.value })}>
                <option value="">No registrar en caja</option>
                {fondos.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </select>
            </div>
            {fondoCobro?.moneda === 'VES' && (
              <div>
                <Label className="text-xs text-slate-500">Tasa</Label>
                <Input type="number" inputMode="decimal" step="0.01" value={formCobro.tasa} onChange={(e) => setFormCobro({ ...formCobro, tasa: e.target.value })} className="rounded-xl mt-1 tabular-nums" />
              </div>
            )}
          </div>
          <Button onClick={registrarCobro} disabled={guardando} className="rounded-xl">
            {guardando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Confirmar cobro
          </Button>
        </TarjetaSuave>
      )}

      <TarjetaSuave className="p-0 overflow-hidden">
        {cargando ? <Cargando /> : cuentas.length === 0 ? (
          <SinDatos mensaje="No hay fiados pendientes" sugerencia="Cuando alguien quede debiendo, anótalo aquí para no perderle el rastro" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/40">
                  <th className="px-4 py-2.5 font-medium">Fecha</th>
                  <th className="px-3 py-2.5 font-medium">Persona</th>
                  <th className="px-3 py-2.5 font-medium text-right">Monto</th>
                  <th className="px-3 py-2.5 font-medium text-right">Abonado</th>
                  <th className="px-3 py-2.5 font-medium text-right">Falta</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {cuentas.map((c) => (
                  <tr key={c.id} className="border-t border-slate-50 dark:border-slate-800/60 hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{fechaLegible(c.fecha)}</td>
                    <td className="px-3 py-2.5">
                      <div className="text-slate-700 dark:text-slate-200">{c.cliente}</div>
                      {c.concepto && <div className="text-[11px] text-slate-400">{c.concepto}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{formatoUSD(c.montoUSD)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-400">{c.montoCobrado ? formatoUSD(c.montoCobrado) : '—'}</td>
                    <td className="px-3 py-2.5 text-right">
                      {c.saldo > 0
                        ? <span className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">{formatoUSD(c.saldo)}</span>
                        : <Pastilla color="emerald">Cobrado</Pastilla>}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {c.saldo > 0 && (
                        <Button size="sm" variant="outline" onClick={() => abrirCobro(c)} className="rounded-lg h-7 text-xs">
                          Cobrar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TarjetaSuave>
    </div>
  )
}
