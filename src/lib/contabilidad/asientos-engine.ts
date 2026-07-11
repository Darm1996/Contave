// Motor de asientos contables para Venezuela
// Genera asientos automáticos según el tipo de factura
// Aplica IVA, retención de IVA y conversión a moneda funcional

import { db } from '@/lib/db'
import { calcularRetencionIVA } from './ven-nif'

// Catálogo de cuentas por "uso" que el motor necesita
// Estas son las cuentas que el motor buscará en la empresa para generar asientos
export const USOS_REQUERIDOS = {
  // Activo
  BANCOS_BS: 'BANCOS_BS',
  BANCOS_USD: 'BANCOS_USD',
  CAJA: 'CAJA',
  CAJA_CHICA: 'CAJA_CHICA',
  CXC_CLIENTES: 'CXC_CLIENTES',
  CXP_PROVEEDORES: 'CXP_PROVEEDORES',
  CXP_DIVERSAS: 'CXP_DIVERSAS',
  IVA_CREDITO_FISCAL: 'IVA_CREDITO_FISCAL', // IVA soportado en compras
  IVA_DEBITO_FISCAL: 'IVA_DEBITO_FISCAL',   // IVA repercutido en ventas
  RET_IVA_SOPORTADA: 'RET_IVA_SOPORTADA',   // IVA que me retienen (activo)
  RET_IVA_POR_ENTERAR: 'RET_IVA_POR_ENTERAR', // IVA que retengo (pasivo)
  // Patrimonio / resultados
  UTILIDAD_EJERCICIO: 'UTILIDAD_EJERCICIO',
  PERDIDA_EJERCICIO: 'PERDIDA_EJERCICIO',
  // Ingresos
  VENTAS_GRAVABLES: 'VENTAS_GRAVABLES',
  VENTAS_EXENTAS: 'VENTAS_EXENTAS',
  INGRESOS_SERVICIOS: 'INGRESOS_SERVICIOS',
  GANANCIA_CAMBIO: 'GANANCIA_CAMBIO',
  // Costos
  COSTO_VENTA: 'COSTO_VENTA',
  MERCANCIA: 'MERCANCIA',
  // Gastos (cualquier cuenta con uso que empiece con GASTO_)
} as const

export interface LineaAsientoInput {
  cuentaId: string
  debit?: number
  credit?: number
  descripcion?: string
}

export interface ResultadoAsiento {
  descripcion: string
  lineas: LineaAsientoInput[]
  totalDebit: number
  totalCredit: number
  balanceado: boolean
}

// Buscar cuenta por uso dentro de la empresa
async function buscarCuentaPorUso(empresaId: string, uso: string) {
  const cuenta = await db.cuenta.findFirst({
    where: { empresaId, uso, imputable: true },
  })
  if (!cuenta) throw new Error(`No se encontró cuenta con uso "${uso}" en la empresa. Verifique el plan de cuentas.`)
  return cuenta
}

// Buscar cuenta de gasto por uso (permite pasar uso alternativo)
async function buscarCuentaGasto(empresaId: string, usoGasto: string) {
  const cuenta = await db.cuenta.findFirst({
    where: { empresaId, uso: usoGasto, imputable: true },
  })
  if (cuenta) return cuenta
  // Fallback a "otros gastos"
  return buscarCuentaPorUso(empresaId, 'GASTO_OTROS')
}

