import { NextRequest } from 'next/server'
import { exigirPermiso, filtrarCostos } from '@/lib/nucleo/permisos'
import { ok, manejarError } from '@/lib/nucleo/respuesta'
import { esquemaAnularVenta } from '@/lib/nucleo/esquemas'
import { anularVenta } from '@/lib/nucleo/ventas'
import { registrarAuditoria } from '@/lib/auditoria'

// POST /api/ventas/[id]/anular
//
// Permiso propio ('venta.anular'): un cajero no anula sus propias ventas, se
// lo pide al supervisor. Es la separación de funciones que evita que quien
// cobra pueda deshacer un cobro sin que nadie lo vea.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await exigirPermiso('venta.anular')
    const { id } = await params
    const { motivo } = esquemaAnularVenta.parse(await req.json())

    const venta = await anularVenta(ctx, id, motivo)

    await registrarAuditoria({
      empresaId: ctx.empresaId,
      userId: ctx.usuarioId,
      userEmail: ctx.email,
      accion: 'VENTA_ANULADA',
      entidad: 'Venta',
      entidadId: venta.id,
      detalle: `${venta.serie}-${venta.numero} anulada: ${motivo}`,
    })

    return ok({ venta: filtrarCostos(venta, ctx) })
  } catch (error) {
    return manejarError(error)
  }
}
