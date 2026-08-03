import { describe, it, expect } from 'vitest'
import { calcularDeclaracionIVA } from '@/lib/contabilidad/declaracion-iva'

function factura(overrides: Partial<Parameters<typeof calcularDeclaracionIVA>[0][number]>) {
  return {
    tipo: 'VENTA',
    fechaEmision: new Date(2026, 6, 15),
    baseImponible: 1000,
    montoExento: 0,
    montoExonerado: 0,
    alicuotaIVA: 16,
    montoIVA: 160,
    montoRetencionIVA: null,
    ...overrides,
  }
}

describe('calcularDeclaracionIVA', () => {
  it('incluye una VENTA normal en el débito fiscal', () => {
    const r = calcularDeclaracionIVA([factura({ tipo: 'VENTA' })], 7, 2026)
    expect(r.totalVentasGravadas16).toBe(1000)
    expect(r.debitoFiscal16).toBe(160)
  })

  it('incluye una NOTA_DEBITO que afecta una venta en el débito fiscal', () => {
    const r = calcularDeclaracionIVA(
      [factura({ tipo: 'NOTA_DEBITO', ncfAfectaVenta: true })],
      7,
      2026,
    )
    expect(r.totalVentasGravadas16).toBe(1000)
  })

  it('EXCLUYE una NOTA_DEBITO que afecta una compra del débito fiscal', () => {
    const r = calcularDeclaracionIVA(
      [factura({ tipo: 'NOTA_DEBITO', ncfAfectaVenta: false })],
      7,
      2026,
    )
    expect(r.totalVentasGravadas16).toBe(0)
  })

  it('clasifica una NOTA_CREDITO de venta como resta del débito fiscal, no como compra', () => {
    const r = calcularDeclaracionIVA(
      [
        factura({ tipo: 'VENTA', baseImponible: 5000, montoIVA: 800 }),
        factura({ tipo: 'NOTA_CREDITO', baseImponible: 1000, montoIVA: 160, ncfAfectaVenta: true }),
      ],
      7,
      2026,
    )
    // El crédito fiscal (compras) no debe incluir nada: no hay compras en este caso.
    expect(r.creditoFiscalTotal).toBe(0)
    // El débito fiscal debe reflejar la resta de la nota de crédito de venta.
    expect(r.debitoFiscalTotal).toBe(800 - 160)
  })

  it('clasifica una NOTA_CREDITO de compra como resta del crédito fiscal', () => {
    const r = calcularDeclaracionIVA(
      [
        factura({ tipo: 'COMPRA', baseImponible: 2000, montoIVA: 320 }),
        factura({ tipo: 'NOTA_CREDITO', baseImponible: 500, montoIVA: 80, ncfAfectaVenta: false }),
      ],
      7,
      2026,
    )
    expect(r.creditoFiscalTotal).toBe(320 - 80)
  })

  it('sin ncfAfectaVenta (campo ausente), una nota de crédito ya no se cuela como compra por defecto', () => {
    // Antes del fix, `undefined` en ncfAfectaVenta hacía que *toda* nota de
    // crédito cayera en la rama de "compra" (!undefined === true).
    // Con el campo explícito en false, debe seguir clasificando como compra
    // solo cuando efectivamente se indica que no afecta una venta.
    const r = calcularDeclaracionIVA(
      [factura({ tipo: 'NOTA_CREDITO', baseImponible: 100, montoIVA: 16, ncfAfectaVenta: true })],
      7,
      2026,
    )
    expect(r.creditoFiscalTotal).toBe(0)
    expect(r.debitoFiscalTotal).toBe(-16)
  })

  it('incluye una NOTA_DEBITO que afecta una compra en el crédito fiscal (aumenta lo comprado)', () => {
    const r = calcularDeclaracionIVA(
      [
        factura({ tipo: 'COMPRA', baseImponible: 1000, montoIVA: 160 }),
        factura({ tipo: 'NOTA_DEBITO', baseImponible: 200, montoIVA: 32, ncfAfectaVenta: false }),
      ],
      7,
      2026,
    )
    expect(r.creditoFiscalTotal).toBe(160 + 32)
  })

  it('excluye facturas fuera del mes/año consultado', () => {
    const r = calcularDeclaracionIVA(
      [factura({ tipo: 'VENTA', fechaEmision: new Date(2026, 5, 20) })],
      7,
      2026,
    )
    expect(r.totalVentasGravadas16).toBe(0)
  })
})
