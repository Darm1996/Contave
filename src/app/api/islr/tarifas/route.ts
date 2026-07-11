import { NextResponse } from 'next/server'
import { TARIFAS_ISLR, UT_VIGENTE_BS, listarTarifasPorCategoria } from '@/lib/contabilidad/islr'

// GET /api/islr/tarifas - listar todas las tarifas ISLR
export async function GET() {
  return NextResponse.json({
    tarifas: TARIFAS_ISLR,
    utVigente: UT_VIGENTE_BS,
    porCategoria: listarTarifasPorCategoria(),
  })
}
