// Nómina LOTTT: vacaciones, bono vacacional y liquidación final de personal.
// Complementa nomina.ts (cálculo mensual) con las prestaciones que solo
// aplican al disfrute de vacaciones o a la terminación de la relación laboral.
//
// Simplificaciones MVP (documentadas):
// - "Vacaciones vencidas" pendientes de disfrute se estiman contando cuántos
//   registros de Vacacion tiene el empleado frente a los años completos de
//   servicio (1 registro = 1 año de vacaciones cubierto), no un calendario
//   exacto de aniversarios. Se calculan al salario diario vigente al momento
//   del cálculo (criterio usual cuando no hay registro histórico de salarios).
// - El asiento de liquidación se registra íntegro como gasto del período
//   (no se neteó contra el pasivo acumulado mes a mes en Nómina, que se lleva
//   agregado y no por empleado en el libro contable).

import { db } from '@/lib/db'
import { buscarCuentaGasto, persistirAsiento, LineaAsientoInput } from './asientos-engine'

const round2 = (n: number) => Math.round(n * 100) / 100
const MS_DIA = 1000 * 60 * 60 * 24

export function añosServicioEntre(fechaIngreso: Date, fechaCorte: Date): number {
  const dias = (fechaCorte.getTime() - fechaIngreso.getTime()) / MS_DIA
  return Math.max(dias / 365.25, 0)
}

// LOTTT Art. 190: 15 días de disfrute a partir del primer año de servicio,
// + 1 día adicional por cada año a partir del segundo, hasta 15 adicionales (máx. 30).
export function diasVacaciones(añoServicio: number): number {
  if (añoServicio < 1) return 0
  return 15 + Math.min(Math.max(añoServicio - 1, 0), 15)
}

// LOTTT Art. 192: mismo esquema de días que las vacaciones, pagado como bono.
export function diasBonoVacacional(añoServicio: number): number {
  return diasVacaciones(añoServicio)
}

export function calcularSalarioIntegralDiario(
  salarioBase: number,
  añosServicio: number,
  empresa: { porcentajeUtilidades: number },
): number {
  const salarioDiario = salarioBase / 30
  const alicuotaUtilidades = salarioDiario * (empresa.porcentajeUtilidades / 100)
  const diasBono = diasBonoVacacional(Math.max(Math.floor(añosServicio) + 1, 1))
  const alicuotaBonoVacacional = (diasBono * salarioDiario) / 360
  return round2(salarioDiario + alicuotaUtilidades + alicuotaBonoVacacional)
}

// ── Vacaciones ──

export interface RegistrarVacacionInput {
  empleadoId: string
  fechaInicio: string | Date
  fechaFin: string | Date
  diasDisfrutados: number
  generarAsiento?: boolean
  cuentaId?: string
  userId: string
}

export async function registrarVacacion(empresaId: string, input: RegistrarVacacionInput) {
  const empleado = await db.empleado.findUnique({ where: { id: input.empleadoId } })
  if (!empleado || empleado.empresaId !== empresaId) throw new Error('Empleado no encontrado')
  if (!empleado.activo) throw new Error('El empleado no está activo')
  if (input.diasDisfrutados <= 0) throw new Error('diasDisfrutados debe ser mayor a 0')

  const fechaInicio = new Date(input.fechaInicio)
  const añoServicio = Math.max(Math.floor(añosServicioEntre(empleado.fechaIngreso, fechaInicio)), 1)
  const salarioDiario = empleado.salarioBase / 30
  const diasBono = diasBonoVacacional(añoServicio)

  const montoVacaciones = round2(input.diasDisfrutados * salarioDiario)
  const montoBonoVacacional = round2(diasBono * salarioDiario)

  let asientoId: string | null = null
  if (input.generarAsiento) {
    if (!input.cuentaId) throw new Error('Debe indicar la cuenta de banco/caja para generar el asiento')
    const cuentaBanco = await db.cuenta.findUnique({ where: { id: input.cuentaId } })
    if (!cuentaBanco || cuentaBanco.empresaId !== empresaId) throw new Error('Cuenta bancaria no válida')

    const ctaGasto = await buscarCuentaGasto(empresaId, 'GASTO_VACACIONES')
    const total = round2(montoVacaciones + montoBonoVacacional)
    const lineas: LineaAsientoInput[] = [
      { cuentaId: ctaGasto.id, debit: total, descripcion: `Vacaciones y bono vacacional — ${empleado.nombre}` },
      { cuentaId: cuentaBanco.id, credit: total, descripcion: `Pago vacaciones — ${empleado.nombre}` },
    ]
    const asiento = await persistirAsiento(
      empresaId, input.userId, null, 'VACACIONES', fechaInicio,
      `Vacaciones — ${empleado.nombre}`, null, 'sistema', lineas,
    )
    asientoId = asiento.id
  }

  return db.vacacion.create({
    data: {
      empresaId,
      empleadoId: empleado.id,
      fechaInicio,
      fechaFin: new Date(input.fechaFin),
      diasDisfrutados: input.diasDisfrutados,
      montoVacaciones,
      montoBonoVacacional,
      asientoId,
    },
  })
}

