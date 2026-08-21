import { NextRequest } from 'next/server'
import { exigirPermiso } from '@/lib/nucleo/permisos'
import { ok, manejarError } from '@/lib/nucleo/respuesta'
import { esquemaCliente } from '@/lib/nucleo/esquemas'
import { db } from '@/lib/db'

// GET /api/clientes?q=... — búsqueda paginada para el POS.
export async function GET(req: NextRequest) {
  try {
    const ctx = await exigirPermiso('cliente.ver')
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim()

    const clientes = await db.cliente.findMany({
      where: {
        organizacionId: ctx.organizacionId,
        activo: true,
        deletedAt: null,
        ...(q
          ? {
              OR: [
                { nombre: { contains: q, mode: 'insensitive' } },
                { rif: { contains: q, mode: 'insensitive' } },
                { telefono: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { nombre: 'asc' },
      take: Math.min(Number(searchParams.get('porPagina') ?? 50), 200),
    })

    return ok({ clientes })
  } catch (error) {
    return manejarError(error)
  }
}

// POST /api/clientes
//
// El RIF es opcional a propósito: un quiosco cobra a "cliente de paso" sin
// cédula. Solo se exige identificación para facturar o para dar crédito.
export async function POST(req: NextRequest) {
  try {
    const ctx = await exigirPermiso('cliente.gestionar')
    const datos = esquemaCliente.parse(await req.json())

    const cliente = await db.cliente.create({
      data: {
        organizacionId: ctx.organizacionId,
        rif: datos.rif ?? null,
        nombre: datos.nombre,
        direccion: datos.direccion ?? null,
        telefono: datos.telefono ?? null,
        email: datos.email ?? null,
        limiteCredito: datos.limiteCredito,
        diasCredito: datos.diasCredito,
        createdBy: ctx.usuarioId,
      },
    })

    return ok({ cliente }, 201)
  } catch (error) {
    return manejarError(error)
  }
}
