import { NextRequest } from 'next/server'
import { exigirPermiso } from '@/lib/nucleo/permisos'
import { ok, manejarError } from '@/lib/nucleo/respuesta'
import { resumenTurno } from '@/lib/nucleo/caja'

// GET /api/caja/turnos/[id]/resumen
//
// Lo que el cajero ve antes de contar: cuánto debería haber en la gaveta y el
// desglose por método de cobro. El efectivo esperado se deriva de los cobros
// registrados, nunca se escribe a mano.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await exigirPermiso('caja.cerrar')
    const { id } = await params
    const resumen = await resumenTurno(ctx, id)
    return ok({ resumen })
  } catch (error) {
    return manejarError(error)
  }
}
