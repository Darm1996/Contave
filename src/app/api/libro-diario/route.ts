import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'

// Libro diario: lista de asientos con sus líneas, formato para reporte
export async function GET(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const { searchParams } = new URL(req.url)
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    const tipo = searchParams.get('tipo')

    const where: any = { empresaId }
    if (desde || hasta) {
      where.fecha = {}
      if (desde) where.fecha.gte = new Date(desde)
      if (hasta) where.fecha.lte = new Date(hasta)
    }
    if (tipo) where.tipo = tipo

    const asientos = await db.asiento.findMany({
      where,
      orderBy: [{ fecha: 'asc' }, { numero: 'asc' }],
      include: {
        lineas: {
          include: { cuenta: true },
          orderBy: { id: 'asc' },
        },
      },
    })

    // Aplanar a filas de libro diario
    const filas = asientos.flatMap((a) =>
      a.lineas.map((l) => ({
        numero: a.numero,
        fecha: a.fecha,
        descripcion: a.descripcion,
        referencia: a.referencia,
        tipo: a.tipo,
        codigoCuenta: l.cuenta.codigo,
        nombreCuenta: l.cuenta.nombre,
        debit: l.debit,
        credit: l.credit,
      })),
    )
    const totales = {
      debit: filas.reduce((s, f) => s + f.debit, 0),
      credit: filas.reduce((s, f) => s + f.credit, 0),
      cantidad: asientos.length,
    }
    return NextResponse.json({ filas, totales, asientos })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}
