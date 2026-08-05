'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { formatBs } from '@/lib/contabilidad/ven-nif'
import { apiFetch } from '@/lib/store'
import { toast } from 'sonner'
import { TableScrollHint } from '@/components/ui/table-scroll-hint'
import { Users, Plus, RefreshCw, Loader2, Trash2 } from 'lucide-react'

interface Empleado { id: string; cedula: string; nombre: string; cargo: string | null; fechaIngreso: string; salarioBase: number; activo: boolean }

export function Empleados() {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({ cedula: '', nombre: '', cargo: '', fechaIngreso: new Date().toISOString().slice(0, 10), salarioBase: '' })

  async function cargar() {
    setLoading(true)
    const r = await apiFetch('/api/empleados')
    if (r.ok) setEmpleados(r.data.empleados)
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  async function crear() {
    if (!form.cedula || !form.nombre || !form.salarioBase) { toast.error('Cédula, nombre y salario son requeridos'); return }
    setGuardando(true)
    const r = await apiFetch('/api/empleados', {
      method: 'POST',
      body: JSON.stringify({ ...form, salarioBase: parseFloat(form.salarioBase) }),
    })
    setGuardando(false)
    if (r.ok) {
      toast.success('Empleado registrado')
      setShowForm(false)
      setForm({ cedula: '', nombre: '', cargo: '', fechaIngreso: new Date().toISOString().slice(0, 10), salarioBase: '' })
      cargar()
    } else {
      toast.error(r.error || 'Error al registrar el empleado')
    }
  }

  async function desactivar(id: string) {
    const r = await apiFetch(`/api/empleados/${id}`, { method: 'DELETE' })
    if (r.ok) { toast.success('Empleado desactivado'); cargar() }
    else toast.error(r.error || 'Error')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-cyan-600" />
            Empleados
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Registro de empleados para el procesamiento de nómina</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={cargar}><RefreshCw className="w-4 h-4 mr-1" /> Actualizar</Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-1" /> Nuevo empleado</Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Nuevo empleado</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div><Label>Cédula</Label><Input value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} placeholder="V-12345678" /></div>
            <div className="md:col-span-2"><Label>Nombre completo</Label><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
            <div><Label>Cargo</Label><Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></div>
            <div><Label>Fecha de ingreso</Label><Input type="date" value={form.fechaIngreso} onChange={(e) => setForm({ ...form, fechaIngreso: e.target.value })} /></div>
            <div><Label>Salario mensual (Bs.)</Label><Input type="number" value={form.salarioBase} onChange={(e) => setForm({ ...form, salarioBase: e.target.value })} /></div>
            <div className="md:col-span-3 flex gap-2">
              <Button onClick={crear} disabled={guardando}>{guardando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Guardar</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <TableScrollHint />
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full min-w-[650px] text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr className="text-left">
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Cédula</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Nombre</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Cargo</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Salario</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-center">Estado</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-6 text-slate-400 dark:text-slate-500">Cargando...</td></tr>
              ) : empleados.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-6 text-slate-400 dark:text-slate-500">No hay empleados registrados</td></tr>
              ) : empleados.map((e) => (
                <tr key={e.id} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="px-2 py-2 font-mono text-slate-700 dark:text-slate-300">{e.cedula}</td>
                  <td className="px-2 py-2 text-slate-700 dark:text-slate-300">{e.nombre}</td>
                  <td className="px-2 py-2 text-slate-500 dark:text-slate-400">{e.cargo || '—'}</td>
                  <td className="px-2 py-2 text-right font-mono">{formatBs(e.salarioBase)}</td>
                  <td className="px-2 py-2 text-center">
                    <Badge variant="outline" className={e.activo ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:border-emerald-700' : 'bg-slate-100 text-slate-600 border-slate-300 dark:border-slate-700'}>
                      {e.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-2 py-2 text-center">
                    {e.activo && (
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => desactivar(e.id)} title="Desactivar">
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
