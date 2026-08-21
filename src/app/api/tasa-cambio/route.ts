import { NextRequest } from 'next/server'
import { exigirPermiso } from '@/lib/nucleo/permisos'
import { ok, manejarError } from '@/lib/nucleo/respuesta'
import { esquemaTasaCambio } from '@/lib/nucleo/esquemas'
import { db } from '@/lib/db'

// GET /api/tasa-cambio — historial de tasas, más reciente primero.
//
// Este historial sirve solo para PROPONER la tasa del día. Nunca se usa para
// recalcular un documento: cada venta, compra y pago guarda la tasa que se le
// aplicó, y por eso un reporte del mes pasado da lo mismo hoy que mañana.
export async function GET(req: NextRequest) {
  try {
    const ctx = await exigirPermiso('organizacion.ver')
    const { searchParams } = new URL(req.url)

    const tasas = await db.tasaCambio.findMany({
      where: {
        organizacionId: ctx.organizacionId,
        monedaRef: searchParams.get('moneda') ?? 'USD',
      },
      orderBy: { fecha: 'desc' },
      take: Math.min(Number(searchParams.get('limite') ?? 30), 365),
    })

    return ok({ tasas })
  } catch (error) {
    return manejarError(error)
  }
}

// POST /api/tasa-cambio — registra o corrige la tasa de una fecha.
export async function POST(req: NextRequest) {
  try {
    const ctx = await exigirPermiso('organizacion.editar')
    const datos = esquemaTasaCambio.parse(await req.json())

    // Una sola tasa por (organización, fecha, moneda): si se corrige la del
    // día, se sobrescribe. Los documentos ya emitidos conservan la suya.
    const fecha = new Date(datos.fecha.toISOString().slice(0, 10))
    const tasa = await db.tasaCambio.upsert({
      where: {
        organizacionId_fecha_monedaRef: {
          organizacionId: ctx.organizacionId,
          fecha,
          monedaRef: datos.monedaRef,
        },
      },
      update: { tasa: datos.tasa, fuente: datos.fuente },
      create: {
        organizacionId: ctx.organizacionId,
        fecha,
        monedaRef: datos.monedaRef,
        tasa: datos.tasa,
        fuente: datos.fuente,
      },
    })

    return ok({ tasa }, 201)
  } catch (error) {
    return manejarError(error)
  }
}
