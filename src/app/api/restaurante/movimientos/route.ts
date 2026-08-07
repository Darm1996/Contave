import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'
import { rangoMes } from '@/lib/restaurante/calculos'

/** Movimientos de un fondo en el mes: el "estado de cuenta" de esa caja. */
export async function GET(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const { searchParams } = new URL(req.url)
    const hoy = new Date()
    const ano = Number(searchParams.get('ano')) || hoy.getUTCFullYear()
    const mes = Number(searchParams.get('mes')) || hoy.getUTCMonth() + 1
    const fondoId = searchParams.get('fondoId') || undefined
    const { desde, hasta } = rangoMes(ano, mes)

    const movimientos = await db.restMovimientoFondo.findMany({
      where: { empresaId, fecha: { gte: desde, lte: hasta }, ...(fondoId ? { fondoId } : {}) },
      include: { fondo: { select: { nombre: true, moneda: true, color: true } } },
      orderBy: [{ fecha: 'desc' }, { createdAt: 'desc' }],
      take: 300,
    })
    return NextResponse.json({ movimientos })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}
