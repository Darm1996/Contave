'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatBs } from '@/lib/contabilidad/ven-nif'
import { exportarExcelCliente } from '@/lib/exports/cliente'
import { Calculator, Loader2, Info, Download } from 'lucide-react'

interface Tarifa {
  codigo: string
  concepto: string
  porcentaje: number
  baseImponiblePct: number
  requiereUT: boolean
  usoGasto: string
  notas?: string
}

interface Resultado {
  baseImponible: number
  montoRetenido: number
  aplicaRetencion: boolean
  motivo: string
  tarifa: Tarifa
  utUsada: number
}

export function ISLRPanel() {
  const [tarifas, setTarifas] = useState<Tarifa[]>([])
  const [ut, setUt] = useState(9.0)
  const [loading, setLoading] = useState(true)
  const [montoPago, setMontoPago] = useState('')
  const [tarifaSeleccionada, setTarifaSeleccionada] = useState('')
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [calculando, setCalculando] = useState(false)

  useEffect(() => {
    fetch('/api/islr/tarifas')
      .then((r) => r.json())
      .then((d) => {
        if (d.tarifas) setTarifas(d.tarifas)
        if (d.utVigente) setUt(d.utVigente)
      })
      .finally(() => setLoading(false))
  }, [])

  function exportar() {
    exportarExcelCliente(`TarifasISLR_${new Date().toISOString().slice(0, 10)}.xlsx`, [{
      nombre: 'Tarifas ISLR',
      columnas: [
        { header: 'Código', key: 'codigo', width: 10 },
        { header: 'Concepto', key: 'concepto', width: 46 },
        { header: '%', key: 'porcentaje', width: 10 },
        { header: 'Base %', key: 'baseImponiblePct', width: 10 },
        { header: 'Requiere UT', key: 'requiereUT', width: 12 },
        { header: 'Notas', key: 'notas', width: 30 },
      ],
      filas: tarifas.map((t) => ({
        codigo: t.codigo,
        concepto: t.concepto,
        porcentaje: t.porcentaje,
        baseImponiblePct: (t.baseImponiblePct ?? 0) * 100,
        requiereUT: t.requiereUT ? 'Sí' : '-',
        notas: t.notas || '',
      })),
    }])
  }

  async function calcular() {
    if (!montoPago || !tarifaSeleccionada) return
    setCalculando(true)
    const res = await fetch('/api/islr/calcular', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ montoPago: parseFloat(montoPago), tarifaCodigo: tarifaSeleccionada, utActual: ut }),
    })
    const d = await res.json()
    setResultado(d)
    setCalculando(false)
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Retenciones de ISLR</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Tabla de tarifas según Ley de ISLR (Arts. 9, 10, 27, 31) · UT vigente: <strong>Bs. {ut.toFixed(2)}</strong>
        </p>
      </div>

      {/* Calculadora interactiva */}
      <Card className="bg-gradient-to-br from-emerald-50 to-cyan-50 border-emerald-200 dark:border-emerald-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-600" /> Calculadora de retención ISLR
          </CardTitle>
          <CardDescription>Calcula cuánto debes retener según el tipo de pago</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <Label className="text-xs">Monto del pago (Bs.)</Label>
            <Input type="number" step="0.01" value={montoPago} onChange={(e) => setMontoPago(e.target.value)} placeholder="5000.00" />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Concepto / Tarifa</Label>
            <select
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              value={tarifaSeleccionada}
              onChange={(e) => setTarifaSeleccionada(e.target.value)}
            >
              <option value="">Selecciona el tipo de pago...</option>
              {tarifas.map((t) => (
                <option key={t.codigo} value={t.codigo}>
                  [{t.codigo}] {t.concepto} ({t.porcentaje}% sobre {(t.baseImponiblePct * 100).toFixed(0)}%)
                </option>
              ))}
            </select>
          </div>
          <Button onClick={calcular} disabled={calculando || !montoPago || !tarifaSeleccionada}>
            {calculando ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Calculator className="w-4 h-4 mr-1" />}
            Calcular
          </Button>
        </CardContent>
        {resultado && (
          <CardContent className="pt-0">
            <div className="bg-white dark:bg-slate-900 rounded-md p-4 border border-emerald-200 dark:border-emerald-800 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Base imponible</div>
                <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{formatBs(resultado.baseImponible)}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">({(resultado.tarifa.baseImponiblePct * 100).toFixed(0)}% del pago)</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Porcentaje</div>
                <div className="text-lg font-bold text-emerald-700">{resultado.tarifa.porcentaje}%</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">sobre base imponible</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Monto a retener</div>
                <div className={`text-2xl font-bold ${resultado.aplicaRetencion ? 'text-amber-700' : 'text-slate-400 dark:text-slate-500'}`}>
                  {resultado.aplicaRetencion ? formatBs(resultado.montoRetenido) : 'Bs. 0.00'}
                </div>
              </div>
              <div className="flex items-center">
                <Badge variant={resultado.aplicaRetencion ? 'default' : 'secondary'}>
                  {resultado.aplicaRetencion ? 'Sí retiene' : 'No retiene'}
                </Badge>
              </div>
              {!resultado.aplicaRetencion && (
                <div className="md:col-span-4 text-xs text-amber-700 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                  <Info className="w-3 h-3 inline mr-1" /> {resultado.motivo}
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Tabla completa de tarifas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Tabla de tarifas ISLR — SENIAT</CardTitle>
          <Button variant="outline" size="sm" onClick={exportar}><Download className="w-4 h-4 mr-1" /> Exportar Excel</Button>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10">
                <tr className="text-left">
                  <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Cod.</th>
                  <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Concepto</th>
                  <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">%</th>
                  <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Base</th>
                  <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">UT mín</th>
                  <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Notas</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-400 dark:text-slate-500">Cargando...</td></tr>
                ) : tarifas.map((t) => (
                  <tr key={t.codigo} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <td className="px-3 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">{t.codigo}</td>
                    <td className="px-3 py-2 text-slate-800 dark:text-slate-100">{t.concepto}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-emerald-700">
                      {t.porcentaje === 0 ? 'N/A' : `${t.porcentaje}%`}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-600 dark:text-slate-400">
                      {(t.baseImponiblePct * 100).toFixed(0)}%
                    </td>
                    <td className="px-3 py-2 text-center">
                      {t.requiereUT ? <Badge variant="outline" className="text-xs">Sí (1 UT)</Badge> : <span className="text-xs text-slate-400 dark:text-slate-500">—</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 italic">{t.notas || ''}</td>
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
