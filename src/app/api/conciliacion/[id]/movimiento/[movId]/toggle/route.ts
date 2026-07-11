import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { toggleConciliacionMovimiento } from '@/lib/contabilidad/conciliacion-banco'

// POST /api/conciliacion/[id]/movimiento/[movId]/toggle
// Body: { asientoLineaId? }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; movId: string }> }) {
  try {
    await requireEmpresa()
    const { id, movId } = await params
    const body = await req.json().catch(() => ({}))
    const resultado = await toggleConciliacionMovimiento(movId, body.asientoLineaId)
    return NextResponse.json({ ok: true, movimiento: resultado })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
