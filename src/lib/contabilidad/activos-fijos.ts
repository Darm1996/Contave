// Activos Fijos: registro y depreciación mensual (método línea recta)
// Simplificación MVP: el alta del activo no genera asiento de compra (se asume
// ya contabilizado vía una factura de compra); esta lógica solo calcula y
// contabiliza la depreciación mensual acumulada.

import { db } from '@/lib/db'
import { buscarCuentaPorUso, persistirAsiento, LineaAsientoInput } from './asientos-engine'

export interface ActivoFijoInput {
  nombre: string
  cuentaActivoId: string
  costoAdquisicion: number
  fechaAdquisicion: string | Date
  vidaUtilMeses: number
  valorResidual?: number
}

export async function registrarActivo(empresaId: string, input: ActivoFijoInput) {
  if (!input.nombre || !input.cuentaActivoId) throw new Error('nombre y cuentaActivoId son requeridos')
  if (!input.costoAdquisicion || input.costoAdquisicion <= 0) throw new Error('costoAdquisicion debe ser mayor a 0')
  if (!input.vidaUtilMeses || input.vidaUtilMeses <= 0) throw new Error('vidaUtilMeses debe ser mayor a 0')

  const cuenta = await db.cuenta.findUnique({ where: { id: input.cuentaActivoId } })
  if (!cuenta || cuenta.empresaId !== empresaId) throw new Error('Cuenta de activo no encontrada')

  const activo = await db.activoFijo.create({
    data: {
      empresaId,
      nombre: input.nombre,
      cuentaActivoId: input.cuentaActivoId,
      costoAdquisicion: input.costoAdquisicion,
      fechaAdquisicion: new Date(input.fechaAdquisicion),
      vidaUtilMeses: input.vidaUtilMeses,
      valorResidual: input.valorResidual || 0,
    },
  })
  return { ...activo, cuenta }
}

export async function listarActivos(empresaId: string) {
  const activos = await db.activoFijo.findMany({
    where: { empresaId },
    orderBy: { fechaAdquisicion: 'desc' },
  })
  const cuentaIds = [...new Set(activos.map((a) => a.cuentaActivoId))]
  const cuentas = await db.cuenta.findMany({ where: { id: { in: cuentaIds } } })
  const mapaCuentas = new Map(cuentas.map((c) => [c.id, c]))
  return activos.map((a) => ({
    ...a,
    cuenta: mapaCuentas.get(a.cuentaActivoId) || null,
    valorLibro: a.costoAdquisicion - a.depreciacionAcumulada,
    depreciacionMensual: calcularDepreciacionMensual(a.costoAdquisicion, a.valorResidual, a.vidaUtilMeses),
  }))
}

export async function darDeBajaActivo(empresaId: string, id: string) {
  const activo = await db.activoFijo.findUnique({ where: { id } })
  if (!activo || activo.empresaId !== empresaId) throw new Error('Activo no encontrado')
  return db.activoFijo.update({ where: { id }, data: { estado: 'DADO_DE_BAJA' } })
}

export function calcularDepreciacionMensual(costoAdquisicion: number, valorResidual: number, vidaUtilMeses: number): number {
  return Math.max(0, (costoAdquisicion - valorResidual) / vidaUtilMeses)
}

// Genera un asiento único que agrupa la depreciación del mes de todos los
// activos vigentes (el detalle por activo queda en MovimientoDepreciacion).
export async function generarAsientoDepreciacionMes(empresaId: string, mes: number, ano: number, userId: string) {
  const activos = await db.activoFijo.findMany({ where: { empresaId, estado: 'ACTIVO' } })
  if (activos.length === 0) throw new Error('No hay activos fijos vigentes para depreciar')

  const yaGenerados = await db.movimientoDepreciacion.findMany({
    where: { mes, ano, activoFijoId: { in: activos.map((a) => a.id) } },
  })
  const yaGeneradosIds = new Set(yaGenerados.map((m) => m.activoFijoId))

  const detalle: Array<{ activoId: string; monto: number; valorLibroDespues: number }> = []
  let totalDepreciado = 0
  for (const activo of activos) {
    if (yaGeneradosIds.has(activo.id)) continue
    const mensual = calcularDepreciacionMensual(activo.costoAdquisicion, activo.valorResidual, activo.vidaUtilMeses)
    const restante = activo.costoAdquisicion - activo.valorResidual - activo.depreciacionAcumulada
    const monto = Math.min(mensual, Math.max(0, restante))
    if (monto <= 0) continue
    detalle.push({ activoId: activo.id, monto, valorLibroDespues: activo.costoAdquisicion - (activo.depreciacionAcumulada + monto) })
    totalDepreciado += monto
  }

  if (detalle.length === 0) throw new Error('No hay depreciación pendiente para este período (ya generada o activos totalmente depreciados)')

  const ctaGasto = await buscarCuentaPorUso(empresaId, 'GASTO_DEPRECIACION')
  const ctaAcumulada = await buscarCuentaPorUso(empresaId, 'DEP_ACUMULADA')
  const lineas: LineaAsientoInput[] = [
    { cuentaId: ctaGasto.id, debit: totalDepreciado, descripcion: `Depreciación del mes ${mes}/${ano}` },
    { cuentaId: ctaAcumulada.id, credit: totalDepreciado, descripcion: `Depreciación acumulada ${mes}/${ano}` },
  ]

  const fecha = new Date(ano, mes, 0) // último día del mes
  const asiento = await persistirAsiento(
    empresaId, userId, null, 'DEPRECIACION', fecha,
    `Depreciación de activos fijos - ${mes}/${ano}`, null, 'sistema', lineas,
  )

  for (const d of detalle) {
    await db.movimientoDepreciacion.create({
      data: { activoFijoId: d.activoId, mes, ano, montoDepreciado: d.monto, valorLibroDespues: d.valorLibroDespues, asientoId: asiento.id },
    })
    const activo = activos.find((a) => a.id === d.activoId)!
    const nuevaAcumulada = activo.depreciacionAcumulada + d.monto
    const totalmenteDepreciado = nuevaAcumulada >= activo.costoAdquisicion - activo.valorResidual - 0.01
    await db.activoFijo.update({
      where: { id: d.activoId },
      data: { depreciacionAcumulada: nuevaAcumulada, estado: totalmenteDepreciado ? 'DEPRECIADO_TOTAL' : 'ACTIVO' },
    })
  }

  return { asiento, totalDepreciado, activosDepreciados: detalle.length }
}
