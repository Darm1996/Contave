import { describe, expect, it } from 'vitest'
import { agregarVigencia, contribucionPensiones, faov, incesPatronalTrimestral, incesUtilidades, ivss, lopcymat, P, ParametrosVigentes, rpe } from '../src/engine'
import { BASE_PRUEBA, crearParams, EMPRESA, prueba, s } from './helpers'

const params = crearParams()

describe('IVSS y RPE por lunes', () => {
  it('mes con 5 lunes cotiza 5 semanas (junio 2026) y uno con 4 cotiza 4 (mayo 2026)', () => {
    // Salario 500 < tope de 650 (5 × 130): semanal = 500 × 12 ÷ 52
    const junio = ivss(500, '2026-06-01', '2026-06-30', 'MINIMO', params)
    expect(junio.valor.lunes).toBe(5)
    expect(s(junio.valor.trabajador)).toBe('23.08') // 115,3846 × 4 % × 5
    expect(s(junio.valor.patronal)).toBe('51.92') // 115,3846 × 9 % × 5
    const mayo = ivss(500, '2026-05-01', '2026-05-31', 'MINIMO', params)
    expect(s(mayo.valor.trabajador)).toBe('18.46')
  })

  it('salario sobre el tope: IVSS cotiza sobre 5 SM y RPE sobre 10 SM', () => {
    const i = ivss(3000, '2026-05-01', '2026-05-31', 'MAXIMO', params)
    expect(s(i.valor.trabajador)).toBe('24.00') // 650 × 12 ÷ 52 = 150 × 4 % × 4
    expect(s(i.valor.patronal)).toBe('66.00') // 150 × 11 % × 4
    expect(i.alertas[0]!.codigo).toBe('IVSS_TOPE')
    const r = rpe(3000, '2026-05-01', '2026-05-31', params)
    expect(s(r.valor.trabajador)).toBe('6.00') // 1.300 × 12 ÷ 52 = 300 × 0,5 % × 4
    expect(s(r.valor.patronal)).toBe('24.00')
  })

  it('cambio del salario mínimo a mitad de mes: cada lunes usa el tope vigente ese día', () => {
    const p = new ParametrosVigentes(agregarVigencia(BASE_PRUEBA, prueba(P.SALARIO_MINIMO_MENSUAL, '200', 'VES', '2026-06-16')), EMPRESA)
    const r = ivss(3000, '2026-06-01', '2026-06-30', 'MINIMO', p)
    // Lunes 1, 8 y 15: tope 650 → 150 × 4 % × 3 = 18; lunes 22 y 29: tope 1.000 → 230,7692 × 4 % × 2 = 18,4615
    expect(s(r.valor.trabajador)).toBe('36.46')
  })
})

describe('FAOV, INCES, pensiones y LOPCYMAT', () => {
  it('FAOV sobre salario integral sin tope', () => {
    const r = faov(3469.44, '2026-06-30', params)
    expect(s(r.valor.trabajador)).toBe('34.69')
    expect(s(r.valor.patronal)).toBe('69.39')
  })

  it('INCES patronal solo con 5 o más trabajadores', () => {
    expect(s(incesPatronalTrimestral(90000, 4, '2026-06-30', params).valor)).toBe('0.00')
    expect(s(incesPatronalTrimestral(90000, 5, '2026-06-30', params).valor)).toBe('1800.00')
    expect(s(incesUtilidades(3000, '2026-12-15', params).valor)).toBe('15.00')
  })

  const basePensiones = { tasaBCV: 100, diasActivo: 30, diasMes: 30, exoneradaRNE: false, rneVence: null, criterioMinimo: 'COMPLETO' as const }
  it('pensiones: si lo pagado es menor al ingreso mínimo integral se usa el mínimo', () => {
    const r = contribucionPensiones({ ...basePensiones, pagadoMes: 5000 }, '2026-06-30', params)
    expect(s(r.valor.base)).toBe('24000.00') // 240 USD × 100
    expect(s(r.valor.contribucion)).toBe('2160.00')
    expect(s(contribucionPensiones({ ...basePensiones, pagadoMes: 30000 }, '2026-06-30', params).valor.contribucion)).toBe('2700.00')
  })
  it('pensiones: mínimo prorrateado (criterio A5) y exoneración RNE con vencimiento', () => {
    expect(s(contribucionPensiones({ ...basePensiones, pagadoMes: 0, diasActivo: 15, criterioMinimo: 'PRORRATEADO' }, '2026-06-30', params).valor.base)).toBe('12000.00')
    expect(s(contribucionPensiones({ ...basePensiones, pagadoMes: 0, exoneradaRNE: true, rneVence: '2026-12-31' }, '2026-06-30', params).valor.contribucion)).toBe('0.00')
    const vencida = contribucionPensiones({ ...basePensiones, pagadoMes: 0, exoneradaRNE: true, rneVence: '2026-05-31' }, '2026-06-30', params)
    expect(s(vencida.valor.contribucion)).toBe('2160.00')
    expect(vencida.alertas[0]!.codigo).toBe('RNE_VENCIDA')
  })
  it('pensiones: falta el ingreso mínimo antes de su vigencia → se detiene', () => {
    expect(() => contribucionPensiones({ ...basePensiones, pagadoMes: 0 }, '2026-04-30', params)).toThrow(/INGRESO_MINIMO_INTEGRAL/)
  })
  it('LOPCYMAT desactivada por defecto; activa sin parámetro se detiene', () => {
    expect(s(lopcymat(false, 3000, '2026-06-30', params).valor)).toBe('0.00')
    expect(() => lopcymat(true, 3000, '2026-06-30', params)).toThrow(/LOPCYMAT_ALICUOTA_PCT/)
  })
})
