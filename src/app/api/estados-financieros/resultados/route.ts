import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { generarEstadoResultado } from '@/lib/contabilidad/estados-financieros'

// GET /api/estados-financieros/resultados?desde=2026-01-01&hasta=2026-12-31
export async function GET(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const { searchParams } = new URL(req.url)
    const hastaStr = searchParams.get('hasta') || new Date().toISOString().slice(0, 10)
    const desdeStr = searchParams.get('desde') || `${new Date(hastaStr).getFullYear()}-01-01`

    const desde = new Date(desdeStr)
    desde.setHours(0, 0, 0, 0)
    const hasta = new Date(hastaStr)
    hasta.setHours(23, 59, 59, 999)

    const estado = await generarEstadoResultado(empresaId, desde, hasta)
    return NextResponse.json({ estado, desde, hasta })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}
