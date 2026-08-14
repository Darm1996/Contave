// ═══════════════════════════════════════════════════════════════════════
//  Catálogo: categorías, productos, variantes, precios y conversión de unidades
// ═══════════════════════════════════════════════════════════════════════

import type { Prisma as PrismaTypes } from '@prisma/client'
import { db } from '@/lib/db'
import { d, mult, div, esCero, type Numerico } from './dinero'
import { filtrarCostos, seleccionExistencia, type ContextoOperacion } from './permisos'
import { ErrorNegocio, ErrorNoEncontrado } from './respuesta'
import type { EditarProducto, EntradaCategoria, EntradaProducto } from './esquemas'

// ───────────────────────────────────────────────────────────────────────
//  CONVERSIÓN DE UNIDADES
// ───────────────────────────────────────────────────────────────────────

/**
 * Convierte una cantidad entre dos unidades de la misma familia.
 *
 * Cada unidad declara cuántas unidades base equivale (factorBase), así que
 * convertir es: pasar a la base multiplicando por el factor de origen, y
 * salir de la base dividiendo por el del destino. Una sola regla para todos
 * los casos (caja → unidad, kg → g, litro → ml), sin tabla de pares.
 *
 * Es lo que resuelve el fraccionamiento del quiosco: se compra una caja de
 * 24 y se venden 24 unidades, y el factor sale del catálogo en vez de ser un
 * número que alguien tiene que recordar actualizar.
 */
export async function convertirUnidad(
  cantidad: Numerico,
  unidadOrigenId: string,
  unidadDestinoId: string,
): Promise<PrismaTypes.Decimal> {
  if (unidadOrigenId === unidadDestinoId) return d(cantidad)

  const [origen, destino] = await Promise.all([
    db.unidadMedida.findUnique({ where: { id: unidadOrigenId } }),
    db.unidadMedida.findUnique({ where: { id: unidadDestinoId } }),
  ])
  if (!origen || !destino) throw new ErrorNoEncontrado('Unidad de medida no encontrada')

  if (origen.tipo !== destino.tipo) {
    throw new ErrorNegocio(
      `No se puede convertir de ${origen.nombre} a ${destino.nombre}: son magnitudes distintas (${origen.tipo} y ${destino.tipo})`,
    )
  }
  if (esCero(destino.factorBase)) {
    throw new ErrorNegocio(`La unidad ${destino.nombre} tiene factor de conversión cero`)
  }

  return div(mult(cantidad, origen.factorBase), destino.factorBase)
}

// ───────────────────────────────────────────────────────────────────────
//  CATEGORÍAS
// ───────────────────────────────────────────────────────────────────────

export async function listarCategorias(ctx: ContextoOperacion) {
  return db.categoria.findMany({
    where: { organizacionId: ctx.organizacionId, deletedAt: null },
    orderBy: [{ ruta: 'asc' }, { orden: 'asc' }],
    include: { _count: { select: { productos: true } } },
  })
}

export async function crearCategoria(ctx: ContextoOperacion, datos: EntradaCategoria) {
  let ruta = datos.nombre
  let nivel = 1

  if (datos.padreId) {
    const padre = await db.categoria.findFirst({
      where: { id: datos.padreId, organizacionId: ctx.organizacionId, deletedAt: null },
    })
    if (!padre) throw new ErrorNoEncontrado('La categoría padre no existe')
    ruta = `${padre.ruta}/${datos.nombre}`
    nivel = padre.nivel + 1
    if (nivel > 5) {
      throw new ErrorNegocio('La jerarquía de categorías no puede tener más de 5 niveles')
    }
  }

  return db.categoria.create({
    data: {
      organizacionId: ctx.organizacionId,
      nombre: datos.nombre,
      padreId: datos.padreId ?? null,
      ruta,
      nivel,
      orden: datos.orden,
      createdBy: ctx.usuarioId,
    },
  })
}

// ───────────────────────────────────────────────────────────────────────
//  PRODUCTOS
// ───────────────────────────────────────────────────────────────────────

export interface FiltroProductos {
  busqueda?: string
  categoriaId?: string
  soloActivos?: boolean
  pagina?: number
  porPagina?: number
}

