'use client'
import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart'
import { formatBs } from '@/lib/contabilidad/ven-nif'

interface PuntoHistorico { mes: string; compras: number; ventas: number }

const chartConfig = {
  compras: { label: 'Compras', color: 'var(--chart-1)' },
  ventas: { label: 'Ventas', color: 'var(--chart-2)' },
} satisfies ChartConfig

export function ComprasVentasChart() {
  const [data, setData] = useState<PuntoHistorico[] | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/historico', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (!d.error) setData(d.historico) })
  }, [])

  const sinDatos = data && data.every((d) => d.compras === 0 && d.ventas === 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Compras vs. Ventas — últimos 6 meses</CardTitle>
        <CardDescription>Montos en moneda funcional</CardDescription>
      </CardHeader>
      <CardContent>
        {!data ? (
          <div className="h-[250px] flex items-center justify-center text-sm text-slate-400 dark:text-slate-500">Cargando...</div>
        ) : sinDatos ? (
          <div className="h-[250px] flex items-center justify-center text-sm text-slate-400 dark:text-slate-500">Todavía no hay facturas registradas en este período</div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart data={data} margin={{ left: 0, right: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="mes" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
              <ChartTooltip
                content={<ChartTooltipContent formatter={(value) => formatBs(Number(value))} />}
              />
              <Bar dataKey="compras" fill="var(--color-compras)" radius={4} />
              <Bar dataKey="ventas" fill="var(--color-ventas)" radius={4} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
