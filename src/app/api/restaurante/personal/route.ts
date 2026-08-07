import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'
import { redondear } from '@/lib/restaurante/calculos'

export async function GET() {
  try {
    const empresaId = await requireEmpresa()
    const personal = await db.restPersonal.findMany({
      where: { empresaId },
      orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
    })
    const nominaSemanal = redondear(
      personal.filter((p) => p.activo).reduce((a, p) => a + (p.pagoBaseSemanal || 0), 0),
    )
    return NextResponse.json({ personal, nominaSemanal })
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
    const existente = await db.restPersonal.findUnique({
      where: { empresaId_nombre: { empresaId, nombre } },
    })
    if (existente) {
      if (!existente.activo) {
        const reactivado = await db.restPersonal.update({
          where: { id: existente.id },
          data: { activo: true },
        })
        return NextResponse.json({ persona: reactivado })
      }
      return NextResponse.json({ error: `${nombre} ya está en el equipo` }, { status: 400 })
    }

    const persona = await db.restPersonal.create({
      data: {
        empresaId,
        nombre,
        cargo: body.cargo || null,
        pagoBaseSemanal: redondear(Number(body.pagoBaseSemanal) || 0),
        recibePropina: body.recibePropina ?? true,
      },
    })
    return NextResponse.json({ persona })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const body = await req.json()
    if (!body.id) return NextResponse.json({ error: 'Falta la persona' }, { status: 400 })

    const persona = await db.restPersonal.findFirst({ where: { id: body.id, empresaId } })
    if (!persona) return NextResponse.json({ error: 'Esa persona no está registrada' }, { status: 404 })

    const actualizada = await db.restPersonal.update({
      where: { id: persona.id },
      data: {
        nombre: body.nombre ?? persona.nombre,
        cargo: body.cargo === undefined ? persona.cargo : body.cargo,
        pagoBaseSemanal: body.pagoBaseSemanal === undefined
          ? persona.pagoBaseSemanal
          : redondear(Number(body.pagoBaseSemanal) || 0),
        recibePropina: body.recibePropina ?? persona.recibePropina,
        activo: body.activo ?? persona.activo,
      },
    })
    return NextResponse.json({ persona: actualizada })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
