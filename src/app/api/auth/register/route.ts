import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, setSessionCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json()
    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, contraseña y nombre son requeridos' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
    }
    const exist = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (exist) {
      return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 400 })
    }
    const passwordHash = await hashPassword(password)
    // El rol nunca se toma del cliente: el registro público solo puede crear
    // usuarios ADMIN de su propia empresa. SUPER_ADMIN se otorga aparte
    // (scripts/crear-super-admin.ts), nunca vía esta ruta pública.
    const user = await db.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name,
        passwordHash,
        role: 'ADMIN',
      },
    })
    await setSessionCookie({ userId: user.id, email: user.email, role: user.role })
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } })
  } catch (e: any) {
    console.error('Register error:', e)
    return NextResponse.json({ error: 'Error al registrar usuario' }, { status: 500 })
  }
}
