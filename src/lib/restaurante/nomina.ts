// Nómina semanal del local.
//
// El negocio paga por semana (lunes a domingo): un sueldo base acordado en
// dólares más el reparto del pote de propinas de esos siete días, y aparte
// transporte y delivery. Aquí la semana se arma sola: se traen las personas
// activas, se suman las propinas de los cierres de esa semana y se reparten.
// Lo único que queda por escribir a mano es transporte, delivery y descuentos.

import { db } from '@/lib/db'
import {
  calcularNetoLinea, calcularTotalesNomina, redondear, repartirPropinas, semanaDe, soloFecha,
} from './calculos'
import { registrarMovimiento, borrarMovimientosDeOrigen } from './fondos'

/**
 * Crea (o devuelve, si ya existe) la nómina de la semana que contiene la
 * fecha dada, precargada con el personal activo y las propinas repartidas.
 */
export async function prepararSemana(empresaId: string, fechaReferencia: Date) {
  const { inicio, fin } = semanaDe(fechaReferencia)

  const existente = await db.restNominaSemana.findUnique({
    where: { empresaId_fechaInicio: { empresaId, fechaInicio: inicio } },
    include: { lineas: true },
  })
  if (existente) return existente

  const [personal, cierres] = await Promise.all([
    db.restPersonal.findMany({ where: { empresaId, activo: true }, orderBy: { nombre: 'asc' } }),
    db.restCierreDiario.findMany({
      where: { empresaId, fecha: { gte: inicio, lte: fin } },
      select: { propinas: true },
    }),
  ])

  const potePropinas = redondear(cierres.reduce((a, c) => a + (c.propinas || 0), 0))
  const conPropina = personal.filter((p) => p.recibePropina)
  const reparto = repartirPropinas(potePropinas, conPropina.map((p) => ({ id: p.id })))

  const lineas = personal.map((p) => {
    const base = p.pagoBaseSemanal || 0
    const propina = reparto[p.id] || 0
    return {
      personalId: p.id,
      base,
      propina,
      transporte: 0,
      delivery: 0,
      descuento: 0,
      neto: calcularNetoLinea({ base, propina }),
    }
  })

  const totales = calcularTotalesNomina(lineas)

  return db.restNominaSemana.create({
    data: {
      empresaId,
      fechaInicio: inicio,
      fechaFin: fin,
      estado: 'BORRADOR',
      ...totales,
      lineas: { create: lineas },
    },
    include: { lineas: true },
  })
}

/** Recalcula neto por línea y totales de la semana tras editar la tabla. */
export async function recalcularSemana(semanaId: string) {
  const lineas = await db.restNominaLinea.findMany({ where: { semanaId } })

  for (const l of lineas) {
    const neto = calcularNetoLinea(l)
    if (neto !== l.neto) {
      await db.restNominaLinea.update({ where: { id: l.id }, data: { neto } })
    }
  }

  const totales = calcularTotalesNomina(lineas)
  return db.restNominaSemana.update({
    where: { id: semanaId },
    data: totales,
    include: { lineas: true },
  })
}

/**
 * Marca la semana como pagada: descuenta el neto del fondo elegido y lo
 * deja registrado como gasto de nómina, para que el resumen del mes lo
 * incluya sin tener que cargarlo aparte.
 */
export async function pagarSemana(
  empresaId: string,
  semanaId: string,
  fondoId: string,
  fechaPago: Date,
  tasa = 0,
) {
  const semana = await db.restNominaSemana.findFirst({
    where: { id: semanaId, empresaId },
  })
  if (!semana) throw new Error('La nómina de esa semana no existe')
  if (semana.estado === 'PAGADA') throw new Error('Esa nómina ya fue marcada como pagada')
  if (semana.totalNeto <= 0) throw new Error('No hay nada que pagar en esa semana')

  const fondo = await db.restFondo.findFirst({ where: { id: fondoId, empresaId } })
  if (!fondo) throw new Error('El fondo indicado no existe')

  const fecha = soloFecha(fechaPago)
  const descripcion = `Nómina semana ${semana.fechaInicio.toISOString().slice(0, 10)} al ${semana.fechaFin.toISOString().slice(0, 10)}`

  await db.restGasto.create({
    data: {
      empresaId,
      fecha,
      descripcion,
      categoria: 'NOMINA',
      fondoId,
      montoUSD: semana.totalNeto,
      montoVES: tasa > 0 ? redondear(semana.totalNeto * tasa) : 0,
      tasa,
      // La referencia enlaza el gasto con la semana para poder retirarlo
      // si después se revierte el pago.
      referencia: `NOMINA:${semanaId}`,
    },
  })

  await registrarMovimiento(db, {
    empresaId,
    fondoId,
    fecha,
    tipo: 'EGRESO',
    montoUSD: semana.totalNeto,
    montoVES: tasa > 0 ? redondear(semana.totalNeto * tasa) : undefined,
    tasa,
    concepto: descripcion,
    origen: 'NOMINA',
    origenId: semanaId,
  })

  return db.restNominaSemana.update({
    where: { id: semanaId },
    data: { estado: 'PAGADA', fondoId, fechaPago: fecha },
    include: { lineas: { include: { personal: true } } },
  })
}

/** Deshace el pago de una semana (borra su gasto y su movimiento de fondo). */
export async function revertirPagoSemana(empresaId: string, semanaId: string) {
  const semana = await db.restNominaSemana.findFirst({ where: { id: semanaId, empresaId } })
  if (!semana) throw new Error('La nómina de esa semana no existe')
  if (semana.estado !== 'PAGADA') throw new Error('Esa nómina no está marcada como pagada')

  await db.restGasto.deleteMany({ where: { empresaId, referencia: `NOMINA:${semanaId}` } })
  await borrarMovimientosDeOrigen(db, 'NOMINA', semanaId)

  return db.restNominaSemana.update({
    where: { id: semanaId },
    data: { estado: 'BORRADOR', fondoId: null, fechaPago: null },
  })
}
