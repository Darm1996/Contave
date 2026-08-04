import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { registrarEmpleado, listarEmpleados } from '@/lib/contabilidad/nomina'

export async function GET() {
  try {
    const empresaId = await requireEmpresa()
    const empleados = await listarEmpleados(empresaId)
    return NextResponse.json({ empleados })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const body = await req.json()
    const empleado = await registrarEmpleado(empresaId, body)
    return NextResponse.json({ empleado })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
