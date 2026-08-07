import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'
import { redondear, saldoDeuda } from '@/lib/restaurante/calculos'

/** Proveedores con lo que se les debe hoy, ordenados por deuda. */
export async function GET() {
  try {
    const empresaId = await requireEmpresa()
    const proveedores = await db.restProveedor.findMany({
      where: { empresaId, activo: true },
      include: {
        notasPorPagar: {
          where: { estado: { in: ['PENDIENTE', 'ABONADA'] } },
          select: { montoUSD: true, montoPagado: true },
        },
      },
      orderBy: { nombre: 'asc' },
    })

    const conSaldo = proveedores.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      categoria: p.categoria,
      telefono: p.telefono,
      notas: p.notas,
      deuda: redondear(
        p.notasPorPagar.reduce((a, n) => a + saldoDeuda(n.montoUSD, n.montoPagado), 0),
      ),
      notasPendientes: p.notasPorPagar.length,
    }))

    return NextResponse.json({ proveedores: conSaldo })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const body = await req.json()
    if (!body.nombre) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })

    const nombre = String(body.nombre).trim()
    const existente = await db.restProveedor.findUnique({
      where: { empresaId_nombre: { empresaId, nombre } },
    })
    if (existente) {
      // Si estaba desactivado, se reactiva en vez de rechazar el alta.
      if (!existente.activo) {
        const reactivado = await db.restProveedor.update({
          where: { id: existente.id },
          data: { activo: true },
        })
        return NextResponse.json({ proveedor: reactivado })
      }
      return NextResponse.json({ error: `Ya existe el proveedor ${nombre}` }, { status: 400 })
    }

    const proveedor = await db.restProveedor.create({
      data: {
        empresaId,
        nombre,
        categoria: body.categoria || 'INSUMOS',
        telefono: body.telefono || null,
        notas: body.notas || null,
      },
    })
    return NextResponse.json({ proveedor })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const body = await req.json()
    if (!body.id) return NextResponse.json({ error: 'Falta el proveedor' }, { status: 400 })

    const proveedor = await db.restProveedor.findFirst({ where: { id: body.id, empresaId } })
    if (!proveedor) return NextResponse.json({ error: 'El proveedor no existe' }, { status: 404 })

    const actualizado = await db.restProveedor.update({
      where: { id: proveedor.id },
      data: {
        nombre: body.nombre ?? proveedor.nombre,
        categoria: body.categoria ?? proveedor.categoria,
        telefono: body.telefono === undefined ? proveedor.telefono : body.telefono,
        notas: body.notas === undefined ? proveedor.notas : body.notas,
        activo: body.activo ?? proveedor.activo,
      },
    })
    return NextResponse.json({ proveedor: actualizado })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
