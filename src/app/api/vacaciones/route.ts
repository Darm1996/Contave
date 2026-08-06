import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireEmpresa } from '@/lib/auth'
import { registrarVacacion, listarVacaciones, resumenVacaciones } from '@/lib/contabilidad/nomina-lottt'

// GET /api/vacaciones?empleadoId=... - historial + resumen de vacaciones pendientes
export async function GET(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const { searchParams } = new URL(req.url)
    const empleadoId = searchParams.get('empleadoId')
    if (!empleadoId) return NextResponse.json({ error: 'empleadoId es requerido' }, { status: 400 })
    const [vacaciones, resumen] = await Promise.all([
      listarVacaciones(empresaId, empleadoId),
      resumenVacaciones(empresaId, empleadoId),
    ])
    return NextResponse.json({ vacaciones, resumen })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

// POST /api/vacaciones - Body: { empleadoId, fechaInicio, fechaFin, diasDisfrutados, generarAsiento?, cuentaId? }
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const empresaId = await requireEmpresa()
    const body = await req.json()
    const vacacion = await registrarVacacion(empresaId, { ...body, userId: user.id })
    return NextResponse.json({ vacacion })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
