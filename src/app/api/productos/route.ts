import { NextRequest } from 'next/server'
import { exigirPermiso } from '@/lib/nucleo/permisos'
import { ok, manejarError } from '@/lib/nucleo/respuesta'
import { esquemaProducto } from '@/lib/nucleo/esquemas'
import { crearProducto, listarProductos } from '@/lib/nucleo/catalogo'

// GET /api/productos?busqueda=&categoriaId=&pagina=&porPagina=
export async function GET(req: NextRequest) {
  try {
    const ctx = await exigirPermiso('producto.ver')
    const { searchParams } = new URL(req.url)

    const resultado = await listarProductos(ctx, {
      busqueda: searchParams.get('busqueda') ?? undefined,
      categoriaId: searchParams.get('categoriaId') ?? undefined,
      pagina: Number(searchParams.get('pagina') ?? 1),
      porPagina: Number(searchParams.get('porPagina') ?? 50),
      soloActivos: searchParams.get('incluirInactivos') !== 'true',
    })

    return ok(resultado)
  } catch (error) {
    return manejarError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await exigirPermiso('producto.crear')
    const datos = esquemaProducto.parse(await req.json())
    const producto = await crearProducto(ctx, datos)
    return ok({ producto }, 201)
  } catch (error) {
    return manejarError(error)
  }
}
