import { describe, expect, it } from 'vitest'
import { cierresTrimestre, compararPrestaciones, diasAdicionalesAnio, libroPrestaciones, menosDeTresMeses, P, retroactivo, validarAnticipo } from '../src/engine'
import { crearParams, criterios, prueba, s } from './helpers'

const params = crearParams()

describe('Prestaciones sociales (LOTTT Art. 142)', () => {
  it('literal b: 2 días por año desde el segundo, acumulativos, tope 30', () => {
    expect(diasAdicionalesAnio(1, '2026-01-01', params).toNumber()).toBe(0)
    expect(diasAdicionalesAnio(2, '2026-01-01', params).toNumber()).toBe(2)
    expect(diasAdicionalesAnio(3, '2026-01-01', params).toNumber()).toBe(4)
    expect(diasAdicionalesAnio(17, '2026-01-01', params).toNumber()).toBe(30)
  })

  it('trimestres de servicio vs. calendario (criterio A2)', () => {
    expect(cierresTrimestre('2024-02-15', '2024-12-31', 'SERVICIO')).toEqual(['2024-05-14', '2024-08-14', '2024-11-14'])
    expect(cierresTrimestre('2024-02-15', '2024-12-31', 'CALENDARIO')).toEqual(['2024-03-31', '2024-06-30', '2024-09-30', '2024-12-31'])
  })

  it('literal c: egreso con 6 meses y 1 día cuenta un año (30 días); 6 meses exactos no', () => {
    expect(retroactivo('2025-01-15', '2025-07-15', 100, params).valor.anios).toBe(1)
    expect(s(retroactivo('2025-01-15', '2025-07-15', 100, params).valor.monto)).toBe('3000.00')
    expect(retroactivo('2025-01-15', '2025-07-14', 100, params).valor.anios).toBe(0)
  })

  it('literal e: menos de 3 meses → 5 días por mes o fracción', () => {
    const r = menosDeTresMeses('2026-01-10', '2026-03-05', 100, params) // 1 mes y 24 días → 2 meses
    expect(r.valor.aplica).toBe(true)
    expect(s(r.valor.monto)).toBe('1000.00')
    expect(menosDeTresMeses('2026-01-10', '2026-04-09', 100, params).valor.aplica).toBe(false)
  })

  it('regla de oro (lit. d): se paga el mayor y se muestran ambos', () => {
    const base = { fechaIngreso: '2023-01-01', fechaEgreso: '2026-06-30', ultimoSalarioIntegralDiario: 113.75, ultimoSalarioNormalDiario: 100 }
    const gana_c = compararPrestaciones({ ...base, garantiaDepositada: 5000, diasAdicionalesDepositados: 0 }, params, criterios())
    expect(gana_c.valor.aplicado).toBe('C')
    expect(s(gana_c.valor.literalC)).toBe('10237.50') // 3 años × 30 días × 113,75
    expect(s(gana_c.valor.literalAB)).toBe('5000.00')
    const gana_ab = compararPrestaciones({ ...base, garantiaDepositada: 12000, diasAdicionalesDepositados: 680 }, params, criterios())
    expect(gana_ab.valor.aplicado).toBe('AB')
    expect(s(gana_ab.valor.pagadero)).toBe('12680.00')
  })

  it('egreso a mitad de trimestre abona el trimestre en curso (criterio configurable)', () => {
    const base = { fechaIngreso: '2026-01-01', fechaEgreso: '2026-05-10', garantiaDepositada: 1500, diasAdicionalesDepositados: 0, ultimoSalarioIntegralDiario: 100, ultimoSalarioNormalDiario: 90 }
    expect(s(compararPrestaciones(base, params, criterios()).valor.literalAB)).toBe('3000.00')
    expect(s(compararPrestaciones(base, params, criterios({ abonarTrimestreEnCursoAlEgreso: false })).valor.literalAB)).toBe('1500.00')
  })

  it('trabajador con menos de 3 meses: aplica literal e', () => {
    const r = compararPrestaciones(
      { fechaIngreso: '2026-04-01', fechaEgreso: '2026-05-20', garantiaDepositada: 0, diasAdicionalesDepositados: 0, ultimoSalarioIntegralDiario: 110, ultimoSalarioNormalDiario: 100 },
      params,
      criterios(),
    )
    expect(r.valor.aplicado).toBe('E')
    expect(s(r.valor.pagadero)).toBe('1100.00') // 2 meses (1 mes + fracción) × 5 días × 110 (integral)
  })
})

describe('Libro auxiliar de prestaciones', () => {
  const salarioConstante = () => 100

  it('depósitos trimestrales y días adicionales al cumplir el segundo año', () => {
    const libro = libroPrestaciones({ fechaIngreso: '2024-01-01', fechaCorte: '2026-01-15', salarioIntegralDelMes: salarioConstante, calcularIntereses: false }, params, criterios())
    expect(libro.movimientos.filter((m) => m.tipo === 'GARANTIA_TRIMESTRAL')).toHaveLength(8)
    expect(s(libro.totalGarantia)).toBe('12000.00')
    expect(s(libro.totalDiasAdicionales)).toBe('200.00') // año 2 → 2 días × 100
    expect(s(libro.saldoGarantia)).toBe('12200.00')
  })

  it('intereses mensuales: falta la tasa BCV → se detiene; con tasa capitaliza', () => {
    expect(() => libroPrestaciones({ fechaIngreso: '2026-01-01', fechaCorte: '2026-06-30', salarioIntegralDelMes: salarioConstante, calcularIntereses: true }, params, criterios())).toThrow(/TASA_INTERES_PRESTACIONES_PCT/)
    const p = crearParams([prueba(P.TASA_INTERES_PRESTACIONES_PCT, '12', 'PORCENTAJE')])
    const libro = libroPrestaciones({ fechaIngreso: '2026-01-01', fechaCorte: '2026-04-30', salarioIntegralDelMes: salarioConstante, calcularIntereses: true }, p, criterios())
    const intereses = libro.movimientos.filter((m) => m.tipo === 'INTERES').map((m) => s(m.monto))
    expect(intereses).toEqual(['15.00', '15.15']) // 31-mar: 1.500 × 1 %; 30-abr: 1.515 × 1 %
    expect(s(libro.saldoGarantia)).toBe('1530.15')
  })

  it('anticipos: hasta el 75 % de lo depositado (Art. 144)', () => {
    expect(validarAnticipo(900, 1500, 0, '2026-04-01', params).valor.permitido).toBe(true)
    expect(validarAnticipo(1200, 1500, 0, '2026-04-01', params).valor.permitido).toBe(false)
    expect(validarAnticipo(300, 1500, 900, '2026-04-01', params).valor.permitido).toBe(false) // disponible 225
    expect(() =>
      libroPrestaciones({ fechaIngreso: '2026-01-01', fechaCorte: '2026-05-01', salarioIntegralDelMes: salarioConstante, calcularIntereses: false, anticipos: [{ fecha: '2026-04-15', monto: 2000 }] }, params, criterios()),
    ).toThrow(/excede/)
    const ok = libroPrestaciones({ fechaIngreso: '2026-01-01', fechaCorte: '2026-05-01', salarioIntegralDelMes: salarioConstante, calcularIntereses: false, anticipos: [{ fecha: '2026-04-15', monto: 1000 }] }, params, criterios())
    expect(s(ok.saldoGarantia)).toBe('500.00')
  })
})
