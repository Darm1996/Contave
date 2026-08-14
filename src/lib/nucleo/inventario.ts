// ═══════════════════════════════════════════════════════════════════════
//  Motor de inventario: kardex, costeo promedio ponderado, reversas
// ═══════════════════════════════════════════════════════════════════════
//
// Reemplaza al motor anterior (src/lib/contabilidad/inventario.ts) y corrige
// tres defectos que tenía, todos con consecuencias de negocio:
//
//   1. Aritmética en Float. El costo promedio se redondeaba a 2 decimales en
//      CADA movimiento, así que el error se acumulaba hasta que la
//      valorización dejaba de coincidir con el kardex. Ahora todo es Decimal
//      y el promedio se guarda con 6 decimales.
//
//   2. Lectura y escritura sin transacción. Se leía la existencia, se
//      calculaba y se escribía en tres pasos separados: dos ventas
//      simultáneas del mismo producto leían el mismo saldo y la segunda
//      sobrescribía a la primera, perdiendo una salida. Ahora todo ocurre
//      dentro de una transacción con bloqueo de fila (FOR UPDATE).
//
//   3. Sin almacén. El stock era un único número por producto, así que un
//      negocio con dos sedes no podía saber dónde estaba su mercancía. Ahora
//      el kardex es por (variante, almacén).
//
// PRINCIPIO: el kardex es inmutable. Un movimiento no se edita ni se borra;
// si hubo un error se registra una REVERSA que apunta al original. La
// existencia (tabla `existencias`) es solo un caché del saldo para que el
// POS responda rápido — la verdad es la suma de los movimientos.

import type { Prisma as PrismaTypes } from '@prisma/client'
import { db } from '@/lib/db'
import {
  d,
  suma,
  mult,
  resta,
  div,
  negar,
  absoluto,
  esCero,
  esPositivo,
  mayor,
  redondear,
  redondearCantidad,
  redondearCosto,
  promedioPonderado,
  sumarPor,
  type Numerico,
} from './dinero'

/** Cliente Prisma o transacción: permite componer operaciones en una misma transacción. */
type ClientePrisma = Omit<typeof db, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

/**
 * Tipos de movimiento. El signo NO se deduce del tipo por el llamador: cada
 * tipo declara aquí si suma o resta existencia, para que no exista la
 * posibilidad de registrar una venta que sume stock.
 */
export const TIPOS_MOVIMIENTO = {
  ENTRADA_COMPRA: 1,
  DEVOLUCION_CLIENTE: 1,
  TRASLADO_ENTRADA: 1,
  PRODUCCION_ENTRADA: 1,
  SALDO_INICIAL: 1,
  SALIDA_VENTA: -1,
  DEVOLUCION_PROVEEDOR: -1,
  TRASLADO_SALIDA: -1,
  MERMA: -1,
  CONSUMO_INTERNO: -1,
  PRODUCCION_SALIDA: -1,
  // El ajuste por conteo puede ir en cualquier dirección: el signo lo
  // determina la diferencia entre el físico y el teórico.
  AJUSTE_CONTEO: 0,
  // La reversa toma el signo contrario del movimiento que anula.
  REVERSA: 0,
} as const

export type TipoMovimiento = keyof typeof TIPOS_MOVIMIENTO

/** Movimientos que representan una entrada de mercancía y por tanto exigen costo. */
export function esEntrada(tipo: TipoMovimiento): boolean {
  return TIPOS_MOVIMIENTO[tipo] === 1
}

export interface EntradaMovimiento {
  organizacionId: string
  varianteId: string
  almacenId: string
  tipo: TipoMovimiento
  /**
   * Cantidad SIEMPRE en positivo, salvo AJUSTE_CONTEO y REVERSA donde el
   * signo es significativo. El motor aplica el signo según el tipo.
   */
  cantidad: Numerico
  /** Requerido en entradas. En salidas se ignora: se usa el promedio vigente. */
  costoUnitario?: Numerico
  loteId?: string | null
  motivo?: string | null
  usuarioId?: string | null
  fecha?: Date
  ventaId?: string | null
  compraId?: string | null
  trasladoId?: string | null
  tomaId?: string | null
  comandaId?: string | null
  asientoId?: string | null
  /**
   * Permite que la existencia quede negativa. Por defecto NO se permite: un
   * stock negativo es casi siempre un error de captura, y dejarlo pasar
   * convierte el inventario en un número que nadie cree. Se habilita solo
   * para negocios que venden con existencia pendiente de cargar.
   */
  permitirNegativo?: boolean
}

