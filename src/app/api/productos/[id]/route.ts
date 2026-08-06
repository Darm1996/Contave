import { NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { desactivarProducto } from '@/lib/contabilidad/inventario'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const empresaId = await requireEmpresa()
    const { id } = await params
    const producto = await desactivarProducto(empresaId, id)
    return NextResponse.json({ producto })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
