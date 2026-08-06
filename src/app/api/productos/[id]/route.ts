import { NextResponse } from 'next/server'
import { requireEmpresaRole } from '@/lib/auth'
import { desactivarProducto } from '@/lib/contabilidad/inventario'
import { registrarAuditoria } from '@/lib/auditoria'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, empresaId } = await requireEmpresaRole('CONTADOR')
    const { id } = await params
    const producto = await desactivarProducto(empresaId, id)
    await registrarAuditoria({
      empresaId, userId: user.id, userEmail: user.email,
      accion: 'PRODUCTO_DESACTIVADO', entidad: 'Producto', entidadId: id,
      detalle: `Producto ${producto.nombre} desactivado`,
    })
    return NextResponse.json({ producto })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