export class ErrorInventario extends Error {
  constructor(mensaje: string) {
    super(mensaje)
    this.name = 'ErrorInventario'
  }
}

// ───────────────────────────────────────────────────────────────────────
//  REGISTRO DE MOVIMIENTOS
// ───────────────────────────────────────────────────────────────────────

/**
 * Registra un movimiento de inventario de forma atómica.
 *
 * Todo ocurre en una transacción: se bloquea la fila de existencia, se
 * recalcula el saldo y el costo promedio, se inserta el movimiento y se
 * actualiza el caché. Si algo falla, nada queda escrito — no existe el
 * estado intermedio donde el movimiento está pero el saldo no se movió.
 */
export async function registrarMovimiento(entrada: EntradaMovimiento) {
  return db.$transaction(async (tx) => registrarMovimientoEnTransaccion(tx, entrada))
}

/**
 * Igual que `registrarMovimiento` pero reutilizando una transacción
 * existente. Es la que usan venta y compra, porque descontar el inventario,
 * registrar el pago y mover la caja tienen que confirmarse juntos o no
 * confirmarse.
 */
export async function registrarMovimientoEnTransaccion(
  tx: PrismaTypes.TransactionClient,
  entrada: EntradaMovimiento,
) {
  const signo = TIPOS_MOVIMIENTO[entrada.tipo]
  const cantidadPedida = d(entrada.cantidad)

  if (esCero(cantidadPedida)) {
    throw new ErrorInventario('La cantidad de un movimiento no puede ser cero')
  }
  if (signo !== 0 && !esPositivo(cantidadPedida)) {
    throw new ErrorInventario(
      `La cantidad debe ser positiva para un movimiento de tipo ${entrada.tipo}; el signo lo aplica el sistema`,
    )
  }

  // Cantidad con signo aplicado: positiva entra, negativa sale.
  const cantidad = redondearCantidad(signo === 0 ? cantidadPedida : mult(cantidadPedida, signo))

  const variante = await tx.variante.findFirst({
    where: { id: entrada.varianteId, organizacionId: entrada.organizacionId },
    include: { producto: { select: { nombre: true, controlaStock: true, manejaLotes: true } } },
  })
  if (!variante) throw new ErrorInventario('La variante no existe en esta organización')

  const almacen = await tx.almacen.findFirst({
    where: { id: entrada.almacenId, organizacionId: entrada.organizacionId },
  })
  if (!almacen) throw new ErrorInventario('El almacén no existe en esta organización')

  if (variante.producto.manejaLotes && esPositivo(cantidad) && !entrada.loteId) {
    throw new ErrorInventario(
      `"${variante.producto.nombre}" maneja lotes: toda entrada debe indicar el lote y su fecha de vencimiento`,
    )
  }

  const existencia = await bloquearExistencia(tx, entrada.organizacionId, entrada.varianteId, entrada.almacenId)

  // ── Costeo ────────────────────────────────────────────────────────
  let costoUnitario: PrismaTypes.Decimal
  let cantidadSaldo: PrismaTypes.Decimal
  let costoPromedioSaldo: PrismaTypes.Decimal

  if (esPositivo(cantidad)) {
    if (entrada.costoUnitario === undefined || entrada.costoUnitario === null) {
      throw new ErrorInventario(`El costo unitario es obligatorio en un movimiento de tipo ${entrada.tipo}`)
    }
    costoUnitario = redondearCosto(entrada.costoUnitario)
    if (d(costoUnitario).isNegative()) {
      throw new ErrorInventario('El costo unitario no puede ser negativo')
    }
    const resultado = promedioPonderado(existencia.cantidad, existencia.costoPromedio, cantidad, costoUnitario)
    cantidadSaldo = resultado.cantidadSaldo
    costoPromedioSaldo = resultado.costoPromedio
  } else {
    // Salida: se valora al costo promedio vigente y el promedio NO cambia.
    // Esta es la definición del costeo promedio ponderado: solo las entradas
    // mueven el promedio.
    costoUnitario =
      entrada.costoUnitario !== undefined && entrada.costoUnitario !== null
        ? redondearCosto(entrada.costoUnitario)
        : d(existencia.costoPromedio)

    cantidadSaldo = redondearCantidad(suma(existencia.cantidad, cantidad))
    costoPromedioSaldo = d(existencia.costoPromedio)

    const disponible = resta(existencia.cantidad, existencia.cantidadReservada)
    if (variante.producto.controlaStock && !entrada.permitirNegativo && mayor(absoluto(cantidad), disponible)) {
      throw new ErrorInventario(
        `No hay existencia suficiente de "${variante.producto.nombre}" en ${almacen.nombre}. ` +
          `Disponible: ${disponible.toString()}, se intenta sacar: ${absoluto(cantidad).toString()}`,
      )
    }
  }

  const costoTotal = redondear(mult(absoluto(cantidad), costoUnitario))

  const movimiento = await tx.movimientoInventario.create({
    data: {
      organizacionId: entrada.organizacionId,
      varianteId: entrada.varianteId,
      almacenId: entrada.almacenId,
      loteId: entrada.loteId ?? null,
      tipo: entrada.tipo,
      cantidad,
      costoUnitario,
      costoTotal,
      cantidadSaldo,
      costoPromedioSaldo,
      motivo: entrada.motivo ?? null,
      usuarioId: entrada.usuarioId ?? null,
      fecha: entrada.fecha ?? new Date(),
      ventaId: entrada.ventaId ?? null,
      compraId: entrada.compraId ?? null,
      trasladoId: entrada.trasladoId ?? null,
      tomaId: entrada.tomaId ?? null,
      comandaId: entrada.comandaId ?? null,
      asientoId: entrada.asientoId ?? null,
    },
  })

  await tx.existencia.update({
    where: { id: existencia.id },
    data: {
      cantidad: cantidadSaldo,
      costoPromedio: costoPromedioSaldo,
      ultimoCosto: esPositivo(cantidad) ? costoUnitario : existencia.ultimoCosto,
    },
  })

  if (entrada.loteId) {
    await tx.lote.update({
      where: { id: entrada.loteId },
      data: { cantidad: { increment: cantidad } },
    })
  }

  return movimiento
}

