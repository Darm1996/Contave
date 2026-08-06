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
import { TreePalm, UserMinus, Loader2, RefreshCw } from 'lucide-react'

interface Empleado { id: string; cedula: string; nombre: string; cargo: string | null; fechaIngreso: string; salarioBase: number; activo: boolean }
interface Cuenta { id: string; codigo: string; nombre: string; uso: string | null }
interface Vacacion { id: string; fechaInicio: string; fechaFin: string; diasDisfrutados: number; montoVacaciones: number; montoBonoVacacional: number }
interface ResumenVacaciones { añosServicio: number; añosCompletos: number; periodosDisfrutados: number; periodosPendientes: number; diasPendientesEstimados: number; montoEstimado: number }

const MOTIVOS = [
  { value: 'RENUNCIA', label: 'Renuncia' },
  { value: 'DESPIDO_JUSTIFICADO', label: 'Despido justificado' },
  { value: 'DESPIDO_INJUSTIFICADO', label: 'Despido injustificado' },
  { value: 'MUTUO_ACUERDO', label: 'Mutuo acuerdo' },
]

function usePuedeGestionarNomina() {
  const { user, empresaActiva } = useApp()
  return empresaActiva?.rol === 'ADMIN' || empresaActiva?.rol === 'CONTADOR' || user?.role === 'SUPER_ADMIN'
}

function useCuentasBanco() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  useEffect(() => {
    apiFetch('/api/cuentas').then((r) => {
      if (r.ok) setCuentas(r.data.cuentas.filter((c: Cuenta) => c.uso === 'BANCOS_BS' || c.uso === 'BANCOS_USD' || c.uso === 'CAJA' || c.uso === 'CAJA_CHICA'))
    })
  }, [])
  return cuentas
}

