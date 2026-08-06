import { NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { listarCxC, calcularAntiguedad } from '@/lib/contabilidad/cuentas-por-cobrar-pagar'

export async function GET() {
  try {
    const empresaId = await requireEmpresa()
    const partidas = await listarCxC(empresaId)
    return NextResponse.json({ partidas, antiguedad: calcularAntiguedad(partidas) })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
