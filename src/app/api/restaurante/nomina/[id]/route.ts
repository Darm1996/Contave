import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'
import { redondear, soloFecha } from '@/lib/restaurante/calculos'
import { pagarSemana, recalcularSemana, revertirPagoSemana } from '@/lib/restaurante/nomina'

/**
 * Edita las líneas de una semana (transporte, delivery, descuentos, ajustes
 * de base o propina) y recalcula netos y totales, o marca la semana como
 * pagada / revierte el pago.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const empresaId = await requireEmpresa()
    const { id } = await params
    const body = await req.json()

    const semana = await db.restNominaSemana.findFirst({ where: { id, empresaId } })
    if (!semana) return NextResponse.json({ error: 'La nómina de esa semana no existe' }, { status: 404 })

    if (body.accion === 'PAGAR') {
      if (!body.fondoId) {
        return NextResponse.json({ error: 'Indica de cuál fondo sale el pago' }, { status: 400 })
      }
      const pagada = await pagarSemana(
        empresaId, id, body.fondoId,
        soloFecha(body.fecha || new Date()),
        redondear(Number(body.tasa) || 0, 4),
      )
      return NextResponse.json({ semana: pagada })
    }

    if (body.accion === 'REVERTIR') {
      const revertida = await revertirPagoSemana(empresaId, id)
      return NextResponse.json({ semana: revertida })
    }

    if (semana.estado === 'PAGADA') {
      return NextResponse.json(
        { error: 'Esa semana ya fue pagada; revierte el pago antes de editarla' },
        { status: 400 },
      )
    }

    const cambios: Array<{ id: string } & Record<string, number>> = body.lineas || []
    for (const cambio of cambios) {
      // Solo se aceptan líneas de esta semana: evita que un id ajeno
      // modifique la nómina de otro periodo.
      const linea = await db.restNominaLinea.findFirst({ where: { id: cambio.id, semanaId: id } })
      if (!linea) continue
      await db.restNominaLinea.update({
        where: { id: linea.id },
        data: {
          base: cambio.base === undefined ? linea.base : redondear(Number(cambio.base) || 0),
          propina: cambio.propina === undefined ? linea.propina : redondear(Number(cambio.propina) || 0),
          transporte: cambio.transporte === undefined ? linea.transporte : redondear(Number(cambio.transporte) || 0),
          delivery: cambio.delivery === undefined ? linea.delivery : redondear(Number(cambio.delivery) || 0),
          descuento: cambio.descuento === undefined ? linea.descuento : redondear(Number(cambio.descuento) || 0),
        },
      })
    }

    await recalcularSemana(id)
    const actualizada = await db.restNominaSemana.findUnique({
      where: { id },
      include: {
        lineas: { include: { personal: { select: { nombre: true, cargo: true } } } },
        fondo: { select: { nombre: true } },
      },
    })
    return NextResponse.json({ semana: actualizada })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const empresaId = await requireEmpresa()
    const { id } = await params

    const semana = await db.restNominaSemana.findFirst({ where: { id, empresaId } })
    if (!semana) return NextResponse.json({ error: 'La nómina de esa semana no existe' }, { status: 404 })
    if (semana.estado === 'PAGADA') {
      return NextResponse.json({ error: 'Revierte el pago antes de borrar la semana' }, { status: 400 })
    }

    await db.restNominaSemana.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
