import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  agruparPorAntiguedad, diasDeAntiguedad, redondear, saldoDeuda, soloFecha,
} from '@/lib/restaurante/calculos'

/**
 * Notas de proveedor por pagar. Por defecto muestra solo lo que sigue
 * debiéndose, que es la pregunta real: "¿a quién le debo?".
 */
export async function GET(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const { searchParams } = new URL(req.url)
    const estado = searchParams.get('estado') || 'ABIERTAS'

    const filtroEstado =
      estado === 'TODAS' ? {} :
      estado === 'PAGADA' ? { estado: 'PAGADA' } :
      { estado: { in: ['PENDIENTE', 'ABONADA'] } }

    const notas = await db.restNotaProveedor.findMany({
      where: { empresaId, ...filtroEstado },
      include: {
        proveedor: { select: { nombre: true, categoria: true } },
        pagos: { orderBy: { fecha: 'asc' }, include: { fondo: { select: { nombre: true } } } },
      },
      orderBy: [{ fecha: 'asc' }],
    })

    const conSaldo = notas.map((n) => ({
      ...n,
      saldo: saldoDeuda(n.montoUSD, n.montoPagado),
      dias: diasDeAntiguedad(n.fecha),
    }))
    const total = redondear(conSaldo.reduce((a, n) => a + n.saldo, 0))
    const antiguedad = agruparPorAntiguedad(conSaldo.map((n) => ({ fecha: n.fecha, saldo: n.saldo })))

    return NextResponse.json({ notas: conSaldo, total, antiguedad })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const body = await req.json()

    if (!body.proveedorId) return NextResponse.json({ error: 'Indica el proveedor' }, { status: 400 })
    const montoUSD = redondear(Number(body.montoUSD) || 0)
    if (montoUSD <= 0) return NextResponse.json({ error: 'El monto debe ser mayor que cero' }, { status: 400 })

    const proveedor = await db.restProveedor.findFirst({ where: { id: body.proveedorId, empresaId } })
    if (!proveedor) return NextResponse.json({ error: 'El proveedor no existe' }, { status: 404 })

    const nota = await db.restNotaProveedor.create({
      data: {
        empresaId,
        proveedorId: proveedor.id,
        fecha: soloFecha(body.fecha || new Date()),
        numeroNota: body.numeroNota || null,
        montoUSD,
        descripcion: body.descripcion || null,
      },
      include: { proveedor: { select: { nombre: true } }, pagos: true },
    })
    return NextResponse.json({ nota })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