/**
 * Lista productos con paginación y búsqueda en servidor.
 *
 * Nunca devuelve el catálogo completo: la búsqueda se resuelve en Postgres
 * con índices y se pagina. Traer 20.000 productos al cliente para filtrarlos
 * ahí hace que el POS tarde en abrir y consuma datos del teléfono del
 * cajero.
 */
export async function listarProductos(ctx: ContextoOperacion, filtro: FiltroProductos = {}) {
  const porPagina = Math.min(filtro.porPagina ?? 50, 200)
  const pagina = Math.max(filtro.pagina ?? 1, 1)

  const where: PrismaTypes.ProductoWhereInput = {
    organizacionId: ctx.organizacionId,
    deletedAt: null,
    ...(filtro.soloActivos !== false ? { activo: true } : {}),
    ...(filtro.categoriaId ? { categoriaId: filtro.categoriaId } : {}),
    ...(filtro.busqueda
      ? {
          OR: [
            { nombre: { contains: filtro.busqueda, mode: 'insensitive' } },
            { sku: { contains: filtro.busqueda, mode: 'insensitive' } },
            { variantes: { some: { codigoBarras: filtro.busqueda } } },
            { variantes: { some: { sku: { contains: filtro.busqueda, mode: 'insensitive' } } } },
          ],
        }
      : {}),
  }

  const [total, productos] = await Promise.all([
    db.producto.count({ where }),
    db.producto.findMany({
      where,
      orderBy: { nombre: 'asc' },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      include: {
        categoria: { select: { id: true, nombre: true, ruta: true } },
        unidadVenta: { select: { id: true, codigo: true, nombre: true, decimales: true } },
        impuesto: { select: { id: true, nombre: true, tasa: true, incluidoEnPrecio: true } },
        variantes: {
          where: { activo: true, deletedAt: null },
          include: {
            existencias: { select: seleccionExistencia(ctx) },
            precios: {
              where: { vigenciaHasta: null },
              include: { listaPrecio: { select: { id: true, nombre: true, moneda: true } } },
            },
          },
        },
      },
    }),
  ])

  // Doble barrera: la consulta ya excluyó los costos si el rol no los puede
  // ver, y el filtro limpia cualquier costo que se haya colado en un nivel
  // anidado que la selección no cubriera.
  return {
    total,
    pagina,
    porPagina,
    productos: filtrarCostos(productos, ctx),
  }
}

/** Resuelve una variante por código de barras. Es la consulta del POS. */
export async function buscarPorCodigoBarras(ctx: ContextoOperacion, codigoBarras: string) {
  const variante = await db.variante.findFirst({
    where: { organizacionId: ctx.organizacionId, codigoBarras, activo: true, deletedAt: null },
    include: {
      producto: {
        include: {
          impuesto: { select: { id: true, tasa: true, incluidoEnPrecio: true } },
          unidadVenta: { select: { id: true, codigo: true, decimales: true } },
        },
      },
      precios: { where: { vigenciaHasta: null }, include: { listaPrecio: true } },
      existencias: { select: seleccionExistencia(ctx) },
    },
  })
  if (!variante) throw new ErrorNoEncontrado(`Ningún producto tiene el código ${codigoBarras}`)
  return filtrarCostos(variante, ctx)
}

/**
 * Crea un producto con sus variantes.
 *
 * Si no se declaran variantes se crea una predeterminada. Esto no es una
 * comodidad: es lo que garantiza que exista un único camino de descuento de
 * inventario, porque el stock siempre vive en una variante y nunca en el
 * producto.
 */
