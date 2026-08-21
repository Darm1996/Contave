// ═══════════════════════════════════════════════════════════════════════
//  Permisos por rol, validados en el servidor
// ═══════════════════════════════════════════════════════════════════════
//
// Regla del proyecto: los permisos se validan en el SERVIDOR, no solo en la
// interfaz. Ocultar un botón no es seguridad — quien conozca la ruta de la
// API la llama igual.
//
// Este módulo resuelve dos problemas distintos que suelen confundirse:
//
//   1. ¿Puede este usuario EJECUTAR esta acción?  →  `exigirPermiso()`
//   2. ¿Puede este usuario VER este dato?          →  `filtrarCostos()`
//
// El segundo es el que casi siempre se olvida. Un cajero necesita listar
// productos para vender, así que darle permiso de lectura es inevitable;
// pero la misma respuesta que le dice el precio no debe decirle el costo ni
// el margen. Por eso toda respuesta que contenga costos pasa por un
// serializador que borra esos campos según el rol. Es la única forma de
// cumplir el criterio "un cajero no puede ver costos por ninguna vía,
// incluida la API".

import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// ───────────────────────────────────────────────────────────────────────
//  CATÁLOGO DE PERMISOS
// ───────────────────────────────────────────────────────────────────────

/**
 * Permisos con forma "modulo.accion". Es la lista completa y cerrada: un
 * permiso que no esté aquí no existe, así que no se puede otorgar por error
 * de tipeo.
 */
export const PERMISOS = {
  // Organización y estructura
  'organizacion.ver': 'Ver los datos del negocio',
  'organizacion.editar': 'Editar los datos del negocio',
  'sucursal.ver': 'Ver sucursales',
  'sucursal.gestionar': 'Crear y editar sucursales',
  'almacen.ver': 'Ver almacenes',
  'almacen.gestionar': 'Crear y editar almacenes',
  'usuario.ver': 'Ver el equipo',
  'usuario.gestionar': 'Invitar usuarios y cambiar sus roles',

  // Catálogo
  'producto.ver': 'Ver el catálogo de productos',
  'producto.crear': 'Crear productos',
  'producto.editar': 'Editar productos',
  'producto.anular': 'Desactivar productos',
  // Permiso separado del resto a propósito: es el que distingue a quien
  // vende de quien administra el negocio.
  'producto.ver_costo': 'Ver costos y márgenes de los productos',
  'precio.ver': 'Ver listas de precios',
  'precio.gestionar': 'Definir y cambiar precios',

  // Inventario
  'inventario.ver': 'Ver existencias',
  'inventario.mover': 'Registrar entradas, salidas y traslados',
  'inventario.ajustar': 'Ajustar existencias por conteo o merma',
  'inventario.ver_valorizacion': 'Ver la valorización del inventario',

  // Compras
  'compra.ver': 'Ver compras',
  'compra.crear': 'Registrar compras y recepciones',
  'compra.anular': 'Anular compras',
  'proveedor.ver': 'Ver proveedores',
  'proveedor.gestionar': 'Crear y editar proveedores',

  // Ventas
  'venta.ver': 'Ver ventas',
  'venta.crear': 'Vender',
  'venta.anular': 'Anular ventas',
  'venta.autorizar_descuento': 'Autorizar descuentos por encima del límite',
  'venta.vender_a_credito': 'Vender a crédito',
  'cliente.ver': 'Ver clientes',
  'cliente.gestionar': 'Crear y editar clientes',

  // Caja
  'caja.abrir': 'Abrir turno de caja',
  'caja.cerrar': 'Cerrar turno y hacer arqueo',
  'caja.ver_todas': 'Ver los turnos de otros usuarios',
  'caja.movimiento': 'Registrar ingresos y egresos de caja',

  // Dinero
  'gasto.ver': 'Ver gastos',
  'gasto.crear': 'Registrar gastos',
  'gasto.anular': 'Anular gastos',
  'banco.ver': 'Ver cuentas bancarias',
  'banco.gestionar': 'Registrar movimientos bancarios',
  'cxc.ver': 'Ver cuentas por cobrar',
  'cxp.ver': 'Ver cuentas por pagar',

  // Reportes e inteligencia de negocio
  'reporte.ventas': 'Ver reportes de ventas',
  'reporte.rentabilidad': 'Ver rentabilidad y márgenes',
  'reporte.exportar': 'Exportar reportes a Excel y PDF',

  // Fiscal: libros de compras y ventas derivados de los documentos del
  // sistema. No hay contabilidad de partida doble en este producto.
  'fiscal.libros': 'Ver y exportar los libros de compras y ventas',

  // Personal
  'personal.ver': 'Ver empleados',
  'personal.gestionar': 'Crear empleados, comisiones y adelantos',

  // Auditoría
  'auditoria.ver': 'Ver la bitácora de auditoría',
} as const

