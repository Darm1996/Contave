import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { siguienteNumeroDocumento } from '@/lib/contabilidad/secuencia-documento'

// POST /api/secuencia-documento - Body: { tipo }. Devuelve y consume el siguiente
// número del correlativo (acción mutante, por eso es POST y no GET).
export async function POST(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const { tipo } = await req.json()
    if (!tipo) return NextResponse.json({ error: 'tipo es requerido' }, { status: 400 })
    const numero = await siguienteNumeroDocumento(empresaId, tipo)
    return NextResponse.json({ numero })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
