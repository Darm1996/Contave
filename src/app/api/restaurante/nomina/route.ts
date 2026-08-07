import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'
import { semanaDe, soloFecha } from '@/lib/restaurante/calculos'
import { prepararSemana } from '@/lib/restaurante/nomina'

/** Últimas semanas de nómina, de la más reciente hacia atrás. */
export async function GET(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const { searchParams } = new URL(req.url)
    const limite = Math.min(24, Number(searchParams.get('limite')) || 8)

    const semanas = await db.restNominaSemana.findMany({
      where: { empresaId },
      include: {
        lineas: { include: { personal: { select: { nombre: true, cargo: true } } } },
        fondo: { select: { nombre: true } },
      },
      orderBy: { fechaInicio: 'desc' },
      take: limite,
    })
    return NextResponse.json({ semanas })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

/**
 * Abre la nómina de una semana. Llega precargada: cada persona activa con su
 * base y su parte de las propinas de los cierres de esos siete días.
 */
export async function POST(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const body = await req.json().catch(() => ({}))
    const referencia = soloFecha(body.fecha || new Date())

    const personalActivo = await db.restPersonal.count({ where: { empresaId, activo: true } })
    if (personalActivo === 0) {
      return NextResponse.json(
        { error: 'Primero registra a tu equipo en la pestaña Equipo' },
        { status: 400 },
      )
    }

    const semana = await prepararSemana(empresaId, referencia)
    const completa = await db.restNominaSemana.findUnique({
      where: { id: semana.id },
      include: {
        lineas: { include: { personal: { select: { nombre: true, cargo: true } } } },
        fondo: { select: { nombre: true } },
      },
    })
    return NextResponse.json({ semana: completa, rango: semanaDe(referencia) })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
