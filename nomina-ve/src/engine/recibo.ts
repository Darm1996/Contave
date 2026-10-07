// Recibo de pago de un trabajador en un período de nómina ordinaria.
// Contenido mínimo exigido por LOTTT Art. 106: período, salario base, cada
// asignación y deducción detallada y neto a pagar.
import { D, fmt, r2, sumar, type Decimal, type Num } from './decimal'
import { P } from './catalogo-parametros'
import { buscarConcepto, C, type Banderas, type Concepto, type TipoConcepto } from './conceptos'
import type { CriteriosEmpresa } from './criterios'
import { diasEntre } from './fechas'
import { ariVigente, retencionISLR, type FormularioARI } from './islr'
import { bonoNocturno, diaFeriadoODescansoTrabajado, horasExtra } from './jornada'
import { faov, ivss, rpe } from './parafiscales'
import type { ParametrosVigentes } from './parametros'
import { salarioDiario, salarioIntegral } from './salario'
import { ErrorMotor, type Alerta, type Fecha, type Frecuencia, type Moneda, type NivelRiesgo, type Paso, type TipoJornada } from './tipos'

export interface LineaRecibo {
  codigo: string
  nombre: string
  tipo: TipoConcepto
  banderas: Banderas
  cantidad?: string
  montoOrigen: Decimal
  monedaOrigen: Moneda
  tasaBCV: Decimal
  montoVES: Decimal
  baseLegal: string
  desglose: Paso[]
}

export interface Novedad {
  concepto: string
  /** Horas (horas extra, nocturnas) o días (feriados, faltas). */
  cantidad?: Num
  /** Monto para conceptos de monto fijo (comisiones, bonos, viáticos). */
  monto?: Num
  moneda?: Moneda
  /** Para horas extra: mayor número de horas en una misma semana del período. */
  horasSemanaMax?: Num
}

export interface EntradaRecibo {
  trabajador: {
    id: string
    fechaIngreso: Fecha
    fechaEgreso?: Fecha | null
    tipoJornada: TipoJornada
    salarioMensual: Num
    moneda: Moneda
  }
  periodo: { desde: Fecha; hasta: Fecha; fechaPago: Fecha; frecuencia: Frecuencia; tasaBCV: Num }
  novedades: Novedad[]
  conceptos: readonly Concepto[]
  riesgoIVSS: NivelRiesgo
  formulariosARI: readonly FormularioARI[]
  horasExtraAcumuladasAnio?: Num
  pagaCestaticket: boolean
  criterios: CriteriosEmpresa
}

export interface Recibo {
  trabajadorId: string
  periodo: EntradaRecibo['periodo']
  salarioMensualVES: Decimal
  salarioDiarioNormal: Decimal
  salarioDiarioIntegral: Decimal
  lineas: LineaRecibo[]
  bases: { ivssRpeMensual: Decimal; faov: Decimal; islr: Decimal; inces: Decimal; pensiones: Decimal; prestaciones: Decimal; salarioNormal: Decimal }
  totalAsignaciones: Decimal
  totalDeducciones: Decimal
  neto: Decimal
  netoUSD: Decimal
  totalAportesPatronales: Decimal
  alertas: Alerta[]
}

/**
 * Fracción del mes que representa el período (sueldo, alícuotas y cestaticket):
 * mensual = 1; quincenal = 1/2; semanal = 12/52 (52 semanas en 12 meses).
 */
export function fraccionMensual(frecuencia: Frecuencia): Decimal {
  if (frecuencia === 'MENSUAL') return D(1)
  if (frecuencia === 'QUINCENAL') return D(1).div(2)
  return D(12).div(52)
}

