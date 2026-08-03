import { describe, it, expect, afterAll } from 'vitest'
import { db } from '@/lib/db'
import {
  crearOActualizarConciliacion,
  cargarMovimientosBanco,
  recalcularDiferencias,
} from '@/lib/contabilidad/conciliacion-banco'
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

describe('conciliación bancaria', () => {
  it('calcula el saldo inicial y final del libro para el mes', async () => {
    const { empresa, user, cuentaPorUso } = await crearEmpresaDePrueba()
    const bancos = cuentaPorUso('BANCOS_BS')
    const ventas = cuentaPorUso('VENTAS_GRAVABLES')
    const ano = 2030 + Math.floor(Math.random() * 500)

    // Saldo antes de julio: depósito de 1000 en junio
    await crearAsientoManual(empresa.id, user.id, new Date(ano, 5, 15), [
      { cuentaId: bancos.id, debit: 1000 },
      { cuentaId: ventas.id, credit: 1000 },
    ])
    // Movimiento en julio: depósito de 500
    await crearAsientoManual(empresa.id, user.id, new Date(ano, 6, 10), [
      { cuentaId: bancos.id, debit: 500 },
      { cuentaId: ventas.id, credit: 500 },
    ])

    const conc = await crearOActualizarConciliacion(empresa.id, bancos.id, 7, ano, 1000, 1500)
    expect(conc.saldoInicialLibro).toBeCloseTo(1000, 2)
    expect(conc.saldoFinalLibro).toBeCloseTo(1500, 2)
  })

  it('auto-concilia un movimiento del extracto que coincide en monto con una línea del libro', async () => {
    const { empresa, user, cuentaPorUso } = await crearEmpresaDePrueba()
    const bancos = cuentaPorUso('BANCOS_BS')
    const ventas = cuentaPorUso('VENTAS_GRAVABLES')
    const ano = 2600 + Math.floor(Math.random() * 300)

    await crearAsientoManual(empresa.id, user.id, new Date(ano, 2, 5), [
      { cuentaId: bancos.id, debit: 750 },
      { cuentaId: ventas.id, credit: 750 },
    ])

    const conc = await crearOActualizarConciliacion(empresa.id, bancos.id, 3, ano, 0, 750)
    const resultado = await cargarMovimientosBanco(conc.id, [
      { fecha: new Date(ano, 2, 5), descripcion: 'Depósito recibido', monto: 750 },
    ])
    expect(resultado.cargados).toBe(1)
    expect(resultado.conciliados).toBe(1)
  })

  it('no concilia un movimiento del extracto sin línea correspondiente en el libro', async () => {
    const { empresa, cuentaPorUso } = await crearEmpresaDePrueba()
    const bancos = cuentaPorUso('BANCOS_BS')
    const ano = 2700 + Math.floor(Math.random() * 300)

    const conc = await crearOActualizarConciliacion(empresa.id, bancos.id, 4, ano, 0, 0)
    const resultado = await cargarMovimientosBanco(conc.id, [
      { fecha: new Date(ano, 3, 1), descripcion: 'Depósito sin registrar en el libro', monto: 999 },
    ])
    expect(resultado.cargados).toBe(1)
    expect(resultado.conciliados).toBe(0)
  })

  it('recalcularDiferencias marca CUADRADO cuando banco y libro coinciden exactamente', async () => {
    const { empresa, user, cuentaPorUso } = await crearEmpresaDePrueba()
    const bancos = cuentaPorUso('BANCOS_BS')
    const ventas = cuentaPorUso('VENTAS_GRAVABLES')
    const ano = 2800 + Math.floor(Math.random() * 300)

    await crearAsientoManual(empresa.id, user.id, new Date(ano, 1, 1), [
      { cuentaId: bancos.id, debit: 300 },
      { cuentaId: ventas.id, credit: 300 },
    ])
    const conc = await crearOActualizarConciliacion(empresa.id, bancos.id, 2, ano, 0, 300)
    await cargarMovimientosBanco(conc.id, [
      { fecha: new Date(ano, 1, 1), descripcion: 'Depósito', monto: 300 },
    ])
    const actualizada = await recalcularDiferencias(conc.id)
    expect(actualizada?.estado).toBe('CUADRADO')
    expect(actualizada?.diferencia).toBeCloseTo(0, 2)
  })

  it('rechaza conciliar una cuenta que no es de bancos/caja', async () => {
    const { empresa, cuentaPorUso } = await crearEmpresaDePrueba()
    const ventas = cuentaPorUso('VENTAS_GRAVABLES')
    await expect(crearOActualizarConciliacion(empresa.id, ventas.id, 1, 2031, 0, 0)).rejects.toThrow(/bancos o caja/)
  })
})
