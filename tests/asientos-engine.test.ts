import { describe, it, expect, afterAll } from 'vitest'
import { iguales, sumarPor, igual } from '@/lib/nucleo/dinero'
import {
  generarAsientoCompra,
  generarAsientoVenta,
  generarAsientoNota,
  generarAsientoGastoMenor,
  persistirAsiento,
} from '@/lib/contabilidad/asientos-engine'
import { crearEmpresaDePrueba, limpiarDatosDePrueba } from './helpers'

afterAll(async () => {
  await limpiarDatosDePrueba()
})

describe('asientos-engine (partida doble)', () => {
  it('genera un asiento de COMPRA balanceado (gasto, sin retención)', async () => {
    const { empresa } = await crearEmpresaDePrueba()
    const r = await generarAsientoCompra({
      empresaId: empresa.id,
      tipo: 'COMPRA',
      monedaOriginal: 'VES',
      baseImponible: 1000,
      montoExento: 0,
      montoExonerado: 0,
      montoIVA: 160,
      subtotal: 1000,
      total: 1160,
      montoRetencionIVA: null,
      totalAPagar: 1160,
      totalMonedaFuncional: 1160,
      descripcion: 'Compra de prueba',
      esInventario: false,
      usoGasto: 'GASTO_OTROS',
    })
    expect(r.balanceado).toBe(true)
    expect(iguales(r.totalDebit, r.totalCredit)).toBe(true)
    expect(igual(r.totalDebit, '1160')).toBe(true)
  })

  it('genera un asiento de COMPRA balanceado con retención de IVA y de ISLR', async () => {
    const { empresa } = await crearEmpresaDePrueba()
    const r = await generarAsientoCompra({
      empresaId: empresa.id,
      tipo: 'COMPRA',
      monedaOriginal: 'VES',
      baseImponible: 1000,
      montoExento: 0,
      montoExonerado: 0,
      montoIVA: 160,
      subtotal: 1000,
      total: 1160,
      montoRetencionIVA: 120, // retención del 75%
      montoRetencionISLR: 20,
      porcentajeRetencionISLR: 2,
      totalAPagar: 1020,
      totalMonedaFuncional: 1160,
      descripcion: 'Compra con retenciones',
      esInventario: true,
    })
    expect(r.balanceado).toBe(true)
    expect(iguales(r.totalDebit, r.totalCredit)).toBe(true)
  })

  it('genera un asiento de VENTA balanceado', async () => {
    const { empresa } = await crearEmpresaDePrueba()
    const r = await generarAsientoVenta({
      empresaId: empresa.id,
      baseImponible: 2000,
      montoExento: 0,
      montoIVA: 320,
      subtotal: 2000,
      total: 2320,
      montoRetencionIVA: null,
      totalAPagar: 2320,
      totalMonedaFuncional: 2320,
      descripcion: 'Venta de prueba',
      clienteRetieneIVA: false,
    })
    expect(r.balanceado).toBe(true)
    expect(r.totalDebit).toBeCloseTo(2320, 2)
  })

  it('genera un asiento de VENTA balanceado cuando el cliente retiene IVA', async () => {
    const { empresa } = await crearEmpresaDePrueba()
    const r = await generarAsientoVenta({
      empresaId: empresa.id,
      baseImponible: 2000,
      montoExento: 0,
      montoIVA: 320,
      subtotal: 2000,
      total: 2320,
      montoRetencionIVA: 240,
      totalAPagar: 2080,
      totalMonedaFuncional: 2320,
      descripcion: 'Venta con retención de cliente',
      clienteRetieneIVA: true,
    })
    expect(r.balanceado).toBe(true)
  })

  it('genera un asiento de NOTA_CREDITO sobre una venta balanceado (reversa)', async () => {
    const { empresa } = await crearEmpresaDePrueba()
    const r = await generarAsientoNota({
      empresaId: empresa.id,
      tipo: 'NOTA_CREDITO',
      baseImponible: 500,
      montoExento: 0,
      montoIVA: 80,
      total: 580,
      totalMonedaFuncional: 580,
      descripcion: 'Devolución de venta',
      aplicaA: 'VENTA',
    })
    expect(r.balanceado).toBe(true)
  })

  it('genera un asiento de NOTA_DEBITO sobre una compra balanceado', async () => {
    const { empresa } = await crearEmpresaDePrueba()
    const r = await generarAsientoNota({
      empresaId: empresa.id,
      tipo: 'NOTA_DEBITO',
      baseImponible: 300,
      montoExento: 0,
      montoIVA: 48,
      total: 348,
      totalMonedaFuncional: 348,
      descripcion: 'Cargo adicional de proveedor',
      aplicaA: 'COMPRA',
    })
    expect(r.balanceado).toBe(true)
  })

  it('genera un asiento de GASTO_MENOR balanceado', async () => {
    const { empresa } = await crearEmpresaDePrueba()
    const r = await generarAsientoGastoMenor({
      empresaId: empresa.id,
      baseImponible: 100,
      montoExento: 0,
      montoIVA: 16,
      total: 116,
      totalMonedaFuncional: 116,
      descripcion: 'Gasto menor de prueba',
      usoGasto: 'GASTO_OTROS',
    })
    expect(r.balanceado).toBe(true)
  })

  it('persiste un asiento en la base de datos con las líneas correctas', async () => {
    const { empresa, user } = await crearEmpresaDePrueba()
    const r = await generarAsientoVenta({
      empresaId: empresa.id,
      baseImponible: 1000,
      montoExento: 0,
      montoIVA: 160,
      subtotal: 1000,
      total: 1160,
      montoRetencionIVA: null,
      totalAPagar: 1160,
      totalMonedaFuncional: 1160,
      descripcion: 'Venta a persistir',
      clienteRetieneIVA: false,
    })
    const asiento = await persistirAsiento(
      empresa.id,
      user.id,
      // Sin factura asociada en esta prueba: usamos un id ficticio no-FK
      // porque facturaId es opcional a nivel de dominio pero requerido por el
      // tipo; en la práctica siempre viene de una factura real ya creada.
      null as unknown as string,
      'MANUAL',
      new Date(),
      r.descripcion,
      null,
      'test',
      r.lineas,
    )
    expect(asiento.lineas.length).toBe(r.lineas.length)
    // La partida doble se comprueba con aritmética exacta: sumar Decimal
    // con `+` los concatenaría como texto en vez de sumarlos.
    const sumaDebit = sumarPor(asiento.lineas, (l) => l.debit)
    const sumaCredit = sumarPor(asiento.lineas, (l) => l.credit)
    expect(iguales(sumaDebit, sumaCredit)).toBe(true)
  })
})
