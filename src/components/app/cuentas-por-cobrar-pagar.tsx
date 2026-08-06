'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { TableScrollHint } from '@/components/ui/table-scroll-hint'
import { formatBs } from '@/lib/contabilidad/ven-nif'
import { apiFetch, useApp } from '@/lib/store'
import { exportarExcelCliente } from '@/lib/exports/cliente'
import { toast } from 'sonner'
import { Wallet, Landmark, Download, Loader2, CircleDollarSign } from 'lucide-react'

interface Partida {
  id: string
  tipo: string
  nombreContraparte: string
  rifContraparte: string
  numeroFactura: string | null
  ncf: string | null
  fechaEmision: string
  fechaVencimiento: string
  deuda: number
  montoPagado: number
  saldo: number
  estadoPago: string
  diasVencido: number
}
interface Antiguedad { corriente: number; d1_30: number; d31_60: number; d61_90: number; d90mas: number; total: number }
interface Cuenta { id: string; codigo: string; nombre: string; uso: string | null }

const METODOS = ['TRANSFERENCIA', 'EFECTIVO', 'PAGO_MOVIL', 'ZELLE', 'TARJETA', 'CHEQUE', 'OTRO']

function badgeVencido(dias: number) {
  if (dias <= 0) return <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:border-emerald-700">Al día</Badge>
  if (dias <= 30) return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 dark:border-amber-700">{dias}d vencido</Badge>
  return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 dark:border-red-700">{dias}d vencido</Badge>
}

