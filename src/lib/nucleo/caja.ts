// ═══════════════════════════════════════════════════════════════════════
//  Turno de caja y arqueo
// ═══════════════════════════════════════════════════════════════════════
//
// Un turno de caja responde a una pregunta muy concreta al final del día:
// ¿el efectivo que hay en la gaveta es el que debería haber?
//
// Para poder responderla, el sistema exige tres cosas:
//   • Que no se cobre efectivo sin un turno abierto, para que el dinero tenga
//     dueño y horario.
//   • Que el efectivo esperado se calcule desde los cobros registrados, no se
//     escriba a mano.
//   • Que toda diferencia se registre con justificación obligatoria. Un
//     arqueo que "cuadra solo" porque el sistema ajustó el esperado no es un
//     arqueo: es un faltante escondido.

import type { Prisma as PrismaTypes } from '@prisma/client'
import { db } from '@/lib/db'
import { d, suma, resta, redondear, esCero, esPositivo, sumarPor, type Numerico, type Decimal } from './dinero'
import { exigirEnContexto, exigirSucursal, type ContextoOperacion } from './permisos'
import { ErrorNegocio, ErrorNoEncontrado } from './respuesta'

// ───────────────────────────────────────────────────────────────────────
//  APERTURA
// ───────────────────────────────────────────────────────────────────────

export interface AperturaEntrada {
  cajaId: string
  montoInicial: Numerico
  observaciones?: string | null
}

/**
 * Abre un turno de caja con su fondo inicial.
 *
 * Una sola sesión abierta por caja: dos turnos simultáneos en la misma gaveta
 * hacen imposible saber de quién es el efectivo. Lo garantiza además un índice
 * único parcial en la base de datos.
 */
export async function abrirTurno(ctx: ContextoOperacion, entrada: AperturaEntrada) {
  exigirEnContexto(ctx, 'caja.abrir')

  const caja = await db.caja.findFirst({
    where: { id: entrada.cajaId, organizacionId: ctx.organizacionId, activo: true, deletedAt: null },
  })
  if (!caja) throw new ErrorNoEncontrado('La caja no existe o está inactiva')

  exigirSucursal(ctx, caja.sucursalId)

  const montoInicial = d(entrada.montoInicial)
  if (montoInicial.isNegative()) {
    throw new ErrorNegocio('El fondo inicial no puede ser negativo')
  }

  const abierta = await db.sesionCaja.findFirst({
    where: { cajaId: caja.id, estado: 'ABIERTA' },
    include: { usuario: { select: { name: true } } },
  })
  if (abierta) {
    throw new ErrorNegocio(
      `${caja.nombre} ya tiene un turno abierto por ${abierta.usuario.name}. Ciérralo antes de abrir otro.`,
    )
  }

  const organizacion = await db.organizacion.findUniqueOrThrow({
    where: { id: ctx.organizacionId },
    select: { monedaFuncional: true },
  })

  return db.sesionCaja.create({
    data: {
      organizacionId: ctx.organizacionId,
      cajaId: caja.id,
      usuarioId: ctx.usuarioId,
      montoInicial,
      moneda: organizacion.monedaFuncional,
      observaciones: entrada.observaciones ?? null,
    },
  })
}

/** Turno abierto del usuario actual, si tiene uno. Es lo que consulta el POS al arrancar. */
export async function turnoAbierto(ctx: ContextoOperacion, cajaId?: string) {
  return db.sesionCaja.findFirst({
    where: {
      organizacionId: ctx.organizacionId,
      estado: 'ABIERTA',
      ...(cajaId ? { cajaId } : {}),
      ...(ctx.puede('caja.ver_todas') ? {} : { usuarioId: ctx.usuarioId }),
    },
    include: { caja: { select: { id: true, nombre: true, sucursalId: true } } },
    orderBy: { fechaApertura: 'desc' },
  })
}

// ───────────────────────────────────────────────────────────────────────
//  MOVIMIENTOS MANUALES
// ───────────────────────────────────────────────────────────────────────

export interface MovimientoCajaEntrada {
  sesionCajaId: string
  tipo: 'INGRESO' | 'EGRESO' | 'TRASPASO_BOVEDA' | 'FONDO_ADICIONAL'
  concepto: string
  monto: Numerico
  referencia?: string | null
}

