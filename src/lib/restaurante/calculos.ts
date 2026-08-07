// Cálculos puros del módulo Restaurante.
//
// Todo lo que se pueda derivar de los datos ya capturados se calcula aquí y
// no se le pide al usuario: el total del día, el saldo de cada fondo, el
// reparto de propinas, el estado de una nota por pagar y el resumen del mes.
// Son funciones sin base de datos a propósito, para poder probarlas solas.

/** Redondea a 2 decimales evitando el arrastre binario (0.1+0.2). */
export function redondear(n: number, decimales = 2): number {
  if (!Number.isFinite(n)) return 0
  const f = 10 ** decimales
  return Math.round((n + Number.EPSILON) * f) / f
}

/** Convierte bolívares a dólares. Con tasa 0 o inválida devuelve 0 en vez de Infinity. */
export function bsAUsd(montoVES: number, tasa: number): number {
  if (!tasa || tasa <= 0 || !Number.isFinite(tasa)) return 0
  return redondear(montoVES / tasa)
}

/** Convierte dólares a bolívares. */
export function usdABs(montoUSD: number, tasa: number): number {
  if (!tasa || tasa <= 0 || !Number.isFinite(tasa)) return 0
  return redondear(montoUSD * tasa)
}

// ───────────────────────────────────────────────────────────────────────
//  Cierre diario
// ───────────────────────────────────────────────────────────────────────

export interface VentasDelDia {
  ventaZelle: number
  ventaEfectivoUSD: number
  ventaBs: number
  ventaPuntoVenta: number
  tasa: number
}

export interface DesgloseCierre {
  enDolares: number
  enBolivares: number
  bolivaresEnUSD: number
  totalUSD: number
  totalVES: number
}

/**
 * Total del día llevado todo a dólares con la tasa de ese día.
 * Zelle y efectivo $ ya vienen en dólares; las transferencias en bolívares y
 * el punto de venta se convierten con la tasa que se registró en el cierre.
 */
export function calcularTotalDia(v: VentasDelDia): DesgloseCierre {
  const enDolares = redondear((v.ventaZelle || 0) + (v.ventaEfectivoUSD || 0))
  const enBolivares = redondear((v.ventaBs || 0) + (v.ventaPuntoVenta || 0))
  const bolivaresEnUSD = bsAUsd(enBolivares, v.tasa)
  return {
    enDolares,
    enBolivares,
    bolivaresEnUSD,
    totalUSD: redondear(enDolares + bolivaresEnUSD),
    totalVES: redondear(enBolivares + usdABs(enDolares, v.tasa)),
  }
}

/** Ticket promedio del día. Sin ventas registradas devuelve 0. */
export function ticketPromedio(totalUSD: number, numVentas: number): number {
  if (!numVentas || numVentas <= 0) return 0
  return redondear(totalUSD / numVentas)
}

// ───────────────────────────────────────────────────────────────────────
//  Fondos (saldos de cada "caja")
// ───────────────────────────────────────────────────────────────────────

export interface MovimientoSaldo {
  tipo: string // INGRESO | EGRESO
  montoUSD: number
  montoVES: number
}

/**
 * Saldo de un fondo en su propia moneda: los fondos en dólares suman
 * montoUSD y los de bolívares suman montoVES, así el saldo coincide con lo
 * que el dueño ve en su cuenta sin depender de la tasa de hoy.
 */
export function calcularSaldoFondo(
  saldoInicial: number,
  moneda: string,
  movimientos: MovimientoSaldo[],
): number {
  const campo = moneda === 'VES' ? 'montoVES' : 'montoUSD'
  const delta = movimientos.reduce((acc, m) => {
    const monto = (m[campo] as number) || 0
    return acc + (m.tipo === 'EGRESO' ? -monto : monto)
  }, 0)
  return redondear((saldoInicial || 0) + delta)
}

// ───────────────────────────────────────────────────────────────────────
//  Propinas y nómina semanal
// ───────────────────────────────────────────────────────────────────────

export interface ParticipantePropina {
  id: string
  /**
   * Peso en el reparto. 1 = parte completa; 0.5 = media parte (por ejemplo
   * alguien que trabajó media semana). Si no se indica, vale 1.
   */
  peso?: number
}

