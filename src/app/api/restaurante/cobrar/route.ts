import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'
import { estadoDeuda, redondear, saldoDeuda, soloFecha } from '@/lib/restaurante/calculos'
import { registrarMovimiento } from '@/lib/restaurante/fondos'

/** Fiados: lo que se llevaron y todavía no pagan. */
export async function GET(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const { searchParams } = new URL(req.url)
    const incluirCobradas = searchParams.get('estado') === 'TODAS'

    const cuentas = await db.restCuentaCobrar.findMany({
      where: { empresaId, ...(incluirCobradas ? {} : { estado: { in: ['PENDIENTE', 'ABONADA'] } }) },
      orderBy: [{ fecha: 'asc' }],
    })
    const conSaldo = cuentas.map((c) => ({ ...c, saldo: saldoDeuda(c.montoUSD, c.montoCobrado) }))
    const total = redondear(conSaldo.reduce((a, c) => a + c.saldo, 0))
    return NextResponse.json({ cuentas: conSaldo, total })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const body = await req.json()

    if (!body.cliente) return NextResponse.json({ error: 'Indica a quién se le fió' }, { status: 400 })
    const montoUSD = redondear(Number(body.montoUSD) || 0)
    if (montoUSD <= 0) return NextResponse.json({ error: 'El monto debe ser mayor que cero' }, { status: 400 })

    const cuenta = await db.restCuentaCobrar.create({
      data: {
        empresaId,
        fecha: soloFecha(body.fecha || new Date()),
        cliente: String(body.cliente).trim(),
        concepto: body.concepto || null,
        montoUSD,
      },
    })
    return NextResponse.json({ cuenta })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

/** Registra un cobro (total o abono) y lo mete en el fondo donde entró la plata. */
export async function PATCH(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const body = await req.json()
    if (!body.id) return NextResponse.json({ error: 'Falta la cuenta' }, { status: 400 })

    const cuenta = await db.restCuentaCobrar.findFirst({ where: { id: body.id, empresaId } })
    if (!cuenta) return NextResponse.json({ error: 'La cuenta no existe' }, { status: 404 })
    if (cuenta.estado === 'COBRADA') return NextResponse.json({ error: 'Esa cuenta ya está cobrada' }, { status: 400 })

    const monto = redondear(Number(body.monto) || 0)
    if (monto <= 0) return NextResponse.json({ error: 'El monto del cobro debe ser mayor que cero' }, { status: 400 })

    const pendiente = saldoDeuda(cuenta.montoUSD, cuenta.montoCobrado)
    if (monto > pendiente + 0.01) {
      return NextResponse.json(
        { error: `El cobro ($${monto.toFixed(2)}) supera el saldo pendiente ($${pendiente.toFixed(2)})` },
        { status: 400 },
      )
    }

    const fecha = soloFecha(body.fecha || new Date())
    if (body.fondoId) {
      const fondo = await db.restFondo.findFirst({ where: { id: body.fondoId, empresaId } })
      if (!fondo) return NextResponse.json({ error: 'El fondo indicado no existe' }, { status: 404 })
      const esVES = fondo.moneda === 'VES'
      const tasa = redondear(Number(body.tasa) || 0, 4)
      if (esVES && tasa <= 0) {
        return NextResponse.json({ error: 'Para cobrar en un fondo en bolívares hace falta la tasa' }, { status: 400 })
      }
      await registrarMovimiento(db, {
        empresaId,
        fondoId: fondo.id,
        fecha,
        tipo: 'INGRESO',
        montoUSD: monto,
        tasa,
        concepto: `Cobro a ${cuenta.cliente}`,
        origen: 'COBRO',
        origenId: cuenta.id,
      })
    }

    const cobrado = redondear(cuenta.montoCobrado + monto)
    const actualizada = await db.restCuentaCobrar.update({
      where: { id: cuenta.id },
      data: {
        montoCobrado: cobrado,
        estado: estadoDeuda(cuenta.montoUSD, cobrado) === 'PAGADA' ? 'COBRADA' : estadoDeuda(cuenta.montoUSD, cobrado),
      },
    })
    return NextResponse.json({ cuenta: actualizada })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
