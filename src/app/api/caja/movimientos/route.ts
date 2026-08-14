import { NextRequest } from 'next/server'
import { exigirPermiso } from '@/lib/nucleo/permisos'
import { ok, manejarError } from '@/lib/nucleo/respuesta'
import { esquemaMovimientoCaja } from '@/lib/nucleo/esquemas'
import { registrarMovimientoCaja } from '@/lib/nucleo/caja'
import { registrarAuditoria } from '@/lib/auditoria'

// POST /api/caja/movimientos
//
// Ingresos y egresos de caja que no son ventas: un préstamo del dueño, el pago
// de un flete en efectivo, el envío de efectivo a la bóveda. Existen porque
// sin ellos esos movimientos aparecen como una diferencia inexplicable en el
// arqueo y alguien queda señalado por un faltante que no cometió.
export async function POST(req: NextRequest) {
  try {
    const ctx = await exigirPermiso('caja.movimiento')
    const datos = esquemaMovimientoCaja.parse(await req.json())

    const movimiento = await registrarMovimientoCaja(ctx, datos)

    await registrarAuditoria({
      empresaId: ctx.empresaId,
      userId: ctx.usuarioId,
      userEmail: ctx.email,
      accion: `CAJA_${datos.tipo}`,
      entidad: 'MovimientoCaja',
      entidadId: movimiento.id,
      detalle: `${datos.concepto} — ${datos.monto}`,
    })

    return ok({ movimiento }, 201)
  } catch (error) {
    return manejarError(error)
  }
}