// ── Generar asiento para factura de COMPRA ──
// Asiento típico (empresa es agente de retención IVA):
//   Débito: Inventario/Mercancía o Gasto (base imponible) ........ X
//   Débito: IVA Crédito Fiscal (monto IVA) ........................ Y
//   Crédito: Retención IVA Soportada (si aplica) .................. (Z)
//   Crédito: CxP Proveedores / Bancos (total - retención) ........ (X+Y-Z)
export async function generarAsientoCompra(factura: {
  empresaId: string
  tipo: string
  monedaOriginal: string
  baseImponible: number
  montoExento: number
  montoExonerado: number
  montoIVA: number
  subtotal: number
  total: number
  montoRetencionIVA: number | null
  montoRetencionISLR?: number | null
  porcentajeRetencionISLR?: number | null
  totalAPagar: number
  totalMonedaFuncional: number
  descripcion: string | null
  esInventario: boolean // true = compra mercancía, false = gasto
  usoGasto?: string // si es gasto, qué tipo (GASTO_SERVICIOS_BASICOS, etc.)
}): Promise<ResultadoAsiento> {
  const lineas: LineaAsientoInput[] = []
  const empresa = await db.empresa.findUnique({ where: { id: factura.empresaId } })
  if (!empresa) throw new Error('Empresa no encontrada')

  // Convertir todos los montos a moneda funcional (Bs.) para el asiento
  const mf = (n: number) => factura.totalMonedaFuncional && factura.total > 0
    ? (n * factura.totalMonedaFuncional) / factura.total
    : n

  const baseMF = mf(factura.baseImponible)
  const exentoMF = mf(factura.montoExento)
  const exoneradoMF = mf(factura.montoExonerado)
  const ivaMF = mf(factura.montoIVA)
  const retMF = factura.montoRetencionIVA ? mf(factura.montoRetencionIVA) : 0
  const totalAPagarMF = mf(factura.totalAPagar)

  // 1. Débito a Inventario o Gasto
  if (factura.esInventario) {
    const cuenta = await buscarCuentaPorUso(factura.empresaId, 'MERCANCIA')
    lineas.push({ cuentaId: cuenta.id, debit: baseMF + exentoMF + exoneradoMF, descripcion: 'Mercancía comprada' })
  } else {
    const usoG = factura.usoGasto || 'GASTO_OTROS'
    const cuenta = await buscarCuentaGasto(factura.empresaId, usoG)
    lineas.push({ cuentaId: cuenta.id, debit: baseMF + exentoMF + exoneradoMF, descripcion: 'Gasto operacional' })
  }

  // 2. Débito a IVA Crédito Fiscal (si hay IVA)
  if (ivaMF > 0) {
    const cuenta = await buscarCuentaPorUso(factura.empresaId, 'IVA_CREDITO_FISCAL')
    lineas.push({ cuentaId: cuenta.id, debit: ivaMF, descripcion: 'IVA crédito fiscal 16%' })
  }

  // 3. Crédito a Retención IVA Soportada (si la empresa es agente de retención y se aplicó retención)
  if (retMF > 0) {
    const cuenta = await buscarCuentaPorUso(factura.empresaId, 'RET_IVA_SOPORTADA')
    lineas.push({ cuentaId: cuenta.id, credit: retMF, descripcion: 'Retención IVA soportada' })
  }

  // 3.b Crédito a ISLR por Pagar (si se aplicó retención ISLR)
  if (factura.montoRetencionISLR && factura.montoRetencionISLR > 0) {
    const islrMF = mf(factura.montoRetencionISLR)
    // Buscar cuenta ISLR_POR_PAGAR; si no existe, usar IMPUESTOS_POR_PAGAR fallback
    let ctaISLR
    try {
      ctaISLR = await buscarCuentaPorUso(factura.empresaId, 'ISLR_POR_PAGAR')
    } catch {
      ctaISLR = await buscarCuentaPorUso(factura.empresaId, 'IMPUESTOS_POR_PAGAR')
    }
    lineas.push({ cuentaId: ctaISLR.id, credit: islrMF, descripcion: `Retención ISLR (${factura.porcentajeRetencionISLR}%)` })
  }

  // 4. Crédito a CxP Proveedores por el monto a pagar (total - retenciones)
  const ctaCxp = await buscarCuentaPorUso(factura.empresaId, 'CXP_PROVEEDORES')
  lineas.push({ cuentaId: ctaCxp.id, credit: totalAPagarMF, descripcion: 'CxP proveedor' })

  const totalDebit = lineas.reduce((s, l) => s + (l.debit || 0), 0)
  const totalCredit = lineas.reduce((s, l) => s + (l.credit || 0), 0)

  return {
    descripcion: factura.descripcion || `Compra - ${factura.tipo}`,
    lineas,
    totalDebit,
    totalCredit,
    balanceado: Math.abs(totalDebit - totalCredit) < 0.01,
  }
}

