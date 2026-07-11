import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { generarReporteISLRMensual } from '@/lib/contabilidad/reporte-islr'

// GET /api/islr/reporte?mes=7&ano=2026
export async function GET(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const { searchParams } = new URL(req.url)
    const mes = parseInt(searchParams.get('mes') || String(new Date().getMonth() + 1))
    const ano = parseInt(searchParams.get('ano') || String(new Date().getFullYear()))

    if (mes < 1 || mes > 12) {
      return NextResponse.json({ error: 'Mes inválido (1-12)' }, { status: 400 })
    }

    const reporte = await generarReporteISLRMensual(empresaId, mes, ano)
    return NextResponse.json({ reporte })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}
