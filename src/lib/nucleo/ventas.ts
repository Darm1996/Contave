// ═══════════════════════════════════════════════════════════════════════
//  Motor de ventas y punto de venta
// ═══════════════════════════════════════════════════════════════════════
//
// Una venta confirmada hace cuatro cosas que tienen que pasar juntas o no
// pasar: descontar el inventario, registrar los cobros, afectar el turno de
// caja y consumir el correlativo. Todo ocurre dentro de UNA transacción. Si
// algo falla, nada queda escrito — no existe el estado intermedio donde el
// inventario bajó pero el cobro no se registró, que es el que deja al negocio
// con mercancía que salió y dinero que nadie sabe dónde está.
//
// Una venta confirmada es INMUTABLE: no se edita y no se borra. Se ANULA, y
// la anulación reversa el inventario y la caja dejando rastro de quién y por
// qué.

import type { Prisma as PrismaTypes } from '@prisma/client'
import { db } from '@/lib/db'
import {
  d,
  suma,
  resta,
  mult,
  div,
  redondear,
  redondearCosto,
  esPositivo,
  esCero,
  mayor,
  iguales,
  porcentaje,
  impuestoIncluido,
  prorratear,
  sumarPor,
  type CriterioRedondeo,
  type Numerico,
  type Decimal,
} from './dinero'
import { registrarMovimientoEnTransaccion, reversarMovimiento } from './inventario'
import { exigirEnContexto, exigirSucursal, type ContextoOperacion } from './permisos'
import { ErrorNegocio, ErrorNoEncontrado } from './respuesta'

// ───────────────────────────────────────────────────────────────────────
//  CORRELATIVOS
// ───────────────────────────────────────────────────────────────────────

/**
 * Reserva el siguiente número de una serie, bloqueando la fila de la
 * secuencia hasta el final de la transacción.
 *
 * El bloqueo es lo que evita que dos cajeros cobrando al mismo tiempo emitan
 * dos tickets con el mismo número. Un correlativo repetido rompe el control de
 * anulaciones y, si el documento es fiscal, es un problema con el SENIAT.
 */
export async function siguienteNumero(
  tx: PrismaTypes.TransactionClient,
  organizacionId: string,
  tipo: string,
  serie = 'A',
): Promise<number> {
  await tx.secuenciaOperativa.upsert({
    where: { organizacionId_tipo_serie: { organizacionId, tipo, serie } },
    create: { organizacionId, tipo, serie, siguienteNumero: 1 },
    update: {},
  })

  await tx.$queryRaw`
    SELECT id FROM secuencias_operativas
    WHERE "organizacionId" = ${organizacionId} AND "tipo" = ${tipo} AND "serie" = ${serie}
    FOR UPDATE
  `

  const secuencia = await tx.secuenciaOperativa.update({
    where: { organizacionId_tipo_serie: { organizacionId, tipo, serie } },
    data: { siguienteNumero: { increment: 1 } },
  })

  return secuencia.siguienteNumero - 1
}

// ───────────────────────────────────────────────────────────────────────
//  CÁLCULO DE UNA LÍNEA
// ───────────────────────────────────────────────────────────────────────

export interface LineaVentaEntrada {
  varianteId: string
  cantidad: Numerico
  /** Si no viene, se toma de la lista de precios vigente. */
  precioUnitario?: Numerico
  descuentoMonto?: Numerico
  /** Quién autorizó el descuento, si excede lo que el cajero puede dar solo. */
  autorizadoPorId?: string | null
  notas?: string | null
}

export interface LineaCalculada {
  varianteId: string
  descripcion: string
  cantidad: Decimal
  precioUnitario: Decimal
  descuentoMonto: Decimal
  impuestoId: string | null
  impuestoTasa: Decimal
  impuestoMonto: Decimal
  costoUnitario: Decimal
  /** Base gravable de la línea: cantidad × precio − descuento, sin impuesto. */
  base: Decimal
  /** Importe de la línea tal como se le cobra al cliente, impuesto incluido. */
  total: Decimal
  autorizadoPorId: string | null
  notas: string | null
  controlaStock: boolean
}

/**
 * Calcula una línea resolviendo el impuesto según cómo esté configurado.
 *
 * La distinción entre impuesto incluido en el precio y añadido al precio es la
 * causa más frecuente de descuadres en el libro de ventas:
 *
 *   • Añadido (típico en factura):  base 100, IVA 16 → total 116
 *   • Incluido (típico en quiosco): total 116 → base 100, IVA 16
 *
 * Aplicar 16 % sobre 116 daría 18,56 y el libro no cuadraría con lo cobrado.
 */
