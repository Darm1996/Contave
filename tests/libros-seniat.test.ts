import { describe, it, expect } from 'vitest'
import { facturaAFilaLibro } from '@/lib/contabilidad/libros-seniat'

function facturaBase(overrides: Record<string, any>) {
  return {
    tipo: 'COMPRA',
    fechaEmision: new Date(),
    numeroFactura: '001',
    numeroControl: '00-001',
    ncf: '',
    rifContraparte: 'J-12345678-9',
    nombreContraparte: 'Contraparte',
    total: 1160,
    montoExento: 0,
    montoExonerado: 0,
    alicuotaIVA: 16,
    baseImponible: 1000,
    montoIVA: 160,
    montoRetencionIVA: null,
    montoRetencionISLR: null,
    estado: 'REGISTRADA',
    ...overrides,
  }
}

describe('facturaAFilaLibro (notas de crédito/débito)', () => {
  it('clasifica una nota como venta usando ncfAfectaVenta=true, sin depender del NCF', () => {
    const fila = facturaAFilaLibro(facturaBase({ tipo: 'NOTA_CREDITO', ncf: '', ncfAfectaVenta: true })) as any
    expect(fila).not.toBeNull()
    expect('rifCliente' in fila).toBe(true)
    expect('rifProveedor' in fila).toBe(false)
  })

  it('clasifica una nota como compra usando ncfAfectaVenta=false, sin depender del NCF', () => {
    const fila = facturaAFilaLibro(facturaBase({ tipo: 'NOTA_DEBITO', ncf: '', ncfAfectaVenta: false })) as any
    expect(fila).not.toBeNull()
    expect('rifProveedor' in fila).toBe(true)
    expect('rifCliente' in fila).toBe(false)
  })

  it('una COMPRA normal siempre cae en el libro de compras', () => {
    const fila = facturaAFilaLibro(facturaBase({ tipo: 'COMPRA' })) as any
    expect('rifProveedor' in fila).toBe(true)
  })

  it('una VENTA normal siempre cae en el libro de ventas', () => {
    const fila = facturaAFilaLibro(facturaBase({ tipo: 'VENTA' })) as any
    expect('rifCliente' in fila).toBe(true)
  })
})
