import { NextResponse } from 'next/server'
import { requireEmpresaRole } from '@/lib/auth'
import { desactivarProducto } from '@/lib/contabilidad/inventario'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { empresaId } = await requireEmpresaRole('CONTADOR')
    const { id } = await params
    const producto = await desactivarProducto(empresaId, id)
    return NextResponse.json({ producto })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
