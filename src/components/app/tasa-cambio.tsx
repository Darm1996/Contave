'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useApp, apiFetch } from '@/lib/store'
import { toast } from 'sonner'
import { DollarSign, Plus, RefreshCw, DownloadCloud, Loader2, Info } from 'lucide-react'

interface Tasa {
  id: string
  fecha: string
  monedaRef: string
  tasa: number
  fuente: string
}

export function TasaCambio() {
  const { empresaActiva } = useApp()
  const [tasas, setTasas] = useState<Tasa[]>([])
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [tasa, setTasa] = useState('')
  const [fuente, setFuente] = useState('BCV')
  const [loading, setLoading] = useState(true)
  const [bcvLoading, setBcvLoading] = useState(false)
  const [bcvPreview, setBcvPreview] = useState<{tasa: number; fecha: string; fuente: string} | null>(null)

  async function cargar() {
    setLoading(true)
    const r = await apiFetch<{ tasas: Tasa[] }>('/api/tasa-cambio')
    if (r.ok && r.data) setTasas(r.data.tasas)
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  async function guardar() {
    if (!fecha || !tasa) {
      toast.error('Fecha y tasa son requeridas')
      return
    }
    const r = await apiFetch('/api/tasa-cambio', {
      method: 'POST',
      body: JSON.stringify({ fecha, tasa: parseFloat(tasa), monedaRef: 'USD', fuente }),
    })
    if (r.ok) {
      toast.success('Tasa guardada')
      setTasa('')
      cargar()
    } else {
      toast.error(r.error || 'Error')
    }
  }

  async function consultarBCV() {
    setBcvLoading(true)
    try {
      const r = await apiFetch<{ ok: boolean; tasa: { tasa: number; fecha: string; fuente: string } | null; error?: string }>('/api/tasa-cambio/bcv')
      if (r.ok && r.data?.ok && r.data.tasa) {
        setBcvPreview(r.data.tasa)
        // Pre-llenar el formulario con la tasa obtenida
        setTasa(String(r.data.tasa.tasa))
        setFecha(new Date(r.data.tasa.fecha).toISOString().slice(0, 10))
        setFuente(r.data.tasa.fuente)
        toast.success(`Tasa BCV obtenida: Bs. ${r.data.tasa.tasa.toFixed(2)}`)
      } else {
        toast.error(r.data?.error || 'No se pudo obtener la tasa del BCV')
      }
    } catch (e: any) {
      toast.error('Error de conexión con BCV')
    }
    setBcvLoading(false)
  }

  async function guardarBCV() {
    if (!bcvPreview) return
    setBcvLoading(true)
    try {
      const r = await apiFetch('/api/tasa-cambio/bcv', { method: 'POST' })
      if (r.ok && r.data?.ok) {
        toast.success(`Tasa BCV guardada: Bs. ${r.data.tasa.tasa.toFixed(2)}`)
        setBcvPreview(null)
        cargar()
      } else {
        toast.error(r.data?.error || 'Error al guardar')
      }
    } catch (e: any) {
      toast.error('Error al guardar')
    }
    setBcvLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Tasa de Cambio BCV</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Administra las tasas USD/Bs. para conversión de facturas en dólares</p>
        </div>
        <Button variant="outline" size="sm" onClick={cargar}><RefreshCw className="w-4 h-4 mr-1" /> Actualizar</Button>
      </div>

      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white">
        <CardContent className="pt-6 flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-300 mb-1">Tasa más reciente</div>
            {tasas.length > 0 ? (
              <>
                <div className="text-3xl font-bold">Bs. {tasas[0].tasa.toFixed(2)}</div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  {new Date(tasas[0].fecha).toLocaleDateString('es-VE')} · {tasas[0].fuente}
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-400 dark:text-slate-500">Sin tasas registradas</div>
            )}
          </div>
          <DollarSign className="w-12 h-12 text-emerald-400" />
        </CardContent>
      </Card>

      {/* Scraping BCV automático */}
      <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DownloadCloud className="w-4 h-4 text-emerald-600" /> Obtener tasa automática del BCV
          </CardTitle>
          <CardDescription>
            Consulta y guarda la tasa oficial desde <a href="https://www.bcv.org.ve/estadisticas/tipo-de-cambio" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline">bcv.org.ve</a> sin salir de la app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={consultarBCV} disabled={bcvLoading} variant="outline">
              {bcvLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <DownloadCloud className="w-4 h-4 mr-1" />}
              Consultar BCV
            </Button>
            {bcvPreview && (
              <>
                <Button onClick={guardarBCV} disabled={bcvLoading} className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 mr-1" /> Guardar en base de datos
                </Button>
                <Badge variant="outline" className="text-emerald-700 border-emerald-300 dark:border-emerald-700 self-center">
                  {bcvPreview.fuente === 'BCV-fallback' ? '⚠ Tasa de respaldo (BCV no respondió)' : '✓ Tasa actual del BCV'}
                </Badge>
              </>
            )}
          </div>
          {bcvPreview && (
            <Alert className="bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800">
              <Info className="w-4 h-4 text-emerald-600" />
              <AlertDescription>
                Tasa obtenida: <strong>Bs. {bcvPreview.tasa.toFixed(2)}</strong> · Fecha: {new Date(bcvPreview.fecha).toLocaleDateString('es-VE')} · Fuente: {bcvPreview.fuente}
                {bcvPreview.fuente === 'BCV-fallback' && (
                  <span className="block text-xs text-amber-700 mt-1">
                    El BCV no respondió (posible bloqueo de red o CORS). Se usó una tasa de referencia.
                    Puedes editar el valor manualmente y guardar.
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registrar nueva tasa manualmente</CardTitle>
          <CardDescription>Si la factura está en USD y la empresa en Bs., se usará la tasa vigente a la fecha de emisión</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div>
            <Label>Tasa (Bs. por 1 USD)</Label>
            <Input type="number" step="0.01" value={tasa} onChange={(e) => setTasa(e.target.value)} placeholder="145.50" />
          </div>
          <div>
            <Label>Fuente</Label>
            <select className="w-full h-9 px-3 rounded-md border border-input bg-background" value={fuente} onChange={(e) => setFuente(e.target.value)}>
              <option value="BCV">BCV (oficial)</option>
              <option value="MANUAL">Manual</option>
              <option value="PARALELO">Paralelo</option>
            </select>
          </div>
          <Button onClick={guardar}><Plus className="w-4 h-4 mr-1" /> Guardar</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de tasas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
                <tr className="text-left">
                  <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Fecha</th>
                  <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Moneda</th>
                  <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Tasa (Bs.)</th>
                  <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Fuente</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="text-center py-8 text-slate-400 dark:text-slate-500">Cargando...</td></tr>
                ) : tasas.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-slate-400 dark:text-slate-500">Sin tasas registradas</td></tr>
                ) : tasas.map((t) => (
                  <tr key={t.id} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{new Date(t.fecha).toLocaleDateString('es-VE')}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{t.monedaRef}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-slate-800 dark:text-slate-100">{t.tasa.toFixed(2)}</td>
                    <td className="px-3 py-2"><span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">{t.fuente}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