/**
 * Reversa un movimiento: registra el movimiento contrario apuntando al
 * original. No modifica ni borra el original.
 *
 * La reversa se valora al MISMO costo unitario del movimiento original, no
 * al promedio de hoy. Si se reversara al costo actual, anular una venta
 * antigua cambiaría la valorización del inventario y el resultado del
 * período ya cerrado.
 */
export async function reversarMovimiento(
  tx: PrismaTypes.TransactionClient,
  movimientoId: string,
  motivo: string,
  usuarioId?: string | null,
) {
  const original = await tx.movimientoInventario.findUnique({
    where: { id: movimientoId },
    include: { reversa: true },
  })
  if (!original) throw new ErrorInventario('El movimiento a reversar no existe')
  if (original.reversa) throw new ErrorInventario('Este movimiento ya fue reversado')

  const existencia = await bloquearExistencia(
    tx,
    original.organizacionId,
    original.varianteId,
    original.almacenId,
  )

  const cantidadReversa = negar(original.cantidad)
  const cantidadSaldo = redondearCantidad(suma(existencia.cantidad, cantidadReversa))

  // Al reversar una entrada hay que deshacer también su efecto sobre el
  // promedio: se retira del acumulado el valor que aportó esa entrada.
  let costoPromedioSaldo = d(existencia.costoPromedio)
  if (esPositivo(original.cantidad) && esPositivo(cantidadSaldo)) {
    const valorActual = mult(existencia.cantidad, existencia.costoPromedio)
    const valorRetirado = mult(original.cantidad, original.costoUnitario)
    costoPromedioSaldo = redondearCosto(div(resta(valorActual, valorRetirado), cantidadSaldo))
  }

  const movimiento = await tx.movimientoInventario.create({
    data: {
      organizacionId: original.organizacionId,
      varianteId: original.varianteId,
      almacenId: original.almacenId,
      loteId: original.loteId,
      tipo: 'REVERSA',
      cantidad: cantidadReversa,
      costoUnitario: original.costoUnitario,
      costoTotal: original.costoTotal,
      cantidadSaldo,
      costoPromedioSaldo,
      motivo,
      usuarioId: usuarioId ?? null,
      ventaId: original.ventaId,
      compraId: original.compraId,
      trasladoId: original.trasladoId,
      tomaId: original.tomaId,
      movimientoReversadoId: original.id,
    },
  })

  await tx.existencia.update({
    where: { id: existencia.id },
    data: { cantidad: cantidadSaldo, costoPromedio: costoPromedioSaldo },
  })

  if (original.loteId) {
    await tx.lote.update({
      where: { id: original.loteId },
      data: { cantidad: { increment: cantidadReversa } },
    })
  }

  return movimiento
}

