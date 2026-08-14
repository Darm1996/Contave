import { NextRequest } from 'next/server'
import { exigirPermiso } from '@/lib/nucleo/permisos'
import { ok, manejarError } from '@/lib/nucleo/respuesta'
import { esquemaMovimientoInventario } from '@/lib/nucleo/esquemas'
import { registrarMovimiento } from '@/lib/nucleo/inventario'
import { registrarAuditoria } from '@/lib/auditoria'

// POST /api/inventario/movimientos — entrada, ajuste o merma manual.
// Las salidas por venta y las entradas por compra NO pasan por aquí: las
// registra el propio documento dentro de su transacción, para que descontar
// inventario y cobrar sean una sola operación indivisible.
export async function POST(req: NextRequest) {
  try {
    const datos = esquemaMovimientoInventario.parse(await req.json())

    // El ajuste y la merma exigen un permiso distinto del de mover: son las
    // dos vías por las que se puede "cuadrar" un inventario a mano, y por eso
    // se restringen a supervisor o superior.
    const permiso = ['AJUSTE_CONTEO', 'MERMA'].includes(datos.tipo) ? 'inventario.ajustar' : 'inventario.mover'
    const ctx = await exigirPermiso(permiso)

    const movimiento = await registrarMovimiento({
      organizacionId: ctx.organizacionId,
      varianteId: datos.varianteId,
      almacenId: datos.almacenId,
      tipo: datos.tipo,
      cantidad: datos.cantidad,
      costoUnitario: datos.costoUnitario,
      loteId: datos.loteId,
      motivo: datos.motivo,
      usuarioId: ctx.usuarioId,
    })

    await registrarAuditoria({
      empresaId: ctx.empresaId,
      userId: ctx.usuarioId,
      userEmail: ctx.email,
      accion: `INVENTARIO_${datos.tipo}`,
      entidad: 'MovimientoInventario',
      entidadId: movimiento.id,
      detalle: `${datos.tipo} de ${datos.cantidad} — ${datos.motivo}`,
    })

    return ok({ movimiento }, 201)
  } catch (error) {
    return manejarError(error)
  }
}