/**
 * Reparte el pote de propinas entre quienes participan, proporcional al peso
 * de cada uno. El descuadre de centavos del redondeo se le suma al primero
 * de la lista para que la suma de las partes dé exactamente el total.
 */
export function repartirPropinas(
  total: number,
  participantes: ParticipantePropina[],
): Record<string, number> {
  const resultado: Record<string, number> = {}
  if (!participantes.length || !total || total <= 0) {
    participantes.forEach((p) => { resultado[p.id] = 0 })
    return resultado
  }
  const pesoTotal = participantes.reduce((a, p) => a + (p.peso ?? 1), 0)
  if (pesoTotal <= 0) {
    participantes.forEach((p) => { resultado[p.id] = 0 })
    return resultado
  }

  let repartido = 0
  participantes.forEach((p) => {
    const parte = redondear((total * (p.peso ?? 1)) / pesoTotal)
    resultado[p.id] = parte
    repartido = redondear(repartido + parte)
  })
  const diferencia = redondear(total - repartido)
  if (diferencia !== 0) {
    const primero = participantes[0].id
    resultado[primero] = redondear(resultado[primero] + diferencia)
  }
  return resultado
}

export interface LineaNomina {
  base: number
  propina: number
  transporte: number
  delivery: number
  descuento: number
}

/** Neto que se le paga a una persona en la semana. Nunca baja de 0. */
export function calcularNetoLinea(l: Partial<LineaNomina>): number {
  const bruto = (l.base || 0) + (l.propina || 0) + (l.transporte || 0) + (l.delivery || 0)
  return redondear(Math.max(0, bruto - (l.descuento || 0)))
}

export interface TotalesNomina {
  totalBase: number
  totalPropina: number
  totalTransporte: number
  totalDelivery: number
  totalDescuento: number
  totalNeto: number
}

export function calcularTotalesNomina(lineas: Array<Partial<LineaNomina>>): TotalesNomina {
  const t: TotalesNomina = {
    totalBase: 0, totalPropina: 0, totalTransporte: 0,
    totalDelivery: 0, totalDescuento: 0, totalNeto: 0,
  }
  lineas.forEach((l) => {
    t.totalBase += l.base || 0
    t.totalPropina += l.propina || 0
    t.totalTransporte += l.transporte || 0
    t.totalDelivery += l.delivery || 0
    t.totalDescuento += l.descuento || 0
    t.totalNeto += calcularNetoLinea(l)
  })
  return {
    totalBase: redondear(t.totalBase),
    totalPropina: redondear(t.totalPropina),
    totalTransporte: redondear(t.totalTransporte),
    totalDelivery: redondear(t.totalDelivery),
    totalDescuento: redondear(t.totalDescuento),
    totalNeto: redondear(t.totalNeto),
  }
}

// ───────────────────────────────────────────────────────────────────────
//  Cuentas por pagar / por cobrar
// ───────────────────────────────────────────────────────────────────────

export type EstadoDeuda = 'PENDIENTE' | 'ABONADA' | 'PAGADA'

/**
 * Estado de una nota según lo abonado. Se usa una tolerancia de un centavo
 * para que un redondeo no deje notas "casi pagadas" arrastrándose.
 */
export function estadoDeuda(monto: number, pagado: number): EstadoDeuda {
  if (pagado <= 0.005) return 'PENDIENTE'
  if (pagado >= monto - 0.005) return 'PAGADA'
  return 'ABONADA'
}

export function saldoDeuda(monto: number, pagado: number): number {
  return redondear(Math.max(0, (monto || 0) - (pagado || 0)))
}

/** Días transcurridos desde la fecha de la nota (0 si es futura). */
export function diasDeAntiguedad(fecha: Date, hoy: Date = new Date()): number {
  const MS_DIA = 86400000
  const a = Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate())
  const b = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate())
  return Math.max(0, Math.round((b - a) / MS_DIA))
}

export type TramoAntiguedad = '0-7' | '8-15' | '16-30' | '+30'

