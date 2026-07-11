import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'

// Cambiar empresa activa
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { empresaId } = await req.json()
    // Verificar que el usuario tenga acceso
    const userEmp = await db.userEmpresa.findUnique({
      where: { userId_empresaId: { userId: user.id, empresaId } },
    })
    if (!userEmp) {
      return NextResponse.json({ error: 'No tienes acceso a esta empresa' }, { status: 403 })
    }
    await setSessionCookieFromUser(user, empresaId)
    return NextResponse.json({ ok: true, empresaId })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

// Helper para reconstruir la cookie
async function setSessionCookieFromUser(user: any, empresaId: string) {
  const { setSessionCookie } = await import('@/lib/auth')
  await setSessionCookie({
    userId: user.id,
    email: user.email,
    role: user.role,
    empresaId,
  })
}
