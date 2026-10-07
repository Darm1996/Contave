// Prestaciones sociales — LOTTT Arts. 142, 143 y 144.
import { D, fmt, min, pct, r2, type Decimal, type Num } from './decimal'
import { P } from './catalogo-parametros'
import type { CriteriosEmpresa } from './criterios'
import { anioDe, antiguedad, diasEntre, mesDe, sumarDias, sumarMeses, ultimoDiaMes } from './fechas'
import type { ParametrosVigentes } from './parametros'
import { ErrorMotor, type Alerta, type Fecha, type Paso, type Resultado } from './tipos'

export type TipoMovimiento =
  | 'GARANTIA_TRIMESTRAL'
  | 'DIAS_ADICIONALES'
  | 'INTERES'
  | 'INTERES_PAGADO'
  | 'ANTICIPO'

export interface MovimientoPrestaciones {
  fecha: Fecha
  tipo: TipoMovimiento
  dias?: Decimal
  salarioIntegralDiario?: Decimal
  tasaAnualPct?: Decimal
  monto: Decimal
  saldoGarantia: Decimal
  saldoIntereses: Decimal
  nota: string
}

/** Salario integral diario del trabajador para un mes dado (lo provee la capa de servicio). */
export type SalarioIntegralDelMes = (anio: number, mes: number) => Num

/** Literal a: 15 días de salario integral por trimestre, con el salario integral del último mes del trimestre. */
export function garantiaTrimestral(salarioIntegralDiarioUltimoMes: Num, fecha: Fecha, params: ParametrosVigentes): Resultado<{ dias: Decimal; monto: Decimal }> {
  const dias = params.valor(P.PREST_GARANTIA_DIAS_TRIMESTRE, fecha)
  const monto = r2(dias.times(salarioIntegralDiarioUltimoMes))
  return {
    valor: { dias, monto },
    desglose: [{ descripcion: 'Garantía trimestral', formula: `${fmt(dias, 0)} días × ${fmt(salarioIntegralDiarioUltimoMes, 6)}`, valor: fmt(monto) }],
    baseLegal: ['LOTTT Art. 142 lit. a'],
    alertas: [],
  }
}

/**
 * Literal b: a partir del segundo año, 2 días de salario integral por año,
 * acumulativos (año 2 = 2, año 3 = 4, …) hasta 30 días. Se deposita al
 * cumplir cada año de servicio n ≥ 2.
 */
export function diasAdicionalesAnio(anioServicioCumplido: number, fecha: Fecha, params: ParametrosVigentes): Decimal {
  if (anioServicioCumplido < 2) return D(0)
  const porAnio = params.valor(P.PREST_DIAS_ADIC_POR_ANIO, fecha)
  const tope = params.valor(P.PREST_DIAS_ADIC_MAX, fecha)
  return min(porAnio.times(anioServicioCumplido - 1), tope)
}

/** Fechas de cierre de cada trimestre que genera depósito de garantía hasta `hasta` (inclusive). */
export function cierresTrimestre(ingreso: Fecha, hasta: Fecha, metodo: CriteriosEmpresa['trimestreGarantia']): Fecha[] {
  const r: Fecha[] = []
  if (metodo === 'SERVICIO') {
    // Trimestre de servicio n termina el día anterior a ingreso + 3n meses.
    for (let n = 1; ; n++) {
      const fin = sumarDias(sumarMeses(ingreso, 3 * n), -1)
      if (fin > hasta) break
      r.push(fin)
    }
  } else {
    // Trimestres calendario: cuenta todo trimestre en el que el trabajador estuvo empleado.
    let anio = anioDe(ingreso)
    let q = Math.floor((mesDe(ingreso) - 1) / 3)
    for (;;) {
      const fin = ultimoDiaMes(anio, q * 3 + 3)
      if (fin > hasta) break
      r.push(fin)
      q++
      if (q === 4) {
        q = 0
        anio++
      }
    }
  }
  return r
}

