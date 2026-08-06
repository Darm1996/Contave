import { NextResponse } from 'next/server'
import { requireEmpresaRole } from '@/lib/auth'
import { enviarNotificacion } from '@/lib/notificaciones'

// POST /api/notificaciones/[id]/enviar
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { empresaId } = await requireEmpresaRole('CONTADOR')
    const { id } = await params
    const notificacion = await enviarNotificacion(empresaId, id)
    return NextResponse.json({ notificacion })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
