// ═══════════════════════════════════════════════════════════════════════
//  Validación con Zod — mismo esquema en cliente y servidor
// ═══════════════════════════════════════════════════════════════════════
//
// Los esquemas viven aquí, en un módulo compartido, y no duplicados en el
// formulario y en la ruta. Duplicarlos garantiza que tarde o temprano
// divergen y el formulario acepta algo que el servidor rechaza (o peor: el
// servidor acepta algo que el formulario nunca dejó pasar y nadie validó).
//
// Los importes se validan como STRING y no como number. Es deliberado: un
// `z.number()` obligaría a pasar el valor por un flotante binario antes de
// llegar a Decimal, que es justo lo que este sistema evita.

import { z } from 'zod'
import { ROLES } from './permisos'

// ───────────────────────────────────────────────────────────────────────
//  PRIMITIVAS
// ───────────────────────────────────────────────────────────────────────

const PATRON_DECIMAL = /^-?\d+(\.\d+)?$/

/**
 * Importe o cantidad. Acepta string o number en la entrada (un formulario
 * manda texto, una API puede mandar número) y normaliza a string para que
 * el valor llegue a Decimal sin pasar por flotante.
 */
export const zDecimal = (opciones: { min?: string; max?: string; permiteNegativo?: boolean } = {}) =>
  z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === 'number' ? v.toString() : v.trim()))
    .refine((v) => v !== '' && PATRON_DECIMAL.test(v), { message: 'Debe ser un número válido' })
    .refine((v) => opciones.permiteNegativo || !v.startsWith('-'), { message: 'No puede ser negativo' })
    .refine((v) => (opciones.min === undefined ? true : Number(v) >= Number(opciones.min)), {
      message: `No puede ser menor que ${opciones.min}`,
    })
    .refine((v) => (opciones.max === undefined ? true : Number(v) <= Number(opciones.max)), {
      message: `No puede ser mayor que ${opciones.max}`,
    })

/** Cantidad estrictamente mayor que cero: una línea de venta de 0 no existe. */
export const zCantidadPositiva = zDecimal().refine((v) => Number(v) > 0, {
  message: 'La cantidad debe ser mayor que cero',
})

export const zMoneda = z.string().length(3, 'El código de moneda tiene 3 letras').toUpperCase()
export const zTasa = zDecimal({ min: '0' }).refine((v) => Number(v) > 0, {
  message: 'La tasa de cambio debe ser mayor que cero',
})
export const zPorcentaje = zDecimal({ min: '0', max: '100' })
export const zId = z.string().min(1, 'Identificador requerido')
export const zNombre = z.string().trim().min(1, 'El nombre es requerido').max(200)
export const zFecha = z.union([z.string(), z.date()]).transform((v) => (typeof v === 'string' ? new Date(v) : v))

/** RIF venezolano: letra de tipo, guion, número y dígito verificador. */
export const zRif = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[JGVEP]-?\d{6,9}-?\d?$/, 'RIF inválido (ejemplo: J-12345678-9)')

// ───────────────────────────────────────────────────────────────────────
//  ORGANIZACIÓN Y ESTRUCTURA
// ───────────────────────────────────────────────────────────────────────

export const RUBROS = ['GENERAL', 'RESTAURANTE', 'ROPA', 'QUIOSCO'] as const

export const esquemaCrearOrganizacion = z.object({
  nombre: zNombre,
  rubro: z.enum(RUBROS).default('GENERAL'),
  // Datos fiscales de la Empresa 1:1 que se crea junto con la organización.
  rif: zRif,
  direccion: z.string().trim().max(500).optional(),
  telefono: z.string().trim().max(50).optional(),
  email: z.string().email('Correo inválido').optional(),
  monedaFuncional: zMoneda.default('VES'),
  monedaReferencia: zMoneda.default('USD'),
  alicuotaIVA: zPorcentaje.default('16'),
  decimalesRedondeo: z.number().int().min(0).max(6).default(2),
  modoRedondeo: z.enum(['HALF_UP', 'HALF_EVEN', 'UP', 'DOWN']).default('HALF_UP'),
  incrementoRedondeo: zDecimal({ min: '0' }).default('0'),
})

export const esquemaEditarOrganizacion = esquemaCrearOrganizacion.partial().omit({ rif: true })

