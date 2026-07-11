// Sincronización a Google Sheets vía API
// Requiere credenciales de Service Account (JSON) configuradas como variables de entorno:
//   GOOGLE_SHEETS_CLIENT_EMAIL, GOOGLE_SHEETS_PRIVATE_KEY, GOOGLE_SHEETS_SPREADSHEET_ID
// Si no hay credenciales, se desactiva silenciosamente.

import { google } from 'googleapis'

export interface GoogleSheetsConfig {
  clientEmail: string
  privateKey: string
  spreadsheetId: string
}

export function getGoogleSheetsConfig(): GoogleSheetsConfig | null {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  if (!clientEmail || !privateKey || !spreadsheetId) return null
  return { clientEmail, privateKey, spreadsheetId }
}

export function isGoogleSheetsEnabled(): boolean {
  return getGoogleSheetsConfig() !== null
}

async function getSheetsClient() {
  const cfg = getGoogleSheetsConfig()
  if (!cfg) throw new Error('Google Sheets no configurado')
  const auth = new google.auth.JWT({
    email: cfg.clientEmail,
    key: cfg.privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

// Asegurar que exista una hoja con el nombre dado, si no, crearla
async function ensureSheet(sheets: any, spreadsheetId: string, title: string) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId })
  const exists = meta.data.sheets?.some((s: any) => s.properties?.title === title)
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title } } }] },
    })
  }
}

export async function sincronizarFacturas(
  facturas: Array<{
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
  }>,
): Promise<{ actualizadas: number; hoja: string }> {
  const cfg = getGoogleSheetsConfig()
  if (!cfg) throw new Error('Google Sheets no configurado. Configure GOOGLE_SHEETS_CLIENT_EMAIL, GOOGLE_SHEETS_PRIVATE_KEY y GOOGLE_SHEETS_SPREADSHEET_ID.')
  const sheets = await getSheetsClient()
  const titulo = 'Facturas'
  await ensureSheet(sheets, cfg.spreadsheetId, titulo)

  // Limpiar hoja y escribir encabezado
  await sheets.spreadsheets.values.clear({
    spreadsheetId: cfg.spreadsheetId,
    range: `${titulo}!A1:Z10000`,
  })

  const header = [
    'Fecha', 'Tipo', 'NCF', 'N° Control', 'RIF', 'Nombre',
    'Base Imponible', 'Exento', 'Exonerado', 'IVA', 'Ret. IVA',
    'Total', 'A Pagar', 'Moneda', 'Descripción',
  ]
  const rows = facturas.map((f) => [
    f.fecha.toLocaleDateString('es-VE'),
    f.tipo,
    f.ncf,
    f.numeroControl,
    f.rifContraparte,
    f.nombreContraparte,
    f.baseImponible,
    f.montoExento,
    f.montoExonerado,
    f.montoIVA,
    f.retencionIVA ?? '',
    f.total,
    f.totalAPagar,
    f.moneda,
    f.descripcion || '',
  ])

  await sheets.spreadsheets.values.update({
    spreadsheetId: cfg.spreadsheetId,
    range: `${titulo}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [header, ...rows] },
  })

  return { actualizadas: rows.length, hoja: titulo }
}

export async function sincronizarLibroDiario(
  asientos: Array<{
    numero: number
    fecha: Date
    descripcion: string
    referencia: string | null
    codigoCuenta: string
    nombreCuenta: string
    debit: number
    credit: number
  }>,
): Promise<{ actualizadas: number; hoja: string }> {
  const cfg = getGoogleSheetsConfig()
  if (!cfg) throw new Error('Google Sheets no configurado')
  const sheets = await getSheetsClient()
  const titulo = 'Libro Diario'
  await ensureSheet(sheets, cfg.spreadsheetId, titulo)

  await sheets.spreadsheets.values.clear({
    spreadsheetId: cfg.spreadsheetId,
    range: `${titulo}!A1:Z100000`,
  })

  const header = ['N° Asiento', 'Fecha', 'Descripción', 'Referencia', 'Código', 'Cuenta', 'Débito', 'Crédito']
  const rows = asientos.map((a) => [
    a.numero,
    a.fecha.toLocaleDateString('es-VE'),
    a.descripcion,
    a.referencia || '',
    a.codigoCuenta,
    a.nombreCuenta,
    a.debit,
    a.credit,
  ])

  await sheets.spreadsheets.values.update({
    spreadsheetId: cfg.spreadsheetId,
    range: `${titulo}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [header, ...rows] },
  })

  return { actualizadas: rows.length, hoja: titulo }
}

export async function sincronizarBalanceComprobacion(
  balance: Array<{
    codigoCuenta: string
    nombreCuenta: string
    tipoCuenta: string
    saldoDeudor: number
    saldoAcreedor: number
  }>,
): Promise<{ actualizadas: number; hoja: string }> {
  const cfg = getGoogleSheetsConfig()
  if (!cfg) throw new Error('Google Sheets no configurado')
  const sheets = await getSheetsClient()
  const titulo = 'Balance Comprobación'
  await ensureSheet(sheets, cfg.spreadsheetId, titulo)

  await sheets.spreadsheets.values.clear({
    spreadsheetId: cfg.spreadsheetId,
    range: `${titulo}!A1:Z10000`,
  })

  const header = ['Código', 'Cuenta', 'Tipo', 'Saldo Deudor', 'Saldo Acreedor']
  const rows = balance.map((b) => [
    b.codigoCuenta, b.nombreCuenta, b.tipoCuenta,
    b.saldoDeudor || '', b.saldoAcreedor || '',
  ])

  await sheets.spreadsheets.values.update({
    spreadsheetId: cfg.spreadsheetId,
    range: `${titulo}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [header, ...rows] },
  })

  return { actualizadas: rows.length, hoja: titulo }
}
