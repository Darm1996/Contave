import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'
import { facturaAFilaLibro, generarTXTLibroVentas, type FilaLibroVentas } from '@/lib/contabilidad/libros-seniat'

// GET /api/libro-ventas/txt?desde=&hasta=
// Descarga el libro de ventas en formato TXT para carga en el portal SENIAT
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
    const facturas = await db.factura.findMany({ where, orderBy: { fechaEmision: 'asc' } })
    const filas = facturas
      .map(facturaAFilaLibro)
      .filter((f): f is FilaLibroVentas => f !== null && 'rifCliente' in f)

    const txt = generarTXTLibroVentas(filas)
    return new NextResponse(txt, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="LibroVentas_SENIAT_${new Date().toISOString().slice(0, 10)}.txt"`,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}
