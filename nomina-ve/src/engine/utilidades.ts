// Utilidades — LOTTT Arts. 131 al 133, con retención INCES (Ley del INCES).
import { D, fmt, r2, type Decimal, type Num } from './decimal'
import type { CriteriosEmpresa } from './criterios'
import { antiguedad } from './fechas'
import { incesUtilidades } from './parafiscales'
import type { ParametrosVigentes } from './parametros'
import { diasUtilidadesEmpresa } from './salario'
import type { Alerta, Fecha, Resultado } from './tipos'

export interface EntradaUtilidades {
  inicioEjercicio: Fecha
  finEjercicio: Fecha
  fechaIngreso: Fecha
  /** Fecha de egreso si el trabajador salió durante el ejercicio (utilidades fraccionadas). */
  fechaEgreso: Fecha | null
  /** Suma de conceptos salariales (es_salarial) devengados en el ejercicio. */
  salarioNormalDevengado: Num
  /** Último salario normal mensual (para el criterio ULTIMO_SALARIO o EL_MAYOR). */
  ultimoSalarioMensual: Num
}

export interface CalculoUtilidades {
  mesesCompletos: number
  diasAnuales: number
  diasCorrespondientes: Decimal
  salarioDiarioBase: Decimal
  monto: Decimal
  retencionINCES: Decimal
  montoReferenciaOtroMetodo: Decimal
}

/**
 * Utilidades del ejercicio:
 *   días = (días anuales ÷ 12) × meses completos trabajados en el ejercicio
 *   salario diario = salario normal devengado ÷ (meses completos × 30)   [PROMEDIO_DEVENGADO]
 *                  = último salario ÷ 30                               [ULTIMO_SALARIO]
 *   monto = salario diario × días;  INCES 0,5 % retenido al trabajador.
 */
export function calcularUtilidades(e: EntradaUtilidades, params: ParametrosVigentes, criterios: Pick<CriteriosEmpresa, 'baseUtilidades'>): Resultado<CalculoUtilidades> {
  const desde = e.fechaIngreso > e.inicioEjercicio ? e.fechaIngreso : e.inicioEjercicio
  const hasta = e.fechaEgreso && e.fechaEgreso < e.finEjercicio ? e.fechaEgreso : e.finEjercicio
  const meses = Math.min(antiguedad(desde, hasta).mesesTotales, 12)
  const diasAnuales = diasUtilidadesEmpresa(e.finEjercicio, params)
  const dias = D(diasAnuales).div(12).times(meses)
  const promedio = meses > 0 ? D(e.salarioNormalDevengado).div(meses * 30) : D(0)
  const ultimo = D(e.ultimoSalarioMensual).div(30)
  const alertas: Alerta[] = []
  let base: Decimal
  let otro: Decimal
  if (criterios.baseUtilidades === 'PROMEDIO_DEVENGADO') {
    base = promedio
    otro = ultimo
  } else if (criterios.baseUtilidades === 'ULTIMO_SALARIO') {
    base = ultimo
    otro = promedio
  } else {
    base = promedio.gt(ultimo) ? promedio : ultimo
    otro = promedio.gt(ultimo) ? ultimo : promedio
  }
  const monto = r2(base.times(dias))
  const montoOtro = r2(otro.times(dias))
  if (criterios.baseUtilidades === 'PROMEDIO_DEVENGADO' && montoOtro.gt(monto))
    alertas.push({ nivel: 'INFO', codigo: 'UTILIDADES_ULTIMO_SALARIO_MAYOR', mensaje: `Con el último salario las utilidades serían ${fmt(montoOtro)} (mayor que ${fmt(monto)}).` })
  const inces = incesUtilidades(monto, hasta, params)
  return {
    valor: { mesesCompletos: meses, diasAnuales, diasCorrespondientes: dias, salarioDiarioBase: base, monto, retencionINCES: inces.valor, montoReferenciaOtroMetodo: montoOtro },
    desglose: [
      { descripcion: 'Meses completos en el ejercicio', valor: String(meses) },
      { descripcion: 'Días correspondientes', formula: `(${diasAnuales} ÷ 12) × ${meses}`, valor: fmt(dias, 4) },
      { descripcion: `Salario diario base (${criterios.baseUtilidades})`, valor: fmt(base, 6) },
      { descripcion: 'Utilidades', formula: `${fmt(base, 6)} × ${fmt(dias, 4)}`, valor: fmt(monto) },
      ...inces.desglose,
    ],
    baseLegal: ['LOTTT Art. 131', 'LOTTT Art. 132', 'LOTTT Art. 133', 'Ley del INCES'],
    alertas,
  }
}
