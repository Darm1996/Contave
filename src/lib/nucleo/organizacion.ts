// ═══════════════════════════════════════════════════════════════════════
//  Organizaciones, sucursales, almacenes, roles y equipo
// ═══════════════════════════════════════════════════════════════════════

import type { Prisma as PrismaTypes } from '@prisma/client'
import { db } from '@/lib/db'
import {
  PERMISOS_POR_ROL,
  ROLES,
  TODOS_LOS_PERMISOS,
  PERMISOS,
  type Rol,
  type ContextoOperacion,
} from './permisos'
import { ErrorNegocio, ErrorNoEncontrado } from './respuesta'
import type {
  CrearOrganizacion,
  EditarOrganizacion,
  EntradaAlmacen,
  EntradaMembresia,
  EntradaSucursal,
} from './esquemas'

/** Nombres legibles de los roles del sistema, para mostrar en la interfaz. */
export const NOMBRES_ROL: Record<Rol, string> = {
  PROPIETARIO: 'Propietario',
  ADMINISTRADOR: 'Administrador',
  SUPERVISOR: 'Supervisor',
  CAJERO: 'Cajero',
  ALMACENISTA: 'Almacenista',
  CONTADOR: 'Contador',
}

/**
 * Siembra el catálogo global de permisos. Es idempotente, así que se puede
 * llamar en cada despliegue: añade los permisos nuevos sin tocar los roles
 * que ya los tenían asignados.
 */
export async function sembrarCatalogoPermisos(): Promise<void> {
  for (const clave of TODOS_LOS_PERMISOS) {
    const [modulo, accion] = clave.split('.')
    await db.permiso.upsert({
      where: { clave },
      create: { clave, modulo, accion, descripcion: PERMISOS[clave] },
      update: { modulo, accion, descripcion: PERMISOS[clave] },
    })
  }
}

/** Crea los seis roles del sistema con sus permisos para una organización. */
async function crearRolesDelSistema(tx: PrismaTypes.TransactionClient, organizacionId: string): Promise<Map<Rol, string>> {
  const mapa = new Map<Rol, string>()
  for (const clave of ROLES) {
    const rol = await tx.rol.create({
      data: {
        organizacionId,
        clave,
        nombre: NOMBRES_ROL[clave],
        esSistema: true,
        permisos: {
          create: PERMISOS_POR_ROL[clave].map((permisoClave) => ({ permisoClave })),
        },
      },
    })
    mapa.set(clave, rol.id)
  }
  return mapa
}

/**
 * Unidades de medida básicas que todo negocio necesita, con su conversión.
 * Se crean al abrir la organización para que nadie tenga que configurar
 * "unidad" antes de poder cargar su primer producto.
 */
const UNIDADES_BASE = [
  { codigo: 'UND', nombre: 'Unidad', tipo: 'UNIDAD', decimales: 0, esBase: true },
  { codigo: 'G', nombre: 'Gramo', tipo: 'PESO', decimales: 3, esBase: true },
  { codigo: 'ML', nombre: 'Mililitro', tipo: 'VOLUMEN', decimales: 3, esBase: true },
] as const

const UNIDADES_DERIVADAS = [
  { codigo: 'KG', nombre: 'Kilogramo', tipo: 'PESO', base: 'G', factor: '1000', decimales: 3 },
  { codigo: 'L', nombre: 'Litro', tipo: 'VOLUMEN', base: 'ML', factor: '1000', decimales: 3 },
  // Caja de 12 y de 24: el caso del quiosco que compra por caja y vende por
  // unidad. El fraccionamiento sale de este factor, no de un número suelto.
  { codigo: 'CAJA12', nombre: 'Caja de 12', tipo: 'UNIDAD', base: 'UND', factor: '12', decimales: 0 },
  { codigo: 'CAJA24', nombre: 'Caja de 24', tipo: 'UNIDAD', base: 'UND', factor: '24', decimales: 0 },
  { codigo: 'DOC', nombre: 'Docena', tipo: 'UNIDAD', base: 'UND', factor: '12', decimales: 0 },
] as const