// ── Generar asiento para factura de VENTA ──
// Asiento típico (empresa es agente de retención):
//   Débito: CxC Clientes / Bancos (total) ......................... X+Y
//   Crédito: Ventas Gravables / Exentas (base imponible) ......... X
//   Crédito: IVA Débito Fiscal (monto IVA) ........................ Y
//   (Si al cliente se le retuvo IVA, también:)
//   Débito: Retención IVA por Enterar ............................. Z
//   Crédito: CxC Clientes (ajuste por la retención) .............. Z
//   (Pero si el cliente es quien retiene el IVA nuestro:)
//   Débito: Retención IVA Soportada ............................... Z (es nuestro crédito)
export async function generarAsientoVenta(factura: {
  empresaId: string
  baseImponible: number
  montoExento: number
  montoIVA: number
  subtotal: number
  total: number
  montoRetencionIVA: number | null
  totalAPagar: number
  totalMonedaFuncional: number
  descripcion: string | null
  clienteRetieneIVA: boolean // true si el cliente es agente de retención
}): Promise<ResultadoAsiento> {
  const lineas: LineaAsientoInput[] = []
  const mf = (n: number) => factura.totalMonedaFuncional && factura.total > 0
    ? (n * factura.totalMonedaFuncional) / factura.total
    : n

  const baseMF = mf(factura.baseImponible)
  const exentoMF = mf(factura.montoExento)
  const ivaMF = mf(factura.montoIVA)
  const retMF = factura.montoRetencionIVA ? mf(factura.montoRetencionIVA) : 0
  const totalMF = mf(factura.total)
  const totalAPagarMF = mf(factura.totalAPagar)

  // 1. Débito a CxC Clientes por el total (incluye IVA, antes de retención)
  const ctaCxc = await buscarCuentaPorUso(factura.empresaId, 'CXC_CLIENTES')
  lineas.push({ cuentaId: ctaCxc.id, debit: totalMF, descripcion: 'CxC cliente - venta' })

  // 2. Si el cliente retiene IVA, ese monto se va como activo (Retención IVA Soportada)
  if (retMF > 0 && factura.clienteRetieneIVA) {
    const cta = await buscarCuentaPorUso(factura.empresaId, 'RET_IVA_SOPORTADA')
    lineas.push({ cuentaId: cta.id, debit: retMF, descripcion: 'Retención IVA que aplicó el cliente' })
    // Y se compensa con un crédito a CxC
    lineas.push({ cuentaId: ctaCxc.id, credit: retMF, descripcion: 'Ajuste CxC por retención del cliente' })
  }

  // 3. Crédito a Ventas (base imponible + exento)
  const ctaVentas = await buscarCuentaPorUso(factura.empresaId, baseMF > 0 ? 'VENTAS_GRAVABLES' : 'VENTAS_EXENTAS')
  lineas.push({ cuentaId: ctaVentas.id, credit: baseMF + exentoMF, descripcion: 'Ventas gravables' })

  // 4. Crédito a IVA Débito Fiscal
  if (ivaMF > 0) {
    const cta = await buscarCuentaPorUso(factura.empresaId, 'IVA_DEBITO_FISCAL')
    lineas.push({ cuentaId: cta.id, credit: ivaMF, descripcion: 'IVA débito fiscal 16%' })
  }

  const totalDebit = lineas.reduce((s, l) => s + (l.debit || 0), 0)
  const totalCredit = lineas.reduce((s, l) => s + (l.credit || 0), 0)

  return {
    descripcion: factura.descripcion || 'Venta',
    lineas,
    totalDebit,
    totalCredit,
    balanceado: Math.abs(totalDebit - totalCredit) < 0.01,
  }
}

