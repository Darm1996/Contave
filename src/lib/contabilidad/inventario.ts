// Inventario / Kardex: costeo por promedio ponderado.
// Entrada: recalcula el costo promedio mezclando el saldo actual con la
// entrada nueva. Salida: se valora al costo promedio vigente (no cambia el
// promedio) y opcionalmente genera el asiento de costo de venta (COGS).
// Ajuste: corrige cantidad/costo manualmente (mermas, conteo físico, etc.)

import { db } from '@/lib/db'
import { buscarCuentaPorUso, persistirAsiento, LineaAsientoInput } from './asientos-engine'

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export interface ProductoInput {
  codigo: string
  nombre: string
  descripcion?: string
  unidadMedida?: string
  cuentaInventarioId: string
}

export async function registrarProducto(empresaId: string, input: ProductoInput) {
  if (!input.codigo || !input.nombre) throw new Error('código y nombre son requeridos')
  const cuenta = await db.cuenta.findUnique({ where: { id: input.cuentaInventarioId } })
  if (!cuenta || cuenta.empresaId !== empresaId) throw new Error('Cuenta de inventario no encontrada')
  return db.producto.create({
    data: {
      empresaId,
      codigo: input.codigo,
      nombre: input.nombre,
      descripcion: input.descripcion || null,
      unidadMedida: input.unidadMedida || 'UND',
      cuentaInventarioId: input.cuentaInventarioId,
    },
  })
}

export async function listarProductos(empresaId: string) {
  const productos = await db.producto.findMany({ where: { empresaId }, orderBy: { nombre: 'asc' } })
  const cuentaIds = [...new Set(productos.map((p) => p.cuentaInventarioId))]
  const cuentas = await db.cuenta.findMany({ where: { id: { in: cuentaIds } } })
  const mapa = new Map(cuentas.map((c) => [c.id, c]))
  return productos.map((p) => ({
    ...p,
    cuenta: mapa.get(p.cuentaInventarioId) || null,
    valorizacion: round2(p.cantidadActual * p.costoPromedioActual),
  }))
}

export async function desactivarProducto(empresaId: string, id: string) {
  const producto = await db.producto.findUnique({ where: { id } })
  if (!producto || producto.empresaId !== empresaId) throw new Error('Producto no encontrado')
  return db.producto.update({ where: { id }, data: { activo: false } })
}

export async function valorizacionTotal(empresaId: string) {
  const productos = await db.producto.findMany({ where: { empresaId, activo: true } })
  return round2(productos.reduce((s, p) => s + p.cantidadActual * p.costoPromedioActual, 0))
}

export interface MovimientoInput {
  productoId: string
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE'
  cantidad: number
  costoUnitario?: number // requerido para ENTRADA; ignorado en SALIDA (usa el promedio vigente)
  motivo?: string
  facturaId?: string
  generarAsientoCosto?: boolean // solo aplica a SALIDA: contabiliza el costo de venta
  userId?: string
  empresaId?: string // requerido si generarAsientoCosto
}

export async function registrarMovimiento(empresaId: string, input: MovimientoInput) {
  const producto = await db.producto.findUnique({ where: { id: input.productoId } })
  if (!producto || producto.empresaId !== empresaId) throw new Error('Producto no encontrado')
  if (!input.cantidad || input.cantidad <= 0) throw new Error('La cantidad debe ser mayor a 0')

  let costoUnitario: number
  let cantidadSaldo: number
  let costoPromedioSaldo: number

  if (input.tipo === 'ENTRADA') {
    if (input.costoUnitario == null || input.costoUnitario < 0) throw new Error('costoUnitario es requerido para una entrada')
    costoUnitario = input.costoUnitario
    const cantidadTotal = producto.cantidadActual + input.cantidad
    const valorTotal = producto.cantidadActual * producto.costoPromedioActual + input.cantidad * costoUnitario
    costoPromedioSaldo = cantidadTotal > 0 ? round2(valorTotal / cantidadTotal) : 0
    cantidadSaldo = round2(cantidadTotal)
  } else if (input.tipo === 'SALIDA') {
    if (input.cantidad > producto.cantidadActual + 0.001) {
      throw new Error(`No hay suficiente existencia (disponible: ${producto.cantidadActual} ${producto.unidadMedida})`)
    }
    costoUnitario = producto.costoPromedioActual
    cantidadSaldo = round2(producto.cantidadActual - input.cantidad)
    costoPromedioSaldo = producto.costoPromedioActual // el promedio no cambia en una salida
  } else {
    // AJUSTE: costoUnitario opcional; si no viene, se usa el promedio vigente. La cantidad
    // ya viene con signo aplicado por el caller (se resta o se suma según corresponda).
    costoUnitario = input.costoUnitario ?? producto.costoPromedioActual
    cantidadSaldo = round2(producto.cantidadActual + input.cantidad)
    if (cantidadSaldo < 0) throw new Error('El ajuste dejaría la existencia en negativo')
    const valorTotal = producto.cantidadActual * producto.costoPromedioActual + input.cantidad * costoUnitario
    costoPromedioSaldo = cantidadSaldo > 0 ? round2(valorTotal / cantidadSaldo) : 0
  }

  const costoTotal = round2(Math.abs(input.cantidad) * costoUnitario)

  let asientoId: string | null = null
  if (input.tipo === 'SALIDA' && input.generarAsientoCosto) {
    if (!input.userId) throw new Error('userId es requerido para generar el asiento de costo')
    const ctaCosto = await buscarCuentaPorUso(empresaId, 'COSTO_VENTA')
    const lineas: LineaAsientoInput[] = [
      { cuentaId: ctaCosto.id, debit: costoTotal, descripcion: `Costo de venta — ${producto.nombre}` },
      { cuentaId: producto.cuentaInventarioId, credit: costoTotal, descripcion: `Salida de inventario — ${producto.nombre}` },
    ]
    const asiento = await persistirAsiento(
      empresaId, input.userId, input.facturaId || null, 'COSTO_VENTA', new Date(),
      `Costo de venta — ${producto.nombre} (${input.cantidad} ${producto.unidadMedida})`,
      null, 'sistema', lineas,
    )
    asientoId = asiento.id
  }

  const movimiento = await db.movimientoInventario.create({
    data: {
      productoId: input.productoId,
      tipo: input.tipo,
      cantidad: input.cantidad,
      costoUnitario: round2(costoUnitario),
      costoTotal,
      cantidadSaldo,
      costoPromedioSaldo,
      facturaId: input.facturaId || null,
      motivo: input.motivo || null,
      asientoId,
    },
  })

  await db.producto.update({
    where: { id: input.productoId },
    data: { cantidadActual: cantidadSaldo, costoPromedioActual: costoPromedioSaldo },
  })

  return movimiento
}

export async function obtenerKardex(empresaId: string, productoId: string) {
  const producto = await db.producto.findUnique({ where: { id: productoId } })
  if (!producto || producto.empresaId !== empresaId) throw new Error('Producto no encontrado')
  const movimientos = await db.movimientoInventario.findMany({
    where: { productoId },
    orderBy: { fecha: 'asc' },
  })
  return { producto, movimientos }
}