async function crearConfiguracionInicial(
  tx: PrismaTypes.TransactionClient,
  organizacionId: string,
  datos: CrearOrganizacion,
): Promise<void> {
  // Unidades de medida
  const basePorCodigo = new Map<string, string>()
  for (const u of UNIDADES_BASE) {
    const creada = await tx.unidadMedida.create({
      data: {
        organizacionId,
        codigo: u.codigo,
        nombre: u.nombre,
        tipo: u.tipo,
        factorBase: '1',
        decimales: u.decimales,
      },
    })
    basePorCodigo.set(u.codigo, creada.id)
  }
  for (const u of UNIDADES_DERIVADAS) {
    await tx.unidadMedida.create({
      data: {
        organizacionId,
        codigo: u.codigo,
        nombre: u.nombre,
        tipo: u.tipo,
        unidadBaseId: basePorCodigo.get(u.base),
        factorBase: u.factor,
        decimales: u.decimales,
      },
    })
  }

  // Impuestos: la alícuota general del país y las clasificaciones que exige
  // el libro de ventas.
  await tx.impuesto.createMany({
    data: [
      {
        organizacionId,
        nombre: `IVA ${datos.alicuotaIVA}%`,
        tipo: 'IVA',
        clasificacion: 'GENERAL',
        tasa: datos.alicuotaIVA,
        esPredeterminado: true,
      },
      { organizacionId, nombre: 'Exento de IVA', tipo: 'IVA', clasificacion: 'EXENTA', tasa: '0' },
      { organizacionId, nombre: 'No gravado', tipo: 'IVA', clasificacion: 'NO_GRAVADA', tasa: '0' },
      { organizacionId, nombre: 'IGTF 3%', tipo: 'IGTF', clasificacion: 'ADICIONAL', tasa: '3' },
    ],
  })

  // Lista de precios al detal, la que usa el POS por defecto.
  await tx.listaPrecio.create({
    data: {
      organizacionId,
      nombre: 'Detal',
      tipo: 'DETAL',
      moneda: datos.monedaFuncional,
      esPredeterminada: true,
    },
  })

  // Métodos de cobro típicos del mercado venezolano.
  await tx.metodoPago.createMany({
    data: [
      { organizacionId, codigo: 'EFEC-BS', nombre: 'Efectivo Bs', tipo: 'EFECTIVO', moneda: 'VES', afectaCajaFisica: true, orden: 1 },
      { organizacionId, codigo: 'EFEC-USD', nombre: 'Efectivo USD', tipo: 'DIVISA', moneda: 'USD', afectaCajaFisica: true, causaIGTF: true, orden: 2 },
      { organizacionId, codigo: 'PM', nombre: 'Pago móvil', tipo: 'PAGO_MOVIL', moneda: 'VES', afectaCajaFisica: false, requiereReferencia: true, orden: 3 },
      { organizacionId, codigo: 'PDV', nombre: 'Punto de venta', tipo: 'TARJETA', moneda: 'VES', afectaCajaFisica: false, requiereReferencia: true, orden: 4 },
      { organizacionId, codigo: 'TRANSF', nombre: 'Transferencia', tipo: 'TRANSFERENCIA', moneda: 'VES', afectaCajaFisica: false, requiereReferencia: true, orden: 5 },
      { organizacionId, codigo: 'ZELLE', nombre: 'Zelle', tipo: 'DIVISA', moneda: 'USD', afectaCajaFisica: false, causaIGTF: true, requiereReferencia: true, orden: 6 },
    ],
  })

  // Categorías de gasto con su destino contable. Las de destino ACTIVO están
  // aquí a propósito: existen para que el sistema pueda RECHAZAR el intento
  // de registrar mercancía como gasto y explicar dónde va.
  await tx.categoriaGasto.createMany({
    data: [
      { organizacionId, nombre: 'Alquiler', destino: 'GASTO', naturaleza: 'FIJO', clasificacion: 'OPERATIVO' },
      { organizacionId, nombre: 'Nómina', destino: 'GASTO', naturaleza: 'FIJO', clasificacion: 'OPERATIVO' },
      { organizacionId, nombre: 'Servicios', destino: 'GASTO', naturaleza: 'VARIABLE', clasificacion: 'OPERATIVO' },
      { organizacionId, nombre: 'Mantenimiento', destino: 'GASTO', naturaleza: 'VARIABLE', clasificacion: 'OPERATIVO' },
      { organizacionId, nombre: 'Publicidad', destino: 'GASTO', naturaleza: 'VARIABLE', clasificacion: 'OPERATIVO' },
      { organizacionId, nombre: 'Impuestos', destino: 'GASTO', naturaleza: 'VARIABLE', clasificacion: 'NO_OPERATIVO' },
      { organizacionId, nombre: 'Financieros', destino: 'GASTO', naturaleza: 'VARIABLE', clasificacion: 'NO_OPERATIVO' },
      { organizacionId, nombre: 'Otros', destino: 'GASTO', naturaleza: 'VARIABLE', clasificacion: 'OPERATIVO' },
      { organizacionId, nombre: 'Compra de mercancía', destino: 'ACTIVO_INVENTARIO', naturaleza: 'VARIABLE', clasificacion: 'OPERATIVO' },
      { organizacionId, nombre: 'Compra de equipos', destino: 'ACTIVO_FIJO', naturaleza: 'VARIABLE', clasificacion: 'OPERATIVO' },
    ],
  })
}

