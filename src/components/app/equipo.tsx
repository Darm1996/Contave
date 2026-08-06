'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { TableScrollHint } from '@/components/ui/table-scroll-hint'
import { useApp, apiFetch } from '@/lib/store'
import { toast } from 'sonner'
import { UsersRound, Plus, Loader2, Trash2 } from 'lucide-react'

interface Miembro { userId: string; email: string; nombre: string; rol: string; desde: string }

const ROLES = [
  { value: 'AUXILIAR', label: 'Auxiliar', desc: 'Trabajo operativo diario: facturas, productos, conciliación' },
  { value: 'CONTADOR', label: 'Contador', desc: 'Además: cerrar ejercicios, procesar nómina, registrar pagos' },
  { value: 'ADMIN', label: 'Administrador', desc: 'Además: configuración de la empresa y gestión del equipo' },
]

function badgeRol(rol: string) {
  const cls = rol === 'ADMIN'
    ? 'bg-amber-100 text-amber-800 border-amber-300 dark:border-amber-700'
    : rol === 'CONTADOR'
    ? 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:border-cyan-700'
    : 'bg-slate-100 text-slate-600 border-slate-300 dark:border-slate-700'
  return <Badge variant="outline" className={cls}>{rol}</Badge>
}

export function Equipo() {
  const { user, empresaActiva } = useApp()
  const [miembros, setMiembros] = useState<Miembro[]>([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({ email: '', rol: 'AUXILIAR' })

  const esAdmin = empresaActiva?.rol === 'ADMIN' || user?.role === 'SUPER_ADMIN'

  async function cargar() {
    setLoading(true)
    const r = await apiFetch('/api/equipo')
    if (r.ok) setMiembros(r.data.miembros)
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  async function agregar() {
    if (!form.email) { toast.error('Ingresa el email del usuario'); return }
    setGuardando(true)
    const r = await apiFetch('/api/equipo', { method: 'POST', body: JSON.stringify(form) })
    setGuardando(false)
    if (r.ok) { toast.success('Miembro agregado'); setForm({ email: '', rol: 'AUXILIAR' }); cargar() }
    else toast.error(r.error || 'Error al agregar el miembro')
  }

  async function cambiarRol(userId: string, rol: string) {
    const r = await apiFetch('/api/equipo', { method: 'PATCH', body: JSON.stringify({ userId, rol }) })
    if (r.ok) { toast.success('Rol actualizado'); cargar() }
    else toast.error(r.error || 'Error al cambiar el rol')
  }

  async function remover(userId: string, nombre: string) {
    if (!confirm(`¿Remover a "${nombre}" de esta empresa?`)) return
    const r = await apiFetch(`/api/equipo?userId=${userId}`, { method: 'DELETE' })
    if (r.ok) { toast.success('Miembro removido'); cargar() }
    else toast.error(r.error || 'Error al remover el miembro')
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <UsersRound className="w-6 h-6 text-cyan-600" />
          Equipo
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Miembros de {empresaActiva?.nombre || 'la empresa'} y sus roles de acceso</p>
      </div>

      <Card>
        <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
          {ROLES.map((r) => (
            <div key={r.value} className="flex items-start gap-2">
              {badgeRol(r.value)}
              <span className="text-slate-500 dark:text-slate-400">{r.desc}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {esAdmin && (
        <Card>
          <CardHeader><CardTitle className="text-base">Agregar miembro existente</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="usuario@ejemplo.com" />
              <p className="text-[11px] text-slate-400 mt-1">La persona debe tener ya una cuenta registrada en ContaVE</p>
            </div>
            <div>
              <Label>Rol</Label>
              <select className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-3">
              <Button onClick={agregar} disabled={guardando}>{guardando ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}Agregar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <TableScrollHint />
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full min-w-[600px] text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr className="text-left">
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Nombre</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Email</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-center">Rol</th>
                {esAdmin && <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-center">Acción</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-6 text-slate-400 dark:text-slate-500">Cargando...</td></tr>
              ) : miembros.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-6 text-slate-400 dark:text-slate-500">Sin miembros</td></tr>
              ) : miembros.map((m) => (
                <tr key={m.userId} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="px-2 py-2 text-slate-700 dark:text-slate-300">{m.nombre}{m.userId === user?.id && <span className="text-slate-400"> (tú)</span>}</td>
                  <td className="px-2 py-2 text-slate-500 dark:text-slate-400">{m.email}</td>
                  <td className="px-2 py-2 text-center">
                    {esAdmin ? (
                      <select
                        className="h-7 px-2 rounded-md border border-input bg-background text-xs"
                        value={m.rol}
                        onChange={(e) => cambiarRol(m.userId, e.target.value)}
                      >
                        {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    ) : badgeRol(m.rol)}
                  </td>
                  {esAdmin && (
                    <td className="px-2 py-2 text-center">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => remover(m.userId, m.nombre)} title="Remover">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
