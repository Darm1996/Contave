// Estados Financieros según VEN-NIF Pymes
// Balance General (Estado de Situación Financiera)
// Estado de Resultados (Estado de Resultado Integral)

import { db } from '@/lib/db'

export interface CuentaSaldo {
  codigo: string
  nombre: string
  tipo: string
  naturaleza: string
  nivel: number
  saldo: number
}

export interface BalanceGeneral {
  // ACTIVO
  activoCorriente: CuentaSaldo[]
  activoNoCorriente: CuentaSaldo[]
  totalActivoCorriente: number
  totalActivoNoCorriente: number
  totalActivo: number
  // PASIVO
  pasivoCorriente: CuentaSaldo[]
  pasivoNoCorriente: CuentaSaldo[]
  totalPasivoCorriente: number
  totalPasivoNoCorriente: number
  totalPasivo: number
  // PATRIMONIO
  patrimonio: CuentaSaldo[]
  totalPatrimonio: number
  // Resultado del ejercicio (utilidad/pérdida)
  resultadoEjercicio: number
  // Verificación: Activo = Pasivo + Patrimonio
  cuadra: boolean
  diferencia: number
}

export interface EstadoResultado {
  // Ingresos operacionales
  ingresosOperacionales: CuentaSaldo[]
  totalIngresosOperacionales: number
  // Costo de ventas
  costoVentas: CuentaSaldo[]
  totalCostoVentas: number
  // Utilidad bruta
  utilidadBruta: number
  // Gastos operacionales
  gastosOperacionales: CuentaSaldo[]
  totalGastosOperacionales: number
  // Utilidad operacional
  utilidadOperacional: number
  // Ingresos no operacionales
  ingresosNoOperacionales: CuentaSaldo[]
  totalIngresosNoOperacionales: number
  // Gastos no operacionales
  gastosNoOperacionales: CuentaSaldo[]
  totalGastosNoOperacionales: number
  // Utilidad antes de ISLR
  utilidadAntesISLR: number
  // ISLR estimado (34% para jurídicas)
  islrEstimado: number
  // Utilidad neta del ejercicio
  utilidadNeta: number
}

// Obtener saldos de todas las cuentas imputables en un período
// Una sola consulta agregada (groupBy) en vez de un findMany por cuenta.
async function obtenerSaldosCuentas(empresaId: string, desde: Date, hasta: Date): Promise<CuentaSaldo[]> {
  const cuentas = await db.cuenta.findMany({
    where: { empresaId, imputable: true },
    orderBy: { codigo: 'asc' },
  })
  if (cuentas.length === 0) return []

  const sumas = await db.asientoLinea.groupBy({
    by: ['cuentaId'],
    where: {
      cuentaId: { in: cuentas.map((c) => c.id) },
      asiento: { empresaId, fecha: { gte: desde, lte: hasta } },
    },
    _sum: { debit: true, credit: true },
  })
  const sumaPorCuenta = new Map(sumas.map((s) => [s.cuentaId, s._sum]))

  const resultado: CuentaSaldo[] = []
  for (const cuenta of cuentas) {
    const suma = sumaPorCuenta.get(cuenta.id)
    if (!suma) continue
    const totalDebit = suma.debit || 0
    const totalCredit = suma.credit || 0
    const saldo = cuenta.naturaleza === 'DEUDORA' ? totalDebit - totalCredit : totalCredit - totalDebit
    if (Math.abs(saldo) > 0.001) {
      resultado.push({
        codigo: cuenta.codigo,
        nombre: cuenta.nombre,
        tipo: cuenta.tipo,
        naturaleza: cuenta.naturaleza,
        nivel: cuenta.nivel,
        saldo,
      })
    }
  }
  return resultado
}

