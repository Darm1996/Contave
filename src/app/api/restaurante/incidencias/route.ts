import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'
import { rangoMes, redondear, soloFecha } from '@/lib/restaurante/calculos'
import { TIPOS_INCIDENCIA } from '@/lib/restaurante/categorias'

const TIPOS_VALIDOS = TIPOS_INCIDENCIA.map((t) => t.key) as readonly string[]

/**
 * Cortesías, producto dañado, comida del personal y préstamos a otra sede:
 * todo lo que sale sin generar venta. Verlo junto y valorizado es lo que
 * permite saber cuánto se está "yendo" del margen cada mes.
 */
export async function GET(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const { searchParams } = new URL(req.url)
    const hoy = new Date()
    const ano = Number(searchParams.get('ano')) || hoy.getUTCFullYear()
    const mes = Number(searchParams.get('mes')) || hoy.getUTCMonth() + 1
    const { desde, hasta } = rangoMes(ano, mes)

    const incidencias = await db.restIncidencia.findMany({
      where: { empresaId, fecha: { gte: desde, lte: hasta } },
      orderBy: [{ fecha: 'desc' }, { createdAt: 'desc' }],
    })

    const porTipo = TIPOS_INCIDENCIA.map((t) => ({
      tipo: t.key,
      label: t.label,
      color: t.color,
      monto: redondear(
        incidencias.filter((i) => i.tipo === t.key).reduce((a, i) => a + (i.montoUSD || 0), 0),
      ),
      cantidad: incidencias.filter((i) => i.tipo === t.key).length,
    }))
    const total = redondear(porTipo.reduce((a, t) => a + t.monto, 0))

    return NextResponse.json({ incidencias, porTipo, total })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const body = await req.json()

    if (!body.descripcion) return NextResponse.json({ error: 'La descripción es requerida' }, { status: 400 })
    const tipo = body.tipo || 'CORTESIA'
    if (!TIPOS_VALIDOS.includes(tipo)) {
      return NextResponse.json({ error: `Tipo desconocido: ${tipo}` }, { status: 400 })
    }

    const incidencia = await db.restIncidencia.create({
      data: {
        empresaId,
        fecha: soloFecha(body.fecha || new Date()),
        tipo,
        descripcion: String(body.descripcion).trim(),
        cantidad: Number(body.cantidad) || 1,
        montoUSD: redondear(Number(body.montoUSD) || 0),
        referencia: body.referencia || null,
      },
    })
    return NextResponse.json({ incidencia })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Falta el registro' }, { status: 400 })

    const incidencia = await db.restIncidencia.findFirst({ where: { id, empresaId } })
    if (!incidencia) return NextResponse.json({ error: 'El registro no existe' }, { status: 404 })

    await db.restIncidencia.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