export async function listarVacaciones(empresaId: string, empleadoId: string) {
  const empleado = await db.empleado.findUnique({ where: { id: empleadoId } })
  if (!empleado || empleado.empresaId !== empresaId) throw new Error('Empleado no encontrado')
  return db.vacacion.findMany({ where: { empleadoId }, orderBy: { fechaInicio: 'desc' } })
}

export interface ResumenVacaciones {
  añosServicio: number
  añosCompletos: number
  periodosDisfrutados: number
  periodosPendientes: number
  diasPendientesEstimados: number
  montoEstimado: number
}

export async function resumenVacaciones(empresaId: string, empleadoId: string): Promise<ResumenVacaciones> {
  const empleado = await db.empleado.findUnique({ where: { id: empleadoId } })
  if (!empleado || empleado.empresaId !== empresaId) throw new Error('Empleado no encontrado')
  const vacaciones = await db.vacacion.count({ where: { empleadoId } })
  const añosServicio = añosServicioEntre(empleado.fechaIngreso, new Date())
  const añosCompletos = Math.floor(añosServicio)
  const periodosPendientes = Math.max(añosCompletos - vacaciones, 0)
  const salarioDiario = empleado.salarioBase / 30
  let diasPendientes = 0
  for (let k = 1; k <= periodosPendientes; k++) diasPendientes += diasVacaciones(k)
  return {
    añosServicio: round2(añosServicio),
    añosCompletos,
    periodosDisfrutados: vacaciones,
    periodosPendientes,
    diasPendientesEstimados: diasPendientes,
    montoEstimado: round2(diasPendientes * salarioDiario),
  }
}

// ── Liquidación final ──

export interface ProcesarLiquidacionInput {
  empleadoId: string
  fechaEgreso: string | Date
  motivoEgreso: 'RENUNCIA' | 'DESPIDO_JUSTIFICADO' | 'DESPIDO_INJUSTIFICADO' | 'MUTUO_ACUERDO'
  generarAsiento?: boolean
  cuentaId?: string
  userId: string
}

