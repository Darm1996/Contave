import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'
import { facturaAFilaLibro, totalesLibroVentas } from '@/lib/contabilidad/libros-seniat'

// GET /api/libro-ventas?desde=&hasta=
// Devuelve el libro de ventas en formato SENIAT
export async function GET(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const { searchParams } = new URL(req.url)
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')

    const where: any = { empresaId, tipo: { in: ['VENTA', 'NOTA_CREDITO', 'NOTA_DEBITO'] } }
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
      .filter((f): f is NonNullable<typeof f> => f !== null && 'rifCliente' in f)
    const totales = totalesLibroVentas(filas as any)

    // Débito fiscal del período (IVA repercutido en ventas)
    const debitoFiscalPeriodo = totales.totalIVA16 + totales.totalIVA8 + totales.totalIVA0

    return NextResponse.json({
      filas,
      totales,
      debitoFiscalPeriodo,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}
