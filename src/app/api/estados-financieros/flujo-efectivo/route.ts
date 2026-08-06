import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { generarFlujoEfectivo } from '@/lib/contabilidad/estados-financieros'

// GET /api/estados-financieros/flujo-efectivo?hasta=2026-12-31&desde=2026-01-01
export async function GET(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const { searchParams } = new URL(req.url)
    const hastaStr = searchParams.get('hasta') || new Date().toISOString().slice(0, 10)
    const desdeStr = searchParams.get('desde')

    const hasta = new Date(hastaStr)
    hasta.setHours(23, 59, 59, 999)
    const desde = desdeStr ? new Date(desdeStr) : new Date(hasta.getFullYear(), 0, 1)

    const flujo = await generarFlujoEfectivo(empresaId, desde, hasta)
    return NextResponse.json({ flujo, hasta, desde })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}
