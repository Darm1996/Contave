import { NextRequest } from 'next/server'
import { exigirPermiso } from '@/lib/nucleo/permisos'
import { ok, manejarError } from '@/lib/nucleo/respuesta'
import { esquemaCerrarTurno } from '@/lib/nucleo/esquemas'
import { cerrarTurno } from '@/lib/nucleo/caja'
import { registrarAuditoria } from '@/lib/auditoria'

// POST /api/caja/turnos/[id]/cerrar — arqueo y cierre.
//
// Si el efectivo contado no coincide con el esperado, la respuesta es 422 con
// el detalle de cuánto falta o sobra: el cierre no procede hasta que se
// justifique la diferencia.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await exigirPermiso('caja.cerrar')
    const { id } = await params
    const datos = esquemaCerrarTurno.parse(await req.json())

    const resultado = await cerrarTurno(ctx, { sesionCajaId: id, ...datos })

    // Un arqueo con diferencia es información sensible para el dueño: queda en
    // la bitácora con el nombre de quien contó.
    await registrarAuditoria({
      empresaId: ctx.empresaId,
      userId: ctx.usuarioId,
      userEmail: ctx.email,
      accion: 'CAJA_ARQUEO',
      entidad: 'Arqueo',
      entidadId: resultado.arqueo.id,
      detalle:
        `Esperado ${resultado.arqueo.efectivoEsperado.toString()}, ` +
        `contado ${resultado.arqueo.efectivoContado.toString()}, ` +
        `diferencia ${resultado.arqueo.diferencia.toString()}` +
        (resultado.arqueo.justificacion ? ` — ${resultado.arqueo.justificacion}` : ''),
    })

    return ok(resultado)
  } catch (error) {
    return manejarError(error)
  }
}
