import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { cargarMovimientosBanco } from '@/lib/contabilidad/conciliacion-banco'

// POST /api/conciliacion/[id]/movimientos - cargar movimientos del extracto
// Body: { movimientos: [{fecha, descripcion, referencia?, monto, tipo?}] }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireEmpresa()
    const { id } = await params
    const { movimientos } = await req.json()
    if (!Array.isArray(movimientos)) {
      return NextResponse.json({ error: 'movimientos debe ser un array' }, { status: 400 })
    }
    const resultado = await cargarMovimientosBanco(id, movimientos)
    return NextResponse.json({ ok: true, ...resultado })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