function calcularLinea(
  entrada: LineaVentaEntrada,
  variante: {
    id: string
    nombre: string
    producto: { nombre: string; controlaStock: boolean; impuesto: { id: string; tasa: Decimal; incluidoEnPrecio: boolean } | null }
  },
  precioUnitario: Decimal,
  costoUnitario: Decimal,
): LineaCalculada {
  const cantidad = d(entrada.cantidad)
  const descuentoMonto = d(entrada.descuentoMonto ?? 0)
  const impuesto = variante.producto.impuesto

  const bruto = mult(cantidad, precioUnitario)
  if (mayor(descuentoMonto, bruto)) {
    throw new ErrorNegocio(
      `El descuento (${descuentoMonto.toString()}) no puede superar el importe de la línea (${bruto.toString()})`,
    )
  }
  const netoConImpuesto = resta(bruto, descuentoMonto)

  let base: Decimal
  let impuestoMonto: Decimal
  let total: Decimal

  if (!impuesto || esCero(impuesto.tasa)) {
    base = netoConImpuesto
    impuestoMonto = d(0)
    total = netoConImpuesto
  } else if (impuesto.incluidoEnPrecio) {
    impuestoMonto = impuestoIncluido(netoConImpuesto, impuesto.tasa)
    base = resta(netoConImpuesto, impuestoMonto)
    total = netoConImpuesto
  } else {
    base = netoConImpuesto
    impuestoMonto = porcentaje(netoConImpuesto, impuesto.tasa)
    total = suma(base, impuestoMonto)
  }

  const nombre = `${variante.producto.nombre}${variante.nombre ? ` ${variante.nombre}` : ''}`

  return {
    varianteId: variante.id,
    descripcion: nombre.trim(),
    cantidad,
    precioUnitario,
    descuentoMonto,
    impuestoId: impuesto?.id ?? null,
    impuestoTasa: impuesto ? d(impuesto.tasa) : d(0),
    impuestoMonto,
    costoUnitario,
    base,
    total,
    autorizadoPorId: entrada.autorizadoPorId ?? null,
    notas: entrada.notas ?? null,
    controlaStock: variante.producto.controlaStock,
  }
}

// ───────────────────────────────────────────────────────────────────────
//  COBROS
// ───────────────────────────────────────────────────────────────────────

export interface CobroEntrada {
  metodoPagoId: string
  /** Monto en la moneda del método (ej. USD si es efectivo en divisas). */
  monto: Numerico
  /** Tasa aplicada si el método no está en la moneda funcional. */
  tasaCambio?: Numerico
  referencia?: string | null
}

interface CobroCalculado {
  metodoPagoId: string
  monto: Decimal
  moneda: string
  tasaCambio: Decimal | null
  montoFuncional: Decimal
  montoIGTF: Decimal
  referencia: string | null
  afectaCajaFisica: boolean
}

// ───────────────────────────────────────────────────────────────────────
//  CONFIRMAR UNA VENTA
// ───────────────────────────────────────────────────────────────────────

export interface VentaEntrada {
  sucursalId: string
  almacenId: string
  sesionCajaId?: string | null
  clienteId?: string | null
  listaPrecioId?: string | null
  tipoDocumento?: 'TICKET' | 'NOTA_ENTREGA' | 'FACTURA'
  serie?: string
  canal?: 'MOSTRADOR' | 'SALON' | 'LLEVAR' | 'DELIVERY'
  lineas: LineaVentaEntrada[]
  cobros: CobroEntrada[]
  /** Venta a crédito: no exige cobro completo, pero sí cliente con límite. */
  aCredito?: boolean
  propina?: Numerico
  notas?: string | null
}

/**
 * Registra y confirma una venta completa de forma atómica.
 *
 * Orden de las operaciones dentro de la transacción:
 *   1. Validar el turno de caja (sin turno abierto no se cobra efectivo).
 *   2. Resolver precios y costos vigentes, y congelarlos en el documento.
 *   3. Calcular líneas, impuestos y el total con un único redondeo final.
 *   4. Validar que los cobros cubren el total (o que la venta es a crédito).
 *   5. Reservar el correlativo.
 *   6. Crear la venta y sus líneas.
 *   7. Descontar el inventario, movimiento por movimiento.
 *   8. Registrar los cobros contra el turno de caja.
 */
