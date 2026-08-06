import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresaRole } from '@/lib/auth'
import { reabrirEjercicio } from '@/lib/contabilidad/ejercicios'
import { registrarAuditoria } from '@/lib/auditoria'

export async function POST(req: NextRequest, { params }: { params: Promise<{ ano: string }> }) {
  try {
    const { user, empresaId } = await requireEmpresaRole('ADMIN')
    const { ano: anoStr } = await params
    const ano = parseInt(anoStr)
    if (isNaN(ano)) return NextResponse.json({ error: 'Año inválido' }, { status: 400 })

    const ejercicio = await reabrirEjercicio(empresaId, ano)
    await registrarAuditoria({
      empresaId, userId: user.id, userEmail: user.email,
      accion: 'EJERCICIO_REABIERTO', entidad: 'Ejercicio', entidadId: ejercicio.id,
      detalle: `Ejercicio ${ano} reabierto`,
    })
    return NextResponse.json({ ok: true, ejercicio })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
