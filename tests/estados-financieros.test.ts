import { describe, it, expect, afterAll } from 'vitest'
import { db } from '@/lib/db'
import { generarBalanceGeneral, generarEstadoResultado } from '@/lib/contabilidad/estados-financieros'
import { crearEmpresaDePrueba, limpiarDatosDePrueba } from './helpers'

afterAll(async () => {
  await limpiarDatosDePrueba()
})

async function crearAsientoManual(
  empresaId: string,
  userId: string,
  fecha: Date,
  lineas: Array<{ cuentaId: string; debit?: number; credit?: number }>,
) {
  const ultimo = await db.asiento.findFirst({ where: { empresaId }, orderBy: { numero: 'desc' } })
  return db.asiento.create({
    data: {
      empresaId,
      userId,
      numero: (ultimo?.numero || 0) + 1,
      fecha,
      descripcion: 'Asiento de prueba',
      tipo: 'MANUAL',
      fuente: 'test',
      lineas: { create: lineas.map((l) => ({ cuentaId: l.cuentaId, debit: l.debit || 0, credit: l.credit || 0, descripcion: 'línea' })) },
    },
  })
}

describe('generarBalanceGeneral', () => {
  it('cuadra (Activo = Pasivo + Patrimonio + resultado del ejercicio) en un período abierto', async () => {
    const { empresa, user, cuentaPorUso } = await crearEmpresaDePrueba()
    const ano = 6000 + Math.floor(Math.random() * 500)
    const bancos = cuentaPorUso('BANCOS_BS')
    const ventas = cuentaPorUso('VENTAS_GRAVABLES')
    const gastoOtros = cuentaPorUso('GASTO_OTROS')
    const cxp = cuentaPorUso('CXP_PROVEEDORES')

    // Venta al contado: Débito Bancos 5000 / Crédito Ventas 5000
    await crearAsientoManual(empresa.id, user.id, new Date(ano, 2, 1), [
      { cuentaId: bancos.id, debit: 5000 },
      { cuentaId: ventas.id, credit: 5000 },
    ])
    // Gasto a crédito (queda como pasivo): Débito Gasto 1000 / Crédito CxP 1000
    await crearAsientoManual(empresa.id, user.id, new Date(ano, 2, 5), [
      { cuentaId: gastoOtros.id, debit: 1000 },
      { cuentaId: cxp.id, credit: 1000 },
    ])

    const balance = await generarBalanceGeneral(empresa.id, new Date(ano, 11, 31), new Date(ano, 0, 1))
    expect(balance.cuadra).toBe(true)
    expect(Math.abs(balance.diferencia)).toBeLessThan(0.01)
    expect(balance.totalActivo).toBeCloseTo(5000, 2) // solo bancos
    expect(balance.totalPasivoCorriente).toBeCloseTo(1000, 2) // CxP
    expect(balance.resultadoEjercicio).toBeCloseTo(4000, 2) // 5000 ventas - 1000 gasto
  })

  it('un balance sin movimientos cuadra trivialmente (todo en cero)', async () => {
    const { empresa } = await crearEmpresaDePrueba()
    const balance = await generarBalanceGeneral(empresa.id, new Date(2099, 11, 31), new Date(2099, 0, 1))
    expect(balance.cuadra).toBe(true)
    expect(balance.totalActivo).toBe(0)
  })
})

describe('generarEstadoResultado', () => {
  it('calcula utilidad bruta, operacional y neta correctamente', async () => {
    const { empresa, user, cuentaPorUso } = await crearEmpresaDePrueba()
    const ano = 6600 + Math.floor(Math.random() * 300)
    const bancos = cuentaPorUso('BANCOS_BS')
    const ventas = cuentaPorUso('VENTAS_GRAVABLES')
    const costoVenta = cuentaPorUso('COSTO_VENTA')
    const gastoOtros = cuentaPorUso('GASTO_OTROS')

    await crearAsientoManual(empresa.id, user.id, new Date(ano, 3, 1), [
      { cuentaId: bancos.id, debit: 10000 },
      { cuentaId: ventas.id, credit: 10000 },
    ])
    await crearAsientoManual(empresa.id, user.id, new Date(ano, 3, 2), [
      { cuentaId: costoVenta.id, debit: 3000 },
      { cuentaId: bancos.id, credit: 3000 },
    ])
    await crearAsientoManual(empresa.id, user.id, new Date(ano, 3, 3), [
      { cuentaId: gastoOtros.id, debit: 2000 },
      { cuentaId: bancos.id, credit: 2000 },
    ])

    const r = await generarEstadoResultado(empresa.id, new Date(ano, 0, 1), new Date(ano, 11, 31))
    expect(r.totalIngresosOperacionales).toBeCloseTo(10000, 2)
    expect(r.utilidadBruta).toBeCloseTo(7000, 2) // 10000 - 3000
    expect(r.utilidadOperacional).toBeCloseTo(5000, 2) // 7000 - 2000
    expect(r.utilidadAntesISLR).toBeCloseTo(5000, 2)
    expect(r.islrEstimado).toBeCloseTo(1700, 2) // 34% de 5000
    expect(r.utilidadNeta).toBeCloseTo(3300, 2)
  })
})
