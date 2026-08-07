import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'
import { estadoDeuda, redondear, saldoDeuda, soloFecha } from '@/lib/restaurante/calculos'
import { completarMontos, registrarMovimiento } from '@/lib/restaurante/fondos'

/**
 * Paga (total o parcialmente) una nota de proveedor. Un solo movimiento del
 * usuario deja tres cosas hechas: el abono sobre la nota, el egreso del
 * fondo y el gasto del mes en la categoría PROVEEDOR.
 *
 * El monto se puede indicar en dólares o en bolívares; con la tasa del día
 * de pago se completa el otro, tal como lo anotan hoy en la hoja de pagos.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const empresaId = await requireEmpresa()
    const { id } = await params
    const body = await req.json()

    const nota = await db.restNotaProveedor.findFirst({
      where: { id, empresaId },
      include: { proveedor: { select: { nombre: true } } },
    })
    if (!nota) return NextResponse.json({ error: 'La nota no existe' }, { status: 404 })
    if (nota.estado === 'PAGADA') return NextResponse.json({ error: 'Esa nota ya está pagada' }, { status: 400 })

    if (!body.fondoId) return NextResponse.json({ error: 'Indica de cuál fondo sale el pago' }, { status: 400 })
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
      return NextResponse.json({ error: 'Indica el monto del pago' }, { status: 400 })
    }
    if (entradaUSD === undefined && tasa <= 0) {
      return NextResponse.json({ error: 'Para pagar en bolívares hace falta la tasa del día' }, { status: 400 })
    }

    const montos = completarMontos({ montoUSD: entradaUSD, montoVES: entradaVES, tasa })
    if (montos.montoUSD <= 0) {
      return NextResponse.json({ error: 'El monto debe ser mayor que cero' }, { status: 400 })
    }

    const pendiente = saldoDeuda(nota.montoUSD, nota.montoPagado)
    if (montos.montoUSD > pendiente + 0.01) {
      return NextResponse.json(
        { error: `El pago ($${montos.montoUSD.toFixed(2)}) supera el saldo de la nota ($${pendiente.toFixed(2)})` },
        { status: 400 },
      )
    }

    const fecha = soloFecha(body.fecha || new Date())
    const concepto = `Pago a ${nota.proveedor.nombre}${nota.numeroNota ? ` — nota ${nota.numeroNota}` : ''}`

    const pago = await db.restPagoProveedor.create({
      data: {
        empresaId,
        notaId: nota.id,
        fondoId: fondo.id,
        fecha,
        montoUSD: montos.montoUSD,
        montoVES: montos.montoVES,
        tasa,
        referencia: body.referencia || null,
      },
    })

    const gasto = await db.restGasto.create({
      data: {
        empresaId,
        fecha,
        descripcion: concepto,
        categoria: 'PROVEEDOR',
        fondoId: fondo.id,
        montoUSD: montos.montoUSD,
        montoVES: montos.montoVES,
        tasa,
        referencia: body.referencia || null,
        proveedorId: nota.proveedorId,
        notaId: nota.id,
      },
    })

    await registrarMovimiento(db, {
      empresaId,
      fondoId: fondo.id,
      fecha,
      tipo: 'EGRESO',
      montoUSD: montos.montoUSD,
      montoVES: montos.montoVES,
      tasa,
      concepto,
      origen: 'PAGO_PROVEEDOR',
      origenId: pago.id,
    })

    const pagadoTotal = redondear(nota.montoPagado + montos.montoUSD)
    const actualizada = await db.restNotaProveedor.update({
      where: { id: nota.id },
      data: { montoPagado: pagadoTotal, estado: estadoDeuda(nota.montoUSD, pagadoTotal) },
      include: {
        proveedor: { select: { nombre: true } },
        pagos: { include: { fondo: { select: { nombre: true } } } },
      },
    })

    return NextResponse.json({ nota: actualizada, pago, gastoId: gasto.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
