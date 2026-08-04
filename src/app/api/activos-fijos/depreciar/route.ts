import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireEmpresa } from '@/lib/auth'
import { generarAsientoDepreciacionMes } from '@/lib/contabilidad/activos-fijos'

// POST /api/activos-fijos/depreciar - Body: { mes, ano }
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const empresaId = await requireEmpresa()
    const { mes, ano } = await req.json()
    if (!mes || !ano) return NextResponse.json({ error: 'mes y ano son requeridos' }, { status: 400 })
    const resultado = await generarAsientoDepreciacionMes(empresaId, Number(mes), Number(ano), user.id)
    return NextResponse.json(resultado)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
