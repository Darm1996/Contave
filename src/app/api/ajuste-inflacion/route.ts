import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireEmpresa } from '@/lib/auth'
import { calcularAjusteInflacion, listarAjustesInflacion } from '@/lib/contabilidad/ajuste-inflacion'

export async function GET() {
  try {
    const empresaId = await requireEmpresa()
    const ajustes = await listarAjustesInflacion(empresaId)
    return NextResponse.json({ ajustes })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

// POST /api/ajuste-inflacion - Body: { mes, ano }
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const empresaId = await requireEmpresa()
    const { mes, ano } = await req.json()
    if (!mes || !ano) return NextResponse.json({ error: 'mes y ano son requeridos' }, { status: 400 })
    const resultado = await calcularAjusteInflacion(empresaId, Number(mes), Number(ano), user.id)
    return NextResponse.json(resultado)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
