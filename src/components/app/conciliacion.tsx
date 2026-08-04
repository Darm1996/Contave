'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatBs } from '@/lib/contabilidad/ven-nif'
import { useApp, apiFetch } from '@/lib/store'
import { exportarExcelCliente } from '@/lib/exports/cliente'
import { toast } from 'sonner'
import { Landmark, RefreshCw, Plus, Upload, Check, X, Loader2, CheckCircle2, AlertTriangle, Download } from 'lucide-react'

interface Cuenta {
  id: string
  codigo: string
  nombre: string
  uso: string
}

interface Conciliacion {
  id: string
  empresaId: string
  cuentaId: string
  mes: number
  ano: number
  saldoInicialLibro: number
  saldoInicialBanco: number
  saldoFinalLibro: number
  saldoFinalBanco: number
  depositosEnTransito: number
  chequesPendientes: number
  notasCredito: number
  notasDebito: number
  estado: string
  diferencia: number
  cuenta?: Cuenta
  movimientos?: Movimiento[]
  _count?: { movimientos: number }
}

interface Movimiento {
  id: string
  fecha: string
  descripcion: string
  referencia: string | null
  monto: number
  tipo: string
  conciliado: boolean
}

interface ConciliacionListItem {
  id: string
  mes: number
  ano: number
  estado: string
  diferencia: number
  cuenta: Cuenta
  _count: { movimientos: number }
}

