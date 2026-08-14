import { NextRequest } from 'next/server'
import { exigirPermiso } from '@/lib/nucleo/permisos'
import { ok, manejarError } from '@/lib/nucleo/respuesta'
import { valorizacionActual, valorizacionAFecha, verificarIntegridadKardex } from '@/lib/nucleo/inventario'

// GET /api/inventario/valorizacion?hasta=YYYY-MM-DD&almacenId=...&verificar=true
export async function GET(req: NextRequest) {
  try {
    // Permiso propio: la valorización revela el costo del inventario completo,
    // así que un cajero no llega aquí ni conociendo la ruta.
    const ctx = await exigirPermiso('inventario.ver_valorizacion')
    const { searchParams } = new URL(req.url)

    const almacenId = searchParams.get('almacenId') ?? undefined
    const hasta = searchParams.get('hasta')

    // Con fecha se reconstruye desde el kardex (respuesta estable en el
    // tiempo); sin fecha se lee el caché de existencias (respuesta rápida).
    const valorizacion = hasta
      ? await valorizacionAFecha(ctx.organizacionId, new Date(hasta), almacenId)
      : { fecha: new Date(), valorTotal: await valorizacionActual(ctx.organizacionId, almacenId), detalle: [] }

    const integridad =
      searchParams.get('verificar') === 'true' ? await verificarIntegridadKardex(ctx.organizacionId) : undefined

    return ok({ valorizacion, integridad })
  } catch (error) {
    return manejarError(error)
  }
}
