// Exportador a Excel (.xlsx) con múltiples hojas
// Hojas: Facturas, Libro Diario, Libro Mayor, Balance de Comprobación

import ExcelJS from 'exceljs'
import { formatBs } from '@/lib/contabilidad/ven-nif'

export interface DatosFacturaExcel {
  fecha: Date
  tipo: string
  ncf: string
  numeroControl: string
  rifContraparte: string
  nombreContraparte: string
  baseImponible: number
  montoExento: number
  montoExonerado: number
  montoIVA: number
  retencionIVA: number | null
  total: number
  totalAPagar: number
  moneda: string
  descripcion: string | null
}

export interface DatosAsientoExcel {
  numero: number
  fecha: Date
  descripcion: string
  referencia: string | null
  codigoCuenta: string
  nombreCuenta: string
  debit: number
  credit: number
}

export interface DatosMayorExcel {
  codigoCuenta: string
  nombreCuenta: string
  tipoCuenta: string
  saldoInicial: number
  movimientos: Array<{
    fecha: Date
    numeroAsiento: number
    descripcion: string
    debit: number
    credit: number
    saldo: number
  }>
  totalDebit: number
  totalCredit: number
  saldoFinal: number
}

export interface DatosBalanceExcel {
  codigoCuenta: string
  nombreCuenta: string
  tipoCuenta: string
  saldoDeudor: number
  saldoAcreedor: number
}

