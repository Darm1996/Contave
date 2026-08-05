'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { formatBs } from '@/lib/contabilidad/ven-nif'
import { apiFetch } from '@/lib/store'
import { exportarExcelCliente } from '@/lib/exports/cliente'
import { toast } from 'sonner'
import { Package, RefreshCw, Plus, Loader2, Download, Trash2 } from 'lucide-react'

interface Cuenta { id: string; codigo: string; nombre: string; uso: string | null }
interface ActivoFijo {
  id: string
  nombre: string
  cuentaActivoId: string
  cuenta: Cuenta | null
  costoAdquisicion: number
  fechaAdquisicion: string
  vidaUtilMeses: number
  valorResidual: number
  depreciacionAcumulada: number
  valorLibro: number
  depreciacionMensual: number
  estado: string
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export function ActivosFijos() {
  const [activos, setActivos] = useState<ActivoFijo[]>([])
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [depreciando, setDepreciando] = useState(false)
  const [periodo, setPeriodo] = useState({ mes: new Date().getMonth() + 1, ano: new Date().getFullYear() })
  const [form, setForm] = useState({
    nombre: '', cuentaActivoId: '', costoAdquisicion: '', fechaAdquisicion: new Date().toISOString().slice(0, 10),
    vidaUtilMeses: '36', valorResidual: '0',
  })

  async function cargar() {
    setLoading(true)
    const [rA, rC] = await Promise.all([apiFetch('/api/activos-fijos'), apiFetch('/api/cuentas')])
    if (rA.ok) setActivos(rA.data.activos)
    if (rC.ok) setCuentas(rC.data.cuentas.filter((c: Cuenta) => c.uso?.startsWith('AF_')))
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  async function crear() {
    if (!form.nombre || !form.cuentaActivoId || !form.costoAdquisicion || !form.vidaUtilMeses) {
      toast.error('Completa nombre, cuenta, costo y vida útil')
      return
    }
    setGuardando(true)
    const r = await apiFetch('/api/activos-fijos', {
      method: 'POST',
      body: JSON.stringify({
        ...form,
        costoAdquisicion: parseFloat(form.costoAdquisicion),
        vidaUtilMeses: parseInt(form.vidaUtilMeses),
        valorResidual: parseFloat(form.valorResidual) || 0,
      }),
    })
    setGuardando(false)
    if (r.ok) {
      toast.success('Activo registrado')
      setShowForm(false)
      setForm({ nombre: '', cuentaActivoId: '', costoAdquisicion: '', fechaAdquisicion: new Date().toISOString().slice(0, 10), vidaUtilMeses: '36', valorResidual: '0' })
      cargar()
    } else {
      toast.error(r.error || 'Error al registrar el activo')
    }
  }

  async function darDeBaja(id: string) {
    const r = await apiFetch(`/api/activos-fijos/${id}`, { method: 'DELETE' })
    if (r.ok) { toast.success('Activo dado de baja'); cargar() }
    else toast.error(r.error || 'Error')
  }

  async function generarDepreciacion() {
    setDepreciando(true)
    const r = await apiFetch('/api/activos-fijos/depreciar', { method: 'POST', body: JSON.stringify(periodo) })
    setDepreciando(false)
    if (r.ok) {
      toast.success(`Depreciación generada: ${formatBs(r.data.totalDepreciado)} en ${r.data.activosDepreciados} activo(s)`)
      cargar()
    } else {
      toast.error(r.error || 'Error al generar la depreciación')
    }
  }

  function exportar() {
    exportarExcelCliente('Activos_Fijos.xlsx', [{
      nombre: 'Activos Fijos',
      columnas: [
        { header: 'Nombre', key: 'nombre', width: 28 },
        { header: 'Cuenta', key: 'cuenta', width: 24 },
        { header: 'Fecha adquisición', key: 'fecha', width: 16 },
        { header: 'Costo', key: 'costo', width: 16, numFmt: '#,##0.00' },
        { header: 'Vida útil (meses)', key: 'vida', width: 14 },
        { header: 'Depreciación mensual', key: 'depMensual', width: 18, numFmt: '#,##0.00' },
        { header: 'Depreciación acumulada', key: 'depAcum', width: 18, numFmt: '#,##0.00' },
        { header: 'Valor en libros', key: 'valorLibro', width: 16, numFmt: '#,##0.00' },
        { header: 'Estado', key: 'estado', width: 16 },
      ],
      filas: activos.map((a) => ({
        nombre: a.nombre,
        cuenta: a.cuenta ? `${a.cuenta.codigo} ${a.cuenta.nombre}` : '',
        fecha: new Date(a.fechaAdquisicion).toLocaleDateString('es-VE'),
        costo: a.costoAdquisicion,
        vida: a.vidaUtilMeses,
        depMensual: a.depreciacionMensual,
        depAcum: a.depreciacionAcumulada,
        valorLibro: a.valorLibro,
        estado: a.estado,
      })),
    }])
  }

  const totalValorLibro = activos.filter((a) => a.estado !== 'DADO_DE_BAJA').reduce((s, a) => s + a.valorLibro, 0)
  const totalDepMensual = activos.filter((a) => a.estado === 'ACTIVO').reduce((s, a) => s + a.depreciacionMensual, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Package className="w-6 h-6 text-cyan-600" />
            Activos Fijos
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Registro y depreciación mensual (línea recta)</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={cargar}><RefreshCw className="w-4 h-4 mr-1" /> Actualizar</Button>
          <Button variant="outline" size="sm" onClick={exportar}><Download className="w-4 h-4 mr-1" /> Exportar Excel</Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-1" /> Nuevo activo</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card><CardContent className="pt-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Valor en libros (total)</div>
          <div className="text-xl font-bold">{formatBs(totalValorLibro)}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Depreciación mensual estimada</div>
          <div className="text-xl font-bold">{formatBs(totalDepMensual)}</div>
        </CardContent></Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registrar activo</CardTitle>
            <CardDescription>El registro no genera asiento de compra (se asume ya contabilizado vía factura)</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-2">
              <Label>Nombre / descripción</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Laptop Dell Latitude" />
            </div>
            <div>
              <Label>Cuenta de activo</Label>
              <select className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={form.cuentaActivoId} onChange={(e) => setForm({ ...form, cuentaActivoId: e.target.value })}>
                <option value="">Selecciona...</option>
                {cuentas.map((c) => <option key={c.id} value={c.id}>{c.codigo} {c.nombre}</option>)}
              </select>
            </div>
            <div>
              <Label>Costo de adquisición (Bs.)</Label>
              <Input type="number" value={form.costoAdquisicion} onChange={(e) => setForm({ ...form, costoAdquisicion: e.target.value })} placeholder="0.00" />
            </div>
            <div>
              <Label>Fecha de adquisición</Label>
              <Input type="date" value={form.fechaAdquisicion} onChange={(e) => setForm({ ...form, fechaAdquisicion: e.target.value })} />
            </div>
            <div>
              <Label>Vida útil (meses)</Label>
              <Input type="number" value={form.vidaUtilMeses} onChange={(e) => setForm({ ...form, vidaUtilMeses: e.target.value })} />
            </div>
            <div>
              <Label>Valor residual (Bs.)</Label>
              <Input type="number" value={form.valorResidual} onChange={(e) => setForm({ ...form, valorResidual: e.target.value })} />
            </div>
            <div className="md:col-span-3 flex gap-2">
              <Button onClick={crear} disabled={guardando}>{guardando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Registrar</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generar depreciación del mes</CardTitle>
          <CardDescription>Crea un asiento único que agrupa la depreciación de todos los activos vigentes del período</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div>
            <Label>Mes</Label>
            <select className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={periodo.mes} onChange={(e) => setPeriodo({ ...periodo, mes: parseInt(e.target.value) })}>
              {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <Label>Año</Label>
            <select className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={periodo.ano} onChange={(e) => setPeriodo({ ...periodo, ano: parseInt(e.target.value) })}>
              {[2024, 2025, 2026, 2027].map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <Button onClick={generarDepreciacion} disabled={depreciando}>
            {depreciando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Generar depreciación
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Activos registrados ({activos.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800">
                <tr className="text-left">
                  <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Nombre</th>
                  <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Cuenta</th>
                  <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Costo</th>
                  <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Dep. acumulada</th>
                  <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Valor en libros</th>
                  <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-center">Estado</th>
                  <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-6 text-slate-400 dark:text-slate-500">Cargando...</td></tr>
                ) : activos.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-6 text-slate-400 dark:text-slate-500">No hay activos registrados</td></tr>
                ) : activos.map((a) => (
                  <tr key={a.id} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <td className="px-2 py-2 text-slate-700 dark:text-slate-300">{a.nombre}</td>
                    <td className="px-2 py-2 text-slate-500 dark:text-slate-400">{a.cuenta ? `${a.cuenta.codigo} ${a.cuenta.nombre}` : '—'}</td>
                    <td className="px-2 py-2 text-right font-mono">{formatBs(a.costoAdquisicion)}</td>
                    <td className="px-2 py-2 text-right font-mono">{formatBs(a.depreciacionAcumulada)}</td>
                    <td className="px-2 py-2 text-right font-mono font-semibold">{formatBs(a.valorLibro)}</td>
                    <td className="px-2 py-2 text-center">
                      <Badge variant="outline" className={
                        a.estado === 'ACTIVO' ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:border-emerald-700' :
                        a.estado === 'DEPRECIADO_TOTAL' ? 'bg-amber-100 text-amber-800 border-amber-300 dark:border-amber-700' :
                        'bg-slate-100 text-slate-600 border-slate-300 dark:border-slate-700'
                      }>{a.estado}</Badge>
                    </td>
                    <td className="px-2 py-2 text-center">
                      {a.estado !== 'DADO_DE_BAJA' && (
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => darDeBaja(a.id)} title="Dar de baja">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