export type Permiso = keyof typeof PERMISOS

export const TODOS_LOS_PERMISOS = Object.keys(PERMISOS) as Permiso[]

// ───────────────────────────────────────────────────────────────────────
//  ROLES DEL SISTEMA
// ───────────────────────────────────────────────────────────────────────

export const ROLES = ['PROPIETARIO', 'ADMINISTRADOR', 'SUPERVISOR', 'CAJERO', 'ALMACENISTA', 'CONTADOR'] as const
export type Rol = (typeof ROLES)[number]

/**
 * Permisos por rol. Está escrito de forma explícita y no por herencia entre
 * roles porque los permisos sensibles (ver costos, autorizar descuentos,
 * anular) no siguen la misma escalera que los operativos: un almacenista ve
 * costos y no puede vender; un cajero vende y no ve costos.
 */
export const PERMISOS_POR_ROL: Record<Rol, readonly Permiso[]> = {
  // El dueño ve todo, incluido el dinero y la auditoría.
  PROPIETARIO: TODOS_LOS_PERMISOS,

  ADMINISTRADOR: [
    'organizacion.ver', 'organizacion.editar',
    'sucursal.ver', 'sucursal.gestionar',
    'almacen.ver', 'almacen.gestionar',
    'usuario.ver', 'usuario.gestionar',
    'producto.ver', 'producto.crear', 'producto.editar', 'producto.anular', 'producto.ver_costo',
    'precio.ver', 'precio.gestionar',
    'inventario.ver', 'inventario.mover', 'inventario.ajustar', 'inventario.ver_valorizacion',
    'compra.ver', 'compra.crear', 'compra.anular',
    'proveedor.ver', 'proveedor.gestionar',
    'venta.ver', 'venta.crear', 'venta.anular', 'venta.autorizar_descuento', 'venta.vender_a_credito',
    'cliente.ver', 'cliente.gestionar',
    'caja.abrir', 'caja.cerrar', 'caja.ver_todas', 'caja.movimiento',
    'gasto.ver', 'gasto.crear', 'gasto.anular',
    'banco.ver', 'banco.gestionar',
    'cxc.ver', 'cxp.ver',
    'reporte.ventas', 'reporte.rentabilidad', 'reporte.exportar',
    'fiscal.libros',
    'personal.ver', 'personal.gestionar',
    'auditoria.ver',
  ],

  // Jefe de turno: autoriza descuentos y anula, ve costos para decidir, pero
  // no administra el negocio ni toca la contabilidad.
  SUPERVISOR: [
    'organizacion.ver', 'sucursal.ver', 'almacen.ver', 'usuario.ver',
    'producto.ver', 'producto.crear', 'producto.editar', 'producto.ver_costo',
    'precio.ver',
    'inventario.ver', 'inventario.mover', 'inventario.ajustar', 'inventario.ver_valorizacion',
    'compra.ver', 'compra.crear',
    'proveedor.ver',
    'venta.ver', 'venta.crear', 'venta.anular', 'venta.autorizar_descuento', 'venta.vender_a_credito',
    'cliente.ver', 'cliente.gestionar',
    'caja.abrir', 'caja.cerrar', 'caja.ver_todas', 'caja.movimiento',
    'gasto.ver', 'gasto.crear',
    'cxc.ver',
    'reporte.ventas', 'reporte.rentabilidad', 'reporte.exportar',
    'personal.ver',
  ],

  // Vende y cobra. Sin 'producto.ver_costo', sin 'reporte.rentabilidad', sin
  // 'inventario.ver_valorizacion': no puede conocer el costo por ninguna vía.
  // Tampoco anula ni autoriza descuentos: eso lo pide al supervisor.
  CAJERO: [
    'producto.ver',
    'precio.ver',
    'inventario.ver',
    'venta.ver', 'venta.crear',
    'cliente.ver', 'cliente.gestionar',
    'caja.abrir', 'caja.cerrar',
  ],

  // Mueve mercancía y sí ve costos (los necesita para recibir compras), pero
  // no vende ni cobra.
  ALMACENISTA: [
    'producto.ver', 'producto.crear', 'producto.editar', 'producto.ver_costo',
    'almacen.ver',
    'inventario.ver', 'inventario.mover', 'inventario.ajustar', 'inventario.ver_valorizacion',
    'compra.ver', 'compra.crear',
    'proveedor.ver',
  ],

  // Solo lectura y exportación, como pide el requisito. Ve todo el dinero
  // porque lo necesita para declarar, y no puede modificar nada operativo.
  CONTADOR: [
    'organizacion.ver', 'sucursal.ver', 'almacen.ver',
    'producto.ver', 'producto.ver_costo',
    'precio.ver',
    'inventario.ver', 'inventario.ver_valorizacion',
    'compra.ver', 'proveedor.ver',
    'venta.ver', 'cliente.ver',
    'caja.ver_todas',
    'gasto.ver', 'banco.ver', 'cxc.ver', 'cxp.ver',
    'reporte.ventas', 'reporte.rentabilidad', 'reporte.exportar',
    'fiscal.libros',
    'personal.ver',
    'auditoria.ver',
  ],
}

