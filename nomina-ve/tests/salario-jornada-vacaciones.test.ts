import { describe, expect, it } from 'vitest'
import {
  antiguedad,
  bonoNocturno,
  calcularFechasVacaciones,
  D,
  diaFeriadoODescansoTrabajado,
  diasBonoVacacional,
  diasDisfruteVacaciones,
  feriadosNacionales,
  horasExtra,
  lunesEnRango,
  P,
  pagoVacaciones,
  salarioIntegral,
  vacacionesFraccionadas,
} from '../src/engine'
import { crearParams, criterios, EMPRESA, prueba, s } from './helpers'

const params = crearParams()

describe('Fechas', () => {
  it('antigüedad: 6 meses exactos vs. 6 meses y 1 día', () => {
    expect(antiguedad('2025-01-15', '2025-07-14')).toMatchObject({ anios: 0, meses: 6, dias: 0 })
    expect(antiguedad('2025-01-15', '2025-07-15')).toMatchObject({ anios: 0, meses: 6, dias: 1 })
  })
  it('cuenta los lunes del mes (junio 2026 tiene 5, mayo 2026 tiene 4)', () => {
    expect(lunesEnRango('2026-06-01', '2026-06-30')).toHaveLength(5)
    expect(lunesEnRango('2026-05-01', '2026-05-31')).toHaveLength(4)
  })
  it('feriados móviles 2026 (Carnaval y Semana Santa desde la Pascua)', () => {
    const f = feriadosNacionales(2026).map((x) => x.fecha)
    expect(f).toEqual(expect.arrayContaining(['2026-02-16', '2026-02-17', '2026-04-02', '2026-04-03', '2026-04-19', '2026-07-05']))
    expect(f).toHaveLength(14)
  })
})

describe('Salario integral (LOTTT Art. 104)', () => {
  // Salario 3.000 → diario 100; año de servicio en curso 2 → 16 días de BV; 30 días de utilidades.
  it('método por defecto: alícuota de utilidades sobre (salario + alícuota BV)', () => {
    const r = salarioIntegral(3000, '2025-01-01', '2026-06-30', params, criterios())
    expect(r.valor.diasBonoVacacional).toBe(16)
    expect(s(r.valor.alicuotaBonoVacacional, 6)).toBe('4.444444')
    expect(s(r.valor.alicuotaUtilidades, 6)).toBe('8.703704') // 104,4444… × 30 ÷ 360
    expect(s(r.valor.salarioDiarioIntegral, 6)).toBe('113.148148')
  })
  it('método alternativo configurable: alícuota de utilidades solo sobre el salario', () => {
    const r = salarioIntegral(3000, '2025-01-01', '2026-06-30', params, criterios({ metodoAlicuotas: 'SOLO_SALARIO' }))
    expect(s(r.valor.salarioDiarioIntegral, 6)).toBe('112.777778')
  })
  it('rechaza días de utilidades fuera del rango legal 30–120', () => {
    const p = crearParams([prueba(P.UTILIDADES_DIAS_EMPRESA, '20', 'DIAS', '2012-05-07', null, EMPRESA)], [P.UTILIDADES_DIAS_EMPRESA])
    expect(() => salarioIntegral(3000, '2025-01-01', '2026-06-30', p, criterios())).toThrow(/entre 30 y 120/)
  })
})

describe('Jornada y recargos', () => {
  it('horas extra con recargo del 50 % (Art. 118)', () => {
    const r = horasExtra(4, 100, 'DIURNA', '2026-06-30', params)
    expect(s(r.valor)).toBe('75.00') // (100 ÷ 8) × 1,5 × 4
    expect(r.alertas).toHaveLength(0)
  })
  it('alerta al superar 10 h semanales o 100 h anuales (Art. 178)', () => {
    const r = horasExtra(8, 100, 'NOCTURNA', '2026-06-30', params, { horasSemanaMax: 12, horasAcumuladasAnio: 95 })
    expect(r.alertas.map((a) => a.codigo)).toEqual(['HORAS_EXTRA_SEMANA', 'HORAS_EXTRA_ANIO'])
    expect(s(r.valor)).toBe(s(D(100).div(7).times(1.5).times(8))) // hora de jornada nocturna (7 h)
  })
  it('bono nocturno del 30 % sobre la hora diurna (Art. 117)', () => {
    expect(s(bonoNocturno(10, 100, '2026-06-30', params).valor)).toBe('37.50')
  })
  it('feriado trabajado: día + 50 % (Art. 120); descanso trabajado alerta el compensatorio (Art. 119)', () => {
    expect(s(diaFeriadoODescansoTrabajado(1, 100, '2026-06-30', params, false).valor)).toBe('150.00')
    expect(diaFeriadoODescansoTrabajado(1, 100, '2026-06-30', params, true).alertas[0]!.codigo).toBe('DESCANSO_COMPENSATORIO')
  })
})

describe('Vacaciones (Arts. 190, 192, 196)', () => {
  it('días de disfrute: 15 + 1 por año, máximo 30', () => {
    expect(diasDisfruteVacaciones(1, '2026-01-01', params)).toBe(15)
    expect(diasDisfruteVacaciones(5, '2026-01-01', params)).toBe(19)
    expect(diasDisfruteVacaciones(20, '2026-01-01', params)).toBe(30)
  })
  it('bono vacacional: 15 + 1 por año hasta 30, más días de política', () => {
    expect(diasBonoVacacional(1, '2026-01-01', params)).toBe(15)
    expect(diasBonoVacacional(16, '2026-01-01', params)).toBe(30)
    expect(diasBonoVacacional(25, '2026-01-01', params)).toBe(30)
    const conPolitica = crearParams([prueba(P.BONO_VAC_DIAS_ADICIONALES_EMPRESA, '5', 'DIAS', '2012-05-07', null, EMPRESA)])
    expect(diasBonoVacacional(1, '2026-01-01', conPolitica)).toBe(20)
  })
  it('fecha de reintegro excluyendo fines de semana y feriados', () => {
    const feriados = [...feriadosNacionales(2026), ...feriadosNacionales(2027)].map((f) => f.fecha)
    const r = calcularFechasVacaciones('2026-12-14', 15, feriados)
    expect(r.ultimoDiaDisfrute).toBe('2027-01-07')
    expect(r.fechaReintegro).toBe('2027-01-08')
    expect(r.diasFeriados).toBe(4) // 24, 25 y 31 dic + 1 ene
    expect(r.diasDescanso).toBe(6)
  })
  it('paga los descansos y feriados dentro del disfrute según criterio A10', () => {
    const con = pagoVacaciones(1, D(100), '2026-12-14', params, 10, true)
    const sin = pagoVacaciones(1, D(100), '2026-12-14', params, 10, false)
    expect(s(con.valor.montoVacaciones)).toBe('2500.00')
    expect(s(sin.valor.montoVacaciones)).toBe('1500.00')
    expect(s(con.valor.montoBono)).toBe('1500.00')
  })
  it('fraccionadas por meses completos desde el último aniversario', () => {
    const r = vacacionesFraccionadas('2024-03-01', '2026-09-15', D(100), params) // 2 años, 6 meses, 15 días
    expect(r.valor.meses).toBe(6)
    expect(s(r.valor.montoVacaciones)).toBe('850.00') // (17 ÷ 12) × 6 × 100
    expect(s(r.valor.montoBono)).toBe('850.00')
  })
})
