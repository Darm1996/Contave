// Ajuste por inflación (reexpresión simplificada, método de "nivel general de
// precios"): compara el índice de inflación del mes anterior contra el del mes
// actual y reexpresa las partidas NO monetarias (activos fijos, inventario,
// capital) al valor actual, más el Resultado por Exposición a la Inflación
// (REI) sobre la posición monetaria neta (activos monetarios - pasivos
// monetarios). No sustituye el método de capas históricas por activo
// (VEN-NIF-12 / antigua DPC-10) — es una aproximación para PYMES.

import { db } from '@/lib/db'
import { buscarCuentaPorUso, persistirAsiento, LineaAsientoInput } from './asientos-engine'
import { aNumero } from '@/lib/nucleo/dinero'

export async function registrarIndiceInflacion(empresaId: string, mes: number, ano: number, indice: number, fuente = 'MANUAL') {
  if (!indice || indice <= 0) throw new Error('El índice debe ser mayor a 0')
  return db.indiceInflacion.upsert({
    where: { empresaId_mes_ano: { empresaId, mes, ano } },
    update: { indice, fuente },
    create: { empresaId, mes, ano, indice, fuente },
  })
}

export async function listarIndicesInflacion(empresaId: string) {
  return db.indiceInflacion.findMany({ where: { empresaId }, orderBy: [{ ano: 'desc' }, { mes: 'desc' }] })
}

export async function listarAjustesInflacion(empresaId: string) {
  return db.ajusteInflacion.findMany({ where: { empresaId }, orderBy: [{ ano: 'desc' }, { mes: 'desc' }] })
}

async function saldoCuentasHasta(empresaId: string, cuentaIds: string[], fechaLimite: Date) {
  if (cuentaIds.length === 0) return new Map<string, number>()
  const lineas = await db.asientoLinea.groupBy({
    by: ['cuentaId'],
    where: { cuentaId: { in: cuentaIds }, asiento: { empresaId, fecha: { lte: fechaLimite } } },
    _sum: { debit: true, credit: true },
  })
  const mapa = new Map<string, number>()
  for (const l of lineas) mapa.set(l.cuentaId, (aNumero(l._sum.debit) || 0) - (aNumero(l._sum.credit) || 0))
  return mapa
}

