import { NextRequest } from 'next/server'
import { exigirPermiso, filtrarCostos } from '@/lib/nucleo/permisos'
import { ok, manejarError, ErrorNegocio } from '@/lib/nucleo/respuesta'
import { obtenerKardex } from '@/lib/nucleo/inventario'

// GET /api/inventario/kardex?varianteId=...&almacenId=...&desde=...&hasta=...
export async function GET(req: NextRequest) {
  try {
    const ctx = await exigirPermiso('inventario.ver')
    const { searchParams } = new URL(req.url)

    const varianteId = searchParams.get('varianteId')
    if (!varianteId) throw new ErrorNegocio('Indica la variante cuyo kardex quieres consultar', 400)

    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')

    const kardex = await obtenerKardex({
      organizacionId: ctx.organizacionId,
      varianteId,
      almacenId: searchParams.get('almacenId') ?? undefined,
      desde: desde ? new Date(desde) : undefined,
      hasta: hasta ? new Date(hasta) : undefined,
    })

    // El kardex lleva costo unitario y costo promedio en cada línea: sin este
    // filtro, un cajero con permiso de ver existencias deduciría el costo
    // leyendo el kardex.
    return ok(filtrarCostos(kardex, ctx))
  } catch (error) {
    return manejarError(error)
  }
}
