import { NextRequest } from 'next/server'
import { exigirPermiso, filtrarCostos } from '@/lib/nucleo/permisos'
import { ok, manejarError } from '@/lib/nucleo/respuesta'
import { esquemaVenta } from '@/lib/nucleo/esquemas'
import { confirmarVenta, listarVentas } from '@/lib/nucleo/ventas'
import { registrarAuditoria } from '@/lib/auditoria'

// GET /api/ventas — historial paginado. Un cajero solo ve sus propias ventas.
export async function GET(req: NextRequest) {
  try {
    const ctx = await exigirPermiso('venta.ver')
    const { searchParams } = new URL(req.url)

    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')

    const resultado = await listarVentas(ctx, {
      sucursalId: searchParams.get('sucursalId') ?? undefined,
      sesionCajaId: searchParams.get('sesionCajaId') ?? undefined,
      estado: searchParams.get('estado') ?? undefined,
      desde: desde ? new Date(desde) : undefined,
      hasta: hasta ? new Date(hasta) : undefined,
      pagina: Number(searchParams.get('pagina') ?? 1),
      porPagina: Number(searchParams.get('porPagina') ?? 50),
    })

    // El historial trae costoTotal por venta: sin filtrar, un cajero deduciría
    // el margen del negocio desde su propia lista de ventas.
    return ok(filtrarCostos(resultado, ctx))
  } catch (error) {
    return manejarError(error)
  }
}

// POST /api/ventas — confirma una venta completa de forma atómica.
export async function POST(req: NextRequest) {
  try {
    const ctx = await exigirPermiso('venta.crear')
    const datos = esquemaVenta.parse(await req.json())

    const venta = await confirmarVenta(ctx, datos)

    await registrarAuditoria({
      organizacionId: ctx.organizacionId,
      userId: ctx.usuarioId,
      userEmail: ctx.email,
      accion: 'VENTA_CONFIRMADA',
      entidad: 'Venta',
      entidadId: venta.id,
      detalle: `${venta.tipoDocumento} ${venta.serie}-${venta.numero} por ${venta.total.toString()} ${venta.moneda}`,
    })

    return ok({ venta: filtrarCostos(venta, ctx) }, 201)
  } catch (error) {
    return manejarError(error)
  }
}
