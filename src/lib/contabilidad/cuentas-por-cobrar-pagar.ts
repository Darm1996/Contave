// Cuentas por Cobrar (facturas de VENTA) y Cuentas por Pagar (facturas de
// COMPRA): antigüedad de saldos y registro de pagos/cobros.
//
// Las facturas mantienen un saldo agregado (montoPagado/estadoPago); el
// detalle de cada abono vive en el modelo Pago. Las cuentas de control
// CXC_CLIENTES / CXP_PROVEEDORES del plan de cuentas no se tocan por factura
// individual (eso ya lo hace generarAsientoCompra/Venta al contabilizar) —
// este módulo es el subledger y genera el asiento de cobro/pago contra Bancos/Caja.

import { db } from '@/lib/db'
import { buscarCuentaPorUso, persistirAsiento, type LineaAsientoInput } from './asientos-engine'
import { d, suma, resta, mult, div, redondear, esPositivo, mayor, menor, type Numerico, type Decimal } from '@/lib/nucleo/dinero'

// Monto en Bs. que la factura genera como partida abierta (lo que se le debe
// al proveedor o lo que nos debe el cliente), replicando el monto que
// generarAsientoCompra/Venta postea a la cuenta de control.
export function montoDeuda(factura: {
  tipo: string
  total: Numerico
  totalAPagar: Numerico
  totalMonedaFuncional: Numerico
  montoIGTF: Numerico | null
}): Decimal {
  const mf = (n: Numerico): Decimal =>
    esPositivo(factura.total) && esPositivo(factura.totalMonedaFuncional)
      ? div(mult(n, factura.totalMonedaFuncional), factura.total)
      : d(n)
  if (factura.tipo === 'VENTA') return redondear(mf(factura.total))
  const igtfMF = factura.montoIGTF ? mf(factura.montoIGTF) : d(0)
  return redondear(suma(mf(factura.totalAPagar), igtfMF))
}

export interface PartidaAbierta {
  id: string
  tipo: string
  nombreContraparte: string
  rifContraparte: string
  numeroFactura: string | null
  ncf: string | null
  fechaEmision: Date
  fechaVencimiento: Date
  deuda: Decimal
  montoPagado: Decimal
  saldo: Decimal
  estadoPago: string
  diasVencido: number
}

async function listarPartidas(empresaId: string, tipo: 'VENTA' | 'COMPRA'): Promise<PartidaAbierta[]> {
  const empresa = await db.empresa.findUnique({ where: { id: empresaId } })
  if (!empresa) throw new Error('Empresa no encontrada')
  const diasCredito = tipo === 'VENTA' ? empresa.diasCreditoClientes : empresa.diasCreditoProveedores

  const facturas = await db.factura.findMany({
    where: { empresaId, tipo, estado: 'CONTABILIZADA', estadoPago: { not: 'PAGADA' } },
    orderBy: { fechaEmision: 'asc' },
  })

  const hoy = new Date()
  return facturas.map((f) => {
    const deuda = montoDeuda(f)
    const saldo = redondear(resta(deuda, f.montoPagado))
    const fechaVencimiento = new Date(f.fechaEmision)
    fechaVencimiento.setDate(fechaVencimiento.getDate() + diasCredito)
    const diasVencido = Math.floor((hoy.getTime() - fechaVencimiento.getTime()) / (1000 * 60 * 60 * 24))
    return {
      id: f.id,
      tipo: f.tipo,
      nombreContraparte: f.nombreContraparte,
      rifContraparte: f.rifContraparte,
      numeroFactura: f.numeroFactura,
      ncf: f.ncf,
      fechaEmision: f.fechaEmision,
      fechaVencimiento,
      deuda,
      montoPagado: f.montoPagado,
      saldo,
      estadoPago: f.estadoPago,
      diasVencido,
    }
  }).filter((p) => mayor(p.saldo, '0.01'))
}

export function listarCxC(empresaId: string) {
  return listarPartidas(empresaId, 'VENTA')
}

export function listarCxP(empresaId: string) {
  return listarPartidas(empresaId, 'COMPRA')
}

export interface AntiguedadSaldos {
  corriente: Decimal // no vencido
  d1_30: Decimal
  d31_60: Decimal
  d61_90: Decimal
  d90mas: Decimal
  total: Decimal
}

