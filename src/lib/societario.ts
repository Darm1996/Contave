// Libro de Accionistas y Libro de Actas de Asamblea (registro societario
// exigido por el Código de Comercio venezolano para compañías anónimas).

import { db } from '@/lib/db'
import { aNumero } from '@/lib/nucleo/dinero'

const round2 = (n: number) => Math.round(n * 100) / 100

export interface AccionistaInput {
  nombre: string
  identificacion: string
  numeroAcciones: number
}

export async function registrarAccionista(empresaId: string, input: AccionistaInput) {
  if (!input.nombre || !input.identificacion) throw new Error('nombre e identificación son requeridos')
  if (!input.numeroAcciones || input.numeroAcciones <= 0) throw new Error('numeroAcciones debe ser mayor a 0')
  return db.accionista.create({
    data: {
      empresaId,
      nombre: input.nombre,
      identificacion: input.identificacion,
      numeroAcciones: input.numeroAcciones,
    },
  })
}

export async function listarAccionistas(empresaId: string) {
  const accionistas = await db.accionista.findMany({ where: { empresaId }, orderBy: { nombre: 'asc' } })
  const totalAcciones = accionistas.filter((a) => a.activo).reduce((s, a) => s + aNumero(a.numeroAcciones), 0)
  return accionistas.map((a) => ({
    ...a,
    porcentajeParticipacion: totalAcciones > 0 ? round2((aNumero(a.numeroAcciones) / totalAcciones) * 100) : 0,
  }))
}

export async function totalAccionesVigentes(empresaId: string): Promise<number> {
  const accionistas = await db.accionista.findMany({ where: { empresaId, activo: true } })
  return accionistas.reduce((s, a) => s + aNumero(a.numeroAcciones), 0)
}

export async function desactivarAccionista(empresaId: string, id: string) {
  const accionista = await db.accionista.findUnique({ where: { id } })
  if (!accionista || accionista.empresaId !== empresaId) throw new Error('Accionista no encontrado')
  return db.accionista.update({ where: { id }, data: { activo: false } })
}

export interface ActaInput {
  fecha: string | Date
  tipo: 'ORDINARIA' | 'EXTRAORDINARIA'
  lugar?: string
  agenda: string
  acuerdos: string
  asistentes: string
  accionesRepresentadas: number
}

export async function registrarActa(empresaId: string, input: ActaInput) {
  if (!input.agenda || !input.acuerdos || !input.asistentes) {
    throw new Error('agenda, acuerdos y asistentes son requeridos')
  }
  const ultima = await db.actaAsamblea.findFirst({ where: { empresaId }, orderBy: { numero: 'desc' } })
  const numero = (ultima?.numero || 0) + 1
  return db.actaAsamblea.create({
    data: {
      empresaId,
      numero,
      fecha: new Date(input.fecha),
      tipo: input.tipo,
      lugar: input.lugar || null,
      agenda: input.agenda,
      acuerdos: input.acuerdos,
      asistentes: input.asistentes,
      accionesRepresentadas: input.accionesRepresentadas || 0,
    },
  })
}

export async function listarActas(empresaId: string) {
  const [actas, totalAcciones] = await Promise.all([
    db.actaAsamblea.findMany({ where: { empresaId }, orderBy: { numero: 'desc' } }),
    totalAccionesVigentes(empresaId),
  ])
  return actas.map((a) => ({
    ...a,
    quorumPorcentaje: totalAcciones > 0 ? round2((aNumero(a.accionesRepresentadas) / totalAcciones) * 100) : 0,
  }))
}