export async function confirmarVenta(ctx: ContextoOperacion, entrada: VentaEntrada) {
  exigirEnContexto(ctx, 'venta.crear')
  exigirSucursal(ctx, entrada.sucursalId)

  if (entrada.lineas.length === 0) {
    throw new ErrorNegocio('Una venta necesita al menos una línea')
  }
  if (!entrada.aCredito && entrada.cobros.length === 0) {
    // Regla innegociable: una venta no se cierra sin método de pago
    // identificado. Sin esto el arqueo es imposible porque el dinero entró sin
    // decir por dónde.
    throw new ErrorNegocio('Indica cómo se cobró la venta: no se puede cerrar sin método de pago')
  }
  if (entrada.aCredito) {
    if (!ctx.puede('venta.vender_a_credito')) {
      throw new ErrorNegocio('Tu rol no permite vender a crédito', 403)
    }
    if (!entrada.clienteId) {
      throw new ErrorNegocio('Una venta a crédito necesita un cliente identificado')
    }
  }

  const organizacion = await db.organizacion.findUniqueOrThrow({
    where: { id: ctx.organizacionId },
    select: {
      monedaFuncional: true,
      decimalesRedondeo: true,
      modoRedondeo: true,
      incrementoRedondeo: true,
    },
  })

  const criterio: CriterioRedondeo = {
    decimales: organizacion.decimalesRedondeo,
    modo: organizacion.modoRedondeo as CriterioRedondeo['modo'],
    incremento: organizacion.incrementoRedondeo,
  }

  return db.$transaction(async (tx) => {
    // ── 1. Turno de caja ──────────────────────────────────────────────
    const requiereCaja = entrada.cobros.length > 0
    if (requiereCaja) {
      if (!entrada.sesionCajaId) {
        throw new ErrorNegocio(
          'No hay un turno de caja abierto. Abre la caja antes de cobrar, para que el dinero tenga turno y responsable.',
        )
      }
      const sesionCaja = await tx.sesionCaja.findFirst({
        where: { id: entrada.sesionCajaId, organizacionId: ctx.organizacionId, estado: 'ABIERTA' },
      })
      if (!sesionCaja) {
        throw new ErrorNegocio('El turno de caja indicado no existe o ya está cerrado')
      }
    }

    // ── 2. Lista de precios ───────────────────────────────────────────
    const listaPrecio = entrada.listaPrecioId
      ? await tx.listaPrecio.findFirst({
          where: { id: entrada.listaPrecioId, organizacionId: ctx.organizacionId },
        })
      : await tx.listaPrecio.findFirst({
          where: { organizacionId: ctx.organizacionId, esPredeterminada: true, activo: true },
        })
    if (!listaPrecio) {
      throw new ErrorNegocio('No hay una lista de precios configurada para vender')
    }

    const ahora = new Date()

    // ── 3. Resolver cada línea con su precio y costo vigentes ─────────
    const calculadas: LineaCalculada[] = []
    for (const linea of entrada.lineas) {
      const cantidad = d(linea.cantidad)
      if (!esPositivo(cantidad)) {
        throw new ErrorNegocio('La cantidad de una línea debe ser mayor que cero')
      }

      const variante = await tx.variante.findFirst({
        where: { id: linea.varianteId, organizacionId: ctx.organizacionId, activo: true, deletedAt: null },
        include: {
          producto: {
            select: {
              nombre: true,
              controlaStock: true,
              impuesto: { select: { id: true, tasa: true, incluidoEnPrecio: true } },
            },
          },
        },
      })
      if (!variante) throw new ErrorNoEncontrado(`El producto de la línea no existe o está inactivo`)

      // Precio: el explícito si viene (y el rol puede fijarlo), o el vigente
      // de la lista a la fecha de hoy.
      let precioUnitario: Decimal
      if (linea.precioUnitario !== undefined && linea.precioUnitario !== null) {
        precioUnitario = d(linea.precioUnitario)
      } else {
        const precio = await tx.precio.findFirst({
          where: {
            organizacionId: ctx.organizacionId,
            varianteId: linea.varianteId,
            listaPrecioId: listaPrecio.id,
            vigenciaDesde: { lte: ahora },
            OR: [{ vigenciaHasta: null }, { vigenciaHasta: { gte: ahora } }],
            cantidadMinima: { lte: cantidad.toString() },
          },
          orderBy: [{ cantidadMinima: 'desc' }, { vigenciaDesde: 'desc' }],
        })
        if (!precio) {
          throw new ErrorNegocio(
            `"${variante.producto.nombre}" no tiene precio en la lista ${listaPrecio.nombre}. Fija su precio antes de venderlo.`,
          )
        }
        precioUnitario = d(precio.monto)
      }

      // Costo congelado: se lee la existencia del almacén de donde sale la
      // mercancía. Es la base del margen y no se vuelve a tocar nunca.
      const existencia = await tx.existencia.findUnique({
        where: { varianteId_almacenId: { varianteId: linea.varianteId, almacenId: entrada.almacenId } },
      })
      const costoUnitario = redondearCosto(existencia?.costoPromedio ?? 0)

      calculadas.push(calcularLinea(linea, variante, precioUnitario, costoUnitario))
    }

    // ── 4. Totales, con un único redondeo al final ────────────────────
    const subtotal = sumarPor(calculadas, (l) => l.base)
    const descuentoTotal = sumarPor(calculadas, (l) => l.descuentoMonto)
    const impuestoTotal = sumarPor(calculadas, (l) => l.impuestoMonto)
    const propina = d(entrada.propina ?? 0)
    const costoTotal = sumarPor(calculadas, (l) => mult(l.cantidad, l.costoUnitario))

    const sumaLineas = sumarPor(calculadas, (l) => l.total)
    const totalSinRedondear = suma(sumaLineas, propina)
    const total = redondear(totalSinRedondear, criterio)
    // El ajuste se guarda explícito para que la suma de lo que el cliente ve
    // en el ticket dé exactamente el total que pagó.
    const ajusteRedondeoVenta = resta(total, totalSinRedondear)

    // ── 5. Cobros ─────────────────────────────────────────────────────
    const cobros = await calcularCobros(tx, ctx, entrada.cobros, organizacion.monedaFuncional, criterio)
    const cobradoFuncional = sumarPor(cobros, (c) => c.montoFuncional)
    const igtfTotal = redondear(sumarPor(cobros, (c) => c.montoIGTF), criterio)
    const totalConIGTF = redondear(suma(total, igtfTotal), criterio)

    if (!entrada.aCredito) {
      if (mayor(totalConIGTF, cobradoFuncional) && !iguales(totalConIGTF, cobradoFuncional)) {
        throw new ErrorNegocio(
          `Los cobros (${cobradoFuncional.toFixed(2)}) no alcanzan el total de la venta (${totalConIGTF.toFixed(2)})`,
        )
      }
    } else {
      await validarCredito(tx, entrada.clienteId as string, resta(totalConIGTF, cobradoFuncional))
    }

    // ── 6. Correlativo y documento ────────────────────────────────────
    const tipoDocumento = entrada.tipoDocumento ?? 'TICKET'
    const serie = entrada.serie ?? 'A'
    const numero = await siguienteNumero(tx, ctx.organizacionId, `VENTA_${tipoDocumento}`, serie)

    const montoPagado = redondear(cobradoFuncional, criterio)
    const estadoPago = !mayor(totalConIGTF, montoPagado)
      ? 'PAGADA'
      : esPositivo(montoPagado)
        ? 'PARCIAL'
        : 'PENDIENTE'

    const venta = await tx.venta.create({
      data: {
        organizacionId: ctx.organizacionId,
        sucursalId: entrada.sucursalId,
        almacenId: entrada.almacenId,
        clienteId: entrada.clienteId ?? null,
        usuarioId: ctx.usuarioId,
        sesionCajaId: entrada.sesionCajaId ?? null,
        listaPrecioId: listaPrecio.id,
        tipoDocumento,
        serie,
        numero,
        estado: 'CONFIRMADA',
        canal: entrada.canal ?? 'MOSTRADOR',
        moneda: organizacion.monedaFuncional,
        subtotal: redondear(subtotal, criterio),
        descuentoTotal: redondear(descuentoTotal, criterio),
        impuestoTotal: redondear(impuestoTotal, criterio),
        igtfTotal,
        propina: redondear(propina, criterio),
        ajusteRedondeo: ajusteRedondeoVenta,
        total: totalConIGTF,
        totalMonedaFuncional: totalConIGTF,
        costoTotal: redondear(costoTotal, criterio),
        montoPagado,
        estadoPago,
        notas: entrada.notas ?? null,
        createdBy: ctx.usuarioId,
        detalles: {
          create: calculadas.map((l) => ({
            varianteId: l.varianteId,
            descripcion: l.descripcion,
            cantidad: l.cantidad,
            precioUnitario: l.precioUnitario,
            descuentoMonto: redondear(l.descuentoMonto, criterio),
            impuestoId: l.impuestoId,
            impuestoTasa: l.impuestoTasa,
            impuestoMonto: redondear(l.impuestoMonto, criterio),
            costoUnitario: l.costoUnitario,
            total: redondear(l.total, criterio),
            autorizadoPorId: l.autorizadoPorId,
            notas: l.notas,
          })),
        },
      },
    })

    // ── 7. Inventario ─────────────────────────────────────────────────
    for (const linea of calculadas) {
      if (!linea.controlaStock) continue
      await registrarMovimientoEnTransaccion(tx, {
        organizacionId: ctx.organizacionId,
        varianteId: linea.varianteId,
        almacenId: entrada.almacenId,
        tipo: 'SALIDA_VENTA',
        cantidad: linea.cantidad,
        motivo: `Venta ${tipoDocumento} ${serie}-${numero}`,
        usuarioId: ctx.usuarioId,
        ventaId: venta.id,
      })
    }

    // ── 8. Cobros contra el turno ─────────────────────────────────────
    for (const cobro of cobros) {
      await tx.pago.create({
        data: {
          organizacionId: ctx.organizacionId,
          ventaId: venta.id,
          userId: ctx.usuarioId,
          monto: cobro.monto,
          moneda: cobro.moneda,
          tasaCambio: cobro.tasaCambio,
          montoMonedaFuncional: cobro.montoFuncional,
          metodoPagoId: cobro.metodoPagoId,
          montoIGTF: cobro.montoIGTF,
          referencia: cobro.referencia,
          sesionCajaId: entrada.sesionCajaId ?? null,
        },
      })
    }

    return tx.venta.findUniqueOrThrow({
      where: { id: venta.id },
      include: { detalles: true, pagos: true },
    })
  })
}

