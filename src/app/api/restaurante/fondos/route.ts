import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'
import { crearFondosIniciales, saldosDeFondos, registrarMovimiento } from '@/lib/restaurante/fondos'
import { redondear, soloFecha } from '@/lib/restaurante/calculos'

export async function GET(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    await crearFondosIniciales(empresaId)
    const { searchParams } = new URL(req.url)
    const tasa = Number(searchParams.get('tasa')) || 0
    const fondos = await saldosDeFondos(empresaId, tasa)
    return NextResponse.json({ fondos })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const body = await req.json()
    if (!body.nombre) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })

    const fondo = await db.restFondo.create({
      data: {
        empresaId,
        nombre: body.nombre,
        tipo: body.tipo || 'EFECTIVO',
        moneda: body.moneda === 'VES' ? 'VES' : 'USD',
        saldoInicial: redondear(Number(body.saldoInicial) || 0),
        color: body.color || 'emerald',
        orden: Number(body.orden) || 99,
        rolCierre: body.rolCierre || null,
      },
    })
    return NextResponse.json({ fondo })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

/** Ajuste manual de saldo: deja rastro como movimiento en vez de sobrescribir. */
export async function PATCH(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const body = await req.json()
    if (!body.id) return NextResponse.json({ error: 'Falta el fondo' }, { status: 400 })

    const fondo = await db.restFondo.findFirst({ where: { id: body.id, empresaId } })
    if (!fondo) return NextResponse.json({ error: 'El fondo no existe' }, { status: 404 })

    if (body.ajuste !== undefined) {
      const monto = redondear(Number(body.ajuste) || 0)
      if (monto === 0) return NextResponse.json({ error: 'El ajuste no puede ser 0' }, { status: 400 })
      const esVES = fondo.moneda === 'VES'
      await registrarMovimiento(db, {
        empresaId,
        fondoId: fondo.id,
        fecha: soloFecha(body.fecha || new Date()),
        tipo: monto > 0 ? 'INGRESO' : 'EGRESO',
        montoUSD: esVES ? undefined : Math.abs(monto),
        montoVES: esVES ? Math.abs(monto) : undefined,
        tasa: Number(body.tasa) || 0,
        concepto: body.concepto || 'Ajuste manual de saldo',
        origen: 'AJUSTE',
      })
    }

    const actualizado = await db.restFondo.update({
      where: { id: fondo.id },
      data: {
        nombre: body.nombre ?? fondo.nombre,
        activo: body.activo ?? fondo.activo,
        color: body.color ?? fondo.color,
        rolCierre: body.rolCierre === undefined ? fondo.rolCierre : body.rolCierre,
      },
    })
    return NextResponse.json({ fondo: actualizado })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
