import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa, requireEmpresaRole } from '@/lib/auth'
import { procesarLiquidacion, listarLiquidaciones } from '@/lib/contabilidad/nomina-lottt'
import { registrarAuditoria } from '@/lib/auditoria'

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
    const { user, empresaId } = await requireEmpresaRole('CONTADOR')
    const body = await req.json()
    const liquidacion = await procesarLiquidacion(empresaId, { ...body, userId: user.id })
    await registrarAuditoria({
      empresaId, userId: user.id, userEmail: user.email,
      accion: 'LIQUIDACION_PROCESADA', entidad: 'Liquidacion', entidadId: liquidacion.id,
      detalle: `Liquidación de empleado ${liquidacion.empleadoId} por ${liquidacion.motivoEgreso}. Total: ${liquidacion.totalLiquidacion}`,
    })
    return NextResponse.json({ liquidacion })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
