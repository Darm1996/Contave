// Liquidación de la relación laboral (finiquito).
// LOTTT Arts. 92, 142, 143, 190-192, 196, 131-133; Ley del INCES.
import { D, fmt, r2, sumar, type Decimal, type Num } from './decimal'
import type { CriteriosEmpresa } from './criterios'
import { incesUtilidades } from './parafiscales'
import type { ParametrosVigentes } from './parametros'
import { compararPrestaciones, fechaLimitePago, interesesMora, type ComparacionPrestaciones } from './prestaciones'
import { validarEgresoInamovible, type Inamovilidad } from './proteccion-familia'
import { salarioDiario, salarioIntegral } from './salario'
import type { Alerta, Fecha, MotivoEgreso, Paso, Resultado } from './tipos'
import { calcularUtilidades } from './utilidades'
import { diasBonoVacacional, diasDisfruteVacaciones, vacacionesFraccionadas } from './vacaciones'

export interface EntradaLiquidacion {
  fechaIngreso: Fecha
  fechaEgreso: Fecha
  motivo: MotivoEgreso
  /** Último salario normal mensual en VES. */
  ultimoSalarioMensual: Num
  /** Totales del libro de prestaciones al egreso (LibroPrestaciones.totalGarantia / totalDiasAdicionales). Solo depósitos: sin intereses ni anticipos. */
  garantiaDepositada: Num
  diasAdicionalesDepositados: Num
  /** Intereses (Art. 143) aún no pagados al trabajador, capitalizados o no. */
  interesesPendientes: Num
  /** Anticipos otorgados (Art. 144): se descuentan del total a pagar. */
  anticiposOtorgados: Num
  /** Años de servicio cuyo disfrute de vacaciones quedó pendiente (ej. [3, 4]). */
  aniosVacacionesPendientes: number[]
  utilidades: { inicioEjercicio: Fecha; finEjercicio: Fecha; salarioNormalDevengado: Num; yaPagadas: Num }
  inamovilidades: readonly Inamovilidad[]
  /** Fecha prevista de pago, para calcular la mora. */
  fechaPago?: Fecha
}

export interface LineaLiquidacion {
  concepto: string
  monto: Decimal
  tipo: 'ASIGNACION' | 'DEDUCCION'
  baseLegal: string
}

export interface CalculoLiquidacion {
  bloqueada: boolean
  prestaciones: ComparacionPrestaciones
  lineas: LineaLiquidacion[]
  totalAsignaciones: Decimal
  totalDeducciones: Decimal
  neto: Decimal
  fechaLimitePago: Fecha
  interesesMora: Decimal
}

