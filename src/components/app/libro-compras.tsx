'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatBs } from '@/lib/contabilidad/ven-nif'
import { exportarExcelCliente } from '@/lib/exports/cliente'
import { RefreshCw, Download } from 'lucide-react'

interface Fila {
  fecha: string
  tipoOperacion: string
  numeroFactura: string
  numeroControl: string
  ncf: string
  ncfTipo: string | null
  rifProveedor: string
  nombreProveedor: string
  totalCompraIncluyendoIVA: number
  comprasSinCreditoFiscal: number
  baseImponible16: number
  baseImponible8: number
  baseImponible0: number
  iva16: number
  iva8: number
  iva0: number
  ivaRetenido: number | null
  islrRetenido: number | null
  estado: string
}

interface Totales {
  cantidadOperaciones: number
  totalComprasIncluyendoIVA: number
  totalComprasSinCreditoFiscal: number
  totalBaseImponible16: number
  totalBaseImponible8: number
  totalBaseImponible0: number
  totalIVA16: number
  totalIVA8: number
  totalIVA0: number
  totalIVARetenido: number
  totalISLRRetenido: number
}

export function LibroCompras() {
  const [filas, setFilas] = useState<Fila[]>([])
  const [totales, setTotales] = useState<Totales | null>(null)
  const [creditoFiscal, setCreditoFiscal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  async function cargar() {
    setLoading(true)
    const params = new URLSearchParams()
    if (desde) params.set('desde', desde)
    if (hasta) params.set('hasta', hasta)
    const r = await fetch(`/api/libro-compras?${params}`)
    const d = await r.json()
    if (!d.error) {
      setFilas(d.filas)
      setTotales(d.totales)
      setCreditoFiscal(d.creditoFiscalPeriodo)
    }
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  function exportar() {
    exportarExcelCliente(`LibroCompras_${new Date().toISOString().slice(0, 10)}.xlsx`, [{
      nombre: 'Libro de Compras',
      columnas: [
        { header: 'Fecha', key: 'fecha', width: 14 },
        { header: 'Tipo', key: 'tipoOperacion', width: 14 },
        { header: 'N° Factura', key: 'numeroFactura', width: 14 },
        { header: 'NCF', key: 'ncf', width: 16 },
        { header: 'RIF Proveedor', key: 'rifProveedor', width: 16 },
        { header: 'Nombre Proveedor', key: 'nombreProveedor', width: 28 },
        { header: 'Base 16%', key: 'baseImponible16', width: 14, numFmt: '#,##0.00' },
        { header: 'IVA 16%', key: 'iva16', width: 14, numFmt: '#,##0.00' },
        { header: 'Sin Crédito Fiscal', key: 'comprasSinCreditoFiscal', width: 16, numFmt: '#,##0.00' },
        { header: 'Ret. IVA', key: 'ivaRetenido', width: 14, numFmt: '#,##0.00' },
        { header: 'Ret. ISLR', key: 'islrRetenido', width: 14, numFmt: '#,##0.00' },
        { header: 'Total c/IVA', key: 'totalCompraIncluyendoIVA', width: 16, numFmt: '#,##0.00' },
      ],
      filas: filas.map((f) => ({
        fecha: new Date(f.fecha).toLocaleDateString('es-VE'),
        tipoOperacion: f.tipoOperacion,
        numeroFactura: f.numeroFactura,
        ncf: f.ncf || '',
        rifProveedor: f.rifProveedor,
        nombreProveedor: f.nombreProveedor,
        baseImponible16: f.baseImponible16,
        iva16: f.iva16,
        comprasSinCreditoFiscal: f.comprasSinCreditoFiscal,
        ivaRetenido: f.ivaRetenido || 0,
        islrRetenido: f.islrRetenido || 0,
        totalCompraIncluyendoIVA: f.totalCompraIncluyendoIVA,
      })),
    }])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Libro de Compras</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Formato SENIAT - Providencia SNAT/2018/000078 · {totales?.cantidadOperaciones || 0} operación(es)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={cargar}><RefreshCw className="w-4 h-4 mr-1" /> Actualizar</Button>
          <Button variant="outline" size="sm" onClick={exportar}><Download className="w-4 h-4 mr-1" /> Exportar Excel</Button>
        </div>
      </div>

      {/* Resumen fiscal */}
      {totales && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="border-l-4 border-l-cyan-500">
            <CardContent className="pt-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">Crédito Fiscal (IVA)</div>
              <div className="text-lg font-bold text-cyan-700">{formatBs(creditoFiscal)}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="pt-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">Retención IVA</div>
              <div className="text-lg font-bold text-purple-700">{formatBs(totales.totalIVARetenido)}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">Retención ISLR</div>
              <div className="text-lg font-bold text-amber-700">{formatBs(totales.totalISLRRetenido)}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="pt-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">Base Imponible 16%</div>
              <div className="text-lg font-bold text-emerald-700">{formatBs(totales.totalBaseImponible16)}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-slate-500">
            <CardContent className="pt-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">Total Compras (c/IVA)</div>
              <div className="text-lg font-bold text-slate-700 dark:text-slate-300">{formatBs(totales.totalComprasIncluyendoIVA)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Desde</label>
              <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Hasta</label>
              <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>
            <Button onClick={cargar}>Filtrar</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-800 text-white z-10">
                <tr>
                  <th className="px-2 py-2 text-left">Fecha</th>
                  <th className="px-2 py-2 text-left">NCF</th>
                  <th className="px-2 py-2 text-left">RIF Proveedor</th>
                  <th className="px-2 py-2 text-left">Nombre</th>
                  <th className="px-2 py-2 text-right">Base 16%</th>
                  <th className="px-2 py-2 text-right">IVA 16%</th>
                  <th className="px-2 py-2 text-right">Sin Crédito</th>
                  <th className="px-2 py-2 text-right">Ret. IVA</th>
                  <th className="px-2 py-2 text-right">Ret. ISLR</th>
                  <th className="px-2 py-2 text-right">Total c/IVA</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="text-center py-8 text-slate-400 dark:text-slate-500">Cargando...</td></tr>
                ) : filas.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-8 text-slate-400 dark:text-slate-500">No hay operaciones de compra en el período seleccionado</td></tr>
                ) : filas.map((f, i) => (
                  <tr key={i} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <td className="px-2 py-2 text-slate-600 dark:text-slate-400">{new Date(f.fecha).toLocaleDateString('es-VE')}</td>
                    <td className="px-2 py-2 font-mono text-slate-700 dark:text-slate-300">{f.ncf || '-'}</td>
                    <td className="px-2 py-2 font-mono text-slate-700 dark:text-slate-300">{f.rifProveedor}</td>
                    <td className="px-2 py-2 text-slate-700 dark:text-slate-300 max-w-[180px] truncate" title={f.nombreProveedor}>{f.nombreProveedor}</td>
                    <td className="px-2 py-2 text-right font-mono">{f.baseImponible16 > 0 ? formatBs(f.baseImponible16) : ''}</td>
                    <td className="px-2 py-2 text-right font-mono text-cyan-700">{f.iva16 > 0 ? formatBs(f.iva16) : ''}</td>
                    <td className="px-2 py-2 text-right font-mono text-slate-500 dark:text-slate-400">{f.comprasSinCreditoFiscal > 0 ? formatBs(f.comprasSinCreditoFiscal) : ''}</td>
                    <td className="px-2 py-2 text-right font-mono text-purple-700">{f.ivaRetenido ? formatBs(f.ivaRetenido) : ''}</td>
                    <td className="px-2 py-2 text-right font-mono text-amber-700">{f.islrRetenido ? formatBs(f.islrRetenido) : ''}</td>
                    <td className="px-2 py-2 text-right font-mono font-semibold text-slate-800 dark:text-slate-100">{formatBs(f.totalCompraIncluyendoIVA)}</td>
                  </tr>
                ))}
              </tbody>
              {totales && filas.length > 0 && (
                <tfoot className="sticky bottom-0 bg-slate-800 text-white">
                  <tr>
                    <td colSpan={4} className="px-2 py-2 text-right font-semibold">TOTALES:</td>
                    <td className="px-2 py-2 text-right font-mono font-bold">{formatBs(totales.totalBaseImponible16)}</td>
                    <td className="px-2 py-2 text-right font-mono font-bold text-cyan-300">{formatBs(totales.totalIVA16)}</td>
                    <td className="px-2 py-2 text-right font-mono font-bold">{formatBs(totales.totalComprasSinCreditoFiscal)}</td>
                    <td className="px-2 py-2 text-right font-mono font-bold text-purple-300">{formatBs(totales.totalIVARetenido)}</td>
                    <td className="px-2 py-2 text-right font-mono font-bold text-amber-300">{formatBs(totales.totalISLRRetenido)}</td>
                    <td className="px-2 py-2 text-right font-mono font-bold">{formatBs(totales.totalComprasIncluyendoIVA)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
