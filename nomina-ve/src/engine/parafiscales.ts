// Aportes y retenciones parafiscales: IVSS, RPE, FAOV, INCES, contribución
// especial de pensiones y LOPCYMAT.
import { D, fmt, max, min, pct, r2, sumar, type Decimal, type Num } from './decimal'
import { P } from './catalogo-parametros'
import { diasEntre, enRango, lunesEnRango, sumarDias } from './fechas'
import type { ParametrosVigentes } from './parametros'
import { ErrorMotor, type Alerta, type Fecha, type NivelRiesgo, type Paso, type Resultado } from './tipos'

const IVSS_PATRONAL = { MINIMO: P.IVSS_PATRONAL_MINIMO_PCT, MEDIO: P.IVSS_PATRONAL_MEDIO_PCT, MAXIMO: P.IVSS_PATRONAL_MAXIMO_PCT } as const

type ValorEnFecha = Num | ((fecha: Fecha) => Num)
const valorEn = (v: ValorEnFecha, f: Fecha): Decimal => D(typeof v === 'function' ? v(f) : v)

export interface CotizacionSemanal {
  lunes: number
  trabajador: Decimal
  patronal: Decimal
}

/**
 * Cálculo semanal común a IVSS y RPE:
 *   cuota = (salario mensual topado × 12 ÷ 52) × % × número de lunes
 * El tope (N salarios mínimos) y los porcentajes se resuelven EN CADA LUNES,
 * de modo que un cambio de parámetro a mitad de mes se aplica exactamente
 * a las semanas posteriores al cambio.
 */
function cotizacionPorLunes(
  nombre: string,
  baseLegal: string,
  salarioMensual: ValorEnFecha,
  desde: Fecha,
  hasta: Fecha,
  params: ParametrosVigentes,
  codigos: { tope: string; trabajador: string; patronal: string },
): Resultado<CotizacionSemanal> {
  const lunes = lunesEnRango(desde, hasta)
  const desglose: Paso[] = []
  const alertas: Alerta[] = []
  let trabajador = D(0)
  let patronal = D(0)
  for (const l of lunes) {
    const sm = params.valor(P.SALARIO_MINIMO_MENSUAL, l)
    const tope = sm.times(params.valor(codigos.tope, l))
    const salario = valorEn(salarioMensual, l)
    const base = min(salario, tope)
    const semanal = base.times(12).div(52)
    const pt = params.valor(codigos.trabajador, l)
    const pp = params.valor(codigos.patronal, l)
    trabajador = trabajador.plus(pct(semanal, pt))
    patronal = patronal.plus(pct(semanal, pp))
    if (salario.gt(tope) && !alertas.length)
      alertas.push({ nivel: 'INFO', codigo: `${nombre}_TOPE`, mensaje: `Salario ${fmt(salario)} sobre el tope de ${nombre} (${fmt(tope)}); se cotiza sobre el tope.` })
    desglose.push({
      descripcion: `Lunes ${l}: base semanal ${nombre}`,
      formula: `mín(${fmt(salario)}; ${fmt(tope)}) × 12 ÷ 52 → trab. ${fmt(pt, 2)} %, patr. ${fmt(pp, 2)} %`,
      valor: fmt(semanal, 6),
    })
  }
  const valor = { lunes: lunes.length, trabajador: r2(trabajador), patronal: r2(patronal) }
  desglose.push({ descripcion: `${nombre} trabajador (${lunes.length} lunes)`, valor: fmt(valor.trabajador) })
  desglose.push({ descripcion: `${nombre} patronal (${lunes.length} lunes)`, valor: fmt(valor.patronal) })
  return { valor, desglose, baseLegal: [baseLegal], alertas }
}

/** Seguro Social Obligatorio — Ley del Seguro Social: base salario normal, tope 5 SM, cálculo por lunes. */
export function ivss(salarioMensualNormal: ValorEnFecha, desde: Fecha, hasta: Fecha, riesgo: NivelRiesgo, params: ParametrosVigentes) {
  return cotizacionPorLunes('IVSS', 'Ley del Seguro Social', salarioMensualNormal, desde, hasta, params, {
    tope: P.IVSS_TOPE_SM,
    trabajador: P.IVSS_TRABAJADOR_PCT,
    patronal: IVSS_PATRONAL[riesgo],
  })
}

