import { describe, it, expect } from 'vitest'
import { calcularRetencionISLR, buscarTarifaISLR, TARIFAS_ISLR, UT_VIGENTE_BS } from '@/lib/contabilidad/islr'

describe('calcularRetencionISLR', () => {
  it('calcula la retención de honorarios profesionales (persona natural, código 01: 1% sobre 90%)', () => {
    const tarifa = buscarTarifaISLR('01')!
    const r = calcularRetencionISLR(10000, tarifa)
    expect(r.aplicaRetencion).toBe(true)
    expect(r.baseImponible).toBe(9000) // 90% de 10000
    expect(r.montoRetenido).toBe(90) // 1% de 9000
  })

  it('no retiene si el pago es menor a 1 UT y la tarifa lo requiere', () => {
    const tarifa = buscarTarifaISLR('01')!
    const r = calcularRetencionISLR(UT_VIGENTE_BS - 1, tarifa)
    expect(r.aplicaRetencion).toBe(false)
    expect(r.montoRetenido).toBe(0)
  })

  it('retiene igual aunque el pago sea menor a 1 UT si la tarifa no lo requiere', () => {
    const tarifa = buscarTarifaISLR('02')! // persona jurídica, requiereUT: true en la tabla real
    // Verificamos consistencia: si requiereUT es false, un pago pequeño igual genera retención
    const tarifaSinUT = { ...tarifa, requiereUT: false }
    const r = calcularRetencionISLR(1, tarifaSinUT)
    expect(r.aplicaRetencion).toBe(true)
  })

  it('no retiene si la tarifa tiene porcentaje 0 (exenta)', () => {
    const tarifaExenta = TARIFAS_ISLR.find((t) => t.porcentaje === 0)!
    const r = calcularRetencionISLR(50000, tarifaExenta)
    expect(r.aplicaRetencion).toBe(false)
    expect(r.montoRetenido).toBe(0)
    expect(r.motivo).toMatch(/exenta/i)
  })

  it('redondea el monto retenido a 2 decimales', () => {
    const tarifa = buscarTarifaISLR('01')!
    const r = calcularRetencionISLR(333.33, tarifa)
    // baseImponible = 299.997, montoRetenido = 1% de eso = 2.99997 -> redondeado a 3.00
    expect(r.montoRetenido).toBeCloseTo(3.0, 2)
  })

  it('buscarTarifaISLR devuelve null para un código inexistente', () => {
    expect(buscarTarifaISLR('99-NO-EXISTE')).toBeNull()
  })
})
