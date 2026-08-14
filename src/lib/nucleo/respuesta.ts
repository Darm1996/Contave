// ═══════════════════════════════════════════════════════════════════════
//  Respuestas de la API: errores tipados y serialización de Decimal
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { ErrorAutenticacion, ErrorPermiso } from './permisos'
import { ErrorInventario } from './inventario'

/** Error de regla de negocio: la petición es válida pero la operación no procede. */
export class ErrorNegocio extends Error {
  readonly status: number
  constructor(mensaje: string, status = 422) {
    super(mensaje)
    this.name = 'ErrorNegocio'
    this.status = status
  }
}

/** Error de recurso inexistente o fuera del alcance del tenant. */
export class ErrorNoEncontrado extends Error {
  readonly status = 404
  constructor(mensaje = 'No encontrado') {
    super(mensaje)
    this.name = 'ErrorNoEncontrado'
  }
}

type Json = string | number | boolean | null | Json[] | { [clave: string]: Json }

/**
 * Convierte Decimal y Date a string de forma recursiva antes de enviar JSON.
 *
 * Los Decimal se envían como STRING y no como number a propósito: si se
 * enviaran como number, `JSON.parse` en el cliente los volvería flotantes
 * binarios y se perdería la exactitud que el servidor cuidó en todo el
 * cálculo. El cliente los vuelve a meter en Decimal si necesita operar.
 */
export function serializar(valor: unknown): Json {
  if (valor === null || valor === undefined) return null
  if (valor instanceof Prisma.Decimal) return valor.toString()
  if (valor instanceof Date) return valor.toISOString()
  if (Array.isArray(valor)) return valor.map((v) => serializar(v))

  if (typeof valor === 'object') {
    const salida: { [clave: string]: Json } = {}
    for (const [clave, v] of Object.entries(valor as Record<string, unknown>)) {
      salida[clave] = serializar(v)
    }
    return salida
  }

  if (typeof valor === 'string' || typeof valor === 'number' || typeof valor === 'boolean') return valor
  return String(valor)
}

/** Respuesta exitosa con los Decimal ya serializados. */
export function ok(datos: unknown, status = 200): NextResponse {
  return NextResponse.json(serializar(datos), { status })
}

/**
 * Traduce cualquier excepción a una respuesta HTTP con el código correcto y
 * un mensaje que el operador pueda entender.
 *
 * Existe para no repetir `catch (e: any)` en cada ruta: ese patrón, además
 * de usar `any`, tiende a devolver 400 para todo y esconder si el problema
 * fue de permisos, de datos o del servidor.
 */
export function manejarError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Los datos enviados no son válidos',
        detalles: error.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
      },
      { status: 400 },
    )
  }

  if (error instanceof ErrorAutenticacion) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  if (error instanceof ErrorPermiso) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  if (error instanceof ErrorNoEncontrado) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  if (error instanceof ErrorNegocio) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  if (error instanceof ErrorInventario) {
    return NextResponse.json({ error: error.message }, { status: 422 })
  }

  // Violación de restricción única de Postgres: se traduce a un mensaje que
  // dice QUÉ está repetido, en vez del texto crudo de la base de datos.
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const campos = Array.isArray(error.meta?.target) ? (error.meta.target as string[]).join(', ') : 'un campo único'
      return NextResponse.json({ error: `Ya existe un registro con el mismo ${campos}` }, { status: 409 })
    }
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'El registro no existe' }, { status: 404 })
    }
    if (error.code === 'P2003') {
      return NextResponse.json({ error: 'El registro está referenciado por otros datos' }, { status: 409 })
    }
  }

  // Errores heredados del módulo contable, que se lanzan como Error simple.
  if (error instanceof Error) {
    if (error.message === 'No autenticado') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    if (error.message === 'Sin empresa activa') {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error no clasificado en la API:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  console.error('Error desconocido en la API:', error)
  return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
}
