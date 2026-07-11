import { NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/cuentas/bancos - listar cuentas de bancos para conciliación
export async function GET() {
  try {
    const empresaId = await requireEmpresa()
    const cuentas = await db.cuenta.findMany({
      where: {
        empresaId,
        imputable: true,
        uso: { in: ['BANCOS_BS', 'BANCOS_USD', 'CAJA', 'CAJA_CHICA'] },
      },
      orderBy: { codigo: 'asc' },
    })
    return NextResponse.json({ cuentas })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}
