// Gestión de miembros de una empresa (UserEmpresa) y sus roles.
// No hay envío de invitaciones por correo todavía (ver módulo de
// notificaciones): agregar un miembro requiere que ya exista una cuenta
// ContaVE registrada con ese email.

import { db } from '@/lib/db'
import type { RolEmpresa } from '@/lib/auth'

export async function listarMiembros(empresaId: string) {
  const miembros = await db.userEmpresa.findMany({
    where: { empresaId },
    include: { user: { select: { id: true, email: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return miembros.map((m) => ({ userId: m.userId, email: m.user.email, nombre: m.user.name, rol: m.rol, desde: m.createdAt }))
}

export interface AgregarMiembroInput {
  email: string
  rol: RolEmpresa
}

export async function agregarMiembro(empresaId: string, input: AgregarMiembroInput) {
  const email = input.email.toLowerCase().trim()
  const usuario = await db.user.findUnique({ where: { email } })
  if (!usuario) {
    throw new Error('No existe una cuenta ContaVE con ese email. La persona debe registrarse primero.')
  }
  const existente = await db.userEmpresa.findUnique({
    where: { userId_empresaId: { userId: usuario.id, empresaId } },
  })
  if (existente) throw new Error('Este usuario ya es miembro de la empresa')

  await db.userEmpresa.create({ data: { userId: usuario.id, empresaId, rol: input.rol } })
  return { userId: usuario.id, email: usuario.email, nombre: usuario.name, rol: input.rol }
}

async function contarAdmins(empresaId: string): Promise<number> {
  return db.userEmpresa.count({ where: { empresaId, rol: 'ADMIN' } })
}

export async function cambiarRolMiembro(empresaId: string, userId: string, nuevoRol: RolEmpresa) {
  const miembro = await db.userEmpresa.findUnique({ where: { userId_empresaId: { userId, empresaId } } })
  if (!miembro) throw new Error('Ese usuario no es miembro de la empresa')
  if (miembro.rol === 'ADMIN' && nuevoRol !== 'ADMIN' && (await contarAdmins(empresaId)) <= 1) {
    throw new Error('No puedes quitar el rol de administrador al último ADMIN de la empresa')
  }
  return db.userEmpresa.update({ where: { userId_empresaId: { userId, empresaId } }, data: { rol: nuevoRol } })
}

export async function removerMiembro(empresaId: string, userId: string) {
  const miembro = await db.userEmpresa.findUnique({ where: { userId_empresaId: { userId, empresaId } } })
  if (!miembro) throw new Error('Ese usuario no es miembro de la empresa')
  const totalMiembros = await db.userEmpresa.count({ where: { empresaId } })
  if (totalMiembros <= 1) throw new Error('No puedes remover al único miembro de la empresa')
  if (miembro.rol === 'ADMIN' && (await contarAdmins(empresaId)) <= 1) {
    throw new Error('No puedes remover al último ADMIN de la empresa')
  }
  await db.userEmpresa.delete({ where: { userId_empresaId: { userId, empresaId } } })
}
