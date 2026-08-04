import { NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { obtenerNomina } from '@/lib/contabilidad/nomina'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const empresaId = await requireEmpresa()
    const { id } = await params
    const nomina = await obtenerNomina(empresaId, id)
    return NextResponse.json({ nomina })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