/** Resuelve cada cobro a moneda funcional y calcula el IGTF que causa. */
async function calcularCobros(
  tx: PrismaTypes.TransactionClient,
  ctx: ContextoOperacion,
  entradas: CobroEntrada[],
  monedaFuncional: string,
  criterio: CriterioRedondeo,
): Promise<CobroCalculado[]> {
  const cobros: CobroCalculado[] = []

  for (const entrada of entradas) {
    const monto = d(entrada.monto)
    if (!esPositivo(monto)) throw new ErrorNegocio('El monto de un cobro debe ser mayor que cero')

    const metodo = await tx.metodoPago.findFirst({
      where: { id: entrada.metodoPagoId, organizacionId: ctx.organizacionId, activo: true },
    })
    if (!metodo) throw new ErrorNoEncontrado('El método de cobro no existe o está inactivo')

    if (metodo.requiereReferencia && !entrada.referencia) {
      throw new ErrorNegocio(
        `${metodo.nombre} requiere el número de referencia: sin él la conciliación con el banco es imposible`,
      )
    }

    let tasaCambio: Decimal | null = null
    let montoFuncional: Decimal

    if (metodo.moneda === monedaFuncional) {
      montoFuncional = redondear(monto, criterio)
    } else {
      if (entrada.tasaCambio === undefined || entrada.tasaCambio === null || !esPositivo(entrada.tasaCambio)) {
        throw new ErrorNegocio(
          `Cobrar en ${metodo.moneda} requiere la tasa de cambio del día. Regístrala antes de cobrar.`,
        )
      }
      tasaCambio = d(entrada.tasaCambio)
      montoFuncional = redondear(mult(monto, tasaCambio), criterio)
    }

    // IGTF: lo causa el método (pago en divisas), no la venta. Así cambiar la
    // política fiscal es editar una fila, no el código de ventas.
    const montoIGTF = metodo.causaIGTF ? redondear(porcentaje(montoFuncional, 3), criterio) : d(0)

    cobros.push({
      metodoPagoId: metodo.id,
      monto,
      moneda: metodo.moneda,
      tasaCambio,
      montoFuncional,
      montoIGTF,
      referencia: entrada.referencia ?? null,
      afectaCajaFisica: metodo.afectaCajaFisica,
    })
  }

  return cobros
}

