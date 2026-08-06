import { NextResponse } from 'next/server'
import { requireEmpresaRole } from '@/lib/auth'
import { listarNotificaciones } from '@/lib/notificaciones'

// GET /api/notificaciones
export async function GET() {
  try {
    const { empresaId } = await requireEmpresaRole('AUXILIAR')
    const notificaciones = await listarNotificaciones(empresaId)
    return NextResponse.json({ notificaciones })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
