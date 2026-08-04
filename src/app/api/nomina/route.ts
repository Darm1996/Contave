import { NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { listarNominas } from '@/lib/contabilidad/nomina'

export async function GET() {
  try {
    const empresaId = await requireEmpresa()
    const nominas = await listarNominas(empresaId)
    return NextResponse.json({ nominas })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}
