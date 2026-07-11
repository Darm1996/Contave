import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { reabrirEjercicio } from '@/lib/contabilidad/ejercicios'

export async function POST(req: NextRequest, { params }: { params: Promise<{ ano: string }> }) {
  try {
    const empresaId = await requireEmpresa()
    const { ano: anoStr } = await params
    const ano = parseInt(anoStr)
    if (isNaN(ano)) return NextResponse.json({ error: 'Año inválido' }, { status: 400 })

    const ejercicio = await reabrirEjercicio(empresaId, ano)
    return NextResponse.json({ ok: true, ejercicio })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
