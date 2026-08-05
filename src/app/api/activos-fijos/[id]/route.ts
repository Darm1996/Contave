import { NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { darDeBajaActivo } from '@/lib/contabilidad/activos-fijos'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const empresaId = await requireEmpresa()
    const { id } = await params
    const activo = await darDeBajaActivo(empresaId, id)
    return NextResponse.json({ activo })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