export function Vacaciones() {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [empleadoId, setEmpleadoId] = useState('')
  const [resumen, setResumen] = useState<ResumenVacaciones | null>(null)
  const [historial, setHistorial] = useState<Vacacion[]>([])
  const [loading, setLoading] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const cuentas = useCuentasBanco()
  const puedeGestionar = usePuedeGestionarNomina()
  const [form, setForm] = useState({ fechaInicio: new Date().toISOString().slice(0, 10), fechaFin: '', diasDisfrutados: '15', generarAsiento: true, cuentaId: '' })

  useEffect(() => {
    apiFetch('/api/empleados').then((r) => {
      if (r.ok) {
        const activos = r.data.empleados.filter((e: Empleado) => e.activo)
        setEmpleados(activos)
        if (activos.length > 0) setEmpleadoId(activos[0].id)
      }
    })
  }, [])

  async function cargar() {
    if (!empleadoId) return
    setLoading(true)
    const r = await apiFetch(`/api/vacaciones?empleadoId=${empleadoId}`)
    if (r.ok) { setResumen(r.data.resumen); setHistorial(r.data.vacaciones) }
    setLoading(false)
  }
  useEffect(() => { cargar() }, [empleadoId])

  useEffect(() => { if (cuentas.length > 0 && !form.cuentaId) setForm((f) => ({ ...f, cuentaId: cuentas[0].id })) }, [cuentas])

  async function registrar() {
    const dias = Number(form.diasDisfrutados)
    if (!dias || dias <= 0) { toast.error('Ingresa los días disfrutados'); return }
    if (!form.fechaFin) { toast.error('Ingresa la fecha de fin'); return }
    if (form.generarAsiento && !form.cuentaId) { toast.error('Selecciona la cuenta de banco/caja'); return }
    setGuardando(true)
    const r = await apiFetch('/api/vacaciones', {
      method: 'POST',
      body: JSON.stringify({
        empleadoId, fechaInicio: form.fechaInicio, fechaFin: form.fechaFin, diasDisfrutados: dias,
        generarAsiento: form.generarAsiento, cuentaId: form.generarAsiento ? form.cuentaId : undefined,
      }),
    })
    setGuardando(false)
    if (r.ok) { toast.success('Vacaciones registradas'); cargar() }
    else toast.error(r.error || 'Error al registrar las vacaciones')
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <TreePalm className="w-6 h-6 text-cyan-600" />
          Vacaciones
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Disfrute de vacaciones y bono vacacional (LOTTT Art. 190-192)</p>
      </div>

      <Card>
        <CardContent className="pt-4">
          <Label>Empleado</Label>
          <select className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={empleadoId} onChange={(e) => setEmpleadoId(e.target.value)}>
            {empleados.length === 0 && <option value="">No hay empleados activos</option>}
            {empleados.map((e) => <option key={e.id} value={e.id}>{e.cedula} — {e.nombre}</option>)}
          </select>
        </CardContent>
      </Card>

      {resumen && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="pt-4"><div className="text-xs text-slate-500 dark:text-slate-400">Años de servicio</div><div className="text-lg font-bold">{resumen.añosServicio}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-slate-500 dark:text-slate-400">Períodos disfrutados</div><div className="text-lg font-bold">{resumen.periodosDisfrutados}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-slate-500 dark:text-slate-400">Períodos pendientes</div><div className="text-lg font-bold text-amber-600">{resumen.periodosPendientes}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-slate-500 dark:text-slate-400">Monto estimado pendiente</div><div className="text-lg font-bold text-amber-600">{formatBs(resumen.montoEstimado)}</div></CardContent></Card>
        </div>
      )}

      {puedeGestionar && (
        <Card>
          <CardHeader><CardTitle className="text-base">Registrar disfrute de vacaciones</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <div><Label>Fecha inicio</Label><Input type="date" value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} /></div>
            <div><Label>Fecha fin</Label><Input type="date" value={form.fechaFin} onChange={(e) => setForm({ ...form, fechaFin: e.target.value })} /></div>
            <div><Label>Días disfrutados</Label><Input type="number" value={form.diasDisfrutados} onChange={(e) => setForm({ ...form, diasDisfrutados: e.target.value })} /></div>
            <div className="flex items-center gap-1">
              <input type="checkbox" checked={form.generarAsiento} onChange={(e) => setForm({ ...form, generarAsiento: e.target.checked })} />
              <Label className="text-sm">Generar asiento</Label>
            </div>
            {form.generarAsiento && (
              <div className="col-span-2 md:col-span-4">
                <Label>Cuenta banco/caja</Label>
                <select className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={form.cuentaId} onChange={(e) => setForm({ ...form, cuentaId: e.target.value })}>
                  <option value="">Selecciona...</option>
                  {cuentas.map((c) => <option key={c.id} value={c.id}>{c.codigo} {c.nombre}</option>)}
                </select>
              </div>
            )}
            <div className="col-span-2 md:col-span-4">
              <Button onClick={registrar} disabled={guardando || !empleadoId}>{guardando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Registrar vacaciones</Button>
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
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Período</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Días</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Vacaciones</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Bono vacacional</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-6 text-slate-400 dark:text-slate-500">Cargando...</td></tr>
              ) : historial.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-6 text-slate-400 dark:text-slate-500">Sin períodos registrados</td></tr>
              ) : historial.map((v) => (
                <tr key={v.id} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="px-2 py-2 text-slate-700 dark:text-slate-300">{new Date(v.fechaInicio).toLocaleDateString('es-VE')} — {new Date(v.fechaFin).toLocaleDateString('es-VE')}</td>
                  <td className="px-2 py-2 text-right font-mono">{v.diasDisfrutados}</td>
                  <td className="px-2 py-2 text-right font-mono">{formatBs(v.montoVacaciones)}</td>
                  <td className="px-2 py-2 text-right font-mono">{formatBs(v.montoBonoVacacional)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

interface Liquidacion {
  id: string
  empleado: Empleado
  fechaEgreso: string
  motivoEgreso: string
  aniosServicio: number
  salarioIntegralDiario: number
  prestacionesSociales: number
  vacacionesVencidas: number
  vacacionesFraccionadas: number
  bonoVacacionalFraccionado: number
  utilidadesFraccionadas: number
  indemnizacionDespido: number
  totalLiquidacion: number
}

export function Liquidaciones() {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const cuentas = useCuentasBanco()
  const puedeGestionar = usePuedeGestionarNomina()
  const [form, setForm] = useState({ empleadoId: '', fechaEgreso: new Date().toISOString().slice(0, 10), motivoEgreso: 'RENUNCIA', generarAsiento: true, cuentaId: '' })

  async function cargar() {
    setLoading(true)
    const [rE, rL] = await Promise.all([apiFetch('/api/empleados'), apiFetch('/api/liquidaciones')])
    if (rE.ok) setEmpleados(rE.data.empleados.filter((e: Empleado) => e.activo))
    if (rL.ok) setLiquidaciones(rL.data.liquidaciones)
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])
  useEffect(() => { if (cuentas.length > 0 && !form.cuentaId) setForm((f) => ({ ...f, cuentaId: cuentas[0].id })) }, [cuentas])

  async function procesar() {
    if (!form.empleadoId) { toast.error('Selecciona el empleado'); return }
    if (form.generarAsiento && !form.cuentaId) { toast.error('Selecciona la cuenta de banco/caja'); return }
    setGuardando(true)
    const r = await apiFetch('/api/liquidaciones', {
      method: 'POST',
      body: JSON.stringify({
        empleadoId: form.empleadoId, fechaEgreso: form.fechaEgreso, motivoEgreso: form.motivoEgreso,
        generarAsiento: form.generarAsiento, cuentaId: form.generarAsiento ? form.cuentaId : undefined,
      }),
    })
    setGuardando(false)
    if (r.ok) { toast.success('Liquidación procesada'); setShowForm(false); cargar() }
    else toast.error(r.error || 'Error al procesar la liquidación')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <UserMinus className="w-6 h-6 text-cyan-600" />
            Liquidación de Personal
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Prestaciones sociales, vacaciones y utilidades fraccionadas al egreso (LOTTT Art. 92 y 142)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={cargar}><RefreshCw className="w-4 h-4 mr-1" /> Actualizar</Button>
          {puedeGestionar && <Button size="sm" onClick={() => setShowForm(!showForm)}>Nueva liquidación</Button>}
        </div>
      </div>

      {showForm && puedeGestionar && (
        <Card>
          <CardHeader><CardTitle className="text-base">Procesar liquidación</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <div className="col-span-2">
              <Label>Empleado</Label>
              <select className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={form.empleadoId} onChange={(e) => setForm({ ...form, empleadoId: e.target.value })}>
                <option value="">Selecciona...</option>
                {empleados.map((e) => <option key={e.id} value={e.id}>{e.cedula} — {e.nombre}</option>)}
              </select>
            </div>
            <div><Label>Fecha de egreso</Label><Input type="date" value={form.fechaEgreso} onChange={(e) => setForm({ ...form, fechaEgreso: e.target.value })} /></div>
            <div>
              <Label>Motivo</Label>
              <select className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={form.motivoEgreso} onChange={(e) => setForm({ ...form, motivoEgreso: e.target.value })}>
                {MOTIVOS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <input type="checkbox" checked={form.generarAsiento} onChange={(e) => setForm({ ...form, generarAsiento: e.target.checked })} />
              <Label className="text-sm">Generar asiento</Label>
            </div>
            {form.generarAsiento && (
              <div className="col-span-2 md:col-span-3">
                <Label>Cuenta banco/caja</Label>
                <select className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={form.cuentaId} onChange={(e) => setForm({ ...form, cuentaId: e.target.value })}>
                  <option value="">Selecciona...</option>
                  {cuentas.map((c) => <option key={c.id} value={c.id}>{c.codigo} {c.nombre}</option>)}
                </select>
              </div>
            )}
            <div className="col-span-2 md:col-span-4 flex gap-2">
              <Button onClick={procesar} disabled={guardando}>{guardando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Procesar liquidación</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
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
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Empleado</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Egreso</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Motivo</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Antigüedad</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Prestaciones</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Vacaciones</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Utilidades fracc.</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-6 text-slate-400 dark:text-slate-500">Cargando...</td></tr>
              ) : liquidaciones.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-6 text-slate-400 dark:text-slate-500">Sin liquidaciones registradas</td></tr>
              ) : liquidaciones.map((l) => (
                <tr key={l.id} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="px-2 py-2 text-slate-700 dark:text-slate-300">{l.empleado.nombre}<div className="text-[10px] text-slate-400">{l.empleado.cedula}</div></td>
                  <td className="px-2 py-2 text-slate-700 dark:text-slate-300">{new Date(l.fechaEgreso).toLocaleDateString('es-VE')}</td>
                  <td className="px-2 py-2"><Badge variant="outline">{MOTIVOS.find((m) => m.value === l.motivoEgreso)?.label || l.motivoEgreso}</Badge></td>
                  <td className="px-2 py-2 text-right font-mono">{l.aniosServicio} años</td>
                  <td className="px-2 py-2 text-right font-mono">{formatBs(l.prestacionesSociales)}</td>
                  <td className="px-2 py-2 text-right font-mono">{formatBs(l.vacacionesVencidas + l.vacacionesFraccionadas + l.bonoVacacionalFraccionado)}</td>
                  <td className="px-2 py-2 text-right font-mono">{formatBs(l.utilidadesFraccionadas)}</td>
                  <td className="px-2 py-2 text-right font-mono font-semibold">{formatBs(l.totalLiquidacion)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
