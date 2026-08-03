import { describe, it, expect } from 'vitest'
import { validarRIF, validarNCF, calcularIVA, calcularRetencionIVA } from '@/lib/contabilidad/ven-nif'

describe('validarRIF', () => {
  it('acepta un RIF con formato correcto y dígito verificador correcto', () => {
    const r = validarRIF('J-123456789-4')
    expect(r.formatoValido).toBe(true)
    expect(r.digitoVerificadorValido).toBe(true)
    expect(r.normalizado).toBe('J-123456789-4')
  })

  it('marca formatoValido pero digitoVerificadorValido=false si el dígito verificador no cuadra', () => {
    const r = validarRIF('J-123456789-9')
    expect(r.formatoValido).toBe(true)
    expect(r.digitoVerificadorValido).toBe(false)
  })

  it('normaliza RIF con puntos y sin guiones', () => {
    const r = validarRIF('v8.456.723-1')
    expect(r.formatoValido).toBe(true)
    expect(r.normalizado).toBe('V-8456723-1')
  })

  it('rechaza formato inválido', () => {
    expect(validarRIF('X-12345678-9').formatoValido).toBe(false)
    expect(validarRIF('J-123-4').valido).toBe(false)
    expect(validarRIF('').valido).toBe(false)
  })
})

describe('validarNCF', () => {
  it('valida un NCF de factura fiscal y detecta el tipo', () => {
    const r = validarNCF('01001001-00012345')
    expect(r.valido).toBe(true)
    expect(r.tipo).toBe('FACTURA_FISCAL')
  })

  it('valida un NCF de nota de crédito fiscal', () => {
    const r = validarNCF('04000001-00000001')
    expect(r.tipo).toBe('NOTA_CREDITO_FISCAL')
  })

  it('rechaza un NCF con formato incorrecto', () => {
    expect(validarNCF('123').valido).toBe(false)
    expect(validarNCF('').valido).toBe(false)
  })
})

describe('calcularIVA', () => {
  it('calcula el 16% por defecto', () => {
    expect(calcularIVA(1000)).toBe(160)
  })

  it('calcula con alícuota reducida (8%)', () => {
    expect(calcularIVA(1000, 8)).toBe(80)
  })

  it('redondea a 2 decimales', () => {
    expect(calcularIVA(33.33, 16)).toBeCloseTo(5.33, 2)
  })
})

describe('calcularRetencionIVA', () => {
  it('no retiene si la empresa no es agente de retención', () => {
    const r = calcularRetencionIVA(1000, false)
    expect(r.monto).toBeNull()
  })

  it('retiene 75% para contraparte contribuyente ordinario', () => {
    const r = calcularRetencionIVA(1000, true, false)
    expect(r.porcentaje).toBe(75)
    expect(r.monto).toBe(750)
  })

  it('retiene 100% para contraparte contribuyente especial', () => {
    const r = calcularRetencionIVA(1000, true, true)
    expect(r.porcentaje).toBe(100)
    expect(r.monto).toBe(1000)
  })

  it('no retiene si el monto de IVA es 0 o negativo', () => {
    expect(calcularRetencionIVA(0, true).monto).toBeNull()
    expect(calcularRetencionIVA(-50, true).monto).toBeNull()
  })

  it('no retiene si el monto calculado es menor a 1 UT (~9 Bs.)', () => {
    const r = calcularRetencionIVA(10, true, false) // 75% de 10 = 7.5 < 9
    expect(r.monto).toBeNull()
  })
})