export interface LibroPrestaciones {
  movimientos: MovimientoPrestaciones[]
  totalGarantia: Decimal // literal a depositado
  totalDiasAdicionales: Decimal // literal b depositado
  totalAnticipos: Decimal
  saldoGarantia: Decimal // a + b − anticipos (+ intereses si se capitalizan)
  saldoIntereses: Decimal // intereses no capitalizados ni pagados
  alertas: Alerta[]
}

export interface EntradaLibro {
  fechaIngreso: Fecha
  fechaCorte: Fecha
  salarioIntegralDelMes: SalarioIntegralDelMes
  anticipos?: { fecha: Fecha; monto: Num }[]
  /** Si true, calcula intereses mensuales (requiere TASA_INTERES_PRESTACIONES_PCT de cada mes). */
  calcularIntereses: boolean
}

/**
 * Genera el libro auxiliar de prestaciones de un trabajador: depósitos de
 * garantía trimestral (lit. a), días adicionales anuales (lit. b), intereses
 * mensuales (Art. 143) y anticipos (Art. 144), con saldo corrido.
 *
 * Intereses: saldo de garantía al cierre de cada mes × tasa anual BCV ÷ 12.
 * Según criterio, se capitalizan (se suman al saldo) o se acumulan para pago anual.
 */
export function libroPrestaciones(e: EntradaLibro, params: ParametrosVigentes, criterios: Pick<CriteriosEmpresa, 'trimestreGarantia' | 'interesesPrestaciones'>): LibroPrestaciones {
  const eventos: { fecha: Fecha; orden: number; aplicar: () => void }[] = []
  const movimientos: MovimientoPrestaciones[] = []
  const alertas: Alerta[] = []
  let saldoG = D(0)
  let saldoI = D(0)
  let totalA = D(0)
  let totalB = D(0)
  let totalAnt = D(0)
  const push = (m: Omit<MovimientoPrestaciones, 'saldoGarantia' | 'saldoIntereses'>) =>
    movimientos.push({ ...m, saldoGarantia: saldoG, saldoIntereses: saldoI })

  for (const fin of cierresTrimestre(e.fechaIngreso, e.fechaCorte, criterios.trimestreGarantia)) {
    eventos.push({
      fecha: fin,
      orden: 1,
      aplicar: () => {
        const sdi = D(e.salarioIntegralDelMes(anioDe(fin), mesDe(fin)))
        const g = garantiaTrimestral(sdi, fin, params).valor
        saldoG = saldoG.plus(g.monto)
        totalA = totalA.plus(g.monto)
        push({ fecha: fin, tipo: 'GARANTIA_TRIMESTRAL', dias: g.dias, salarioIntegralDiario: sdi, monto: g.monto, nota: 'LOTTT Art. 142 lit. a' })
      },
    })
  }
  for (let n = 2; ; n++) {
    const aniversario = sumarDias(sumarMeses(e.fechaIngreso, 12 * n), -1)
    if (aniversario > e.fechaCorte) break
    eventos.push({
      fecha: aniversario,
      orden: 2,
      aplicar: () => {
        const dias = diasAdicionalesAnio(n, aniversario, params)
        const sdi = D(e.salarioIntegralDelMes(anioDe(aniversario), mesDe(aniversario)))
        const monto = r2(dias.times(sdi))
        saldoG = saldoG.plus(monto)
        totalB = totalB.plus(monto)
        push({ fecha: aniversario, tipo: 'DIAS_ADICIONALES', dias, salarioIntegralDiario: sdi, monto, nota: `LOTTT Art. 142 lit. b — año ${n}` })
      },
    })
  }
  for (const a of e.anticipos ?? []) {
    eventos.push({
      fecha: a.fecha,
      orden: 3,
      aplicar: () => {
        const v = validarAnticipo(a.monto, totalA.plus(totalB), totalAnt, a.fecha, params)
        if (!v.valor.permitido) throw new ErrorMotor('ANTICIPO_EXCEDE_TOPE', v.alertas[0]!.mensaje)
        saldoG = saldoG.minus(a.monto)
        totalAnt = totalAnt.plus(a.monto)
        push({ fecha: a.fecha, tipo: 'ANTICIPO', monto: D(a.monto).neg(), nota: 'LOTTT Art. 144' })
      },
    })
  }
  if (e.calcularIntereses) {
    let f = ultimoDiaMes(anioDe(e.fechaIngreso), mesDe(e.fechaIngreso))
    while (f <= e.fechaCorte) {
      const finMes = f
      eventos.push({
        fecha: finMes,
        orden: 4, // después de los depósitos del mismo día
        aplicar: () => {
          if (saldoG.lte(0)) return
          const tasa = params.valor(P.TASA_INTERES_PRESTACIONES_PCT, finMes)
          const interes = r2(pct(saldoG, tasa).div(12))
          if (criterios.interesesPrestaciones === 'CAPITALIZAR') saldoG = saldoG.plus(interes)
          else saldoI = saldoI.plus(interes)
          push({ fecha: finMes, tipo: 'INTERES', tasaAnualPct: tasa, monto: interes, nota: `LOTTT Art. 143 — ${criterios.interesesPrestaciones.toLowerCase()}` })
        },
      })
      f = ultimoDiaMes(anioDe(sumarDias(finMes, 1)), mesDe(sumarDias(finMes, 1)))
    }
  }
  eventos.sort((x, y) => (x.fecha === y.fecha ? x.orden - y.orden : x.fecha < y.fecha ? -1 : 1))
  for (const ev of eventos) ev.aplicar()
  return { movimientos, totalGarantia: totalA, totalDiasAdicionales: totalB, totalAnticipos: totalAnt, saldoGarantia: saldoG, saldoIntereses: saldoI, alertas }
}

