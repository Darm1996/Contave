'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/store'
import { toast } from 'sonner'
import { Contact, Plus, RefreshCw, Loader2 } from 'lucide-react'

interface Cliente { id: string; rif: string; nombre: string; direccion: string | null; telefono: string | null; email: string | null }

export function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({ rif: '', nombre: '', direccion: '', telefono: '', email: '' })

  async function cargar() {
    setLoading(true)
    const r = await apiFetch('/api/clientes')
    if (r.ok) setClientes(r.data.clientes)
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  async function crear() {
    if (!form.rif || !form.nombre) { toast.error('RIF y nombre son requeridos'); return }
    setGuardando(true)
    const r = await apiFetch('/api/clientes', { method: 'POST', body: JSON.stringify(form) })
    setGuardando(false)
    if (r.ok) {
      toast.success('Cliente creado')
      setShowForm(false)
      setForm({ rif: '', nombre: '', direccion: '', telefono: '', email: '' })
      cargar()
    } else {
      toast.error(r.error || 'Error al crear el cliente')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Contact className="w-6 h-6 text-cyan-600" />
            Clientes
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Registro de clientes para facturación de venta</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={cargar}><RefreshCw className="w-4 h-4 mr-1" /> Actualizar</Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-1" /> Nuevo cliente</Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Nuevo cliente</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
            <div><Label>RIF</Label><Input value={form.rif} onChange={(e) => setForm({ ...form, rif: e.target.value })} placeholder="J-12345678-9" /></div>
            <div><Label>Nombre / Razón social</Label><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
            <div><Label>Dirección</Label><Input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} /></div>
            <div><Label>Teléfono</Label><Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="md:col-span-2 flex gap-2">
              <Button onClick={crear} disabled={guardando}>{guardando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Guardar</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full min-w-[500px] text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr className="text-left">
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">RIF</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Nombre</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Teléfono</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Email</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-6 text-slate-400 dark:text-slate-500">Cargando...</td></tr>
              ) : clientes.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-6 text-slate-400 dark:text-slate-500">No hay clientes registrados</td></tr>
              ) : clientes.map((c) => (
                <tr key={c.id} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="px-2 py-2 font-mono text-slate-700 dark:text-slate-300">{c.rif}</td>
                  <td className="px-2 py-2 text-slate-700 dark:text-slate-300">{c.nombre}</td>
                  <td className="px-2 py-2 text-slate-500 dark:text-slate-400">{c.telefono || '—'}</td>
                  <td className="px-2 py-2 text-slate-500 dark:text-slate-400">{c.email || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