/**
 * Ingresos y egresos de caja que no son ventas: un préstamo del dueño, el pago
 * de un flete en efectivo, el envío de efectivo a la bóveda.
 *
 * Existen porque sin ellos esos movimientos no se registran en ningún lado y
 * aparecen como una diferencia inexplicable en el arqueo.
 */
export async function registrarMovimientoCaja(ctx: ContextoOperacion, entrada: MovimientoCajaEntrada) {
  exigirEnContexto(ctx, 'caja.movimiento')

  const sesion = await sesionAbiertaDe(ctx, entrada.sesionCajaId)
  const monto = d(entrada.monto)

  if (!esPositivo(monto)) {
    throw new ErrorNegocio('El monto debe ser mayor que cero; la dirección la indica el tipo de movimiento')
  }
  if (!entrada.concepto || entrada.concepto.trim().length < 3) {
    throw new ErrorNegocio('Explica el concepto del movimiento de caja')
  }

  return db.movimientoCaja.create({
    data: {
      sesionCajaId: sesion.id,
      tipo: entrada.tipo,
      concepto: entrada.concepto,
      monto,
      moneda: sesion.moneda,
      referencia: entrada.referencia ?? null,
      usuarioId: ctx.usuarioId,
    },
  })
}

async function sesionAbiertaDe(ctx: ContextoOperacion, sesionCajaId: string) {
  const sesion = await db.sesionCaja.findFirst({
    where: { id: sesionCajaId, organizacionId: ctx.organizacionId },
    include: { caja: { select: { sucursalId: true } } },
  })
  if (!sesion) throw new ErrorNoEncontrado('El turno de caja no existe')
  if (sesion.estado !== 'ABIERTA') throw new ErrorNegocio('El turno ya está cerrado')
  exigirSucursal(ctx, sesion.caja.sucursalId)

  // Un cajero solo opera su propio turno; un supervisor puede operar los demás.
  if (sesion.usuarioId !== ctx.usuarioId && !ctx.puede('caja.ver_todas')) {
    throw new ErrorNegocio('Este turno pertenece a otro usuario', 403)
  }
  return sesion
}

// ───────────────────────────────────────────────────────────────────────
//  EFECTIVO ESPERADO
// ───────────────────────────────────────────────────────────────────────

export interface TotalPorMetodo {
  metodoPagoId: string
  nombre: string
  tipo: string
  moneda: string
  afectaCajaFisica: boolean
  /** Total en la moneda del método (lo que se cuenta físicamente). */
  montoMetodo: Decimal
  /** Equivalente en moneda funcional. */
  montoFuncional: Decimal
}

export interface ResumenTurno {
  sesionCajaId: string
  montoInicial: Decimal
  totalVentas: Decimal
  totalCobros: Decimal
  totalIngresos: Decimal
  totalEgresos: Decimal
  /** Fondo inicial + cobros en efectivo + ingresos − egresos. */
  efectivoEsperado: Decimal
  porMetodo: TotalPorMetodo[]
  cantidadVentas: number
}

/**
 * Calcula el estado del turno desde los documentos registrados.
 *
 * El efectivo esperado se DERIVA: fondo inicial, más los cobros por métodos
 * que entran a la gaveta, más ingresos manuales, menos egresos. Los pagos de
 * reversa (de ventas anuladas) vienen con monto negativo, así que restan
 * solos y el esperado vuelve exactamente a su valor anterior — que es lo que
 * hace que anular una venta no deje diferencia en la caja.
 */
