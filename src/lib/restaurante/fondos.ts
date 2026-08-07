// Libro de movimientos de los fondos (las "cajas" del negocio).
//
// Nadie registra movimientos a mano: cada cierre diario, gasto, pago a
// proveedor, cobro de fiado y nómina pagada deja su rastro aquí, y el saldo
// de cada fondo es la suma de ese rastro. Como los documentos se pueden
// corregir, todo movimiento guarda de qué documento salió (`origen` +
// `origenId`) para poder rehacerlo cuando el documento cambia.

import { db } from '@/lib/db'
import { bsAUsd, calcularSaldoFondo, redondear, usdABs } from './calculos'
import { FONDOS_INICIALES } from './categorias'

export type OrigenMovimiento = 'CIERRE' | 'GASTO' | 'PAGO_PROVEEDOR' | 'COBRO' | 'NOMINA' | 'AJUSTE'

/** Cliente Prisma o el `tx` de una transacción: ambos sirven igual. */
type PrismaLike = Pick<typeof db, 'restMovimientoFondo' | 'restFondo'>

export interface NuevoMovimiento {
  empresaId: string
  fondoId: string
  fecha: Date
  tipo: 'INGRESO' | 'EGRESO'
  /** Monto en la moneda en que ocurrió; el otro se deriva con la tasa. */
  montoUSD?: number
  montoVES?: number
  tasa?: number
  concepto: string
  origen: OrigenMovimiento
  origenId?: string | null
}

/**
 * Completa el par USD/VES a partir de la tasa. Si solo se conoce uno de los
 * dos y no hay tasa, el otro queda en 0 en vez de inventar una conversión.
 */
export function completarMontos(m: { montoUSD?: number; montoVES?: number; tasa?: number }) {
  const tasa = m.tasa || 0
  const montoUSD = m.montoUSD ?? (tasa > 0 ? bsAUsd(m.montoVES || 0, tasa) : 0)
  const montoVES = m.montoVES ?? (tasa > 0 ? usdABs(m.montoUSD || 0, tasa) : 0)
  return { montoUSD: redondear(montoUSD), montoVES: redondear(montoVES), tasa }
}

export async function registrarMovimiento(prisma: PrismaLike, mov: NuevoMovimiento) {
  const { montoUSD, montoVES, tasa } = completarMontos(mov)
  return prisma.restMovimientoFondo.create({
    data: {
      empresaId: mov.empresaId,
      fondoId: mov.fondoId,
      fecha: mov.fecha,
      tipo: mov.tipo,
      montoUSD,
      montoVES,
      tasa,
      concepto: mov.concepto,
      origen: mov.origen,
      origenId: mov.origenId ?? null,
    },
  })
}

/** Borra los movimientos de un documento para poder volver a generarlos. */
export async function borrarMovimientosDeOrigen(
  prisma: PrismaLike,
  origen: OrigenMovimiento,
  origenId: string,
) {
  await prisma.restMovimientoFondo.deleteMany({ where: { origen, origenId } })
}

export interface CierreParaMovimientos {
  id: string
  empresaId: string
  fecha: Date
  tasa: number
  ventaZelle: number
  ventaEfectivoUSD: number
  ventaBs: number
  ventaPuntoVenta: number
}

/**
 * Vuelca las ventas de un día en los fondos: cada medio de pago entra en el
 * fondo que tenga ese `rolCierre`. Se borra primero lo anterior, de modo que
 * corregir un cierre no duplique ingresos. Un medio de pago sin fondo
 * asignado simplemente no genera movimiento (y su venta se sigue contando en
 * el total del día).
 */
export async function sincronizarMovimientosCierre(
  prisma: PrismaLike,
  cierre: CierreParaMovimientos,
) {
  await borrarMovimientosDeOrigen(prisma, 'CIERRE', cierre.id)

  const fondos = await prisma.restFondo.findMany({
    where: { empresaId: cierre.empresaId, activo: true, rolCierre: { not: null } },
  })

  const porRol: Array<{ rol: string; montoUSD?: number; montoVES?: number }> = [
    { rol: 'ZELLE', montoUSD: cierre.ventaZelle },
    { rol: 'EFECTIVO_USD', montoUSD: cierre.ventaEfectivoUSD },
    { rol: 'BS_TRANSFERENCIA', montoVES: cierre.ventaBs },
    { rol: 'PUNTO_VENTA', montoVES: cierre.ventaPuntoVenta },
  ]

  for (const entrada of porRol) {
    const monto = entrada.montoUSD ?? entrada.montoVES ?? 0
    if (!monto || monto <= 0) continue
    const fondo = fondos.find((f) => f.rolCierre === entrada.rol)
    if (!fondo) continue
    await registrarMovimiento(prisma, {
      empresaId: cierre.empresaId,
      fondoId: fondo.id,
      fecha: cierre.fecha,
      tipo: 'INGRESO',
      montoUSD: entrada.montoUSD,
      montoVES: entrada.montoVES,
      tasa: cierre.tasa,
      concepto: 'Ventas del día',
      origen: 'CIERRE',
      origenId: cierre.id,
    })
  }
}

export interface FondoConSaldo {
  id: string
  nombre: string
  tipo: string
  moneda: string
  color: string
  orden: number
  rolCierre: string | null
  saldoInicial: number
  saldo: number
  /** Saldo llevado a USD con la tasa indicada, para poder totalizar. */
  saldoUSD: number
}

/**
 * Saldo actual de cada fondo. `tasaActual` solo se usa para el total
 * consolidado en dólares; el saldo propio de cada fondo siempre queda en su
 * moneda.
 */
export async function saldosDeFondos(empresaId: string, tasaActual = 0): Promise<FondoConSaldo[]> {
  const fondos = await db.restFondo.findMany({
    where: { empresaId, activo: true },
    orderBy: { orden: 'asc' },
  })
  if (!fondos.length) return []

  const movimientos = await db.restMovimientoFondo.groupBy({
    by: ['fondoId', 'tipo'],
    where: { empresaId },
    _sum: { montoUSD: true, montoVES: true },
  })

  return fondos.map((f) => {
    const suyos = movimientos
      .filter((m) => m.fondoId === f.id)
      .map((m) => ({
        tipo: m.tipo,
        montoUSD: m._sum.montoUSD || 0,
        montoVES: m._sum.montoVES || 0,
      }))
    const saldo = calcularSaldoFondo(f.saldoInicial, f.moneda, suyos)
    return {
      id: f.id,
      nombre: f.nombre,
      tipo: f.tipo,
      moneda: f.moneda,
      color: f.color,
      orden: f.orden,
      rolCierre: f.rolCierre,
      saldoInicial: f.saldoInicial,
      saldo,
      saldoUSD: f.moneda === 'VES' ? bsAUsd(saldo, tasaActual) : saldo,
    }
  })
}

/**
 * Crea los fondos base la primera vez que se abre el módulo, para que nadie
 * tenga que configurar nada antes de registrar su primer día.
 */
export async function crearFondosIniciales(empresaId: string) {
  const existentes = await db.restFondo.count({ where: { empresaId } })
  if (existentes > 0) return { creados: 0 }

  await db.restFondo.createMany({
    data: FONDOS_INICIALES.map((f) => ({
      empresaId,
      nombre: f.nombre,
      tipo: f.tipo,
      moneda: f.moneda,
      color: f.color,
      orden: f.orden,
      rolCierre: f.rolCierre,
    })),
  })
  return { creados: FONDOS_INICIALES.length }
}
