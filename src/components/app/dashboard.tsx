'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, Receipt, Calculator, DollarSign, Wallet, RefreshCw, Package, Users, FileWarning, CalendarClock, Warehouse, HandCoins } from 'lucide-react'
import { formatBs } from '@/lib/contabilidad/ven-nif'
import { useApp, apiFetch } from '@/lib/store'
import { ComprasVentasChart } from './dashboard-chart'

interface DashboardData {
  mes: {
    nombre: string
    totalCompras: number
    totalVentas: number
    totalIVACredito: number
    totalIVADebito: number
    ivaNetoPagar: number
    totalRetencionesIVA: number
    totalRetencionesISLR: number
    totalIGTF: number
    cantidadFacturas: number
  }
  tasaBCV: { tasa: number; fecha: string } | null
  totalCuentas: number
  ultimasFacturas: any[]
  ultimosAsientos: any[]
  activosFijos: { cantidad: number; valorLibro: number }
  nominaMes: { totalNeto: number; estado: string } | null
  ajusteInflacionMes: { resultadoExposicionInflacion: number } | null
  inventario: { cantidadProductos: number; valorizacion: number }
  cxc: { cantidad: number; total: number }
  cxp: { cantidad: number; total: number }
}

interface Vencimiento {
  descripcion: string
  fecha: string
  diasRestantes: number
  urgente: boolean
  vencido: boolean
}

