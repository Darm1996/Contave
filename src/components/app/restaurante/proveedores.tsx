'use client'
// Proveedores y lo que se les debe.
//
// Reemplaza las hojas "CXP" y "PAGO PROVEEDORES": se anota la nota que dejó
// el proveedor (en dólares) y luego el pago (normalmente en bolívares, con
// su referencia y su tasa). Pagar una nota deja hecho todo de una vez: el
// abono, el egreso de la caja y el gasto del mes.

import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '@/lib/store'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { bsAUsd, formatoBs, formatoUSD } from '@/lib/restaurante/calculos'
import { CATEGORIAS_PROVEEDOR } from '@/lib/restaurante/categorias'
import { HandCoins, Loader2, Plus, Truck, Check } from 'lucide-react'
import { Cargando, Cifra, Encabezado, Pastilla, SinDatos, TarjetaSuave, fechaLegible, hoyISO } from './ui'

interface ProveedorFila {
  id: string; nombre: string; categoria: string; telefono: string | null
  deuda: number; notasPendientes: number
}
interface PagoNota {
  id: string; fecha: string; montoUSD: number; montoVES: number
  tasa: number; referencia: string | null; fondo: { nombre: string }
}
interface Nota {
  id: string; fecha: string; numeroNota: string | null; montoUSD: number
  montoPagado: number; estado: string; descripcion: string | null
  saldo: number; dias: number
  proveedor: { nombre: string }
  pagos: PagoNota[]
}
interface Fondo { id: string; nombre: string; moneda: string }

