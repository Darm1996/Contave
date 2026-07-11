import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa, requireAuth } from '@/lib/auth'
import { listarEjercicios, crearEjercicio } from '@/lib/contabilidad/ejercicios'

export async function GET() {
  try {
    const empresaId = await requireEmpresa()
    const ejercicios = await listarEjercicios(empresaId)
    // Asegurar que exista el ejercicio del año actual si no hay ninguno
    if (ejercicios.length === 0) {
      const anoActual = new Date().getFullYear()
      await crearEjercicio(empresaId, anoActual)
      const actualizados = await listarEjercicios(empresaId)
      return NextResponse.json({ ejercicios: actualizados })
    }
    return NextResponse.json({ ejercicios })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const { ano } = await req.json()
    if (!ano || ano < 2020 || ano > 2100) {
      return NextResponse.json({ error: 'Año inválido' }, { status: 400 })
    }
    const ejercicio = await crearEjercicio(empresaId, ano)
    return NextResponse.json({ ejercicio })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
