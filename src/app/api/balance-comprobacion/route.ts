import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'

// Balance de comprobación: saldos finales por cuenta
export async function GET(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const { searchParams } = new URL(req.url)
    const hasta = searchParams.get('hasta') // fecha de corte

    const whereAsiento: any = { empresaId }
    if (hasta) whereAsiento.fecha = { lte: new Date(hasta) }

    const cuentas = await db.cuenta.findMany({
      where: { empresaId, imputable: true },
      orderBy: { codigo: 'asc' },
    })

    const balance = []
    let totalDeudor = 0
    let totalAcreedor = 0
    for (const cuenta of cuentas) {
      const lineas = await db.asientoLinea.findMany({
        where: { cuentaId: cuenta.id, asiento: whereAsiento },
        select: { debit: true, credit: true },
      })
      if (lineas.length === 0) continue
      const totalDebit = lineas.reduce((s, l) => s + l.debit, 0)
      const totalCredit = lineas.reduce((s, l) => s + l.credit, 0)
      // Saldo según naturaleza: deudora = débito - crédito, acreedora = crédito - débito
      const saldo = cuenta.naturaleza === 'DEUDORA'
        ? totalDebit - totalCredit
        : totalCredit - totalDebit
      // El saldo positivo va a la columna correspondiente a la naturaleza
      const deudor = cuenta.naturaleza === 'DEUDORA'
        ? (saldo > 0 ? saldo : 0)
        : (saldo < 0 ? Math.abs(saldo) : 0)
      const acreedor = cuenta.naturaleza === 'ACREEDORA'
        ? (saldo > 0 ? saldo : 0)
        : (saldo < 0 ? Math.abs(saldo) : 0)
      totalDeudor += deudor
      totalAcreedor += acreedor
      balance.push({
        codigoCuenta: cuenta.codigo,
        nombreCuenta: cuenta.nombre,
        tipoCuenta: cuenta.tipo,
        naturaleza: cuenta.naturaleza,
        totalDebit,
        totalCredit,
        saldo,
        saldoDeudor: deudor,
        saldoAcreedor: acreedor,
      })
    }

    return NextResponse.json({
      balance,
      totales: { totalDeudor, totalAcreedor, diferencia: totalDeudor - totalAcreedor },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}
