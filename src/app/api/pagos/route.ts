import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa, requireEmpresaRole } from '@/lib/auth'
import { registrarPago, historialPagos } from '@/lib/contabilidad/cuentas-por-cobrar-pagar'

// GET /api/pagos?facturaId=... - historial de pagos de una factura
export async function GET(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const { searchParams } = new URL(req.url)
    const facturaId = searchParams.get('facturaId')
    if (!facturaId) return NextResponse.json({ error: 'facturaId es requerido' }, { status: 400 })
    const pagos = await historialPagos(empresaId, facturaId)
    return NextResponse.json({ pagos })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

// POST /api/pagos - Body: { facturaId, monto, fecha?, metodoPago, referencia?, cuentaId?, generarAsiento? }
export async function POST(req: NextRequest) {
  try {
    const { user, empresaId } = await requireEmpresaRole('CONTADOR')
    const body = await req.json()
    const pago = await registrarPago(empresaId, {
      ...body,
      fecha: body.fecha ? new Date(body.fecha) : undefined,
      userId: user.id,
    })
    return NextResponse.json({ pago })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
