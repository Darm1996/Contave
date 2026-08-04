'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatBs } from '@/lib/contabilidad/ven-nif'
import { exportarExcelCliente } from '@/lib/exports/cliente'
import { FileBarChart, RefreshCw, TrendingUp, TrendingDown, Calculator, Info, Download } from 'lucide-react'

interface Declaracion {
  mes: number
  ano: number
  mesNombre: string
  totalVentasGravadas16: number
  totalVentasExentas: number
  debitoFiscal16: number
  debitoFiscalTotal: number
  totalComprasGravadas16: number
  totalComprasSinCredito: number
  creditoFiscal16: number
  creditoFiscalTotal: number
  creditoFiscalPeriodoAnterior: number
  ivaRetenidoEnCompras: number
  ivaRetenidoEnVentas: number
  debitoFiscalNeto: number
  creditoFiscalNeto: number
  impuestoDeterminado: number
  resultado: 'A_PAGAR' | 'CREDITO_FAVOR' | 'SIN_IMPUESTO'
  montoAPagar: number
  creditoFavor: number
  notas: string[]
}

export function DeclaracionIVA() {
  const [decl, setDecl] = useState<Declaracion | null>(null)
  const [loading, setLoading] = useState(true)
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [ano, setAno] = useState(new Date().getFullYear())

  async function cargar() {
    setLoading(true)
    const r = await fetch(`/api/declaracion-iva?mes=${mes}&ano=${ano}`)
    const d = await r.json()
    if (!d.error) setDecl(d.declaracion)
    setLoading(false)
  }

  useEffect(() => { cargar() }, [mes, ano])

  function exportar() {
    if (!decl) return
    exportarExcelCliente(`DeclaracionIVA_${decl.mesNombre}_${decl.ano}.xlsx`, [{
      nombre: 'Declaración IVA',
      columnas: [
        { header: 'Concepto', key: 'concepto', width: 34 },
        { header: 'Monto (Bs.)', key: 'monto', width: 18, numFmt: '#,##0.00' },
      ],
      filas: [
        { concepto: `Período`, monto: `${decl.mesNombre} ${decl.ano}` },
        { concepto: 'Ventas gravadas 16%', monto: decl.totalVentasGravadas16 },
        { concepto: 'IVA Débito 16%', monto: decl.debitoFiscal16 },
        { concepto: 'Ventas exentas', monto: decl.totalVentasExentas },
        { concepto: 'IVA retenido por clientes', monto: decl.ivaRetenidoEnVentas },
        { concepto: 'DÉBITO FISCAL NETO', monto: decl.debitoFiscalNeto },
        { concepto: 'Compras gravadas 16%', monto: decl.totalComprasGravadas16 },
        { concepto: 'IVA Crédito 16%', monto: decl.creditoFiscal16 },
        { concepto: 'Compras sin crédito', monto: decl.totalComprasSinCredito },
        { concepto: 'IVA retenido a proveedores', monto: decl.ivaRetenidoEnCompras },
        { concepto: 'Arrastre período anterior', monto: decl.creditoFiscalPeriodoAnterior },
        { concepto: 'CRÉDITO FISCAL NETO', monto: decl.creditoFiscalNeto },
        { concepto: 'IMPUESTO DETERMINADO', monto: decl.impuestoDeterminado },
        { concepto: 'Resultado', monto: decl.resultado === 'A_PAGAR' ? `A pagar: ${decl.montoAPagar}` : decl.resultado === 'CREDITO_FAVOR' ? `Crédito a favor: ${decl.creditoFavor}` : 'Sin impuesto' },
      ],
    }])
  }

  const resultadoColor = decl?.resultado === 'A_PAGAR'
    ? 'bg-red-100 text-red-800 border-red-300 dark:border-red-700'
    : decl?.resultado === 'CREDITO_FAVOR'
    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:border-emerald-700'
    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-300'

  const resultadoLabel = decl?.resultado === 'A_PAGAR'
    ? 'IMPUESTO A PAGAR'
    : decl?.resultado === 'CREDITO_FAVOR'
    ? 'CRÉDITO A FAVOR'
    : 'SIN IMPUESTO'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-emerald-600" />
            Declaración de IVA Mensual
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Forma 30 SENIAT - Providencia SNAT/2017/0018</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={cargar}><RefreshCw className="w-4 h-4 mr-1" /> Recalcular</Button>
          <Button variant="outline" size="sm" onClick={exportar} disabled={!decl}><Download className="w-4 h-4 mr-1" /> Exportar Excel</Button>
        </div>
      </div>

      {/* Selector de período */}
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
        <Card><CardContent className="text-center py-8 text-slate-400 dark:text-slate-500">Calculando declaración...</CardContent></Card>
      ) : !decl ? (
        <Card><CardContent className="text-center py-8 text-slate-400 dark:text-slate-500">Sin datos</CardContent></Card>
      ) : (
        <>
          {/* Resultado principal */}
          <Card className={`border-2 ${resultadoColor}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm opacity-80">Período: {decl.mesNombre} {decl.ano}</div>
                  <div className="text-3xl font-bold mt-1">
                    {decl.resultado === 'A_PAGAR' && `Bs. ${decl.montoAPagar.toFixed(2)}`}
                    {decl.resultado === 'CREDITO_FAVOR' && `Bs. ${decl.creditoFavor.toFixed(2)}`}
                    {decl.resultado === 'SIN_IMPUESTO' && 'Bs. 0.00'}
                  </div>
                </div>
                <Badge className={`${resultadoColor} text-base px-4 py-2`}>
                  {decl.resultado === 'A_PAGAR' && <TrendingUp className="w-4 h-4 mr-1" />}
                  {decl.resultado === 'CREDITO_FAVOR' && <TrendingDown className="w-4 h-4 mr-1" />}
                  {resultadoLabel}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Cálculo detallado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Débito Fiscal */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-600" /> Débito Fiscal (Ventas)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Fila label="Ventas gravadas 16%" valor={decl.totalVentasGravadas16} />
                <Fila label="IVA Débito 16%" valor={decl.debitoFiscal16} className="text-cyan-700 font-semibold" />
                <Fila label="Ventas exentas" valor={decl.totalVentasExentas} />
                <Fila label="IVA retenido por clientes" valor={decl.ivaRetenidoEnVentas} className="text-purple-700" />
                <div className="border-t pt-2 mt-2">
                  <Fila label="DÉBITO FISCAL NETO" valor={decl.debitoFiscalNeto} className="font-bold text-base" />
                </div>
              </CardContent>
            </Card>

            {/* Crédito Fiscal */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-emerald-600" /> Crédito Fiscal (Compras)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Fila label="Compras gravadas 16%" valor={decl.totalComprasGravadas16} />
                <Fila label="IVA Crédito 16%" valor={decl.creditoFiscal16} className="text-emerald-700 font-semibold" />
                <Fila label="Compras sin crédito" valor={decl.totalComprasSinCredito} />
                <Fila label="IVA retenido a proveedores" valor={decl.ivaRetenidoEnCompras} className="text-purple-700" />
                <Fila label="Arrastre período anterior" valor={decl.creditoFiscalPeriodoAnterior} className="text-amber-700" />
                <div className="border-t pt-2 mt-2">
                  <Fila label="CRÉDITO FISCAL NETO" valor={decl.creditoFiscalNeto} className="font-bold text-base" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Determinación del impuesto */}
          <Card className="bg-slate-50 dark:bg-slate-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="w-4 h-4 text-slate-600 dark:text-slate-400" /> Determinación del Impuesto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Fila label="Débito fiscal neto" valor={decl.debitoFiscalNeto} />
              <Fila label="(-) Crédito fiscal neto" valor={-decl.creditoFiscalNeto} />
              <div className="border-t pt-2 mt-2">
                <Fila
                  label="IMPUESTO DETERMINADO"
                  valor={decl.impuestoDeterminado}
                  className={`font-bold text-lg ${decl.impuestoDeterminado > 0 ? 'text-red-700' : decl.impuestoDeterminado < 0 ? 'text-emerald-700' : 'text-slate-700 dark:text-slate-300'}`}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notas */}
          {decl.notas.length > 0 && (
            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription>
                <ul className="text-sm space-y-1 mt-1">
                  {decl.notas.map((n, i) => <li key={i}>• {n}</li>)}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  )
}

function Fila({ label, valor, className = '' }: { label: string; valor: number; className?: string }) {
  return (
    <div className={`flex justify-between ${className}`}>
      <span className="text-slate-600 dark:text-slate-400">{label}</span>
      <span className="font-mono">{valor < 0 ? '(' : ''}{formatBs(Math.abs(valor))}{valor < 0 ? ')' : ''}</span>
    </div>
  )
}
