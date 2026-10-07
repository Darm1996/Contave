// Salario normal, alícuotas y salario integral — LOTTT Art. 104.
import { D, fmt, type Decimal, type Num } from './decimal'
import { P } from './catalogo-parametros'
import type { CriteriosEmpresa } from './criterios'
import { antiguedad } from './fechas'
import type { ParametrosVigentes } from './parametros'
import { ErrorMotor, type Alerta, type Fecha, type Resultado } from './tipos'
import { diasBonoVacacional } from './vacaciones'

/** Salario diario = salario mensual ÷ 30 (LOTTT Art. 104, práctica de cálculo por mes de 30 días). */
export const salarioDiario = (mensual: Num): Decimal => D(mensual).div(30)

/**
 * Días de utilidades de la empresa (política interna), validados contra el
 * mínimo (30) y máximo (120) legal de LOTTT Art. 131.
 */
export function diasUtilidadesEmpresa(fecha: Fecha, params: ParametrosVigentes): number {
  const dias = params.valor(P.UTILIDADES_DIAS_EMPRESA, fecha).toNumber()
  const min = params.valor(P.UTILIDADES_DIAS_MIN, fecha).toNumber()
  const max = params.valor(P.UTILIDADES_DIAS_MAX, fecha).toNumber()
  if (dias < min || dias > max)
    throw new ErrorMotor('UTILIDADES_FUERA_DE_RANGO', `Los días de utilidades (${dias}) deben estar entre ${min} y ${max} (LOTTT Art. 131)`)
  return dias
}

export interface SalarioIntegral {
  salarioDiarioNormal: Decimal
  diasBonoVacacional: number
  diasUtilidades: number
  alicuotaBonoVacacional: Decimal
  alicuotaUtilidades: Decimal
  salarioDiarioIntegral: Decimal
}

/**
 * Salario integral diario = salario normal diario + alícuota de bono
 * vacacional + alícuota de utilidades (LOTTT Art. 104 y Art. 122).
 *
 *   alícuota BV  = (salario diario × días de bono vacacional) ÷ 360
 *   alícuota Ut. = ((salario diario + alícuota BV) × días de utilidades) ÷ 360   [LOTTT_DEFECTO]
 *               = (salario diario × días de utilidades) ÷ 360                   [SOLO_SALARIO]
 *
 * Los días de bono son los del año de servicio en curso (el bono que se
 * pagará en el próximo aniversario). Sin redondeo intermedio.
 */
export function salarioIntegral(
  salarioMensualNormal: Num,
  fechaIngreso: Fecha,
  fecha: Fecha,
  params: ParametrosVigentes,
  criterios: Pick<CriteriosEmpresa, 'metodoAlicuotas'>,
): Resultado<SalarioIntegral> {
  const sd = salarioDiario(salarioMensualNormal)
  const anioEnCurso = antiguedad(fechaIngreso, fecha).anios + 1
  const diasBV = diasBonoVacacional(anioEnCurso, fecha, params)
  const diasUt = diasUtilidadesEmpresa(fecha, params)
  const alicBV = sd.times(diasBV).div(360)
  const baseUt = criterios.metodoAlicuotas === 'LOTTT_DEFECTO' ? sd.plus(alicBV) : sd
  const alicUt = baseUt.times(diasUt).div(360)
  const sdi = sd.plus(alicBV).plus(alicUt)
  const alertas: Alerta[] = []
  return {
    valor: { salarioDiarioNormal: sd, diasBonoVacacional: diasBV, diasUtilidades: diasUt, alicuotaBonoVacacional: alicBV, alicuotaUtilidades: alicUt, salarioDiarioIntegral: sdi },
    desglose: [
      { descripcion: 'Salario diario normal', formula: `${fmt(salarioMensualNormal)} ÷ 30`, valor: fmt(sd, 6) },
      { descripcion: `Alícuota bono vacacional (${diasBV} días)`, formula: `${fmt(sd, 6)} × ${diasBV} ÷ 360`, valor: fmt(alicBV, 6) },
      {
        descripcion: `Alícuota utilidades (${diasUt} días, método ${criterios.metodoAlicuotas})`,
        formula: `${fmt(baseUt, 6)} × ${diasUt} ÷ 360`,
        valor: fmt(alicUt, 6),
      },
      { descripcion: 'Salario integral diario', formula: 'normal + alícuota BV + alícuota utilidades', valor: fmt(sdi, 6) },
    ],
    baseLegal: ['LOTTT Art. 104', 'LOTTT Art. 122', 'LOTTT Art. 192', 'LOTTT Art. 131'],
    alertas,
  }
}
