// Multi-ejercicio fiscal
// Cierre anual: genera asiento de cierre (Ingresos/Costos/Gastos → Utilidad del Ejercicio)
// Apertura: genera asiento de apertura para el nuevo ejercicio

import { db } from '@/lib/db'
import type { Ejercicio, Prisma } from '@prisma/client'
import { aNumero } from '@/lib/nucleo/dinero'

export type EjercicioInfo = Ejercicio

// Tanto el cliente Prisma normal como el cliente dentro de una transacción
// (db.$transaction) exponen la misma API de modelos, así que las funciones de
// este módulo aceptan cualquiera de los dos para poder componerse dentro de
// una transacción atómica cuando hace falta (cerrarEjercicio, reabrirEjercicio).
type DbClient = typeof db | Prisma.TransactionClient

// Crear ejercicio para un año específico
export async function crearEjercicio(empresaId: string, ano: number, client: DbClient = db): Promise<EjercicioInfo> {
  const existente = await client.ejercicio.findUnique({
    where: { empresaId_ano: { empresaId, ano } },
  })
  if (existente) return existente

  return client.ejercicio.create({
    data: {
      empresaId,
      ano,
      fechaInicio: new Date(ano, 0, 1),
      fechaCierre: new Date(ano, 11, 31, 23, 59, 59),
      estado: 'ABIERTO',
    },
  })
}

// Listar ejercicios de una empresa
export async function listarEjercicios(empresaId: string): Promise<EjercicioInfo[]> {
  return db.ejercicio.findMany({
    where: { empresaId },
    orderBy: { ano: 'desc' },
  })
}

// Obtener saldos de cuentas por tipo en un período
// Una sola consulta agregada (groupBy) en vez de un findMany por cuenta.
async function obtenerSaldosPorTipo(client: DbClient, empresaId: string, desde: Date, hasta: Date, tipo: string) {
  const cuentas = await client.cuenta.findMany({
    where: { empresaId, imputable: true, tipo },
    orderBy: { codigo: 'asc' },
  })
  if (cuentas.length === 0) return []

  const sumas = await client.asientoLinea.groupBy({
    by: ['cuentaId'],
    where: {
      cuentaId: { in: cuentas.map((c) => c.id) },
      asiento: { empresaId, fecha: { gte: desde, lte: hasta } },
    },
    _sum: { debit: true, credit: true },
  })
  const sumaPorCuenta = new Map(sumas.map((s) => [s.cuentaId, s._sum]))

  const resultado: Array<{ cuentaId: string; codigo: string; nombre: string; saldo: number; naturaleza: string }> = []
  for (const cuenta of cuentas) {
    const suma = sumaPorCuenta.get(cuenta.id)
    if (!suma) continue
    const tDeb = aNumero(suma.debit)
    const tCre = aNumero(suma.credit)
    const saldo = cuenta.naturaleza === 'DEUDORA' ? tDeb - tCre : tCre - tDeb
    if (Math.abs(saldo) > 0.001) {
      resultado.push({ cuentaId: cuenta.id, codigo: cuenta.codigo, nombre: cuenta.nombre, saldo, naturaleza: cuenta.naturaleza })
    }
  }
  return resultado
}

