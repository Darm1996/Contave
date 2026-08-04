'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatBs } from '@/lib/contabilidad/ven-nif'
import { RefreshCw } from 'lucide-react'

interface FilaBalance {
  codigoCuenta: string
  nombreCuenta: string
  tipoCuenta: string
  naturaleza: string
  totalDebit: number
  totalCredit: number
  saldo: number
  saldoDeudor: number
  saldoAcreedor: number
}

export function Balance() {
  const [balance, setBalance] = useState<FilaBalance[]>([])
  const [totales, setTotales] = useState({ totalDeudor: 0, totalAcreedor: 0, diferencia: 0 })
  const [loading, setLoading] = useState(true)
  const [hasta, setHasta] = useState('')

  async function cargar() {
    setLoading(true)
    const params = new URLSearchParams()
    if (hasta) params.set('hasta', hasta)
    const r = await fetch(`/api/balance-comprobacion?${params}`)
    const d = await r.json()
    if (!d.error) {
      setBalance(d.balance)
      setTotales(d.totales)
    }
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  // Agrupar por tipo
  const porTipo: Record<string, FilaBalance[]> = {}
  balance.forEach((b) => {
    if (!porTipo[b.tipoCuenta]) porTipo[b.tipoCuenta] = []
    porTipo[b.tipoCuenta].push(b)
  })

  const ordenTipos = ['ACTIVO', 'PASIVO', 'PATRIMONIO', 'INGRESO', 'COSTO', 'GASTO']

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Balance de Comprobación</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{balance.length} cuenta(s) con saldo</p>
        </div>
        <Button variant="outline" size="sm" onClick={cargar}><RefreshCw className="w-4 h-4 mr-1" /> Actualizar</Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Corte al</label>
              <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>
            <Button onClick={cargar}>Filtrar</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saldos por cuenta</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10">
                <tr className="text-left">
                  <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Código</th>
                  <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Cuenta</th>
                  <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Saldo Deudor</th>
                  <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Saldo Acreedor</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="text-center py-8 text-slate-400 dark:text-slate-500">Cargando...</td></tr>
                ) : balance.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-slate-400 dark:text-slate-500">No hay cuentas con saldo</td></tr>
                ) : (
                  ordenTipos.filter((t) => porTipo[t]).map((tipo) => (
                    <>
                      <tr key={`h-${tipo}`} className="bg-slate-200">
                        <td colSpan={4} className="px-3 py-2 font-bold text-slate-800 dark:text-slate-100 uppercase text-xs tracking-wider">
                          {tipo}
                        </td>
                      </tr>
                      {porTipo[tipo].map((b) => (
                        <tr key={b.codigoCuenta} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/60">
                          <td className="px-3 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">{b.codigoCuenta}</td>
                          <td className="px-3 py-2 text-slate-800 dark:text-slate-100">{b.nombreCuenta}</td>
                          <td className="px-3 py-2 text-right font-mono text-emerald-700">
                            {b.saldoDeudor > 0 ? formatBs(b.saldoDeudor) : ''}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-cyan-700">
                            {b.saldoAcreedor > 0 ? formatBs(b.saldoAcreedor) : ''}
                          </td>
                        </tr>
                      ))}
                    </>
                  ))
                )}
              </tbody>
              {!loading && balance.length > 0 && (
                <tfoot className="sticky bottom-0 bg-slate-800 text-white">
                  <tr>
                    <td colSpan={2} className="px-3 py-2 font-semibold text-right">TOTALES:</td>
                    <td className="px-3 py-2 text-right font-mono font-bold">{formatBs(totales.totalDeudor)}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold">{formatBs(totales.totalAcreedor)}</td>
                  </tr>
                  <tr className={`text-xs ${Math.abs(totales.diferencia) < 0.01 ? 'text-emerald-300' : 'text-red-300'}`}>
                    <td colSpan={4} className="px-3 py-1 text-right">
                      Diferencia: {formatBs(totales.diferencia)} {Math.abs(totales.diferencia) < 0.01 ? '✓ Balanceado' : '⚠ No balanceado'}
                    </td>
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
