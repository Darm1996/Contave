'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatBs } from '@/lib/contabilidad/ven-nif'
import { Search, RefreshCw, Download } from 'lucide-react'

interface Fila {
  numero: number
  fecha: string
  descripcion: string
  referencia: string | null
  tipo: string
  codigoCuenta: string
  nombreCuenta: string
  debit: number
  credit: number
}

export function LibroDiario() {
  const [filas, setFilas] = useState<Fila[]>([])
  const [totales, setTotales] = useState({ debit: 0, credit: 0, cantidad: 0 })
  const [loading, setLoading] = useState(true)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [filtro, setFiltro] = useState('')

  async function cargar() {
    setLoading(true)
    const params = new URLSearchParams()
    if (desde) params.set('desde', desde)
    if (hasta) params.set('hasta', hasta)
    const r = await fetch(`/api/libro-diario?${params}`)
    const d = await r.json()
    if (d.error) {
      console.error(d.error)
    } else {
      setFilas(d.filas)
      setTotales(d.totales)
    }
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const filtradas = filas.filter((f) => {
    if (!filtro) return true
    const s = `${f.descripcion} ${f.nombreCuenta} ${f.codigoCuenta} ${f.referencia || ''}`.toLowerCase()
    return s.includes(filtro.toLowerCase())
  })

  // Agrupar por número de asiento
  const asientos: Record<number, Fila[]> = {}
  filtradas.forEach((f) => {
    if (!asientos[f.numero]) asientos[f.numero] = []
    asientos[f.numero].push(f)
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Libro Diario</h2>
          <p className="text-sm text-slate-500">{totales.cantidad} asiento(s) · Total débito: {formatBs(totales.debit)} · Total crédito: {formatBs(totales.credit)}</p>
        </div>
        <Button variant="outline" size="sm" onClick={cargar}><RefreshCw className="w-4 h-4 mr-1" /> Actualizar</Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div>
              <label className="text-xs text-slate-500">Desde</label>
              <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-500">Hasta</label>
              <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-500">Buscar</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2 top-3 text-slate-400" />
                <Input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Descripción, cuenta..." className="pl-8" />
              </div>
            </div>
            <div className="flex items-end">
              <Button onClick={cargar} className="w-full">Filtrar</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-100 z-10">
                <tr className="text-left">
                  <th className="px-3 py-2 font-semibold text-slate-700">N°</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Fecha</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Cuenta</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Descripción / Ref.</th>
                  <th className="px-3 py-2 font-semibold text-slate-700 text-right">Débito</th>
                  <th className="px-3 py-2 font-semibold text-slate-700 text-right">Crédito</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(asientos).length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-400">
                    {loading ? 'Cargando...' : 'No hay asientos en el período seleccionado'}
                  </td></tr>
                ) : (
                  Object.entries(asientos).map(([num, lineas]) => (
                    <>
                      {lineas.map((l, i) => (
                        <tr key={`${num}-${i}`} className="border-t hover:bg-slate-50">
                          <td className="px-3 py-2 text-slate-600">{i === 0 ? num : ''}</td>
                          <td className="px-3 py-2 text-slate-600">{i === 0 ? new Date(l.fecha).toLocaleDateString('es-VE') : ''}</td>
                          <td className="px-3 py-2">
                            <span className="font-mono text-xs text-slate-500">{l.codigoCuenta}</span>
                            <div className="text-slate-800">{l.nombreCuenta}</div>
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {i === 0 && <div className="font-medium text-slate-800">{l.descripcion}</div>}
                            {l.referencia && <div className="text-xs text-slate-500">Ref: {l.referencia}</div>}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-emerald-700">
                            {l.debit > 0 ? formatBs(l.debit) : ''}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-cyan-700">
                            {l.credit > 0 ? formatBs(l.credit) : ''}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t bg-slate-50/50">
                        <td colSpan={4} className="px-3 py-1 text-right text-xs font-semibold text-slate-600">
                          Totales asiento #{num}:
                        </td>
                        <td className="px-3 py-1 text-right text-xs font-mono font-semibold text-emerald-700">
                          {formatBs(lineas.reduce((s, l) => s + l.debit, 0))}
                        </td>
                        <td className="px-3 py-1 text-right text-xs font-mono font-semibold text-cyan-700">
                          {formatBs(lineas.reduce((s, l) => s + l.credit, 0))}
                        </td>
                      </tr>
                    </>
                  ))
                )}
              </tbody>
              {Object.entries(asientos).length > 0 && (
                <tfoot className="sticky bottom-0 bg-slate-800 text-white">
                  <tr>
                    <td colSpan={4} className="px-3 py-2 font-semibold text-right">TOTALES:</td>
                    <td className="px-3 py-2 text-right font-mono font-bold">{formatBs(totales.debit)}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold">{formatBs(totales.credit)}</td>
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
