import { NextRequest } from 'next/server'
import { exigirPermiso } from '@/lib/nucleo/permisos'
import { ok, manejarError } from '@/lib/nucleo/respuesta'
import { listarAuditoria } from '@/lib/auditoria'

// GET /api/auditoria — bitácora de operaciones sensibles.
export async function GET(req: NextRequest) {
  try {
    const ctx = await exigirPermiso('auditoria.ver')
    const { searchParams } = new URL(req.url)

    const registros = await listarAuditoria(ctx.organizacionId, {
      accion: searchParams.get('accion') ?? undefined,
      limit: Math.min(Number(searchParams.get('limite') ?? 200), 500),
    })

    return ok({ registros })
  } catch (error) {
    return manejarError(error)
  }
}
