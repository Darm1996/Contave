import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, setSessionCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, rol = 'CONTADOR' } = await req.json()
    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, contraseña y nombre son requeridos' }, { status: 400 })
    }
    const exist = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (exist) {
      return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 400 })
    }
    const passwordHash = await hashPassword(password)
    const user = await db.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name,
        passwordHash,
        role: ['SUPER_ADMIN', 'ADMIN', 'CONTADOR', 'AUXILIAR'].includes(rol) ? rol : 'CONTADOR',
      },
    })
    await setSessionCookie({ userId: user.id, email: user.email, role: user.role })
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } })
  } catch (e: any) {
    console.error('Register error:', e)
    return NextResponse.json({ error: 'Error al registrar usuario' }, { status: 500 })
  }
}
