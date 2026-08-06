// Registro de auditoría para acciones sensibles: cierre/reapertura de
// ejercicios, liquidaciones de personal, cambios de rol/equipo, edición de
// la empresa y desactivación de registros. Solo ADMIN puede consultarlo.

import { db } from '@/lib/db'

export interface RegistrarAuditoriaInput {
  empresaId: string
  userId: string
  userEmail: string
  accion: string
  entidad?: string
  entidadId?: string
  detalle?: string
}

// Nunca debe tumbar la acción principal: si falla el registro de auditoría
// (por ejemplo, un problema transitorio de conexión), se registra en
// consola y se sigue — no se relanza el error.
export async function registrarAuditoria(input: RegistrarAuditoriaInput) {
  try {
    await db.auditLog.create({
      data: {
        empresaId: input.empresaId,
        userId: input.userId,
        userEmail: input.userEmail,
        accion: input.accion,
        entidad: input.entidad || null,
        entidadId: input.entidadId || null,
        detalle: input.detalle || null,
      },
    })
  } catch (e) {
    console.error('No se pudo registrar auditoría:', e)
  }
}

export async function listarAuditoria(empresaId: string, opts: { accion?: string; limit?: number } = {}) {
  return db.auditLog.findMany({
    where: { empresaId, ...(opts.accion ? { accion: opts.accion } : {}) },
    orderBy: { createdAt: 'desc' },
    take: opts.limit || 200,
  })
}
