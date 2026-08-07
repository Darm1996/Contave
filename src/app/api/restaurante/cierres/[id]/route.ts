import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'
import { borrarMovimientosDeOrigen } from '@/lib/restaurante/fondos'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const empresaId = await requireEmpresa()
    const { id } = await params

    const cierre = await db.restCierreDiario.findFirst({ where: { id, empresaId } })
    if (!cierre) return NextResponse.json({ error: 'El cierre no existe' }, { status: 404 })

    // Primero se retiran los ingresos que este cierre metió en los fondos;
    // si no, el saldo quedaría inflado tras borrarlo.
    await borrarMovimientosDeOrigen(db, 'CIERRE', id)
    await db.restCierreDiario.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