export function permisosDeRol(rol: string): readonly Permiso[] {
  return PERMISOS_POR_ROL[rol as Rol] ?? []
}

export function rolTienePermiso(rol: string, permiso: Permiso): boolean {
  return permisosDeRol(rol).includes(permiso)
}

// ───────────────────────────────────────────────────────────────────────
//  CONTEXTO DE LA PETICIÓN
// ───────────────────────────────────────────────────────────────────────

export class ErrorPermiso extends Error {
  readonly status = 403
  constructor(mensaje: string) {
    super(mensaje)
    this.name = 'ErrorPermiso'
  }
}

export class ErrorAutenticacion extends Error {
  readonly status = 401
  constructor(mensaje = 'No autenticado') {
    super(mensaje)
    this.name = 'ErrorAutenticacion'
  }
}

export interface ContextoOperacion {
  usuarioId: string
  email: string
  nombre: string
  organizacionId: string
  rol: Rol
  permisos: readonly Permiso[]
  /** Sucursales a las que está limitado. Vacío = todas. */
  sucursalesPermitidas: string[]
  puede(permiso: Permiso): boolean
}

/**
 * Resuelve el contexto de la petición: usuario, organización activa y rol
 * efectivo. Es el único punto de entrada de cualquier ruta del módulo
 * operativo, para que no exista un camino que se olvide de comprobar.
 */
