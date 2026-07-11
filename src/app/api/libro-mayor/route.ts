import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'

// Libro mayor: movimientos por cuenta, con saldos
export async function GET(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const { searchParams } = new URL(req.url)
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    const cuentaId = searchParams.get('cuentaId')
    const soloConMovimientos = searchParams.get('soloMovimientos') !== 'false'

    const whereAsiento: any = { empresaId }
    if (desde || hasta) {
      whereAsiento.fecha = {}
      if (desde) whereAsiento.fecha.gte = new Date(desde)
      if (hasta) whereAsiento.fecha.lte = new Date(hasta)
    }

    // Cuentas a incluir
    const whereCuenta: any = { empresaId, imputable: true }
    if (cuentaId) whereCuenta.id = cuentaId
    const cuentas = await db.cuenta.findMany({ where: whereCuenta, orderBy: { codigo: 'asc' } })

    const resultado = []
    for (const cuenta of cuentas) {
      // Buscar todas las líneas de asiento para esta cuenta dentro del rango
      const lineas = await db.asientoLinea.findMany({
        where: {
          cuentaId: cuenta.id,
          asiento: whereAsiento,
        },
        include: { asiento: true },
        orderBy: { asiento: { fecha: 'asc' } },
      })
      if (soloConMovimientos && lineas.length === 0) continue

      // Calcular saldo anterior (líneas antes del rango "desde")
      let saldoInicial = 0
      if (desde) {
        const anteriores = await db.asientoLinea.findMany({
          where: {
            cuentaId: cuenta.id,
            asiento: { empresaId, fecha: { lt: new Date(desde) } },
          },
          select: { debit: true, credit: true },
        })
        saldoInicial = anteriores.reduce((s, l) => s + (l.debit - l.credit), 0)
      }

      const naturaleza = cuenta.naturaleza // DEUDORA o ACREEDORA
      // Saldo según naturaleza: deudora = debit-credit, acreedora = credit-debit
      const saldoSegunNaturaleza = (debit: number, credit: number, saldoAnterior: number) => {
        const neto = naturaleza === 'DEUDORA' ? (saldoAnterior + debit - credit) : (saldoAnterior + credit - debit)
        return neto
      }

      let saldo = saldoInicial
      const movimientos = lineas.map((l) => {
        saldo = saldoSegunNaturaleza(l.debit, l.credit, saldo)
        return {
          fecha: l.asiento.fecha,
          numeroAsiento: l.asiento.numero,
          descripcion: l.asiento.descripcion,
          debit: l.debit,
          credit: l.credit,
          saldo,
        }
      })
      const totalDebit = lineas.reduce((s, l) => s + l.debit, 0)
      const totalCredit = lineas.reduce((s, l) => s + l.credit, 0)
      resultado.push({
        codigoCuenta: cuenta.codigo,
        nombreCuenta: cuenta.nombre,
        tipoCuenta: cuenta.tipo,
        naturaleza,
        saldoInicial,
        movimientos,
        totalDebit,
        totalCredit,
        saldoFinal: saldo,
      })
    }

    return NextResponse.json({ cuentas: resultado })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}
