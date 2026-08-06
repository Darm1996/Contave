'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { TableScrollHint } from '@/components/ui/table-scroll-hint'
import { formatBs } from '@/lib/contabilidad/ven-nif'
import { apiFetch } from '@/lib/store'
import { toast } from 'sonner'
import { Boxes, Plus, RefreshCw, Loader2, Trash2 } from 'lucide-react'

interface Cuenta { id: string; codigo: string; nombre: string; uso: string | null }
interface Producto {
  id: string; codigo: string; nombre: string; descripcion: string | null; unidadMedida: string
  cuenta: Cuenta | null; costoPromedioActual: number; cantidadActual: number; valorizacion: number; activo: boolean
}

export function Productos() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({ codigo: '', nombre: '', descripcion: '', unidadMedida: 'UND', cuentaInventarioId: '' })

  async function cargar() {
    setLoading(true)
    const [rP, rC] = await Promise.all([apiFetch('/api/productos'), apiFetch('/api/cuentas')])
    if (rP.ok) setProductos(rP.data.productos)
    if (rC.ok) setCuentas(rC.data.cuentas.filter((c: Cuenta) => c.uso?.startsWith('MERCANCIA')))
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  async function crear() {
    if (!form.codigo || !form.nombre || !form.cuentaInventarioId) {
      toast.error('Código, nombre y cuenta de inventario son requeridos')
      return
    }
    setGuardando(true)
    const r = await apiFetch('/api/productos', { method: 'POST', body: JSON.stringify(form) })
    setGuardando(false)
    if (r.ok) {
      toast.success('Producto registrado')
      setShowForm(false)
      setForm({ codigo: '', nombre: '', descripcion: '', unidadMedida: 'UND', cuentaInventarioId: '' })
      cargar()
    } else {
      toast.error(r.error || 'Error al registrar el producto')
    }
  }

  async function desactivar(id: string) {
    const r = await apiFetch(`/api/productos/${id}`, { method: 'DELETE' })
    if (r.ok) { toast.success('Producto desactivado'); cargar() }
    else toast.error(r.error || 'Error')
  }

  const valorTotal = productos.filter((p) => p.activo).reduce((s, p) => s + p.valorizacion, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-cyan-600" />
            Productos
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Catálogo de productos para el control de inventario (Kardex)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={cargar}><RefreshCw className="w-4 h-4 mr-1" /> Actualizar</Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-1" /> Nuevo producto</Button>
        </div>
      </div>

      <Card><CardContent className="pt-4">
        <div className="text-xs text-slate-500 dark:text-slate-400">Valorización total del inventario</div>
        <div className="text-2xl font-bold">{formatBs(valorTotal)}</div>
      </CardContent></Card>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Nuevo producto</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div><Label>Código</Label><Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="PROD-001" /></div>
            <div className="md:col-span-2"><Label>Nombre</Label><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
            <div><Label>Descripción</Label><Input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></div>
            <div><Label>Unidad de medida</Label><Input value={form.unidadMedida} onChange={(e) => setForm({ ...form, unidadMedida: e.target.value })} placeholder="UND, KG, LT..." /></div>
            <div>
              <Label>Cuenta de inventario</Label>
              <select className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={form.cuentaInventarioId} onChange={(e) => setForm({ ...form, cuentaInventarioId: e.target.value })}>
                <option value="">Selecciona...</option>
                {cuentas.map((c) => <option key={c.id} value={c.id}>{c.codigo} {c.nombre}</option>)}
              </select>
            </div>
            <div className="md:col-span-3 flex gap-2">
              <Button onClick={crear} disabled={guardando}>{guardando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Registrar</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <TableScrollHint />
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full min-w-[700px] text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr className="text-left">
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Código</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Nombre</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Existencia</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Costo promedio</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Valorización</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-center">Estado</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-6 text-slate-400 dark:text-slate-500">Cargando...</td></tr>
              ) : productos.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-6 text-slate-400 dark:text-slate-500">No hay productos registrados</td></tr>
              ) : productos.map((p) => (
                <tr key={p.id} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="px-2 py-2 font-mono text-slate-700 dark:text-slate-300">{p.codigo}</td>
                  <td className="px-2 py-2 text-slate-700 dark:text-slate-300">{p.nombre}</td>
                  <td className="px-2 py-2 text-right font-mono">{p.cantidadActual} {p.unidadMedida}</td>
                  <td className="px-2 py-2 text-right font-mono">{formatBs(p.costoPromedioActual)}</td>
                  <td className="px-2 py-2 text-right font-mono font-semibold">{formatBs(p.valorizacion)}</td>
                  <td className="px-2 py-2 text-center">
                    <Badge variant="outline" className={p.activo ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:border-emerald-700' : 'bg-slate-100 text-slate-600 border-slate-300 dark:border-slate-700'}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-2 py-2 text-center">
                    {p.activo && (
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => desactivar(p.id)} title="Desactivar">
                        <Trash2 className="w-3.5 h-3.5" />
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