export async function obtenerContexto(organizacionId?: string): Promise<ContextoOperacion> {
  const usuario = await requireAuth().catch(() => null)
  if (!usuario) throw new ErrorAutenticacion()

  const membresia = await db.membresia.findFirst({
    where: {
      userId: usuario.id,
      activo: true,
      deletedAt: null,
      ...(organizacionId ? { organizacionId } : {}),
    },
    include: {
      rol: true,
      organizacion: { select: { id: true, activo: true } },
      sucursales: { select: { sucursalId: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  if (!membresia) {
    throw new ErrorPermiso('No tienes acceso a este negocio')
  }
  if (!membresia.organizacion.activo) {
    throw new ErrorPermiso('Este negocio está desactivado')
  }

  const rol = membresia.rol.clave as Rol
  const permisos = permisosDeRol(rol)

  return {
    usuarioId: usuario.id,
    email: usuario.email,
    nombre: usuario.name,
    organizacionId: membresia.organizacionId,
    rol,
    permisos,
    sucursalesPermitidas: membresia.sucursales.map((s) => s.sucursalId),
    puede: (permiso: Permiso) => permisos.includes(permiso),
  }
}

/**
 * Exige uno o más permisos. Lanza ErrorPermiso si falta alguno.
 * Se llama al principio de cada ruta, antes de leer el cuerpo de la
 * petición.
 */
export async function exigirPermiso(
  permiso: Permiso | Permiso[],
  organizacionId?: string,
): Promise<ContextoOperacion> {
  const ctx = await obtenerContexto(organizacionId)
  const requeridos = Array.isArray(permiso) ? permiso : [permiso]
  const faltantes = requeridos.filter((p) => !ctx.puede(p))

  if (faltantes.length > 0) {
    throw new ErrorPermiso(
      `Tu rol (${ctx.rol}) no permite: ${faltantes.map((p) => PERMISOS[p]).join(', ')}`,
    )
  }
  return ctx
}

/**
 * Comprueba un permiso sobre un contexto YA resuelto, sin ir a la base de
 * datos.
 *
 * Existe para que los motores de dominio (ventas, caja, inventario) validen
 * por sí mismos y no dependan de que la ruta se haya acordado de hacerlo. La
 * regla del proyecto es que los permisos se validan en el servidor, y "en el
 * servidor" no puede significar "en la capa de rutas": cualquier otro llamador
 * —un script de mantenimiento, una tarea programada, una ruta nueva— entraría
 * por detrás. El motor es el último punto donde la operación todavía se puede
 * negar.
 */
export function exigirEnContexto(ctx: ContextoOperacion, permiso: Permiso | Permiso[]): void {
  const requeridos = Array.isArray(permiso) ? permiso : [permiso]
  const faltantes = requeridos.filter((p) => !ctx.puede(p))
  if (faltantes.length > 0) {
    throw new ErrorPermiso(`Tu rol (${ctx.rol}) no permite: ${faltantes.map((p) => PERMISOS[p]).join(', ')}`)
  }
}

/** Verifica que el usuario pueda operar en la sucursal indicada. */
export function exigirSucursal(ctx: ContextoOperacion, sucursalId: string): void {
  if (ctx.sucursalesPermitidas.length === 0) return
  if (!ctx.sucursalesPermitidas.includes(sucursalId)) {
    throw new ErrorPermiso('No tienes acceso a esta sucursal')
  }
}

// ───────────────────────────────────────────────────────────────────────
//  FILTRADO DE DATOS SENSIBLES
// ───────────────────────────────────────────────────────────────────────

/**
 * Campos que revelan costo o margen. Cualquier respuesta de la API que pueda
 * contenerlos se pasa por `filtrarCostos()`.
 *
 * La lista está aquí, en un solo lugar, para que añadir un campo de costo
 * nuevo al esquema signifique añadirlo aquí y no revisar 74 rutas.
 */
export const CAMPOS_DE_COSTO = [
  'costo',
  'costoPromedio',
  'costoPromedioActual',
  'costoPromedioSaldo',
  'costoUnitario',
  'costoUnitarioFinal',
  'costoTotal',
  'ultimoCosto',
  'margen',
  'margenBruto',
  'margenPorcentaje',
  'utilidad',
  'valorizacion',
  'valorInventario',
  'rentabilidad',
] as const

type Json = string | number | boolean | null | undefined | Json[] | { [clave: string]: Json }

/**
 * Elimina recursivamente los campos de costo y margen de una respuesta
 * cuando el rol no tiene 'producto.ver_costo'.
 *
 * Recursivo a propósito: los costos aparecen anidados (un producto trae sus
 * existencias, que traen su costo promedio) y filtrar solo el primer nivel
 * dejaría el dato expuesto un nivel más abajo, que es exactamente el tipo de
 * fuga que este criterio de aceptación busca evitar.
 */
export function filtrarCostos<T>(datos: T, ctx: ContextoOperacion): T {
  if (ctx.puede('producto.ver_costo')) return datos
  return limpiar(datos as Json) as T
}

function limpiar(valor: Json): Json {
  if (Array.isArray(valor)) return valor.map((v) => limpiar(v))
  if (valor === null || typeof valor !== 'object') return valor

  const salida: { [clave: string]: Json } = {}
  for (const [clave, v] of Object.entries(valor)) {
    if ((CAMPOS_DE_COSTO as readonly string[]).includes(clave)) continue
    salida[clave] = limpiar(v as Json)
  }
  return salida
}

/**
 * Selector de Prisma que excluye los costos a nivel de CONSULTA cuando el
 * rol no puede verlos. Es la segunda barrera: `filtrarCostos` limpia la
 * respuesta, y esto evita que el dato salga de la base de datos siquiera.
 * Dos barreras porque un solo olvido en cualquiera de las dos es una fuga.
 */
export function seleccionExistencia(ctx: ContextoOperacion) {
  const base = {
    id: true,
    varianteId: true,
    almacenId: true,
    cantidad: true,
    cantidadReservada: true,
  } as const

  if (!ctx.puede('producto.ver_costo')) return base
  return { ...base, costoPromedio: true, ultimoCosto: true }
}
