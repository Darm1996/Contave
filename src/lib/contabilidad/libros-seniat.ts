// Libros de Compras y Ventas - Formato SENIAT
// Estructura según Providencia SNAT/2018/000078 (vigente desde 2018)
// Aplicable a contribuyentes ordinarios del IVA que emiten/reciben NCF

// Estructura del Libro de Compras (operaciones de compra con NCF fiscal)
export interface FilaLibroCompras {
  fecha: Date
  tipoOperacion: string // COMPRA, IMPORTACION, etc.
  numeroFactura: string
  numeroControl: string
  ncf: string
  ncfTipo: string | null // 01, 02, 03, etc.
  // Datos del proveedor (emisor)
  rifProveedor: string
  nombreProveedor: string
  // Números de factura afectadas (si es nota crédito/débito)
  ncfAfectado: string | null
  // Montos totales
  totalCompraIncluyendoIVA: number
  // Compras sin derecho a crédito fiscal (exentas, exoneradas, no gravadas)
  comprasSinCreditoFiscal: number
  // Base imponible según alícuota
  baseImponible16: number
  baseImponible8: number // Histórica - 0 actualmente
  baseImponible0: number
  // IVA soportado (crédito fiscal)
  iva16: number
  iva8: number
  iva0: number
  // Retención IVA
  ivaRetenido: number | null
  // Retención ISLR
  islrRetenido: number | null
  // Número de comprobante de retención (NCF 07 o 08)
  numeroComprobanteRetencion: string | null
  // Status
  estado: string // REGISTRADA, CONTABILIZADA, ANULADA
}

export interface FilaLibroVentas {
  fecha: Date
  tipoOperacion: string // VENTA, EXPORTACION, etc.
  numeroFactura: string
  numeroControl: string
  ncf: string
  ncfTipo: string | null
  // Datos del cliente (receptor)
  rifCliente: string
  nombreCliente: string
  // Si es nota crédito/débito, NCF afectado
  ncfAfectado: string | null
  // Montos totales
  totalVentaIncluyendoIVA: number
  // Ventas exentas, exoneradas, no gravadas
  ventasExentas: number
  ventasExoneradas: number
  ventasNoGravadas: number
  // Base imponible según alícuota
  baseImponible16: number
  baseImponible8: number
  baseImponible0: number
  // IVA débito fiscal
  iva16: number
  iva8: number
  iva0: number
  // Retención IVA (si el cliente es agente de retención)
  ivaRetenido: number | null
  // Estado
  estado: string
}

