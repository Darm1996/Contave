import { NextResponse } from 'next/server'
import { requireEmpresaRole } from '@/lib/auth'
import { generarNotificacionesPendientes } from '@/lib/notificaciones'

// POST /api/notificaciones/generar - escanea vencimientos fiscales próximos y CxC vencidas
export async function POST() {
  try {
    const { empresaId } = await requireEmpresaRole('CONTADOR')
    const resultado = await generarNotificacionesPendientes(empresaId)
    return NextResponse.json(resultado)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