export function RestauranteProveedores() {
  const [proveedores, setProveedores] = useState<ProveedorFila[]>([])
  const [notas, setNotas] = useState<Nota[]>([])
  const [fondos, setFondos] = useState<Fondo[]>([])
  const [totalDeuda, setTotalDeuda] = useState(0)
  const [antiguedad, setAntiguedad] = useState<Record<string, number>>({})
  const [cargando, setCargando] = useState(true)
  const [verPagadas, setVerPagadas] = useState(false)

  const [formNota, setFormNota] = useState({ proveedorId: '', fecha: hoyISO(), numeroNota: '', montoUSD: '', descripcion: '' })
  const [abriendoNota, setAbriendoNota] = useState(false)
  const [formProveedor, setFormProveedor] = useState({ nombre: '', categoria: 'INSUMOS', telefono: '' })
  const [abriendoProveedor, setAbriendoProveedor] = useState(false)
  const [pagando, setPagando] = useState<Nota | null>(null)
  const [formPago, setFormPago] = useState({ fecha: hoyISO(), fondoId: '', montoUSD: '', montoVES: '', tasa: '', referencia: '' })
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    const [p, n, f] = await Promise.all([
      apiFetch<{ proveedores: ProveedorFila[] }>('/api/restaurante/proveedores'),
      apiFetch<{ notas: Nota[]; total: number; antiguedad: Record<string, number> }>(
        `/api/restaurante/notas?estado=${verPagadas ? 'TODAS' : 'ABIERTAS'}`,
      ),
      apiFetch<{ fondos: Fondo[] }>('/api/restaurante/fondos'),
    ])
    if (p.ok && p.data) setProveedores(p.data.proveedores)
    if (n.ok && n.data) {
      setNotas(n.data.notas)
      setTotalDeuda(n.data.total)
      setAntiguedad(n.data.antiguedad)
    }
    if (f.ok && f.data) setFondos(f.data.fondos)
    setCargando(false)
  }, [verPagadas])

  useEffect(() => { cargar() }, [cargar])

  async function crearProveedor() {
    if (!formProveedor.nombre) { toast.error('Escribe el nombre del proveedor'); return }
    setGuardando(true)
    const r = await apiFetch('/api/restaurante/proveedores', { method: 'POST', body: JSON.stringify(formProveedor) })
    setGuardando(false)
    if (r.ok) {
      toast.success('Proveedor agregado')
      setFormProveedor({ nombre: '', categoria: 'INSUMOS', telefono: '' })
      setAbriendoProveedor(false)
      cargar()
    } else toast.error(r.error || 'No se pudo agregar')
  }

  async function crearNota() {
    if (!formNota.proveedorId) { toast.error('Elige el proveedor'); return }
    if (!formNota.montoUSD) { toast.error('Escribe el monto de la nota'); return }
    setGuardando(true)
    const r = await apiFetch('/api/restaurante/notas', { method: 'POST', body: JSON.stringify(formNota) })
    setGuardando(false)
    if (r.ok) {
      toast.success('Nota registrada')
      setFormNota({ proveedorId: '', fecha: hoyISO(), numeroNota: '', montoUSD: '', descripcion: '' })
      setAbriendoNota(false)
      cargar()
    } else toast.error(r.error || 'No se pudo registrar la nota')
  }

  function abrirPago(nota: Nota) {
    setPagando(nota)
    setFormPago({
      fecha: hoyISO(),
      fondoId: fondos[0]?.id || '',
      // Se propone pagar el saldo completo, que es lo más común.
      montoUSD: String(nota.saldo),
      montoVES: '',
      tasa: '',
      referencia: '',
    })
  }

  async function registrarPago() {
    if (!pagando) return
    if (!formPago.fondoId) { toast.error('Indica de cuál caja sale el pago'); return }
    if (!formPago.montoUSD && !formPago.montoVES) { toast.error('Escribe el monto del pago'); return }
    setGuardando(true)
    const r = await apiFetch(`/api/restaurante/notas/${pagando.id}/pagos`, {
      method: 'POST',
      body: JSON.stringify({
        ...formPago,
        montoUSD: formPago.montoUSD || undefined,
        montoVES: formPago.montoVES || undefined,
      }),
    })
    setGuardando(false)
    if (r.ok) {
      toast.success('Pago registrado')
      setPagando(null)
      cargar()
    } else toast.error(r.error || 'No se pudo registrar el pago')
  }

  const entrada = 'h-9 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-700 dark:text-slate-200'

  const equivalenciaPago = (() => {
    const tasa = Number(formPago.tasa) || 0
    if (tasa > 0 && formPago.montoVES) return `≈ ${formatoUSD(bsAUsd(Number(formPago.montoVES), tasa))}`
    return null
  })()

  return (
    <div className="space-y-5">
      <Encabezado
        titulo="Proveedores"
        subtitulo="Las notas que te dejan por pagar y los pagos que vas haciendo."
        icono={<Truck className="w-5 h-5" />}
        color="amber"
        acciones={
          <>
            <Button variant="outline" onClick={() => setAbriendoProveedor(!abriendoProveedor)} className="rounded-xl">
              <Plus className="w-4 h-4 mr-1" /> Proveedor
            </Button>
            <Button onClick={() => setAbriendoNota(!abriendoNota)} className="rounded-xl">
              <Plus className="w-4 h-4 mr-1" /> Nota por pagar
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Cifra etiqueta="Total que debes" valor={formatoUSD(totalDeuda)} color="rose" icono={<HandCoins className="w-4 h-4" />} detalle={`${notas.filter((n) => n.saldo > 0).length} nota(s)`} />
        {Object.entries(antiguedad).map(([tramo, monto]) => (
          <Cifra
            key={tramo} etiqueta={`${tramo} días`} valor={formatoUSD(monto)}
            color={tramo === '+30' ? 'rose' : tramo === '16-30' ? 'amber' : 'slate'}
          />
        ))}
      </div>

      {abriendoProveedor && (
        <TarjetaSuave className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Nuevo proveedor</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-slate-500">Nombre</Label>
              <Input value={formProveedor.nombre} onChange={(e) => setFormProveedor({ ...formProveedor, nombre: e.target.value })} className="rounded-xl mt-1" placeholder="Ej: Santiago Verduras" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Qué te vende</Label>
              <select className={`${entrada} mt-1`} value={formProveedor.categoria} onChange={(e) => setFormProveedor({ ...formProveedor, categoria: e.target.value })}>
                {CATEGORIAS_PROVEEDOR.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Teléfono (opcional)</Label>
              <Input value={formProveedor.telefono} onChange={(e) => setFormProveedor({ ...formProveedor, telefono: e.target.value })} className="rounded-xl mt-1" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={crearProveedor} disabled={guardando} className="rounded-xl">
              {guardando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Agregar
            </Button>
            <Button variant="ghost" onClick={() => setAbriendoProveedor(false)} className="rounded-xl">Cerrar</Button>
          </div>
        </TarjetaSuave>
      )}

      {abriendoNota && (
        <TarjetaSuave className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Nota que quedó por pagar</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs text-slate-500">Proveedor</Label>
              <select className={`${entrada} mt-1`} value={formNota.proveedorId} onChange={(e) => setFormNota({ ...formNota, proveedorId: e.target.value })}>
                <option value="">Elegir…</option>
                {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Fecha de la nota</Label>
              <Input type="date" value={formNota.fecha} onChange={(e) => setFormNota({ ...formNota, fecha: e.target.value })} className="rounded-xl mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Monto en $</Label>
              <Input type="number" inputMode="decimal" step="0.01" placeholder="0.00" value={formNota.montoUSD} onChange={(e) => setFormNota({ ...formNota, montoUSD: e.target.value })} className="rounded-xl mt-1 tabular-nums" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">N° de nota (opcional)</Label>
              <Input value={formNota.numeroNota} onChange={(e) => setFormNota({ ...formNota, numeroNota: e.target.value })} className="rounded-xl mt-1" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={crearNota} disabled={guardando} className="rounded-xl">
              {guardando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Guardar nota
            </Button>
            <Button variant="ghost" onClick={() => setAbriendoNota(false)} className="rounded-xl">Cerrar</Button>
          </div>
        </TarjetaSuave>
      )}

      {/* Ventana de pago */}
      {pagando && (
        <TarjetaSuave color="emerald" className="space-y-3 border-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Pagar a {pagando.proveedor.nombre} — saldo {formatoUSD(pagando.saldo)}
            </h3>
            <button onClick={() => setPagando(null)} className="text-xs text-slate-500 underline underline-offset-2">Cancelar</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <Label className="text-xs text-slate-500">Fecha del pago</Label>
              <Input type="date" value={formPago.fecha} onChange={(e) => setFormPago({ ...formPago, fecha: e.target.value })} className="rounded-xl mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Desde cuál caja</Label>
              <select className={`${entrada} mt-1`} value={formPago.fondoId} onChange={(e) => setFormPago({ ...formPago, fondoId: e.target.value })}>
                {fondos.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Monto en $</Label>
              <Input type="number" inputMode="decimal" step="0.01" value={formPago.montoUSD} onChange={(e) => setFormPago({ ...formPago, montoUSD: e.target.value, montoVES: '' })} className="rounded-xl mt-1 tabular-nums" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">…o en Bs.</Label>
              <Input type="number" inputMode="decimal" step="0.01" value={formPago.montoVES} onChange={(e) => setFormPago({ ...formPago, montoVES: e.target.value, montoUSD: '' })} className="rounded-xl mt-1 tabular-nums" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Tasa</Label>
              <Input type="number" inputMode="decimal" step="0.01" value={formPago.tasa} onChange={(e) => setFormPago({ ...formPago, tasa: e.target.value })} className="rounded-xl mt-1 tabular-nums" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Referencia</Label>
              <Input placeholder="N° o EFECTIVO" value={formPago.referencia} onChange={(e) => setFormPago({ ...formPago, referencia: e.target.value })} className="rounded-xl mt-1" />
            </div>
          </div>
          {equivalenciaPago && <p className="text-xs text-slate-500">{equivalenciaPago}</p>}
          <Button onClick={registrarPago} disabled={guardando} className="rounded-xl">
            {guardando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            <Check className="w-4 h-4 mr-1" /> Confirmar pago
          </Button>
        </TarjetaSuave>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TarjetaSuave className="p-0 overflow-hidden lg:col-span-2">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Notas por pagar</h3>
            <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
              <input type="checkbox" checked={verPagadas} onChange={(e) => setVerPagadas(e.target.checked)} className="rounded" />
              Ver también las pagadas
            </label>
          </div>
          {cargando ? <Cargando /> : notas.length === 0 ? (
            <SinDatos mensaje="No hay notas por pagar" sugerencia="Cuando un proveedor deje una nota, regístrala aquí" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/40">
                    <th className="px-4 py-2.5 font-medium">Fecha</th>
                    <th className="px-3 py-2.5 font-medium">Proveedor</th>
                    <th className="px-3 py-2.5 font-medium text-right">Nota</th>
                    <th className="px-3 py-2.5 font-medium text-right">Abonado</th>
                    <th className="px-3 py-2.5 font-medium text-right">Falta</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {notas.map((n) => (
                    <tr key={n.id} className="border-t border-slate-50 dark:border-slate-800/60 hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="text-slate-500 dark:text-slate-400">{fechaLegible(n.fecha)}</div>
                        {n.saldo > 0 && (
                          <div className={`text-[11px] ${n.dias > 30 ? 'text-rose-500' : 'text-slate-400'}`}>
                            hace {n.dias} día(s)
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-slate-700 dark:text-slate-200">{n.proveedor.nombre}</div>
                        {n.numeroNota && <div className="text-[11px] text-slate-400">N° {n.numeroNota}</div>}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{formatoUSD(n.montoUSD)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-400">{n.montoPagado ? formatoUSD(n.montoPagado) : '—'}</td>
                      <td className="px-3 py-2.5 text-right">
                        {n.saldo > 0
                          ? <span className="font-semibold tabular-nums text-rose-600 dark:text-rose-400">{formatoUSD(n.saldo)}</span>
                          : <Pastilla color="emerald">Pagada</Pastilla>}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {n.saldo > 0 && (
                          <Button size="sm" variant="outline" onClick={() => abrirPago(n)} className="rounded-lg h-7 text-xs">
                            Pagar
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

        <TarjetaSuave className="p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Tus proveedores</h3>
          </div>
          {proveedores.length === 0 ? (
            <SinDatos mensaje="Aún no tienes proveedores" sugerencia="Agrégalos con el botón de arriba" />
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-800/60 max-h-[420px] overflow-y-auto">
              {proveedores.map((p) => (
                <div key={p.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm text-slate-700 dark:text-slate-200 truncate">{p.nombre}</div>
                    <div className="text-[11px] text-slate-400">
                      {CATEGORIAS_PROVEEDOR.find((c) => c.key === p.categoria)?.label || p.categoria}
                    </div>
                  </div>
                  {p.deuda > 0
                    ? <span className="text-sm font-medium tabular-nums text-rose-600 dark:text-rose-400 shrink-0">{formatoUSD(p.deuda)}</span>
                    : <span className="text-xs text-slate-300 dark:text-slate-600 shrink-0">al día</span>}
                </div>
              ))}
            </div>
          )}
        </TarjetaSuave>
      </div>

      {pagando && pagando.pagos.length > 0 && (
        <TarjetaSuave>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Pagos ya hechos a esta nota</h3>
          <div className="space-y-1.5 text-xs">
            {pagando.pagos.map((p) => (
              <div key={p.id} className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>{fechaLegible(p.fecha)} · {p.fondo.nombre} {p.referencia ? `· ${p.referencia}` : ''}</span>
                <span className="tabular-nums">
                  {formatoUSD(p.montoUSD)}{p.montoVES > 0 ? ` (${formatoBs(p.montoVES)})` : ''}
                </span>
              </div>
            ))}
          </div>
        </TarjetaSuave>
      )}
    </div>
  )
}