/** Régimen Prestacional de Empleo — Ley del RPE: base salario normal, tope 10 SM, cálculo por lunes. */
export function rpe(salarioMensualNormal: ValorEnFecha, desde: Fecha, hasta: Fecha, params: ParametrosVigentes) {
  return cotizacionPorLunes('RPE', 'Ley del Régimen Prestacional de Empleo', salarioMensualNormal, desde, hasta, params, {
    tope: P.RPE_TOPE_SM,
    trabajador: P.RPE_TRABAJADOR_PCT,
    patronal: P.RPE_PATRONAL_PCT,
  })
}

/**
 * FAOV — Ley del Régimen Prestacional de Vivienda y Hábitat: base salario
 * integral del período, sin tope (criterio A3: integral con alícuotas, mes a mes).
 */
export function faov(baseIntegral: Num, fecha: Fecha, params: ParametrosVigentes): Resultado<{ trabajador: Decimal; patronal: Decimal }> {
  const pt = params.valor(P.FAOV_TRABAJADOR_PCT, fecha)
  const pp = params.valor(P.FAOV_PATRONAL_PCT, fecha)
  const trabajador = r2(pct(baseIntegral, pt))
  const patronal = r2(pct(baseIntegral, pp))
  return {
    valor: { trabajador, patronal },
    desglose: [
      { descripcion: 'Base FAOV (salario integral, sin tope)', valor: fmt(baseIntegral) },
      { descripcion: `FAOV trabajador ${fmt(pt, 2)} %`, valor: fmt(trabajador) },
      { descripcion: `FAOV patronal ${fmt(pp, 2)} %`, valor: fmt(patronal) },
    ],
    baseLegal: ['Ley del Régimen Prestacional de Vivienda y Hábitat'],
    alertas: [],
  }
}

/**
 * INCES patronal — Ley del INCES: 2 % del total de salarios normales pagados
 * en el trimestre, solo si la empresa ocupa 5 o más trabajadores.
 */
export function incesPatronalTrimestral(totalSalariosTrimestre: Num, numeroTrabajadores: number, finTrimestre: Fecha, params: ParametrosVigentes): Resultado {
  const minimo = params.valor(P.INCES_MIN_TRABAJADORES, finTrimestre)
  if (D(numeroTrabajadores).lt(minimo))
    return {
      valor: D(0),
      desglose: [{ descripcion: `Empresa con ${numeroTrabajadores} trabajadores (< ${fmt(minimo, 0)}): no aplica INCES patronal`, valor: '0,00' }],
      baseLegal: ['Ley del INCES'],
      alertas: [{ nivel: 'INFO', codigo: 'INCES_NO_APLICA', mensaje: `INCES patronal no aplica: menos de ${fmt(minimo, 0)} trabajadores.` }],
    }
  const p = params.valor(P.INCES_PATRONAL_PCT, finTrimestre)
  const monto = r2(pct(totalSalariosTrimestre, p))
  return {
    valor: monto,
    desglose: [{ descripcion: `INCES patronal ${fmt(p, 2)} % sobre salarios del trimestre`, formula: `${fmt(totalSalariosTrimestre)} × ${fmt(p, 2)} %`, valor: fmt(monto) }],
    baseLegal: ['Ley del INCES'],
    alertas: [],
  }
}

/** INCES trabajador — Ley del INCES: 0,5 % de las utilidades, retenido por el patrono al pagarlas. */
export function incesUtilidades(montoUtilidades: Num, fecha: Fecha, params: ParametrosVigentes): Resultado {
  const p = params.valor(P.INCES_TRABAJADOR_UTILIDADES_PCT, fecha)
  const monto = r2(pct(montoUtilidades, p))
  return {
    valor: monto,
    desglose: [{ descripcion: `Retención INCES ${fmt(p, 2)} % sobre utilidades`, formula: `${fmt(montoUtilidades)} × ${fmt(p, 2)} %`, valor: fmt(monto) }],
    baseLegal: ['Ley del INCES'],
    alertas: [],
  }
}

export interface EntradaPensiones {
  /** Total pagado al trabajador en el mes por conceptos con base_pensiones (VES). */
  pagadoMes: Num
  /** Tasa BCV para convertir el ingreso mínimo en USD (criterio A4: último día del mes). */
  tasaBCV: Num
  /** Días del mes en que el trabajador estuvo activo (para el criterio A5 prorrateado). */
  diasActivo: number
  diasMes: number
  exoneradaRNE: boolean
  rneVence: Fecha | null
  criterioMinimo: 'COMPLETO' | 'PRORRATEADO'
}