// ── Generar asiento para NOTA DE CRÉDITO / DÉBITO ──
// Nota de crédito = reversa parcial o total de una factura (compra o venta)
// Nota de débito = cargo adicional a una factura
export async function generarAsientoNota(factura: {
  empresaId: string
  tipo: string // NOTA_CREDITO o NOTA_DEBITO
  baseImponible: number
  montoExento: number
  montoIVA: number
  total: number
  totalMonedaFuncional: number
  descripcion: string | null
  aplicaA: 'COMPRA' | 'VENTA' // si es nota sobre compra o venta
}): Promise<ResultadoAsiento> {
  const lineas: LineaAsientoInput[] = []
  const mf = (n: number) => factura.totalMonedaFuncional && factura.total > 0
    ? (n * factura.totalMonedaFuncional) / factura.total
    : n

  const baseMF = mf(factura.baseImponible)
  const exentoMF = mf(factura.montoExento)
  const ivaMF = mf(factura.montoIVA)
  const totalMF = mf(factura.total)

  const esCredito = factura.tipo === 'NOTA_CREDITO'
  // Si es crédito, se invierten las cuentas (debit↔credit)
  const signo = esCredito ? -1 : 1
  const aplicarDebit = (cuentaId: string, monto: number, desc: string) => {
    if (signo > 0) lineas.push({ cuentaId, debit: monto, descripcion: desc })
    else lineas.push({ cuentaId, credit: monto, descripcion: desc })
  }
  const aplicarCredit = (cuentaId: string, monto: number, desc: string) => {
    if (signo > 0) lineas.push({ cuentaId, credit: monto, descripcion: desc })
    else lineas.push({ cuentaId, debit: monto, descripcion: desc })
  }

  if (factura.aplicaA === 'COMPRA') {
    // Nota sobre compra: reversa del asiento de compra
    const ctaMercancia = await buscarCuentaPorUso(factura.empresaId, 'MERCANCIA')
    aplicarDebit(ctaMercancia.id, baseMF + exentoMF, 'Reversa mercancía')
    if (ivaMF > 0) {
      const ctaIva = await buscarCuentaPorUso(factura.empresaId, 'IVA_CREDITO_FISCAL')
      aplicarDebit(ctaIva.id, ivaMF, 'Reversa IVA crédito fiscal')
    }
    const ctaCxp = await buscarCuentaPorUso(factura.empresaId, 'CXP_PROVEEDORES')
    aplicarCredit(ctaCxp.id, totalMF, 'Reversa CxP proveedor')
  } else {
    // Nota sobre venta: reversa del asiento de venta
    const ctaCxc = await buscarCuentaPorUso(factura.empresaId, 'CXC_CLIENTES')
    aplicarDebit(ctaCxc.id, totalMF, 'Reversa CxC cliente')
    const ctaVentas = await buscarCuentaPorUso(factura.empresaId, baseMF > 0 ? 'VENTAS_GRAVABLES' : 'VENTAS_EXENTAS')
    aplicarCredit(ctaVentas.id, baseMF + exentoMF, 'Reversa ventas')
    if (ivaMF > 0) {
      const ctaIva = await buscarCuentaPorUso(factura.empresaId, 'IVA_DEBITO_FISCAL')
      aplicarCredit(ctaIva.id, ivaMF, 'Reversa IVA débito fiscal')
    }
  }

  const totalDebit = lineas.reduce((s, l) => s + (l.debit || 0), 0)
  const totalCredit = lineas.reduce((s, l) => s + (l.credit || 0), 0)

  return {
    descripcion: factura.descripcion || `Nota ${esCredito ? 'crédito' : 'débito'} - ${factura.aplicaA}`,
    lineas,
    totalDebit,
    totalCredit,
    balanceado: Math.abs(totalDebit - totalCredit) < 0.01,
  }
}