// ───────────────────────────────────────────────────────────────────────
//  EXISTENCIAS
// ───────────────────────────────────────────────────────────────────────

/**
 * Obtiene la fila de existencia creándola si no existe, y la bloquea hasta
 * el final de la transacción.
 *
 * El bloqueo (FOR UPDATE) es lo que hace correcto el sistema bajo
 * concurrencia: sin él, dos cajeros vendiendo la última unidad al mismo
 * tiempo leerían "1 disponible" los dos y ambos venderían.
 */
async function bloquearExistencia(
  tx: PrismaTypes.TransactionClient,
  organizacionId: string,
  varianteId: string,
  almacenId: string,
) {
  // upsert primero para garantizar que la fila exista y por tanto se pueda
  // bloquear. Si dos transacciones la crean a la vez, la restricción única
  // (varianteId, almacenId) hace que una falle y reintente.
  await tx.existencia.upsert({
    where: { varianteId_almacenId: { varianteId, almacenId } },
    create: { organizacionId, varianteId, almacenId },
    update: {},
  })

  await tx.$queryRaw`
    SELECT id FROM existencias
    WHERE "varianteId" = ${varianteId} AND "almacenId" = ${almacenId}
    FOR UPDATE
  `

  const existencia = await tx.existencia.findUniqueOrThrow({
    where: { varianteId_almacenId: { varianteId, almacenId } },
  })
  return existencia
}

/** Existencia disponible (cantidad menos reservada) de una variante en un almacén. */
export async function existenciaDisponible(varianteId: string, almacenId: string) {
  const e = await db.existencia.findUnique({
    where: { varianteId_almacenId: { varianteId, almacenId } },
  })
  if (!e) return d(0)
  return resta(e.cantidad, e.cantidadReservada)
}

// ───────────────────────────────────────────────────────────────────────
//  KARDEX Y VALORIZACIÓN
// ───────────────────────────────────────────────────────────────────────

export interface FiltroKardex {
  organizacionId: string
  varianteId: string
  almacenId?: string
  desde?: Date
  hasta?: Date
}

/** Kardex de una variante: la cadena de movimientos que explica su saldo. */
export async function obtenerKardex(filtro: FiltroKardex) {
  const movimientos = await db.movimientoInventario.findMany({
    where: {
      organizacionId: filtro.organizacionId,
      varianteId: filtro.varianteId,
      ...(filtro.almacenId ? { almacenId: filtro.almacenId } : {}),
      ...(filtro.desde || filtro.hasta
        ? { fecha: { ...(filtro.desde ? { gte: filtro.desde } : {}), ...(filtro.hasta ? { lte: filtro.hasta } : {}) } }
        : {}),
    },
    orderBy: [{ fecha: 'asc' }, { createdAt: 'asc' }],
    include: { almacen: { select: { nombre: true } }, lote: { select: { codigo: true } } },
  })

  return {
    movimientos,
    totalEntradas: sumarPor(
      movimientos.filter((m) => esPositivo(m.cantidad)),
      (m) => m.cantidad,
    ),
    totalSalidas: sumarPor(
      movimientos.filter((m) => !esPositivo(m.cantidad)),
      (m) => absoluto(m.cantidad),
    ),
  }
}

/**
 * Existencia y valorización a una fecha pasada, reconstruidas desde el
 * kardex y no desde el caché de existencias.
 *
 * Esto es lo que permite cerrar un período y volver a sacar el mismo número
 * meses después: el saldo a una fecha es la suma de los movimientos hasta
 * esa fecha, y como los movimientos son inmutables, la respuesta nunca
 * cambia.
 */
