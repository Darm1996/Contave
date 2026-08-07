import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'
import { rangoMes, redondear, soloFecha } from '@/lib/restaurante/calculos'
import { completarMontos, registrarMovimiento } from '@/lib/restaurante/fondos'
import { CATEGORIAS_GASTO_KEYS } from '@/lib/restaurante/categorias'

export async function GET(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const { searchParams } = new URL(req.url)
    const hoy = new Date()
    const ano = Number(searchParams.get('ano')) || hoy.getUTCFullYear()
    const mes = Number(searchParams.get('mes')) || hoy.getUTCMonth() + 1
    const categoria = searchParams.get('categoria') || undefined
    const { desde, hasta } = rangoMes(ano, mes)

    const gastos = await db.restGasto.findMany({
      where: { empresaId, fecha: { gte: desde, lte: hasta }, ...(categoria ? { categoria } : {}) },
      include: { fondo: { select: { nombre: true, moneda: true } }, proveedor: { select: { nombre: true } } },
      orderBy: [{ fecha: 'desc' }, { createdAt: 'desc' }],
    })
    const total = redondear(gastos.reduce((a, g) => a + (g.montoUSD || 0), 0))
    return NextResponse.json({ gastos, total })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

/**
 * Registra un egreso. Se puede escribir el monto en dólares o en bolívares:
 * con la tasa del día el sistema completa el otro, así nadie tiene que sacar
 * la cuenta con la calculadora.
 */
export async function POST(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const body = await req.json()

    if (!body.descripcion) return NextResponse.json({ error: 'La descripción es requerida' }, { status: 400 })
    if (!body.fondoId) return NextResponse.json({ error: 'Indica de cuál fondo salió el dinero' }, { status: 400 })
    const categoria = body.categoria || 'OTROS'
    if (!CATEGORIAS_GASTO_KEYS.includes(categoria)) {
      return NextResponse.json({ error: `Categoría desconocida: ${categoria}` }, { status: 400 })
    }

    const fondo = await db.restFondo.findFirst({ where: { id: body.fondoId, empresaId } })
    if (!fondo) return NextResponse.json({ error: 'El fondo indicado no existe' }, { status: 404 })

    const tasa = redondear(Number(body.tasa) || 0, 4)
    const entradaUSD = body.montoUSD === undefined || body.montoUSD === null || body.montoUSD === ''
      ? undefined
      : redondear(Number(body.montoUSD) || 0)
    const entradaVES = body.montoVES === undefined || body.montoVES === null || body.montoVES === ''
      ? undefined
      : redondear(Number(body.montoVES) || 0)

    if (entradaUSD === undefined && entradaVES === undefined) {
      return NextResponse.json({ error: 'Indica el monto en dólares o en bolívares' }, { status: 400 })
    }
    if (entradaUSD === undefined && tasa <= 0) {
      return NextResponse.json({ error: 'Para cargar un monto en bolívares hace falta la tasa del día' }, { status: 400 })
    }

    const montos = completarMontos({ montoUSD: entradaUSD, montoVES: entradaVES, tasa })
    if (montos.montoUSD <= 0) {
      return NextResponse.json({ error: 'El monto debe ser mayor que cero' }, { status: 400 })
    }

    const fecha = soloFecha(body.fecha || new Date())
    const gasto = await db.restGasto.create({
      data: {
        empresaId,
        fecha,
        descripcion: body.descripcion,
        categoria,
        fondoId: fondo.id,
        montoUSD: montos.montoUSD,
        montoVES: montos.montoVES,
        tasa,
        referencia: body.referencia || null,
        proveedorId: body.proveedorId || null,
      },
      include: { fondo: { select: { nombre: true, moneda: true } }, proveedor: { select: { nombre: true } } },
    })

    await registrarMovimiento(db, {
      empresaId,
      fondoId: fondo.id,
      fecha,
      tipo: 'EGRESO',
      montoUSD: montos.montoUSD,
      montoVES: montos.montoVES,
      tasa,
      concepto: gasto.descripcion,
      origen: 'GASTO',
      origenId: gasto.id,
    })

    return NextResponse.json({ gasto })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
