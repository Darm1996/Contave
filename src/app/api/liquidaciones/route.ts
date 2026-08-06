import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireEmpresa } from '@/lib/auth'
import { procesarLiquidacion, listarLiquidaciones } from '@/lib/contabilidad/nomina-lottt'

// GET /api/liquidaciones - historial de liquidaciones de la empresa
export async function GET() {
  try {
    const empresaId = await requireEmpresa()
    const liquidaciones = await listarLiquidaciones(empresaId)
    return NextResponse.json({ liquidaciones })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

// POST /api/liquidaciones - Body: { empleadoId, fechaEgreso, motivoEgreso, generarAsiento?, cuentaId? }
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const empresaId = await requireEmpresa()
    const body = await req.json()
    const liquidacion = await procesarLiquidacion(empresaId, { ...body, userId: user.id })
    return NextResponse.json({ liquidacion })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
