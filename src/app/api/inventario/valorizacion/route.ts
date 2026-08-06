import { NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { valorizacionTotal } from '@/lib/contabilidad/inventario'

export async function GET() {
  try {
    const empresaId = await requireEmpresa()
    const total = await valorizacionTotal(empresaId)
    return NextResponse.json({ total })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}
