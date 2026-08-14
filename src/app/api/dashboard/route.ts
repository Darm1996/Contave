import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'
import { montoDeuda } from '@/lib/contabilidad/cuentas-por-cobrar-pagar'
import { suma, resta, mult, div, sumarPor } from '@/lib/nucleo/dinero'
import { ok, manejarError } from '@/lib/nucleo/respuesta'

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
    // Proporción de conversión a moneda funcional de una factura: se usa la
    // tasa que quedó congelada en el documento, no la tasa de hoy, para que
    // este panel muestre lo mismo mañana que hoy.
    const proporcionMF = (f: { total: unknown; totalMonedaFuncional: unknown }) =>
      div(f.totalMonedaFuncional as never, f.total as never, 1)

    const totalCompras = sumarPor(
      facturasMes.filter((f) => f.tipo === 'COMPRA' || f.tipo === 'GASTO_MENOR'),
      (f) => f.totalMonedaFuncional,
    )
    const totalVentas = sumarPor(
      facturasMes.filter((f) => f.tipo === 'VENTA'),
      (f) => f.totalMonedaFuncional,
    )
    const totalIVACredito = sumarPor(
      facturasMes.filter((f) => ['COMPRA', 'GASTO_MENOR'].includes(f.tipo)),
      (f) => mult(proporcionMF(f), f.montoIVA),
    )
    const totalIVADebito = sumarPor(
      facturasMes.filter((f) => f.tipo === 'VENTA'),
      (f) => mult(proporcionMF(f), f.montoIVA),
    )
    const totalRetencionesIVA = sumarPor(
      facturasMes.filter((f) => f.montoRetencionIVA),
      (f) => mult(f.montoRetencionIVA ?? 0, proporcionMF(f)),
    )
    const totalRetencionesISLR = sumarPor(
      facturasMes.filter((f) => f.montoRetencionISLR),
      (f) => mult(f.montoRetencionISLR ?? 0, proporcionMF(f)),
    )
    const totalIGTF = sumarPor(
      facturasMes.filter((f) => f.montoIGTF),
      (f) => mult(f.montoIGTF ?? 0, proporcionMF(f)),
    )

    // Módulos nuevos: activos fijos, nómina del mes, ajuste por inflación del mes
    const activosFijos = await db.activoFijo.findMany({ where: { empresaId, estado: { not: 'DADO_DE_BAJA' } } })
    const valorLibroActivosFijos = sumarPor(activosFijos, (a) => resta(a.costoAdquisicion, a.depreciacionAcumulada))

    const nominaMes = await db.nomina.findUnique({
      where: { empresaId_mes_ano: { empresaId, mes: ahora.getMonth() + 1, ano: ahora.getFullYear() } },
    })

    const ajusteInflacionMes = await db.ajusteInflacion.findUnique({
      where: { empresaId_mes_ano: { empresaId, mes: ahora.getMonth() + 1, ano: ahora.getFullYear() } },
    })

    // El inventario ahora se lleva por (variante, almacén) y no por producto,
    // así que la valorización sale de las existencias. Se busca la
    // organización asociada a esta empresa (relación 1:1).
    const organizacion = await db.organizacion.findUnique({ where: { empresaId }, select: { id: true } })
    const existencias = organizacion
      ? await db.existencia.findMany({ where: { organizacionId: organizacion.id } })
      : []
    const valorizacionInventario = sumarPor(existencias, (e) => mult(e.cantidad, e.costoPromedio))
    const cantidadProductos = organizacion
      ? await db.producto.count({ where: { organizacionId: organizacion.id, activo: true, deletedAt: null } })
      : 0

    const [facturasCxC, facturasCxP] = await Promise.all([
      db.factura.findMany({ where: { empresaId, tipo: 'VENTA', estado: 'CONTABILIZADA', estadoPago: { not: 'PAGADA' } } }),
      db.factura.findMany({ where: { empresaId, tipo: 'COMPRA', estado: 'CONTABILIZADA', estadoPago: { not: 'PAGADA' } } }),
    ])
    const totalCxC = sumarPor(facturasCxC, (f) => resta(montoDeuda(f), f.montoPagado))
    const totalCxP = sumarPor(facturasCxP, (f) => resta(montoDeuda(f), f.montoPagado))

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

    return ok({
      mes: {
        nombre: ahora.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' }),
        totalCompras,
        totalVentas,
        totalIVACredito,
        totalIVADebito,
        ivaNetoPagar: resta(totalIVADebito, totalIVACredito),
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
      inventario: { cantidadProductos, valorizacion: valorizacionInventario },
      cxc: { cantidad: facturasCxC.length, total: totalCxC },
      cxp: { cantidad: facturasCxP.length, total: totalCxP },
    })
  } catch (error) {
    return manejarError(error)
  }
}