// Cerrar ejercicio: genera asiento de cierre
// El asiento de cierre:
//   - Acredita todas las cuentas de Ingreso (con débito = saldo)
//   - Debita todas las cuentas de Costo y Gasto (con crédito = saldo)
//   - La diferencia va a Utilidad del Ejercicio (3.2.01) o Pérdida (3.2.02)
// Toda la operación corre en una transacción: si algo falla a mitad de camino
// (p. ej. la apertura no balancea), no debe quedar un asiento de cierre
// huérfano ni un ejercicio a medio cerrar.
export async function cerrarEjercicio(
  empresaId: string,
  ano: number,
  userId: string,
): Promise<{ asientoCierre: any; asientoApertura?: any; utilidadNeta: number; islrEstimado: number; ejercicio: EjercicioInfo }> {
  return db.$transaction(async (tx) => {
    // Verificar que el ejercicio exista y esté abierto
    let ejercicio = await tx.ejercicio.findUnique({
      where: { empresaId_ano: { empresaId, ano } },
    })
    if (!ejercicio) {
      ejercicio = await crearEjercicio(empresaId, ano, tx)
    }
    if (ejercicio.estado === 'CERRADO') {
      throw new Error(`El ejercicio ${ano} ya está cerrado`)
    }

    const desde = new Date(ano, 0, 1)
    const hasta = new Date(ano, 11, 31, 23, 59, 59)

    // Obtener saldos de ingresos, costos y gastos
    const ingresos = await obtenerSaldosPorTipo(tx, empresaId, desde, hasta, 'INGRESO')
    const costos = await obtenerSaldosPorTipo(tx, empresaId, desde, hasta, 'COSTO')
    const gastos = await obtenerSaldosPorTipo(tx, empresaId, desde, hasta, 'GASTO')

    const totalIngresos = ingresos.reduce((s, c) => s + c.saldo, 0)
    const totalCostos = costos.reduce((s, c) => s + c.saldo, 0)
    const totalGastos = gastos.reduce((s, c) => s + c.saldo, 0)
    const utilidadAntesISLR = totalIngresos - totalCostos - totalGastos
    const islrEstimado = utilidadAntesISLR > 0 ? Math.round(utilidadAntesISLR * 34) / 100 : 0
    const utilidadNeta = utilidadAntesISLR - islrEstimado

    // Construir líneas del asiento de cierre
    const lineas: Array<{ cuentaId: string; debit?: number; credit?: number; descripcion: string }> = []

    // Cerrar Ingresos: debitar (porque son acreedoras, su saldo se cancela con débito)
    for (const ing of ingresos) {
      lineas.push({ cuentaId: ing.cuentaId, debit: ing.saldo, descripcion: `Cierre ${ing.nombre}` })
    }
    // Cerrar Costos: acreditar (porque son deudoras)
    for (const cos of costos) {
      lineas.push({ cuentaId: cos.cuentaId, credit: cos.saldo, descripcion: `Cierre ${cos.nombre}` })
    }
    // Cerrar Gastos: acreditar
    for (const gas of gastos) {
      lineas.push({ cuentaId: gas.cuentaId, credit: gas.saldo, descripcion: `Cierre ${gas.nombre}` })
    }

    // Si hay ISLR estimado, debitar Utilidad y acreditar ISLR por pagar
    if (islrEstimado > 0) {
      const cuentaUtilidad = await tx.cuenta.findFirst({ where: { empresaId, uso: 'UTILIDAD_EJERCICIO' } })
      const cuentaISLR = await tx.cuenta.findFirst({
        where: { empresaId, uso: 'ISLR_POR_PAGAR' },
      })
      if (cuentaISLR && cuentaUtilidad) {
        // Provisionar ISLR: Débito Utilidad / Crédito ISLR por Pagar
        lineas.push({ cuentaId: cuentaUtilidad.id, debit: islrEstimado, descripcion: 'Provisión ISLR estimado 34%' })
        lineas.push({ cuentaId: cuentaISLR.id, credit: islrEstimado, descripcion: 'ISLR por pagar (estimado cierre)' })
      }
    }

    // La diferencia entre débitos y créditos debe ir a Utilidad/Pérdida del Ejercicio
    const totalDebit = lineas.reduce((s, l) => s + (l.debit || 0), 0)
    const totalCredit = lineas.reduce((s, l) => s + (l.credit || 0), 0)
    const diferencia = totalDebit - totalCredit // Si > 0 = utilidad (debe ir al crédito de Utilidad), si < 0 = pérdida

    if (Math.abs(diferencia) > 0.01) {
      const cuentaUtilidad = await tx.cuenta.findFirst({ where: { empresaId, uso: 'UTILIDAD_EJERCICIO' } })
      const cuentaPerdida = await tx.cuenta.findFirst({ where: { empresaId, uso: 'PERDIDA_EJERCICIO' } })
      if (diferencia > 0 && cuentaUtilidad) {
        // Hay utilidad: la utilidad es acreedora, se cancela con débito... pero en el cierre se ACREDITA
        // En realidad: ingresos (créditos naturales) se cierran con DÉBITO
        //              costos/gastos (débitos naturales) se cierran con CRÉDITO
        //              Si ingresos > costos+gastos → utilidad → se ACREDITA utilidad (para balancear)
        lineas.push({ cuentaId: cuentaUtilidad.id, credit: diferencia, descripcion: 'Utilidad del ejercicio (cierre)' })
      } else if (diferencia < 0 && cuentaPerdida) {
        lineas.push({ cuentaId: cuentaPerdida.id, debit: Math.abs(diferencia), descripcion: 'Pérdida del ejercicio (cierre)' })
      }
    }

    // Verificar balance
    const finalDebit = lineas.reduce((s, l) => s + (l.debit || 0), 0)
    const finalCredit = lineas.reduce((s, l) => s + (l.credit || 0), 0)
    if (Math.abs(finalDebit - finalCredit) > 0.01) {
      throw new Error(`Asiento de cierre no balancea: Débito ${finalDebit} vs Crédito ${finalCredit}`)
    }

    // Generar asiento de cierre
    const ultimoAsiento = await tx.asiento.findFirst({
      where: { empresaId },
      orderBy: { numero: 'desc' },
    })
    const numeroCierre = (ultimoAsiento?.numero || 0) + 1

    const asientoCierre = await tx.asiento.create({
      data: {
        empresaId,
        userId,
        numero: numeroCierre,
        fecha: hasta,
        descripcion: `Asiento de cierre ejercicio ${ano}`,
        referencia: `CIERRE-${ano}`,
        tipo: 'CIERRE_EJERCICIO',
        fuente: 'sistema',
        lineas: {
          create: lineas.map((l) => ({
            cuentaId: l.cuentaId,
            debit: l.debit || 0,
            credit: l.credit || 0,
            descripcion: l.descripcion,
          })),
        },
      },
      include: { lineas: { include: { cuenta: true } } },
    })

    // Generar asiento de apertura para el año siguiente (solo activos, pasivos y patrimonio)
    const anoSiguiente = ano + 1
    const cuentasBalance = await tx.cuenta.findMany({
      where: { empresaId, imputable: true, tipo: { in: ['ACTIVO', 'PASIVO', 'PATRIMONIO'] } },
      orderBy: { codigo: 'asc' },
    })
    const sumasBalance = cuentasBalance.length > 0
      ? await tx.asientoLinea.groupBy({
          by: ['cuentaId'],
          where: {
            cuentaId: { in: cuentasBalance.map((c) => c.id) },
            asiento: { empresaId, fecha: { gte: desde, lte: hasta } },
          },
          _sum: { debit: true, credit: true },
        })
      : []
    const sumaBalancePorCuenta = new Map(sumasBalance.map((s) => [s.cuentaId, s._sum]))

    const lineasApertura: Array<{ cuentaId: string; debit?: number; credit?: number; descripcion: string }> = []
    for (const cuenta of cuentasBalance) {
      const sumaC = sumaBalancePorCuenta.get(cuenta.id)
      if (!sumaC) continue
      const tDeb = aNumero(sumaC.debit)
      const tCre = aNumero(sumaC.credit)
      const saldo = cuenta.naturaleza === 'DEUDORA' ? tDeb - tCre : tCre - tDeb
      if (Math.abs(saldo) < 0.01) continue
      // En el asiento de apertura, las cuentas deudoras van al débito y acreedoras al crédito
      // Pero si el saldo es positivo según naturaleza, va al lado natural
      if (cuenta.naturaleza === 'DEUDORA') {
        if (saldo > 0) lineasApertura.push({ cuentaId: cuenta.id, debit: saldo, descripcion: `Apertura ${cuenta.nombre}` })
        else lineasApertura.push({ cuentaId: cuenta.id, credit: Math.abs(saldo), descripcion: `Apertura ${cuenta.nombre} (saldo negativo)` })
      } else {
        if (saldo > 0) lineasApertura.push({ cuentaId: cuenta.id, credit: saldo, descripcion: `Apertura ${cuenta.nombre}` })
        else lineasApertura.push({ cuentaId: cuenta.id, debit: Math.abs(saldo), descripcion: `Apertura ${cuenta.nombre} (saldo negativo)` })
      }
    }

    // NOTA: la utilidad/pérdida del ejercicio NO se agrega aquí aparte. El asiento
    // de cierre ya afecta las cuentas UTILIDAD_EJERCICIO/PERDIDA_EJERCICIO (tipo
    // PATRIMONIO) con fecha `hasta`, dentro del rango [desde, hasta] que el barrido
    // de arriba ya usa para calcular cuentasBalance. Agregarla de nuevo aquí la
    // duplicaba (la apertura quedaba descuadrada exactamente por el monto de la
    // utilidad neta).

    // Verificar que la apertura balancea (igual que el asiento de cierre: si no
    // balancea es un problema real de integridad y no debe persistirse en silencio).
    const apDebit = lineasApertura.reduce((s, l) => s + (l.debit || 0), 0)
    const apCredit = lineasApertura.reduce((s, l) => s + (l.credit || 0), 0)
    if (Math.abs(apDebit - apCredit) > 0.01) {
      throw new Error(`Asiento de apertura no balancea: Débito ${apDebit} vs Crédito ${apCredit}`)
    }

    let asientoApertura: any = null
    if (lineasApertura.length > 0) {
      const numeroApertura = numeroCierre + 1
      asientoApertura = await tx.asiento.create({
        data: {
          empresaId,
          userId,
          numero: numeroApertura,
          fecha: new Date(anoSiguiente, 0, 1),
          descripcion: `Asiento de apertura ejercicio ${anoSiguiente}`,
          referencia: `APERTURA-${anoSiguiente}`,
          tipo: 'APERTURA_EJERCICIO',
          fuente: 'sistema',
          lineas: {
            create: lineasApertura.map((l) => ({
              cuentaId: l.cuentaId,
              debit: l.debit || 0,
              credit: l.credit || 0,
              descripcion: l.descripcion,
            })),
          },
        },
        include: { lineas: { include: { cuenta: true } } },
      })
    }

    // Crear ejercicio del año siguiente si no existe
    await crearEjercicio(empresaId, anoSiguiente, tx)

    // Marcar ejercicio como cerrado
    const ejercicioCerrado = await tx.ejercicio.update({
      where: { id: ejercicio.id },
      data: {
        estado: 'CERRADO',
        cerradoPor: userId,
        cerradoEn: new Date(),
        asientoCierreId: asientoCierre.id,
        asientoAperturaId: asientoApertura?.id || null,
        utilidadNeta,
        islrEstimado,
      },
    })

    return {
      asientoCierre,
      asientoApertura,
      utilidadNeta,
      islrEstimado,
      ejercicio: ejercicioCerrado,
    }
  }, { timeout: 20000 })
}

