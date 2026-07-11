import { NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const empresaId = await requireEmpresa()
    const cuentas = await db.cuenta.findMany({
      where: { empresaId },
      orderBy: { codigo: 'asc' },
    })
    return NextResponse.json({ cuentas })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}
