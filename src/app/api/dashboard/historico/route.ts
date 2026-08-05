import { NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// GET /api/dashboard/historico - totales de compras/ventas de los últimos 6 meses (para el gráfico del dashboard)
export async function GET() {
  try {
    const empresaId = await requireEmpresa()
    const ahora = new Date()

    const meses: { mes: string; ano: number; numeroMes: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
      meses.push({ mes: MESES_CORTOS[d.getMonth()], ano: d.getFullYear(), numeroMes: d.getMonth() })
    }

    const inicio = new Date(meses[0].ano, meses[0].numeroMes, 1)
    const fin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59)

    const facturas = await db.factura.findMany({
      where: { empresaId, fechaEmision: { gte: inicio, lte: fin }, tipo: { in: ['COMPRA', 'GASTO_MENOR', 'VENTA'] } },
      select: { tipo: true, totalMonedaFuncional: true, fechaEmision: true },
    })

    const historico = meses.map(({ mes, ano, numeroMes }) => {
      const delMes = facturas.filter((f) => f.fechaEmision.getFullYear() === ano && f.fechaEmision.getMonth() === numeroMes)
      const compras = delMes.filter((f) => f.tipo === 'COMPRA' || f.tipo === 'GASTO_MENOR').reduce((s, f) => s + f.totalMonedaFuncional, 0)
      const ventas = delMes.filter((f) => f.tipo === 'VENTA').reduce((s, f) => s + f.totalMonedaFuncional, 0)
      return { mes: `${mes} ${String(ano).slice(2)}`, compras: Math.round(compras * 100) / 100, ventas: Math.round(ventas * 100) / 100 }
    })

    return NextResponse.json({ historico })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}