export function calcularRecibo(e: EntradaRecibo, params: ParametrosVigentes): Recibo {
  const { trabajador: t, periodo: per } = e
  if (diasEntre(per.desde, per.hasta) < 0) throw new ErrorMotor('RANGO_INVALIDO', 'El período termina antes de empezar')
  const tasa = D(per.tasaBCV)
  if (tasa.lte(0)) throw new ErrorMotor('TASA_BCV', 'Debe registrar la tasa BCV de la fecha de pago')
  const alertas: Alerta[] = []
  const lineas: LineaRecibo[] = []
  const aVES = (monto: Num, moneda: Moneda) => (moneda === 'USD' ? D(monto).times(tasa) : D(monto))

  const agregar = (codigo: string, montoOrigen: Num, monedaOrigen: Moneda, desglose: Paso[], cantidad?: Num, baseLegal?: string) => {
    const c = buscarConcepto(e.conceptos, codigo)
    const montoVES = r2(aVES(montoOrigen, monedaOrigen))
    if (montoVES.isZero()) return
    lineas.push({
      codigo: c.codigo,
      nombre: c.nombre,
      tipo: c.tipo,
      banderas: { ...c.banderas },
      cantidad: cantidad === undefined ? undefined : D(cantidad).toString(),
      montoOrigen: r2(montoOrigen),
      monedaOrigen,
      tasaBCV: tasa,
      montoVES,
      baseLegal: baseLegal ?? c.baseLegal,
      desglose,
    })
  }

  // 1. Salario y sueldo del período (trabajador con ingreso o egreso dentro del período: por días activos).
  const mensualVES = aVES(t.salarioMensual, t.moneda)
  const sd = salarioDiario(mensualVES)
  const fraccion = fraccionMensual(per.frecuencia)
  const inicioActivo = t.fechaIngreso > per.desde ? t.fechaIngreso : per.desde
  const finActivo = t.fechaEgreso && t.fechaEgreso < per.hasta ? t.fechaEgreso : per.hasta
  if (finActivo < inicioActivo) throw new ErrorMotor('TRABAJADOR_INACTIVO', `El trabajador ${t.id} no estuvo activo en el período`)
  const periodoCompleto = inicioActivo === per.desde && finActivo === per.hasta
  const diasActivos = diasEntre(inicioActivo, finActivo) + 1
  const sueldoOrigen = periodoCompleto ? D(t.salarioMensual).times(fraccion) : D(t.salarioMensual).div(30).times(Math.min(diasActivos, 30))
  agregar(C.SUELDO, sueldoOrigen, t.moneda, [
    periodoCompleto
      ? { descripcion: `Sueldo ${per.frecuencia.toLowerCase()}`, formula: `${fmt(t.salarioMensual)} ${t.moneda} × ${fmt(fraccion, 6)}`, valor: fmt(sueldoOrigen) }
      : { descripcion: `Sueldo por ${diasActivos} días activos`, formula: `${fmt(t.salarioMensual)} ÷ 30 × ${Math.min(diasActivos, 30)}`, valor: fmt(sueldoOrigen) },
    ...(t.moneda === 'USD' ? [{ descripcion: 'Conversión a Bs. a la tasa BCV de la fecha de pago', formula: `× ${fmt(tasa, 4)}`, valor: fmt(aVES(sueldoOrigen, 'USD')) }] : []),
  ], periodoCompleto ? undefined : diasActivos)

  // 2. Novedades.
  let faltasInjustificadas = D(0)
  for (const n of e.novedades) {
    const cant = D(n.cantidad ?? 0)
    switch (n.concepto) {
      case C.HORAS_EXTRA: {
        const r = horasExtra(cant, sd, t.tipoJornada, per.hasta, params, { horasSemanaMax: n.horasSemanaMax, horasAcumuladasAnio: e.horasExtraAcumuladasAnio })
        alertas.push(...r.alertas)
        agregar(C.HORAS_EXTRA, r.valor, 'VES', r.desglose, cant)
        break
      }
      case C.BONO_NOCTURNO: {
        const r = bonoNocturno(cant, sd, per.hasta, params)
        agregar(C.BONO_NOCTURNO, r.valor, 'VES', r.desglose, cant)
        break
      }
      case C.FERIADO_TRABAJADO:
      case C.DESCANSO_TRABAJADO: {
        const r = diaFeriadoODescansoTrabajado(cant, sd, per.hasta, params, n.concepto === C.DESCANSO_TRABAJADO)
        alertas.push(...r.alertas)
        agregar(n.concepto, r.valor, 'VES', r.desglose, cant)
        break
      }
      case C.FALTA_INJUSTIFICADA:
      case C.PERMISO_NO_REMUNERADO: {
        if (n.concepto === C.FALTA_INJUSTIFICADA) faltasInjustificadas = faltasInjustificadas.plus(cant)
        const monto = sd.times(cant)
        agregar(n.concepto, monto, 'VES', [{ descripcion: 'Días no remunerados', formula: `${fmt(sd, 4)} × ${fmt(cant)}`, valor: fmt(monto) }], cant)
        break
      }
      default: {
        if (n.monto === undefined) throw new ErrorMotor('NOVEDAD_SIN_MONTO', `La novedad ${n.concepto} requiere monto`)
        agregar(n.concepto, n.monto, n.moneda ?? 'VES', [{ descripcion: 'Monto informado en novedades', valor: `${fmt(n.monto)} ${n.moneda ?? 'VES'}` }])
      }
    }
  }

  // 3. Cestaticket (no salarial). Monto mensual en USD prorrateado por días si cambia a mitad de
  //    período (criterio A6); descuento por faltas injustificadas según criterio A13.
  if (e.pagaCestaticket) {
    const ct = params.prorrateado(P.CESTATICKET_MENSUAL, per.desde, per.hasta)
    const unidad = params.registro(P.CESTATICKET_MENSUAL, per.hasta).unidad
    const moneda: Moneda = unidad === 'USD' ? 'USD' : 'VES'
    let monto = periodoCompleto ? ct.valor.times(fraccion) : ct.valor.div(30).times(Math.min(diasActivos, 30))
    const pasos: Paso[] = [{ descripcion: 'Cestaticket mensual vigente (prorrateado por días si cambió)', valor: `${fmt(ct.valor, 4)} ${moneda}` }]
    if (ct.tramos.length > 1) pasos.push({ descripcion: 'Tramos', valor: ct.tramos.map((x) => `${x.desde}→${x.hasta}: ${x.valor}`).join('; ') })
    if (e.criterios.descontarCestaticketFaltasInjustificadas && faltasInjustificadas.gt(0)) {
      const desc = ct.valor.div(30).times(faltasInjustificadas)
      monto = noNegativo(monto.minus(desc))
      pasos.push({ descripcion: `Descuento por ${fmt(faltasInjustificadas)} falta(s) injustificada(s)`, valor: `−${fmt(desc, 4)} ${moneda}` })
    }
    pasos.push({ descripcion: 'Cestaticket del período', valor: `${fmt(monto)} ${moneda}` })
    agregar(C.CESTATICKET, monto, moneda, pasos)
  }

  // 4. Bases por bandera (las deducciones con bandera, como las faltas, restan).
  const base = (b: keyof Banderas) =>
    sumar(lineas.filter((l) => l.banderas[b]).map((l) => (l.tipo === 'DEDUCCION' ? l.montoVES.neg() : l.montoVES)))
  const baseIvssPeriodo = base('base_ivss_rpe')
  // El cálculo por lunes trabaja con salario mensual: se lleva la base del período a su equivalente mensual.
  const fraccionActiva = periodoCompleto ? fraccion : D(Math.min(diasActivos, 30)).div(30)
  const baseIvssMensual = baseIvssPeriodo.div(fraccionActiva)

  const integral = salarioIntegral(mensualVES, t.fechaIngreso, per.hasta, params, e.criterios)
  const alicuotasPeriodo = integral.valor.alicuotaBonoVacacional.plus(integral.valor.alicuotaUtilidades).times(30).times(fraccionActiva)
  const baseFaov = base('base_faov').plus(alicuotasPeriodo)
  const baseIslr = base('base_islr')

  // 5. Deducciones y aportes.
  const rIvss = ivss(baseIvssMensual, inicioActivo, finActivo, e.riesgoIVSS, params)
  const rRpe = rpe(baseIvssMensual, inicioActivo, finActivo, params)
  const rFaov = faov(baseFaov, per.hasta, params)
  alertas.push(...rIvss.alertas, ...rRpe.alertas)
  const ivssDesglose = [{ descripcion: 'Base IVSS/RPE del período llevada a mensual', formula: `${fmt(baseIvssPeriodo)} ÷ ${fmt(fraccionActiva, 6)}`, valor: fmt(baseIvssMensual) }]
  agregar(C.IVSS_TRABAJADOR, rIvss.valor.trabajador, 'VES', [...ivssDesglose, ...rIvss.desglose], rIvss.valor.lunes)
  agregar(C.RPE_TRABAJADOR, rRpe.valor.trabajador, 'VES', [...ivssDesglose, ...rRpe.desglose], rRpe.valor.lunes)
  const faovDesglose = [{ descripcion: 'Alícuotas BV + utilidades del período', valor: fmt(alicuotasPeriodo) }, ...rFaov.desglose]
  agregar(C.FAOV_TRABAJADOR, rFaov.valor.trabajador, 'VES', faovDesglose)
  const rIslr = retencionISLR(baseIslr, ariVigente(e.formulariosARI, per.fechaPago), per.fechaPago, params)
  alertas.push(...rIslr.alertas)
  agregar(C.ISLR_RETENCION, rIslr.valor, 'VES', rIslr.desglose)
  agregar(C.IVSS_PATRONAL, rIvss.valor.patronal, 'VES', [...ivssDesglose, ...rIvss.desglose], rIvss.valor.lunes)
  agregar(C.RPE_PATRONAL, rRpe.valor.patronal, 'VES', [...ivssDesglose, ...rRpe.desglose], rRpe.valor.lunes)
  agregar(C.FAOV_PATRONAL, rFaov.valor.patronal, 'VES', faovDesglose)

  // 6. Totales.
  const total = (tipo: TipoConcepto) => r2(sumar(lineas.filter((l) => l.tipo === tipo).map((l) => l.montoVES)))
  const totalAsignaciones = total('ASIGNACION')
  const totalDeducciones = total('DEDUCCION')
  const neto = totalAsignaciones.minus(totalDeducciones)
  if (neto.lt(0)) alertas.push({ nivel: 'BLOQUEANTE', codigo: 'NETO_NEGATIVO', mensaje: `El neto a pagar es negativo (${fmt(neto)}). Revise las novedades.` })
  alertas.push(...params.alertasSinVerificar())

  return {
    trabajadorId: t.id,
    periodo: per,
    salarioMensualVES: r2(mensualVES),
    salarioDiarioNormal: sd,
    salarioDiarioIntegral: integral.valor.salarioDiarioIntegral,
    lineas,
    bases: {
      ivssRpeMensual: r2(baseIvssMensual),
      faov: r2(baseFaov),
      islr: r2(baseIslr),
      inces: r2(base('base_inces')),
      pensiones: r2(base('base_pensiones')),
      prestaciones: r2(base('base_prestaciones')),
      salarioNormal: r2(base('es_salarial')),
    },
    totalAsignaciones,
    totalDeducciones,
    neto,
    netoUSD: r2(neto.div(tasa)),
    totalAportesPatronales: total('APORTE_PATRONAL'),
    alertas: dedup(alertas),
  }
}

const noNegativo = (v: Decimal) => (v.lt(0) ? D(0) : v)
const dedup = (a: Alerta[]) => a.filter((x, i) => a.findIndex((y) => y.codigo === x.codigo && y.mensaje === x.mensaje) === i)
