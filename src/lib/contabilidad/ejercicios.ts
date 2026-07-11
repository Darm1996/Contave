// Multi-ejercicio fiscal
// Cierre anual: genera asiento de cierre (Ingresos/Costos/Gastos → Utilidad del Ejercicio)
// Apertura: genera asiento de apertura para el nuevo ejercicio

import { db } from '@/lib/db'

export interface EjercicioInfo {
  id: string
  ano: number
  estado: string
  fechaInicio: Date
  fechaCierre: Date
  utilidadNeta: number | null
  islrEstimado: number | null
  cerradoEn: Date | null
}

// Crear ejercicio para un año específico
export async function crearEjercicio(empresaId: string, ano: number): Promise<EjercicioInfo> {
  const existente = await db.ejercicio.findUnique({
    where: { empresaId_ano: { empresaId, ano } },
  })
  if (existente) return existente

  return db.ejercicio.create({
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
async function obtenerSaldosPorTipo(empresaId: string, desde: Date, hasta: Date, tipo: string) {
  const cuentas = await db.cuenta.findMany({
    where: { empresaId, imputable: true, tipo },
    orderBy: { codigo: 'asc' },
  })
  const resultado = []
  for (const cuenta of cuentas) {
    const lineas = await db.asientoLinea.findMany({
      where: {
        cuentaId: cuenta.id,
        asiento: { empresaId, fecha: { gte: desde, lte: hasta } },
      },
      select: { debit: true, credit: true },
    })
    if (lineas.length === 0) continue
    const tDeb = lineas.reduce((s, l) => s + l.debit, 0)
    const tCre = lineas.reduce((s, l) => s + l.credit, 0)
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
export async function cerrarEjercicio(
  empresaId: string,
  ano: number,
  userId: string,
): Promise<{ asientoCierre: any; asientoApertura?: any; utilidadNeta: number; islrEstimado: number; ejercicio: EjercicioInfo }> {
  // Verificar que el ejercicio exista y esté abierto
  let ejercicio = await db.ejercicio.findUnique({
    where: { empresaId_ano: { empresaId, ano } },
  })
  if (!ejercicio) {
    ejercicio = await crearEjercicio(empresaId, ano)
  }
  if (ejercicio.estado === 'CERRADO') {
    throw new Error(`El ejercicio ${ano} ya está cerrado`)
  }

  const desde = new Date(ano, 0, 1)
  const hasta = new Date(ano, 11, 31, 23, 59, 59)

  // Obtener saldos de ingresos, costos y gastos
  const ingresos = await obtenerSaldosPorTipo(empresaId, desde, hasta, 'INGRESO')
  const costos = await obtenerSaldosPorTipo(empresaId, desde, hasta, 'COSTO')
  const gastos = await obtenerSaldosPorTipo(empresaId, desde, hasta, 'GASTO')

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
    const cuentaUtilidad = await db.cuenta.findFirst({ where: { empresaId, uso: 'UTILIDAD_EJERCICIO' } })
    const cuentaISLR = await db.cuenta.findFirst({
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
    const cuentaUtilidad = await db.cuenta.findFirst({ where: { empresaId, uso: 'UTILIDAD_EJERCICIO' } })
    const cuentaPerdida = await db.cuenta.findFirst({ where: { empresaId, uso: 'PERDIDA_EJERCICIO' } })
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
  const ultimoAsiento = await db.asiento.findFirst({
    where: { empresaId },
    orderBy: { numero: 'desc' },
  })
  const numeroCierre = (ultimoAsiento?.numero || 0) + 1

  const asientoCierre = await db.asiento.create({
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
  const cuentasBalance = await db.cuenta.findMany({
    where: { empresaId, imputable: true, tipo: { in: ['ACTIVO', 'PASIVO', 'PATRIMONIO'] } },
    orderBy: { codigo: 'asc' },
  })
  const lineasApertura: Array<{ cuentaId: string; debit?: number; credit?: number; descripcion: string }> = []
  for (const cuenta of cuentasBalance) {
    const lineasC = await db.asientoLinea.findMany({
      where: {
        cuentaId: cuenta.id,
        asiento: { empresaId, fecha: { gte: desde, lte: hasta } },
      },
      select: { debit: true, credit: true },
    })
    if (lineasC.length === 0) continue
    const tDeb = lineasC.reduce((s, l) => s + l.debit, 0)
    const tCre = lineasC.reduce((s, l) => s + l.credit, 0)
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

  // Agregar la utilidad/pérdida del ejercicio al asiento de apertura
  // (el resultado del ejercicio cerrado pasa a formar parte del patrimonio en el nuevo ejercicio)
  if (Math.abs(utilidadNeta) > 0.01) {
    const cuentaUtilidad = await db.cuenta.findFirst({ where: { empresaId, uso: 'UTILIDAD_EJERCICIO' } })
    const cuentaPerdida = await db.cuenta.findFirst({ where: { empresaId, uso: 'PERDIDA_EJERCICIO' } })
    if (utilidadNeta > 0 && cuentaUtilidad) {
      lineasApertura.push({ cuentaId: cuentaUtilidad.id, credit: utilidadNeta, descripcion: `Utilidad ejercicio ${ano} (apertura)` })
    } else if (utilidadNeta < 0 && cuentaPerdida) {
      lineasApertura.push({ cuentaId: cuentaPerdida.id, debit: Math.abs(utilidadNeta), descripcion: `Pérdida ejercicio ${ano} (apertura)` })
    }
  }

  // Verificar que la apertura balancea
  const apDebit = lineasApertura.reduce((s, l) => s + (l.debit || 0), 0)
  const apCredit = lineasApertura.reduce((s, l) => s + (l.credit || 0), 0)
  if (Math.abs(apDebit - apCredit) > 0.01) {
    console.warn(`Asiento de apertura no balancea: Débito ${apDebit} vs Crédito ${apCredit}`)
  }

  let asientoApertura: any = null
  if (lineasApertura.length > 0) {
    const numeroApertura = numeroCierre + 1
    asientoApertura = await db.asiento.create({
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
  await crearEjercicio(empresaId, anoSiguiente)

  // Marcar ejercicio como cerrado
  const ejercicioCerrado = await db.ejercicio.update({
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
}

// Reabrir ejercicio (si se necesita corregir algo)
export async function reabrirEjercicio(empresaId: string, ano: number): Promise<EjercicioInfo> {
  const ejercicio = await db.ejercicio.findUnique({
    where: { empresaId_ano: { empresaId, ano } },
  })
  if (!ejercicio) throw new Error(`Ejercicio ${ano} no encontrado`)
  if (ejercicio.estado !== 'CERRADO') throw new Error(`El ejercicio ${ano} no está cerrado`)

  // Eliminar asientos de cierre y apertura
  if (ejercicio.asientoCierreId) {
    await db.asientoLinea.deleteMany({ where: { asientoId: ejercicio.asientoCierreId } })
    await db.asiento.delete({ where: { id: ejercicio.asientoCierreId } })
  }
  if (ejercicio.asientoAperturaId) {
    await db.asientoLinea.deleteMany({ where: { asientoId: ejercicio.asientoAperturaId } })
    await db.asiento.delete({ where: { id: ejercicio.asientoAperturaId } })
  }

  return db.ejercicio.update({
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
}
