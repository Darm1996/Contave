import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'
import { validarRIF } from '@/lib/contabilidad/ven-nif'

export async function GET() {
  try {
    const empresaId = await requireEmpresa()
    const clientes = await db.cliente.findMany({ where: { empresaId }, orderBy: { nombre: 'asc' } })
    return NextResponse.json({ clientes })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const body = await req.json()
    const rifCheck = validarRIF(body.rif || '')
    if (!rifCheck.valido) return NextResponse.json({ error: `RIF inválido: ${body.rif}` }, { status: 400 })
    if (!body.nombre) return NextResponse.json({ error: 'nombre es requerido' }, { status: 400 })

    const existente = await db.cliente.findUnique({ where: { empresaId_rif: { empresaId, rif: rifCheck.normalizado } } })
    if (existente) return NextResponse.json({ error: `Ya existe un cliente con RIF ${rifCheck.normalizado}` }, { status: 400 })

    const cliente = await db.cliente.create({
      data: {
        empresaId,
        rif: rifCheck.normalizado,
        nombre: body.nombre,
        direccion: body.direccion || null,
        telefono: body.telefono || null,
        email: body.email || null,
      },
    })
    return NextResponse.json({ cliente })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
