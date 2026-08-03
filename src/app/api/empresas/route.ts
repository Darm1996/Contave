import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, setSessionCookie, requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'

// Límite máximo de empresas por usuario (plan estándar)
const MAX_EMPRESAS_POR_USUARIO = 5

export async function GET() {
  try {
    const user = await requireAuth()
    const userEmps = await db.userEmpresa.findMany({
      where: { userId: user.id },
      include: { empresa: true },
    })
    return NextResponse.json({
      empresas: userEmps.map((ue) => ({ ...ue.empresa, rol: ue.rol })),
      empresaActivaId: user.empresaId,
      maxEmpresas: MAX_EMPRESAS_POR_USUARIO,
      puedeCrearMas: userEmps.length < MAX_EMPRESAS_POR_USUARIO,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Solo los administradores pueden crear empresas' }, { status: 403 })
    }

    // Verificar límite de empresas por usuario (super admin sin límite)
    if (user.role !== 'SUPER_ADMIN') {
      const count = await db.userEmpresa.count({ where: { userId: user.id } })
      if (count >= MAX_EMPRESAS_POR_USUARIO) {
        return NextResponse.json({
          error: `Has alcanzado el límite de ${MAX_EMPRESAS_POR_USUARIO} empresas por usuario. Para gestionar más empresas, contacta al administrador.`,
        }, { status: 400 })
      }
    }

    const body = await req.json()
    if (!body.nombre || !body.rif) {
      return NextResponse.json({ error: 'Nombre y RIF son requeridos' }, { status: 400 })
    }

    // Verificar que el RIF no exista ya
    const rifUpper = body.rif.toUpperCase().trim()
    const existente = await db.empresa.findUnique({ where: { rif: rifUpper } })
    if (existente) {
      // Si ya existe, asociar al usuario si no lo está
      const yaAsociada = await db.userEmpresa.findUnique({
        where: { userId_empresaId: { userId: user.id, empresaId: existente.id } },
      })
      if (yaAsociada) {
        return NextResponse.json({ error: 'Ya tienes esta empresa asociada' }, { status: 400 })
      }
      const count2 = await db.userEmpresa.count({ where: { userId: user.id } })
      if (count2 >= MAX_EMPRESAS_POR_USUARIO && user.role !== 'SUPER_ADMIN') {
        return NextResponse.json({
          error: `Límite de ${MAX_EMPRESAS_POR_USUARIO} empresas alcanzado`,
        }, { status: 400 })
      }
      await db.userEmpresa.create({
        data: { userId: user.id, empresaId: existente.id, rol: 'ADMIN' },
      })
      return NextResponse.json({ empresa: existente, asociada: true })
    }

    const empresa = await db.empresa.create({
      data: {
        nombre: body.nombre,
        rif: rifUpper,
        direccion: body.direccion,
        telefono: body.telefono,
        email: body.email,
        esAgenteRetencionIVA: body.esAgenteRetencionIVA ?? false,
        esContribuyenteEspecial: body.esContribuyenteEspecial ?? false,
        alicuotaIVA: body.alicuotaIVA ?? 16.0,
        monedaFuncional: body.monedaFuncional || 'VES',
      },
    })
    // Asociar al usuario que la creó como admin de la empresa
    await db.userEmpresa.create({
      data: { userId: user.id, empresaId: empresa.id, rol: 'ADMIN' },
    })
    // Clonar plan de cuentas VEN-NIF desde empresa plantilla (la primera empresa existente)
    const plantilla = await db.empresa.findFirst({
      where: { NOT: { id: empresa.id } },
      include: { cuentas: true },
    })
    if (plantilla) {
      await db.cuenta.createMany({
        data: plantilla.cuentas.map((c) => ({
          empresaId: empresa.id,
          codigo: c.codigo,
          nombre: c.nombre,
          tipo: c.tipo,
          naturaleza: c.naturaleza,
          nivel: c.nivel,
          imputable: c.imputable,
          uso: c.uso,
        })),
      })
    }
    return NextResponse.json({ empresa })
  } catch (e: any) {
    console.error('Create empresa error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE: desasociar empresa del usuario (no borra la empresa)
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const empresaId = searchParams.get('empresaId')
    if (!empresaId) {
      return NextResponse.json({ error: 'empresaId requerido' }, { status: 400 })
    }
    // No permitir desasociar si es la última empresa del usuario
    const count = await db.userEmpresa.count({ where: { userId: user.id } })
    if (count <= 1) {
      return NextResponse.json({ error: 'No puedes desasociar tu última empresa. Debes tener al menos una activa.' }, { status: 400 })
    }
    await db.userEmpresa.deleteMany({
      where: { userId: user.id, empresaId },
    })
    // Si la empresa desasociada era la activa, cambiar a otra
    if (user.empresaId === empresaId) {
      const otra = await db.userEmpresa.findFirst({
        where: { userId: user.id },
      })
      if (otra) {
        await setSessionCookie({
          userId: user.id,
          email: user.email,
          role: user.role,
          empresaId: otra.empresaId,
        })
      }
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