export function tramoAntiguedad(dias: number): TramoAntiguedad {
  if (dias <= 7) return '0-7'
  if (dias <= 15) return '8-15'
  if (dias <= 30) return '16-30'
  return '+30'
}

export interface DeudaConFecha { fecha: Date; saldo: number }

/** Agrupa saldos por antigüedad para ver de un vistazo qué se está atrasando. */
export function agruparPorAntiguedad(
  deudas: DeudaConFecha[],
  hoy: Date = new Date(),
): Record<TramoAntiguedad, number> {
  const tramos: Record<TramoAntiguedad, number> = { '0-7': 0, '8-15': 0, '16-30': 0, '+30': 0 }
  deudas.forEach((d) => {
    tramos[tramoAntiguedad(diasDeAntiguedad(d.fecha, hoy))] += d.saldo || 0
  })
  ;(Object.keys(tramos) as TramoAntiguedad[]).forEach((k) => { tramos[k] = redondear(tramos[k]) })
  return tramos
}

// ───────────────────────────────────────────────────────────────────────
//  Resumen del mes
// ───────────────────────────────────────────────────────────────────────

export interface ResumenMes {
  ingresos: number
  egresos: number
  utilidad: number
  margen: number
  diasTrabajados: number
  ventasTotales: number
  ticketPromedio: number
  ventaPromedioDia: number
}

export interface CierreResumible { totalUSD: number; numVentas: number }

export function calcularResumenMes(
  cierres: CierreResumible[],
  egresosUSD: number,
): ResumenMes {
  const ingresos = redondear(cierres.reduce((a, c) => a + (c.totalUSD || 0), 0))
  const egresos = redondear(egresosUSD || 0)
  const utilidad = redondear(ingresos - egresos)
  // Un día con total 0 (feriado, no se trabajó) no cuenta como día trabajado
  // ni diluye el promedio de ventas.
  const diasTrabajados = cierres.filter((c) => (c.totalUSD || 0) > 0).length
  const ventasTotales = cierres.reduce((a, c) => a + (c.numVentas || 0), 0)
  return {
    ingresos,
    egresos,
    utilidad,
    margen: ingresos > 0 ? redondear((utilidad / ingresos) * 100, 1) : 0,
    diasTrabajados,
    ventasTotales,
    ticketPromedio: ticketPromedio(ingresos, ventasTotales),
    ventaPromedioDia: diasTrabajados > 0 ? redondear(ingresos / diasTrabajados) : 0,
  }
}

// ───────────────────────────────────────────────────────────────────────
//  Fechas
// ───────────────────────────────────────────────────────────────────────

/** Fecha a medianoche UTC: así un mismo día es la misma clave sin importar la zona horaria. */
export function soloFecha(fecha: Date | string): Date {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export function claveDia(fecha: Date | string): string {
  return soloFecha(fecha).toISOString().slice(0, 10)
}

/** Semana de lunes a domingo que contiene la fecha dada (como la lleva el negocio). */
export function semanaDe(fecha: Date | string): { inicio: Date; fin: Date } {
  const d = soloFecha(fecha)
  const diaSemana = d.getUTCDay() // 0 = domingo
  const desplazamiento = diaSemana === 0 ? 6 : diaSemana - 1
  const inicio = new Date(d)
  inicio.setUTCDate(d.getUTCDate() - desplazamiento)
  const fin = new Date(inicio)
  fin.setUTCDate(inicio.getUTCDate() + 6)
  return { inicio, fin }
}

/** Primer y último instante de un mes (rango listo para consultar por fecha). */
export function rangoMes(ano: number, mes: number): { desde: Date; hasta: Date } {
  return {
    desde: new Date(Date.UTC(ano, mes - 1, 1)),
    hasta: new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999)),
  }
}

// ───────────────────────────────────────────────────────────────────────
//  Formato
// ───────────────────────────────────────────────────────────────────────

export function formatoUSD(n: number): string {
  return `$${(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatoBs(n: number): string {
  return `Bs ${(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatoFechaCorta(fecha: Date | string): string {
  const d = soloFecha(fecha)
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', timeZone: 'UTC' })
}