export const esquemaSucursal = z.object({
  codigo: z.string().trim().min(1).max(20).toUpperCase(),
  nombre: zNombre,
  direccion: z.string().trim().max(500).optional(),
  telefono: z.string().trim().max(50).optional(),
  centroCosto: z.string().trim().max(50).optional(),
  esPrincipal: z.boolean().default(false),
})

export const TIPOS_ALMACEN = ['VENTA', 'DEPOSITO', 'COCINA', 'MERMA', 'TRANSITO'] as const

export const esquemaAlmacen = z.object({
  sucursalId: zId,
  codigo: z.string().trim().min(1).max(20).toUpperCase(),
  nombre: zNombre,
  tipo: z.enum(TIPOS_ALMACEN).default('VENTA'),
  esPredeterminado: z.boolean().default(false),
})

export const esquemaMembresia = z.object({
  email: z.string().email('Correo inválido'),
  nombre: zNombre.optional(),
  rol: z.enum(ROLES),
  /** Vacío = acceso a todas las sucursales. */
  sucursalIds: z.array(zId).default([]),
})

// ───────────────────────────────────────────────────────────────────────
//  CATÁLOGO
// ───────────────────────────────────────────────────────────────────────

export const esquemaCategoria = z.object({
  nombre: zNombre,
  padreId: zId.optional().nullable(),
  orden: z.number().int().min(0).default(0),
})

export const TIPOS_UNIDAD = ['UNIDAD', 'PESO', 'VOLUMEN', 'LONGITUD'] as const

export const esquemaUnidadMedida = z
  .object({
    codigo: z.string().trim().min(1).max(10).toUpperCase(),
    nombre: zNombre,
    tipo: z.enum(TIPOS_UNIDAD).default('UNIDAD'),
    unidadBaseId: zId.optional().nullable(),
    factorBase: zDecimal({ min: '0' }).default('1'),
    decimales: z.number().int().min(0).max(6).default(0),
  })
  .refine((u) => Number(u.factorBase) > 0, {
    message: 'El factor de conversión debe ser mayor que cero',
    path: ['factorBase'],
  })
  .refine((u) => u.unidadBaseId !== undefined && u.unidadBaseId !== null ? true : Number(u.factorBase) === 1, {
    message: 'Una unidad base debe tener factor 1',
    path: ['factorBase'],
  })

export const TIPOS_PRODUCTO = ['PRODUCTO', 'SERVICIO', 'COMBO', 'INSUMO'] as const

export const esquemaVarianteEntrada = z.object({
  sku: z.string().trim().min(1).max(60).optional(),
  codigoBarras: z.string().trim().max(60).optional().nullable(),
  /** Valores de atributo que definen la combinación (talla, color…). */
  atributoValorIds: z.array(zId).default([]),
})

export const esquemaProducto = z
  .object({
    nombre: zNombre,
    descripcion: z.string().trim().max(1000).optional().nullable(),
    tipo: z.enum(TIPOS_PRODUCTO).default('PRODUCTO'),
    sku: z.string().trim().min(1).max(60),
    codigoProveedor: z.string().trim().max(60).optional().nullable(),
    categoriaId: zId.optional().nullable(),
    unidadVentaId: zId,
    unidadCompraId: zId.optional().nullable(),
    impuestoId: zId.optional().nullable(),
    controlaStock: z.boolean().default(true),
    manejaLotes: z.boolean().default(false),
    stockMinimo: zDecimal({ min: '0' }).default('0'),
    puntoReorden: zDecimal({ min: '0' }).default('0'),
    temporadaId: zId.optional().nullable(),
    cuentaInventarioId: zId.optional().nullable(),
    imagenUrl: z.string().url('URL inválida').optional().nullable(),
    /**
     * Variantes. Si viene vacío se crea una variante predeterminada, porque
     * el stock SIEMPRE vive en una variante (un solo camino de descuento).
     */
    variantes: z.array(esquemaVarianteEntrada).default([]),
  })
  .refine((p) => (p.tipo === 'SERVICIO' ? !p.controlaStock : true), {
    message: 'Un servicio no puede controlar existencias',
    path: ['controlaStock'],
  })

export const esquemaEditarProducto = esquemaProducto.partial()

export const TIPOS_LISTA_PRECIO = ['DETAL', 'MAYOR', 'DELIVERY', 'ESPECIAL'] as const

export const esquemaListaPrecio = z.object({
  nombre: zNombre,
  tipo: z.enum(TIPOS_LISTA_PRECIO).default('DETAL'),
  moneda: zMoneda.default('VES'),
  esPredeterminada: z.boolean().default(false),
})

