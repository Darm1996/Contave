import { NextRequest } from 'next/server'
import { exigirPermiso, filtrarCostos } from '@/lib/nucleo/permisos'
import { ok, manejarError } from '@/lib/nucleo/respuesta'
import { obtenerVenta } from '@/lib/nucleo/ventas'

// GET /api/ventas/[id] — el documento completo, para reimprimir el ticket.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await exigirPermiso('venta.ver')
    const { id } = await params
    const venta = await obtenerVenta(ctx, id)
    return ok({ venta: filtrarCostos(venta, ctx) })
  } catch (error) {
    return manejarError(error)
  }
}