/**
 * Art. 144: anticipos hasta el 75 % de lo depositado (a + b), acumulando
 * los anticipos previos.
 */
export function validarAnticipo(monto: Num, totalDepositado: Num, anticiposPrevios: Num, fecha: Fecha, params: ParametrosVigentes): Resultado<{ permitido: boolean; disponible: Decimal }> {
  const topePct = params.valor(P.PREST_ANTICIPO_MAX_PCT, fecha)
  const disponible = r2(pct(totalDepositado, topePct).minus(anticiposPrevios))
  const permitido = D(monto).gt(0) && D(monto).lte(disponible)
  return {
    valor: { permitido, disponible },
    desglose: [
      { descripcion: `Tope ${fmt(topePct, 0)} % de lo depositado`, formula: `${fmt(totalDepositado)} × ${fmt(topePct, 0)} % − anticipos previos ${fmt(anticiposPrevios)}`, valor: fmt(disponible) },
    ],
    baseLegal: ['LOTTT Art. 144'],
    alertas: permitido ? [] : [{ nivel: 'BLOQUEANTE', codigo: 'ANTICIPO_EXCEDE_TOPE', mensaje: `El anticipo de ${fmt(monto)} excede el disponible de ${fmt(disponible)} (LOTTT Art. 144).` }],
  }
}

/**
 * Literal c: 30 días de salario integral por cada año de servicio o fracción
 * superior a 6 meses, calculado con el último salario integral.
 */
