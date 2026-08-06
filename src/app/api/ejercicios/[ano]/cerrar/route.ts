import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresaRole } from '@/lib/auth'
import { cerrarEjercicio } from '@/lib/contabilidad/ejercicios'
import { registrarAuditoria } from '@/lib/auditoria'

// POST /api/ejercicios/[ano]/cerrar
export async function POST(req: NextRequest, { params }: { params: Promise<{ ano: string }> }) {
  try {
    const { user, empresaId } = await requireEmpresaRole('CONTADOR')
    const { ano: anoStr } = await params
    const ano = parseInt(anoStr)
    if (isNaN(ano)) return NextResponse.json({ error: 'Año inválido' }, { status: 400 })

    const resultado = await cerrarEjercicio(empresaId, ano, user.id)
    await registrarAuditoria({
      empresaId, userId: user.id, userEmail: user.email,
      accion: 'EJERCICIO_CERRADO', entidad: 'Ejercicio', entidadId: resultado.ejercicio.id,
      detalle: `Ejercicio ${ano} cerrado. Utilidad neta: ${resultado.utilidadNeta}, ISLR estimado: ${resultado.islrEstimado}`,
    })
    return NextResponse.json({
      ok: true,
      ejercicio: resultado.ejercicio,
      asientoCierre: {
        id: resultado.asientoCierre.id,
        numero: resultado.asientoCierre.numero,
        lineas: resultado.asientoCierre.lineas.length,
      },
      asientoApertura: resultado.asientoApertura ? {
        id: resultado.asientoApertura.id,
        numero: resultado.asientoApertura.numero,
        lineas: resultado.asientoApertura.lineas.length,
      } : null,
      utilidadNeta: resultado.utilidadNeta,
      islrEstimado: resultado.islrEstimado,
    })
  } catch (e: any) {
    console.error('Cerrar ejercicio error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
