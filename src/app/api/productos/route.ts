import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { registrarProducto, listarProductos } from '@/lib/contabilidad/inventario'

export async function GET() {
  try {
    const empresaId = await requireEmpresa()
    const productos = await listarProductos(empresaId)
    return NextResponse.json({ productos })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const body = await req.json()
    const producto = await registrarProducto(empresaId, body)
    return NextResponse.json({ producto })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
