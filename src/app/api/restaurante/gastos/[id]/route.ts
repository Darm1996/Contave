import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'
import { borrarMovimientosDeOrigen } from '@/lib/restaurante/fondos'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const empresaId = await requireEmpresa()
    const { id } = await params

    const gasto = await db.restGasto.findFirst({ where: { id, empresaId } })
    if (!gasto) return NextResponse.json({ error: 'El gasto no existe' }, { status: 404 })
    if (gasto.notaId) {
      return NextResponse.json(
        { error: 'Este gasto vino de un pago a proveedor: anula el pago desde la nota' },
        { status: 400 },
      )
    }

    await borrarMovimientosDeOrigen(db, 'GASTO', id)
    await db.restGasto.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
