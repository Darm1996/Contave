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
import { Scale, TrendingUp, RefreshCw, CheckCircle2, AlertTriangle, Download, Waves, ChartPie } from 'lucide-react'

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

interface MovimientoFlujo { codigo: string; nombre: string; monto: number }
interface FlujoEfectivo {
  utilidadNeta: number
  ajustesNoMonetarios: MovimientoFlujo[]
  totalAjustesNoMonetarios: number
  cambiosCapitalTrabajo: MovimientoFlujo[]
  totalCambiosCapitalTrabajo: number
  efectivoOperacion: number
  inversion: MovimientoFlujo[]
  efectivoInversion: number
  financiamiento: MovimientoFlujo[]
  efectivoFinanciamiento: number
  variacionNetaEfectivo: number
  efectivoInicial: number
  efectivoFinal: number
  cuadra: boolean
  diferencia: number
}
interface CambiosPatrimonio {
  capitalSocialInicial: number; aportesCapital: number; capitalSocialFinal: number
  resultadosAcumuladosInicial: number; resultadoDelPeriodo: number; resultadosAcumuladosFinal: number
  ajusteInflacionInicial: number; ajusteInflacionDelPeriodo: number; ajusteInflacionFinal: number
  patrimonioInicial: number; patrimonioFinal: number
  cuadra: boolean; diferencia: number
}

