import { NextRequest } from 'next/server'
import { exigirPermiso } from '@/lib/nucleo/permisos'
import { ok, manejarError } from '@/lib/nucleo/respuesta'
import { esquemaEditarProducto } from '@/lib/nucleo/esquemas'
import { desactivarProducto, editarProducto } from '@/lib/nucleo/catalogo'
import { registrarAuditoria } from '@/lib/auditoria'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await exigirPermiso('producto.editar')
    const { id } = await params
    const datos = esquemaEditarProducto.parse(await req.json())
    const producto = await editarProducto(ctx, id, datos)
    return ok({ producto })
  } catch (error) {
    return manejarError(error)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await exigirPermiso('producto.anular')
    const { id } = await params
    const producto = await desactivarProducto(ctx, id)

    await registrarAuditoria({
      organizacionId: ctx.organizacionId,
      userId: ctx.usuarioId,
      userEmail: ctx.email,
      accion: 'PRODUCTO_DESACTIVADO',
      entidad: 'Producto',
      entidadId: id,
      detalle: `Producto ${producto.nombre} desactivado`,
    })

    return ok({ producto })
  } catch (error) {
    return manejarError(error)
  }
}
