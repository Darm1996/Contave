// Reporte mensual de IGTF (Impuesto a las Grandes Transacciones Financieras, 3%)
// Se deriva directamente de las facturas con montoIGTF > 0 del período, igual
// que el reporte de ISLR.

import { db } from '@/lib/db'

export interface FilaIGTF {
  fecha: Date
  numeroFactura: string
  rifContraparte: string
  nombreContraparte: string
  motivo: string
  total: number
  porcentajeIGTF: number
  montoIGTF: number
}

export interface ReporteIGTFMensual {
  mes: number
  ano: number
  mesNombre: string
  filas: FilaIGTF[]
  totalOperaciones: number
  totalBaseGravada: number
  totalIGTF: number
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export async function generarReporteIGTFMensual(empresaId: string, mes: number, ano: number): Promise<ReporteIGTFMensual> {
  const inicioMes = new Date(ano, mes - 1, 1)
  const finMes = new Date(ano, mes, 0, 23, 59, 59)

  const facturas = await db.factura.findMany({
    where: { empresaId, montoIGTF: { gt: 0 }, fechaEmision: { gte: inicioMes, lte: finMes } },
    orderBy: { fechaEmision: 'asc' },
  })

  const filas: FilaIGTF[] = facturas.map((f) => ({
    fecha: f.fechaEmision,
    numeroFactura: f.numeroFactura || f.numeroControl || '',
    rifContraparte: f.rifContraparte,
    nombreContraparte: f.nombreContraparte,
    motivo: f.pagoDivisaOCripto ? 'Pago en divisas/cripto' : 'Efectivo (contribuyente especial)',
    total: f.total,
    porcentajeIGTF: f.porcentajeIGTF || 3,
    montoIGTF: f.montoIGTF || 0,
  }))

  return {
    mes,
    ano,
    mesNombre: MESES[mes - 1] || '',
    filas,
    totalOperaciones: filas.length,
    totalBaseGravada: filas.reduce((s, f) => s + f.total, 0),
    totalIGTF: filas.reduce((s, f) => s + f.montoIGTF, 0),
  }
}
