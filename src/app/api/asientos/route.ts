import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const { searchParams } = new URL(req.url)
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    const limit = parseInt(searchParams.get('limit') || '500')

    const where: any = { empresaId }
    if (desde || hasta) {
      where.fecha = {}
      if (desde) where.fecha.gte = new Date(desde)
      if (hasta) where.fecha.lte = new Date(hasta)
    }
    const asientos = await db.asiento.findMany({
      where,
      orderBy: [{ fecha: 'asc' }, { numero: 'asc' }],
      take: limit,
      include: {
        lineas: {
          include: { cuenta: true },
          orderBy: { id: 'asc' },
        },
      },
    })
    return NextResponse.json({ asientos })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}