export const esquemaPrecio = z
  .object({
    listaPrecioId: zId,
    varianteId: zId,
    monto: zDecimal({ min: '0' }),
    moneda: zMoneda.default('VES'),
    cantidadMinima: zCantidadPositiva.default('1'),
    vigenciaDesde: zFecha.optional(),
    vigenciaHasta: zFecha.optional().nullable(),
  })
  .refine((p) => !p.vigenciaHasta || !p.vigenciaDesde || p.vigenciaHasta > p.vigenciaDesde, {
    message: 'La vigencia debe terminar después de empezar',
    path: ['vigenciaHasta'],
  })

export const CLASIFICACIONES_IMPUESTO = [
  'GENERAL', 'REDUCIDA', 'ADICIONAL', 'EXENTA', 'NO_GRAVADA', 'EXONERADA',
] as const

export const esquemaImpuesto = z.object({
  nombre: zNombre,
  tipo: z.enum(['IVA', 'IGTF', 'OTRO']).default('IVA'),
  clasificacion: z.enum(CLASIFICACIONES_IMPUESTO).default('GENERAL'),
  tasa: zPorcentaje.default('0'),
  incluidoEnPrecio: z.boolean().default(false),
  esPredeterminado: z.boolean().default(false),
})

export const esquemaAtributo = z.object({
  nombre: zNombre,
  orden: z.number().int().min(0).default(0),
  valores: z
    .array(z.object({ valor: z.string().trim().min(1).max(60), orden: z.number().int().min(0).default(0) }))
    .default([]),
})

// ───────────────────────────────────────────────────────────────────────
//  INVENTARIO
// ───────────────────────────────────────────────────────────────────────

export const TIPOS_MOVIMIENTO_MANUAL = [
  'SALDO_INICIAL', 'AJUSTE_CONTEO', 'MERMA', 'CONSUMO_INTERNO', 'ENTRADA_COMPRA',
] as const

export const esquemaMovimientoInventario = z
  .object({
    varianteId: zId,
    almacenId: zId,
    tipo: z.enum(TIPOS_MOVIMIENTO_MANUAL),
    cantidad: zDecimal({ permiteNegativo: true }).refine((v) => Number(v) !== 0, {
      message: 'La cantidad no puede ser cero',
    }),
    costoUnitario: zDecimal({ min: '0' }).optional(),
    loteId: zId.optional().nullable(),
    // Motivo obligatorio en los movimientos que no vienen de un documento:
    // un ajuste sin explicación es un descuadre con permiso.
    motivo: z.string().trim().min(3, 'Explica el motivo del movimiento').max(500),
  })
  .refine((m) => (['SALDO_INICIAL', 'ENTRADA_COMPRA'].includes(m.tipo) ? m.costoUnitario !== undefined : true), {
    message: 'Una entrada requiere costo unitario',
    path: ['costoUnitario'],
  })

export const esquemaTasaCambio = z.object({
  fecha: zFecha,
  monedaRef: zMoneda.default('USD'),
  tasa: zTasa,
  fuente: z.string().trim().max(50).default('BCV'),
})

// ───────────────────────────────────────────────────────────────────────
//  TIPOS INFERIDOS
// ───────────────────────────────────────────────────────────────────────

export type CrearOrganizacion = z.infer<typeof esquemaCrearOrganizacion>
export type EditarOrganizacion = z.infer<typeof esquemaEditarOrganizacion>
export type EntradaSucursal = z.infer<typeof esquemaSucursal>
export type EntradaAlmacen = z.infer<typeof esquemaAlmacen>
export type EntradaMembresia = z.infer<typeof esquemaMembresia>
export type EntradaCategoria = z.infer<typeof esquemaCategoria>
export type EntradaUnidadMedida = z.infer<typeof esquemaUnidadMedida>
export type EntradaProducto = z.infer<typeof esquemaProducto>
export type EditarProducto = z.infer<typeof esquemaEditarProducto>
export type EntradaListaPrecio = z.infer<typeof esquemaListaPrecio>
export type EntradaPrecio = z.infer<typeof esquemaPrecio>
export type EntradaImpuesto = z.infer<typeof esquemaImpuesto>
export type EntradaAtributo = z.infer<typeof esquemaAtributo>
export type EntradaMovimientoManual = z.infer<typeof esquemaMovimientoInventario>
export type EntradaTasaCambio = z.infer<typeof esquemaTasaCambio>
