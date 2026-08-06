import { NextResponse } from 'next/server'
import { requireEmpresaRole } from '@/lib/auth'
import { desactivarAccionista } from '@/lib/societario'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { empresaId } = await requireEmpresaRole('ADMIN')
    const { id } = await params
    const accionista = await desactivarAccionista(empresaId, id)
    return NextResponse.json({ accionista })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