export function Dashboard() {
  const { setTab } = useApp()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [proximoVencimiento, setProximoVencimiento] = useState<Vencimiento | null>(null)

  function cargar() {
    setLoading(true)
    fetch('/api/dashboard', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) console.error(d.error)
        else setData(d)
      })
      .finally(() => setLoading(false))
    apiFetch<{ vencimientos: Vencimiento[] }>('/api/vencimientos-fiscales').then((r) => {
      if (r.ok && r.data && r.data.vencimientos.length > 0) setProximoVencimiento(r.data.vencimientos[0])
    })
  }

  useEffect(() => { cargar() }, [])

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="pt-6"><Skeleton className="h-24" /></CardContent></Card>
        ))}
      </div>
    )
  }

  const { mes } = data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Dashboard — {mes.nombre}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Resumen contable del mes en curso</p>
        </div>
        <Button variant="outline" size="sm" onClick={cargar}><RefreshCw className="w-4 h-4 mr-1" /> Actualizar</Button>
      </div>

      {proximoVencimiento && (
        <Card
          className={`cursor-pointer hover:shadow-md transition-shadow ${proximoVencimiento.urgente ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-cyan-500'}`}
          onClick={() => setTab('vencimientos-fiscales')}
        >
          <CardContent className="pt-4 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <CalendarClock className={`w-5 h-5 flex-shrink-0 ${proximoVencimiento.urgente ? 'text-red-600' : 'text-cyan-600'}`} />
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Próximo vencimiento fiscal</div>
                <div className="font-medium text-slate-800 dark:text-slate-100">{proximoVencimiento.descripcion}</div>
              </div>
            </div>
            <Badge className={proximoVencimiento.urgente ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300' : 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-900/40 dark:text-cyan-300'}>
              {proximoVencimiento.diasRestantes === 0 ? 'Hoy' : `En ${proximoVencimiento.diasRestantes} día(s)`}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* KPIs principales */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Este mes</h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Compras del mes</CardTitle>
              <TrendingDown className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-slate-100">{formatBs(mes.totalCompras)}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{mes.cantidadFacturas} factura(s)</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-cyan-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Ventas del mes</CardTitle>
              <TrendingUp className="w-4 h-4 text-cyan-600 flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-slate-100">{formatBs(mes.totalVentas)}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ingresos operacionales</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">IVA Neto a Pagar</CardTitle>
              <Calculator className="w-4 h-4 text-amber-600 flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className={`text-lg sm:text-2xl font-bold ${mes.ivaNetoPagar >= 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {formatBs(mes.ivaNetoPagar)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Débito - Crédito Fiscal</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Retenciones IVA</CardTitle>
              <Wallet className="w-4 h-4 text-purple-600 flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-slate-100">{formatBs(mes.totalRetencionesIVA)}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Soportadas este mes</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Retenciones ISLR</CardTitle>
              <Receipt className="w-4 h-4 text-orange-600 flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-slate-100">{formatBs(mes.totalRetencionesISLR || 0)}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Por enterar al SENIAT</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tasa BCV y cuentas */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Resumen general</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white col-span-2 sm:col-span-1">
            <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-300">Tasa BCV (USD)</span>
                <DollarSign className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              </div>
              {data.tasaBCV ? (
                <>
                  <div className="text-2xl sm:text-3xl font-bold">Bs. {data.tasaBCV.tasa.toFixed(2)}</div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Actualizada: {new Date(data.tasaBCV.fecha).toLocaleDateString('es-VE')}
                  </p>
                </>
              ) : (
                <div className="text-sm text-slate-400 dark:text-slate-500">Sin tasa registrada</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-3 sm:pb-6 flex flex-col items-center justify-center text-center">
              <Receipt className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600 mb-2" />
              <div className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">{data.totalCuentas}</div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Cuentas en el plan VEN-NIF</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-3 sm:pb-6 flex flex-col items-center justify-center text-center">
              <Calculator className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-600 mb-2" />
              <div className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">{mes.cantidadFacturas}</div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Facturas procesadas este mes</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* KPIs de módulos nuevos */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Otros módulos</h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card className="border-l-4 border-l-indigo-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Inventario</CardTitle>
              <Warehouse className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-slate-100">{formatBs(data.inventario.valorizacion)}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{data.inventario.cantidadProductos} producto(s)</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-teal-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTab('cuentas-por-cobrar')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Por cobrar</CardTitle>
              <Wallet className="w-4 h-4 text-teal-600 flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-slate-100">{formatBs(data.cxc.total)}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{data.cxc.cantidad} factura(s) pendiente(s)</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-rose-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTab('cuentas-por-pagar')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Por pagar</CardTitle>
              <HandCoins className="w-4 h-4 text-rose-600 flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-slate-100">{formatBs(data.cxp.total)}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{data.cxp.cantidad} factura(s) pendiente(s)</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">IGTF pagado</CardTitle>
              <FileWarning className="w-4 h-4 text-red-600 flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-slate-100">{formatBs(mes.totalIGTF || 0)}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">3% divisas/cripto</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-cyan-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Activos fijos</CardTitle>
              <Package className="w-4 h-4 text-cyan-600 flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-slate-100">{formatBs(data.activosFijos.valorLibro)}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{data.activosFijos.cantidad} activo(s)</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Nómina del mes</CardTitle>
              <Users className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
                {data.nominaMes ? formatBs(data.nominaMes.totalNeto) : '—'}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{data.nominaMes ? 'Neto procesado' : 'Sin procesar'}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Ajuste inflación</CardTitle>
              <TrendingUp className="w-4 h-4 text-amber-600 flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className={`text-lg sm:text-2xl font-bold ${(data.ajusteInflacionMes?.resultadoExposicionInflacion || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {data.ajusteInflacionMes ? formatBs(data.ajusteInflacionMes.resultadoExposicionInflacion) : '—'}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{data.ajusteInflacionMes ? 'REI del mes' : 'Sin generar'}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <ComprasVentasChart />

      {/* Listas recientes */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Actividad reciente</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimas facturas registradas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {data.ultimasFacturas.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">Sin facturas aún. Usa el Escáner para empezar.</p>
            ) : (
              data.ultimasFacturas.map((f) => (
                <div key={f.id} className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <div>
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{f.nombreContraparte}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(f.fechaEmision).toLocaleDateString('es-VE')} · {f.ncf || f.numeroFactura || 'Sin NCF'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={f.asiento ? 'default' : 'secondary'} className="text-xs">
                      {f.tipo}
                    </Badge>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{formatBs(f.totalMonedaFuncional)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Asientos contables recientes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {data.ultimosAsientos.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">Sin asientos contables aún.</p>
            ) : (
              data.ultimosAsientos.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <div>
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-100">#{a.numero} — {a.descripcion}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(a.fecha).toLocaleDateString('es-VE')} · {a._count?.lineas || 0} líneas · {a.tipo}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">{a.fuente}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  )
}
