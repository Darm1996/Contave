import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'

const TIPOS_VALIDOS = ['ACTIVO', 'PASIVO', 'PATRIMONIO', 'INGRESO', 'COSTO', 'GASTO']
const NATURALEZAS_VALIDAS = ['DEUDORA', 'ACREEDORA']

export async function GET() {
  try {
    const empresaId = await requireEmpresa()
    const cuentas = await db.cuenta.findMany({
      where: { empresaId },
      orderBy: { codigo: 'asc' },
    })
    return NextResponse.json({ cuentas })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

// POST /api/cuentas - crear una cuenta nueva en el plan de la empresa activa
export async function POST(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const body = await req.json()
    const codigo = String(body.codigo || '').trim()
    const nombre = String(body.nombre || '').trim()
    const tipo = String(body.tipo || '')
    const naturaleza = String(body.naturaleza || '')

    if (!codigo || !nombre) {
      return NextResponse.json({ error: 'Código y nombre son requeridos' }, { status: 400 })
    }
    if (!TIPOS_VALIDOS.includes(tipo)) {
      return NextResponse.json({ error: `Tipo inválido. Debe ser uno de: ${TIPOS_VALIDOS.join(', ')}` }, { status: 400 })
    }
    if (!NATURALEZAS_VALIDAS.includes(naturaleza)) {
      return NextResponse.json({ error: `Naturaleza inválida. Debe ser DEUDORA o ACREEDORA` }, { status: 400 })
    }

    const existente = await db.cuenta.findUnique({ where: { empresaId_codigo: { empresaId, codigo } } })
    if (existente) {
      return NextResponse.json({ error: `Ya existe una cuenta con el código ${codigo}` }, { status: 400 })
    }

    const cuenta = await db.cuenta.create({
      data: {
        empresaId,
        codigo,
        nombre,
        tipo,
        naturaleza,
        nivel: body.nivel ? Number(body.nivel) : 4,
        imputable: body.imputable ?? true,
        uso: null, // Las cuentas creadas manualmente no se mapean a asientos automáticos
      },
    })
    return NextResponse.json({ cuenta })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PATCH /api/cuentas - editar nombre/tipo/naturaleza de una cuenta existente
export async function PATCH(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const body = await req.json()
    const id = String(body.id || '')
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

    const cuenta = await db.cuenta.findUnique({ where: { id } })
    if (!cuenta || cuenta.empresaId !== empresaId) {
      return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (body.nombre != null) {
      const nombre = String(body.nombre).trim()
      if (!nombre) return NextResponse.json({ error: 'El nombre no puede estar vacío' }, { status: 400 })
      data.nombre = nombre
    }
    if (body.tipo != null) {
      if (!TIPOS_VALIDOS.includes(body.tipo)) {
        return NextResponse.json({ error: `Tipo inválido. Debe ser uno de: ${TIPOS_VALIDOS.join(', ')}` }, { status: 400 })
      }
      data.tipo = body.tipo
    }
    if (body.naturaleza != null) {
      if (!NATURALEZAS_VALIDAS.includes(body.naturaleza)) {
        return NextResponse.json({ error: `Naturaleza inválida. Debe ser DEUDORA o ACREEDORA` }, { status: 400 })
      }
      data.naturaleza = body.naturaleza
    }

    const actualizada = await db.cuenta.update({ where: { id }, data })
    return NextResponse.json({ cuenta: actualizada })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