export async function generarExcelContable(datos: {
  empresa: { nombre: string; rif: string }
  facturas: DatosFacturaExcel[]
  asientos: DatosAsientoExcel[]
  mayor: DatosMayorExcel[]
  balance: DatosBalanceExcel[]
  libroCompras?: any[]
  libroVentas?: any[]
  fechaDesde?: Date
  fechaHasta?: Date
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'ContaVE'
  wb.created = new Date()

  // Hoja 1: Portada
  const wsPortada = wb.addWorksheet('Portada')
  wsPortada.columns = [{ width: 25 }, { width: 50 }]
  wsPortada.getCell('A1').value = 'ContaVE - Reporte Contable'
  wsPortada.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FF1F4E79' } }
  wsPortada.getCell('A3').value = 'Empresa:'
  wsPortada.getCell('B3').value = datos.empresa.nombre
  wsPortada.getCell('A4').value = 'RIF:'
  wsPortada.getCell('B4').value = datos.empresa.rif
  wsPortada.getCell('A5').value = 'Generado:'
  wsPortada.getCell('B5').value = new Date().toLocaleString('es-VE')
  if (datos.fechaDesde) {
    wsPortada.getCell('A6').value = 'Desde:'
    wsPortada.getCell('B6').value = datos.fechaDesde.toLocaleDateString('es-VE')
  }
  if (datos.fechaHasta) {
    wsPortada.getCell('A7').value = 'Hasta:'
    wsPortada.getCell('B7').value = datos.fechaHasta.toLocaleDateString('es-VE')
  }
  wsPortada.getCell('A9').value = 'Hojas en este reporte:'
  wsPortada.getCell('A10').value = '• Facturas'
  wsPortada.getCell('A11').value = '• Libro Diario'
  wsPortada.getCell('A12').value = '• Libro Mayor'
  wsPortada.getCell('A13').value = '• Balance de Comprobación'
  wsPortada.getCell('A14').value = '• Libro de Compras (SENIAT)'
  wsPortada.getCell('A15').value = '• Libro de Ventas (SENIAT)'

  // Hoja 2: Facturas
  const wsFac = wb.addWorksheet('Facturas')
  const colsFac = [
    { header: 'Fecha', key: 'fecha', width: 12 },
    { header: 'Tipo', key: 'tipo', width: 18 },
    { header: 'NCF', key: 'ncf', width: 20 },
    { header: 'N° Control', key: 'control', width: 18 },
    { header: 'RIF', key: 'rif', width: 15 },
    { header: 'Nombre', key: 'nombre', width: 30 },
    { header: 'Base Imponible', key: 'base', width: 15 },
    { header: 'Exento', key: 'exento', width: 12 },
    { header: 'Exonerado', key: 'exonerado', width: 12 },
    { header: 'IVA', key: 'iva', width: 12 },
    { header: 'Ret. IVA', key: 'ret', width: 12 },
    { header: 'Total', key: 'total', width: 14 },
    { header: 'A Pagar', key: 'pagar', width: 14 },
    { header: 'Moneda', key: 'moneda', width: 10 },
    { header: 'Descripción', key: 'desc', width: 35 },
  ]
  wsFac.columns = colsFac
  // Header styling
  const headerRow = wsFac.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } }
  headerRow.alignment = { horizontal: 'center' }
  for (const f of datos.facturas) {
    const row = wsFac.addRow({
      fecha: f.fecha,
      tipo: f.tipo,
      ncf: f.ncf,
      control: f.numeroControl,
      rif: f.rifContraparte,
      nombre: f.nombreContraparte,
      base: f.baseImponible,
      exento: f.montoExento,
      exonerado: f.montoExonerado,
      iva: f.montoIVA,
      ret: f.retencionIVA ?? 0,
      total: f.total,
      pagar: f.totalAPagar,
      moneda: f.moneda,
      desc: f.descripcion || '',
    })
    row.getCell('fecha').numFmt = 'dd/mm/yyyy'
    for (const col of ['base', 'exento', 'exonerado', 'iva', 'ret', 'total', 'pagar']) {
      row.getCell(col).numFmt = '#,##0.00'
    }
  }
  // Totales al final
  if (datos.facturas.length > 0) {
    const totRow = wsFac.addRow({})
    totRow.getCell('nombre').value = 'TOTALES:'
    totRow.getCell('nombre').font = { bold: true }
    for (const col of ['base', 'exento', 'exonerado', 'iva', 'ret', 'total', 'pagar']) {
      const cell = totRow.getCell(col)
      cell.value = { formula: `SUM(${col.toUpperCase()}2:${col.toUpperCase()}${datos.facturas.length + 1})` }
      cell.numFmt = '#,##0.00'
      cell.font = { bold: true }
    }
  }

  // Hoja 3: Libro Diario
  const wsDia = wb.addWorksheet('Libro Diario')
  wsDia.columns = [
    { header: 'N° Asiento', key: 'num', width: 12 },
    { header: 'Fecha', key: 'fecha', width: 12 },
    { header: 'Descripción', key: 'desc', width: 35 },
    { header: 'Referencia', key: 'ref', width: 18 },
    { header: 'Código', key: 'codigo', width: 12 },
    { header: 'Cuenta', key: 'cuenta', width: 35 },
    { header: 'Débito', key: 'debit', width: 14 },
    { header: 'Crédito', key: 'credit', width: 14 },
  ]
  const hdrDia = wsDia.getRow(1)
  hdrDia.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  hdrDia.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } }
  hdrDia.alignment = { horizontal: 'center' }

  let currentNum: number | null = null
  for (const a of datos.asientos) {
    // Agrupar: mostrar descripción solo en la primera línea del asiento
    const isNewAsiento = a.numero !== currentNum
    currentNum = a.numero
    const row = wsDia.addRow({
      num: isNewAsiento ? a.numero : '',
      fecha: isNewAsiento ? a.fecha : '',
      desc: isNewAsiento ? a.descripcion : '',
      ref: isNewAsiento ? (a.referencia || '') : '',
      codigo: a.codigoCuenta,
      cuenta: a.nombreCuenta,
      debit: a.debit || null,
      credit: a.credit || null,
    })
    if (isNewAsiento) {
      row.getCell('fecha').numFmt = 'dd/mm/yyyy'
    }
    row.getCell('debit').numFmt = '#,##0.00'
    row.getCell('credit').numFmt = '#,##0.00'
    if (isNewAsiento) {
      row.font = { bold: true }
    }
  }
  if (datos.asientos.length > 0) {
    const tot = wsDia.addRow({})
    tot.getCell('cuenta').value = 'TOTALES:'
    tot.getCell('cuenta').font = { bold: true }
    tot.getCell('debit').value = { formula: `SUM(G2:G${datos.asientos.length + 1})` }
    tot.getCell('credit').value = { formula: `SUM(H2:H${datos.asientos.length + 1})` }
    tot.getCell('debit').numFmt = '#,##0.00'
    tot.getCell('credit').numFmt = '#,##0.00'
    tot.font = { bold: true }
  }

  // Hoja 4: Libro Mayor (una sección por cuenta)
  const wsMay = wb.addWorksheet('Libro Mayor')
  wsMay.columns = [
    { header: 'Código', key: 'codigo', width: 12 },
    { header: 'Cuenta', key: 'cuenta', width: 35 },
    { header: 'Tipo', key: 'tipo', width: 12 },
    { header: 'Fecha', key: 'fecha', width: 12 },
    { header: 'N° Asiento', key: 'num', width: 12 },
    { header: 'Descripción', key: 'desc', width: 35 },
    { header: 'Débito', key: 'debit', width: 14 },
    { header: 'Crédito', key: 'credit', width: 14 },
    { header: 'Saldo', key: 'saldo', width: 14 },
  ]
  const hdrMay = wsMay.getRow(1)
  hdrMay.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  hdrMay.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } }
  hdrMay.alignment = { horizontal: 'center' }
  for (const cuenta of datos.mayor) {
    // Encabezado de la cuenta
    const cRow = wsMay.addRow({
      codigo: cuenta.codigoCuenta,
      cuenta: cuenta.nombreCuenta,
      tipo: cuenta.tipoCuenta,
    })
    cRow.font = { bold: true, color: { argb: 'FF1F4E79' } }
    cRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7EFF7' } }
    // Saldo inicial
    if (cuenta.saldoInicial !== 0) {
      const si = wsMay.addRow({
        desc: 'Saldo inicial',
        saldo: cuenta.saldoInicial,
      })
      si.getCell('saldo').numFmt = '#,##0.00'
      si.font = { italic: true }
    }
    // Movimientos
    for (const m of cuenta.movimientos) {
      const r = wsMay.addRow({
        fecha: m.fecha,
        num: m.numeroAsiento,
        desc: m.descripcion,
        debit: m.debit || null,
        credit: m.credit || null,
        saldo: m.saldo,
      })
      r.getCell('fecha').numFmt = 'dd/mm/yyyy'
      r.getCell('debit').numFmt = '#,##0.00'
      r.getCell('credit').numFmt = '#,##0.00'
      r.getCell('saldo').numFmt = '#,##0.00'
    }
    // Totales
    const tr = wsMay.addRow({
      desc: 'Totales movimiento:',
      debit: cuenta.totalDebit,
      credit: cuenta.totalCredit,
      saldo: cuenta.saldoFinal,
    })
    tr.getCell('debit').numFmt = '#,##0.00'
    tr.getCell('credit').numFmt = '#,##0.00'
    tr.getCell('saldo').numFmt = '#,##0.00'
    tr.font = { bold: true }
    wsMay.addRow({}) // separador
  }

  // Hoja 5: Balance de Comprobación
  const wsBal = wb.addWorksheet('Balance Comprobación')
  wsBal.columns = [
    { header: 'Código', key: 'codigo', width: 12 },
    { header: 'Cuenta', key: 'cuenta', width: 35 },
    { header: 'Tipo', key: 'tipo', width: 15 },
    { header: 'Saldo Deudor', key: 'deudor', width: 18 },
    { header: 'Saldo Acreedor', key: 'acreedor', width: 18 },
  ]
  const hdrBal = wsBal.getRow(1)
  hdrBal.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  hdrBal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } }
  hdrBal.alignment = { horizontal: 'center' }
  for (const b of datos.balance) {
    const row = wsBal.addRow({
      codigo: b.codigoCuenta,
      cuenta: b.nombreCuenta,
      tipo: b.tipoCuenta,
      deudor: b.saldoDeudor || null,
      acreedor: b.saldoAcreedor || null,
    })
    row.getCell('deudor').numFmt = '#,##0.00'
    row.getCell('acreedor').numFmt = '#,##0.00'
  }
  if (datos.balance.length > 0) {
    const tot = wsBal.addRow({})
    tot.getCell('cuenta').value = 'TOTALES:'
    tot.getCell('cuenta').font = { bold: true }
    tot.getCell('deudor').value = { formula: `SUM(D2:D${datos.balance.length + 1})` }
    tot.getCell('acreedor').value = { formula: `SUM(E2:E${datos.balance.length + 1})` }
    tot.getCell('deudor').numFmt = '#,##0.00'
    tot.getCell('acreedor').numFmt = '#,##0.00'
    tot.font = { bold: true }
  }

  // Hoja 6: Libro de Compras (SENIAT) - si hay datos
  if (datos.libroCompras && datos.libroCompras.length > 0) {
    const wsLC = wb.addWorksheet('Libro de Compras')
    wsLC.columns = [
      { header: 'Fecha', key: 'fecha', width: 12 },
      { header: 'Tipo', key: 'tipo', width: 14 },
      { header: 'NCF', key: 'ncf', width: 20 },
      { header: 'N° Control', key: 'control', width: 16 },
      { header: 'RIF Proveedor', key: 'rif', width: 16 },
      { header: 'Nombre', key: 'nombre', width: 30 },
      { header: 'Base 16%', key: 'base16', width: 14 },
      { header: 'IVA 16%', key: 'iva16', width: 14 },
      { header: 'Sin Crédito', key: 'sinCred', width: 14 },
      { header: 'Ret. IVA', key: 'retIVA', width: 12 },
      { header: 'Ret. ISLR', key: 'retISLR', width: 12 },
      { header: 'Total c/IVA', key: 'total', width: 14 },
    ]
    const hdrLC = wsLC.getRow(1)
    hdrLC.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    hdrLC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } }
    hdrLC.alignment = { horizontal: 'center' }
    for (const f of datos.libroCompras) {
      const row = wsLC.addRow({
        fecha: new Date(f.fecha),
        tipo: f.tipoOperacion,
        ncf: f.ncf,
        control: f.numeroControl,
        rif: f.rifProveedor,
        nombre: f.nombreProveedor,
        base16: f.baseImponible16,
        iva16: f.iva16,
        sinCred: f.comprasSinCreditoFiscal,
        retIVA: f.ivaRetenido ?? 0,
        retISLR: f.islrRetenido ?? 0,
        total: f.totalCompraIncluyendoIVA,
      })
      row.getCell('fecha').numFmt = 'dd/mm/yyyy'
      for (const col of ['base16', 'iva16', 'sinCred', 'retIVA', 'retISLR', 'total']) {
        row.getCell(col).numFmt = '#,##0.00'
      }
    }
    // Totales
    const totLC = wsLC.addRow({})
    totLC.getCell('nombre').value = 'TOTALES:'
    totLC.getCell('nombre').font = { bold: true }
    const n = datos.libroCompras.length + 1
    for (const col of ['base16', 'iva16', 'sinCred', 'retIVA', 'retISLR', 'total']) {
      const cell = totLC.getCell(col)
      const colLetter = col === 'base16' ? 'G' : col === 'iva16' ? 'H' : col === 'sinCred' ? 'I' : col === 'retIVA' ? 'J' : col === 'retISLR' ? 'K' : 'L'
      cell.value = { formula: `SUM(${colLetter}2:${colLetter}${n})` }
      cell.numFmt = '#,##0.00'
      cell.font = { bold: true }
    }
  }

  // Hoja 7: Libro de Ventas (SENIAT) - si hay datos
  if (datos.libroVentas && datos.libroVentas.length > 0) {
    const wsLV = wb.addWorksheet('Libro de Ventas')
    wsLV.columns = [
      { header: 'Fecha', key: 'fecha', width: 12 },
      { header: 'Tipo', key: 'tipo', width: 14 },
      { header: 'NCF', key: 'ncf', width: 20 },
      { header: 'N° Control', key: 'control', width: 16 },
      { header: 'RIF Cliente', key: 'rif', width: 16 },
      { header: 'Nombre', key: 'nombre', width: 30 },
      { header: 'Base 16%', key: 'base16', width: 14 },
      { header: 'IVA 16%', key: 'iva16', width: 14 },
      { header: 'Exentas', key: 'exentas', width: 14 },
      { header: 'Ret. IVA', key: 'retIVA', width: 12 },
      { header: 'Total c/IVA', key: 'total', width: 14 },
    ]
    const hdrLV = wsLV.getRow(1)
    hdrLV.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    hdrLV.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } }
    hdrLV.alignment = { horizontal: 'center' }
    for (const f of datos.libroVentas) {
      const row = wsLV.addRow({
        fecha: new Date(f.fecha),
        tipo: f.tipoOperacion,
        ncf: f.ncf,
        control: f.numeroControl,
        rif: f.rifCliente,
        nombre: f.nombreCliente,
        base16: f.baseImponible16,
        iva16: f.iva16,
        exentas: f.ventasExentas,
        retIVA: f.ivaRetenido ?? 0,
        total: f.totalVentaIncluyendoIVA,
      })
      row.getCell('fecha').numFmt = 'dd/mm/yyyy'
      for (const col of ['base16', 'iva16', 'exentas', 'retIVA', 'total']) {
        row.getCell(col).numFmt = '#,##0.00'
      }
    }
    const totLV = wsLV.addRow({})
    totLV.getCell('nombre').value = 'TOTALES:'
    totLV.getCell('nombre').font = { bold: true }
    const nv = datos.libroVentas.length + 1
    for (const col of ['base16', 'iva16', 'exentas', 'retIVA', 'total']) {
      const cell = totLV.getCell(col)
      const colLetter = col === 'base16' ? 'G' : col === 'iva16' ? 'H' : col === 'exentas' ? 'I' : col === 'retIVA' ? 'J' : 'K'
      cell.value = { formula: `SUM(${colLetter}2:${colLetter}${nv})` }
      cell.numFmt = '#,##0.00'
      cell.font = { bold: true }
    }
  }

  return await wb.xlsx.writeBuffer() as Buffer
}