export async function valorizacionAFecha(organizacionId: string, hasta: Date, almacenId?: string) {
  const movimientos = await db.movimientoInventario.findMany({
    where: {
      organizacionId,
      fecha: { lte: hasta },
      ...(almacenId ? { almacenId } : {}),
    },
    orderBy: [{ fecha: 'asc' }, { createdAt: 'asc' }],
    select: { varianteId: true, cantidad: true, cantidadSaldo: true, costoPromedioSaldo: true, fecha: true },
  })

  // El último movimiento de cada variante lleva la fotografía de su saldo y
  // su costo promedio en ese instante: no hace falta re-simular la cadena.
  const ultimoPorVariante = new Map<string, { cantidad: PrismaTypes.Decimal; costo: PrismaTypes.Decimal }>()
  for (const m of movimientos) {
    ultimoPorVariante.set(m.varianteId, { cantidad: m.cantidadSaldo, costo: m.costoPromedioSaldo })
  }

  let valorTotal = d(0)
  const detalle: Array<{ varianteId: string; cantidad: string; costoPromedio: string; valor: string }> = []
  for (const [varianteId, saldo] of ultimoPorVariante) {
    const valor = redondear(mult(saldo.cantidad, saldo.costo))
    valorTotal = suma(valorTotal, valor)
    detalle.push({
      varianteId,
      cantidad: saldo.cantidad.toString(),
      costoPromedio: saldo.costo.toString(),
      valor: valor.toString(),
    })
  }

  return { fecha: hasta, valorTotal, detalle }
}

/** Valorización del inventario vigente, desde el caché de existencias. */
export async function valorizacionActual(organizacionId: string, almacenId?: string) {
  const existencias = await db.existencia.findMany({
    where: { organizacionId, ...(almacenId ? { almacenId } : {}) },
  })
  return existencias.reduce(
    (total, e) => suma(total, mult(e.cantidad, e.costoPromedio)),
    d(0),
  )
}

/**
 * Verifica que el caché de existencias coincida con el kardex.
 *
 * Es la prueba de que "el inventario nunca queda descuadrado": si alguna
 * variante difiere, hay un movimiento que se escribió sin actualizar el
 * saldo (o al revés) y el sistema lo reporta en vez de esconderlo. Se
 * ejecuta como chequeo de integridad, no en el camino de la venta.
 */
export async function verificarIntegridadKardex(organizacionId: string) {
  const existencias = await db.existencia.findMany({ where: { organizacionId } })
  const discrepancias: Array<{
    varianteId: string
    almacenId: string
    saldoCache: string
    saldoKardex: string
    diferencia: string
  }> = []

  for (const e of existencias) {
    const movimientos = await db.movimientoInventario.findMany({
      where: { varianteId: e.varianteId, almacenId: e.almacenId },
      select: { cantidad: true },
    })
    const saldoKardex = sumarPor(movimientos, (m) => m.cantidad)
    const diferencia = resta(e.cantidad, saldoKardex)
    if (!esCero(diferencia)) {
      discrepancias.push({
        varianteId: e.varianteId,
        almacenId: e.almacenId,
        saldoCache: e.cantidad.toString(),
        saldoKardex: saldoKardex.toString(),
        diferencia: diferencia.toString(),
      })
    }
  }

  return { cuadrado: discrepancias.length === 0, discrepancias }
}

// ───────────────────────────────────────────────────────────────────────
//  ALERTAS Y SUGERENCIA DE COMPRA
// ───────────────────────────────────────────────────────────────────────

/** Variantes por debajo de su punto de reorden, con la cantidad sugerida a comprar. */
export async function sugerenciaCompra(organizacionId: string, almacenId?: string) {
  const existencias = await db.existencia.findMany({
    where: { organizacionId, ...(almacenId ? { almacenId } : {}) },
    include: {
      variante: {
        include: {
          producto: {
            select: { nombre: true, stockMinimo: true, puntoReorden: true, controlaStock: true, activo: true },
          },
        },
      },
      almacen: { select: { nombre: true } },
    },
  })

  return existencias
    .filter((e) => e.variante.producto.controlaStock && e.variante.producto.activo)
    .filter((e) => mayor(e.variante.producto.puntoReorden, e.cantidad))
    .map((e) => ({
      varianteId: e.varianteId,
      sku: e.variante.sku,
      nombre: `${e.variante.producto.nombre} ${e.variante.nombre}`.trim(),
      almacen: e.almacen.nombre,
      existencia: e.cantidad.toString(),
      puntoReorden: e.variante.producto.puntoReorden.toString(),
      // Se sugiere reponer hasta el mínimo, que es el colchón que el negocio
      // definió; el punto de reorden solo dispara el aviso.
      cantidadSugerida: redondearCantidad(
        resta(
          mayor(e.variante.producto.stockMinimo, e.variante.producto.puntoReorden)
            ? e.variante.producto.stockMinimo
            : e.variante.producto.puntoReorden,
          e.cantidad,
        ),
      ).toString(),
    }))
}
