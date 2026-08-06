import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { generarDeclaracionAnualISLR } from '@/lib/contabilidad/declaracion-islr-anual'

// GET /api/declaracion-islr-anual?ano=2026&partidasNoDeducibles=0&partidasExentas=0
export async function GET(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const { searchParams } = new URL(req.url)
    const ano = parseInt(searchParams.get('ano') || String(new Date().getFullYear()))
    const partidasNoDeducibles = Number(searchParams.get('partidasNoDeducibles') || 0)
    const partidasExentas = Number(searchParams.get('partidasExentas') || 0)

    const declaracion = await generarDeclaracionAnualISLR(empresaId, ano, { partidasNoDeducibles, partidasExentas })
    return NextResponse.json({ declaracion })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}