function CuentasPorCobrarPagar({ tipo }: { tipo: 'VENTA' | 'COMPRA' }) {
  const { user, empresaActiva } = useApp()
  const puedeRegistrarPago = empresaActiva?.rol === 'ADMIN' || empresaActiva?.rol === 'CONTADOR' || user?.role === 'SUPER_ADMIN'
  const [partidas, setPartidas] = useState<Partida[]>([])
  const [antiguedad, setAntiguedad] = useState<Antiguedad | null>(null)
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [loading, setLoading] = useState(true)
  const [pagando, setPagando] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({ monto: '', fecha: new Date().toISOString().slice(0, 10), metodoPago: 'TRANSFERENCIA', referencia: '', cuentaId: '', generarAsiento: true })

  const endpoint = tipo === 'VENTA' ? '/api/cuentas-por-cobrar' : '/api/cuentas-por-pagar'
  const titulo = tipo === 'VENTA' ? 'Cuentas por Cobrar' : 'Cuentas por Pagar'
  const sujeto = tipo === 'VENTA' ? 'Cliente' : 'Proveedor'

  async function cargar() {
    setLoading(true)
    const [rP, rC] = await Promise.all([apiFetch(endpoint), apiFetch('/api/cuentas')])
    if (rP.ok) { setPartidas(rP.data.partidas); setAntiguedad(rP.data.antiguedad) }
    if (rC.ok) setCuentas(rC.data.cuentas.filter((c: Cuenta) => c.uso === 'BANCOS_BS' || c.uso === 'BANCOS_USD' || c.uso === 'CAJA' || c.uso === 'CAJA_CHICA'))
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  const partidaPagando = partidas.find((p) => p.id === pagando) || null

  function abrirPago(p: Partida) {
    setPagando(p.id)
    setForm({ monto: String(p.saldo), fecha: new Date().toISOString().slice(0, 10), metodoPago: 'TRANSFERENCIA', referencia: '', cuentaId: cuentas[0]?.id || '', generarAsiento: true })
  }

  async function confirmarPago(facturaId: string) {
    const monto = Number(form.monto)
    if (!monto || monto <= 0) { toast.error('Ingresa un monto válido'); return }
    if (form.generarAsiento && !form.cuentaId) { toast.error('Selecciona la cuenta de banco/caja'); return }
    setGuardando(true)
    const r = await apiFetch('/api/pagos', {
      method: 'POST',
      body: JSON.stringify({
        facturaId, monto, fecha: form.fecha, metodoPago: form.metodoPago,
        referencia: form.referencia || undefined,
        cuentaId: form.generarAsiento ? form.cuentaId : undefined,
        generarAsiento: form.generarAsiento,
      }),
    })
    setGuardando(false)
    if (r.ok) {
      toast.success(tipo === 'VENTA' ? 'Cobro registrado' : 'Pago registrado')
      setPagando(null)
      cargar()
    } else {
      toast.error(r.error || 'Error al registrar el pago')
    }
  }

  function exportar() {
    exportarExcelCliente(`${titulo.replace(/ /g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`, [{
      nombre: titulo,
      columnas: [
        { header: sujeto, key: 'nombreContraparte', width: 28 },
        { header: 'RIF', key: 'rifContraparte', width: 14 },
        { header: 'Factura', key: 'numeroFactura', width: 14 },
        { header: 'Fecha emisión', key: 'fechaEmision', width: 14 },
        { header: 'Fecha vencimiento', key: 'fechaVencimiento', width: 16 },
        { header: 'Días vencido', key: 'diasVencido', width: 12 },
        { header: 'Deuda total', key: 'deuda', width: 14 },
        { header: 'Pagado', key: 'montoPagado', width: 14 },
        { header: 'Saldo', key: 'saldo', width: 14 },
        { header: 'Estado', key: 'estadoPago', width: 12 },
      ],
      filas: partidas.map((p) => ({
        ...p,
        fechaEmision: new Date(p.fechaEmision).toLocaleDateString('es-VE'),
        fechaVencimiento: new Date(p.fechaVencimiento).toLocaleDateString('es-VE'),
      })),
    }])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            {tipo === 'VENTA' ? <Wallet className="w-6 h-6 text-cyan-600" /> : <Landmark className="w-6 h-6 text-cyan-600" />}
            {titulo}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Antigüedad de saldos y registro de {tipo === 'VENTA' ? 'cobros' : 'pagos'}</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportar}><Download className="w-4 h-4 mr-1" /> Exportar Excel</Button>
      </div>

      {antiguedad && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Card><CardContent className="pt-4"><div className="text-xs text-slate-500 dark:text-slate-400">Al día</div><div className="text-lg font-bold text-emerald-600">{formatBs(antiguedad.corriente)}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-slate-500 dark:text-slate-400">1-30 días</div><div className="text-lg font-bold text-amber-600">{formatBs(antiguedad.d1_30)}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-slate-500 dark:text-slate-400">31-60 días</div><div className="text-lg font-bold text-orange-600">{formatBs(antiguedad.d31_60)}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-slate-500 dark:text-slate-400">61-90 días</div><div className="text-lg font-bold text-red-500">{formatBs(antiguedad.d61_90)}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-slate-500 dark:text-slate-400">+90 días</div><div className="text-lg font-bold text-red-700">{formatBs(antiguedad.d90mas)}</div></CardContent></Card>
        </div>
      )}
      {antiguedad && (
        <Card className="border-cyan-300 dark:border-cyan-800">
          <CardContent className="pt-4 flex items-center gap-2">
            <CircleDollarSign className="w-5 h-5 text-cyan-600" />
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Total pendiente</div>
              <div className="text-xl font-bold">{formatBs(antiguedad.total)}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {partidaPagando && (
        <Card className="border-cyan-300 dark:border-cyan-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {tipo === 'VENTA' ? 'Registrar cobro' : 'Registrar pago'} — {partidaPagando.nombreContraparte}
            </CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">Saldo pendiente: {formatBs(partidaPagando.saldo)}</p>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <div><Label>Monto (Bs.)</Label><Input type="number" step="0.01" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} /></div>
            <div><Label>Fecha</Label><Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></div>
            <div>
              <Label>Método</Label>
              <select className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={form.metodoPago} onChange={(e) => setForm({ ...form, metodoPago: e.target.value })}>
                {METODOS.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div><Label>Referencia</Label><Input value={form.referencia} onChange={(e) => setForm({ ...form, referencia: e.target.value })} placeholder="Nº operación" /></div>
            <div className="col-span-2 md:col-span-4 flex items-center gap-2 flex-wrap">
              <label className="flex items-center gap-1 text-sm whitespace-nowrap">
                <input type="checkbox" checked={form.generarAsiento} onChange={(e) => setForm({ ...form, generarAsiento: e.target.checked })} />
                Generar asiento contable
              </label>
              {form.generarAsiento && (
                <select className="flex-1 min-w-[200px] h-9 px-3 rounded-md border border-input bg-background text-sm" value={form.cuentaId} onChange={(e) => setForm({ ...form, cuentaId: e.target.value })}>
                  <option value="">Cuenta banco/caja...</option>
                  {cuentas.map((c) => <option key={c.id} value={c.id}>{c.codigo} {c.nombre}</option>)}
                </select>
              )}
            </div>
            <div className="col-span-2 md:col-span-4 flex gap-2">
              <Button onClick={() => confirmarPago(partidaPagando.id)} disabled={guardando}>{guardando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Confirmar</Button>
              <Button variant="outline" onClick={() => setPagando(null)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <TableScrollHint />
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full min-w-[900px] text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr className="text-left">
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">{sujeto}</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Factura</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Vencimiento</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Estado</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Deuda</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Pagado</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Saldo</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-6 text-slate-400 dark:text-slate-500">Cargando...</td></tr>
              ) : partidas.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-6 text-slate-400 dark:text-slate-500">No hay partidas pendientes</td></tr>
              ) : partidas.map((p) => (
                <tr key={p.id} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="px-2 py-2 text-slate-700 dark:text-slate-300">{p.nombreContraparte}<div className="text-[10px] text-slate-400">{p.rifContraparte}</div></td>
                  <td className="px-2 py-2 font-mono text-slate-700 dark:text-slate-300">{p.numeroFactura || p.ncf || '—'}</td>
                  <td className="px-2 py-2 text-slate-700 dark:text-slate-300">{new Date(p.fechaVencimiento).toLocaleDateString('es-VE')}</td>
                  <td className="px-2 py-2">{badgeVencido(p.diasVencido)}</td>
                  <td className="px-2 py-2 text-right font-mono">{formatBs(p.deuda)}</td>
                  <td className="px-2 py-2 text-right font-mono">{formatBs(p.montoPagado)}</td>
                  <td className="px-2 py-2 text-right font-mono font-semibold">{formatBs(p.saldo)}</td>
                  <td className="px-2 py-2 text-center">
                    {puedeRegistrarPago && (
                      <Button size="sm" variant={pagando === p.id ? 'secondary' : 'outline'} className="h-7 text-xs" onClick={() => pagando === p.id ? setPagando(null) : abrirPago(p)}>
                        {tipo === 'VENTA' ? 'Registrar cobro' : 'Registrar pago'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

export function CuentasPorCobrar() { return <CuentasPorCobrarPagar tipo="VENTA" /> }
export function CuentasPorPagar() { return <CuentasPorCobrarPagar tipo="COMPRA" /> }