export async function procesarLiquidacion(empresaId: string, input: ProcesarLiquidacionInput) {
  const empleado = await db.empleado.findUnique({ where: { id: input.empleadoId } })
  if (!empleado || empleado.empresaId !== empresaId) throw new Error('Empleado no encontrado')
  if (!empleado.activo) throw new Error('El empleado ya fue liquidado')
  const existente = await db.liquidacion.findUnique({ where: { empleadoId: empleado.id } })
  if (existente) throw new Error('Este empleado ya tiene una liquidación registrada')

  const empresa = await db.empresa.findUnique({ where: { id: empresaId } })
  if (!empresa) throw new Error('Empresa no encontrada')

  const fechaEgreso = new Date(input.fechaEgreso)
  if (fechaEgreso < empleado.fechaIngreso) throw new Error('La fecha de egreso no puede ser anterior al ingreso')

  const aniosServicio = añosServicioEntre(empleado.fechaIngreso, fechaEgreso)
  const añosCompletos = Math.floor(aniosServicio)
  const salarioDiario = empleado.salarioBase / 30
  const salarioIntegralDiario = calcularSalarioIntegralDiario(empleado.salarioBase, aniosServicio, empresa)

  // Prestaciones sociales (Art. 142): mayor entre lo acumulado mes a mes
  // (garantía, lit. a) y el cálculo retroactivo de 30 días de salario
  // integral por cada año o fracción de servicio (lit. c).
  const prestacionesRetroactivo = round2(30 * salarioIntegralDiario * aniosServicio)
  const prestacionesSociales = Math.max(empleado.prestacionesAcumuladas, prestacionesRetroactivo)

  // Vacaciones y bono vacacional de años completos no disfrutados.
  const vacacionesTomadas = await db.vacacion.count({ where: { empleadoId: empleado.id } })
  const periodosPendientes = Math.max(añosCompletos - vacacionesTomadas, 0)
  let diasVacacionesPendientes = 0
  let diasBonoPendiente = 0
  for (let k = 1; k <= periodosPendientes; k++) {
    diasVacacionesPendientes += diasVacaciones(k)
    diasBonoPendiente += diasBonoVacacional(k)
  }
  const vacacionesVencidas = round2((diasVacacionesPendientes + diasBonoPendiente) * salarioDiario)

  // Fracción del período en curso (desde el último aniversario cubierto hasta el egreso).
  const ultimoAniversario = new Date(empleado.fechaIngreso)
  ultimoAniversario.setFullYear(ultimoAniversario.getFullYear() + añosCompletos)
  const mesesFraccion = Math.min(Math.max((fechaEgreso.getTime() - ultimoAniversario.getTime()) / (MS_DIA * 30), 0), 12)
  const diasVacacionesProximas = diasVacaciones(añosCompletos + 1)
  const diasBonoProximo = diasBonoVacacional(añosCompletos + 1)
  const vacacionesFraccionadas = round2(((diasVacacionesProximas / 12) * mesesFraccion) * salarioDiario)
  const bonoVacacionalFraccionado = round2(((diasBonoProximo / 12) * mesesFraccion) * salarioDiario)

  // Utilidades fraccionadas del año calendario en curso.
  const inicioAnio = new Date(fechaEgreso.getFullYear(), 0, 1)
  const inicioComputo = empleado.fechaIngreso > inicioAnio ? empleado.fechaIngreso : inicioAnio
  const mesesTrabajadosAnio = Math.min(Math.max((fechaEgreso.getTime() - inicioComputo.getTime()) / (MS_DIA * 30), 0), 12)
  const utilidadesFraccionadas = round2(empleado.salarioBase * (empresa.porcentajeUtilidades / 100) * (mesesTrabajadosAnio / 12))

  // Indemnización por despido injustificado (Art. 92): monto igual a las prestaciones sociales.
  const indemnizacionDespido = input.motivoEgreso === 'DESPIDO_INJUSTIFICADO' ? prestacionesSociales : 0

  const totalLiquidacion = round2(
    prestacionesSociales + vacacionesVencidas + vacacionesFraccionadas + bonoVacacionalFraccionado + utilidadesFraccionadas + indemnizacionDespido,
  )

  let asientoId: string | null = null
  if (input.generarAsiento) {
    if (!input.cuentaId) throw new Error('Debe indicar la cuenta de banco/caja para generar el asiento')
    const cuentaBanco = await db.cuenta.findUnique({ where: { id: input.cuentaId } })
    if (!cuentaBanco || cuentaBanco.empresaId !== empresaId) throw new Error('Cuenta bancaria no válida')

    const ctaGasto = await buscarCuentaGasto(empresaId, 'GASTO_LIQUIDACION')
    const lineas: LineaAsientoInput[] = [
      { cuentaId: ctaGasto.id, debit: totalLiquidacion, descripcion: `Liquidación de personal — ${empleado.nombre}` },
      { cuentaId: cuentaBanco.id, credit: totalLiquidacion, descripcion: `Pago liquidación — ${empleado.nombre}` },
    ]
    const asiento = await persistirAsiento(
      empresaId, input.userId, null, 'LIQUIDACION', fechaEgreso,
      `Liquidación — ${empleado.nombre}`, null, 'sistema', lineas,
    )
    asientoId = asiento.id
  }

  const liquidacion = await db.liquidacion.create({
    data: {
      empresaId,
      empleadoId: empleado.id,
      fechaEgreso,
      motivoEgreso: input.motivoEgreso,
      aniosServicio: round2(aniosServicio),
      salarioIntegralDiario,
      prestacionesSociales: round2(prestacionesSociales),
      vacacionesVencidas,
      vacacionesFraccionadas,
      bonoVacacionalFraccionado,
      utilidadesFraccionadas,
      indemnizacionDespido: round2(indemnizacionDespido),
      totalLiquidacion,
      asientoId,
    },
  })

  await db.empleado.update({
    where: { id: empleado.id },
    data: { activo: false, fechaEgreso, motivoEgreso: input.motivoEgreso },
  })

  return liquidacion
}

export async function obtenerLiquidacion(empresaId: string, empleadoId: string) {
  const liquidacion = await db.liquidacion.findUnique({
    where: { empleadoId },
    include: { empleado: true },
  })
  if (!liquidacion || liquidacion.empresaId !== empresaId) return null
  return liquidacion
}

export async function listarLiquidaciones(empresaId: string) {
  return db.liquidacion.findMany({ where: { empresaId }, include: { empleado: true }, orderBy: { fechaEgreso: 'desc' } })
}
