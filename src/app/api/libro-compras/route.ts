import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'
import { facturaAFilaLibro, totalesLibroCompras } from '@/lib/contabilidad/libros-seniat'

// GET /api/libro-compras?desde=&hasta=
// Devuelve el libro de compras en formato SENIAT
export async function GET(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const { searchParams } = new URL(req.url)
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')

    const where: any = { empresaId, tipo: { in: ['COMPRA', 'GASTO_MENOR', 'NOTA_CREDITO', 'NOTA_DEBITO'] } }
    if (desde || hasta) {
      where.fechaEmision = {}
      if (desde) where.fechaEmision.gte = new Date(desde)
      if (hasta) where.fechaEmision.lte = new Date(hasta)
    }
    const facturas = await db.factura.findMany({
      where,
      orderBy: { fechaEmision: 'asc' },
    })
    const filas = facturas
      .map(facturaAFilaLibro)
      .filter((f): f is NonNullable<typeof f> => f !== null && 'rifProveedor' in f)
    const totales = totalesLibroCompras(filas as any)

    // Resumen de IVA: débito fiscal (ventas) - crédito fiscal (compras) = IVA a pagar o compensar
    // En el libro de compras solo calculamos el crédito fiscal acumulado
    const creditoFiscalPeriodo = totales.totalIVA16 + totales.totalIVA8 + totales.totalIVA0

    return NextResponse.json({
      filas,
      totales,
      creditoFiscalPeriodo,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}
