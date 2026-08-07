import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'
import { rangoMes, redondear } from '@/lib/restaurante/calculos'
import { registrarMovimiento } from '@/lib/restaurante/fondos'

/**
 * Convierte las plantillas de gastos fijos en gastos reales del mes.
 *
 * Es la parte más repetitiva del Excel (alquiler, condominio, luz, internet,
 * gas, sistema) y aquí sale con un clic. Se salta los que ya estén cargados
 * en ese mes, así que repetir la acción no duplica nada.
 */
export async function POST(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const body = await req.json().catch(() => ({}))
    const hoy = new Date()
    const ano = Number(body.ano) || hoy.getUTCFullYear()
    const mes = Number(body.mes) || hoy.getUTCMonth() + 1
    if (mes < 1 || mes > 12) return NextResponse.json({ error: 'Mes inválido' }, { status: 400 })

    if (!body.fondoId) {
      return NextResponse.json({ error: 'Indica de cuál fondo se pagan los gastos fijos' }, { status: 400 })
    }
    const fondo = await db.restFondo.findFirst({ where: { id: body.fondoId, empresaId } })
    if (!fondo) return NextResponse.json({ error: 'El fondo indicado no existe' }, { status: 404 })

    const fijos = await db.restGastoFijo.findMany({ where: { empresaId, activo: true } })
    if (!fijos.length) {
      return NextResponse.json({ error: 'No hay gastos fijos configurados' }, { status: 400 })
    }

    const { desde, hasta } = rangoMes(ano, mes)
    const yaCargados = await db.restGasto.findMany({
      where: { empresaId, categoria: 'GASTO_FIJO', fecha: { gte: desde, lte: hasta } },
      select: { descripcion: true },
    })
    const nombresCargados = new Set(yaCargados.map((g) => g.descripcion))

    const tasa = redondear(Number(body.tasa) || 0, 4)
    const creados: string[] = []
    const omitidos: string[] = []

    for (const fijo of fijos) {
      if (nombresCargados.has(fijo.nombre)) {
        omitidos.push(fijo.nombre)
        continue
      }
      // El día de vencimiento se acota al último día del mes para que un
      // "día 28" no se salga de un febrero corto.
      const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
      const fecha = new Date(Date.UTC(ano, mes - 1, Math.min(fijo.diaVencimiento, ultimoDia)))

      const gasto = await db.restGasto.create({
        data: {
          empresaId,
          fecha,
          descripcion: fijo.nombre,
          categoria: 'GASTO_FIJO',
          fondoId: fondo.id,
          montoUSD: fijo.montoUSD,
          montoVES: tasa > 0 ? redondear(fijo.montoUSD * tasa) : 0,
          tasa,
        },
      })

      await registrarMovimiento(db, {
        empresaId,
        fondoId: fondo.id,
        fecha,
        tipo: 'EGRESO',
        montoUSD: fijo.montoUSD,
        montoVES: tasa > 0 ? redondear(fijo.montoUSD * tasa) : undefined,
        tasa,
        concepto: fijo.nombre,
        origen: 'GASTO',
        origenId: gasto.id,
      })

      creados.push(fijo.nombre)
    }

    return NextResponse.json({ creados, omitidos })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
