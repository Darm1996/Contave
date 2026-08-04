'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Receipt, Calculator, DollarSign, Wallet } from 'lucide-react'
import { formatBs } from '@/lib/contabilidad/ven-nif'

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
    cantidadFacturas: number
  }
  tasaBCV: { tasa: number; fecha: string } | null
  totalCuentas: number
  ultimasFacturas: any[]
  ultimosAsientos: any[]
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) console.error(d.error)
        else setData(d)
      })
      .finally(() => setLoading(false))
  }, [])

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
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Dashboard — {mes.nombre}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Resumen contable del mes en curso</p>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Compras del mes</CardTitle>
            <TrendingDown className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatBs(mes.totalCompras)}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{mes.cantidadFacturas} factura(s)</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-cyan-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Ventas del mes</CardTitle>
            <TrendingUp className="w-4 h-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatBs(mes.totalVentas)}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ingresos operacionales</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">IVA Neto a Pagar</CardTitle>
            <Calculator className="w-4 h-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${mes.ivaNetoPagar >= 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {formatBs(mes.ivaNetoPagar)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Débito - Crédito Fiscal</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Retenciones IVA</CardTitle>
            <Wallet className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatBs(mes.totalRetencionesIVA)}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Soportadas este mes</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Retenciones ISLR</CardTitle>
            <Receipt className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatBs(mes.totalRetencionesISLR || 0)}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Por enterar al SENIAT</p>
          </CardContent>
        </Card>
      </div>

      {/* Tasa BCV y cuentas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-300">Tasa BCV (USD)</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            {data.tasaBCV ? (
              <>
                <div className="text-3xl font-bold">Bs. {data.tasaBCV.tasa.toFixed(2)}</div>
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
          <CardContent className="pt-6 flex flex-col items-center justify-center">
            <Receipt className="w-8 h-8 text-emerald-600 mb-2" />
            <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{data.totalCuentas}</div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Cuentas en el plan VEN-NIF</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex flex-col items-center justify-center">
            <Calculator className="w-8 h-8 text-cyan-600 mb-2" />
            <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{mes.cantidadFacturas}</div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Facturas procesadas este mes</p>
          </CardContent>
        </Card>
      </div>

      {/* Listas recientes */}
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
  )
}
