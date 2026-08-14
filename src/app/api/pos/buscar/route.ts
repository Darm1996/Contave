import { NextRequest } from 'next/server'
import { exigirPermiso } from '@/lib/nucleo/permisos'
import { ok, manejarError, ErrorNegocio } from '@/lib/nucleo/respuesta'
import { buscarPorCodigoBarras, listarProductos } from '@/lib/nucleo/catalogo'

// GET /api/pos/buscar?codigo=... — resuelve un escaneo a un único producto
// GET /api/pos/buscar?q=...      — búsqueda por nombre o SKU, paginada
//
// La búsqueda se resuelve en Postgres con índices trigrama, no trayendo el
// catálogo al cliente: el POS tiene que responder mientras el cajero teclea, y
// veinte mil productos en el teléfono no caben ni cargan.
export async function GET(req: NextRequest) {
  try {
    const ctx = await exigirPermiso('producto.ver')
    const { searchParams } = new URL(req.url)

    const codigo = searchParams.get('codigo')
    if (codigo) {
      // Camino del escáner: un código de barras identifica exactamente una
      // variante, así que se devuelve lista para agregar al carrito.
      const variante = await buscarPorCodigoBarras(ctx, codigo.trim())
      return ok({ variante })
    }

    const q = searchParams.get('q')?.trim()
    if (!q || q.length < 2) {
      throw new ErrorNegocio('Escribe al menos dos caracteres para buscar', 400)
    }

    const resultado = await listarProductos(ctx, {
      busqueda: q,
      porPagina: Number(searchParams.get('porPagina') ?? 20),
      pagina: Number(searchParams.get('pagina') ?? 1),
    })

    return ok(resultado)
  } catch (error) {
    return manejarError(error)
  }
}