// ───────────────────────────────────────────────────────────────────────
//  ORGANIZACIÓN
// ───────────────────────────────────────────────────────────────────────

/**
 * Crea una organización completa y operable en una sola transacción:
 * perfil fiscal, roles, sucursal y almacén principales, caja, unidades,
 * impuestos, lista de precios, métodos de cobro y categorías de gasto, más
 * la membresía del creador como PROPIETARIO.
 *
 * Se hace todo junto y no por pasos porque una organización a medio crear
 * (sin almacén, sin lista de precios) no puede vender nada, y el usuario no
 * tendría forma de saber qué le falta configurar.
 */
export async function crearOrganizacion(usuarioId: string, datos: CrearOrganizacion) {
  await sembrarCatalogoPermisos()

  return db.$transaction(async (tx) => {
    const rifNormalizado = datos.rif.replace(/-/g, '')

    const existente = await tx.empresa.findUnique({ where: { rif: rifNormalizado } })
    if (existente) {
      throw new ErrorNegocio(`Ya existe un negocio registrado con el RIF ${datos.rif}`, 409)
    }

    const empresa = await tx.empresa.create({
      data: {
        nombre: datos.nombre,
        rif: rifNormalizado,
        direccion: datos.direccion ?? null,
        telefono: datos.telefono ?? null,
        email: datos.email ?? null,
        alicuotaIVA: datos.alicuotaIVA,
        monedaFuncional: datos.monedaFuncional,
      },
    })

    const organizacion = await tx.organizacion.create({
      data: {
        nombre: datos.nombre,
        rubro: datos.rubro,
        empresaId: empresa.id,
        monedaFuncional: datos.monedaFuncional,
        monedaReferencia: datos.monedaReferencia,
        decimalesRedondeo: datos.decimalesRedondeo,
        modoRedondeo: datos.modoRedondeo,
        incrementoRedondeo: datos.incrementoRedondeo,
        createdBy: usuarioId,
      },
    })

    const roles = await crearRolesDelSistema(tx, organizacion.id)
    await crearConfiguracionInicial(tx, organizacion.id, datos)

    // Sucursal, almacén y caja principales.
    const sucursal = await tx.sucursal.create({
      data: {
        organizacionId: organizacion.id,
        codigo: 'PRIN',
        nombre: 'Principal',
        direccion: datos.direccion ?? null,
        esPrincipal: true,
        createdBy: usuarioId,
      },
    })

    await tx.almacen.create({
      data: {
        organizacionId: organizacion.id,
        sucursalId: sucursal.id,
        codigo: 'PRIN',
        nombre: 'Almacén principal',
        tipo: 'VENTA',
        esPredeterminado: true,
        createdBy: usuarioId,
      },
    })

    await tx.caja.create({
      data: {
        organizacionId: organizacion.id,
        sucursalId: sucursal.id,
        codigo: 'CAJA1',
        nombre: 'Caja 1',
        createdBy: usuarioId,
      },
    })

    // El creador es el propietario.
    const rolPropietario = roles.get('PROPIETARIO')
    if (!rolPropietario) throw new ErrorNegocio('No se pudo crear el rol de propietario')

    await tx.membresia.create({
      data: {
        organizacionId: organizacion.id,
        userId: usuarioId,
        rolId: rolPropietario,
        createdBy: usuarioId,
      },
    })

    // Se mantiene también la membresía contable heredada, para que el módulo
    // fiscal (que trabaja con UserEmpresa) reconozca al usuario.
    await tx.userEmpresa.create({
      data: { userId: usuarioId, empresaId: empresa.id, rol: 'ADMIN' },
    })

    return { organizacion, empresa, sucursal }
  })
}