export function calcularAntiguedad(partidas: PartidaAbierta[]): AntiguedadSaldos {
  // Se acumula con precisión completa y se redondea una sola vez al cerrar
  // cada tramo. Redondear en cada suma haría que los tramos no sumen el
  // total, y una antigüedad de saldos que no cuadra con el total es
  // inservible para cobrar.
  let corriente = d(0)
  let d1_30 = d(0)
  let d31_60 = d(0)
  let d61_90 = d(0)
  let d90mas = d(0)
  let total = d(0)

  for (const p of partidas) {
    total = suma(total, p.saldo)
    if (p.diasVencido <= 0) corriente = suma(corriente, p.saldo)
    else if (p.diasVencido <= 30) d1_30 = suma(d1_30, p.saldo)
    else if (p.diasVencido <= 60) d31_60 = suma(d31_60, p.saldo)
    else if (p.diasVencido <= 90) d61_90 = suma(d61_90, p.saldo)
    else d90mas = suma(d90mas, p.saldo)
  }

  return {
    corriente: redondear(corriente),
    d1_30: redondear(d1_30),
    d31_60: redondear(d31_60),
    d61_90: redondear(d61_90),
    d90mas: redondear(d90mas),
    total: redondear(total),
  }
}

export interface RegistrarPagoInput {
  facturaId: string
  monto: Numerico
  fecha?: Date
  metodoPago: string
  referencia?: string
  cuentaId?: string // cuenta de banco/caja; requerida si generarAsiento = true
  generarAsiento?: boolean
  userId: string
}

export async function registrarPago(empresaId: string, input: RegistrarPagoInput) {
  if (!esPositivo(input.monto)) throw new Error('El monto del pago debe ser mayor a cero')

  const factura = await db.factura.findUnique({ where: { id: input.facturaId } })
  if (!factura || factura.empresaId !== empresaId) throw new Error('Factura no encontrada')
  if (!['VENTA', 'COMPRA'].includes(factura.tipo)) {
    throw new Error('Solo se registran pagos sobre facturas de venta (CxC) o compra (CxP)')
  }
  if (factura.estado !== 'CONTABILIZADA') {
    throw new Error('La factura debe estar contabilizada antes de registrar pagos')
  }

  const deuda = montoDeuda(factura)
  const saldo = redondear(resta(deuda, factura.montoPagado))
  if (mayor(input.monto, suma(saldo, '0.01'))) {
    throw new Error(`El monto excede el saldo pendiente (Bs. ${saldo.toFixed(2)})`)
  }

  let asientoId: string | null = null
  if (input.generarAsiento) {
    if (!input.cuentaId) throw new Error('Debe indicar la cuenta de banco/caja para generar el asiento')
    const cuentaBanco = await db.cuenta.findUnique({ where: { id: input.cuentaId } })
    if (!cuentaBanco || cuentaBanco.empresaId !== empresaId) throw new Error('Cuenta bancaria no válida')

    const lineas: LineaAsientoInput[] = []
    if (factura.tipo === 'VENTA') {
      const ctaCxc = await buscarCuentaPorUso(empresaId, 'CXC_CLIENTES')
      lineas.push({ cuentaId: cuentaBanco.id, debit: input.monto, descripcion: `Cobro fact. ${factura.numeroFactura || factura.ncf || ''}` })
      lineas.push({ cuentaId: ctaCxc.id, credit: input.monto, descripcion: 'Abono CxC cliente' })
    } else {
      const ctaCxp = await buscarCuentaPorUso(empresaId, 'CXP_PROVEEDORES')
      lineas.push({ cuentaId: ctaCxp.id, debit: input.monto, descripcion: 'Abono CxP proveedor' })
      lineas.push({ cuentaId: cuentaBanco.id, credit: input.monto, descripcion: `Pago fact. ${factura.numeroFactura || factura.ncf || ''}` })
    }

    const asiento = await persistirAsiento(
      empresaId,
      input.userId,
      null,
      factura.tipo === 'VENTA' ? 'COBRO_CXC' : 'PAGO_CXP',
      input.fecha || new Date(),
      `${factura.tipo === 'VENTA' ? 'Cobro' : 'Pago'} - ${factura.nombreContraparte}`,
      factura.numeroFactura || factura.ncf || null,
      'cxc-cxp',
      lineas,
    )
    asientoId = asiento.id
  }

  const pago = await db.pago.create({
    data: {
      empresaId,
      facturaId: factura.id,
      userId: input.userId,
      monto: d(input.monto).toString(),
      fecha: input.fecha || new Date(),
      metodoPago: input.metodoPago,
      referencia: input.referencia,
      cuentaId: input.cuentaId,
      asientoId,
    },
  })

  const nuevoMontoPagado = redondear(suma(factura.montoPagado, input.monto))
  const nuevoEstado = !menor(nuevoMontoPagado, resta(deuda, '0.01'))
    ? 'PAGADA'
    : esPositivo(nuevoMontoPagado)
      ? 'PARCIAL'
      : 'PENDIENTE'
  await db.factura.update({
    where: { id: factura.id },
    data: { montoPagado: nuevoMontoPagado.toString(), estadoPago: nuevoEstado },
  })

  return pago
}

export async function historialPagos(empresaId: string, facturaId: string) {
  const factura = await db.factura.findUnique({ where: { id: facturaId } })
  if (!factura || factura.empresaId !== empresaId) throw new Error('Factura no encontrada')
  return db.pago.findMany({ where: { facturaId }, orderBy: { fecha: 'asc' } })
}
