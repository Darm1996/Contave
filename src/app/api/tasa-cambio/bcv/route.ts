import { NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'
import { obtenerTasaBCV } from '@/lib/contabilidad/bcv-scraper'

// GET /api/tasa-cambio/bcv - obtener tasa actual del BCV
export async function GET() {
  try {
    const tasa = await obtenerTasaBCV()
    return NextResponse.json({ ok: true, tasa })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

// POST /api/tasa-cambio/bcv - guardar tasa actual del BCV en la base de datos
export async function POST() {
  try {
    const empresaId = await requireEmpresa()
    const tasa = await obtenerTasaBCV()

    // Upsert: una tasa por (empresa, fecha, moneda)
    const fechaSinHora = new Date(tasa.fecha)
    fechaSinHora.setHours(0, 0, 0, 0)

    const tasaRecord = await db.tasaCambio.upsert({
      where: { empresaId_fecha_monedaRef: { empresaId, fecha: fechaSinHora, monedaRef: 'USD' } },
      update: { tasa: tasa.tasa, fuente: tasa.fuente },
      create: {
        empresaId,
        fecha: fechaSinHora,
        monedaRef: 'USD',
        tasa: tasa.tasa,
        fuente: tasa.fuente,
      },
    })
    return NextResponse.json({ ok: true, tasa: tasaRecord })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