// ── Generar asiento para GASTO MENOR (caja chica) ──
//   Débito: Gasto (categoría)
//   Débito: IVA Crédito Fiscal (si aplica)
//   Crédito: Caja / Caja Chica
export async function generarAsientoGastoMenor(factura: {
  empresaId: string
  baseImponible: number
  montoExento: number
  montoIVA: number
  total: number
  totalAPagar?: number
  totalMonedaFuncional: number
  montoRetencionISLR?: number | null
  porcentajeRetencionISLR?: number | null
  descripcion: string | null
  usoGasto: string
}): Promise<ResultadoAsiento> {
  const lineas: LineaAsientoInput[] = []
  const mf = (n: number) => factura.totalMonedaFuncional && factura.total > 0
    ? (n * factura.totalMonedaFuncional) / factura.total
    : n

  const baseMF = mf(factura.baseImponible)
  const exentoMF = mf(factura.montoExento)
  const ivaMF = mf(factura.montoIVA)
  const totalMF = mf(factura.total)
  const totalAPagarMF = factura.totalAPagar ? mf(factura.totalAPagar) : totalMF

  const ctaGasto = await buscarCuentaGasto(factura.empresaId, factura.usoGasto)
  lineas.push({ cuentaId: ctaGasto.id, debit: baseMF + exentoMF, descripcion: 'Gasto menor' })

  if (ivaMF > 0) {
    const ctaIva = await buscarCuentaPorUso(factura.empresaId, 'IVA_CREDITO_FISCAL')
    lineas.push({ cuentaId: ctaIva.id, debit: ivaMF, descripcion: 'IVA crédito fiscal' })
  }

  // Crédito a ISLR por Pagar (si aplica)
  if (factura.montoRetencionISLR && factura.montoRetencionISLR > 0) {
    const islrMF = mf(factura.montoRetencionISLR)
    let ctaISLR
    try {
      ctaISLR = await buscarCuentaPorUso(factura.empresaId, 'ISLR_POR_PAGAR')
    } catch {
      ctaISLR = await buscarCuentaPorUso(factura.empresaId, 'IMPUESTOS_POR_PAGAR')
    }
    lineas.push({ cuentaId: ctaISLR.id, credit: islrMF, descripcion: `Retención ISLR (${factura.porcentajeRetencionISLR || 0}%)` })
  }

  const ctaCaja = await buscarCuentaPorUso(factura.empresaId, 'CAJA_CHICA')
  lineas.push({ cuentaId: ctaCaja.id, credit: totalAPagarMF, descripcion: 'Salida de caja chica' })

  const totalDebit = lineas.reduce((s, l) => s + (l.debit || 0), 0)
  const totalCredit = lineas.reduce((s, l) => s + (l.credit || 0), 0)

  return {
    descripcion: factura.descripcion || 'Gasto menor',
    lineas,
    totalDebit,
    totalCredit,
    balanceado: Math.abs(totalDebit - totalCredit) < 0.01,
  }
}

// ── Persistir asiento en la base de datos ──
export async function persistirAsiento(
  empresaId: string,
  userId: string,
  facturaId: string,
  tipo: string,
  fecha: Date,
  descripcion: string,
  referencia: string | null,
  fuente: string,
  lineas: LineaAsientoInput[],
) {
  // Obtener siguiente número de asiento correlativo
  const ultimoAsiento = await db.asiento.findFirst({
    where: { empresaId },
    orderBy: { numero: 'desc' },
  })
  const numero = (ultimoAsiento?.numero || 0) + 1

  return db.asiento.create({
    data: {
      empresaId,
      userId,
      facturaId,
      numero,
      fecha,
      descripcion,
      referencia,
      tipo,
      fuente,
      lineas: {
        create: lineas.map((l) => ({
          cuentaId: l.cuentaId,
          debit: l.debit || 0,
          credit: l.credit || 0,
          descripcion: l.descripcion,
        })),
      },
    },
    include: { lineas: { include: { cuenta: true } } },
  })
}
