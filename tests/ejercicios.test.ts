import { describe, it, expect, afterAll } from 'vitest'
import { db } from '@/lib/db'
import { cerrarEjercicio, crearEjercicio, listarEjercicios, reabrirEjercicio } from '@/lib/contabilidad/ejercicios'
import { crearEmpresaDePrueba, limpiarDatosDePrueba } from './helpers'
import { aNumero } from '@/lib/nucleo/dinero'

afterAll(async () => {
  await limpiarDatosDePrueba()
})

// Crea un asiento manual balanceado directamente en la BD, sin pasar por el
// motor de asientos (que aquí no hace falta: solo queremos poblar saldos).
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
      lineas: {
        create: lineas.map((l) => ({
          cuentaId: l.cuentaId,
          debit: l.debit || 0,
          credit: l.credit || 0,
          descripcion: 'línea de prueba',
        })),
      },
    },
  })
}

describe('cierre de ejercicio fiscal', () => {
  it('cierra un ejercicio con utilidad, genera asiento de cierre balanceado y asiento de apertura', async () => {
    const { empresa, user, cuentaPorUso } = await crearEmpresaDePrueba()
    const ano = 2020 + Math.floor(Math.random() * 1000) // año aislado por prueba, no colisiona con otras

    const ventas = cuentaPorUso('VENTAS_GRAVABLES')
    const costoVenta = cuentaPorUso('COSTO_VENTA')
    const gastoOtros = cuentaPorUso('GASTO_OTROS')
    const bancos = cuentaPorUso('BANCOS_BS')

    // Venta de 10,000: Débito Bancos 10,000 / Crédito Ventas 10,000
    await crearAsientoManual(empresa.id, user.id, new Date(ano, 3, 10), [
      { cuentaId: bancos.id, debit: 10000 },
      { cuentaId: ventas.id, credit: 10000 },
    ])
    // Costo de venta 4,000: Débito Costo 4,000 / Crédito Bancos 4,000
    await crearAsientoManual(empresa.id, user.id, new Date(ano, 3, 11), [
      { cuentaId: costoVenta.id, debit: 4000 },
      { cuentaId: bancos.id, credit: 4000 },
    ])
    // Gasto operativo 1,000: Débito Gasto 1,000 / Crédito Bancos 1,000
    await crearAsientoManual(empresa.id, user.id, new Date(ano, 3, 12), [
      { cuentaId: gastoOtros.id, debit: 1000 },
      { cuentaId: bancos.id, credit: 1000 },
    ])

    const resultado = await cerrarEjercicio(empresa.id, ano, user.id)

    // Utilidad antes de ISLR = 10000 - 4000 - 1000 = 5000; ISLR 34% = 1700; utilidad neta = 3300
    expect(resultado.utilidadNeta).toBeCloseTo(3300, 2)
    expect(resultado.islrEstimado).toBeCloseTo(1700, 2)
    expect(resultado.ejercicio.estado).toBe('CERRADO')

    // El asiento de cierre debe balancear (débito total == crédito total)
    const lineasCierre = await db.asientoLinea.findMany({ where: { asientoId: resultado.asientoCierre.id } })
    const debitCierre = lineasCierre.reduce((s, l) => s + aNumero(l.debit), 0)
    const creditCierre = lineasCierre.reduce((s, l) => s + aNumero(l.credit), 0)
    expect(debitCierre).toBeCloseTo(creditCierre, 2)

    // Debe haberse creado el ejercicio del año siguiente, abierto
    const ejercicios = await listarEjercicios(empresa.id)
    const siguiente = ejercicios.find((e) => e.ano === ano + 1)
    expect(siguiente).toBeTruthy()
    expect(siguiente?.estado).toBe('ABIERTO')

    // El asiento de apertura (si se generó) también debe balancear
    if (resultado.asientoApertura) {
      const lineasApertura = await db.asientoLinea.findMany({ where: { asientoId: resultado.asientoApertura.id } })
      const debitAp = lineasApertura.reduce((s, l) => s + aNumero(l.debit), 0)
      const creditAp = lineasApertura.reduce((s, l) => s + aNumero(l.credit), 0)
      expect(debitAp).toBeCloseTo(creditAp, 2)
    }
  })

  it('no permite cerrar dos veces el mismo ejercicio', async () => {
    const { empresa, user, cuentaPorUso } = await crearEmpresaDePrueba()
    const ano = 3000 + Math.floor(Math.random() * 1000)
    const ventas = cuentaPorUso('VENTAS_GRAVABLES')
    const bancos = cuentaPorUso('BANCOS_BS')
    await crearAsientoManual(empresa.id, user.id, new Date(ano, 1, 1), [
      { cuentaId: bancos.id, debit: 100 },
      { cuentaId: ventas.id, credit: 100 },
    ])
    await cerrarEjercicio(empresa.id, ano, user.id)
    await expect(cerrarEjercicio(empresa.id, ano, user.id)).rejects.toThrow(/ya está cerrado/)
  })

  it('reabrirEjercicio revierte el cierre y elimina los asientos generados', async () => {
    const { empresa, user, cuentaPorUso } = await crearEmpresaDePrueba()
    const ano = 4000 + Math.floor(Math.random() * 1000)
    const ventas = cuentaPorUso('VENTAS_GRAVABLES')
    const bancos = cuentaPorUso('BANCOS_BS')
    await crearAsientoManual(empresa.id, user.id, new Date(ano, 1, 1), [
      { cuentaId: bancos.id, debit: 500 },
      { cuentaId: ventas.id, credit: 500 },
    ])
    const cierre = await cerrarEjercicio(empresa.id, ano, user.id)
    const reabierto = await reabrirEjercicio(empresa.id, ano)
    expect(reabierto.estado).toBe('ABIERTO')

    const asientoCierre = await db.asiento.findUnique({ where: { id: cierre.asientoCierre.id } })
    expect(asientoCierre).toBeNull()
  })

  it('crearEjercicio es idempotente: devuelve el mismo ejercicio si ya existe', async () => {
    const { empresa } = await crearEmpresaDePrueba()
    const ano = 5000 + Math.floor(Math.random() * 1000)
    const a = await crearEjercicio(empresa.id, ano)
    const b = await crearEjercicio(empresa.id, ano)
    expect(a.id).toBe(b.id)
  })
})
