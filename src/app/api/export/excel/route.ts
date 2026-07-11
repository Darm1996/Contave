import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'
import { generarExcelContable } from '@/lib/exports/excel'

// POST /api/export/excel
// Body: { desde?: 'YYYY-MM-DD', hasta?: 'YYYY-MM-DD' }
// Devuelve un .xlsx con Facturas, Libro Diario, Libro Mayor, Balance
export async function POST(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const empresa = await db.empresa.findUnique({ where: { id: empresaId } })
    if (!empresa) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })

    const body = await req.json().catch(() => ({}))
    const desde = body.desde ? new Date(body.desde) : undefined
    const hasta = body.hasta ? new Date(body.hasta) : undefined

    // Facturas
    const whereFac: any = { empresaId }
    if (desde || hasta) {
      whereFac.fechaEmision = {}
      if (desde) whereFac.fechaEmision.gte = desde
      if (hasta) whereFac.fechaEmision.lte = hasta
    }
    const facturas = await db.factura.findMany({
      where: whereFac,
      orderBy: { fechaEmision: 'asc' },
    })
    const facturasExcel = facturas.map((f) => ({
      fecha: f.fechaEmision,
      tipo: f.tipo,
      ncf: f.ncf || '',
      numeroControl: f.numeroControl || '',
      rifContraparte: f.rifContraparte,
      nombreContraparte: f.nombreContraparte,
      baseImponible: f.baseImponible,
      montoExento: f.montoExento,
      montoExonerado: f.montoExonerado,
      montoIVA: f.montoIVA,
      retencionIVA: f.montoRetencionIVA,
      total: f.total,
      totalAPagar: f.totalAPagar,
      moneda: f.monedaOriginal,
      descripcion: f.descripcion,
    }))

    // Asientos (libro diario)
    const whereAs: any = { empresaId }
    if (desde || hasta) {
      whereAs.fecha = {}
      if (desde) whereAs.fecha.gte = desde
      if (hasta) whereAs.fecha.lte = hasta
    }
    const asientos = await db.asiento.findMany({
      where: whereAs,
      orderBy: [{ fecha: 'asc' }, { numero: 'asc' }],
      include: { lineas: { include: { cuenta: true }, orderBy: { id: 'asc' } } },
    })
    const asientosExcel = asientos.flatMap((a) =>
      a.lineas.map((l) => ({
        numero: a.numero,
        fecha: a.fecha,
        descripcion: a.descripcion,
        referencia: a.referencia,
        codigoCuenta: l.cuenta.codigo,
        nombreCuenta: l.cuenta.nombre,
        debit: l.debit,
        credit: l.credit,
      })),
    )

    // Libro mayor (con movimientos)
    const cuentas = await db.cuenta.findMany({
      where: { empresaId, imputable: true },
      orderBy: { codigo: 'asc' },
    })
    const mayorExcel = []
    for (const cuenta of cuentas) {
      const lineas = await db.asientoLinea.findMany({
        where: { cuentaId: cuenta.id, asiento: whereAs },
        include: { asiento: true },
        orderBy: { asiento: { fecha: 'asc' } },
      })
      if (lineas.length === 0) continue
      let saldo = 0
      const movs = lineas.map((l) => {
        saldo = cuenta.naturaleza === 'DEUDORA' ? saldo + l.debit - l.credit : saldo + l.credit - l.debit
        return {
          fecha: l.asiento.fecha,
          numeroAsiento: l.asiento.numero,
          descripcion: l.asiento.descripcion,
          debit: l.debit,
          credit: l.credit,
          saldo,
        }
      })
      mayorExcel.push({
        codigoCuenta: cuenta.codigo,
        nombreCuenta: cuenta.nombre,
        tipoCuenta: cuenta.tipo,
        saldoInicial: 0,
        movimientos: movs,
        totalDebit: lineas.reduce((s, l) => s + l.debit, 0),
        totalCredit: lineas.reduce((s, l) => s + l.credit, 0),
        saldoFinal: saldo,
      })
    }

    // Balance de comprobación
    const balanceExcel = []
    for (const cuenta of cuentas) {
      const lineas = await db.asientoLinea.findMany({
        where: { cuentaId: cuenta.id, asiento: whereAs },
        select: { debit: true, credit: true },
      })
      if (lineas.length === 0) continue
      const tDeb = lineas.reduce((s, l) => s + l.debit, 0)
      const tCre = lineas.reduce((s, l) => s + l.credit, 0)
      const saldo = cuenta.naturaleza === 'DEUDORA' ? tDeb - tCre : tCre - tDeb
      const deudor = cuenta.naturaleza === 'DEUDORA'
        ? (saldo > 0 ? saldo : 0)
        : (saldo < 0 ? Math.abs(saldo) : 0)
      const acreedor = cuenta.naturaleza === 'ACREEDORA'
        ? (saldo > 0 ? saldo : 0)
        : (saldo < 0 ? Math.abs(saldo) : 0)
      balanceExcel.push({
        codigoCuenta: cuenta.codigo,
        nombreCuenta: cuenta.nombre,
        tipoCuenta: cuenta.tipo,
        saldoDeudor: deudor,
        saldoAcreedor: acreedor,
      })
    }

    // Generar libros de compras y ventas (SENIAT)
    const { facturaAFilaLibro } = await import('@/lib/contabilidad/libros-seniat')
    const facturasCompras = await db.factura.findMany({
      where: { empresaId, tipo: { in: ['COMPRA', 'GASTO_MENOR', 'NOTA_CREDITO', 'NOTA_DEBITO'] }, ...whereFac },
      orderBy: { fechaEmision: 'asc' },
    })
    const facturasVentas = await db.factura.findMany({
      where: { empresaId, tipo: { in: ['VENTA', 'NOTA_CREDITO', 'NOTA_DEBITO'] }, ...whereFac },
      orderBy: { fechaEmision: 'asc' },
    })
    const libroCompras = facturasCompras
      .map(facturaAFilaLibro)
      .filter((f): f is NonNullable<typeof f> => f !== null && 'rifProveedor' in f)
    const libroVentas = facturasVentas
      .map(facturaAFilaLibro)
      .filter((f): f is NonNullable<typeof f> => f !== null && 'rifCliente' in f)

    const buffer = await generarExcelContable({
      empresa: { nombre: empresa.nombre, rif: empresa.rif },
      facturas: facturasExcel,
      asientos: asientosExcel,
      mayor: mayorExcel,
      balance: balanceExcel,
      libroCompras,
      libroVentas,
      fechaDesde: desde,
      fechaHasta: hasta,
    })

    const filename = `ContaVE_${empresa.rif}_${new Date().toISOString().slice(0, 10)}.xlsx`
    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e: any) {
    console.error('Excel export error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