export async function obtenerOrganizacion(ctx: ContextoOperacion) {
  const organizacion = await db.organizacion.findFirst({
    where: { id: ctx.organizacionId, deletedAt: null },
    include: {
      empresa: true,
      sucursales: { where: { deletedAt: null }, orderBy: { codigo: 'asc' } },
      _count: { select: { productos: true, membresias: true } },
    },
  })
  if (!organizacion) throw new ErrorNoEncontrado('El negocio no existe')
  return organizacion
}

export async function editarOrganizacion(ctx: ContextoOperacion, datos: EditarOrganizacion) {
  const organizacion = await db.organizacion.findFirst({ where: { id: ctx.organizacionId, deletedAt: null } })
  if (!organizacion) throw new ErrorNoEncontrado('El negocio no existe')

  return db.$transaction(async (tx) => {
    if (datos.nombre || datos.direccion || datos.telefono || datos.email || datos.alicuotaIVA) {
      await tx.empresa.update({
        where: { id: organizacion.empresaId },
        data: {
          ...(datos.nombre ? { nombre: datos.nombre } : {}),
          ...(datos.direccion !== undefined ? { direccion: datos.direccion } : {}),
          ...(datos.telefono !== undefined ? { telefono: datos.telefono } : {}),
          ...(datos.email !== undefined ? { email: datos.email } : {}),
          ...(datos.alicuotaIVA ? { alicuotaIVA: datos.alicuotaIVA } : {}),
        },
      })
    }

    return tx.organizacion.update({
      where: { id: organizacion.id },
      data: {
        ...(datos.nombre ? { nombre: datos.nombre } : {}),
        ...(datos.rubro ? { rubro: datos.rubro } : {}),
        ...(datos.monedaFuncional ? { monedaFuncional: datos.monedaFuncional } : {}),
        ...(datos.monedaReferencia ? { monedaReferencia: datos.monedaReferencia } : {}),
        ...(datos.decimalesRedondeo !== undefined ? { decimalesRedondeo: datos.decimalesRedondeo } : {}),
        ...(datos.modoRedondeo ? { modoRedondeo: datos.modoRedondeo } : {}),
        ...(datos.incrementoRedondeo !== undefined ? { incrementoRedondeo: datos.incrementoRedondeo } : {}),
      },
    })
  })
}

/** Criterio de redondeo configurado por la organización. */
export async function criterioRedondeoDe(organizacionId: string) {
  const org = await db.organizacion.findUniqueOrThrow({
    where: { id: organizacionId },
    select: { decimalesRedondeo: true, modoRedondeo: true, incrementoRedondeo: true },
  })
  return {
    decimales: org.decimalesRedondeo,
    modo: org.modoRedondeo as 'HALF_UP' | 'HALF_EVEN' | 'UP' | 'DOWN',
    incremento: org.incrementoRedondeo,
  }
}

// ───────────────────────────────────────────────────────────────────────
//  SUCURSALES
// ───────────────────────────────────────────────────────────────────────

export async function listarSucursales(ctx: ContextoOperacion) {
  return db.sucursal.findMany({
    where: {
      organizacionId: ctx.organizacionId,
      deletedAt: null,
      ...(ctx.sucursalesPermitidas.length > 0 ? { id: { in: ctx.sucursalesPermitidas } } : {}),
    },
    include: {
      almacenes: { where: { deletedAt: null }, orderBy: { codigo: 'asc' } },
      _count: { select: { cajas: true } },
    },
    orderBy: [{ esPrincipal: 'desc' }, { codigo: 'asc' }],
  })
}

