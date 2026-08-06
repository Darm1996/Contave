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
import { toast } from 'sonner'
import { Landmark, Gavel, Plus, RefreshCw, Loader2, Trash2 } from 'lucide-react'

interface Accionista {
  id: string; nombre: string; identificacion: string; numeroAcciones: number
  porcentajeParticipacion: number; activo: boolean
}
interface Acta {
  id: string; numero: number; fecha: string; tipo: string; lugar: string | null
  agenda: string; acuerdos: string; asistentes: string; accionesRepresentadas: number; quorumPorcentaje: number
}

function usePuedeGestionarSocietario() {
  const { user, empresaActiva } = useApp()
  return empresaActiva?.rol === 'ADMIN' || user?.role === 'SUPER_ADMIN'
}

export function Accionistas() {
  const puedeGestionar = usePuedeGestionarSocietario()
  const [accionistas, setAccionistas] = useState<Accionista[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({ nombre: '', identificacion: '', numeroAcciones: '' })

  async function cargar() {
    setLoading(true)
    const r = await apiFetch('/api/accionistas')
    if (r.ok) setAccionistas(r.data.accionistas)
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  async function crear() {
    if (!form.nombre || !form.identificacion || !form.numeroAcciones) {
      toast.error('Nombre, identificación y número de acciones son requeridos')
      return
    }
    setGuardando(true)
    const r = await apiFetch('/api/accionistas', {
      method: 'POST',
      body: JSON.stringify({ ...form, numeroAcciones: parseFloat(form.numeroAcciones) }),
    })
    setGuardando(false)
    if (r.ok) {
      toast.success('Accionista registrado')
      setShowForm(false)
      setForm({ nombre: '', identificacion: '', numeroAcciones: '' })
      cargar()
    } else {
      toast.error(r.error || 'Error al registrar el accionista')
    }
  }

  async function desactivar(id: string) {
    const r = await apiFetch(`/api/accionistas/${id}`, { method: 'DELETE' })
    if (r.ok) { toast.success('Accionista desactivado'); cargar() }
    else toast.error(r.error || 'Error')
  }

  const totalAcciones = accionistas.filter((a) => a.activo).reduce((s, a) => s + a.numeroAcciones, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Landmark className="w-6 h-6 text-cyan-600" />
            Accionistas
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Registro societario de accionistas y participación accionaria</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={cargar}><RefreshCw className="w-4 h-4 mr-1" /> Actualizar</Button>
          {puedeGestionar && <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-1" /> Nuevo accionista</Button>}
        </div>
      </div>

      <Card><CardContent className="pt-4">
        <div className="text-xs text-slate-500 dark:text-slate-400">Total de acciones vigentes</div>
        <div className="text-2xl font-bold">{totalAcciones.toLocaleString('es-VE')}</div>
      </CardContent></Card>

      {showForm && puedeGestionar && (
        <Card>
          <CardHeader><CardTitle className="text-base">Nuevo accionista</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-2"><Label>Nombre completo / razón social</Label><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
            <div><Label>Cédula / RIF</Label><Input value={form.identificacion} onChange={(e) => setForm({ ...form, identificacion: e.target.value })} placeholder="V-12345678" /></div>
            <div><Label>Número de acciones</Label><Input type="number" value={form.numeroAcciones} onChange={(e) => setForm({ ...form, numeroAcciones: e.target.value })} /></div>
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
          <table className="w-full min-w-[650px] text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr className="text-left">
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Identificación</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Nombre</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Acciones</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">% Participación</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-center">Estado</th>
                {puedeGestionar && <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-center">Acción</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-6 text-slate-400 dark:text-slate-500">Cargando...</td></tr>
              ) : accionistas.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-6 text-slate-400 dark:text-slate-500">No hay accionistas registrados</td></tr>
              ) : accionistas.map((a) => (
                <tr key={a.id} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="px-2 py-2 font-mono text-slate-700 dark:text-slate-300">{a.identificacion}</td>
                  <td className="px-2 py-2 text-slate-700 dark:text-slate-300">{a.nombre}</td>
                  <td className="px-2 py-2 text-right font-mono">{a.numeroAcciones.toLocaleString('es-VE')}</td>
                  <td className="px-2 py-2 text-right font-mono font-semibold">{a.porcentajeParticipacion}%</td>
                  <td className="px-2 py-2 text-center">
                    <Badge variant="outline" className={a.activo ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:border-emerald-700' : 'bg-slate-100 text-slate-600 border-slate-300 dark:border-slate-700'}>
                      {a.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  {puedeGestionar && (
                    <td className="px-2 py-2 text-center">
                      {a.activo && (
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => desactivar(a.id)} title="Desactivar">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
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

const TIPOS_ACTA = [
  { value: 'ORDINARIA', label: 'Asamblea Ordinaria' },
  { value: 'EXTRAORDINARIA', label: 'Asamblea Extraordinaria' },
]

export function ActasAsamblea() {
  const puedeGestionar = usePuedeGestionarSocietario()
  const [actas, setActas] = useState<Acta[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10), tipo: 'ORDINARIA', lugar: '',
    agenda: '', acuerdos: '', asistentes: '', accionesRepresentadas: '',
  })

  async function cargar() {
    setLoading(true)
    const r = await apiFetch('/api/actas-asamblea')
    if (r.ok) setActas(r.data.actas)
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  async function crear() {
    if (!form.agenda || !form.acuerdos || !form.asistentes) {
      toast.error('Agenda, acuerdos y asistentes son requeridos')
      return
    }
    setGuardando(true)
    const r = await apiFetch('/api/actas-asamblea', {
      method: 'POST',
      body: JSON.stringify({ ...form, accionesRepresentadas: parseFloat(form.accionesRepresentadas) || 0 }),
    })
    setGuardando(false)
    if (r.ok) {
      toast.success('Acta registrada')
      setShowForm(false)
      setForm({ fecha: new Date().toISOString().slice(0, 10), tipo: 'ORDINARIA', lugar: '', agenda: '', acuerdos: '', asistentes: '', accionesRepresentadas: '' })
      cargar()
    } else {
      toast.error(r.error || 'Error al registrar el acta')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Gavel className="w-6 h-6 text-cyan-600" />
            Libro de Actas
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Actas de asamblea de accionistas, ordinarias y extraordinarias</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={cargar}><RefreshCw className="w-4 h-4 mr-1" /> Actualizar</Button>
          {puedeGestionar && <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-1" /> Nueva acta</Button>}
        </div>
      </div>

      {showForm && puedeGestionar && (
        <Card>
          <CardHeader><CardTitle className="text-base">Nueva acta de asamblea</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div><Label>Fecha</Label><Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></div>
            <div>
              <Label>Tipo</Label>
              <select className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                {TIPOS_ACTA.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div><Label>Lugar</Label><Input value={form.lugar} onChange={(e) => setForm({ ...form, lugar: e.target.value })} placeholder="Sede de la empresa" /></div>
            <div className="md:col-span-3"><Label>Agenda / puntos a tratar</Label><Input value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} /></div>
            <div className="md:col-span-3"><Label>Acuerdos adoptados</Label><Input value={form.acuerdos} onChange={(e) => setForm({ ...form, acuerdos: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Accionistas / representantes asistentes</Label><Input value={form.asistentes} onChange={(e) => setForm({ ...form, asistentes: e.target.value })} placeholder="Nombres de los presentes" /></div>
            <div><Label>Acciones representadas</Label><Input type="number" value={form.accionesRepresentadas} onChange={(e) => setForm({ ...form, accionesRepresentadas: e.target.value })} /></div>
            <div className="md:col-span-3 flex gap-2">
              <Button onClick={crear} disabled={guardando}>{guardando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Registrar acta</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {loading ? (
          <Card><CardContent className="text-center py-8 text-slate-400 dark:text-slate-500">Cargando...</CardContent></Card>
        ) : actas.length === 0 ? (
          <Card><CardContent className="text-center py-8 text-slate-400 dark:text-slate-500">No hay actas registradas</CardContent></Card>
        ) : actas.map((a) => (
          <Card key={a.id}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 dark:text-slate-100">Acta N° {a.numero}</span>
                  <Badge variant="outline">{TIPOS_ACTA.find((t) => t.value === a.tipo)?.label || a.tipo}</Badge>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{new Date(a.fecha).toLocaleDateString('es-VE')}{a.lugar ? ` — ${a.lugar}` : ''}</div>
              </div>
              <div className="text-sm space-y-1">
                <p><span className="font-semibold text-slate-600 dark:text-slate-400">Agenda:</span> {a.agenda}</p>
                <p><span className="font-semibold text-slate-600 dark:text-slate-400">Acuerdos:</span> {a.acuerdos}</p>
                <p><span className="font-semibold text-slate-600 dark:text-slate-400">Asistentes:</span> {a.asistentes}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Quórum: {a.accionesRepresentadas.toLocaleString('es-VE')} acciones representadas ({a.quorumPorcentaje}%)</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