export function retroactivo(fechaIngreso: Fecha, fechaEgreso: Fecha, ultimoSalarioIntegralDiario: Num, params: ParametrosVigentes): Resultado<{ anios: number; dias: Decimal; monto: Decimal }> {
  const ant = antiguedad(fechaIngreso, fechaEgreso)
  const fraccionMeses = params.valor(P.PREST_RETRO_FRACCION_MESES, fechaEgreso).toNumber()
  // "Fracción superior a seis meses": 6 meses exactos no cuentan; 6 meses y 1 día sí.
  const fraccionCuenta = ant.meses > fraccionMeses || (ant.meses === fraccionMeses && ant.dias > 0)
  const anios = ant.anios + (fraccionCuenta ? 1 : 0)
  const dias = params.valor(P.PREST_RETRO_DIAS_POR_ANIO, fechaEgreso).times(anios)
  const monto = r2(dias.times(ultimoSalarioIntegralDiario))
  return {
    valor: { anios, dias, monto },
    desglose: [
      { descripcion: 'Antigüedad', valor: `${ant.anios} años, ${ant.meses} meses, ${ant.dias} días` },
      { descripcion: `Años computables (fracción > ${fraccionMeses} meses cuenta como año)`, valor: String(anios) },
      { descripcion: 'Retroactivo', formula: `${fmt(dias, 0)} días × ${fmt(ultimoSalarioIntegralDiario, 6)}`, valor: fmt(monto) },
    ],
    baseLegal: ['LOTTT Art. 142 lit. c'],
    alertas: [],
  }
}

/** Literal e: relación de menos de 3 meses → 5 días de salario por mes trabajado o fracción. */
export function menosDeTresMeses(fechaIngreso: Fecha, fechaEgreso: Fecha, salarioDiario: Num, params: ParametrosVigentes): Resultado<{ aplica: boolean; meses: number; dias: Decimal; monto: Decimal }> {
  const ant = antiguedad(fechaIngreso, fechaEgreso)
  const limite = params.valor(P.PREST_MENOS_3M_LIMITE_MESES, fechaEgreso).toNumber()
  const aplica = ant.mesesTotales < limite
  const meses = ant.mesesTotales + (ant.dias > 0 ? 1 : 0)
  const dias = aplica ? params.valor(P.PREST_MENOS_3M_DIAS_POR_MES, fechaEgreso).times(meses) : D(0)
  const monto = r2(dias.times(salarioDiario))
  return {
    valor: { aplica, meses, dias, monto },
    desglose: aplica
      ? [{ descripcion: `Menos de ${limite} meses: ${meses} mes(es) o fracción`, formula: `${fmt(dias, 0)} días × ${fmt(salarioDiario, 6)}`, valor: fmt(monto) }]
      : [{ descripcion: `Relación de ${limite} meses o más: no aplica literal e`, valor: '0,00' }],
    baseLegal: ['LOTTT Art. 142 lit. e'],
    alertas: [],
  }
}

export interface ComparacionPrestaciones {
  literalAB: Decimal
  literalC: Decimal
  literalE: Decimal
  aplicado: 'AB' | 'C' | 'E'
  pagadero: Decimal
  detalleAB: { garantia: Decimal; diasAdicionales: Decimal; trimestreEnCurso: Decimal }
}

/**
 * Regla de oro (lit. d): se paga el mayor entre la garantía depositada (a + b)
 * y el retroactivo (c). Si la relación duró menos de 3 meses aplica el lit. e.
 * Se devuelven ambos cálculos para mostrarlos lado a lado.
 */