// Reabrir ejercicio (si se necesita corregir algo)
// También transaccional: no debe quedar el asiento de cierre borrado pero el
// ejercicio todavía marcado CERRADO (o viceversa) si algo falla a mitad de camino.
export async function reabrirEjercicio(empresaId: string, ano: number): Promise<EjercicioInfo> {
  return db.$transaction(async (tx) => {
    const ejercicio = await tx.ejercicio.findUnique({
      where: { empresaId_ano: { empresaId, ano } },
    })
    if (!ejercicio) throw new Error(`Ejercicio ${ano} no encontrado`)
    if (ejercicio.estado !== 'CERRADO') throw new Error(`El ejercicio ${ano} no está cerrado`)

    // Eliminar asientos de cierre y apertura
    if (ejercicio.asientoCierreId) {
      await tx.asientoLinea.deleteMany({ where: { asientoId: ejercicio.asientoCierreId } })
      await tx.asiento.delete({ where: { id: ejercicio.asientoCierreId } })
    }
    if (ejercicio.asientoAperturaId) {
      await tx.asientoLinea.deleteMany({ where: { asientoId: ejercicio.asientoAperturaId } })
      await tx.asiento.delete({ where: { id: ejercicio.asientoAperturaId } })
    }

    return tx.ejercicio.update({
      where: { id: ejercicio.id },
      data: {
        estado: 'ABIERTO',
        cerradoPor: null,
        cerradoEn: null,
        asientoCierreId: null,
        asientoAperturaId: null,
        utilidadNeta: null,
        islrEstimado: null,
      },
    })
  })
}
