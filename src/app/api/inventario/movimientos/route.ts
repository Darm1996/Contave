import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireEmpresa } from '@/lib/auth'
import { registrarMovimiento, obtenerKardex } from '@/lib/contabilidad/inventario'

// GET /api/inventario/movimientos?productoId=... - kardex de un producto
export async function GET(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const { searchParams } = new URL(req.url)
    const productoId = searchParams.get('productoId')
    if (!productoId) return NextResponse.json({ error: 'productoId es requerido' }, { status: 400 })
    const kardex = await obtenerKardex(empresaId, productoId)
    return NextResponse.json(kardex)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

// POST /api/inventario/movimientos - Body: { productoId, tipo, cantidad, costoUnitario?, motivo?, generarAsientoCosto? }
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const empresaId = await requireEmpresa()
    const body = await req.json()
    const movimiento = await registrarMovimiento(empresaId, { ...body, userId: user.id })
    return NextResponse.json({ movimiento })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