export async function generarBalanceGeneral(
  empresaId: string,
  hasta: Date,
  desde?: Date,
): Promise<BalanceGeneral> {
  const fechaInicio = desde || new Date(hasta.getFullYear(), 0, 1) // 1 de enero del año
  const saldos = await obtenerSaldosCuentas(empresaId, fechaInicio, hasta)

  // Clasificar por tipo y código
  const activoCorriente = saldos.filter((s) => s.codigo.startsWith('1.1') && !s.codigo.startsWith('1.2'))
  const activoNoCorriente = saldos.filter((s) => s.codigo.startsWith('1.2'))
  const pasivoCorriente = saldos.filter((s) => s.codigo.startsWith('2.1'))
  const pasivoNoCorriente = saldos.filter((s) => s.codigo.startsWith('2.2'))
  const patrimonio = saldos.filter((s) => s.codigo.startsWith('3.'))

  const totalActivoCorriente = activoCorriente.reduce((s, c) => s + c.saldo, 0)
  const totalActivoNoCorriente = activoNoCorriente.reduce((s, c) => s + c.saldo, 0)
  const totalPasivoCorriente = pasivoCorriente.reduce((s, c) => s + c.saldo, 0)
  const totalPasivoNoCorriente = pasivoNoCorriente.reduce((s, c) => s + c.saldo, 0)
  const totalPatrimonio = patrimonio.reduce((s, c) => s + c.saldo, 0)

  const totalActivo = totalActivoCorriente + totalActivoNoCorriente
  const totalPasivo = totalPasivoCorriente + totalPasivoNoCorriente

  // Calcular resultado del ejercicio (Ingresos - Costos - Gastos)
  // Si es positivo (utilidad), aumenta el patrimonio; si es negativo (pérdida), lo reduce
  const ingresos = saldos.filter((s) => s.tipo === 'INGRESO').reduce((s, c) => s + c.saldo, 0)
  const costos = saldos.filter((s) => s.tipo === 'COSTO').reduce((s, c) => s + c.saldo, 0)
  const gastos = saldos.filter((s) => s.tipo === 'GASTO').reduce((s, c) => s + c.saldo, 0)
  const resultadoEjercicio = ingresos - costos - gastos

  const totalPasivoPatrimonio = totalPasivo + totalPatrimonio + resultadoEjercicio
  const diferencia = totalActivo - totalPasivoPatrimonio
  const cuadra = Math.abs(diferencia) < 0.01

  return {
    activoCorriente, activoNoCorriente,
    totalActivoCorriente, totalActivoNoCorriente, totalActivo,
    pasivoCorriente, pasivoNoCorriente,
    totalPasivoCorriente, totalPasivoNoCorriente, totalPasivo,
    patrimonio, totalPatrimonio,
    resultadoEjercicio,
    cuadra, diferencia,
  }
}

export async function generarEstadoResultado(
  empresaId: string,
  desde: Date,
  hasta: Date,
): Promise<EstadoResultado> {
  const saldos = await obtenerSaldosCuentas(empresaId, desde, hasta)

  // Clasificar cuentas
  const ingresosOperacionales = saldos.filter((s) => s.tipo === 'INGRESO' && s.codigo.startsWith('4.1'))
  const ingresosNoOperacionales = saldos.filter((s) => s.tipo === 'INGRESO' && s.codigo.startsWith('4.2'))
  const costoVentas = saldos.filter((s) => s.tipo === 'COSTO')
  const gastosOperacionales = saldos.filter((s) => s.tipo === 'GASTO' && s.codigo.startsWith('6.1'))
  const gastosNoOperacionales = saldos.filter((s) => s.tipo === 'GASTO' && s.codigo.startsWith('6.2'))

  const totalIngresosOperacionales = ingresosOperacionales.reduce((s, c) => s + c.saldo, 0)
  const totalIngresosNoOperacionales = ingresosNoOperacionales.reduce((s, c) => s + c.saldo, 0)
  const totalCostoVentas = costoVentas.reduce((s, c) => s + c.saldo, 0)
  const totalGastosOperacionales = gastosOperacionales.reduce((s, c) => s + c.saldo, 0)
  const totalGastosNoOperacionales = gastosNoOperacionales.reduce((s, c) => s + c.saldo, 0)

  const utilidadBruta = totalIngresosOperacionales - totalCostoVentas
  const utilidadOperacional = utilidadBruta - totalGastosOperacionales
  const utilidadAntesISLR = utilidadOperacional + totalIngresosNoOperacionales - totalGastosNoOperacionales

  // ISLR estimado: 34% para personas jurídicas (tarifa general)
  // Solo si hay utilidad positiva
  const islrEstimado = utilidadAntesISLR > 0 ? Math.round(utilidadAntesISLR * 34) / 100 : 0
  const utilidadNeta = utilidadAntesISLR - islrEstimado

  return {
    ingresosOperacionales, totalIngresosOperacionales,
    costoVentas, totalCostoVentas,
    utilidadBruta,
    gastosOperacionales, totalGastosOperacionales,
    utilidadOperacional,
    ingresosNoOperacionales, totalIngresosNoOperacionales,
    gastosNoOperacionales, totalGastosNoOperacionales,
    utilidadAntesISLR,
    islrEstimado,
    utilidadNeta,
  }
}
