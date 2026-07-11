import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const empresaId = await requireEmpresa()
    const tasas = await db.tasaCambio.findMany({
      where: { empresaId },
      orderBy: { fecha: 'desc' },
      take: 30,
    })
    return NextResponse.json({ tasas })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const { fecha, monedaRef = 'USD', tasa, fuente = 'BCV' } = await req.json()
    if (!fecha || !tasa) return NextResponse.json({ error: 'Fecha y tasa son requeridas' }, { status: 400 })
    // Upsert: una tasa por (empresa, fecha, moneda)
    const fechaDate = new Date(fecha)
    const tasaRecord = await db.tasaCambio.upsert({
      where: { empresaId_fecha_monedaRef: { empresaId, fecha: fechaDate, monedaRef } },
      update: { tasa, fuente },
      create: { empresaId, fecha: fechaDate, monedaRef, tasa, fuente },
    })
    return NextResponse.json({ tasa: tasaRecord })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

// Obtener la tasa más reciente a una fecha dada
export async function getTasaVigente(empresaId: string, fecha: Date, monedaRef = 'USD'): Promise<number | null> {
  const tasa = await db.tasaCambio.findFirst({
    where: { empresaId, monedaRef, fecha: { lte: fecha } },
    orderBy: { fecha: 'desc' },
  })
  return tasa?.tasa ?? null
}
