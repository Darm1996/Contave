'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { formatBs } from '@/lib/contabilidad/ven-nif'
import { apiFetch } from '@/lib/store'
import { toast } from 'sonner'
import { TrendingUp, RefreshCw, Loader2, AlertTriangle } from 'lucide-react'

interface Indice { id: string; mes: number; ano: number; indice: number; fuente: string }
interface Ajuste {
  id: string; mes: number; ano: number; indiceInicial: number; indiceFinal: number
  factorReexpresion: number; totalReexpresadoActivos: number; resultadoExposicionInflacion: number; estado: string
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export function AjusteInflacion() {
  const [indices, setIndices] = useState<Indice[]>([])
  const [ajustes, setAjustes] = useState<Ajuste[]>([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState({ mes: new Date().getMonth() + 1, ano: new Date().getFullYear() })
  const [indiceInput, setIndiceInput] = useState('')
  const [guardandoIndice, setGuardandoIndice] = useState(false)
  const [calculando, setCalculando] = useState(false)

  async function cargar() {
    setLoading(true)
    const [rI, rA] = await Promise.all([apiFetch('/api/indice-inflacion'), apiFetch('/api/ajuste-inflacion')])
    if (rI.ok) setIndices(rI.data.indices)
    if (rA.ok) setAjustes(rA.data.ajustes)
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  async function guardarIndice() {
    if (!indiceInput) { toast.error('Ingresa el valor del índice'); return }
    setGuardandoIndice(true)
    const r = await apiFetch('/api/indice-inflacion', {
      method: 'POST',
      body: JSON.stringify({ mes: periodo.mes, ano: periodo.ano, indice: parseFloat(indiceInput) }),
    })
    setGuardandoIndice(false)
    if (r.ok) { toast.success('Índice guardado'); setIndiceInput(''); cargar() }
    else toast.error(r.error || 'Error al guardar el índice')
  }

  async function calcular() {
    setCalculando(true)
    const r = await apiFetch('/api/ajuste-inflacion', { method: 'POST', body: JSON.stringify(periodo) })
    setCalculando(false)
    if (r.ok) { toast.success('Ajuste por inflación generado'); cargar() }
    else toast.error(r.error || 'Error al generar el ajuste')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-amber-600" />
            Ajuste por Inflación
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Reexpresión simplificada (nivel general de precios)</p>
        </div>
        <Button variant="outline" size="sm" onClick={cargar}><RefreshCw className="w-4 h-4 mr-1" /> Actualizar</Button>
      </div>

      <Alert>
        <AlertTriangle className="w-4 h-4" />
        <AlertDescription className="text-sm">
          Este módulo usa un método simplificado (compara el índice de inflación mes a mes contra los saldos actuales de
          las cuentas no monetarias), no el método de capas históricas por activo. Para fines de declaración fiscal formal,
          verifica el resultado con tu contador.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cargar índice de inflación del mes</CardTitle>
            <CardDescription>Necesitas el índice del mes actual y del mes anterior para poder calcular el ajuste</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
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
              <div>
                <Label>Índice</Label>
                <Input type="number" step="0.0001" value={indiceInput} onChange={(e) => setIndiceInput(e.target.value)} placeholder="Ej. 1250.34" />
              </div>
            </div>
            <Button onClick={guardarIndice} disabled={guardandoIndice}>
              {guardandoIndice && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Guardar índice
            </Button>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[300px] text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800">
                  <tr className="text-left"><th className="px-2 py-1">Período</th><th className="px-2 py-1 text-right">Índice</th></tr>
                </thead>
                <tbody>
                  {indices.slice(0, 6).map((i) => (
                    <tr key={i.id} className="border-t"><td className="px-2 py-1">{MESES[i.mes - 1]} {i.ano}</td><td className="px-2 py-1 text-right font-mono">{i.indice}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generar ajuste del período</CardTitle>
            <CardDescription>Crea el asiento de reexpresión y el REI sobre la posición monetaria neta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={calcular} disabled={calculando}>
              {calculando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Generar ajuste para {MESES[periodo.mes - 1]} {periodo.ano}
            </Button>
            <div className="space-y-2">
              {loading ? (
                <p className="text-sm text-slate-400 dark:text-slate-500">Cargando...</p>
              ) : ajustes.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500">Sin ajustes generados aún</p>
              ) : ajustes.map((a) => (
                <div key={a.id} className="border rounded-md p-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{MESES[a.mes - 1]} {a.ano}</span>
                    <Badge variant="outline">{a.estado}</Badge>
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">Factor: {a.factorReexpresion.toFixed(4)} ({a.indiceInicial} → {a.indiceFinal})</div>
                  <div>Reexpresión no monetaria: {formatBs(a.totalReexpresadoActivos)}</div>
                  <div className={a.resultadoExposicionInflacion >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                    REI: {formatBs(a.resultadoExposicionInflacion)} ({a.resultadoExposicionInflacion >= 0 ? 'ganancia' : 'pérdida'})
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