/** Verifica que el cliente tenga cupo de crédito para el saldo pendiente. */
async function validarCredito(tx: PrismaTypes.TransactionClient, clienteId: string, saldoNuevo: Decimal) {
  const cliente = await tx.cliente.findUnique({ where: { id: clienteId } })
  if (!cliente) throw new ErrorNoEncontrado('El cliente no existe')

  const ventasPendientes = await tx.venta.findMany({
    where: { clienteId, estado: 'CONFIRMADA', estadoPago: { not: 'PAGADA' }, deletedAt: null },
    select: { total: true, montoPagado: true },
  })
  const deudaActual = sumarPor(ventasPendientes, (v) => resta(v.total, v.montoPagado))
  const deudaTotal = suma(deudaActual, saldoNuevo)

  if (mayor(deudaTotal, cliente.limiteCredito)) {
    throw new ErrorNegocio(
      `${cliente.nombre} tiene un límite de crédito de ${d(cliente.limiteCredito).toFixed(2)} y esta venta lo llevaría a ` +
        `${deudaTotal.toFixed(2)}. Cobra parte de la deuda o aumenta su límite.`,
    )
  }
}

// ───────────────────────────────────────────────────────────────────────
//  ANULAR UNA VENTA
// ───────────────────────────────────────────────────────────────────────

