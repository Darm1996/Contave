import { describe, expect, it } from 'vitest'
import {
  C,
  calcularLiquidacion,
  calcularRecibo,
  calcularUtilidades,
  CONCEPTOS_PREDEFINIDOS,
  licenciaMaternidad,
  licenciaPaternidad,
  P,
  pensionesMensual,
  resumenMensual,
  type EntradaLiquidacion,
  type EntradaRecibo,
} from '../src/engine'
import { crearParams, criterios, prueba, s } from './helpers'

const params = crearParams()

const reciboBase = (cambios: Partial<EntradaRecibo> = {}): EntradaRecibo => ({
  trabajador: { id: 'T1', fechaIngreso: '2025-01-01', tipoJornada: 'DIURNA', salarioMensual: 3000, moneda: 'VES' },
  periodo: { desde: '2026-06-01', hasta: '2026-06-30', fechaPago: '2026-06-30', frecuencia: 'MENSUAL', tasaBCV: 100 },
  novedades: [{ concepto: C.HORAS_EXTRA, cantidad: 4 }],
  conceptos: CONCEPTOS_PREDEFINIDOS,
  riesgoIVSS: 'MINIMO',
  formulariosARI: [{ anio: 2026, variacion: 'INICIAL', fechaPresentacion: '2026-01-15', remuneracionEstimadaAnual: 36000, porcentajeRetencion: 2 }],
  pagaCestaticket: true,
  criterios: criterios(),
  ...cambios,
})

const linea = (r: ReturnType<typeof calcularRecibo>, codigo: string) => r.lineas.find((l) => l.codigo === codigo)

describe('Recibo de nómina mensual', () => {
  const r = calcularRecibo(reciboBase(), params)

  it('asignaciones: sueldo, horas extra y cestaticket en Bs. a tasa BCV', () => {
    expect(s(linea(r, C.SUELDO)!.montoVES)).toBe('3000.00')
    expect(s(linea(r, C.HORAS_EXTRA)!.montoVES)).toBe('75.00')
    const ct = linea(r, C.CESTATICKET)!
    expect(ct.monedaOrigen).toBe('USD')
    expect(s(ct.montoOrigen)).toBe('40.00')
    expect(s(ct.montoVES)).toBe('4000.00')
    expect(s(r.totalAsignaciones)).toBe('7075.00')
  })

  it('el cestaticket no entra en IVSS, FAOV ni ISLR, pero sí en pensiones', () => {
    expect(s(r.bases.ivssRpeMensual)).toBe('3075.00')
    expect(s(r.bases.islr)).toBe('3075.00')
    expect(s(r.bases.pensiones)).toBe('7075.00')
    expect(s(r.bases.faov)).toBe('3469.44') // 3.075 + alícuotas (4,4444 + 8,7037) × 30
  })

  it('deducciones: IVSS y RPE por 5 lunes con tope, FAOV integral, ISLR según AR-I', () => {
    expect(s(linea(r, C.IVSS_TRABAJADOR)!.montoVES)).toBe('30.00')
    expect(s(linea(r, C.RPE_TRABAJADOR)!.montoVES)).toBe('7.50')
    expect(s(linea(r, C.FAOV_TRABAJADOR)!.montoVES)).toBe('34.69')
    expect(s(linea(r, C.ISLR_RETENCION)!.montoVES)).toBe('61.50')
    expect(s(r.totalDeducciones)).toBe('133.69')
    expect(s(r.neto)).toBe('6941.31')
    expect(s(r.netoUSD)).toBe('69.41')
  })

  it('aportes patronales fuera del neto', () => {
    expect(s(linea(r, C.IVSS_PATRONAL)!.montoVES)).toBe('67.50')
    expect(s(linea(r, C.RPE_PATRONAL)!.montoVES)).toBe('30.00')
    expect(s(linea(r, C.FAOV_PATRONAL)!.montoVES)).toBe('69.39')
    expect(s(r.totalAportesPatronales)).toBe('166.89')
  })

  it('cada línea guarda snapshot de banderas, tasa y desglose; avisa parámetros sin verificar', () => {
    const l = linea(r, C.CESTATICKET)!
    expect(l.banderas.base_pensiones).toBe(true)
    expect(l.tasaBCV.toString()).toBe('100')
    expect(l.desglose.length).toBeGreaterThan(0)
    expect(r.alertas.some((a) => a.codigo === 'PARAMETRO_SIN_VERIFICAR')).toBe(true)
  })

  it('faltas injustificadas descuentan sueldo y cestaticket proporcional (criterio A13)', () => {
    const f = calcularRecibo(reciboBase({ novedades: [{ concepto: C.FALTA_INJUSTIFICADA, cantidad: 2 }] }), params)
    expect(s(linea(f, C.FALTA_INJUSTIFICADA)!.montoVES)).toBe('200.00')
    expect(s(linea(f, C.CESTATICKET)!.montoVES)).toBe('3733.33') // (40 − 40 ÷ 30 × 2) × 100
    expect(s(f.bases.ivssRpeMensual)).toBe('2800.00')
  })

  it('salario en USD indexado se convierte a la tasa de la fecha de pago', () => {
    const u = calcularRecibo(reciboBase({ trabajador: { id: 'T2', fechaIngreso: '2025-01-01', tipoJornada: 'DIURNA', salarioMensual: 50, moneda: 'USD' }, novedades: [] }), params)
    expect(s(linea(u, C.SUELDO)!.montoOrigen)).toBe('50.00')
    expect(s(linea(u, C.SUELDO)!.montoVES)).toBe('5000.00')
  })

  it('ingreso a mitad de mes: sueldo e IVSS solo por los días y lunes activos', () => {
    const n = calcularRecibo(reciboBase({ trabajador: { id: 'T3', fechaIngreso: '2026-06-16', tipoJornada: 'DIURNA', salarioMensual: 3000, moneda: 'VES' }, novedades: [] }), params)
    expect(s(linea(n, C.SUELDO)!.montoVES)).toBe('1500.00')
    expect(linea(n, C.IVSS_TRABAJADOR)!.cantidad).toBe('2') // lunes 22 y 29
    expect(s(linea(n, C.CESTATICKET)!.montoVES)).toBe('2000.00')
  })

  it('cambio del cestaticket a mitad de mes se prorratea por días', () => {
    const p = crearParams([prueba(P.CESTATICKET_MENSUAL, '40', 'USD', '2026-01-01', '2026-06-15'), prueba(P.CESTATICKET_MENSUAL, '60', 'USD', '2026-06-16')], [P.CESTATICKET_MENSUAL])
    const c = calcularRecibo(reciboBase({ novedades: [] }), p)
    expect(s(linea(c, C.CESTATICKET)!.montoOrigen)).toBe('50.00')
  })

  it('quincenal: media quincena de sueldo y lunes de la quincena', () => {
    const q = calcularRecibo(reciboBase({ periodo: { desde: '2026-06-01', hasta: '2026-06-15', fechaPago: '2026-06-15', frecuencia: 'QUINCENAL', tasaBCV: 100 }, novedades: [] }), params)
    expect(s(linea(q, C.SUELDO)!.montoVES)).toBe('1500.00')
    expect(s(linea(q, C.IVSS_TRABAJADOR)!.montoVES)).toBe('18.00') // 3 lunes × 150 × 4 %
  })

  it('sin AR-I no retiene ISLR y alerta', () => {
    const x = calcularRecibo(reciboBase({ formulariosARI: [] }), params)
    expect(linea(x, C.ISLR_RETENCION)).toBeUndefined()
    expect(x.alertas.some((a) => a.codigo === 'SIN_ARI')).toBe(true)
  })
})