export async function crearProducto(ctx: ContextoOperacion, datos: EntradaProducto) {
  await validarReferenciasProducto(ctx, datos)

  return db.$transaction(async (tx) => {
    const producto = await tx.producto.create({
      data: {
        organizacionId: ctx.organizacionId,
        nombre: datos.nombre,
        descripcion: datos.descripcion ?? null,
        tipo: datos.tipo,
        sku: datos.sku,
        codigoProveedor: datos.codigoProveedor ?? null,
        categoriaId: datos.categoriaId ?? null,
        unidadVentaId: datos.unidadVentaId,
        unidadCompraId: datos.unidadCompraId ?? null,
        impuestoId: datos.impuestoId ?? null,
        controlaStock: datos.tipo === 'SERVICIO' ? false : datos.controlaStock,
        manejaLotes: datos.manejaLotes,
        tieneVariantes: datos.variantes.length > 0,
        stockMinimo: datos.stockMinimo,
        puntoReorden: datos.puntoReorden,
        temporadaId: datos.temporadaId ?? null,
        cuentaInventarioId: datos.cuentaInventarioId ?? null,
        imagenUrl: datos.imagenUrl ?? null,
        createdBy: ctx.usuarioId,
      },
    })

    if (datos.variantes.length === 0) {
      await tx.variante.create({
        data: {
          organizacionId: ctx.organizacionId,
          productoId: producto.id,
          nombre: '',
          sku: datos.sku,
          esPredeterminada: true,
          createdBy: ctx.usuarioId,
        },
      })
    } else {
      for (const [indice, entrada] of datos.variantes.entries()) {
        const valores = entrada.atributoValorIds.length
          ? await tx.atributoValor.findMany({
              where: { id: { in: entrada.atributoValorIds } },
              include: { atributo: { select: { nombre: true, orden: true } } },
              orderBy: [{ atributo: { orden: 'asc' } }, { orden: 'asc' }],
            })
          : []

        // Nombre legible de la combinación ("M / Azul"), calculado una vez al
        // crear para no recomponerlo en cada consulta del POS.
        const nombre = valores.map((v) => v.valor).join(' / ')

        const variante = await tx.variante.create({
          data: {
            organizacionId: ctx.organizacionId,
            productoId: producto.id,
            nombre,
            sku: entrada.sku ?? `${datos.sku}-${indice + 1}`,
            codigoBarras: entrada.codigoBarras ?? null,
            esPredeterminada: indice === 0,
            createdBy: ctx.usuarioId,
          },
        })

        if (entrada.atributoValorIds.length > 0) {
          await tx.varianteValor.createMany({
            data: entrada.atributoValorIds.map((atributoValorId) => ({
              varianteId: variante.id,
              atributoValorId,
            })),
          })
        }
      }
    }

    return tx.producto.findUniqueOrThrow({
      where: { id: producto.id },
      include: { variantes: true },
    })
  })
}

export async function editarProducto(ctx: ContextoOperacion, id: string, datos: EditarProducto) {
  const producto = await db.producto.findFirst({
    where: { id, organizacionId: ctx.organizacionId, deletedAt: null },
  })
  if (!producto) throw new ErrorNoEncontrado('El producto no existe')

  return db.producto.update({
    where: { id },
    data: {
      ...(datos.nombre ? { nombre: datos.nombre } : {}),
      ...(datos.descripcion !== undefined ? { descripcion: datos.descripcion } : {}),
      ...(datos.categoriaId !== undefined ? { categoriaId: datos.categoriaId } : {}),
      ...(datos.unidadVentaId ? { unidadVentaId: datos.unidadVentaId } : {}),
      ...(datos.unidadCompraId !== undefined ? { unidadCompraId: datos.unidadCompraId } : {}),
      ...(datos.impuestoId !== undefined ? { impuestoId: datos.impuestoId } : {}),
      ...(datos.controlaStock !== undefined ? { controlaStock: datos.controlaStock } : {}),
      ...(datos.manejaLotes !== undefined ? { manejaLotes: datos.manejaLotes } : {}),
      ...(datos.stockMinimo !== undefined ? { stockMinimo: datos.stockMinimo } : {}),
      ...(datos.puntoReorden !== undefined ? { puntoReorden: datos.puntoReorden } : {}),
      ...(datos.imagenUrl !== undefined ? { imagenUrl: datos.imagenUrl } : {}),
    },
  })
}

/**
 * Desactiva un producto (borrado lógico). No se borra físicamente porque
 * está referenciado por ventas y movimientos de inventario históricos: un
 * borrado real dejaría tickets que apuntan a la nada y reportes de meses
 * anteriores que ya no cuadran.
 */
export async function desactivarProducto(ctx: ContextoOperacion, id: string) {
  const producto = await db.producto.findFirst({
    where: { id, organizacionId: ctx.organizacionId, deletedAt: null },
    include: { variantes: { include: { existencias: { where: { cantidad: { not: 0 } }, take: 1 } } } },
  })
  if (!producto) throw new ErrorNoEncontrado('El producto no existe')

  const conExistencia = producto.variantes.some((v) => v.existencias.length > 0)
  if (conExistencia) {
    throw new ErrorNegocio(
      `"${producto.nombre}" todavía tiene existencia. Ajusta el inventario a cero antes de desactivarlo, ` +
        'para que la salida quede registrada en el kardex con su motivo.',
    )
  }

  return db.$transaction(async (tx) => {
    await tx.variante.updateMany({ where: { productoId: id }, data: { activo: false } })
    return tx.producto.update({ where: { id }, data: { activo: false, deletedAt: new Date() } })
  })
}

