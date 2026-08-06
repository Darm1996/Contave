import { NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'
import { montoDeuda } from '@/lib/contabilidad/cuentas-por-cobrar-pagar'

export async function GET() {
  try {
    const empresaId = await requireEmpresa()

    // Totales del mes actual
    const ahora = new Date()
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
    const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0)

    const facturasMes = await db.factura.findMany({
      where: { empresaId, fechaEmision: { gte: inicioMes, lte: finMes } },
    })
    const totalCompras = facturasMes
      .filter((f) => f.tipo === 'COMPRA' || f.tipo === 'GASTO_MENOR')
      .reduce((s, f) => s + f.totalMonedaFuncional, 0)
    const totalVentas = facturasMes
      .filter((f) => f.tipo === 'VENTA')
      .reduce((s, f) => s + f.totalMonedaFuncional, 0)
    const totalIVACredito = facturasMes
      .filter((f) => ['COMPRA', 'GASTO_MENOR'].includes(f.tipo))
      .reduce((s, f) => s + (f.totalMonedaFuncional / f.total) * f.montoIVA, 0)
    const totalIVADebito = facturasMes
      .filter((f) => f.tipo === 'VENTA')
      .reduce((s, f) => s + (f.totalMonedaFuncional / f.total) * f.montoIVA, 0)
    const totalRetencionesIVA = facturasMes
      .filter((f) => f.montoRetencionIVA)
      .reduce((s, f) => s + (f.montoRetencionIVA || 0) * (f.totalMonedaFuncional / f.total), 0)
    const totalRetencionesISLR = facturasMes
      .filter((f) => f.montoRetencionISLR)
      .reduce((s, f) => s + (f.montoRetencionISLR || 0) * (f.totalMonedaFuncional / f.total), 0)
    const totalIGTF = facturasMes
      .filter((f) => f.montoIGTF)
      .reduce((s, f) => s + (f.montoIGTF || 0) * (f.totalMonedaFuncional / f.total), 0)

    // Módulos nuevos: activos fijos, nómina del mes, ajuste por inflación del mes
    const activosFijos = await db.activoFijo.findMany({ where: { empresaId, estado: { not: 'DADO_DE_BAJA' } } })
    const valorLibroActivosFijos = activosFijos.reduce((s, a) => s + (a.costoAdquisicion - a.depreciacionAcumulada), 0)

    const nominaMes = await db.nomina.findUnique({
      where: { empresaId_mes_ano: { empresaId, mes: ahora.getMonth() + 1, ano: ahora.getFullYear() } },
    })

    const ajusteInflacionMes = await db.ajusteInflacion.findUnique({
      where: { empresaId_mes_ano: { empresaId, mes: ahora.getMonth() + 1, ano: ahora.getFullYear() } },
    })

    const productos = await db.producto.findMany({ where: { empresaId, activo: true } })
    const valorizacionInventario = productos.reduce((s, p) => s + p.cantidadActual * p.costoPromedioActual, 0)

    const [facturasCxC, facturasCxP] = await Promise.all([
      db.factura.findMany({ where: { empresaId, tipo: 'VENTA', estado: 'CONTABILIZADA', estadoPago: { not: 'PAGADA' } } }),
      db.factura.findMany({ where: { empresaId, tipo: 'COMPRA', estado: 'CONTABILIZADA', estadoPago: { not: 'PAGADA' } } }),
    ])
    const totalCxC = facturasCxC.reduce((s, f) => s + (montoDeuda(f) - f.montoPagado), 0)
    const totalCxP = facturasCxP.reduce((s, f) => s + (montoDeuda(f) - f.montoPagado), 0)

    // Tasa de cambio más reciente
    const tasaBCV = await db.tasaCambio.findFirst({
      where: { empresaId, monedaRef: 'USD' },
      orderBy: { fecha: 'desc' },
    })

    // Cantidad de cuentas en el plan
    const totalCuentas = await db.cuenta.count({ where: { empresaId } })

    // Últimas facturas
    const ultimasFacturas = await db.factura.findMany({
      where: { empresaId },
      orderBy: { fechaEmision: 'desc' },
      take: 5,
      include: { asiento: { select: { numero: true } } },
    })

    // Asientos recientes
    const ultimosAsientos = await db.asiento.findMany({
      where: { empresaId },
      orderBy: { fecha: 'desc' },
      take: 5,
      include: { _count: { select: { lineas: true } } },
    })

    return NextResponse.json({
      mes: {
        nombre: ahora.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' }),
        totalCompras,
        totalVentas,
        totalIVACredito,
        totalIVADebito,
        ivaNetoPagar: totalIVADebito - totalIVACredito,
        totalRetencionesIVA,
        totalRetencionesISLR,
        totalIGTF,
        cantidadFacturas: facturasMes.length,
      },
      tasaBCV: tasaBCV ? { tasa: tasaBCV.tasa, fecha: tasaBCV.fecha } : null,
      totalCuentas,
      ultimasFacturas,
      ultimosAsientos,
      activosFijos: { cantidad: activosFijos.length, valorLibro: valorLibroActivosFijos },
      nominaMes: nominaMes ? { totalNeto: nominaMes.totalNeto, estado: nominaMes.estado } : null,
      ajusteInflacionMes: ajusteInflacionMes ? { resultadoExposicionInflacion: ajusteInflacionMes.resultadoExposicionInflacion } : null,
      inventario: { cantidadProductos: productos.length, valorizacion: valorizacionInventario },
      cxc: { cantidad: facturasCxC.length, total: totalCxC },
      cxp: { cantidad: facturasCxP.length, total: totalCxP },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}
