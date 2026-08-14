import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'
import { isGoogleSheetsEnabled, sincronizarFacturas, sincronizarLibroDiario, sincronizarBalanceComprobacion } from '@/lib/exports/google-sheets'
import { aNumero } from '@/lib/nucleo/dinero'

export async function GET() {
  return NextResponse.json({ habilitado: isGoogleSheetsEnabled() })
}

export async function POST(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    if (!isGoogleSheetsEnabled()) {
      return NextResponse.json({
        error: 'Google Sheets no configurado. Configure las variables de entorno GOOGLE_SHEETS_CLIENT_EMAIL, GOOGLE_SHEETS_PRIVATE_KEY y GOOGLE_SHEETS_SPREADSHEET_ID.',
      }, { status: 400 })
    }
    const body = await req.json().catch(() => ({}))
    const que = body.que || ['facturas', 'diario', 'balance']

    const resultados: any = {}

    if (que.includes('facturas')) {
      const facturas = await db.factura.findMany({
        where: { empresaId },
        orderBy: { fechaEmision: 'asc' },
      })
      resultados.facturas = await sincronizarFacturas(
        facturas.map((f) => ({
          fecha: f.fechaEmision,
          tipo: f.tipo,
          ncf: f.ncf || '',
          numeroControl: f.numeroControl || '',
          rifContraparte: f.rifContraparte,
          nombreContraparte: f.nombreContraparte,
          baseImponible: aNumero(f.baseImponible),
          montoExento: aNumero(f.montoExento),
          montoExonerado: aNumero(f.montoExonerado),
          montoIVA: aNumero(f.montoIVA),
          retencionIVA: f.montoRetencionIVA === null ? null : aNumero(f.montoRetencionIVA),
          total: aNumero(f.total),
          totalAPagar: aNumero(f.totalAPagar),
          moneda: f.monedaOriginal,
          descripcion: f.descripcion,
        })),
      )
    }

    if (que.includes('diario')) {
      const asientos = await db.asiento.findMany({
        where: { empresaId },
        orderBy: [{ fecha: 'asc' }, { numero: 'asc' }],
        include: { lineas: { include: { cuenta: true }, orderBy: { id: 'asc' } } },
      })
      const filas = asientos.flatMap((a) =>
        a.lineas.map((l) => ({
          numero: a.numero,
          fecha: a.fecha,
          descripcion: a.descripcion,
          referencia: a.referencia || '',
          codigoCuenta: l.cuenta.codigo,
          nombreCuenta: l.cuenta.nombre,
          debit: aNumero(l.debit),
          credit: aNumero(l.credit),
        })),
      )
      resultados.diario = await sincronizarLibroDiario(filas)
    }

    if (que.includes('balance')) {
      const cuentas = await db.cuenta.findMany({
        where: { empresaId, imputable: true },
        orderBy: { codigo: 'asc' },
      })
      const balance: Array<{
        codigoCuenta: string
        nombreCuenta: string
        tipoCuenta: string
        saldoDeudor: number
        saldoAcreedor: number
      }> = []
      for (const cuenta of cuentas) {
        const lineas = await db.asientoLinea.findMany({
          where: { cuentaId: cuenta.id, asiento: { empresaId } },
          select: { debit: true, credit: true },
        })
        if (lineas.length === 0) continue
        const tDeb = lineas.reduce((s, l) => s + aNumero(l.debit), 0)
        const tCre = lineas.reduce((s, l) => s + aNumero(l.credit), 0)
        const saldo = cuenta.naturaleza === 'DEUDORA' ? tDeb - tCre : tCre - tDeb
        const deudor = cuenta.naturaleza === 'DEUDORA'
          ? (saldo > 0 ? saldo : 0)
          : (saldo < 0 ? Math.abs(saldo) : 0)
        const acreedor = cuenta.naturaleza === 'ACREEDORA'
          ? (saldo > 0 ? saldo : 0)
          : (saldo < 0 ? Math.abs(saldo) : 0)
        balance.push({
          codigoCuenta: cuenta.codigo,
          nombreCuenta: cuenta.nombre,
          tipoCuenta: cuenta.tipo,
          saldoDeudor: deudor,
          saldoAcreedor: acreedor,
        })
      }
      resultados.balance = await sincronizarBalanceComprobacion(balance)
    }

    return NextResponse.json({ ok: true, resultados })
  } catch (e: any) {
    console.error('Google Sheets sync error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
