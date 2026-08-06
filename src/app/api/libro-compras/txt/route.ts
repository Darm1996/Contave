import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'
import { facturaAFilaLibro, generarTXTLibroCompras, type FilaLibroCompras } from '@/lib/contabilidad/libros-seniat'

// GET /api/libro-compras/txt?desde=&hasta=
// Descarga el libro de compras en formato TXT para carga en el portal SENIAT
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
    const facturas = await db.factura.findMany({ where, orderBy: { fechaEmision: 'asc' } })
    const filas = facturas
      .map(facturaAFilaLibro)
      .filter((f): f is FilaLibroCompras => f !== null && 'rifProveedor' in f)

    const txt = generarTXTLibroCompras(filas)
    return new NextResponse(txt, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="LibroCompras_SENIAT_${new Date().toISOString().slice(0, 10)}.txt"`,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}
