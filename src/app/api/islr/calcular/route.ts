import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { calcularRetencionISLR, buscarTarifaISLR, UT_VIGENTE_BS } from '@/lib/contabilidad/islr'

// POST /api/islr/calcular
// Body: { montoPago: number, tarifaCodigo: string, utActual?: number }
// Retorna: { baseImponible, montoRetenido, aplicaRetencion, motivo, tarifa }
export async function POST(req: NextRequest) {
  try {
    await requireAuth()
    const body = await req.json()
    const { montoPago, tarifaCodigo, utActual } = body
    if (typeof montoPago !== 'number' || montoPago < 0) {
      return NextResponse.json({ error: 'montoPago debe ser un número positivo' }, { status: 400 })
    }
    const tarifa = buscarTarifaISLR(tarifaCodigo)
    if (!tarifa) {
      return NextResponse.json({ error: `Tarifa ISLR no encontrada: ${tarifaCodigo}` }, { status: 404 })
    }
    const resultado = calcularRetencionISLR(montoPago, tarifa, utActual || UT_VIGENTE_BS)
    return NextResponse.json({
      ...resultado,
      tarifa,
      utUsada: utActual || UT_VIGENTE_BS,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
