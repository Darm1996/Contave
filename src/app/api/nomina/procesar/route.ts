import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresaRole } from '@/lib/auth'
import { procesarNomina } from '@/lib/contabilidad/nomina'

// POST /api/nomina/procesar - Body: { mes, ano, overrides?: [{empleadoId, diasTrabajados?, bonoAlimentacion?}] }
export async function POST(req: NextRequest) {
  try {
    const { user, empresaId } = await requireEmpresaRole('CONTADOR')
    const { mes, ano, overrides } = await req.json()
    if (!mes || !ano) return NextResponse.json({ error: 'mes y ano son requeridos' }, { status: 400 })
    const nomina = await procesarNomina(empresaId, Number(mes), Number(ano), user.id, { overrides })
    return NextResponse.json({ nomina })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
