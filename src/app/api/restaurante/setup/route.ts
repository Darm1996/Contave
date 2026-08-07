import { NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { configuracionInicial } from '@/lib/restaurante/setup'

export async function POST() {
  try {
    const empresaId = await requireEmpresa()
    const resultado = await configuracionInicial(empresaId)
    return NextResponse.json({ resultado })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
