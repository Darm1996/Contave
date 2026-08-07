import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'
import { redondear } from '@/lib/restaurante/calculos'

export async function GET() {
  try {
    const empresaId = await requireEmpresa()
    const fijos = await db.restGastoFijo.findMany({
      where: { empresaId },
      orderBy: [{ activo: 'desc' }, { diaVencimiento: 'asc' }],
    })
    const totalMensual = redondear(
      fijos.filter((f) => f.activo).reduce((a, f) => a + (f.montoUSD || 0), 0),
    )
    return NextResponse.json({ fijos, totalMensual })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const body = await req.json()
    if (!body.nombre) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })

    const montoUSD = redondear(Number(body.montoUSD) || 0)
    if (montoUSD <= 0) return NextResponse.json({ error: 'El monto debe ser mayor que cero' }, { status: 400 })

    const dia = Number(body.diaVencimiento) || 5
    const fijo = await db.restGastoFijo.create({
      data: {
        empresaId,
        nombre: String(body.nombre).trim(),
        categoria: body.categoria || 'GASTO_FIJO',
        montoUSD,
        diaVencimiento: Math.min(28, Math.max(1, dia)),
      },
    })
    return NextResponse.json({ fijo })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const body = await req.json()
    if (!body.id) return NextResponse.json({ error: 'Falta el gasto fijo' }, { status: 400 })

    const fijo = await db.restGastoFijo.findFirst({ where: { id: body.id, empresaId } })
    if (!fijo) return NextResponse.json({ error: 'El gasto fijo no existe' }, { status: 404 })

    const actualizado = await db.restGastoFijo.update({
      where: { id: fijo.id },
      data: {
        nombre: body.nombre ?? fijo.nombre,
        montoUSD: body.montoUSD === undefined ? fijo.montoUSD : redondear(Number(body.montoUSD) || 0),
        diaVencimiento: body.diaVencimiento === undefined
          ? fijo.diaVencimiento
          : Math.min(28, Math.max(1, Number(body.diaVencimiento) || 5)),
        activo: body.activo ?? fijo.activo,
      },
    })
    return NextResponse.json({ fijo: actualizado })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Falta el gasto fijo' }, { status: 400 })

    const fijo = await db.restGastoFijo.findFirst({ where: { id, empresaId } })
    if (!fijo) return NextResponse.json({ error: 'El gasto fijo no existe' }, { status: 404 })

    await db.restGastoFijo.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
