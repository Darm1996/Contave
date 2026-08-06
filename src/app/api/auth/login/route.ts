import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, setSessionCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 })
    }
    const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (!user) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }
    const ok = await verifyPassword(password, user.passwordHash)
    if (!ok) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }
    // Buscar primera empresa del usuario para activarla por defecto
    const userEmp = await db.userEmpresa.findFirst({
      where: { userId: user.id },
      include: { empresa: true },
    })
    const empresaId = userEmp?.empresaId
    await setSessionCookie({
      userId: user.id,
      email: user.email,
      role: user.role,
      empresaId,
    })
    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      empresaActiva: userEmp ? { ...userEmp.empresa, rol: userEmp.rol } : null,
    })
  } catch (e: any) {
    console.error('Login error:', e)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
