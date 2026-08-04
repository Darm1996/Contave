'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatBs } from '@/lib/contabilidad/ven-nif'
import { exportarExcelCliente, type HojaExport } from '@/lib/exports/cliente'
import { Scale, TrendingUp, RefreshCw, CheckCircle2, AlertTriangle, Download } from 'lucide-react'

interface CuentaSaldo {
  codigo: string
  nombre: string
  tipo: string
  saldo: number
}

interface Balance {
  activoCorriente: CuentaSaldo[]
  activoNoCorriente: CuentaSaldo[]
  totalActivoCorriente: number
  totalActivoNoCorriente: number
  totalActivo: number
  pasivoCorriente: CuentaSaldo[]
  totalPasivoCorriente: number
  totalPasivo: number
  patrimonio: CuentaSaldo[]
  totalPatrimonio: number
  resultadoEjercicio: number
  cuadra: boolean
  diferencia: number
}

interface EstadoResultado {
  ingresosOperacionales: CuentaSaldo[]
  totalIngresosOperacionales: number
  costoVentas: CuentaSaldo[]
  totalCostoVentas: number
  utilidadBruta: number
  gastosOperacionales: CuentaSaldo[]
  totalGastosOperacionales: number
  utilidadOperacional: number
  ingresosNoOperacionales: CuentaSaldo[]
  totalIngresosNoOperacionales: number
  gastosNoOperacionales: CuentaSaldo[]
  totalGastosNoOperacionales: number
  utilidadAntesISLR: number
  islrEstimado: number
  utilidadNeta: number
}

