'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatBs } from '@/lib/contabilidad/ven-nif'
import { RefreshCw } from 'lucide-react'

interface Fila {
  fecha: string
  tipoOperacion: string
  numeroFactura: string
  numeroControl: string
  ncf: string
  ncfTipo: string | null
  rifCliente: string
  nombreCliente: string
  totalVentaIncluyendoIVA: number
  ventasExentas: number
  ventasExoneradas: number
  ventasNoGravadas: number
  baseImponible16: number
  baseImponible8: number
  baseImponible0: number
  iva16: number
  iva8: number
  iva0: number
  ivaRetenido: number | null
  estado: string
}

interface Totales {
  cantidadOperaciones: number
  totalVentasIncluyendoIVA: number
  totalVentasExentas: number
  totalVentasExoneradas: number
  totalVentasNoGravadas: number
  totalBaseImponible16: number
  totalBaseImponible8: number
  totalBaseImponible0: number
  totalIVA16: number
  totalIVA8: number
  totalIVA0: number
  totalIVARetenido: number
}

export function LibroVentas() {
  const [filas, setFilas] = useState<Fila[]>([])
  const [totales, setTotales] = useState<Totales | null>(null)
  const [debitoFiscal, setDebitoFiscal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  async function cargar() {
    setLoading(true)
    const params = new URLSearchParams()
    if (desde) params.set('desde', desde)
    if (hasta) params.set('hasta', hasta)
    const r = await fetch(`/api/libro-ventas?${params}`)
    const d = await r.json()
    if (!d.error) {
      setFilas(d.filas)
      setTotales(d.totales)
      setDebitoFiscal(d.debitoFiscalPeriodo)
    }
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Libro de Ventas</h2>
          <p className="text-sm text-slate-500">
            Formato SENIAT - Providencia SNAT/2018/000078 · {totales?.cantidadOperaciones || 0} operación(es)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={cargar}><RefreshCw className="w-4 h-4 mr-1" /> Actualizar</Button>
      </div>

      {/* Resumen fiscal */}
      {totales && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="border-l-4 border-l-cyan-500">
            <CardContent className="pt-4">
              <div className="text-xs text-slate-500">Débito Fiscal (IVA)</div>
              <div className="text-lg font-bold text-cyan-700">{formatBs(debitoFiscal)}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="pt-4">
              <div className="text-xs text-slate-500">Retención IVA</div>
              <div className="text-lg font-bold text-purple-700">{formatBs(totales.totalIVARetenido)}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="pt-4">
              <div className="text-xs text-slate-500">Base Imponible 16%</div>
              <div className="text-lg font-bold text-emerald-700">{formatBs(totales.totalBaseImponible16)}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-4">
              <div className="text-xs text-slate-500">Ventas Exentas</div>
              <div className="text-lg font-bold text-amber-700">{formatBs(totales.totalVentasExentas)}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-slate-500">
            <CardContent className="pt-4">
              <div className="text-xs text-slate-500">Total Ventas (c/IVA)</div>
              <div className="text-lg font-bold text-slate-700">{formatBs(totales.totalVentasIncluyendoIVA)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
            <div>
              <label className="text-xs text-slate-500">Desde</label>
              <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-500">Hasta</label>
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
                  <th className="px-2 py-2 text-left">RIF Cliente</th>
                  <th className="px-2 py-2 text-left">Nombre</th>
                  <th className="px-2 py-2 text-right">Base 16%</th>
                  <th className="px-2 py-2 text-right">IVA 16%</th>
                  <th className="px-2 py-2 text-right">Exentas</th>
                  <th className="px-2 py-2 text-right">Ret. IVA</th>
                  <th className="px-2 py-2 text-right">Total c/IVA</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-8 text-slate-400">Cargando...</td></tr>
                ) : filas.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-slate-400">No hay operaciones de venta en el período seleccionado</td></tr>
                ) : filas.map((f, i) => (
                  <tr key={i} className="border-t hover:bg-slate-50">
                    <td className="px-2 py-2 text-slate-600">{new Date(f.fecha).toLocaleDateString('es-VE')}</td>
                    <td className="px-2 py-2 font-mono text-slate-700">{f.ncf || '-'}</td>
                    <td className="px-2 py-2 font-mono text-slate-700">{f.rifCliente}</td>
                    <td className="px-2 py-2 text-slate-700 max-w-[180px] truncate" title={f.nombreCliente}>{f.nombreCliente}</td>
                    <td className="px-2 py-2 text-right font-mono">{f.baseImponible16 > 0 ? formatBs(f.baseImponible16) : ''}</td>
                    <td className="px-2 py-2 text-right font-mono text-cyan-700">{f.iva16 > 0 ? formatBs(f.iva16) : ''}</td>
                    <td className="px-2 py-2 text-right font-mono text-amber-700">{f.ventasExentas > 0 ? formatBs(f.ventasExentas) : ''}</td>
                    <td className="px-2 py-2 text-right font-mono text-purple-700">{f.ivaRetenido ? formatBs(f.ivaRetenido) : ''}</td>
                    <td className="px-2 py-2 text-right font-mono font-semibold text-slate-800">{formatBs(f.totalVentaIncluyendoIVA)}</td>
                  </tr>
                ))}
              </tbody>
              {totales && filas.length > 0 && (
                <tfoot className="sticky bottom-0 bg-slate-800 text-white">
                  <tr>
                    <td colSpan={4} className="px-2 py-2 text-right font-semibold">TOTALES:</td>
                    <td className="px-2 py-2 text-right font-mono font-bold">{formatBs(totales.totalBaseImponible16)}</td>
                    <td className="px-2 py-2 text-right font-mono font-bold text-cyan-300">{formatBs(totales.totalIVA16)}</td>
                    <td className="px-2 py-2 text-right font-mono font-bold text-amber-300">{formatBs(totales.totalVentasExentas)}</td>
                    <td className="px-2 py-2 text-right font-mono font-bold text-purple-300">{formatBs(totales.totalIVARetenido)}</td>
                    <td className="px-2 py-2 text-right font-mono font-bold">{formatBs(totales.totalVentasIncluyendoIVA)}</td>
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
