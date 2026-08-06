// Nómina básica: empleados, cálculo mensual (IVSS, FAOV, INCES, bono de
// alimentación, provisión de prestaciones sociales y utilidades) y asiento
// contable. Simplificación MVP: no cubre liquidación LOTTT completa ni
// vacaciones; los porcentajes patronales son configurables por empresa
// (Empresa.porcentajeIVSSPatronal, etc.), el % de IVSS del empleado se toma
// como el estándar legal vigente (4%).

import { db } from '@/lib/db'
import { buscarCuentaPorUso, buscarCuentaGasto, persistirAsiento, LineaAsientoInput } from './asientos-engine'

const PORCENTAJE_IVSS_EMPLEADO = 4

export interface EmpleadoInput {
  cedula: string
  nombre: string
  cargo?: string
  fechaIngreso: string | Date
  salarioBase: number
}

export async function registrarEmpleado(empresaId: string, input: EmpleadoInput) {
  if (!input.cedula || !input.nombre) throw new Error('cédula y nombre son requeridos')
  if (!input.salarioBase || input.salarioBase <= 0) throw new Error('salarioBase debe ser mayor a 0')
  return db.empleado.create({
    data: {
      empresaId,
      cedula: input.cedula,
      nombre: input.nombre,
      cargo: input.cargo || null,
      fechaIngreso: new Date(input.fechaIngreso),
      salarioBase: input.salarioBase,
    },
  })
}

export async function listarEmpleados(empresaId: string) {
  return db.empleado.findMany({ where: { empresaId }, orderBy: { nombre: 'asc' } })
}

export async function desactivarEmpleado(empresaId: string, id: string) {
  const empleado = await db.empleado.findUnique({ where: { id } })
  if (!empleado || empleado.empresaId !== empresaId) throw new Error('Empleado no encontrado')
  return db.empleado.update({ where: { id }, data: { activo: false } })
}

export interface CalculoNomina {
  salarioBase: number
  bonoAlimentacion: number
  deduccionIVSS: number
  deduccionFAOV: number
  totalDeducciones: number
  aportePatronalIVSS: number
  aportePatronalFAOV: number
  aportePatronalINCES: number
  provisionPrestaciones: number
  provisionUtilidades: number
  netoAPagar: number
}

