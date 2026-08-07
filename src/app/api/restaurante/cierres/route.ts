import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'
import { calcularTotalDia, rangoMes, redondear, soloFecha } from '@/lib/restaurante/calculos'
import { sincronizarMovimientosCierre } from '@/lib/restaurante/fondos'

/** Cierres de un mes (por defecto el mes en curso), del más reciente al más antiguo. */
export async function GET(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const { searchParams } = new URL(req.url)
    const hoy = new Date()
    const ano = Number(searchParams.get('ano')) || hoy.getUTCFullYear()
    const mes = Number(searchParams.get('mes')) || hoy.getUTCMonth() + 1
    const { desde, hasta } = rangoMes(ano, mes)

    const cierres = await db.restCierreDiario.findMany({
      where: { empresaId, fecha: { gte: desde, lte: hasta } },
      orderBy: { fecha: 'desc' },
    })

    // La tasa del último cierre se ofrece como valor por defecto del
    // siguiente, que es lo que pasa casi siempre en la práctica.
    const ultimaTasa = cierres.find((c) => c.tasa > 0)?.tasa || 0
    return NextResponse.json({ cierres, ultimaTasa })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

/**
 * Registra o corrige el cierre de un día. Es un upsert por fecha: volver a
 * enviar el mismo día reemplaza sus cifras en vez de duplicarlas, y los
 * movimientos de fondos se regeneran para que los saldos cuadren.
 */
export async function POST(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const body = await req.json()
    if (!body.fecha) return NextResponse.json({ error: 'La fecha es requerida' }, { status: 400 })

    const fecha = soloFecha(body.fecha)
    const tasa = redondear(Number(body.tasa) || 0, 4)
    const ventas = {
      ventaZelle: redondear(Number(body.ventaZelle) || 0),
      ventaEfectivoUSD: redondear(Number(body.ventaEfectivoUSD) || 0),
      ventaBs: redondear(Number(body.ventaBs) || 0),
      ventaPuntoVenta: redondear(Number(body.ventaPuntoVenta) || 0),
    }
    const hayVentasEnBs = ventas.ventaBs > 0 || ventas.ventaPuntoVenta > 0
    if (hayVentasEnBs && tasa <= 0) {
      return NextResponse.json(
        { error: 'Indica la tasa del día para poder convertir las ventas en bolívares' },
        { status: 400 },
      )
    }

    const { totalUSD } = calcularTotalDia({ ...ventas, tasa })
    const datos = {
      ...ventas,
      tasa,
      totalUSD,
      numVentas: Math.max(0, Number(body.numVentas) || 0),
      numDelivery: Math.max(0, Number(body.numDelivery) || 0),
      numVentaDirecta: Math.max(0, Number(body.numVentaDirecta) || 0),
      propinas: redondear(Number(body.propinas) || 0),
      nota: body.nota || null,
      estado: body.estado === 'CERRADO' ? 'CERRADO' : 'ABIERTO',
    }

    const cierre = await db.restCierreDiario.upsert({
      where: { empresaId_fecha: { empresaId, fecha } },
      update: datos,
      create: { empresaId, fecha, ...datos },
    })

    await sincronizarMovimientosCierre(db, cierre)
    return NextResponse.json({ cierre })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