// Convertir una factura registrada a fila de libro de compras o ventas
export function facturaAFilaLibro(factura: any): FilaLibroCompras | FilaLibroVentas | null {
  if (factura.tipo === 'COMPRA' || factura.tipo === 'GASTO_MENOR') {
    // Calcular baseImponible0 = exento + exonerado (compras sin crédito fiscal)
    const sinCredito = factura.montoExento + factura.montoExonerado
    return {
      fecha: factura.fechaEmision,
      tipoOperacion: factura.tipo,
      numeroFactura: factura.numeroFactura || '',
      numeroControl: factura.numeroControl || '',
      ncf: factura.ncf || '',
      ncfTipo: factura.ncf ? factura.ncf.substring(0, 3) : null,
      rifProveedor: factura.rifContraparte,
      nombreProveedor: factura.nombreContraparte,
      ncfAfectado: null,
      totalCompraIncluyendoIVA: factura.total,
      comprasSinCreditoFiscal: sinCredito,
      baseImponible16: factura.alicuotaIVA === 16 ? factura.baseImponible : 0,
      baseImponible8: factura.alicuotaIVA === 8 ? factura.baseImponible : 0,
      baseImponible0: factura.alicuotaIVA === 0 ? factura.baseImponible : 0,
      iva16: factura.alicuotaIVA === 16 ? factura.montoIVA : 0,
      iva8: factura.alicuotaIVA === 8 ? factura.montoIVA : 0,
      iva0: factura.alicuotaIVA === 0 ? factura.montoIVA : 0,
      ivaRetenido: factura.montoRetencionIVA,
      islrRetenido: factura.montoRetencionISLR,
      numeroComprobanteRetencion: null,
      estado: factura.estado,
    } as FilaLibroCompras
  }
  if (factura.tipo === 'VENTA') {
    return {
      fecha: factura.fechaEmision,
      tipoOperacion: factura.tipo,
      numeroFactura: factura.numeroFactura || '',
      numeroControl: factura.numeroControl || '',
      ncf: factura.ncf || '',
      ncfTipo: factura.ncf ? factura.ncf.substring(0, 3) : null,
      rifCliente: factura.rifContraparte,
      nombreCliente: factura.nombreContraparte,
      ncfAfectado: null,
      totalVentaIncluyendoIVA: factura.total,
      ventasExentas: factura.montoExento,
      ventasExoneradas: factura.montoExonerado,
      ventasNoGravadas: 0,
      baseImponible16: factura.alicuotaIVA === 16 ? factura.baseImponible : 0,
      baseImponible8: factura.alicuotaIVA === 8 ? factura.baseImponible : 0,
      baseImponible0: factura.alicuotaIVA === 0 ? factura.baseImponible : 0,
      iva16: factura.alicuotaIVA === 16 ? factura.montoIVA : 0,
      iva8: factura.alicuotaIVA === 8 ? factura.montoIVA : 0,
      iva0: factura.alicuotaIVA === 0 ? factura.montoIVA : 0,
      ivaRetenido: factura.montoRetencionIVA,
      estado: factura.estado,
    } as FilaLibroVentas
  }
  if (factura.tipo === 'NOTA_CREDITO' || factura.tipo === 'NOTA_DEBITO') {
    // Las notas pueden ir tanto en libro de compras como de ventas según afecten.
    // Se usa el mismo campo ncfAfectaVenta que el usuario elige al registrar la
    // nota (y que usa la declaración de IVA), no el prefijo del NCF: el NCF es
    // opcional y a menudo viene vacío, además de que el prefijo no siempre
    // coincide con la dirección real de la nota.
    const esNotaVenta = factura.ncfAfectaVenta !== false
    if (esNotaVenta) {
      return {
        fecha: factura.fechaEmision,
        tipoOperacion: factura.tipo,
        numeroFactura: factura.numeroFactura || '',
        numeroControl: factura.numeroControl || '',
        ncf: factura.ncf || '',
        ncfTipo: factura.ncf ? factura.ncf.substring(0, 3) : null,
        rifCliente: factura.rifContraparte,
        nombreCliente: factura.nombreContraparte,
        ncfAfectado: null,
        totalVentaIncluyendoIVA: factura.total,
        ventasExentas: factura.montoExento,
        ventasExoneradas: factura.montoExonerado,
        ventasNoGravadas: 0,
        baseImponible16: factura.alicuotaIVA === 16 ? factura.baseImponible : 0,
        baseImponible8: factura.alicuotaIVA === 8 ? factura.baseImponible : 0,
        baseImponible0: factura.alicuotaIVA === 0 ? factura.baseImponible : 0,
        iva16: factura.alicuotaIVA === 16 ? factura.montoIVA : 0,
        iva8: factura.alicuotaIVA === 8 ? factura.montoIVA : 0,
        iva0: factura.alicuotaIVA === 0 ? factura.montoIVA : 0,
        ivaRetenido: factura.montoRetencionIVA,
        estado: factura.estado,
      } as FilaLibroVentas
    } else {
      return {
        fecha: factura.fechaEmision,
        tipoOperacion: factura.tipo,
        numeroFactura: factura.numeroFactura || '',
        numeroControl: factura.numeroControl || '',
        ncf: factura.ncf || '',
        ncfTipo: factura.ncf ? factura.ncf.substring(0, 3) : null,
        rifProveedor: factura.rifContraparte,
        nombreProveedor: factura.nombreContraparte,
        ncfAfectado: null,
        totalCompraIncluyendoIVA: factura.total,
        comprasSinCreditoFiscal: factura.montoExento + factura.montoExonerado,
        baseImponible16: factura.alicuotaIVA === 16 ? factura.baseImponible : 0,
        baseImponible8: factura.alicuotaIVA === 8 ? factura.baseImponible : 0,
        baseImponible0: factura.alicuotaIVA === 0 ? factura.baseImponible : 0,
        iva16: factura.alicuotaIVA === 16 ? factura.montoIVA : 0,
        iva8: factura.alicuotaIVA === 8 ? factura.montoIVA : 0,
        iva0: factura.alicuotaIVA === 0 ? factura.montoIVA : 0,
        ivaRetenido: factura.montoRetencionIVA,
        islrRetenido: factura.montoRetencionISLR,
        numeroComprobanteRetencion: null,
        estado: factura.estado,
      } as FilaLibroCompras
    }
  }
  return null
}

// Calcular totales del libro de compras
export function totalesLibroCompras(filas: FilaLibroCompras[]) {
  return {
    cantidadOperaciones: filas.length,
    totalComprasIncluyendoIVA: filas.reduce((s, f) => s + f.totalCompraIncluyendoIVA, 0),
    totalComprasSinCreditoFiscal: filas.reduce((s, f) => s + f.comprasSinCreditoFiscal, 0),
    totalBaseImponible16: filas.reduce((s, f) => s + f.baseImponible16, 0),
    totalBaseImponible8: filas.reduce((s, f) => s + f.baseImponible8, 0),
    totalBaseImponible0: filas.reduce((s, f) => s + f.baseImponible0, 0),
    totalIVA16: filas.reduce((s, f) => s + f.iva16, 0),
    totalIVA8: filas.reduce((s, f) => s + f.iva8, 0),
    totalIVA0: filas.reduce((s, f) => s + f.iva0, 0),
    totalIVARetenido: filas.reduce((s, f) => s + (f.ivaRetenido || 0), 0),
    totalISLRRetenido: filas.reduce((s, f) => s + (f.islrRetenido || 0), 0),
  }
}

// Calcular totales del libro de ventas
export function totalesLibroVentas(filas: FilaLibroVentas[]) {
  return {
    cantidadOperaciones: filas.length,
    totalVentasIncluyendoIVA: filas.reduce((s, f) => s + f.totalVentaIncluyendoIVA, 0),
    totalVentasExentas: filas.reduce((s, f) => s + f.ventasExentas, 0),
    totalVentasExoneradas: filas.reduce((s, f) => s + f.ventasExoneradas, 0),
    totalVentasNoGravadas: filas.reduce((s, f) => s + f.ventasNoGravadas, 0),
    totalBaseImponible16: filas.reduce((s, f) => s + f.baseImponible16, 0),
    totalBaseImponible8: filas.reduce((s, f) => s + f.baseImponible8, 0),
    totalBaseImponible0: filas.reduce((s, f) => s + f.baseImponible0, 0),
    totalIVA16: filas.reduce((s, f) => s + f.iva16, 0),
    totalIVA8: filas.reduce((s, f) => s + f.iva8, 0),
    totalIVA0: filas.reduce((s, f) => s + f.iva0, 0),
    totalIVARetenido: filas.reduce((s, f) => s + (f.ivaRetenido || 0), 0),
  }
}
