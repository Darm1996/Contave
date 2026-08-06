import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa, requireEmpresaRole } from '@/lib/auth'
import { registrarActa, listarActas } from '@/lib/societario'

export async function GET() {
  try {
    const empresaId = await requireEmpresa()
    const actas = await listarActas(empresaId)
    return NextResponse.json({ actas })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

// POST /api/actas-asamblea - Body: { fecha, tipo, lugar?, agenda, acuerdos, asistentes, accionesRepresentadas }
export async function POST(req: NextRequest) {
  try {
    const { empresaId } = await requireEmpresaRole('ADMIN')
    const body = await req.json()
    const acta = await registrarActa(empresaId, body)
    return NextResponse.json({ acta })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
