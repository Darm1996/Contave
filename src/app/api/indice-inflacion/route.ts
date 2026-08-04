import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { registrarIndiceInflacion, listarIndicesInflacion } from '@/lib/contabilidad/ajuste-inflacion'

export async function GET() {
  try {
    const empresaId = await requireEmpresa()
    const indices = await listarIndicesInflacion(empresaId)
    return NextResponse.json({ indices })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

// POST /api/indice-inflacion - Body: { mes, ano, indice, fuente? }
export async function POST(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const { mes, ano, indice, fuente } = await req.json()
    if (!mes || !ano || !indice) return NextResponse.json({ error: 'mes, ano e indice son requeridos' }, { status: 400 })
    const registro = await registrarIndiceInflacion(empresaId, Number(mes), Number(ano), Number(indice), fuente)
    return NextResponse.json({ indice: registro })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