/**
 * Contribución especial de pensiones — Ley de Protección de las Pensiones de
 * Seguridad Social (GO 6.806 Ext.) y Decreto 4.952. A cargo de la empresa
 * (no se descuenta al trabajador). Base = pagos por salario y bonificaciones
 * no salariales; mínimo por trabajador = ingreso mínimo integral indexado.
 */
export function contribucionPensiones(entrada: EntradaPensiones, finMes: Fecha, params: ParametrosVigentes): Resultado<{ base: Decimal; contribucion: Decimal; exonerada: boolean }> {
  const alertas: Alerta[] = []
  const exonerada = entrada.exoneradaRNE && (entrada.rneVence === null || finMes <= entrada.rneVence)
  if (entrada.exoneradaRNE && !exonerada)
    alertas.push({ nivel: 'ADVERTENCIA', codigo: 'RNE_VENCIDA', mensaje: `La exoneración RNE venció el ${entrada.rneVence}; se calcula la contribución.` })
  const minimoUSD = params.valor(P.INGRESO_MINIMO_INTEGRAL, finMes)
  let minimoVES = minimoUSD.times(entrada.tasaBCV)
  if (entrada.criterioMinimo === 'PRORRATEADO') minimoVES = minimoVES.times(entrada.diasActivo).div(entrada.diasMes)
  const pagado = D(entrada.pagadoMes)
  const base = r2(max(pagado, minimoVES))
  if (pagado.lt(minimoVES))
    alertas.push({ nivel: 'INFO', codigo: 'PENSIONES_MINIMO', mensaje: `Lo pagado (${fmt(pagado)}) es menor al ingreso mínimo integral (${fmt(minimoVES)}); se usa el mínimo.` })
  const alicuota = params.valor(P.PENSIONES_ALICUOTA_PCT, finMes)
  const contribucion = exonerada ? D(0) : r2(pct(base, alicuota))
  return {
    valor: { base, contribucion, exonerada },
    desglose: [
      { descripcion: 'Pagado en el mes (salario + bonificaciones no salariales)', valor: fmt(pagado) },
      { descripcion: `Ingreso mínimo integral (${fmt(minimoUSD)} USD × ${fmt(entrada.tasaBCV, 4)}${entrada.criterioMinimo === 'PRORRATEADO' ? ` × ${entrada.diasActivo}/${entrada.diasMes}` : ''})`, valor: fmt(minimoVES) },
      { descripcion: 'Base (el mayor)', valor: fmt(base) },
      { descripcion: exonerada ? 'Exonerada (RNE)' : `Contribución ${fmt(alicuota, 2)} %`, valor: fmt(contribucion) },
    ],
    baseLegal: ['Ley de Protección de las Pensiones de Seguridad Social (GO 6.806 Ext.)', 'Decreto 4.952'],
    alertas,
  }
}

/** Días del mes [desde, hasta] en que el trabajador estuvo activo. */
export function diasActivoEnRango(desde: Fecha, hasta: Fecha, ingreso: Fecha, egreso: Fecha | null): number {
  let n = 0
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) if (enRango(f, ingreso, egreso)) n++
  return n
}

/**
 * LOPCYMAT: desactivada por defecto. Solo calcula si la empresa la activó y
 * existe el parámetro LOPCYMAT_ALICUOTA_PCT vigente (si no, se detiene).
 */
export function lopcymat(activa: boolean, base: Num, fecha: Fecha, params: ParametrosVigentes): Resultado {
  if (!activa) return { valor: D(0), desglose: [{ descripcion: 'LOPCYMAT desactivada', valor: '0,00' }], baseLegal: ['LOPCYMAT'], alertas: [] }
  const p = params.valor(P.LOPCYMAT_ALICUOTA_PCT, fecha)
  const monto = r2(pct(base, p))
  return { valor: monto, desglose: [{ descripcion: `LOPCYMAT ${fmt(p, 2)} %`, formula: `${fmt(base)} × ${fmt(p, 2)} %`, valor: fmt(monto) }], baseLegal: ['LOPCYMAT'], alertas: [] }
}

/** Suma un campo de varios resultados (útil al consolidar declaraciones). */
export const totalizar = (valores: Num[]): Decimal => r2(sumar(valores))

export function validarRango(desde: Fecha, hasta: Fecha) {
  if (diasEntre(desde, hasta) < 0) throw new ErrorMotor('RANGO_INVALIDO', `Rango inválido: ${desde} a ${hasta}`)
}
