// Registro de auditoría para acciones sensibles: cierre/reapertura de
// ejercicios, liquidaciones de personal, cambios de rol/equipo, edición de
// el negocio y desactivación de registros. Requiere el permiso auditoria.ver.

import { db } from '@/lib/db'

export interface RegistrarAuditoriaInput {
  organizacionId: string
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
        organizacionId: input.organizacionId,
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

export async function listarAuditoria(organizacionId: string, opts: { accion?: string; limit?: number } = {}) {
  return db.auditLog.findMany({
    where: { organizacionId, ...(opts.accion ? { accion: opts.accion } : {}) },
    orderBy: { createdAt: 'desc' },
    take: opts.limit || 200,
  })
}
