'use client'
// Gastos del día.
//
// El monto se puede escribir en dólares o en bolívares indistintamente: con
// la tasa del día el sistema completa el otro, que es exactamente lo que
// hoy hacen a mano con la calculadora antes de anotar en el Excel.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/store'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { bsAUsd, formatoBs, formatoUSD, redondear, usdABs } from '@/lib/restaurante/calculos'
import { CATEGORIAS_GASTO, etiquetaCategoria, colorCategoria } from '@/lib/restaurante/categorias'
import { Loader2, Receipt, Trash2, Plus } from 'lucide-react'
import { Cargando, Encabezado, Pastilla, SelectorMes, SinDatos, TarjetaSuave, fechaLegible, hoyISO } from './ui'

interface Gasto {
  id: string
  fecha: string
  descripcion: string
  categoria: string
  montoUSD: number
  montoVES: number
  tasa: number
  referencia: string | null
  fondo: { nombre: string; moneda: string }
  proveedor: { nombre: string } | null
}

interface Fondo { id: string; nombre: string; moneda: string; color: string }
interface Proveedor { id: string; nombre: string }

export function RestauranteGastos() {
  const hoy = new Date()
  const [ano, setAno] = useState(hoy.getUTCFullYear())
  const [mes, setMes] = useState(hoy.getUTCMonth() + 1)
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [fondos, setFondos] = useState<Fondo[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [filtro, setFiltro] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [abierto, setAbierto] = useState(false)

  const [form, setForm] = useState({
    fecha: hoyISO(),
    descripcion: '',
    categoria: 'COMPRAS',
    fondoId: '',
    montoUSD: '',
    montoVES: '',
    tasa: '',
    referencia: '',
    proveedorId: '',
  })

  const cargar = useCallback(async () => {
    setCargando(true)
    const [g, f, p] = await Promise.all([
      apiFetch<{ gastos: Gasto[]; total: number }>(`/api/restaurante/gastos?ano=${ano}&mes=${mes}`),
      apiFetch<{ fondos: Fondo[] }>('/api/restaurante/fondos'),
      apiFetch<{ proveedores: Proveedor[] }>('/api/restaurante/proveedores'),
    ])
    if (g.ok && g.data) setGastos(g.data.gastos)
    if (f.ok && f.data) {
      setFondos(f.data.fondos)
      setForm((prev) => (prev.fondoId ? prev : { ...prev, fondoId: f.data!.fondos[0]?.id || '' }))
    }
    if (p.ok && p.data) setProveedores(p.data.proveedores)
    setCargando(false)
  }, [ano, mes])

  useEffect(() => { cargar() }, [cargar])

  const fondoElegido = fondos.find((f) => f.id === form.fondoId)

  // Al escribir en una moneda se muestra el equivalente en la otra, para que
  // la persona vea de una vez lo que va a quedar registrado.
  const equivalencia = useMemo(() => {
    const tasa = Number(form.tasa) || 0
    if (tasa <= 0) return null
    if (form.montoUSD) return `≈ ${formatoBs(usdABs(Number(form.montoUSD), tasa))}`
    if (form.montoVES) return `≈ ${formatoUSD(bsAUsd(Number(form.montoVES), tasa))}`
    return null
  }, [form.montoUSD, form.montoVES, form.tasa])

  async function guardar() {
    if (!form.descripcion) { toast.error('Escribe en qué se gastó'); return }
    if (!form.fondoId) { toast.error('Indica de cuál caja salió el dinero'); return }
    if (!form.montoUSD && !form.montoVES) { toast.error('Escribe el monto'); return }

    setGuardando(true)
    const r = await apiFetch('/api/restaurante/gastos', {
      method: 'POST',
      body: JSON.stringify({
        ...form,
        montoUSD: form.montoUSD || undefined,
        montoVES: form.montoVES || undefined,
        proveedorId: form.proveedorId || undefined,
      }),
    })
    setGuardando(false)
    if (r.ok) {
      toast.success('Gasto registrado')
      setForm((f) => ({ ...f, descripcion: '', montoUSD: '', montoVES: '', referencia: '', proveedorId: '' }))
      cargar()
    } else {
      toast.error(r.error || 'No se pudo registrar el gasto')
    }
  }

  async function borrar(g: Gasto) {
    if (!confirm(`¿Borrar el gasto "${g.descripcion}"? El monto volverá al saldo de ${g.fondo.nombre}.`)) return
    const r = await apiFetch(`/api/restaurante/gastos/${g.id}`, { method: 'DELETE' })
    if (r.ok) { toast.success('Gasto borrado'); cargar() }
    else toast.error(r.error || 'No se pudo borrar')
  }

  const visibles = filtro
    ? gastos.filter((g) =>
        g.descripcion.toLowerCase().includes(filtro.toLowerCase()) ||
        etiquetaCategoria(g.categoria).toLowerCase().includes(filtro.toLowerCase()))
    : gastos
  const total = redondear(visibles.reduce((a, g) => a + g.montoUSD, 0))

  const entrada = 'h-9 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-700 dark:text-slate-200'

  return (
    <div className="space-y-5">
      <Encabezado
        titulo="Gastos"
        subtitulo="Todo lo que sale de las cajas: compras del día, servicios, pagos sueltos."
        icono={<Receipt className="w-5 h-5" />}
        color="rose"
        acciones={
          <>
            <SelectorMes ano={ano} mes={mes} onChange={(a, m) => { setAno(a); setMes(m) }} />
            <Button onClick={() => setAbierto(!abierto)} className="rounded-xl">
              <Plus className="w-4 h-4 mr-1" /> Nuevo gasto
            </Button>
          </>
        }
      />

      {abierto && (
        <TarjetaSuave className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Registrar un gasto</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-slate-500">Fecha</Label>
              <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="rounded-xl mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs text-slate-500">¿En qué se gastó?</Label>
              <Input
                placeholder="Ej: verduras del mercado, bombona de gas"
                value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                className="rounded-xl mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-slate-500">Tipo de gasto</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {CATEGORIAS_GASTO.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setForm({ ...form, categoria: c.key })}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    form.categoria === c.key
                      ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              {CATEGORIAS_GASTO.find((c) => c.key === form.categoria)?.ayuda}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs text-slate-500">¿De cuál caja salió?</Label>
              <select className={`${entrada} mt-1`} value={form.fondoId} onChange={(e) => setForm({ ...form, fondoId: e.target.value })}>
                {fondos.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Monto en $</Label>
              <Input
                type="number" inputMode="decimal" step="0.01" placeholder="0.00" value={form.montoUSD}
                onChange={(e) => setForm({ ...form, montoUSD: e.target.value, montoVES: '' })}
                className="rounded-xl mt-1 tabular-nums"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500">…o monto en Bs.</Label>
              <Input
                type="number" inputMode="decimal" step="0.01" placeholder="0.00" value={form.montoVES}
                onChange={(e) => setForm({ ...form, montoVES: e.target.value, montoUSD: '' })}
                className="rounded-xl mt-1 tabular-nums"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Tasa del día</Label>
              <Input
                type="number" inputMode="decimal" step="0.01" placeholder="0.00" value={form.tasa}
                onChange={(e) => setForm({ ...form, tasa: e.target.value })}
                className="rounded-xl mt-1 tabular-nums"
              />
            </div>
          </div>
          {equivalencia && <p className="text-xs text-slate-500">{equivalencia}</p>}
          {fondoElegido?.moneda === 'VES' && !form.tasa && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Esa caja es en bolívares: agrega la tasa para que quede bien convertido.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500">Referencia (opcional)</Label>
              <Input placeholder="N° de transferencia o factura" value={form.referencia} onChange={(e) => setForm({ ...form, referencia: e.target.value })} className="rounded-xl mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Proveedor (opcional)</Label>
              <select className={`${entrada} mt-1`} value={form.proveedorId} onChange={(e) => setForm({ ...form, proveedorId: e.target.value })}>
                <option value="">Sin proveedor</option>
                {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={guardar} disabled={guardando} className="rounded-xl">
              {guardando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Guardar gasto
            </Button>
            <Button variant="ghost" onClick={() => setAbierto(false)} className="rounded-xl">Cerrar</Button>
          </div>
        </TarjetaSuave>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Buscar un gasto…" value={filtro} onChange={(e) => setFiltro(e.target.value)}
          className="rounded-xl max-w-xs"
        />
        <Pastilla color="rose">Total mostrado: {formatoUSD(total)}</Pastilla>
      </div>

      <TarjetaSuave className="p-0 overflow-hidden">
        {cargando ? <Cargando /> : visibles.length === 0 ? (
          <SinDatos
            mensaje={filtro ? 'Ningún gasto coincide con la búsqueda' : 'No hay gastos registrados este mes'}
            sugerencia={filtro ? undefined : 'Usa “Nuevo gasto” para anotar el primero'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/40">
                  <th className="px-4 py-2.5 font-medium">Fecha</th>
                  <th className="px-3 py-2.5 font-medium">Concepto</th>
                  <th className="px-3 py-2.5 font-medium">Tipo</th>
                  <th className="px-3 py-2.5 font-medium">Caja</th>
                  <th className="px-3 py-2.5 font-medium text-right">Monto</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {visibles.map((g) => (
                  <tr key={g.id} className="border-t border-slate-50 dark:border-slate-800/60 hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{fechaLegible(g.fecha)}</td>
                    <td className="px-3 py-2.5">
                      <div className="text-slate-700 dark:text-slate-200">{g.descripcion}</div>
                      {(g.proveedor || g.referencia) && (
                        <div className="text-[11px] text-slate-400">
                          {g.proveedor?.nombre}{g.proveedor && g.referencia ? ' · ' : ''}{g.referencia}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <Pastilla color={colorCategoria(g.categoria)}>{etiquetaCategoria(g.categoria)}</Pastilla>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{g.fondo.nombre}</td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="font-medium tabular-nums text-rose-600 dark:text-rose-400">{formatoUSD(g.montoUSD)}</div>
                      {g.montoVES > 0 && <div className="text-[11px] text-slate-400 tabular-nums">{formatoBs(g.montoVES)}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button onClick={() => borrar(g)} title="Borrar" className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
