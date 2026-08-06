import { NextResponse } from 'next/server'
import { requireEmpresaRole } from '@/lib/auth'
import { desactivarEmpleado } from '@/lib/contabilidad/nomina'
import { registrarAuditoria } from '@/lib/auditoria'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, empresaId } = await requireEmpresaRole('CONTADOR')
    const { id } = await params
    const empleado = await desactivarEmpleado(empresaId, id)
    await registrarAuditoria({
      empresaId, userId: user.id, userEmail: user.email,
      accion: 'EMPLEADO_DESACTIVADO', entidad: 'Empleado', entidadId: id,
      detalle: `Empleado ${empleado.nombre} desactivado`,
    })
    return NextResponse.json({ empleado })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
