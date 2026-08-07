import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { construirPanel } from '@/lib/restaurante/panel'
import { crearFondosIniciales } from '@/lib/restaurante/fondos'

export async function GET(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const { searchParams } = new URL(req.url)
    const hoy = new Date()
    const ano = Number(searchParams.get('ano')) || hoy.getUTCFullYear()
    const mes = Number(searchParams.get('mes')) || hoy.getUTCMonth() + 1
    if (mes < 1 || mes > 12) return NextResponse.json({ error: 'Mes inválido' }, { status: 400 })

    // La primera vez que se abre el módulo se crean los fondos base, para
    // que el usuario pueda registrar su primer día sin configurar nada.
    await crearFondosIniciales(empresaId)

    const panel = await construirPanel(empresaId, ano, mes)
    return NextResponse.json({ panel })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}