export function calcularLiquidacion(e: EntradaLiquidacion, params: ParametrosVigentes, criterios: CriteriosEmpresa): Resultado<CalculoLiquidacion> {
  const alertas: Alerta[] = validarEgresoInamovible(e.inamovilidades, e.fechaEgreso, e.motivo)
  const bloqueada = alertas.some((a) => a.nivel === 'BLOQUEANTE')
  const desglose: Paso[] = []
  const lineas: LineaLiquidacion[] = []
  const add = (concepto: string, monto: Num, tipo: LineaLiquidacion['tipo'], baseLegal: string) => {
    const m = r2(monto)
    if (!m.isZero()) lineas.push({ concepto, monto: m, tipo, baseLegal })
  }

  const sd = salarioDiario(e.ultimoSalarioMensual)
  const integral = salarioIntegral(e.ultimoSalarioMensual, e.fechaIngreso, e.fechaEgreso, params, criterios)
  desglose.push(...integral.desglose)

  // Prestaciones: comparación literal a+b vs. c (o e), lado a lado.
  const comp = compararPrestaciones(
    {
      fechaIngreso: e.fechaIngreso,
      fechaEgreso: e.fechaEgreso,
      garantiaDepositada: e.garantiaDepositada,
      diasAdicionalesDepositados: e.diasAdicionalesDepositados,
      ultimoSalarioIntegralDiario: integral.valor.salarioDiarioIntegral,
      ultimoSalarioNormalDiario: sd,
    },
    params,
    criterios,
  )
  desglose.push(...comp.desglose)
  add(`Prestaciones sociales (literal ${comp.valor.aplicado === 'AB' ? 'a + b' : comp.valor.aplicado.toLowerCase()})`, comp.valor.pagadero, 'ASIGNACION', 'LOTTT Art. 142')
  add('Intereses sobre prestaciones', e.interesesPendientes, 'ASIGNACION', 'LOTTT Art. 143')
  add('Anticipos de prestaciones otorgados', e.anticiposOtorgados, 'DEDUCCION', 'LOTTT Art. 144')

  // Art. 92: indemnización igual a las prestaciones pagaderas (criterio A11 sobre intereses).
  if (e.motivo === 'DESPIDO_INJUSTIFICADO') {
    const base = criterios.art92IncluyeIntereses ? comp.valor.pagadero.plus(e.interesesPendientes) : comp.valor.pagadero
    add('Indemnización por despido injustificado', base, 'ASIGNACION', 'LOTTT Art. 92')
    desglose.push({ descripcion: `Indemnización Art. 92 (${criterios.art92IncluyeIntereses ? 'incluye' : 'sin'} intereses)`, valor: fmt(base) })
  }

  // Vacaciones vencidas no disfrutadas (al último salario normal).
  for (const anio of e.aniosVacacionesPendientes) {
    const dv = diasDisfruteVacaciones(anio, e.fechaEgreso, params)
    const db = diasBonoVacacional(anio, e.fechaEgreso, params)
    add(`Vacaciones vencidas año ${anio} (${dv} días)`, sd.times(dv), 'ASIGNACION', 'LOTTT Art. 190')
    add(`Bono vacacional vencido año ${anio} (${db} días)`, sd.times(db), 'ASIGNACION', 'LOTTT Art. 192')
  }

  // Fraccionados del año en curso.
  const frac = vacacionesFraccionadas(e.fechaIngreso, e.fechaEgreso, sd, params)
  desglose.push(...frac.desglose)
  add('Vacaciones fraccionadas', frac.valor.montoVacaciones, 'ASIGNACION', 'LOTTT Art. 196')
  add('Bono vacacional fraccionado', frac.valor.montoBono, 'ASIGNACION', 'LOTTT Art. 196')

  const ut = calcularUtilidades(
    {
      inicioEjercicio: e.utilidades.inicioEjercicio,
      finEjercicio: e.utilidades.finEjercicio,
      fechaIngreso: e.fechaIngreso,
      fechaEgreso: e.fechaEgreso,
      salarioNormalDevengado: e.utilidades.salarioNormalDevengado,
      ultimoSalarioMensual: e.ultimoSalarioMensual,
    },
    params,
    criterios,
  )
  const utilidadesPendientes = D(ut.valor.monto).minus(e.utilidades.yaPagadas)
  desglose.push(...ut.desglose)
  alertas.push(...ut.alertas)
  if (utilidadesPendientes.gt(0)) {
    add('Utilidades fraccionadas', utilidadesPendientes, 'ASIGNACION', 'LOTTT Art. 131')
    add('INCES 0,5 % sobre utilidades', incesUtilidades(utilidadesPendientes, e.fechaEgreso, params).valor, 'DEDUCCION', 'Ley del INCES')
  }

  const limite = fechaLimitePago(e.fechaEgreso, params)
  const totalAsignaciones = r2(sumar(lineas.filter((l) => l.tipo === 'ASIGNACION').map((l) => l.monto)))
  const totalDeducciones = r2(sumar(lineas.filter((l) => l.tipo === 'DEDUCCION').map((l) => l.monto)))
  const neto = totalAsignaciones.minus(totalDeducciones)
  let mora = D(0)
  if (e.fechaPago) {
    const m = interesesMora(neto, limite, e.fechaPago, params)
    mora = m.valor
    alertas.push(...m.alertas)
    desglose.push(...m.desglose)
  }
  alertas.push(
    { nivel: 'INFO', codigo: 'PLAZO_PAGO', mensaje: `Pagar a más tardar el ${limite} (LOTTT Art. 142 lit. f).` },
    { nivel: 'INFO', codigo: 'PRESCRIPCION', mensaje: 'Prescripción: 10 años para prestaciones sociales y 5 años para otros conceptos (LOTTT Art. 51).' },
    ...params.alertasSinVerificar(),
  )

  return {
    valor: { bloqueada, prestaciones: comp.valor, lineas, totalAsignaciones, totalDeducciones, neto, fechaLimitePago: limite, interesesMora: mora },
    desglose,
    baseLegal: ['LOTTT Art. 92', 'LOTTT Art. 142', 'LOTTT Art. 143', 'LOTTT Art. 196', 'LOTTT Art. 131'],
    alertas,
  }
}