export async function resumenTurno(ctx: ContextoOperacion, sesionCajaId: string): Promise<ResumenTurno> {
  const sesion = await db.sesionCaja.findFirst({
    where: { id: sesionCajaId, organizacionId: ctx.organizacionId },
  })
  if (!sesion) throw new ErrorNoEncontrado('El turno de caja no existe')

  const pagos = await db.pago.findMany({
    where: { sesionCajaId: sesion.id },
    include: {
      metodo: { select: { id: true, nombre: true, tipo: true, moneda: true, afectaCajaFisica: true } },
    },
  })

  const movimientos = await db.movimientoCaja.findMany({ where: { sesionCajaId: sesion.id } })

  const ventas = await db.venta.findMany({
    where: { sesionCajaId: sesion.id, estado: 'CONFIRMADA', deletedAt: null },
    select: { total: true },
  })

  // Agrupación por método de cobro, para el desglose del arqueo.
  const porMetodo = new Map<string, TotalPorMetodo>()
  for (const pago of pagos) {
    if (!pago.metodo) continue
    const acumulado = porMetodo.get(pago.metodo.id) ?? {
      metodoPagoId: pago.metodo.id,
      nombre: pago.metodo.nombre,
      tipo: pago.metodo.tipo,
      moneda: pago.metodo.moneda,
      afectaCajaFisica: pago.metodo.afectaCajaFisica,
      montoMetodo: d(0),
      montoFuncional: d(0),
    }
    acumulado.montoMetodo = suma(acumulado.montoMetodo, pago.monto)
    acumulado.montoFuncional = suma(acumulado.montoFuncional, pago.montoMonedaFuncional)
    porMetodo.set(pago.metodo.id, acumulado)
  }

  const totalCobros = sumarPor(pagos, (p) => p.montoMonedaFuncional)
  const cobrosEnGaveta = sumarPor(
    pagos.filter((p) => p.metodo?.afectaCajaFisica),
    (p) => p.montoMonedaFuncional,
  )
  const totalIngresos = sumarPor(
    movimientos.filter((m) => m.tipo === 'INGRESO' || m.tipo === 'FONDO_ADICIONAL'),
    (m) => m.monto,
  )
  const totalEgresos = sumarPor(
    movimientos.filter((m) => m.tipo === 'EGRESO' || m.tipo === 'TRASPASO_BOVEDA'),
    (m) => m.monto,
  )

  const efectivoEsperado = redondear(
    resta(suma(sesion.montoInicial, cobrosEnGaveta, totalIngresos), totalEgresos),
  )

  return {
    sesionCajaId: sesion.id,
    montoInicial: d(sesion.montoInicial),
    totalVentas: redondear(sumarPor(ventas, (v) => v.total)),
    totalCobros: redondear(totalCobros),
    totalIngresos: redondear(totalIngresos),
    totalEgresos: redondear(totalEgresos),
    efectivoEsperado,
    porMetodo: [...porMetodo.values()].map((m) => ({
      ...m,
      montoMetodo: redondear(m.montoMetodo),
      montoFuncional: redondear(m.montoFuncional),
    })),
    cantidadVentas: ventas.length,
  }
}

// ───────────────────────────────────────────────────────────────────────
//  CIERRE Y ARQUEO
// ───────────────────────────────────────────────────────────────────────

export interface CierreEntrada {
  sesionCajaId: string
  /** Efectivo físicamente contado en la gaveta. */
  efectivoContado: Numerico
  /** Justificación de la diferencia. Obligatoria si hay diferencia. */
  justificacion?: string | null
  /** Conteo por método, para conciliar punto de venta y transferencias. */
  detallePorMetodo?: Array<{ metodoPagoId: string; montoContado: Numerico }>
  observaciones?: string | null
}

/**
 * Cierra el turno registrando el arqueo.
 *
 * La diferencia se calcula (contado − esperado) y se guarda siempre, incluso
 * si es cero. Si hay diferencia y no hay justificación, el cierre se rechaza —
 * y si alguien intentara escribirlo por otra vía, la restricción
 * `arqueo_diferencia_justificada` de la base de datos lo detiene igual.
 *
 * El turno se cierra con los totales persistidos: el cierre es un hecho
 * histórico, no un cálculo que cambie si mañana se corrige algo.
 */
