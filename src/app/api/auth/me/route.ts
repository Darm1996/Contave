import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ user: null, empresaActiva: null }, { status: 200 })
  const userEmps = await db.userEmpresa.findMany({
    where: { userId: user.id },
    include: { empresa: true },
  })
  const ueActiva = userEmps.find((ue) => ue.empresaId === user.empresaId)
  const empresaActiva = ueActiva ? { ...ueActiva.empresa, rol: ueActiva.rol } : null
  return NextResponse.json({
    user,
    empresaActiva,
    empresas: userEmps.map((ue) => ({ ...ue.empresa, rol: ue.rol })),
  })
}
