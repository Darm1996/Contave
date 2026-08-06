import { NextResponse } from 'next/server'
import { requireEmpresaRole } from '@/lib/auth'
import { desactivarAccionista } from '@/lib/societario'
import { registrarAuditoria } from '@/lib/auditoria'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, empresaId } = await requireEmpresaRole('ADMIN')
    const { id } = await params
    const accionista = await desactivarAccionista(empresaId, id)
    await registrarAuditoria({
      empresaId, userId: user.id, userEmail: user.email,
      accion: 'ACCIONISTA_DESACTIVADO', entidad: 'Accionista', entidadId: id,
      detalle: `Accionista ${accionista.nombre} desactivado`,
    })
    return NextResponse.json({ accionista })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
