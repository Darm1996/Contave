import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'
import { calcularDeclaracionIVA } from '@/lib/contabilidad/declaracion-iva'

// GET /api/declaracion-iva?mes=7&ano=2026
export async function GET(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const { searchParams } = new URL(req.url)
    const mes = parseInt(searchParams.get('mes') || String(new Date().getMonth() + 1))
    const ano = parseInt(searchParams.get('ano') || String(new Date().getFullYear()))

    if (mes < 1 || mes > 12) {
      return NextResponse.json({ error: 'Mes inválido (1-12)' }, { status: 400 })
    }

    // Cargar todas las facturas del año para calcular el crédito fiscal acumulado hasta el mes anterior
    const inicioAno = new Date(ano, 0, 1)
    const finMesAnterior = new Date(ano, mes - 1, 0, 23, 59, 59) // último día del mes anterior
    const finMes = new Date(ano, mes, 0, 23, 59, 59) // último día del mes seleccionado

    // Facturas del mes
    const facturasMes = await db.factura.findMany({
      where: { empresaId, fechaEmision: { gte: inicioAno, lte: finMes } },
      orderBy: { fechaEmision: 'asc' },
    })

    // Calcular crédito fiscal acumulado de meses anteriores del mismo año
    const facturasMesAnterior = facturasMes.filter((f) => new Date(f.fechaEmision) <= finMesAnterior)
    // Para simplificar: crédito fiscal anterior = suma de IVA en compras - suma de IVA en ventas (si negativo, es crédito a favor)
    const ivaComprasAnterior = facturasMesAnterior
      .filter((f) => ['COMPRA', 'GASTO_MENOR'].includes(f.tipo))
      .reduce((s, f) => s + f.montoIVA, 0)
    const ivaVentasAnterior = facturasMesAnterior
      .filter((f) => f.tipo === 'VENTA')
      .reduce((s, f) => s + f.montoIVA, 0)
    const creditoFiscalAnterior = Math.max(0, ivaComprasAnterior - ivaVentasAnterior)

    // Calcular declaración
    const declaracion = calcularDeclaracionIVA(facturasMes as any, mes, ano, creditoFiscalAnterior)

    return NextResponse.json({ declaracion })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}