describe('Declaraciones mensuales', () => {
  it('consolida IVSS/RPE/FAOV y calcula pensiones con mínimo por trabajador', () => {
    const r1 = calcularRecibo(reciboBase(), params)
    const r2 = calcularRecibo(reciboBase({ trabajador: { id: 'T2', fechaIngreso: '2025-01-01', tipoJornada: 'DIURNA', salarioMensual: 1000, moneda: 'VES' }, novedades: [], pagaCestaticket: false }), params)
    const res = resumenMensual([r1, r2])
    expect(s(res.ivss.trabajador)).toBe('60.00') // 30 + 30 (1.000 también supera el tope de 650)
    const pen = pensionesMensual(
      [
        { trabajadorId: 'T1', fechaIngreso: '2025-01-01', fechaEgreso: null, recibos: [r1] },
        { trabajadorId: 'T2', fechaIngreso: '2025-01-01', fechaEgreso: null, recibos: [r2] },
      ],
      { desde: '2026-06-01', hasta: '2026-06-30', tasaBCVCierre: 100 },
      { exoneradaRNE: false, rneVence: null },
      params,
      criterios(),
    )
    expect(pen.valor.detalle.map((d) => s(d.base))).toEqual(['24000.00', '24000.00'])
    expect(s(pen.valor.total)).toBe('4320.00')
  })
})

