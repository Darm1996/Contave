// Declaración de IVA mensual - Forma 30 SENIAT
// Estructura según Providencia SNAT/2017/0018 (Forma 30 - Declaración y pago del IVA)
// Calcula débito fiscal, crédito fiscal y determina si hay impuesto a pagar o crédito a favor

export interface DeclaracionIVAMensual {
  // Período
  mes: number // 1-12
  ano: number
  mesNombre: string
  // Débito Fiscal (ventas gravadas)
  totalVentasGravadas16: number
  totalVentasGravadas8: number
  totalVentasGravadas0: number
  totalVentasExentas: number
  totalVentasExoneradas: number
  totalVentasNoGravadas: number
  debitoFiscal16: number
  debitoFiscal8: number
  debitoFiscal0: number
  debitoFiscalTotal: number
  // Crédito Fiscal (compras gravadas)
  totalComprasGravadas16: number
  totalComprasGravadas8: number
  totalComprasGravadas0: number
  totalComprasSinCredito: number
  creditoFiscal16: number
  creditoFiscal8: number
  creditoFiscal0: number
  creditoFiscalTotal: number
  // Crédito fiscal de períodos anteriores (arrastre)
  creditoFiscalPeriodoAnterior: number
  // Retenciones IVA
  ivaRetenidoEnCompras: number // IVA que le retuvieron a la empresa (es crédito)
  ivaRetenidoEnVentas: number // IVA que la empresa retuvo (resta del débito)
  // Cálculo final
  debitoFiscalNeto: number // débito total - retenciones en ventas
  creditoFiscalNeto: number // crédito total + retenciones en compras + arrastre
  impuestoDeterminado: number // débito neto - crédito neto
  // Resultado
  resultado: 'A_PAGAR' | 'CREDITO_FAVOR' | 'SIN_IMPUESTO'
  montoAPagar: number // si resultado es A_PAGAR
  creditoFavor: number // si resultado es CREDITO_FAVOR (pasa al siguiente período)
  // Notas
  notas: string[]
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export function getMesNombre(mes: number): string {
  return MESES[mes - 1] || ''
}

export function calcularDeclaracionIVA(
  facturas: Array<{
    tipo: string
    fechaEmision: Date
    baseImponible: number
    montoExento: number
    montoExonerado: number
    alicuotaIVA: number
    montoIVA: number
    montoRetencionIVA: number | null
    // Solo relevante para NOTA_CREDITO/NOTA_DEBITO: si la nota afecta una venta o una compra.
    ncfAfectaVenta?: boolean
  }>,
  mes: number,
  ano: number,
  creditoFiscalAnterior: number = 0,
): DeclaracionIVAMensual {
  const notas: string[] = []
  // Filtrar facturas del mes/año
  const facturasPeriodo = facturas.filter((f) => {
    const d = new Date(f.fechaEmision)
    return d.getMonth() + 1 === mes && d.getFullYear() === ano
  })

  // ── DÉBITO FISCAL (Ventas) ──
  const ventas = facturasPeriodo.filter((f) => f.tipo === 'VENTA' || (f.tipo === 'NOTA_DEBITO' && f.ncfAfectaVenta))
  let totalVentasGravadas16 = 0, totalVentasGravadas8 = 0, totalVentasGravadas0 = 0
  let totalVentasExentas = 0, totalVentasExoneradas = 0, totalVentasNoGravadas = 0
  let debitoFiscal16 = 0, debitoFiscal8 = 0, debitoFiscal0 = 0
  let ivaRetenidoEnVentas = 0

  for (const v of ventas) {
    if (v.alicuotaIVA === 16) {
      totalVentasGravadas16 += v.baseImponible
      debitoFiscal16 += v.montoIVA
    } else if (v.alicuotaIVA === 8) {
      totalVentasGravadas8 += v.baseImponible
      debitoFiscal8 += v.montoIVA
    } else {
      totalVentasGravadas0 += v.baseImponible
      debitoFiscal0 += v.montoIVA
    }
    totalVentasExentas += v.montoExento
    totalVentasExoneradas += v.montoExonerado
    if (v.montoRetencionIVA) ivaRetenidoEnVentas += v.montoRetencionIVA
  }

  // Notas de crédito a clientes reducen el débito
  const notasCreditoVenta = facturasPeriodo.filter((f) => f.tipo === 'NOTA_CREDITO' && f.ncfAfectaVenta)
  for (const nc of notasCreditoVenta) {
    if (nc.alicuotaIVA === 16) {
      totalVentasGravadas16 -= nc.baseImponible
      debitoFiscal16 -= nc.montoIVA
    } else if (nc.alicuotaIVA === 8) {
      totalVentasGravadas8 -= nc.baseImponible
      debitoFiscal8 -= nc.montoIVA
    } else {
      totalVentasGravadas0 -= nc.baseImponible
      debitoFiscal0 -= nc.montoIVA
    }
  }

  const debitoFiscalTotal = debitoFiscal16 + debitoFiscal8 + debitoFiscal0

  // ── CRÉDITO FISCAL (Compras) ──
  // Las notas de débito de proveedores aumentan lo comprado (igual que una compra normal).
  const compras = facturasPeriodo.filter((f) =>
    f.tipo === 'COMPRA' || f.tipo === 'GASTO_MENOR' || (f.tipo === 'NOTA_DEBITO' && !f.ncfAfectaVenta),
  )
  let totalComprasGravadas16 = 0, totalComprasGravadas8 = 0, totalComprasGravadas0 = 0
  let totalComprasSinCredito = 0
  let creditoFiscal16 = 0, creditoFiscal8 = 0, creditoFiscal0 = 0
  let ivaRetenidoEnCompras = 0

  for (const c of compras) {
    if (c.alicuotaIVA === 16) {
      totalComprasGravadas16 += c.baseImponible
      creditoFiscal16 += c.montoIVA
    } else if (c.alicuotaIVA === 8) {
      totalComprasGravadas8 += c.baseImponible
      creditoFiscal8 += c.montoIVA
    } else {
      totalComprasGravadas0 += c.baseImponible
      creditoFiscal0 += c.montoIVA
    }
    totalComprasSinCredito += c.montoExento + c.montoExonerado
    if (c.montoRetencionIVA) ivaRetenidoEnCompras += c.montoRetencionIVA
  }

  // Notas de crédito de proveedores (devoluciones, descuentos) reducen el crédito fiscal
  const notasCreditoCompra = facturasPeriodo.filter((f) => f.tipo === 'NOTA_CREDITO' && !f.ncfAfectaVenta)
  for (const nc of notasCreditoCompra) {
    if (nc.alicuotaIVA === 16) {
      totalComprasGravadas16 -= nc.baseImponible
      creditoFiscal16 -= nc.montoIVA
    } else if (nc.alicuotaIVA === 8) {
      totalComprasGravadas8 -= nc.baseImponible
      creditoFiscal8 -= nc.montoIVA
    } else {
      totalComprasGravadas0 -= nc.baseImponible
      creditoFiscal0 -= nc.montoIVA
    }
  }

  const creditoFiscalTotal = creditoFiscal16 + creditoFiscal8 + creditoFiscal0

  // ── CÁLCULO FINAL ──
  // Débito fiscal neto = débito total - retenciones IVA en ventas (las retenciones ya se le restan al débito)
  const debitoFiscalNeto = Math.max(0, debitoFiscalTotal - ivaRetenidoEnVentas)
  // Crédito fiscal neto = crédito del período + retenciones IVA en compras (soportadas) + arrastre
  const creditoFiscalNeto = creditoFiscalTotal + ivaRetenidoEnCompras + creditoFiscalAnterior

  const impuestoDeterminado = debitoFiscalNeto - creditoFiscalNeto

  let resultado: 'A_PAGAR' | 'CREDITO_FAVOR' | 'SIN_IMPUESTO'
  let montoAPagar = 0
  let creditoFavor = 0
  if (impuestoDeterminado > 0.01) {
    resultado = 'A_PAGAR'
    montoAPagar = impuestoDeterminado
    notas.push(`Impuesto a pagar al SENIAT: ${montoAPagar.toFixed(2)} Bs.`)
  } else if (impuestoDeterminado < -0.01) {
    resultado = 'CREDITO_FAVOR'
    creditoFavor = Math.abs(impuestoDeterminado)
    notas.push(`Crédito fiscal a favor: ${creditoFavor.toFixed(2)} Bs. (pasa al siguiente período)`)
  } else {
    resultado = 'SIN_IMPUESTO'
    notas.push('Débito y crédito fiscal equilibrados. No hay impuesto a pagar ni crédito a favor.')
  }

  // Notas informativas
  if (debitoFiscalTotal > 0 && creditoFiscalTotal === 0 && creditoFiscalAnterior === 0) {
    notas.push('⚠️ No hay crédito fiscal este período. Asegúrate de registrar las facturas de compra.')
  }
  if (ivaRetenidoEnVentas > 0) {
    notas.push(`IVA retenido por clientes: ${ivaRetenidoEnVentas.toFixed(2)} Bs. (se resta del débito fiscal)`)
  }
  if (ivaRetenidoEnCompras > 0) {
    notas.push(`IVA retenido a proveedores: ${ivaRetenidoEnCompras.toFixed(2)} Bs. (se suma al crédito fiscal)`)
  }

  return {
    mes, ano, mesNombre: getMesNombre(mes),
    totalVentasGravadas16, totalVentasGravadas8, totalVentasGravadas0,
    totalVentasExentas, totalVentasExoneradas, totalVentasNoGravadas,
    debitoFiscal16, debitoFiscal8, debitoFiscal0, debitoFiscalTotal,
    totalComprasGravadas16, totalComprasGravadas8, totalComprasGravadas0,
    totalComprasSinCredito,
    creditoFiscal16, creditoFiscal8, creditoFiscal0, creditoFiscalTotal,
    creditoFiscalPeriodoAnterior: creditoFiscalAnterior,
    ivaRetenidoEnCompras, ivaRetenidoEnVentas,
    debitoFiscalNeto, creditoFiscalNeto, impuestoDeterminado,
    resultado, montoAPagar, creditoFavor, notas,
  }
}