export function calcularNominaEmpleado(
  salarioMensual: number,
  diasTrabajados: number,
  bonoAlimentacion: number,
  empresa: {
    porcentajeIVSSPatronal: number
    porcentajeFAOVEmpleado: number
    porcentajeFAOVPatronal: number
    porcentajeINCES: number
    diasPrestacionesPorMes: number
    porcentajeUtilidades: number
  },
): CalculoNomina {
  const salarioProporcional = salarioMensual * (Math.min(diasTrabajados, 30) / 30)
  const deduccionIVSS = round2(salarioProporcional * (PORCENTAJE_IVSS_EMPLEADO / 100))
  const deduccionFAOV = round2(salarioProporcional * (empresa.porcentajeFAOVEmpleado / 100))
  const totalDeducciones = round2(deduccionIVSS + deduccionFAOV)
  const aportePatronalIVSS = round2(salarioProporcional * (empresa.porcentajeIVSSPatronal / 100))
  const aportePatronalFAOV = round2(salarioProporcional * (empresa.porcentajeFAOVPatronal / 100))
  const aportePatronalINCES = round2(salarioProporcional * (empresa.porcentajeINCES / 100))
  const provisionPrestaciones = round2((salarioProporcional / 30) * empresa.diasPrestacionesPorMes)
  const provisionUtilidades = round2(salarioProporcional * (empresa.porcentajeUtilidades / 100))
  const netoAPagar = round2(salarioProporcional + bonoAlimentacion - totalDeducciones)

  return {
    salarioBase: round2(salarioProporcional),
    bonoAlimentacion: round2(bonoAlimentacion),
    deduccionIVSS,
    deduccionFAOV,
    totalDeducciones,
    aportePatronalIVSS,
    aportePatronalFAOV,
    aportePatronalINCES,
    provisionPrestaciones,
    provisionUtilidades,
    netoAPagar,
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export interface ProcesarNominaInput {
  overrides?: Array<{ empleadoId: string; diasTrabajados?: number; bonoAlimentacion?: number }>
}

export async function procesarNomina(empresaId: string, mes: number, ano: number, userId: string, input: ProcesarNominaInput = {}) {
  const existente = await db.nomina.findUnique({ where: { empresaId_mes_ano: { empresaId, mes, ano } } })
  if (existente) throw new Error(`Ya existe una nómina procesada para ${mes}/${ano}`)

  const empresa = await db.empresa.findUnique({ where: { id: empresaId } })
  if (!empresa) throw new Error('Empresa no encontrada')

  const empleados = await db.empleado.findMany({ where: { empresaId, activo: true } })
  if (empleados.length === 0) throw new Error('No hay empleados activos para procesar nómina')

  const overridesMap = new Map((input.overrides || []).map((o) => [o.empleadoId, o]))

  const detalles = empleados.map((emp) => {
    const ov = overridesMap.get(emp.id)
    const calc = calcularNominaEmpleado(emp.salarioBase, ov?.diasTrabajados ?? 30, ov?.bonoAlimentacion ?? 0, empresa)
    return { empleadoId: emp.id, ...calc }
  })

  const totales = detalles.reduce((acc, d) => ({
    totalSueldos: acc.totalSueldos + d.salarioBase,
    totalBonoAlimentacion: acc.totalBonoAlimentacion + d.bonoAlimentacion,
    totalDeducciones: acc.totalDeducciones + d.totalDeducciones,
    totalAportesPatronales: acc.totalAportesPatronales + d.aportePatronalIVSS + d.aportePatronalFAOV + d.aportePatronalINCES,
    totalPrestaciones: acc.totalPrestaciones + d.provisionPrestaciones,
    totalUtilidades: acc.totalUtilidades + d.provisionUtilidades,
    totalNeto: acc.totalNeto + d.netoAPagar,
  }), { totalSueldos: 0, totalBonoAlimentacion: 0, totalDeducciones: 0, totalAportesPatronales: 0, totalPrestaciones: 0, totalUtilidades: 0, totalNeto: 0 })

  const totalIVSS = detalles.reduce((s, d) => s + d.deduccionIVSS + d.aportePatronalIVSS, 0)
  const totalFAOV = detalles.reduce((s, d) => s + d.deduccionFAOV + d.aportePatronalFAOV, 0)
  const totalINCES = detalles.reduce((s, d) => s + d.aportePatronalINCES, 0)

  // Construir asiento
  const lineas: LineaAsientoInput[] = []
  const ctaSueldos = await buscarCuentaGasto(empresaId, 'GASTO_SUELDOS')
  lineas.push({ cuentaId: ctaSueldos.id, debit: round2(totales.totalSueldos), descripcion: `Sueldos ${mes}/${ano}` })
  if (totales.totalBonoAlimentacion > 0) {
    const cta = await buscarCuentaGasto(empresaId, 'GASTO_BONO_ALIMENTACION')
    lineas.push({ cuentaId: cta.id, debit: round2(totales.totalBonoAlimentacion), descripcion: `Bono de alimentación ${mes}/${ano}` })
  }
  const ctaAportes = await buscarCuentaGasto(empresaId, 'GASTO_APORTES_PATRONALES')
  lineas.push({ cuentaId: ctaAportes.id, debit: round2(totales.totalAportesPatronales), descripcion: `Aportes patronales ${mes}/${ano}` })
  const ctaPrestaciones = await buscarCuentaGasto(empresaId, 'GASTO_PRESTACIONES')
  lineas.push({ cuentaId: ctaPrestaciones.id, debit: round2(totales.totalPrestaciones), descripcion: `Provisión prestaciones ${mes}/${ano}` })
  const ctaUtilidades = await buscarCuentaGasto(empresaId, 'GASTO_UTILIDADES')
  lineas.push({ cuentaId: ctaUtilidades.id, debit: round2(totales.totalUtilidades), descripcion: `Provisión utilidades ${mes}/${ano}` })

  const ctaIVSSPagar = await buscarCuentaPorUso(empresaId, 'IVSS_POR_PAGAR')
  lineas.push({ cuentaId: ctaIVSSPagar.id, credit: round2(totalIVSS), descripcion: 'IVSS por enterar (empleado + patronal)' })
  const ctaFAOVPagar = await buscarCuentaPorUso(empresaId, 'FAOV_POR_PAGAR')
  lineas.push({ cuentaId: ctaFAOVPagar.id, credit: round2(totalFAOV), descripcion: 'FAOV por enterar (empleado + patronal)' })
  const ctaINCESPagar = await buscarCuentaPorUso(empresaId, 'INCES_POR_PAGAR')
  lineas.push({ cuentaId: ctaINCESPagar.id, credit: round2(totalINCES), descripcion: 'INCES por enterar' })
  const ctaPrestacionesPagar = await buscarCuentaPorUso(empresaId, 'PRESTACIONES_POR_PAGAR')
  lineas.push({ cuentaId: ctaPrestacionesPagar.id, credit: round2(totales.totalPrestaciones), descripcion: 'Prestaciones sociales por pagar' })
  const ctaUtilidadesPagar = await buscarCuentaPorUso(empresaId, 'UTILIDADES_POR_PAGAR')
  lineas.push({ cuentaId: ctaUtilidadesPagar.id, credit: round2(totales.totalUtilidades), descripcion: 'Utilidades por pagar' })
  const ctaSueldosPagar = await buscarCuentaPorUso(empresaId, 'NOMINA_SUELDOS_POR_PAGAR')
  lineas.push({ cuentaId: ctaSueldosPagar.id, credit: round2(totales.totalNeto), descripcion: 'Neto a pagar a empleados' })

  const totalDebit = lineas.reduce((s, l) => s + (l.debit || 0), 0)
  const totalCredit = lineas.reduce((s, l) => s + (l.credit || 0), 0)
  if (Math.abs(totalDebit - totalCredit) > 0.05) {
    throw new Error(`Asiento de nómina no balanceado. Débito: ${totalDebit}, Crédito: ${totalCredit}`)
  }

  const fecha = new Date(ano, mes, 0)
  const asiento = await persistirAsiento(empresaId, userId, null, 'NOMINA', fecha, `Nómina ${mes}/${ano}`, null, 'sistema', lineas)

  const nomina = await db.nomina.create({
    data: {
      empresaId, mes, ano, estado: 'PROCESADA', asientoId: asiento.id,
      totalSueldos: round2(totales.totalSueldos),
      totalBonoAlimentacion: round2(totales.totalBonoAlimentacion),
      totalDeducciones: round2(totales.totalDeducciones),
      totalAportesPatronales: round2(totales.totalAportesPatronales),
      totalPrestaciones: round2(totales.totalPrestaciones),
      totalUtilidades: round2(totales.totalUtilidades),
      totalNeto: round2(totales.totalNeto),
      detalles: {
        create: detalles.map((d) => ({
          empleadoId: d.empleadoId,
          salarioBase: d.salarioBase,
          bonoAlimentacion: d.bonoAlimentacion,
          deduccionIVSS: d.deduccionIVSS,
          deduccionFAOV: d.deduccionFAOV,
          totalDeducciones: d.totalDeducciones,
          aportePatronalIVSS: d.aportePatronalIVSS,
          aportePatronalFAOV: d.aportePatronalFAOV,
          aportePatronalINCES: d.aportePatronalINCES,
          provisionPrestaciones: d.provisionPrestaciones,
          provisionUtilidades: d.provisionUtilidades,
          netoAPagar: d.netoAPagar,
        })),
      },
    },
    include: { detalles: { include: { empleado: true } } },
  })

  // Acumular la garantía de prestaciones sociales del período (LOTTT Art. 142
  // lit. a) en cada empleado, para compararla contra el cálculo retroactivo
  // al momento de la liquidación final.
  await Promise.all(detalles.map((d) =>
    db.empleado.update({
      where: { id: d.empleadoId },
      data: { prestacionesAcumuladas: { increment: d.provisionPrestaciones } },
    }),
  ))

  return nomina
}

export async function listarNominas(empresaId: string) {
  return db.nomina.findMany({ where: { empresaId }, orderBy: [{ ano: 'desc' }, { mes: 'desc' }] })
}

export async function obtenerNomina(empresaId: string, id: string) {
  const nomina = await db.nomina.findUnique({ where: { id }, include: { detalles: { include: { empleado: true } } } })
  if (!nomina || nomina.empresaId !== empresaId) throw new Error('Nómina no encontrada')
  return nomina
}