export async function crearSucursal(ctx: ContextoOperacion, datos: EntradaSucursal) {
  return db.$transaction(async (tx) => {
    if (datos.esPrincipal) {
      await tx.sucursal.updateMany({
        where: { organizacionId: ctx.organizacionId, esPrincipal: true },
        data: { esPrincipal: false },
      })
    }

    const sucursal = await tx.sucursal.create({
      data: {
        organizacionId: ctx.organizacionId,
        codigo: datos.codigo,
        nombre: datos.nombre,
        direccion: datos.direccion ?? null,
        telefono: datos.telefono ?? null,
        centroCosto: datos.centroCosto ?? null,
        esPrincipal: datos.esPrincipal,
        createdBy: ctx.usuarioId,
      },
    })

    // Una sucursal sin almacén no puede recibir ni vender mercancía, así que
    // se le crea uno al nacer en vez de dejar al usuario descubrirlo cuando
    // intente su primera venta.
    await tx.almacen.create({
      data: {
        organizacionId: ctx.organizacionId,
        sucursalId: sucursal.id,
        codigo: `${datos.codigo}-ALM`,
        nombre: `Almacén ${datos.nombre}`,
        tipo: 'VENTA',
        esPredeterminado: true,
        createdBy: ctx.usuarioId,
      },
    })

    return sucursal
  })
}

export async function editarSucursal(ctx: ContextoOperacion, id: string, datos: Partial<EntradaSucursal>) {
  const sucursal = await db.sucursal.findFirst({
    where: { id, organizacionId: ctx.organizacionId, deletedAt: null },
  })
  if (!sucursal) throw new ErrorNoEncontrado('La sucursal no existe')

  return db.sucursal.update({
    where: { id },
    data: {
      ...(datos.codigo ? { codigo: datos.codigo } : {}),
      ...(datos.nombre ? { nombre: datos.nombre } : {}),
      ...(datos.direccion !== undefined ? { direccion: datos.direccion } : {}),
      ...(datos.telefono !== undefined ? { telefono: datos.telefono } : {}),
      ...(datos.centroCosto !== undefined ? { centroCosto: datos.centroCosto } : {}),
    },
  })
}

// ───────────────────────────────────────────────────────────────────────
//  ALMACENES
// ───────────────────────────────────────────────────────────────────────

export async function listarAlmacenes(ctx: ContextoOperacion, sucursalId?: string) {
  return db.almacen.findMany({
    where: {
      organizacionId: ctx.organizacionId,
      deletedAt: null,
      ...(sucursalId ? { sucursalId } : {}),
      ...(ctx.sucursalesPermitidas.length > 0 ? { sucursalId: { in: ctx.sucursalesPermitidas } } : {}),
    },
    include: { sucursal: { select: { nombre: true, codigo: true } } },
    orderBy: [{ esPredeterminado: 'desc' }, { codigo: 'asc' }],
  })
}

export async function crearAlmacen(ctx: ContextoOperacion, datos: EntradaAlmacen) {
  const sucursal = await db.sucursal.findFirst({
    where: { id: datos.sucursalId, organizacionId: ctx.organizacionId, deletedAt: null },
  })
  if (!sucursal) throw new ErrorNoEncontrado('La sucursal no existe')

  return db.$transaction(async (tx) => {
    if (datos.esPredeterminado) {
      await tx.almacen.updateMany({
        where: { organizacionId: ctx.organizacionId, sucursalId: datos.sucursalId, esPredeterminado: true },
        data: { esPredeterminado: false },
      })
    }

    return tx.almacen.create({
      data: {
        organizacionId: ctx.organizacionId,
        sucursalId: datos.sucursalId,
        codigo: datos.codigo,
        nombre: datos.nombre,
        tipo: datos.tipo,
        esPredeterminado: datos.esPredeterminado,
        createdBy: ctx.usuarioId,
      },
    })
  })
}

/**
 * Desactiva un almacén. Se niega si todavía tiene existencia: un almacén con
 * mercancía adentro que "desaparece" es inventario que se pierde de vista.
 * Primero hay que trasladar el stock.
 */
