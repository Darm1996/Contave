import { NextRequest } from 'next/server'
import { exigirPermiso } from '@/lib/nucleo/permisos'
import { ok, manejarError } from '@/lib/nucleo/respuesta'
import { esquemaAbrirTurno } from '@/lib/nucleo/esquemas'
import { abrirTurno, turnoAbierto, flujoDeCaja } from '@/lib/nucleo/caja'

// GET /api/caja/turnos            — el turno abierto del usuario (lo que consulta el POS al arrancar)
// GET /api/caja/turnos?flujo=1... — flujo de caja de un período
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    if (searchParams.get('flujo') === '1') {
      const ctx = await exigirPermiso('caja.ver_todas')
      const desde = searchParams.get('desde')
      const hasta = searchParams.get('hasta')
      const flujo = await flujoDeCaja(
        ctx,
        desde ? new Date(desde) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        hasta ? new Date(hasta) : new Date(),
      )
      return ok({ flujo })
    }

    const ctx = await exigirPermiso('caja.abrir')
    const turno = await turnoAbierto(ctx, searchParams.get('cajaId') ?? undefined)
    return ok({ turno })
  } catch (error) {
    return manejarError(error)
  }
}

// POST /api/caja/turnos — abre el turno con su fondo inicial.
export async function POST(req: NextRequest) {
  try {
    const ctx = await exigirPermiso('caja.abrir')
    const datos = esquemaAbrirTurno.parse(await req.json())
    const turno = await abrirTurno(ctx, datos)
    return ok({ turno }, 201)
  } catch (error) {
    return manejarError(error)
  }
}