export async function calcularAjusteInflacion(empresaId: string, mes: number, ano: number, userId: string) {
  const existente = await db.ajusteInflacion.findUnique({ where: { empresaId_mes_ano: { empresaId, mes, ano } } })
  if (existente) throw new Error(`Ya existe un ajuste por inflación para ${mes}/${ano}`)

  const indiceFinalRow = await db.indiceInflacion.findUnique({ where: { empresaId_mes_ano: { empresaId, mes, ano } } })
  if (!indiceFinalRow) throw new Error(`No has cargado el índice de inflación de ${mes}/${ano}. Cárgalo primero.`)

  const mesAnterior = mes === 1 ? 12 : mes - 1
  const anoAnterior = mes === 1 ? ano - 1 : ano
  const indiceInicialRow = await db.indiceInflacion.findUnique({ where: { empresaId_mes_ano: { empresaId, mes: mesAnterior, ano: anoAnterior } } })
  if (!indiceInicialRow) throw new Error(`No has cargado el índice de inflación de ${mesAnterior}/${anoAnterior} (mes anterior, necesario como base de comparación).`)

  const indiceInicial = aNumero(indiceInicialRow.indice)
  const indiceFinal = aNumero(indiceFinalRow.indice)
  const factor = indiceFinal / indiceInicial

  const finMes = new Date(ano, mes, 0, 23, 59, 59)
  const inicioMes = new Date(ano, mes - 1, 1)
  const finMesAnterior = new Date(inicioMes.getTime() - 1000)

  // 1. Reexpresar partidas no monetarias (saldo actual a fin de mes)
  const cuentasNoMonetarias = await db.cuenta.findMany({ where: { empresaId, esMonetaria: false, imputable: true } })
  const saldosNoMonetarios = await saldoCuentasHasta(empresaId, cuentasNoMonetarias.map((c) => c.id), finMes)

  const lineas: LineaAsientoInput[] = []
  let totalReexpresadoActivos = 0
  for (const cuenta of cuentasNoMonetarias) {
    const saldo = saldosNoMonetarios.get(cuenta.id) || 0
    if (Math.abs(saldo) < 0.01) continue
    const ajuste = round2(saldo * (factor - 1))
    if (Math.abs(ajuste) < 0.01) continue
    totalReexpresadoActivos += ajuste
    if (cuenta.naturaleza === 'DEUDORA') {
      if (ajuste > 0) lineas.push({ cuentaId: cuenta.id, debit: ajuste, descripcion: `Reexpresión ${mes}/${ano}` })
      else lineas.push({ cuentaId: cuenta.id, credit: -ajuste, descripcion: `Reexpresión ${mes}/${ano}` })
    } else {
      if (ajuste > 0) lineas.push({ cuentaId: cuenta.id, credit: ajuste, descripcion: `Reexpresión ${mes}/${ano}` })
      else lineas.push({ cuentaId: cuenta.id, debit: -ajuste, descripcion: `Reexpresión ${mes}/${ano}` })
    }
  }

  // 2. Resultado por Exposición a la Inflación (REI) sobre la posición monetaria
  // neta (activos monetarios - pasivos monetarios) al inicio del mes.
  const cuentasMonetarias = await db.cuenta.findMany({
    where: { empresaId, esMonetaria: true, imputable: true, tipo: { in: ['ACTIVO', 'PASIVO'] } },
  })
  const saldosMonetarios = await saldoCuentasHasta(empresaId, cuentasMonetarias.map((c) => c.id), finMesAnterior)
  let netoMonetario = 0
  for (const cuenta of cuentasMonetarias) {
    const saldo = saldosMonetarios.get(cuenta.id) || 0
    // saldo ya viene en signo natural (debit-credit): activo positivo, pasivo negativo
    netoMonetario += saldo
  }
  const rei = round2(-netoMonetario * (factor - 1))
  if (Math.abs(rei) >= 0.01) {
    if (rei > 0) {
      const cta = await buscarCuentaPorUso(empresaId, 'GANANCIA_EXPOSICION_INFLACION')
      lineas.push({ cuentaId: cta.id, credit: rei, descripcion: `Ganancia por exposición a la inflación ${mes}/${ano}` })
    } else {
      const cta = await buscarCuentaPorUso(empresaId, 'PERDIDA_EXPOSICION_INFLACION')
      lineas.push({ cuentaId: cta.id, debit: -rei, descripcion: `Pérdida por exposición a la inflación ${mes}/${ano}` })
    }
  }

  if (lineas.length === 0) {
    throw new Error('No hay partidas que ajustar en este período (sin variación de índice o sin saldos afectados)')
  }

  // 3. Cerrar el asiento con la cuenta patrimonial de ajuste por inflación
  const totalDebit = lineas.reduce((s, l) => s + (aNumero(l.debit) || 0), 0)
  const totalCredit = lineas.reduce((s, l) => s + (aNumero(l.credit) || 0), 0)
  const diff = round2(totalDebit - totalCredit)
  const ctaPatrimonio = await buscarCuentaPorUso(empresaId, 'AJUSTE_INFLACION_PATRIMONIO')
  if (diff > 0.01) lineas.push({ cuentaId: ctaPatrimonio.id, credit: diff, descripcion: 'Ajuste por inflación - partidas no monetarias' })
  else if (diff < -0.01) lineas.push({ cuentaId: ctaPatrimonio.id, debit: -diff, descripcion: 'Ajuste por inflación - partidas no monetarias' })

  const asiento = await persistirAsiento(empresaId, userId, null, 'AJUSTE_INFLACION', finMes, `Ajuste por inflación ${mes}/${ano}`, null, 'sistema', lineas)

  const ajuste = await db.ajusteInflacion.create({
    data: {
      empresaId, mes, ano, indiceInicial, indiceFinal, factorReexpresion: factor,
      totalReexpresadoActivos: round2(totalReexpresadoActivos),
      resultadoExposicionInflacion: rei,
      estado: 'GENERADO',
      asientoId: asiento.id,
    },
  })

  return { ajuste, asiento, lineasGeneradas: lineas.length }
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}