export async function desactivarAlmacen(ctx: ContextoOperacion, id: string) {
  const almacen = await db.almacen.findFirst({
    where: { id, organizacionId: ctx.organizacionId, deletedAt: null },
    include: { existencias: { where: { cantidad: { not: 0 } }, take: 1 } },
  })
  if (!almacen) throw new ErrorNoEncontrado('El almacén no existe')

  if (almacen.existencias.length > 0) {
    throw new ErrorNegocio(
      'Este almacén todavía tiene existencia. Traslada la mercancía a otro almacén antes de desactivarlo.',
    )
  }

  return db.almacen.update({ where: { id }, data: { activo: false, deletedAt: new Date() } })
}

// ───────────────────────────────────────────────────────────────────────
//  EQUIPO
// ───────────────────────────────────────────────────────────────────────

export async function listarEquipo(ctx: ContextoOperacion) {
  return db.membresia.findMany({
    where: { organizacionId: ctx.organizacionId, deletedAt: null },
    include: {
      user: { select: { id: true, name: true, email: true, activo: true } },
      rol: { select: { clave: true, nombre: true } },
      sucursales: { include: { sucursal: { select: { id: true, nombre: true } } } },
    },
    orderBy: { createdAt: 'asc' },
  })
}

/**
 * Asigna un usuario existente a la organización con un rol, o cambia su rol.
 * No crea usuarios: la invitación por correo es un flujo aparte.
 */
export async function asignarMiembro(ctx: ContextoOperacion, datos: EntradaMembresia) {
  const usuario = await db.user.findUnique({ where: { email: datos.email.toLowerCase() } })
  if (!usuario) {
    throw new ErrorNoEncontrado(`No hay ningún usuario registrado con el correo ${datos.email}`)
  }

  const rol = await db.rol.findUnique({
    where: { organizacionId_clave: { organizacionId: ctx.organizacionId, clave: datos.rol } },
  })
  if (!rol) throw new ErrorNoEncontrado(`El rol ${datos.rol} no existe en este negocio`)

  // Nadie puede quitarse a sí mismo el rol de propietario: dejaría el negocio
  // sin dueño y sin nadie que pueda volver a asignarlo.
  if (usuario.id === ctx.usuarioId && ctx.rol === 'PROPIETARIO' && datos.rol !== 'PROPIETARIO') {
    throw new ErrorNegocio(
      'No puedes quitarte el rol de propietario. Asigna primero otro propietario y pídele que cambie el tuyo.',
    )
  }

  return db.$transaction(async (tx) => {
    const membresia = await tx.membresia.upsert({
      where: { organizacionId_userId: { organizacionId: ctx.organizacionId, userId: usuario.id } },
      create: {
        organizacionId: ctx.organizacionId,
        userId: usuario.id,
        rolId: rol.id,
        createdBy: ctx.usuarioId,
      },
      update: { rolId: rol.id, activo: true, deletedAt: null },
    })

    await tx.membresiaSucursal.deleteMany({ where: { membresiaId: membresia.id } })
    if (datos.sucursalIds.length > 0) {
      await tx.membresiaSucursal.createMany({
        data: datos.sucursalIds.map((sucursalId) => ({ membresiaId: membresia.id, sucursalId })),
      })
    }

    return membresia
  })
}

export async function retirarMiembro(ctx: ContextoOperacion, userId: string) {
  if (userId === ctx.usuarioId) {
    throw new ErrorNegocio('No puedes retirarte a ti mismo del negocio')
  }

  const membresia = await db.membresia.findUnique({
    where: { organizacionId_userId: { organizacionId: ctx.organizacionId, userId } },
    include: { rol: true },
  })
  if (!membresia) throw new ErrorNoEncontrado('Esa persona no pertenece a este negocio')

  if (membresia.rol.clave === 'PROPIETARIO') {
    const propietarios = await db.membresia.count({
      where: { organizacionId: ctx.organizacionId, activo: true, deletedAt: null, rol: { clave: 'PROPIETARIO' } },
    })
    if (propietarios <= 1) {
      throw new ErrorNegocio('No puedes retirar al único propietario del negocio')
    }
  }

  return db.membresia.update({
    where: { id: membresia.id },
    data: { activo: false, deletedAt: new Date() },
  })
}
