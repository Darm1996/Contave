'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatBs } from '@/lib/contabilidad/ven-nif'
import { exportarExcelCliente } from '@/lib/exports/cliente'
import { TableScrollHint } from '@/components/ui/table-scroll-hint'
import { FileBarChart, RefreshCw, Download } from 'lucide-react'

interface Fila {
  fecha: string
  numeroFactura: string
  rifContraparte: string
  nombreContraparte: string
  motivo: string
  total: number
  porcentajeIGTF: number
  montoIGTF: number
}

interface Reporte {
  mes: number
  ano: number
  mesNombre: string
  filas: Fila[]
  totalOperaciones: number
  totalBaseGravada: number
  totalIGTF: number
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export function DeclaracionIGTF() {
  const [reporte, setReporte] = useState<Reporte | null>(null)
  const [loading, setLoading] = useState(true)
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [ano, setAno] = useState(new Date().getFullYear())

  async function cargar() {
    setLoading(true)
    const r = await fetch(`/api/declaracion-igtf?mes=${mes}&ano=${ano}`)
    const d = await r.json()
    if (!d.error) setReporte(d.reporte)
    setLoading(false)
  }

  useEffect(() => { cargar() }, [mes, ano])

  function exportar() {
    if (!reporte) return
    exportarExcelCliente(`IGTF_${reporte.mesNombre}_${reporte.ano}.xlsx`, [{
      nombre: 'Declaración IGTF',
      columnas: [
        { header: 'Fecha', key: 'fecha', width: 14 },
        { header: 'N° Factura', key: 'numeroFactura', width: 14 },
        { header: 'RIF', key: 'rifContraparte', width: 16 },
        { header: 'Contraparte', key: 'nombreContraparte', width: 28 },
        { header: 'Motivo', key: 'motivo', width: 26 },
        { header: 'Total operación', key: 'total', width: 16, numFmt: '#,##0.00' },
        { header: '%', key: 'porcentajeIGTF', width: 8 },
        { header: 'IGTF', key: 'montoIGTF', width: 16, numFmt: '#,##0.00' },
      ],
      filas: reporte.filas.map((f) => ({
        fecha: new Date(f.fecha).toLocaleDateString('es-VE'),
        numeroFactura: f.numeroFactura,
        rifContraparte: f.rifContraparte,
        nombreContraparte: f.nombreContraparte,
        motivo: f.motivo,
        total: f.total,
        porcentajeIGTF: f.porcentajeIGTF,
        montoIGTF: f.montoIGTF,
      })),
    }])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-amber-600" />
            Declaración IGTF
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Impuesto a las Grandes Transacciones Financieras (3%) — pagos en divisas/cripto o efectivo (contribuyente especial)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={cargar}><RefreshCw className="w-4 h-4 mr-1" /> Actualizar</Button>
          <Button variant="outline" size="sm" onClick={exportar} disabled={!reporte}><Download className="w-4 h-4 mr-1" /> Exportar Excel</Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400">Mes</label>
            <select className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={mes} onChange={(e) => setMes(parseInt(e.target.value))}>
              {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400">Año</label>
            <select className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={ano} onChange={(e) => setAno(parseInt(e.target.value))}>
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="pt-4">
                <div className="text-xs text-slate-500 dark:text-slate-400">Operaciones con IGTF</div>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{reporte.totalOperaciones}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-cyan-500">
              <CardContent className="pt-4">
                <div className="text-xs text-slate-500 dark:text-slate-400">Base gravada total</div>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatBs(reporte.totalBaseGravada)}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="pt-4">
                <div className="text-xs text-slate-500 dark:text-slate-400">Total IGTF pagado</div>
                <div className="text-2xl font-bold text-red-700">{formatBs(reporte.totalIGTF)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Detalle — {reporte.mesNombre} {reporte.ano}</CardTitle>
            </CardHeader>
            <TableScrollHint />
            <CardContent className="p-0 overflow-x-auto">
              <ScrollArea className="h-[500px]">
                <table className="w-full min-w-[700px] text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                    <tr className="text-left">
                      <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Fecha</th>
                      <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">RIF</th>
                      <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Contraparte</th>
                      <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Motivo</th>
                      <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Total</th>
                      <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">IGTF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.filas.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-8 text-slate-400 dark:text-slate-500">No hay operaciones con IGTF en este período</td></tr>
                    ) : reporte.filas.map((f, i) => (
                      <tr key={i} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/60">
                        <td className="px-2 py-2 text-slate-600 dark:text-slate-400">{new Date(f.fecha).toLocaleDateString('es-VE')}</td>
                        <td className="px-2 py-2 font-mono text-slate-700 dark:text-slate-300">{f.rifContraparte}</td>
                        <td className="px-2 py-2 text-slate-700 dark:text-slate-300 max-w-[150px] truncate" title={f.nombreContraparte}>{f.nombreContraparte}</td>
                        <td className="px-2 py-2 text-slate-600 dark:text-slate-400">{f.motivo}</td>
                        <td className="px-2 py-2 text-right font-mono">{formatBs(f.total)}</td>
                        <td className="px-2 py-2 text-right font-mono font-semibold text-red-700">{formatBs(f.montoIGTF)}</td>
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