export async function cerrarTurno(ctx: ContextoOperacion, entrada: CierreEntrada) {
  exigirEnContexto(ctx, 'caja.cerrar')

  const sesion = await sesionAbiertaDe(ctx, entrada.sesionCajaId)
  const resumen = await resumenTurno(ctx, sesion.id)

  const efectivoContado = d(entrada.efectivoContado)
  if (efectivoContado.isNegative()) {
    throw new ErrorNegocio('El efectivo contado no puede ser negativo')
  }

  const diferencia = redondear(resta(efectivoContado, resumen.efectivoEsperado))
  const justificacion = entrada.justificacion?.trim() ?? ''

  if (!esCero(diferencia) && justificacion.length < 3) {
    const signo = diferencia.isNegative() ? 'falta' : 'sobra'
    throw new ErrorNegocio(
      `El arqueo no cuadra: ${signo}n ${diferencia.absoluteValue().toFixed(2)} ` +
        `(esperado ${resumen.efectivoEsperado.toFixed(2)}, contado ${efectivoContado.toFixed(2)}). ` +
        'Explica la diferencia para poder cerrar el turno.',
    )
  }

  return db.$transaction(async (tx) => {
    const arqueo = await tx.arqueo.create({
      data: {
        sesionCajaId: sesion.id,
        usuarioId: ctx.usuarioId,
        efectivoEsperado: resumen.efectivoEsperado,
        efectivoContado,
        diferencia,
        justificacion: justificacion.length > 0 ? justificacion : null,
        moneda: sesion.moneda,
      },
    })

    // Desglose por método: el efectivo se cuenta, los demás métodos se
    // comparan contra lo registrado para conciliar el punto de venta.
    for (const metodo of resumen.porMetodo) {
      const contado = entrada.detallePorMetodo?.find((m) => m.metodoPagoId === metodo.metodoPagoId)
      const montoContado = contado ? d(contado.montoContado) : metodo.montoMetodo
      await tx.arqueoDetalle.create({
        data: {
          arqueoId: arqueo.id,
          metodoPagoId: metodo.metodoPagoId,
          montoEsperado: metodo.montoMetodo,
          montoContado,
          diferencia: redondear(resta(montoContado, metodo.montoMetodo)),
          moneda: metodo.moneda,
        },
      })
    }

    const sesionCerrada = await tx.sesionCaja.update({
      where: { id: sesion.id },
      data: {
        estado: 'CERRADA',
        fechaCierre: new Date(),
        totalVentas: resumen.totalVentas,
        totalCobros: resumen.totalCobros,
        totalIngresos: resumen.totalIngresos,
        totalEgresos: resumen.totalEgresos,
        efectivoEsperado: resumen.efectivoEsperado,
        observaciones: entrada.observaciones ?? sesion.observaciones,
      },
    })

    return { sesion: sesionCerrada, arqueo, resumen }
  })
}

/** Flujo de caja de un período: entradas, salidas y saldo por día. */
export async function flujoDeCaja(ctx: ContextoOperacion, desde: Date, hasta: Date) {
  const sesiones = await db.sesionCaja.findMany({
    where: {
      organizacionId: ctx.organizacionId,
      fechaApertura: { gte: desde, lte: hasta },
    },
    include: { arqueo: true, caja: { select: { nombre: true } }, usuario: { select: { name: true } } },
    orderBy: { fechaApertura: 'asc' },
  })

  return {
    desde,
    hasta,
    turnos: sesiones.length,
    totalVentas: redondear(sumarPor(sesiones, (s) => s.totalVentas)),
    totalCobros: redondear(sumarPor(sesiones, (s) => s.totalCobros)),
    totalIngresos: redondear(sumarPor(sesiones, (s) => s.totalIngresos)),
    totalEgresos: redondear(sumarPor(sesiones, (s) => s.totalEgresos)),
    // Suma de las diferencias de arqueo del período: si no es cero, hay
    // faltantes o sobrantes que alguien debe revisar.
    diferenciaAcumulada: redondear(sumarPor(sesiones, (s) => s.arqueo?.diferencia ?? 0)),
    detalle: sesiones.map((s) => ({
      id: s.id,
      caja: s.caja.nombre,
      usuario: s.usuario.name,
      fechaApertura: s.fechaApertura,
      fechaCierre: s.fechaCierre,
      estado: s.estado,
      totalVentas: s.totalVentas,
      efectivoEsperado: s.efectivoEsperado,
      efectivoContado: s.arqueo?.efectivoContado ?? null,
      diferencia: s.arqueo?.diferencia ?? null,
      justificacion: s.arqueo?.justificacion ?? null,
    })),
  }
}
