import { NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'
import { calcularProximosVencimientos } from '@/lib/contabilidad/vencimientos-fiscales'

export async function GET() {
  try {
    const empresaId = await requireEmpresa()
    const empresa = await db.empresa.findUnique({ where: { id: empresaId } })
    if (!empresa) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })

    const ejercicioAbierto = await db.ejercicio.findFirst({
      where: { empresaId, estado: 'ABIERTO' },
      orderBy: { ano: 'desc' },
    })

    const vencimientos = calcularProximosVencimientos(
      { diaVencimientoIVA: empresa.diaVencimientoIVA },
      ejercicioAbierto || undefined,
    )
    return NextResponse.json({ vencimientos })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}