/** Verifica que las referencias del producto pertenezcan a la organización. */
async function validarReferenciasProducto(ctx: ContextoOperacion, datos: Partial<EntradaProducto>): Promise<void> {
  if (datos.unidadVentaId) {
    const unidad = await db.unidadMedida.findFirst({
      where: { id: datos.unidadVentaId, organizacionId: ctx.organizacionId },
    })
    if (!unidad) throw new ErrorNoEncontrado('La unidad de venta no existe en este negocio')
  }
  if (datos.categoriaId) {
    const categoria = await db.categoria.findFirst({
      where: { id: datos.categoriaId, organizacionId: ctx.organizacionId },
    })
    if (!categoria) throw new ErrorNoEncontrado('La categoría no existe en este negocio')
  }
  if (datos.impuestoId) {
    const impuesto = await db.impuesto.findFirst({
      where: { id: datos.impuestoId, organizacionId: ctx.organizacionId },
    })
    if (!impuesto) throw new ErrorNoEncontrado('El impuesto no existe en este negocio')
  }
}

// ───────────────────────────────────────────────────────────────────────
//  PRECIOS
// ───────────────────────────────────────────────────────────────────────

/**
 * Precio vigente de una variante en una lista, a una fecha.
 *
 * Se busca el precio cuya vigencia cubre la fecha pedida y cuya cantidad
 * mínima es la mayor que no supera la cantidad vendida (precio por volumen).
 * Consultar por fecha, y no "el último precio", es lo que permite auditar
 * una venta de la semana pasada contra el precio que regía ese día.
 */
export async function precioVigente(
  organizacionId: string,
  varianteId: string,
  listaPrecioId: string,
  cantidad: Numerico = 1,
  fecha: Date = new Date(),
) {
  const precios = await db.precio.findMany({
    where: {
      organizacionId,
      varianteId,
      listaPrecioId,
      vigenciaDesde: { lte: fecha },
      OR: [{ vigenciaHasta: null }, { vigenciaHasta: { gte: fecha } }],
      cantidadMinima: { lte: d(cantidad).toString() },
    },
    orderBy: [{ cantidadMinima: 'desc' }, { vigenciaDesde: 'desc' }],
    take: 1,
  })

  return precios[0] ?? null
}

/**
 * Fija un precio nuevo cerrando la vigencia del anterior.
 *
 * Un precio no se edita: se cierra el que regía y se abre otro. Así la
 * historia de precios queda completa y una venta antigua siempre se puede
 * explicar. Editar el precio en su sitio haría que el ticket de ayer parezca
 * un error de cálculo.
 */
export async function fijarPrecio(
  ctx: ContextoOperacion,
  datos: { listaPrecioId: string; varianteId: string; monto: Numerico; moneda: string; cantidadMinima?: Numerico; vigenciaDesde?: Date },
) {
  const desde = datos.vigenciaDesde ?? new Date()
  const cantidadMinima = d(datos.cantidadMinima ?? 1)

  const variante = await db.variante.findFirst({
    where: { id: datos.varianteId, organizacionId: ctx.organizacionId },
  })
  if (!variante) throw new ErrorNoEncontrado('La variante no existe en este negocio')

  return db.$transaction(async (tx) => {
    await tx.precio.updateMany({
      where: {
        organizacionId: ctx.organizacionId,
        varianteId: datos.varianteId,
        listaPrecioId: datos.listaPrecioId,
        cantidadMinima: cantidadMinima.toString(),
        vigenciaHasta: null,
      },
      data: { vigenciaHasta: desde },
    })

    return tx.precio.create({
      data: {
        organizacionId: ctx.organizacionId,
        listaPrecioId: datos.listaPrecioId,
        varianteId: datos.varianteId,
        monto: d(datos.monto).toString(),
        moneda: datos.moneda,
        cantidadMinima: cantidadMinima.toString(),
        vigenciaDesde: desde,
        createdBy: ctx.usuarioId,
      },
    })
  })
}
