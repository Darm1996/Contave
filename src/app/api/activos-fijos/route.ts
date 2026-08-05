import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireEmpresa } from '@/lib/auth'
import { registrarActivo, listarActivos } from '@/lib/contabilidad/activos-fijos'

export async function GET() {
  try {
    const empresaId = await requireEmpresa()
    const activos = await listarActivos(empresaId)
    return NextResponse.json({ activos })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth()
    const empresaId = await requireEmpresa()
    const body = await req.json()
    const activo = await registrarActivo(empresaId, body)
    return NextResponse.json({ activo })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