export function EstadosFinancieros() {
  const [balance, setBalance] = useState<Balance | null>(null)
  const [estado, setEstado] = useState<EstadoResultado | null>(null)
  const [loading, setLoading] = useState(true)
  const [desde, setDesde] = useState(`${new Date().getFullYear()}-01-01`)
  const [hasta, setHasta] = useState(new Date().toISOString().slice(0, 10))

  async function cargar() {
    setLoading(true)
    const [bRes, eRes] = await Promise.all([
      fetch(`/api/estados-financieros/balance?hasta=${hasta}&desde=${desde}`),
      fetch(`/api/estados-financieros/resultados?hasta=${hasta}&desde=${desde}`),
    ])
    const [b, e] = await Promise.all([bRes.json(), eRes.json()])
    if (!b.error) setBalance(b.balance)
    if (!e.error) setEstado(e.estado)
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  function exportar() {
    const cols = [
      { header: 'Código', key: 'codigo', width: 14 },
      { header: 'Cuenta', key: 'nombre', width: 32 },
      { header: 'Saldo', key: 'saldo', width: 16, numFmt: '#,##0.00' },
    ]
    const hojas: HojaExport[] = []
    if (balance) {
      const filasBalance = [
        ...balance.activoCorriente.map((c) => ({ ...c, seccion: 'Activo Corriente' })),
        ...balance.activoNoCorriente.map((c) => ({ ...c, seccion: 'Activo No Corriente' })),
        ...balance.pasivoCorriente.map((c) => ({ ...c, seccion: 'Pasivo Corriente' })),
        ...balance.patrimonio.map((c) => ({ ...c, seccion: 'Patrimonio' })),
      ]
      hojas.push({
        nombre: 'Balance General',
        columnas: [{ header: 'Sección', key: 'seccion', width: 20 }, ...cols],
        filas: [
          ...filasBalance,
          { seccion: '', codigo: '', nombre: 'TOTAL ACTIVO', saldo: balance.totalActivo },
          { seccion: '', codigo: '', nombre: 'Resultado del ejercicio', saldo: balance.resultadoEjercicio },
          { seccion: '', codigo: '', nombre: 'TOTAL PASIVO + PATRIMONIO', saldo: balance.totalPasivo + balance.totalPatrimonio + balance.resultadoEjercicio },
        ],
      })
    }
    if (estado) {
      hojas.push({
        nombre: 'Estado de Resultados',
        columnas: [{ header: 'Sección', key: 'seccion', width: 24 }, ...cols],
        filas: [
          ...estado.ingresosOperacionales.map((c) => ({ ...c, seccion: 'Ingresos Operacionales' })),
          ...estado.costoVentas.map((c) => ({ ...c, seccion: 'Costo de Ventas', saldo: -c.saldo })),
          { seccion: '', codigo: '', nombre: 'UTILIDAD BRUTA', saldo: estado.utilidadBruta },
          ...estado.gastosOperacionales.map((c) => ({ ...c, seccion: 'Gastos Operacionales', saldo: -c.saldo })),
          { seccion: '', codigo: '', nombre: 'UTILIDAD OPERACIONAL', saldo: estado.utilidadOperacional },
          ...estado.ingresosNoOperacionales.map((c) => ({ ...c, seccion: 'Ingresos No Operacionales' })),
          ...estado.gastosNoOperacionales.map((c) => ({ ...c, seccion: 'Gastos No Operacionales', saldo: -c.saldo })),
          { seccion: '', codigo: '', nombre: 'UTILIDAD ANTES DE ISLR', saldo: estado.utilidadAntesISLR },
          { seccion: '', codigo: '', nombre: 'ISLR estimado (34%)', saldo: -estado.islrEstimado },
          { seccion: '', codigo: '', nombre: 'UTILIDAD NETA DEL EJERCICIO', saldo: estado.utilidadNeta },
        ],
      })
    }
    if (hojas.length > 0) exportarExcelCliente(`EstadosFinancieros_${desde}_${hasta}.xlsx`, hojas)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Estados Financieros</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Balance General y Estado de Resultados — VEN-NIF Pymes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={cargar}><RefreshCw className="w-4 h-4 mr-1" /> Actualizar</Button>
          <Button variant="outline" size="sm" onClick={exportar} disabled={!balance && !estado}><Download className="w-4 h-4 mr-1" /> Exportar Excel</Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400">Desde</label>
            <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400">Hasta</label>
            <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
          <Button onClick={cargar}>Generar</Button>
        </CardContent>
      </Card>

      {loading ? (
        <Card><CardContent className="text-center py-8 text-slate-400 dark:text-slate-500">Generando estados financieros...</CardContent></Card>
      ) : (
        <Tabs defaultValue="balance">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="balance"><Scale className="w-4 h-4 mr-1" /> Balance General</TabsTrigger>
            <TabsTrigger value="resultados"><TrendingUp className="w-4 h-4 mr-1" /> Estado de Resultados</TabsTrigger>
          </TabsList>

          {/* BALANCE GENERAL */}
          <TabsContent value="balance" className="space-y-4">
            {balance && (
              <>
                {/* Verificación */}
                <Alert className={balance.cuadra ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20' : 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'}>
                  {balance.cuadra
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    : <AlertTriangle className="w-4 h-4 text-red-600" />}
                  <AlertDescription className={balance.cuadra ? 'text-emerald-800' : 'text-red-800'}>
                    {balance.cuadra
                      ? '✓ Balance cuadra: Activo = Pasivo + Patrimonio + Resultado'
                      : `⚠ Balance no cuadra. Diferencia: ${formatBs(balance.diferencia)}`}
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* ACTIVO */}
                  <Card>
                    <CardHeader className="pb-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-t-lg">
                      <CardTitle className="text-base text-emerald-800">ACTIVO</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-3">
                      <Seccion titulo="Activo Corriente" cuentas={balance.activoCorriente} total={balance.totalActivoCorriente} />
                      <Seccion titulo="Activo No Corriente" cuentas={balance.activoNoCorriente} total={balance.totalActivoNoCorriente} />
                      <div className="border-t-2 pt-2 mt-3">
                        <Total label="TOTAL ACTIVO" valor={balance.totalActivo} className="text-emerald-800" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* PASIVO + PATRIMONIO */}
                  <Card>
                    <CardHeader className="pb-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-t-lg">
                      <CardTitle className="text-base text-cyan-800">PASIVO Y PATRIMONIO</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-3">
                      <Seccion titulo="Pasivo Corriente" cuentas={balance.pasivoCorriente} total={balance.totalPasivoCorriente} />
                      <Seccion titulo="Patrimonio" cuentas={balance.patrimonio} total={balance.totalPatrimonio} />
                      {/* Resultado del ejercicio */}
                      <div className="border-t pt-2 mt-3">
                        <div className="flex justify-between text-sm py-1">
                          <span className="text-slate-600 dark:text-slate-400">Resultado del ejercicio {balance.resultadoEjercicio >= 0 ? '(Utilidad)' : '(Pérdida)'}</span>
                          <span className={`font-mono ${balance.resultadoEjercicio >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            {formatBs(balance.resultadoEjercicio)}
                          </span>
                        </div>
                      </div>
                      <div className="border-t-2 pt-2 mt-2">
                        <Total
                          label="TOTAL PASIVO + PATRIMONIO"
                          valor={balance.totalPasivo + balance.totalPatrimonio + balance.resultadoEjercicio}
                          className="text-cyan-800"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* ESTADO DE RESULTADOS */}
          <TabsContent value="resultados" className="space-y-4">
            {estado && (
              <Card>
                <CardHeader className="pb-3 bg-slate-50 dark:bg-slate-900">
                  <CardTitle className="text-base">Estado de Resultados del {desde} al {hasta}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Ingresos operacionales */}
                  <Seccion titulo="Ingresos Operacionales" cuentas={estado.ingresosOperacionales} total={estado.totalIngresosOperacionales} />
                  {/* Costo de ventas */}
                  <Seccion titulo="(-) Costo de Ventas" cuentas={estado.costoVentas} total={-estado.totalCostoVentas} />
                  <Total label="UTILIDAD BRUTA" valor={estado.utilidadBruta} className="text-emerald-700" />
                  {/* Gastos operacionales */}
                  <Seccion titulo="(-) Gastos Operacionales" cuentas={estado.gastosOperacionales} total={-estado.totalGastosOperacionales} />
                  <Total label="UTILIDAD OPERACIONAL" valor={estado.utilidadOperacional} className="text-emerald-700" />
                  {/* No operacionales */}
                  {estado.ingresosNoOperacionales.length > 0 && (
                    <Seccion titulo="(+) Ingresos No Operacionales" cuentas={estado.ingresosNoOperacionales} total={estado.totalIngresosNoOperacionales} />
                  )}
                  {estado.gastosNoOperacionales.length > 0 && (
                    <Seccion titulo="(-) Gastos No Operacionales" cuentas={estado.gastosNoOperacionales} total={-estado.totalGastosNoOperacionales} />
                  )}
                  <Total label="UTILIDAD ANTES DE ISLR" valor={estado.utilidadAntesISLR} className="text-slate-800 dark:text-slate-100" />
                  {estado.islrEstimado > 0 && (
                    <div className="flex justify-between text-sm py-1">
                      <span className="text-slate-600 dark:text-slate-400">(-) ISLR estimado (34%)</span>
                      <span className="font-mono text-red-700">({formatBs(estado.islrEstimado)})</span>
                    </div>
                  )}
                  <div className="border-t-2 pt-3 mt-3 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-md">
                    <Total
                      label="UTILIDAD NETA DEL EJERCICIO"
                      valor={estado.utilidadNeta}
                      className={`text-xl ${estado.utilidadNeta >= 0 ? 'text-emerald-800' : 'text-red-700'}`}
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                    * El ISLR estimado se calcula al 34% (tarifa general para personas jurídicas en Venezuela).
                    Ajusta según el escala de tarifas aplicable a tu empresa.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

function Seccion({ titulo, cuentas, total }: { titulo: string; cuentas: CuentaSaldo[]; total: number }) {
  if (cuentas.length === 0) return null
  return (
    <div className="mb-3">
      <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">{titulo}</div>
      {cuentas.map((c) => (
        <div key={c.codigo} className="flex justify-between text-sm py-1 pl-3">
          <span className="text-slate-700 dark:text-slate-300">
            <span className="font-mono text-xs text-slate-400 dark:text-slate-500 mr-2">{c.codigo}</span>
            {c.nombre}
          </span>
          <span className={`font-mono ${c.saldo < 0 ? 'text-red-600' : 'text-slate-700 dark:text-slate-300'}`}>
            {formatBs(c.saldo)}
          </span>
        </div>
      ))}
      <div className="flex justify-between text-sm font-semibold py-1 pl-3 border-t border-slate-200 dark:border-slate-700 mt-1">
        <span className="text-slate-600 dark:text-slate-400">Subtotal {titulo}</span>
        <span className="font-mono">{formatBs(total)}</span>
      </div>
    </div>
  )
}

function Total({ label, valor, className = '' }: { label: string; valor: number; className?: string }) {
  return (
    <div className={`flex justify-between font-bold text-base py-2 ${className}`}>
      <span>{label}</span>
      <span className="font-mono">{formatBs(valor)}</span>
    </div>
  )
}