describe('Utilidades', () => {
  it('año completo con retención INCES', () => {
    const u = calcularUtilidades({ inicioEjercicio: '2026-01-01', finEjercicio: '2026-12-31', fechaIngreso: '2020-01-01', fechaEgreso: null, salarioNormalDevengado: 36000, ultimoSalarioMensual: 3000 }, params, criterios())
    expect(s(u.valor.monto)).toBe('3000.00')
    expect(s(u.valor.retencionINCES)).toBe('15.00')
  })
  it('fraccionadas por meses completos y aviso si el último salario da más', () => {
    const u = calcularUtilidades({ inicioEjercicio: '2026-01-01', finEjercicio: '2026-12-31', fechaIngreso: '2026-04-01', fechaEgreso: null, salarioNormalDevengado: 27000, ultimoSalarioMensual: 4000 }, params, criterios())
    expect(u.valor.mesesCompletos).toBe(9)
    expect(s(u.valor.diasCorrespondientes, 1)).toBe('22.5')
    expect(s(u.valor.monto)).toBe('2250.00')
    expect(u.alertas[0]!.codigo).toBe('UTILIDADES_ULTIMO_SALARIO_MAYOR')
    const mayor = calcularUtilidades({ inicioEjercicio: '2026-01-01', finEjercicio: '2026-12-31', fechaIngreso: '2026-04-01', fechaEgreso: null, salarioNormalDevengado: 27000, ultimoSalarioMensual: 4000 }, params, criterios({ baseUtilidades: 'EL_MAYOR' }))
    expect(s(mayor.valor.monto)).toBe('3000.00')
  })
})

describe('Liquidación', () => {
  const base: EntradaLiquidacion = {
    fechaIngreso: '2023-01-01',
    fechaEgreso: '2026-06-30',
    motivo: 'DESPIDO_INJUSTIFICADO',
    ultimoSalarioMensual: 3000,
    garantiaDepositada: 12000,
    diasAdicionalesDepositados: 680,
    interesesPendientes: 500,
    anticiposOtorgados: 0,
    aniosVacacionesPendientes: [3],
    utilidades: { inicioEjercicio: '2026-01-01', finEjercicio: '2026-12-31', salarioNormalDevengado: 18000, yaPagadas: 0 },
    inamovilidades: [],
  }

  it('despido injustificado: indemnización Art. 92 como línea separada igual a las prestaciones', () => {
    const r = calcularLiquidacion(base, params, criterios())
    const montos = Object.fromEntries(r.valor.lineas.map((l) => [l.concepto, s(l.monto)]))
    expect(r.valor.prestaciones.aplicado).toBe('AB')
    expect(s(r.valor.prestaciones.literalC)).toBe('10237.50') // 3 años × 30 × 113,75
    expect(montos['Indemnización por despido injustificado']).toBe('13180.00') // 12.680 + 500 de intereses (criterio A11)
    expect(montos['Vacaciones fraccionadas']).toBe('900.00') // (18 ÷ 12) × 6 × 100
    expect(montos['Utilidades fraccionadas']).toBe('1500.00')
    expect(montos['INCES 0,5 % sobre utilidades']).toBe('7.50')
    expect(s(r.valor.totalAsignaciones)).toBe('33060.00')
    expect(s(r.valor.neto)).toBe('33052.50')
    expect(r.valor.fechaLimitePago).toBe('2026-07-05')
  })

  it('renuncia: sin indemnización Art. 92', () => {
    const r = calcularLiquidacion({ ...base, motivo: 'RENUNCIA' }, params, criterios())
    expect(r.valor.lineas.some((l) => l.baseLegal === 'LOTTT Art. 92')).toBe(false)
  })

  it('trabajadora inamovible: el despido queda bloqueado', () => {
    const { inamovilidad } = licenciaMaternidad('2026-03-01', params)
    expect(inamovilidad.hasta).toBe('2028-03-01')
    const r = calcularLiquidacion({ ...base, inamovilidades: [inamovilidad] }, params, criterios())
    expect(r.valor.bloqueada).toBe(true)
    expect(r.alertas[0]).toMatchObject({ nivel: 'BLOQUEANTE', codigo: 'TRABAJADOR_INAMOVIBLE' })
    const renuncia = calcularLiquidacion({ ...base, motivo: 'RENUNCIA', inamovilidades: [inamovilidad] }, params, criterios())
    expect(renuncia.valor.bloqueada).toBe(false)
  })

  it('licencia de paternidad de 14 días con inamovilidad', () => {
    const p = licenciaPaternidad('2026-08-10', params)
    expect(p.licencia.hasta).toBe('2026-08-23')
    expect(p.inamovilidad.hasta).toBe('2028-08-10')
  })

  it('pago fuera del plazo: intereses de mora (requiere su tasa)', () => {
    expect(() => calcularLiquidacion({ ...base, fechaPago: '2026-07-20' }, params, criterios())).toThrow(/TASA_INTERES_MORA_PCT/)
    const p = crearParams([prueba(P.TASA_INTERES_MORA_PCT, '36.5', 'PORCENTAJE')])
    const r = calcularLiquidacion({ ...base, fechaPago: '2026-07-15' }, p, criterios())
    expect(s(r.valor.interesesMora)).toBe('330.53') // 33.052,50 × 36,5 % × 10 ÷ 365
    expect(calcularLiquidacion({ ...base, fechaPago: '2026-07-05' }, p, criterios()).valor.interesesMora.isZero()).toBe(true)
  })
})
