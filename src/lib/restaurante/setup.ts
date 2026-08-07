// Arranque rápido del módulo.
//
// Un negocio que empieza no debería tener que teclear 20 proveedores antes
// de poder usar el sistema. Estas listas son las que el local ya maneja en
// su Excel; se cargan de una vez y luego se editan como cualquier registro.
// Nada de esto se vuelve a tocar: si el registro ya existe, se respeta.

import { db } from '@/lib/db'
import { crearFondosIniciales } from './fondos'

const PROVEEDORES_BASE: Array<{ nombre: string; categoria: string }> = [
  { nombre: 'Carnes Ahorro', categoria: 'PROTEINAS' },
  { nombre: 'Hermanos Camacaro', categoria: 'PROTEINAS' },
  { nombre: 'Guillermo Pernil', categoria: 'PROTEINAS' },
  { nombre: 'Camarón', categoria: 'PROTEINAS' },
  { nombre: 'Santiago Verduras', categoria: 'VERDURAS' },
  { nombre: 'Roger Angulo', categoria: 'VERDURAS' },
  { nombre: 'Zumo de Limón', categoria: 'VERDURAS' },
  { nombre: 'Mozzarella', categoria: 'LACTEOS' },
  { nombre: 'Cheddar', categoria: 'LACTEOS' },
  { nombre: 'Natillas', categoria: 'LACTEOS' },
  { nombre: 'Polar', categoria: 'BEBIDAS' },
  { nombre: 'Agua potable', categoria: 'BEBIDAS' },
  { nombre: 'Surtiplaza', categoria: 'INSUMOS' },
  { nombre: 'Mazari', categoria: 'INSUMOS' },
  { nombre: 'Neveplast', categoria: 'INSUMOS' },
  { nombre: 'Red Box', categoria: 'INSUMOS' },
  { nombre: 'Mayonesa', categoria: 'INSUMOS' },
]

const GASTOS_FIJOS_BASE: Array<{ nombre: string; montoUSD: number; diaVencimiento: number }> = [
  { nombre: 'Alquiler', montoUSD: 0, diaVencimiento: 5 },
  { nombre: 'Condominio', montoUSD: 0, diaVencimiento: 15 },
  { nombre: 'Electricidad', montoUSD: 0, diaVencimiento: 15 },
  { nombre: 'Internet', montoUSD: 0, diaVencimiento: 14 },
  { nombre: 'Teléfono', montoUSD: 0, diaVencimiento: 9 },
  { nombre: 'Gas', montoUSD: 0, diaVencimiento: 9 },
  { nombre: 'Sistema de facturación', montoUSD: 0, diaVencimiento: 5 },
  { nombre: 'App de delivery', montoUSD: 0, diaVencimiento: 6 },
]

export interface ResultadoSetup {
  fondos: number
  proveedores: number
  gastosFijos: number
}

/**
 * Deja el módulo listo para usarse: fondos, proveedores habituales y las
 * plantillas de gastos fijos (en 0, para que el usuario ponga sus montos).
 * Es idempotente: correrlo dos veces no duplica nada.
 */
export async function configuracionInicial(empresaId: string): Promise<ResultadoSetup> {
  const { creados: fondos } = await crearFondosIniciales(empresaId)

  const proveedoresExistentes = await db.restProveedor.findMany({
    where: { empresaId },
    select: { nombre: true },
  })
  const yaHay = new Set(proveedoresExistentes.map((p) => p.nombre))
  const proveedoresNuevos = PROVEEDORES_BASE.filter((p) => !yaHay.has(p.nombre))
  if (proveedoresNuevos.length) {
    await db.restProveedor.createMany({
      data: proveedoresNuevos.map((p) => ({ empresaId, nombre: p.nombre, categoria: p.categoria })),
    })
  }

  const fijosExistentes = await db.restGastoFijo.findMany({
    where: { empresaId },
    select: { nombre: true },
  })
  const yaHayFijos = new Set(fijosExistentes.map((f) => f.nombre))
  const fijosNuevos = GASTOS_FIJOS_BASE.filter((f) => !yaHayFijos.has(f.nombre))
  if (fijosNuevos.length) {
    await db.restGastoFijo.createMany({
      data: fijosNuevos.map((f) => ({
        empresaId,
        nombre: f.nombre,
        montoUSD: f.montoUSD,
        diaVencimiento: f.diaVencimiento,
        // Arrancan inactivos porque su monto todavía es 0: así no se
        // generan gastos en cero al inicio del mes.
        activo: false,
      })),
    })
  }

  return {
    fondos,
    proveedores: proveedoresNuevos.length,
    gastosFijos: fijosNuevos.length,
  }
}
