import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa, requireEmpresaRole } from '@/lib/auth'
import { registrarAccionista, listarAccionistas } from '@/lib/societario'

export async function GET() {
  try {
    const empresaId = await requireEmpresa()
    const accionistas = await listarAccionistas(empresaId)
    return NextResponse.json({ accionistas })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

// POST /api/accionistas - Body: { nombre, identificacion, numeroAcciones }
export async function POST(req: NextRequest) {
  try {
    const { empresaId } = await requireEmpresaRole('ADMIN')
    const body = await req.json()
    const accionista = await registrarAccionista(empresaId, body)
    return NextResponse.json({ accionista })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
