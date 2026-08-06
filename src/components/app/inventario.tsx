'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { TableScrollHint } from '@/components/ui/table-scroll-hint'
import { formatBs } from '@/lib/contabilidad/ven-nif'
import { apiFetch } from '@/lib/store'
import { exportarExcelCliente } from '@/lib/exports/cliente'
import { toast } from 'sonner'
import { Warehouse, RefreshCw, Loader2, Download } from 'lucide-react'

interface Producto { id: string; codigo: string; nombre: string; unidadMedida: string; cantidadActual: number; costoPromedioActual: number }
interface Movimiento {
  id: string; tipo: string; cantidad: number; costoUnitario: number; costoTotal: number
  cantidadSaldo: number; costoPromedioSaldo: number; motivo: string | null; fecha: string
}

export function Inventario() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [productoId, setProductoId] = useState('')
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [loading, setLoading] = useState(false)
  const [registrando, setRegistrando] = useState(false)
  const [form, setForm] = useState({ tipo: 'ENTRADA', cantidad: '', costoUnitario: '', motivo: '', generarAsientoCosto: true })

  async function cargarProductos() {
    const r = await apiFetch('/api/productos')
    if (r.ok) {
      const activos = r.data.productos.filter((p: any) => p.activo)
      setProductos(activos)
      if (!productoId && activos.length > 0) setProductoId(activos[0].id)
    }
  }
  useEffect(() => { cargarProductos() }, [])

  async function cargarKardex() {
    if (!productoId) return
    setLoading(true)
    const r = await apiFetch(`/api/inventario/movimientos?productoId=${productoId}`)
    if (r.ok) setMovimientos(r.data.movimientos)
    setLoading(false)
  }
  useEffect(() => { cargarKardex() }, [productoId])

  const productoActual = productos.find((p) => p.id === productoId)

  async function registrar() {
    if (!productoId || !form.cantidad) { toast.error('Selecciona un producto e ingresa la cantidad'); return }
    if (form.tipo === 'ENTRADA' && !form.costoUnitario) { toast.error('El costo unitario es requerido para una entrada'); return }
    setRegistrando(true)
    const cantidadNum = parseFloat(form.cantidad)
    const cantidad = form.tipo === 'AJUSTE' ? cantidadNum : Math.abs(cantidadNum)
    const r = await apiFetch('/api/inventario/movimientos', {
      method: 'POST',
      body: JSON.stringify({
        productoId, tipo: form.tipo, cantidad,
        costoUnitario: form.costoUnitario ? parseFloat(form.costoUnitario) : undefined,
        motivo: form.motivo || undefined,
        generarAsientoCosto: form.tipo === 'SALIDA' ? form.generarAsientoCosto : false,
      }),
    })
    setRegistrando(false)
    if (r.ok) {
      toast.success('Movimiento registrado')
      setForm({ ...form, cantidad: '', costoUnitario: '', motivo: '' })
      cargarProductos()
      cargarKardex()
    } else {
      toast.error(r.error || 'Error al registrar el movimiento')
    }
  }

  function exportar() {
    if (!productoActual) return
    exportarExcelCliente(`Kardex_${productoActual.codigo}.xlsx`, [{
      nombre: 'Kardex',
      columnas: [
        { header: 'Fecha', key: 'fecha', width: 14 },
        { header: 'Tipo', key: 'tipo', width: 12 },
        { header: 'Cantidad', key: 'cantidad', width: 12 },
        { header: 'Costo unitario', key: 'costoUnitario', width: 14, numFmt: '#,##0.00' },
        { header: 'Costo total', key: 'costoTotal', width: 14, numFmt: '#,##0.00' },
        { header: 'Saldo cantidad', key: 'cantidadSaldo', width: 14 },
        { header: 'Costo promedio', key: 'costoPromedioSaldo', width: 14, numFmt: '#,##0.00' },
        { header: 'Motivo', key: 'motivo', width: 24 },
      ],
      filas: movimientos.map((m) => ({
        fecha: new Date(m.fecha).toLocaleDateString('es-VE'),
        tipo: m.tipo, cantidad: m.cantidad, costoUnitario: m.costoUnitario, costoTotal: m.costoTotal,
        cantidadSaldo: m.cantidadSaldo, costoPromedioSaldo: m.costoPromedioSaldo, motivo: m.motivo || '',
      })),
    }])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Warehouse className="w-6 h-6 text-cyan-600" />
            Inventario — Kardex
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Costeo por promedio ponderado</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={cargarKardex}><RefreshCw className="w-4 h-4 mr-1" /> Actualizar</Button>
          <Button variant="outline" size="sm" onClick={exportar} disabled={!productoActual}><Download className="w-4 h-4 mr-1" /> Exportar Excel</Button>
        </div>
      </div>

      {productos.length === 0 ? (
        <Card><CardContent className="text-center py-8 text-slate-400 dark:text-slate-500">No hay productos activos. Registrá uno en "Productos" primero.</CardContent></Card>
      ) : (
        <>
          <Card>
            <CardContent className="pt-4">
              <Label>Producto</Label>
              <select className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={productoId} onChange={(e) => setProductoId(e.target.value)}>
                {productos.map((p) => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}
              </select>
              {productoActual && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Existencia actual</div>
                    <div className="text-lg font-bold">{productoActual.cantidadActual} {productoActual.unidadMedida}</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Costo promedio</div>
                    <div className="text-lg font-bold">{formatBs(productoActual.costoPromedioActual)}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registrar movimiento</CardTitle>
              <CardDescription>Entrada (compra), salida (venta/consumo) o ajuste (conteo físico, merma)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div>
                  <Label>Tipo</Label>
                  <select className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                    <option value="ENTRADA">Entrada</option>
                    <option value="SALIDA">Salida</option>
                    <option value="AJUSTE">Ajuste (+/-)</option>
                  </select>
                </div>
                <div>
                  <Label>Cantidad {form.tipo === 'AJUSTE' && '(negativa para restar)'}</Label>
                  <Input type="number" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} placeholder="0" />
                </div>
                {form.tipo === 'ENTRADA' && (
                  <div>
                    <Label>Costo unitario (Bs.)</Label>
                    <Input type="number" value={form.costoUnitario} onChange={(e) => setForm({ ...form, costoUnitario: e.target.value })} placeholder="0.00" />
                  </div>
                )}
              </div>
              <div>
                <Label>Motivo / referencia</Label>
                <Input value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} placeholder="Ej. Compra factura #123, conteo físico mensual..." />
              </div>
              {form.tipo === 'SALIDA' && (
                <div className="flex items-center justify-between border-t pt-3">
                  <div>
                    <Label htmlFor="generarCosto">Generar asiento de costo de venta</Label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Debita Costo de Mercancía Vendida y acredita la cuenta de inventario</p>
                  </div>
                  <Switch id="generarCosto" checked={form.generarAsientoCosto} onCheckedChange={(v) => setForm({ ...form, generarAsientoCosto: v })} />
                </div>
              )}
              <Button onClick={registrar} disabled={registrando}>
                {registrando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Registrar movimiento
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Kardex — {productoActual?.nombre}</CardTitle></CardHeader>
            <TableScrollHint />
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full min-w-[700px] text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800">
                  <tr className="text-left">
                    <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Fecha</th>
                    <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-center">Tipo</th>
                    <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Cantidad</th>
                    <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Costo unitario</th>
                    <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Saldo cantidad</th>
                    <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Costo promedio</th>
                    <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="text-center py-6 text-slate-400 dark:text-slate-500">Cargando...</td></tr>
                  ) : movimientos.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-6 text-slate-400 dark:text-slate-500">Sin movimientos registrados</td></tr>
                  ) : movimientos.map((m) => (
                    <tr key={m.id} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <td className="px-2 py-2 text-slate-600 dark:text-slate-400">{new Date(m.fecha).toLocaleDateString('es-VE')}</td>
                      <td className="px-2 py-2 text-center">
                        <Badge variant="outline" className={
                          m.tipo === 'ENTRADA' ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:border-emerald-700' :
                          m.tipo === 'SALIDA' ? 'bg-red-100 text-red-800 border-red-300 dark:border-red-700' :
                          'bg-amber-100 text-amber-800 border-amber-300 dark:border-amber-700'
                        }>{m.tipo}</Badge>
                      </td>
                      <td className="px-2 py-2 text-right font-mono">{m.cantidad}</td>
                      <td className="px-2 py-2 text-right font-mono">{formatBs(m.costoUnitario)}</td>
                      <td className="px-2 py-2 text-right font-mono">{m.cantidadSaldo}</td>
                      <td className="px-2 py-2 text-right font-mono">{formatBs(m.costoPromedioSaldo)}</td>
                      <td className="px-2 py-2 text-slate-500 dark:text-slate-400">{m.motivo || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