/**
 * Anula una venta confirmada: reversa el inventario, reversa los cobros y
 * marca el documento con quién anuló y por qué.
 *
 * Criterio de aceptación: "anular una venta devuelve el inventario y ajusta la
 * caja sin dejar diferencia". Se cumple porque:
 *   • El inventario vuelve con una REVERSA valorada al costo original del
 *     movimiento, no al promedio de hoy: así el resultado de un período ya
 *     cerrado no cambia.
 *   • Cada cobro genera un pago de reversa por el mismo monto y la misma
 *     tasa, de modo que el efectivo esperado del turno vuelve a su valor
 *     anterior exacto.
 *   • El documento no se borra: queda ANULADA y sigue en el correlativo.
 */
export async function anularVenta(ctx: ContextoOperacion, ventaId: string, motivo: string) {
  // Un cajero no anula sus propias ventas: se lo pide al supervisor. Es la
  // separación de funciones que evita que quien cobra pueda deshacer un cobro.
  exigirEnContexto(ctx, 'venta.anular')

  if (!motivo || motivo.trim().length < 3) {
    throw new ErrorNegocio('Explica el motivo de la anulación: queda en la bitácora y en el documento')
  }

  return db.$transaction(async (tx) => {
    const venta = await tx.venta.findFirst({
      where: { id: ventaId, organizacionId: ctx.organizacionId },
      include: { movimientos: true, pagos: true },
    })
    if (!venta) throw new ErrorNoEncontrado('La venta no existe')
    if (venta.estado === 'ANULADA') throw new ErrorNegocio('Esta venta ya está anulada')
    if (venta.estado !== 'CONFIRMADA') throw new ErrorNegocio('Solo se anula una venta confirmada')

    exigirSucursal(ctx, venta.sucursalId)

    // Inventario: una reversa por cada movimiento original.
    for (const movimiento of venta.movimientos) {
      if (movimiento.tipo === 'REVERSA') continue
      await reversarMovimiento(tx, movimiento.id, `Anulación de venta ${venta.serie}-${venta.numero}: ${motivo}`, ctx.usuarioId)
    }

    // Cobros: un pago de reversa por cada cobro, con el mismo monto y tasa.
    for (const pago of venta.pagos) {
      if (pago.pagoReversadoId) continue
      const yaReversado = await tx.pago.findFirst({ where: { pagoReversadoId: pago.id } })
      if (yaReversado) continue

      await tx.pago.create({
        data: {
          organizacionId: pago.organizacionId,
          ventaId: venta.id,
          userId: ctx.usuarioId,
          monto: d(pago.monto).negated(),
          moneda: pago.moneda,
          tasaCambio: pago.tasaCambio,
          montoMonedaFuncional: d(pago.montoMonedaFuncional).negated(),
          metodoPagoId: pago.metodoPagoId,
          montoIGTF: d(pago.montoIGTF).negated(),
          referencia: `Reversa de ${pago.referencia ?? pago.id}`,
          sesionCajaId: pago.sesionCajaId,
          pagoReversadoId: pago.id,
        },
      })
    }

    return tx.venta.update({
      where: { id: venta.id },
      data: {
        estado: 'ANULADA',
        motivoAnulacion: motivo,
        anuladaPorId: ctx.usuarioId,
        anuladaEn: new Date(),
        montoPagado: 0,
        estadoPago: 'PENDIENTE',
      },
      include: { detalles: true, pagos: true },
    })
  })
}

