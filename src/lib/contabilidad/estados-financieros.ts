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
  uso: string | null
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
// Se exporta porque el estado de flujo de efectivo y el estado de cambios en
// el patrimonio necesitan comparar saldos "al cierre de" dos fechas de corte.
export async function obtenerSaldosCuentas(empresaId: string, desde: Date, hasta: Date): Promise<CuentaSaldo[]> {
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
        uso: cuenta.uso,
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

const USOS_EFECTIVO = ['CAJA', 'CAJA_CHICA', 'BANCOS_BS', 'BANCOS_USD']

// ───────────────────────────────────────────────────────────────────────
//  ESTADO DE FLUJO DE EFECTIVO (método indirecto)
// ───────────────────────────────────────────────────────────────────────
//
// Se deriva directamente de la variación de cada cuenta del balance entre
// el inicio y el fin del período — no de un registro de "actividad" por
// transacción (la app no lo lleva). Como Activo = Pasivo + Patrimonio +
// Resultado del ejercicio siempre se cumple, la suma de todos los
// movimientos (con el signo que corresponde a cada cuenta) reconcilia
// exactamente con la variación real del efectivo; ver `cuadra` en el
// resultado.

export interface MovimientoFlujo {
  codigo: string
  nombre: string
  monto: number
}

export interface FlujoEfectivo {
  utilidadNeta: number
  ajustesNoMonetarios: MovimientoFlujo[] // depreciación, ajuste por inflación, resultados acumulados
  totalAjustesNoMonetarios: number
  cambiosCapitalTrabajo: MovimientoFlujo[] // CxC, inventario, CxP, impuestos por pagar, etc.
  totalCambiosCapitalTrabajo: number
  efectivoOperacion: number
  inversion: MovimientoFlujo[] // compra/venta de activos fijos
  efectivoInversion: number
  financiamiento: MovimientoFlujo[] // capital social, préstamos (pasivo no corriente)
  efectivoFinanciamiento: number
  variacionNetaEfectivo: number
  efectivoInicial: number
  efectivoFinal: number
  cuadra: boolean
  diferencia: number
}

export async function generarFlujoEfectivo(empresaId: string, desde: Date, hasta: Date): Promise<FlujoEfectivo> {
  const inicioAno = new Date(desde.getFullYear(), 0, 1)
  const fechaCorteInicial = new Date(desde.getTime() - 1) // instante anterior a "desde"

  const [saldosInicio, saldosFin, estadoResultado] = await Promise.all([
    obtenerSaldosCuentas(empresaId, inicioAno, fechaCorteInicial),
    obtenerSaldosCuentas(empresaId, inicioAno, hasta),
    generarEstadoResultado(empresaId, desde, hasta),
  ])

  const mapaInicio = new Map(saldosInicio.map((s) => [s.codigo, s]))
  const codigos = new Set([...saldosInicio.map((s) => s.codigo), ...saldosFin.map((s) => s.codigo)])

  const ajustesNoMonetarios: MovimientoFlujo[] = []
  const cambiosCapitalTrabajo: MovimientoFlujo[] = []
  const inversion: MovimientoFlujo[] = []
  const financiamiento: MovimientoFlujo[] = []
  let efectivoInicial = 0
  let efectivoFinal = 0

  for (const codigo of codigos) {
    const cuenta = saldosFin.find((s) => s.codigo === codigo) || mapaInicio.get(codigo)
    if (!cuenta) continue
    const inicio = mapaInicio.get(codigo)?.saldo || 0
    const fin = saldosFin.find((s) => s.codigo === codigo)?.saldo || 0
    const delta = fin - inicio

    if (cuenta.uso && USOS_EFECTIVO.includes(cuenta.uso)) {
      efectivoInicial += inicio
      efectivoFinal += fin
      continue
    }
    if (cuenta.tipo === 'INGRESO' || cuenta.tipo === 'COSTO' || cuenta.tipo === 'GASTO') continue // ya está en utilidadNeta
    if (Math.abs(delta) < 0.01) continue

    if (cuenta.tipo === 'ACTIVO' && cuenta.codigo.startsWith('1.1')) {
      // Activo corriente no monetario (CxC, inventario, IVA crédito, etc.)
      cambiosCapitalTrabajo.push({ codigo: cuenta.codigo, nombre: cuenta.nombre, monto: -delta })
    } else if (cuenta.tipo === 'ACTIVO' && cuenta.codigo.startsWith('1.2')) {
      if (cuenta.uso === 'DEP_ACUMULADA' || cuenta.naturaleza === 'ACREEDORA') {
        // Contra-activo: la depreciación acumulada es un gasto no monetario ya restado en utilidadNeta
        ajustesNoMonetarios.push({ codigo: cuenta.codigo, nombre: `Depreciación del período (${cuenta.nombre})`, monto: delta })
      } else {
        inversion.push({ codigo: cuenta.codigo, nombre: cuenta.nombre, monto: -delta })
      }
    } else if (cuenta.tipo === 'PASIVO' && cuenta.codigo.startsWith('2.1')) {
      cambiosCapitalTrabajo.push({ codigo: cuenta.codigo, nombre: cuenta.nombre, monto: delta })
    } else if (cuenta.tipo === 'PASIVO' && cuenta.codigo.startsWith('2.2')) {
      financiamiento.push({ codigo: cuenta.codigo, nombre: cuenta.nombre, monto: delta })
    } else if (cuenta.tipo === 'PATRIMONIO' && cuenta.uso === 'CAPITAL_SOCIAL') {
      financiamiento.push({ codigo: cuenta.codigo, nombre: cuenta.nombre, monto: delta })
    } else if (cuenta.tipo === 'PATRIMONIO') {
      // Ajuste por inflación / resultados acumulados de cierres anteriores: partidas no monetarias
      ajustesNoMonetarios.push({ codigo: cuenta.codigo, nombre: cuenta.nombre, monto: delta })
    }
  }

  const totalAjustesNoMonetarios = ajustesNoMonetarios.reduce((s, m) => s + m.monto, 0)
  const totalCambiosCapitalTrabajo = cambiosCapitalTrabajo.reduce((s, m) => s + m.monto, 0)
  const efectivoOperacion = estadoResultado.utilidadNeta + totalAjustesNoMonetarios + totalCambiosCapitalTrabajo
  const efectivoInversion = inversion.reduce((s, m) => s + m.monto, 0)
  const efectivoFinanciamiento = financiamiento.reduce((s, m) => s + m.monto, 0)
  const variacionNetaEfectivo = efectivoOperacion + efectivoInversion + efectivoFinanciamiento

  const efectivoFinalCalculado = efectivoInicial + variacionNetaEfectivo
  const diferencia = efectivoFinal - efectivoFinalCalculado
  const cuadra = Math.abs(diferencia) < 0.05

  return {
    utilidadNeta: estadoResultado.utilidadNeta,
    ajustesNoMonetarios, totalAjustesNoMonetarios,
    cambiosCapitalTrabajo, totalCambiosCapitalTrabajo,
    efectivoOperacion,
    inversion, efectivoInversion,
    financiamiento, efectivoFinanciamiento,
    variacionNetaEfectivo,
    efectivoInicial, efectivoFinal,
    cuadra, diferencia,
  }
}

// ───────────────────────────────────────────────────────────────────────
//  ESTADO DE CAMBIOS EN EL PATRIMONIO
// ───────────────────────────────────────────────────────────────────────

export interface CambiosPatrimonio {
  capitalSocialInicial: number
  aportesCapital: number
  capitalSocialFinal: number
  resultadosAcumuladosInicial: number
  resultadoDelPeriodo: number
  resultadosAcumuladosFinal: number
  ajusteInflacionInicial: number
  ajusteInflacionDelPeriodo: number
  ajusteInflacionFinal: number
  patrimonioInicial: number
  patrimonioFinal: number
  cuadra: boolean
  diferencia: number
}

export async function generarCambiosPatrimonio(empresaId: string, desde: Date, hasta: Date): Promise<CambiosPatrimonio> {
  const inicioAno = new Date(desde.getFullYear(), 0, 1)
  const fechaCorteInicial = new Date(desde.getTime() - 1)

  const [saldosInicio, saldosFin, estadoResultado] = await Promise.all([
    obtenerSaldosCuentas(empresaId, inicioAno, fechaCorteInicial),
    obtenerSaldosCuentas(empresaId, inicioAno, hasta),
    generarEstadoResultado(empresaId, desde, hasta),
  ])

  const sumaUso = (saldos: CuentaSaldo[], usos: string[]) =>
    saldos.filter((s) => s.uso && usos.includes(s.uso)).reduce((sum, s) => sum + s.saldo, 0)

  const capitalSocialInicial = sumaUso(saldosInicio, ['CAPITAL_SOCIAL'])
  const capitalSocialFinal = sumaUso(saldosFin, ['CAPITAL_SOCIAL'])
  const aportesCapital = capitalSocialFinal - capitalSocialInicial

  const resultadosAcumuladosInicial = sumaUso(saldosInicio, ['UTILIDAD_EJERCICIO', 'PERDIDA_EJERCICIO'])
  const resultadosAcumuladosFinalSinPeriodo = sumaUso(saldosFin, ['UTILIDAD_EJERCICIO', 'PERDIDA_EJERCICIO'])
  const resultadoDelPeriodo = estadoResultado.utilidadNeta
  const resultadosAcumuladosFinal = resultadosAcumuladosFinalSinPeriodo + resultadoDelPeriodo

  const ajusteInflacionInicial = sumaUso(saldosInicio, ['AJUSTE_INFLACION_PATRIMONIO'])
  const ajusteInflacionFinal = sumaUso(saldosFin, ['AJUSTE_INFLACION_PATRIMONIO'])
  const ajusteInflacionDelPeriodo = ajusteInflacionFinal - ajusteInflacionInicial

  const patrimonioInicial = capitalSocialInicial + resultadosAcumuladosInicial + ajusteInflacionInicial
  const patrimonioFinal = capitalSocialFinal + resultadosAcumuladosFinal + ajusteInflacionFinal

  // Verificación: el patrimonio final calculado debe coincidir con el que
  // arroja el Balance General (totalPatrimonio + resultado del ejercicio a "hasta")
  const totalPatrimonioBalanceFin = saldosFin.filter((s) => s.tipo === 'PATRIMONIO').reduce((s, c) => s + c.saldo, 0)
  const diferencia = patrimonioFinal - (totalPatrimonioBalanceFin + resultadoDelPeriodo)
  const cuadra = Math.abs(diferencia) < 0.05

  return {
    capitalSocialInicial, aportesCapital, capitalSocialFinal,
    resultadosAcumuladosInicial, resultadoDelPeriodo, resultadosAcumuladosFinal,
    ajusteInflacionInicial, ajusteInflacionDelPeriodo, ajusteInflacionFinal,
    patrimonioInicial, patrimonioFinal,
    cuadra, diferencia,
  }
}
