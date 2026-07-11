import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { obtenerConciliacion, cargarMovimientosBanco, toggleConciliacionMovimiento } from '@/lib/contabilidad/conciliacion-banco'

// GET /api/conciliacion/[id] - obtener detalle
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireEmpresa()
    const { id } = await params
    const conciliacion = await obtenerConciliacion(id)
    if (!conciliacion) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
    return NextResponse.json({ conciliacion })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}