export function Conciliacion() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [conciliaciones, setConciliaciones] = useState<ConciliacionListItem[]>([])
  const [seleccionada, setSeleccionada] = useState<Conciliacion | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    cuentaId: '',
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear(),
    saldoInicialBanco: '',
    saldoFinalBanco: '',
  })
  const [extracto, setExtracto] = useState('')
  const [cargandoMov, setCargandoMov] = useState(false)

  async function cargarCuentas() {
    const r = await apiFetch('/api/cuentas/bancos')
    if (r.ok) setCuentas(r.data.cuentas)
  }

  async function cargarConciliaciones() {
    setLoading(true)
    const r = await apiFetch('/api/conciliacion')
    if (r.ok) setConciliaciones(r.data.conciliaciones)
    setLoading(false)
  }

  useEffect(() => {
    cargarCuentas()
    cargarConciliaciones()
  }, [])

  async function crearConciliacion() {
    if (!form.cuentaId) {
      toast.error('Selecciona una cuenta de banco')
      return
    }
    const body: any = {
      cuentaId: form.cuentaId,
      mes: form.mes,
      ano: form.ano,
      saldoInicialBanco: parseFloat(form.saldoInicialBanco) || 0,
      saldoFinalBanco: parseFloat(form.saldoFinalBanco) || 0,
    }
    const r = await apiFetch('/api/conciliacion', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    if (r.ok) {
      toast.success('Conciliación creada')
      setShowForm(false)
      setForm({ ...form, saldoInicialBanco: '', saldoFinalBanco: '' })
      cargarConciliaciones()
      verDetalle(r.data.conciliacion.id)
    } else {
      toast.error(r.error || 'Error')
    }
  }

  async function verDetalle(id: string) {
    const r = await apiFetch<{ conciliacion: Conciliacion }>(`/api/conciliacion/${id}`)
    if (r.ok && r.data) setSeleccionada(r.data.conciliacion)
  }

  async function cargarExtracto() {
    if (!seleccionada) return
    if (!extracto.trim()) {
      toast.error('Pega los movimientos del extracto bancario')
      return
    }
    setCargandoMov(true)
    try {
      // Parsear texto pegado: cada línea = "fecha|descripcion|monto" o "fecha,descripcion,monto" o tab-separated
      const lineas = extracto.trim().split('\n')
      const movs = lineas.map((linea) => {
        const parts = linea.split(/[,\t|]/).map((p) => p.trim())
        if (parts.length < 3) return null
        const [fecha, descripcion, montoStr] = parts
        const monto = parseFloat(montoStr.replace(/[^\d.-]/g, ''))
        if (isNaN(monto)) return null
        return { fecha, descripcion, monto }
      }).filter(Boolean) as Array<{ fecha: string; descripcion: string; monto: number }>

      if (movs.length === 0) {
        toast.error('No se pudieron parsear los movimientos. Usa formato: fecha, descripción, monto (uno por línea)')
        setCargandoMov(false)
        return
      }

      const r = await apiFetch(`/api/conciliacion/${seleccionada.id}/movimientos`, {
        method: 'POST',
        body: JSON.stringify({ movimientos: movs }),
      })
      if (r.ok) {
        toast.success(`${r.data.cargados} movimientos cargados, ${r.data.conciliados} auto-conciliados`)
        setExtracto('')
        verDetalle(seleccionada.id)
        cargarConciliaciones()
      } else {
        toast.error(r.error || 'Error')
      }
    } catch (e: any) {
      toast.error(e.message)
    }
    setCargandoMov(false)
  }

  function exportar() {
    if (!seleccionada) return
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
    exportarExcelCliente(`Conciliacion_${seleccionada.cuenta?.codigo}_${meses[seleccionada.mes - 1]}_${seleccionada.ano}.xlsx`, [{
      nombre: 'Conciliación Bancaria',
      columnas: [
        { header: 'Fecha', key: 'fecha', width: 14 },
        { header: 'Descripción', key: 'descripcion', width: 32 },
        { header: 'Referencia', key: 'referencia', width: 16 },
        { header: 'Monto', key: 'monto', width: 16, numFmt: '#,##0.00' },
        { header: 'Estado', key: 'estado', width: 14 },
      ],
      filas: (seleccionada.movimientos || []).map((m) => ({
        fecha: new Date(m.fecha).toLocaleDateString('es-VE'),
        descripcion: m.descripcion,
        referencia: m.referencia || '',
        monto: m.monto,
        estado: m.conciliado ? 'Conciliado' : 'Pendiente',
      })),
    }])
  }

  async function toggleMovimiento(movId: string) {
    const r = await apiFetch(`/api/conciliacion/${seleccionada!.id}/movimiento/${movId}/toggle`, {
      method: 'POST',
      body: JSON.stringify({}),
    })
    if (r.ok) {
      verDetalle(seleccionada!.id)
      cargarConciliaciones()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Landmark className="w-6 h-6 text-cyan-600" />
            Conciliación Bancaria
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Compara extracto bancario con libro contable</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={cargarConciliaciones}>
            <RefreshCw className="w-4 h-4 mr-1" /> Actualizar
          </Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-1" /> Nueva conciliación
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Crear conciliación</CardTitle>
            <CardDescription>Selecciona la cuenta de banco, mes y año a conciliar</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div className="md:col-span-2">
              <Label>Cuenta de banco</Label>
              <select
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                value={form.cuentaId}
                onChange={(e) => setForm({ ...form, cuentaId: e.target.value })}
              >
                <option value="">Selecciona...</option>
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>{c.codigo} {c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Mes</Label>
              <select
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                value={form.mes}
                onChange={(e) => setForm({ ...form, mes: parseInt(e.target.value) })}
              >
                {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Año</Label>
              <select
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                value={form.ano}
                onChange={(e) => setForm({ ...form, ano: parseInt(e.target.value) })}
              >
                {[2024, 2025, 2026, 2027].map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <Label>Saldo final banco (Bs.)</Label>
              <Input type="number" value={form.saldoFinalBanco} onChange={(e) => setForm({ ...form, saldoFinalBanco: e.target.value })} placeholder="0.00" />
            </div>
            <div className="md:col-span-5 flex gap-2">
              <Button onClick={crearConciliacion}>Crear</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de conciliaciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? (
          <Card><CardContent className="text-center py-6 text-slate-400 dark:text-slate-500">Cargando...</CardContent></Card>
        ) : conciliaciones.length === 0 ? (
          <Card><CardContent className="text-center py-6 text-slate-400 dark:text-slate-500">No hay conciliaciones. Crea la primera.</CardContent></Card>
        ) : conciliaciones.map((c) => (
          <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => verDetalle(c.id)}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <Badge variant={c.estado === 'CUADRADO' ? 'default' : 'secondary'}
                  className={c.estado === 'CUADRADO' ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:border-emerald-700' : 'bg-amber-100 text-amber-800 border-amber-300 dark:border-amber-700'}>
                  {c.estado === 'CUADRADO' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                  {c.estado}
                </Badge>
                <span className="text-xs text-slate-500 dark:text-slate-400">{c._count.movimientos} mov.</span>
              </div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][c.mes - 1]} {c.ano}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{c.cuenta.codigo} {c.cuenta.nombre}</p>
              {c.diferencia !== 0 && (
                <p className="text-xs text-amber-700 mt-1">Diferencia: {formatBs(c.diferencia)}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detalle de conciliación seleccionada */}
      {seleccionada && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
              <span>
                Conciliación — {seleccionada.cuenta?.codigo} {seleccionada.cuenta?.nombre}
                <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
                  {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][seleccionada.mes - 1]} {seleccionada.ano}
                </span>
              </span>
              <div className="flex items-center gap-2">
                <Badge variant={seleccionada.estado === 'CUADRADO' ? 'default' : 'secondary'}
                  className={seleccionada.estado === 'CUADRADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
                  {seleccionada.estado}
                </Badge>
                <Button variant="outline" size="sm" onClick={exportar}><Download className="w-4 h-4 mr-1" /> Exportar Excel</Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Resumen de saldos */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                <div className="text-xs text-slate-500 dark:text-slate-400">Saldo inicial banco</div>
                <div className="text-lg font-bold">{formatBs(seleccionada.saldoInicialBanco)}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                <div className="text-xs text-slate-500 dark:text-slate-400">Saldo final banco</div>
                <div className="text-lg font-bold">{formatBs(seleccionada.saldoFinalBanco)}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                <div className="text-xs text-slate-500 dark:text-slate-400">Saldo final libro</div>
                <div className="text-lg font-bold">{formatBs(seleccionada.saldoFinalLibro)}</div>
              </div>
              <div className={`p-3 rounded-md ${seleccionada.diferencia === 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
                <div className="text-xs text-slate-500 dark:text-slate-400">Diferencia</div>
                <div className={`text-lg font-bold ${seleccionada.diferencia === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {formatBs(seleccionada.diferencia)}
                </div>
              </div>
            </div>

            {/* Partidas pendientes */}
            {(seleccionada.depositosEnTransito > 0 || seleccionada.chequesPendientes > 0) && (
              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription className="text-sm">
                  <strong>Partidas pendientes:</strong>
                  <ul className="mt-1 space-y-0.5">
                    {seleccionada.depositosEnTransito > 0 && (
                      <li>• Depósitos en tránsito: <strong>{formatBs(seleccionada.depositosEnTransito)}</strong></li>
                    )}
                    {seleccionada.chequesPendientes > 0 && (
                      <li>• Cheques pendientes: <strong>{formatBs(seleccionada.chequesPendientes)}</strong></li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Cargar extracto */}
            <div className="border rounded-md p-3 bg-cyan-50/30 dark:bg-cyan-900/20">
              <Label className="text-sm font-semibold">Cargar movimientos del extracto bancario</Label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                Pega los movimientos del extracto bancario. Formato: <code className="bg-white dark:bg-slate-900 px-1 rounded">fecha, descripción, monto</code> (uno por línea).
                El sistema auto-conciliará los que coincidan con asientos del libro.
              </p>
              <textarea
                className="w-full h-24 p-2 border rounded-md text-xs font-mono"
                placeholder="01/07/2026, Depósito cliente, 5000.00&#10;05/07/2026, Cheque 00123, -1200.00&#10;10/07/2026, Transferencia, -3500.00"
                value={extracto}
                onChange={(e) => setExtracto(e.target.value)}
              />
              <Button size="sm" onClick={cargarExtracto} disabled={cargandoMov} className="mt-2">
                {cargandoMov ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
                Cargar movimientos
              </Button>
            </div>

            {/* Lista de movimientos */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">
                Movimientos del banco ({seleccionada.movimientos?.length || 0})
              </Label>
              <div className="overflow-x-auto">
              <ScrollArea className="h-[400px] border rounded-md">
                <table className="w-full min-w-[500px] text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                    <tr className="text-left">
                      <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Fecha</th>
                      <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Descripción</th>
                      <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Monto</th>
                      <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-center">Estado</th>
                      <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!seleccionada.movimientos || seleccionada.movimientos.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-6 text-slate-400 dark:text-slate-500">Sin movimientos cargados</td></tr>
                    ) : seleccionada.movimientos.map((m) => (
                      <tr key={m.id} className={`border-t hover:bg-slate-50 dark:hover:bg-slate-800/60 ${m.conciliado ? 'bg-emerald-50/30 dark:bg-emerald-900/20' : ''}`}>
                        <td className="px-2 py-2 text-slate-600 dark:text-slate-400">{new Date(m.fecha).toLocaleDateString('es-VE')}</td>
                        <td className="px-2 py-2 text-slate-700 dark:text-slate-300">{m.descripcion}</td>
                        <td className={`px-2 py-2 text-right font-mono ${m.monto >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                          {m.monto >= 0 ? '+' : ''}{formatBs(m.monto)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {m.conciliado
                            ? <Badge className="bg-emerald-100 text-emerald-800 text-xs"><Check className="w-3 h-3 mr-1" /> Conciliado</Badge>
                            : <Badge variant="secondary" className="text-xs">Pendiente</Badge>}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => toggleMovimiento(m.id)}
                          >
                            {m.conciliado ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
