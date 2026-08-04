import { NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { desactivarEmpleado } from '@/lib/contabilidad/nomina'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const empresaId = await requireEmpresa()
    const { id } = await params
    const empleado = await desactivarEmpleado(empresaId, id)
    return NextResponse.json({ empleado })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
