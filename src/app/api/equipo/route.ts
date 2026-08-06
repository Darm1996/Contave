import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresaRole } from '@/lib/auth'
import { listarMiembros, agregarMiembro, cambiarRolMiembro, removerMiembro } from '@/lib/equipo'
import { ROLES_EMPRESA } from '@/lib/auth'
import { registrarAuditoria } from '@/lib/auditoria'

// GET /api/equipo - miembros de la empresa activa (cualquier miembro puede ver el equipo)
export async function GET() {
  try {
    const { empresaId } = await requireEmpresaRole('AUXILIAR')
    const miembros = await listarMiembros(empresaId)
    return NextResponse.json({ miembros })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

// POST /api/equipo - agregar miembro existente. Body: { email, rol }
export async function POST(req: NextRequest) {
  try {
    const { user, empresaId } = await requireEmpresaRole('ADMIN')
    const body = await req.json()
    if (!body.email || !ROLES_EMPRESA.includes(body.rol)) {
      return NextResponse.json({ error: 'email y rol (AUXILIAR/CONTADOR/ADMIN) son requeridos' }, { status: 400 })
    }
    const miembro = await agregarMiembro(empresaId, { email: body.email, rol: body.rol })
    await registrarAuditoria({
      empresaId, userId: user.id, userEmail: user.email,
      accion: 'MIEMBRO_AGREGADO', entidad: 'UserEmpresa', entidadId: miembro.userId,
      detalle: `Se agregó a ${miembro.email} con rol ${miembro.rol}`,
    })
    return NextResponse.json({ miembro })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

// PATCH /api/equipo - cambiar rol. Body: { userId, rol }
export async function PATCH(req: NextRequest) {
  try {
    const { user, empresaId } = await requireEmpresaRole('ADMIN')
    const body = await req.json()
    if (!body.userId || !ROLES_EMPRESA.includes(body.rol)) {
      return NextResponse.json({ error: 'userId y rol son requeridos' }, { status: 400 })
    }
    const miembro = await cambiarRolMiembro(empresaId, body.userId, body.rol)
    await registrarAuditoria({
      empresaId, userId: user.id, userEmail: user.email,
      accion: 'ROL_CAMBIADO', entidad: 'UserEmpresa', entidadId: body.userId,
      detalle: `Rol cambiado a ${body.rol}`,
    })
    return NextResponse.json({ miembro })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

// DELETE /api/equipo?userId=... - remover miembro
export async function DELETE(req: NextRequest) {
  try {
    const { user, empresaId } = await requireEmpresaRole('ADMIN')
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId es requerido' }, { status: 400 })
    await removerMiembro(empresaId, userId)
    await registrarAuditoria({
      empresaId, userId: user.id, userEmail: user.email,
      accion: 'MIEMBRO_REMOVIDO', entidad: 'UserEmpresa', entidadId: userId,
    })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
