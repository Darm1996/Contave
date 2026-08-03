import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'
import { crearOActualizarConciliacion, listarConciliaciones, cargarMovimientosBanco } from '@/lib/contabilidad/conciliacion-banco'

// GET /api/conciliacion - listar conciliaciones
export async function GET() {
  try {
    const empresaId = await requireEmpresa()
    const conciliaciones = await listarConciliaciones(empresaId)
    return NextResponse.json({ conciliaciones })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

// POST /api/conciliacion - crear/actualizar conciliación
// Body: { cuentaId, mes, ano, saldoInicialBanco?, saldoFinalBanco?, movimientos?: [] }
export async function POST(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const body = await req.json()
    const { cuentaId, mes, ano, saldoInicialBanco, saldoFinalBanco, movimientos } = body

    if (!cuentaId || !mes || !ano) {
      return NextResponse.json({ error: 'cuentaId, mes y ano son requeridos' }, { status: 400 })
    }

    // Crear/actualizar conciliación
    const conciliacion = await crearOActualizarConciliacion(
      empresaId,
      cuentaId,
      mes,
      ano,
      saldoInicialBanco || 0,
      saldoFinalBanco || 0,
    )

    // Si vienen movimientos, cargarlos
    let resultadoMovimientos: Awaited<ReturnType<typeof cargarMovimientosBanco>> | null = null
    if (Array.isArray(movimientos) && movimientos.length > 0) {
      resultadoMovimientos = await cargarMovimientosBanco(conciliacion.id, movimientos)
    }

    return NextResponse.json({
      conciliacion,
      movimientos: resultadoMovimientos,
    })
  } catch (e: any) {
    console.error('Crear conciliación error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