export function EstadosFinancieros() {
  const [balance, setBalance] = useState<Balance | null>(null)
  const [estado, setEstado] = useState<EstadoResultado | null>(null)
  const [flujo, setFlujo] = useState<FlujoEfectivo | null>(null)
  const [cambiosPatrimonio, setCambiosPatrimonio] = useState<CambiosPatrimonio | null>(null)
  const [loading, setLoading] = useState(true)
  const [desde, setDesde] = useState(`${new Date().getFullYear()}-01-01`)
  const [hasta, setHasta] = useState(new Date().toISOString().slice(0, 10))

  async function cargar() {
    setLoading(true)
    const [bRes, eRes, fRes, cRes] = await Promise.all([
      fetch(`/api/estados-financieros/balance?hasta=${hasta}&desde=${desde}`),
      fetch(`/api/estados-financieros/resultados?hasta=${hasta}&desde=${desde}`),
      fetch(`/api/estados-financieros/flujo-efectivo?hasta=${hasta}&desde=${desde}`),
      fetch(`/api/estados-financieros/cambios-patrimonio?hasta=${hasta}&desde=${desde}`),
    ])
    const [b, e, f, c] = await Promise.all([bRes.json(), eRes.json(), fRes.json(), cRes.json()])
    if (!b.error) setBalance(b.balance)
    if (!e.error) setEstado(e.estado)
    if (!f.error) setFlujo(f.flujo)
    if (!c.error) setCambiosPatrimonio(c.cambios)
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
    if (flujo) {
      hojas.push({
        nombre: 'Flujo de Efectivo',
        columnas: [{ header: 'Concepto', key: 'nombre', width: 40 }, { header: 'Monto', key: 'saldo', width: 16, numFmt: '#,##0.00' }],
        filas: [
          { nombre: 'Utilidad neta del período', saldo: flujo.utilidadNeta },
          ...flujo.ajustesNoMonetarios.map((m) => ({ nombre: `(+/-) ${m.nombre}`, saldo: m.monto })),
          ...flujo.cambiosCapitalTrabajo.map((m) => ({ nombre: `(+/-) ${m.nombre}`, saldo: m.monto })),
          { nombre: 'EFECTIVO DE ACTIVIDADES DE OPERACIÓN', saldo: flujo.efectivoOperacion },
          ...flujo.inversion.map((m) => ({ nombre: `(+/-) ${m.nombre}`, saldo: m.monto })),
          { nombre: 'EFECTIVO DE ACTIVIDADES DE INVERSIÓN', saldo: flujo.efectivoInversion },
          ...flujo.financiamiento.map((m) => ({ nombre: `(+/-) ${m.nombre}`, saldo: m.monto })),
          { nombre: 'EFECTIVO DE ACTIVIDADES DE FINANCIAMIENTO', saldo: flujo.efectivoFinanciamiento },
          { nombre: 'VARIACIÓN NETA DE EFECTIVO', saldo: flujo.variacionNetaEfectivo },
          { nombre: 'Efectivo al inicio del período', saldo: flujo.efectivoInicial },
          { nombre: 'Efectivo al final del período', saldo: flujo.efectivoFinal },
        ],
      })
    }
    if (cambiosPatrimonio) {
      hojas.push({
        nombre: 'Cambios en el Patrimonio',
        columnas: [{ header: 'Concepto', key: 'nombre', width: 40 }, { header: 'Monto', key: 'saldo', width: 16, numFmt: '#,##0.00' }],
        filas: [
          { nombre: 'Capital social al inicio', saldo: cambiosPatrimonio.capitalSocialInicial },
          { nombre: 'Aportes de capital del período', saldo: cambiosPatrimonio.aportesCapital },
          { nombre: 'Capital social al final', saldo: cambiosPatrimonio.capitalSocialFinal },
          { nombre: 'Resultados acumulados al inicio', saldo: cambiosPatrimonio.resultadosAcumuladosInicial },
          { nombre: 'Resultado del período', saldo: cambiosPatrimonio.resultadoDelPeriodo },
          { nombre: 'Resultados acumulados al final', saldo: cambiosPatrimonio.resultadosAcumuladosFinal },
          { nombre: 'Ajuste por inflación al inicio', saldo: cambiosPatrimonio.ajusteInflacionInicial },
          { nombre: 'Ajuste por inflación del período', saldo: cambiosPatrimonio.ajusteInflacionDelPeriodo },
          { nombre: 'Ajuste por inflación al final', saldo: cambiosPatrimonio.ajusteInflacionFinal },
          { nombre: 'PATRIMONIO TOTAL AL INICIO', saldo: cambiosPatrimonio.patrimonioInicial },
          { nombre: 'PATRIMONIO TOTAL AL FINAL', saldo: cambiosPatrimonio.patrimonioFinal },
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
          <p className="text-sm text-slate-500 dark:text-slate-400">Balance, Resultados, Flujo de Efectivo y Cambios en el Patrimonio — VEN-NIF Pymes</p>
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
          <TabsList className="h-auto flex-wrap justify-start gap-1 w-full max-w-2xl">
            <TabsTrigger value="balance" className="flex-none"><Scale className="w-4 h-4 mr-1" /> Balance General</TabsTrigger>
            <TabsTrigger value="resultados" className="flex-none"><TrendingUp className="w-4 h-4 mr-1" /> Estado de Resultados</TabsTrigger>
            <TabsTrigger value="flujo" className="flex-none"><Waves className="w-4 h-4 mr-1" /> Flujo de Efectivo</TabsTrigger>
            <TabsTrigger value="patrimonio" className="flex-none"><ChartPie className="w-4 h-4 mr-1" /> Cambios en el Patrimonio</TabsTrigger>
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

          {/* ESTADO DE FLUJO DE EFECTIVO */}
          <TabsContent value="flujo" className="space-y-4">
            {flujo && (
              <>
                <Alert className={flujo.cuadra ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20' : 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'}>
                  {flujo.cuadra
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    : <AlertTriangle className="w-4 h-4 text-red-600" />}
                  <AlertDescription className={flujo.cuadra ? 'text-emerald-800' : 'text-red-800'}>
                    {flujo.cuadra
                      ? '✓ El flujo reconcilia: efectivo inicial + variación neta = efectivo final'
                      : `⚠ No reconcilia. Diferencia: ${formatBs(flujo.diferencia)}`}
                  </AlertDescription>
                </Alert>
                <Card>
                  <CardHeader className="pb-3 bg-slate-50 dark:bg-slate-900">
                    <CardTitle className="text-base">Flujo de Efectivo del {desde} al {hasta} (método indirecto)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="mb-3">
                      <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">Actividades de Operación</div>
                      <div className="flex justify-between text-sm py-1 pl-3">
                        <span className="text-slate-700 dark:text-slate-300">Utilidad neta del período</span>
                        <span className="font-mono">{formatBs(flujo.utilidadNeta)}</span>
                      </div>
                      {flujo.ajustesNoMonetarios.map((m) => (
                        <div key={m.codigo} className="flex justify-between text-sm py-1 pl-3">
                          <span className="text-slate-600 dark:text-slate-400">(+/-) {m.nombre}</span>
                          <span className={`font-mono ${m.monto < 0 ? 'text-red-600' : 'text-slate-700 dark:text-slate-300'}`}>{formatBs(m.monto)}</span>
                        </div>
                      ))}
                      {flujo.cambiosCapitalTrabajo.map((m) => (
                        <div key={m.codigo} className="flex justify-between text-sm py-1 pl-3">
                          <span className="text-slate-600 dark:text-slate-400">(+/-) {m.nombre}</span>
                          <span className={`font-mono ${m.monto < 0 ? 'text-red-600' : 'text-slate-700 dark:text-slate-300'}`}>{formatBs(m.monto)}</span>
                        </div>
                      ))}
                    </div>
                    <Total label="EFECTIVO DE ACTIVIDADES DE OPERACIÓN" valor={flujo.efectivoOperacion} className="text-emerald-700" />

                    <div className="mb-3">
                      <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">Actividades de Inversión</div>
                      {flujo.inversion.length === 0 ? (
                        <p className="text-sm text-slate-400 dark:text-slate-500 pl-3">Sin movimientos en el período</p>
                      ) : flujo.inversion.map((m) => (
                        <div key={m.codigo} className="flex justify-between text-sm py-1 pl-3">
                          <span className="text-slate-600 dark:text-slate-400">(+/-) {m.nombre}</span>
                          <span className={`font-mono ${m.monto < 0 ? 'text-red-600' : 'text-slate-700 dark:text-slate-300'}`}>{formatBs(m.monto)}</span>
                        </div>
                      ))}
                    </div>
                    <Total label="EFECTIVO DE ACTIVIDADES DE INVERSIÓN" valor={flujo.efectivoInversion} className="text-cyan-700" />

                    <div className="mb-3">
                      <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">Actividades de Financiamiento</div>
                      {flujo.financiamiento.length === 0 ? (
                        <p className="text-sm text-slate-400 dark:text-slate-500 pl-3">Sin movimientos en el período</p>
                      ) : flujo.financiamiento.map((m) => (
                        <div key={m.codigo} className="flex justify-between text-sm py-1 pl-3">
                          <span className="text-slate-600 dark:text-slate-400">(+/-) {m.nombre}</span>
                          <span className={`font-mono ${m.monto < 0 ? 'text-red-600' : 'text-slate-700 dark:text-slate-300'}`}>{formatBs(m.monto)}</span>
                        </div>
                      ))}
                    </div>
                    <Total label="EFECTIVO DE ACTIVIDADES DE FINANCIAMIENTO" valor={flujo.efectivoFinanciamiento} className="text-purple-700" />

                    <div className="border-t-2 pt-3 mt-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-md space-y-1">
                      <Total label="VARIACIÓN NETA DE EFECTIVO" valor={flujo.variacionNetaEfectivo} />
                      <div className="flex justify-between text-sm py-1">
                        <span className="text-slate-600 dark:text-slate-400">Efectivo al inicio del período</span>
                        <span className="font-mono">{formatBs(flujo.efectivoInicial)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-base py-1 border-t border-slate-200 dark:border-slate-700 mt-1">
                        <span>Efectivo al final del período</span>
                        <span className="font-mono">{formatBs(flujo.efectivoFinal)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* ESTADO DE CAMBIOS EN EL PATRIMONIO */}
          <TabsContent value="patrimonio" className="space-y-4">
            {cambiosPatrimonio && (
              <>
                <Alert className={cambiosPatrimonio.cuadra ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20' : 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'}>
                  {cambiosPatrimonio.cuadra
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    : <AlertTriangle className="w-4 h-4 text-red-600" />}
                  <AlertDescription className={cambiosPatrimonio.cuadra ? 'text-emerald-800' : 'text-red-800'}>
                    {cambiosPatrimonio.cuadra
                      ? '✓ El patrimonio final reconcilia con el Balance General'
                      : `⚠ No reconcilia. Diferencia: ${formatBs(cambiosPatrimonio.diferencia)}`}
                  </AlertDescription>
                </Alert>
                <Card>
                  <CardHeader className="pb-3 bg-slate-50 dark:bg-slate-900">
                    <CardTitle className="text-base">Cambios en el Patrimonio del {desde} al {hasta}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full min-w-[600px] text-sm">
                      <thead className="bg-slate-100 dark:bg-slate-800">
                        <tr className="text-left">
                          <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Concepto</th>
                          <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Capital Social</th>
                          <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Resultados Acumulados</th>
                          <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Ajuste por Inflación</th>
                          <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t">
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-300">Saldo al {desde}</td>
                          <td className="px-3 py-2 text-right font-mono">{formatBs(cambiosPatrimonio.capitalSocialInicial)}</td>
                          <td className="px-3 py-2 text-right font-mono">{formatBs(cambiosPatrimonio.resultadosAcumuladosInicial)}</td>
                          <td className="px-3 py-2 text-right font-mono">{formatBs(cambiosPatrimonio.ajusteInflacionInicial)}</td>
                          <td className="px-3 py-2 text-right font-mono font-semibold">{formatBs(cambiosPatrimonio.patrimonioInicial)}</td>
                        </tr>
                        <tr className="border-t">
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-300">Aportes de capital del período</td>
                          <td className="px-3 py-2 text-right font-mono">{formatBs(cambiosPatrimonio.aportesCapital)}</td>
                          <td className="px-3 py-2 text-right font-mono">—</td>
                          <td className="px-3 py-2 text-right font-mono">—</td>
                          <td className="px-3 py-2 text-right font-mono">{formatBs(cambiosPatrimonio.aportesCapital)}</td>
                        </tr>
                        <tr className="border-t">
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-300">Resultado del período</td>
                          <td className="px-3 py-2 text-right font-mono">—</td>
                          <td className="px-3 py-2 text-right font-mono">{formatBs(cambiosPatrimonio.resultadoDelPeriodo)}</td>
                          <td className="px-3 py-2 text-right font-mono">—</td>
                          <td className="px-3 py-2 text-right font-mono">{formatBs(cambiosPatrimonio.resultadoDelPeriodo)}</td>
                        </tr>
                        <tr className="border-t">
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-300">Ajuste por inflación del período</td>
                          <td className="px-3 py-2 text-right font-mono">—</td>
                          <td className="px-3 py-2 text-right font-mono">—</td>
                          <td className="px-3 py-2 text-right font-mono">{formatBs(cambiosPatrimonio.ajusteInflacionDelPeriodo)}</td>
                          <td className="px-3 py-2 text-right font-mono">{formatBs(cambiosPatrimonio.ajusteInflacionDelPeriodo)}</td>
                        </tr>
                        <tr className="border-t-2 bg-emerald-50 dark:bg-emerald-900/20">
                          <td className="px-3 py-2 font-bold text-slate-800 dark:text-slate-100">Saldo al {hasta}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold">{formatBs(cambiosPatrimonio.capitalSocialFinal)}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold">{formatBs(cambiosPatrimonio.resultadosAcumuladosFinal)}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold">{formatBs(cambiosPatrimonio.ajusteInflacionFinal)}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-emerald-800">{formatBs(cambiosPatrimonio.patrimonioFinal)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </>
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