export function compararPrestaciones(
  entrada: {
    fechaIngreso: Fecha
    fechaEgreso: Fecha
    garantiaDepositada: Num
    diasAdicionalesDepositados: Num
    ultimoSalarioIntegralDiario: Num
    ultimoSalarioNormalDiario: Num
  },
  params: ParametrosVigentes,
  criterios: Pick<CriteriosEmpresa, 'trimestreGarantia' | 'abonarTrimestreEnCursoAlEgreso' | 'salarioLiteralE'>,
): Resultado<ComparacionPrestaciones> {
  const desglose: Paso[] = []
  const e = menosDeTresMeses(entrada.fechaIngreso, entrada.fechaEgreso, criterios.salarioLiteralE === 'INTEGRAL' ? entrada.ultimoSalarioIntegralDiario : entrada.ultimoSalarioNormalDiario, params)
  // Trimestre en curso: "el derecho se adquiere desde el momento de iniciar el trimestre" (lit. a).
  let trimestreEnCurso = D(0)
  if (criterios.abonarTrimestreEnCursoAlEgreso && !e.valor.aplica) {
    const cierres = cierresTrimestre(entrada.fechaIngreso, entrada.fechaEgreso, criterios.trimestreGarantia)
    const ultimoCierre = cierres[cierres.length - 1]
    if (ultimoCierre !== entrada.fechaEgreso) {
      trimestreEnCurso = garantiaTrimestral(entrada.ultimoSalarioIntegralDiario, entrada.fechaEgreso, params).valor.monto
      desglose.push({ descripcion: 'Trimestre en curso al egreso (lit. a)', valor: fmt(trimestreEnCurso) })
    }
  }
  const ab = r2(D(entrada.garantiaDepositada).plus(entrada.diasAdicionalesDepositados).plus(trimestreEnCurso))
  const c = retroactivo(entrada.fechaIngreso, entrada.fechaEgreso, entrada.ultimoSalarioIntegralDiario, params)
  let aplicado: ComparacionPrestaciones['aplicado']
  let pagadero: Decimal
  if (e.valor.aplica) {
    aplicado = 'E'
    pagadero = e.valor.monto
  } else if (c.valor.monto.gt(ab)) {
    aplicado = 'C'
    pagadero = c.valor.monto
  } else {
    aplicado = 'AB'
    pagadero = ab
  }
  desglose.push(
    { descripcion: 'Literal a + b (garantía depositada + días adicionales)', formula: `${fmt(entrada.garantiaDepositada)} + ${fmt(entrada.diasAdicionalesDepositados)} + ${fmt(trimestreEnCurso)}`, valor: fmt(ab) },
    ...c.desglose,
    ...e.desglose,
    { descripcion: `Se paga: literal ${aplicado === 'AB' ? 'a + b' : aplicado.toLowerCase()}`, valor: fmt(pagadero) },
  )
  return {
    valor: { literalAB: ab, literalC: c.valor.monto, literalE: e.valor.monto, aplicado, pagadero, detalleAB: { garantia: D(entrada.garantiaDepositada), diasAdicionales: D(entrada.diasAdicionalesDepositados), trimestreEnCurso } },
    desglose,
    baseLegal: ['LOTTT Art. 142 lit. a', 'LOTTT Art. 142 lit. b', 'LOTTT Art. 142 lit. c', 'LOTTT Art. 142 lit. d', 'LOTTT Art. 142 lit. e'],
    alertas: [],
  }
}

/** Fecha límite de pago: 5 días siguientes al egreso (lit. f). */
export const fechaLimitePago = (fechaEgreso: Fecha, params: ParametrosVigentes): Fecha =>
  sumarDias(fechaEgreso, params.valor(P.LIQUIDACION_PLAZO_DIAS, fechaEgreso).toNumber())

/**
 * Intereses de mora (LOTTT Art. 142 lit. f y Art. 128) si se paga después de
 * la fecha límite: monto × tasa anual × días de mora ÷ 365.
 */
export function interesesMora(monto: Num, fechaLimite: Fecha, fechaPago: Fecha, params: ParametrosVigentes): Resultado {
  if (fechaPago <= fechaLimite) return { valor: D(0), desglose: [{ descripcion: 'Pago dentro del plazo: sin mora', valor: '0,00' }], baseLegal: ['LOTTT Art. 142 lit. f'], alertas: [] }
  const dias = diasEntre(fechaLimite, fechaPago)
  const tasa = params.valor(P.TASA_INTERES_MORA_PCT, fechaPago)
  const interes = r2(pct(monto, tasa).times(dias).div(365))
  return {
    valor: interes,
    desglose: [{ descripcion: `Mora de ${dias} días a ${fmt(tasa, 2)} % anual`, formula: `${fmt(monto)} × ${fmt(tasa, 2)} % × ${dias} ÷ 365`, valor: fmt(interes) }],
    baseLegal: ['LOTTT Art. 142 lit. f', 'LOTTT Art. 128'],
    alertas: [{ nivel: 'ADVERTENCIA', codigo: 'PAGO_EN_MORA', mensaje: `Pago ${dias} días después del plazo legal (${fechaLimite}).` }],
  }
}
