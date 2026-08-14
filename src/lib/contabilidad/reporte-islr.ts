// Reporte mensual de retenciones ISLR (ARC)
// Formato según Providencia SNAT/2016/0068 (Agentes de Retención)
// Resumen mensual de retenciones practicadas a terceros

import { db } from '@/lib/db'
import { TARIFAS_ISLR, buscarTarifaISLR } from './islr'
import { aNumero } from '@/lib/nucleo/dinero'

export interface FilaReporteISLR {
  fecha: Date
  ncf: string
  numeroFactura: string
  rifBeneficiario: string
  nombreBeneficiario: string
  concepto: string
  tarifaCodigo: string
  baseImponible: number
  porcentajeRetencion: number
  montoRetenido: number
  montoTotalOperacion: number
}

export interface ReporteISLRMensual {
  mes: number
  ano: number
  mesNombre: string
  // Detalle de retenciones
  filas: FilaReporteISLR[]
  // Totales
  totalOperaciones: number
  totalBaseImponible: number
  totalRetenido: number
  totalOperacionesMonetarias: number
  // Resumen por tarifa
  resumenPorTarifa: Array<{
    tarifaCodigo: string
    concepto: string
    porcentaje: number
    cantidad: number
    baseImponible: number
    montoRetenido: number
  }>
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export async function generarReporteISLRMensual(
  empresaId: string,
  mes: number,
  ano: number,
): Promise<ReporteISLRMensual> {
  const inicioMes = new Date(ano, mes - 1, 1)
  const finMes = new Date(ano, mes, 0, 23, 59, 59)

  // Obtener todas las facturas con retención ISLR en el mes
  const facturas = await db.factura.findMany({
    where: {
      empresaId,
      montoRetencionISLR: { gt: 0 },
      fechaEmision: { gte: inicioMes, lte: finMes },
    },
    orderBy: { fechaEmision: 'asc' },
  })

  const filas: FilaReporteISLR[] = []
  for (const f of facturas) {
    const tarifa = f.tarifaISLRCodigo ? buscarTarifaISLR(f.tarifaISLRCodigo) : null
    filas.push({
      fecha: f.fechaEmision,
      ncf: f.ncf || '',
      numeroFactura: f.numeroFactura || '',
      rifBeneficiario: f.rifContraparte,
      nombreBeneficiario: f.nombreContraparte,
      concepto: tarifa?.concepto || 'Sin especificar',
      tarifaCodigo: f.tarifaISLRCodigo || '',
      baseImponible: aNumero(f.baseRetencionISLR) || 0,
      porcentajeRetencion: aNumero(f.porcentajeRetencionISLR) || 0,
      montoRetenido: aNumero(f.montoRetencionISLR) || 0,
      montoTotalOperacion: aNumero(f.total),
    })
  }

  // Calcular totales
  const totalOperaciones = filas.length
  const totalBaseImponible = filas.reduce((s, f) => s + f.baseImponible, 0)
  const totalRetenido = filas.reduce((s, f) => s + f.montoRetenido, 0)
  const totalOperacionesMonetarias = filas.reduce((s, f) => s + f.montoTotalOperacion, 0)

  // Agrupar por tarifa
  const porTarifa: Record<string, { tarifaCodigo: string; concepto: string; porcentaje: number; cantidad: number; baseImponible: number; montoRetenido: number }> = {}
  for (const f of filas) {
    const key = f.tarifaCodigo || 'SIN_TARIFA'
    if (!porTarifa[key]) {
      const tarifa = buscarTarifaISLR(f.tarifaCodigo)
      porTarifa[key] = {
        tarifaCodigo: f.tarifaCodigo,
        concepto: tarifa?.concepto || f.concepto,
        porcentaje: f.porcentajeRetencion,
        cantidad: 0,
        baseImponible: 0,
        montoRetenido: 0,
      }
    }
    porTarifa[key].cantidad++
    porTarifa[key].baseImponible += f.baseImponible
    porTarifa[key].montoRetenido += f.montoRetenido
  }

  return {
    mes,
    ano,
    mesNombre: MESES[mes - 1] || '',
    filas,
    totalOperaciones,
    totalBaseImponible,
    totalRetenido,
    totalOperacionesMonetarias,
    resumenPorTarifa: Object.values(porTarifa),
  }
}
