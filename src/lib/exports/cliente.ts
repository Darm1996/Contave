'use client'
// Exportador genérico a Excel para usar desde cualquier página del cliente:
// arma un .xlsx a partir de los datos que la página ya tiene cargados
// (respeta los filtros que el usuario haya aplicado en pantalla) y dispara
// la descarga en el navegador.

import ExcelJS from 'exceljs'

export interface ColumnaExport {
  header: string
  key: string
  width?: number
  numFmt?: string
}

export interface HojaExport {
  nombre: string
  columnas: ColumnaExport[]
  filas: Record<string, any>[]
}

export async function exportarExcelCliente(nombreArchivo: string, hojas: HojaExport[]) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'ContaVE'
  wb.created = new Date()

  for (const hoja of hojas) {
    const ws = wb.addWorksheet(hoja.nombre.slice(0, 31))
    ws.columns = hoja.columnas.map((c) => ({ header: c.header, key: c.key, width: c.width || 18, style: c.numFmt ? { numFmt: c.numFmt } : undefined }))
    ws.getRow(1).font = { bold: true }
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
    for (const fila of hoja.filas) ws.addRow(fila)
    ws.autoFilter = hoja.filas.length > 0 ? { from: { row: 1, column: 1 }, to: { row: 1, column: hoja.columnas.length } } : undefined
  }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo.endsWith('.xlsx') ? nombreArchivo : `${nombreArchivo}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
