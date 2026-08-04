'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatBs } from '@/lib/contabilidad/ven-nif'
import { exportarExcelCliente } from '@/lib/exports/cliente'
import { FileText, RefreshCw, Download } from 'lucide-react'

interface Fila {
  fecha: string
  ncf: string
  numeroFactura: string
  rifBeneficiario: string
  nombreBeneficiario: string
  concepto: string
  tarifaCodigo: string
  baseImponible: number
  porcentajeRetencion: number
  montoRetenido: number
  montoTotalOperacion: number
}

interface Reporte {
  mes: number
  ano: number
  mesNombre: string
  filas: Fila[]
  totalOperaciones: number
  totalBaseImponible: number
  totalRetenido: number
  totalOperacionesMonetarias: number
  resumenPorTarifa: Array<{
    tarifaCodigo: string
    concepto: string
    porcentaje: number
    cantidad: number
    baseImponible: number
    montoRetenido: number
  }>
}

export function ReporteISLR() {
  const [reporte, setReporte] = useState<Reporte | null>(null)
  const [loading, setLoading] = useState(true)
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [ano, setAno] = useState(new Date().getFullYear())

  async function cargar() {
    setLoading(true)
    const r = await fetch(`/api/islr/reporte?mes=${mes}&ano=${ano}`)
    const d = await r.json()
    if (!d.error) setReporte(d.reporte)
    setLoading(false)
  }

  useEffect(() => { cargar() }, [mes, ano])

  function exportar() {
    if (!reporte) return
    exportarExcelCliente(`RetencionesISLR_${reporte.mesNombre}_${reporte.ano}.xlsx`, [{
      nombre: 'Retenciones ISLR',
      columnas: [
        { header: 'Fecha', key: 'fecha', width: 14 },
        { header: 'NCF', key: 'ncf', width: 16 },
        { header: 'N° Factura', key: 'numeroFactura', width: 14 },
        { header: 'RIF Beneficiario', key: 'rifBeneficiario', width: 16 },
        { header: 'Beneficiario', key: 'nombreBeneficiario', width: 28 },
        { header: 'Concepto', key: 'concepto', width: 24 },
        { header: 'Código tarifa', key: 'tarifaCodigo', width: 12 },
        { header: 'Base imponible', key: 'baseImponible', width: 16, numFmt: '#,##0.00' },
        { header: '%', key: 'porcentajeRetencion', width: 10 },
        { header: 'Retenido', key: 'montoRetenido', width: 16, numFmt: '#,##0.00' },
        { header: 'Total operación', key: 'montoTotalOperacion', width: 16, numFmt: '#,##0.00' },
      ],
      filas: reporte.filas.map((f) => ({
        fecha: new Date(f.fecha).toLocaleDateString('es-VE'),
        ncf: f.ncf || '',
        numeroFactura: f.numeroFactura || '',
        rifBeneficiario: f.rifBeneficiario,
        nombreBeneficiario: f.nombreBeneficiario,
        concepto: f.concepto,
        tarifaCodigo: f.tarifaCodigo,
        baseImponible: f.baseImponible,
        porcentajeRetencion: f.porcentajeRetencion,
        montoRetenido: f.montoRetenido,
        montoTotalOperacion: f.montoTotalOperacion,
      })),
    }])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-6 h-6 text-amber-600" />
            Reporte Mensual de Retenciones ISLR
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">ARC - Agentes de Retención ISLR · Providencia SNAT/2016/0068</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={cargar}><RefreshCw className="w-4 h-4 mr-1" /> Actualizar</Button>
          <Button variant="outline" size="sm" onClick={exportar} disabled={!reporte}><Download className="w-4 h-4 mr-1" /> Exportar Excel</Button>
        </div>
      </div>

      {/* Selector período */}
      <Card>
        <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400">Mes</label>
            <select
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              value={mes}
              onChange={(e) => setMes(parseInt(e.target.value))}
            >
              {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400">Año</label>
            <select
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              value={ano}
              onChange={(e) => setAno(parseInt(e.target.value))}
            >
              {[2024, 2025, 2026, 2027].map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card><CardContent className="text-center py-8 text-slate-400 dark:text-slate-500">Cargando reporte...</CardContent></Card>
      ) : !reporte ? (
        <Card><CardContent className="text-center py-8 text-slate-400 dark:text-slate-500">Sin datos</CardContent></Card>
      ) : (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="pt-4">
                <div className="text-xs text-slate-500 dark:text-slate-400">Total operaciones</div>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{reporte.totalOperaciones}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-cyan-500">
              <CardContent className="pt-4">
                <div className="text-xs text-slate-500 dark:text-slate-400">Base imponible total</div>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatBs(reporte.totalBaseImponible)}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="pt-4">
                <div className="text-xs text-slate-500 dark:text-slate-400">Total retenido</div>
                <div className="text-2xl font-bold text-emerald-700">{formatBs(reporte.totalRetenido)}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="pt-4">
                <div className="text-xs text-slate-500 dark:text-slate-400">Total operaciones (Bs.)</div>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatBs(reporte.totalOperacionesMonetarias)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Resumen por tarifa */}
          {reporte.resumenPorTarifa.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Resumen por tipo de retención</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                      <tr className="text-left">
                        <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Código</th>
                        <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Concepto</th>
                        <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">%</th>
                        <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Cantidad</th>
                        <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Base</th>
                        <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Retenido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reporte.resumenPorTarifa.map((r, i) => (
                        <tr key={i} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/60">
                          <td className="px-3 py-2 font-mono text-xs">{r.tarifaCodigo || '-'}</td>
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{r.concepto}</td>
                          <td className="px-3 py-2 text-right font-mono text-amber-700">{r.porcentaje}%</td>
                          <td className="px-3 py-2 text-right font-mono">{r.cantidad}</td>
                          <td className="px-3 py-2 text-right font-mono">{formatBs(r.baseImponible)}</td>
                          <td className="px-3 py-2 text-right font-mono font-semibold text-emerald-700">{formatBs(r.montoRetenido)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-800 text-white">
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-right font-semibold">TOTAL:</td>
                        <td className="px-3 py-2 text-right font-mono font-bold">{reporte.totalOperaciones}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold">{formatBs(reporte.totalBaseImponible)}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold">{formatBs(reporte.totalRetenido)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Detalle */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Detalle de retenciones — {reporte.mesNombre} {reporte.ano}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                    <tr className="text-left">
                      <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Fecha</th>
                      <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">RIF</th>
                      <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Beneficiario</th>
                      <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Concepto</th>
                      <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Base</th>
                      <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">%</th>
                      <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Retenido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.filas.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-8 text-slate-400 dark:text-slate-500">No hay retenciones ISLR en este período</td></tr>
                    ) : reporte.filas.map((f, i) => (
                      <tr key={i} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/60">
                        <td className="px-2 py-2 text-slate-600 dark:text-slate-400">{new Date(f.fecha).toLocaleDateString('es-VE')}</td>
                        <td className="px-2 py-2 font-mono text-slate-700 dark:text-slate-300">{f.rifBeneficiario}</td>
                        <td className="px-2 py-2 text-slate-700 dark:text-slate-300 max-w-[150px] truncate" title={f.nombreBeneficiario}>{f.nombreBeneficiario}</td>
                        <td className="px-2 py-2 text-slate-600 dark:text-slate-400 max-w-[200px] truncate" title={f.concepto}>{f.concepto}</td>
                        <td className="px-2 py-2 text-right font-mono">{formatBs(f.baseImponible)}</td>
                        <td className="px-2 py-2 text-right font-mono text-amber-700">{f.porcentajeRetencion}%</td>
                        <td className="px-2 py-2 text-right font-mono font-semibold text-emerald-700">{formatBs(f.montoRetenido)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