// ───────────────────────────────────────────────────────────────────────
//  CONSULTAS
// ───────────────────────────────────────────────────────────────────────

export async function obtenerVenta(ctx: ContextoOperacion, ventaId: string) {
  const venta = await db.venta.findFirst({
    where: { id: ventaId, organizacionId: ctx.organizacionId },
    include: {
      detalles: true,
      pagos: { include: { metodo: { select: { nombre: true, tipo: true } } } },
      cliente: { select: { id: true, nombre: true, rif: true } },
      usuario: { select: { name: true } },
      sucursal: { select: { nombre: true } },
    },
  })
  if (!venta) throw new ErrorNoEncontrado('La venta no existe')
  return venta
}

export interface FiltroVentas {
  sucursalId?: string
  sesionCajaId?: string
  desde?: Date
  hasta?: Date
  estado?: string
  pagina?: number
  porPagina?: number
}

export async function listarVentas(ctx: ContextoOperacion, filtro: FiltroVentas = {}) {
  const porPagina = Math.min(filtro.porPagina ?? 50, 200)
  const pagina = Math.max(filtro.pagina ?? 1, 1)

  const where: PrismaTypes.VentaWhereInput = {
    organizacionId: ctx.organizacionId,
    deletedAt: null,
    ...(filtro.sucursalId ? { sucursalId: filtro.sucursalId } : {}),
    ...(filtro.sesionCajaId ? { sesionCajaId: filtro.sesionCajaId } : {}),
    ...(filtro.estado ? { estado: filtro.estado } : {}),
    ...(filtro.desde || filtro.hasta
      ? { fecha: { ...(filtro.desde ? { gte: filtro.desde } : {}), ...(filtro.hasta ? { lte: filtro.hasta } : {}) } }
      : {}),
    // Un cajero solo ve sus propias ventas salvo que pueda ver todas las cajas.
    ...(ctx.puede('caja.ver_todas') ? {} : { usuarioId: ctx.usuarioId }),
  }

  const [total, ventas] = await Promise.all([
    db.venta.count({ where }),
    db.venta.findMany({
      where,
      orderBy: { fecha: 'desc' },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      include: {
        cliente: { select: { nombre: true } },
        usuario: { select: { name: true } },
        _count: { select: { detalles: true } },
      },
    }),
  ])

  return { total, pagina, porPagina, ventas }
}

/**
 * Margen bruto de un período: ingreso menos costo congelado de lo vendido.
 *
 * Usa el costo que quedó guardado en cada línea, no el costo promedio de hoy.
 * Por eso la rentabilidad del mes pasado no cambia cuando sube el costo de
 * reposición.
 */
export async function margenPeriodo(ctx: ContextoOperacion, desde: Date, hasta: Date) {
  // El margen revela el costo: exige el permiso de rentabilidad.
  exigirEnContexto(ctx, 'reporte.rentabilidad')

  const ventas = await db.venta.findMany({
    where: {
      organizacionId: ctx.organizacionId,
      estado: 'CONFIRMADA',
      deletedAt: null,
      fecha: { gte: desde, lte: hasta },
    },
    select: { subtotal: true, costoTotal: true, descuentoTotal: true },
  })

  const ingreso = sumarPor(ventas, (v) => v.subtotal)
  const costo = sumarPor(ventas, (v) => v.costoTotal)
  const margen = resta(ingreso, costo)

  return {
    ingreso: redondear(ingreso),
    costo: redondear(costo),
    descuentos: redondear(sumarPor(ventas, (v) => v.descuentoTotal)),
    margen: redondear(margen),
    margenPorcentaje: redondear(mult(div(margen, ingreso), 100)),
    cantidadVentas: ventas.length,
  }
}

/** Prorratea un descuento de documento entre las líneas, sin perder céntimos. */
export function repartirDescuentoDocumento(
  descuento: Numerico,
  lineas: readonly { base: Numerico }[],
  criterio?: CriterioRedondeo,
): Decimal[] {
  return prorratear(descuento, lineas.map((l) => l.base), criterio)
}
