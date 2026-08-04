'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatBs } from '@/lib/contabilidad/ven-nif'
import { RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'

interface Movimiento {
  fecha: string
  numeroAsiento: number
  descripcion: string
  debit: number
  credit: number
  saldo: number
}
interface CuentaMayor {
  codigoCuenta: string
  nombreCuenta: string
  tipoCuenta: string
  naturaleza: string
  saldoInicial: number
  movimientos: Movimiento[]
  totalDebit: number
  totalCredit: number
  saldoFinal: number
}

export function LibroMayor() {
  const [cuentas, setCuentas] = useState<CuentaMayor[]>([])
  const [loading, setLoading] = useState(true)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [expandidas, setExpandidas] = useState<Record<string, boolean>>({})

  async function cargar() {
    setLoading(true)
    const params = new URLSearchParams()
    if (desde) params.set('desde', desde)
    if (hasta) params.set('hasta', hasta)
    const r = await fetch(`/api/libro-mayor?${params}`)
    const d = await r.json()
    if (!d.error) setCuentas(d.cuentas)
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Libro Mayor</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Mayorización por cuenta contable · {cuentas.length} cuenta(s) con movimiento</p>
        </div>
        <Button variant="outline" size="sm" onClick={cargar}><RefreshCw className="w-4 h-4 mr-1" /> Actualizar</Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Desde</label>
              <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Hasta</label>
              <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={cargar} className="w-full">Filtrar</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card><CardContent className="text-center py-8 text-slate-400 dark:text-slate-500">Cargando...</CardContent></Card>
      ) : cuentas.length === 0 ? (
        <Card><CardContent className="text-center py-8 text-slate-400 dark:text-slate-500">No hay movimientos en el período seleccionado</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {cuentas.map((c) => {
            const expandida = expandidas[c.codigoCuenta]
            return (
              <Card key={c.codigoCuenta} className="overflow-hidden">
                <CardHeader
                  className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 py-3"
                  onClick={() => setExpandidas({ ...expandidas, [c.codigoCuenta]: !expandida })}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expandida ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <div>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{c.codigoCuenta}</span>
                          {c.nombreCuenta}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{c.tipoCuenta}</Badge>
                          <Badge variant="secondary" className="text-xs">{c.naturaleza}</Badge>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{c.movimientos.length} movimiento(s)</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500 dark:text-slate-400">Saldo final</div>
                      <div className={`text-lg font-bold ${c.saldoFinal >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-red-600'}`}>
                        {formatBs(c.saldoFinal)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                {expandida && (
                  <CardContent className="pt-0">
                    <div className="border-t">
                      <ScrollArea className="h-auto max-h-80">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                            <tr className="text-left">
                              <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Fecha</th>
                              <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">N°</th>
                              <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Descripción</th>
                              <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400 text-right">Débito</th>
                              <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400 text-right">Crédito</th>
                              <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400 text-right">Saldo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {c.saldoInicial !== 0 && (
                              <tr className="border-t bg-slate-50 dark:bg-slate-900 italic">
                                <td colSpan={5} className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">Saldo inicial:</td>
                                <td className="px-3 py-2 text-right font-mono">{formatBs(c.saldoInicial)}</td>
                              </tr>
                            )}
                            {c.movimientos.map((m, i) => (
                              <tr key={i} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/60">
                                <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{new Date(m.fecha).toLocaleDateString('es-VE')}</td>
                                <td className="px-3 py-2 text-slate-600 dark:text-slate-400">#{m.numeroAsiento}</td>
                                <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{m.descripcion}</td>
                                <td className="px-3 py-2 text-right font-mono text-emerald-700">
                                  {m.debit > 0 ? formatBs(m.debit) : ''}
                                </td>
                                <td className="px-3 py-2 text-right font-mono text-cyan-700">
                                  {m.credit > 0 ? formatBs(m.credit) : ''}
                                </td>
                                <td className="px-3 py-2 text-right font-mono font-medium text-slate-800 dark:text-slate-100">{formatBs(m.saldo)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-slate-100 dark:bg-slate-800 font-semibold">
                            <tr>
                              <td colSpan={3} className="px-3 py-2 text-right">Totales:</td>
                              <td className="px-3 py-2 text-right font-mono text-emerald-700">{formatBs(c.totalDebit)}</td>
                              <td className="px-3 py-2 text-right font-mono text-cyan-700">{formatBs(c.totalCredit)}</td>
                              <td className="px-3 py-2 text-right font-mono text-slate-800 dark:text-slate-100">{formatBs(c.saldoFinal)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </ScrollArea>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
