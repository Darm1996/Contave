'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { formatBs } from '@/lib/contabilidad/ven-nif'
import { apiFetch, useApp } from '@/lib/store'
import { exportarExcelCliente } from '@/lib/exports/cliente'
import { toast } from 'sonner'
import { TableScrollHint } from '@/components/ui/table-scroll-hint'
import { FileSpreadsheet, RefreshCw, Loader2, Download } from 'lucide-react'

interface Empleado { id: string; nombre: string; cedula: string; salarioBase: number }
interface NominaDetalle {
  id: string
  empleadoId: string
  empleado: Empleado
  salarioBase: number
  bonoAlimentacion: number
  totalDeducciones: number
  netoAPagar: number
}
interface NominaListItem { id: string; mes: number; ano: number; estado: string; totalNeto: number }
interface NominaCompleta extends NominaListItem {
  totalSueldos: number; totalBonoAlimentacion: number; totalAportesPatronales: number
  totalPrestaciones: number; totalUtilidades: number
  detalles: NominaDetalle[]
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export function Nomina() {
  const { user, empresaActiva } = useApp()
  const puedeProcesar = empresaActiva?.rol === 'ADMIN' || empresaActiva?.rol === 'CONTADOR' || user?.role === 'SUPER_ADMIN'
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [nominas, setNominas] = useState<NominaListItem[]>([])
  const [detalle, setDetalle] = useState<NominaCompleta | null>(null)
  const [periodo, setPeriodo] = useState({ mes: new Date().getMonth() + 1, ano: new Date().getFullYear() })
  const [overrides, setOverrides] = useState<Record<string, { diasTrabajados: string; bonoAlimentacion: string }>>({})
  const [procesando, setProcesando] = useState(false)
  const [loading, setLoading] = useState(true)

  async function cargar() {
    setLoading(true)
    const [rE, rN] = await Promise.all([apiFetch('/api/empleados'), apiFetch('/api/nomina')])
    if (rE.ok) {
      const activos = rE.data.empleados.filter((e: any) => e.activo)
      setEmpleados(activos)
      setOverrides((prev) => {
        const next = { ...prev }
        for (const e of activos) if (!next[e.id]) next[e.id] = { diasTrabajados: '30', bonoAlimentacion: '0' }
        return next
      })
    }
    if (rN.ok) setNominas(rN.data.nominas)
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  async function verDetalle(id: string) {
    const r = await apiFetch<{ nomina: NominaCompleta }>(`/api/nomina/${id}`)
    if (r.ok && r.data) setDetalle(r.data.nomina)
  }

  async function procesar() {
    setProcesando(true)
    const body = {
      mes: periodo.mes,
      ano: periodo.ano,
      overrides: empleados.map((e) => ({
        empleadoId: e.id,
        diasTrabajados: parseFloat(overrides[e.id]?.diasTrabajados || '30'),
        bonoAlimentacion: parseFloat(overrides[e.id]?.bonoAlimentacion || '0'),
      })),
    }
    const r = await apiFetch<{ nomina: NominaCompleta }>('/api/nomina/procesar', { method: 'POST', body: JSON.stringify(body) })
    setProcesando(false)
    if (r.ok && r.data) {
      toast.success(`Nómina procesada: neto ${formatBs(r.data.nomina.totalNeto)}`)
      setDetalle(r.data.nomina)
      cargar()
    } else {
      toast.error(r.error || 'Error al procesar la nómina')
    }
  }

  function exportar() {
    if (!detalle) return
    exportarExcelCliente(`Nomina_${MESES[detalle.mes - 1]}_${detalle.ano}.xlsx`, [{
      nombre: 'Nómina',
      columnas: [
        { header: 'Cédula', key: 'cedula', width: 14 },
        { header: 'Nombre', key: 'nombre', width: 26 },
        { header: 'Salario', key: 'salario', width: 14, numFmt: '#,##0.00' },
        { header: 'Bono alimentación', key: 'bono', width: 16, numFmt: '#,##0.00' },
        { header: 'Deducciones', key: 'deducciones', width: 14, numFmt: '#,##0.00' },
        { header: 'Neto a pagar', key: 'neto', width: 16, numFmt: '#,##0.00' },
      ],
      filas: detalle.detalles.map((d) => ({
        cedula: d.empleado.cedula, nombre: d.empleado.nombre, salario: d.salarioBase,
        bono: d.bonoAlimentacion, deducciones: d.totalDeducciones, neto: d.netoAPagar,
      })),
    }])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-cyan-600" />
            Procesar Nómina
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">IVSS, FAOV, INCES, bono de alimentación, prestaciones y utilidades (provisión simplificada)</p>
        </div>
        <Button variant="outline" size="sm" onClick={cargar}><RefreshCw className="w-4 h-4 mr-1" /> Actualizar</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nueva nómina</CardTitle>
          <CardDescription>Ajusta días trabajados y bono de alimentación por empleado si aplica</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Mes</label>
              <select className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={periodo.mes} onChange={(e) => setPeriodo({ ...periodo, mes: parseInt(e.target.value) })}>
                {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Año</label>
              <select className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={periodo.ano} onChange={(e) => setPeriodo({ ...periodo, ano: parseInt(e.target.value) })}>
                {[2024, 2025, 2026, 2027].map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            {puedeProcesar && (
              <Button onClick={procesar} disabled={procesando || empleados.length === 0}>
                {procesando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Procesar nómina
              </Button>
            )}
          </div>

          <TableScrollHint />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800">
                <tr className="text-left">
                  <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Empleado</th>
                  <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Salario</th>
                  <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-center">Días trabajados</th>
                  <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-center">Bono alimentación</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="text-center py-4 text-slate-400 dark:text-slate-500">Cargando...</td></tr>
                ) : empleados.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-4 text-slate-400 dark:text-slate-500">No hay empleados activos. Regístralos en "Empleados".</td></tr>
                ) : empleados.map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="px-2 py-2 text-slate-700 dark:text-slate-300">{e.nombre}</td>
                    <td className="px-2 py-2 text-right font-mono">{formatBs(e.salarioBase)}</td>
                    <td className="px-2 py-2 text-center">
                      <Input type="number" className="h-7 w-20 mx-auto text-center" value={overrides[e.id]?.diasTrabajados || '30'}
                        onChange={(ev) => setOverrides({ ...overrides, [e.id]: { ...overrides[e.id], diasTrabajados: ev.target.value } })} />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <Input type="number" className="h-7 w-24 mx-auto text-center" value={overrides[e.id]?.bonoAlimentacion || '0'}
                        onChange={(ev) => setOverrides({ ...overrides, [e.id]: { ...overrides[e.id], bonoAlimentacion: ev.target.value } })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Nóminas procesadas ({nominas.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {nominas.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 col-span-full text-center py-4">Sin nóminas procesadas aún</p>
            ) : nominas.map((n) => (
              <Card key={n.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => verDetalle(n.id)}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-1">
                    <Badge className="bg-emerald-100 text-emerald-800">{n.estado}</Badge>
                  </div>
                  <h3 className="font-semibold text-sm">{MESES[n.mes - 1]} {n.ano}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Neto: {formatBs(n.totalNeto)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {detalle && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
              <span>Detalle — {MESES[detalle.mes - 1]} {detalle.ano}</span>
              <Button variant="outline" size="sm" onClick={exportar}><Download className="w-4 h-4 mr-1" /> Exportar Excel</Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                <div className="text-xs text-slate-500 dark:text-slate-400">Total sueldos</div>
                <div className="text-lg font-bold">{formatBs(detalle.totalSueldos)}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                <div className="text-xs text-slate-500 dark:text-slate-400">Aportes patronales</div>
                <div className="text-lg font-bold">{formatBs(detalle.totalAportesPatronales)}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                <div className="text-xs text-slate-500 dark:text-slate-400">Prestaciones + utilidades</div>
                <div className="text-lg font-bold">{formatBs(detalle.totalPrestaciones + detalle.totalUtilidades)}</div>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-md">
                <div className="text-xs text-slate-500 dark:text-slate-400">Neto a pagar</div>
                <div className="text-lg font-bold text-emerald-700">{formatBs(detalle.totalNeto)}</div>
              </div>
            </div>
            <TableScrollHint />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800">
                  <tr className="text-left">
                    <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Empleado</th>
                    <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Salario</th>
                    <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Deducciones</th>
                    <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Neto</th>
                  </tr>
                </thead>
                <tbody>
                  {detalle.detalles.map((d) => (
                    <tr key={d.id} className="border-t">
                      <td className="px-2 py-2 text-slate-700 dark:text-slate-300">{d.empleado.nombre}</td>
                      <td className="px-2 py-2 text-right font-mono">{formatBs(d.salarioBase)}</td>
                      <td className="px-2 py-2 text-right font-mono text-red-700">{formatBs(d.totalDeducciones)}</td>
                      <td className="px-2 py-2 text-right font-mono font-semibold">{formatBs(d.netoAPagar)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
