// Fábrica de un quiosco operable para las pruebas.
//
// Crea un negocio real y completo (organización con su perfil fiscal, roles,
// sucursal, almacén, caja, unidades con conversión, impuestos, lista de
// precios y métodos de cobro) usando los MISMOS servicios de dominio que usa
// la aplicación. Así las pruebas ejercitan el camino real de creación y no una
// versión simplificada que podría divergir.

import { db } from '@/lib/db'
import { crearOrganizacion } from '@/lib/nucleo/organizacion'
import { crearProducto, fijarPrecio } from '@/lib/nucleo/catalogo'
import { registrarMovimiento } from '@/lib/nucleo/inventario'
import { permisosDeRol, type ContextoOperacion, type Rol } from '@/lib/nucleo/permisos'
import { hashPassword } from '@/lib/auth'

let contador = 0
const prefijo = Math.random().toString(36).slice(2, 8)

/** Contexto de operación sintético, sin pasar por cookies ni JWT. */
export function contextoDe(
  rol: Rol,
  datos: { usuarioId: string; email: string; organizacionId: string; empresaId: string; sucursalesPermitidas?: string[] },
): ContextoOperacion {
  const permisos = permisosDeRol(rol)
  return {
    usuarioId: datos.usuarioId,
    email: datos.email,
    nombre: 'Usuario de Prueba',
    organizacionId: datos.organizacionId,
    empresaId: datos.empresaId,
    rol,
    permisos,
    sucursalesPermitidas: datos.sucursalesPermitidas ?? [],
    puede: (p) => permisos.includes(p),
  }
}

export interface QuioscoDePrueba {
  organizacionId: string
  empresaId: string
  sucursalId: string
  almacenId: string
  cajaId: string
  listaPrecioId: string
  /** Método de cobro en efectivo Bs (entra a la gaveta). */
  metodoEfectivoId: string
  /** Efectivo en USD: entra a la gaveta y causa IGTF. */
  metodoDivisaId: string
  /** Pago móvil: no entra a la gaveta, se concilia con el banco. */
  metodoPagoMovilId: string
  productos: {
    /** Refresco 2L, IVA incluido en el precio (típico de quiosco). */
    refresco: { productoId: string; varianteId: string; codigoBarras: string; precio: string; costo: string }
    /** Caramelo: se compra por caja de 24 y se vende por unidad. */
    caramelo: { productoId: string; varianteId: string; codigoBarras: string; precio: string; costo: string }
    /** Pan: exento de IVA. */
    pan: { productoId: string; varianteId: string; codigoBarras: string; precio: string; costo: string }
  }
  propietario: ContextoOperacion
  cajero: ContextoOperacion
  supervisor: ContextoOperacion
}

/**
 * Monta un quiosco con tres productos, existencia inicial y tres usuarios con
 * roles distintos.
 */
export async function crearQuioscoDePrueba(): Promise<QuioscoDePrueba> {
  contador += 1
  const sufijo = `${prefijo}-${contador}`
  const passwordHash = await hashPassword('prueba-no-se-usa')

  const [duenio, cajero, supervisor] = await Promise.all([
    db.user.create({
      data: { email: `duenio-${sufijo}@quiosco.test`, name: 'Dueño', passwordHash, role: 'ADMIN' },
    }),
    db.user.create({
      data: { email: `cajero-${sufijo}@quiosco.test`, name: 'Cajero', passwordHash, role: 'AUXILIAR' },
    }),
    db.user.create({
      data: { email: `supervisor-${sufijo}@quiosco.test`, name: 'Supervisor', passwordHash, role: 'AUXILIAR' },
    }),
  ])

  const { organizacion, empresa, sucursal } = await crearOrganizacion(duenio.id, {
    nombre: `Quiosco de Prueba ${sufijo}`,
    rubro: 'QUIOSCO',
    rif: `J-${prefijo}${String(contador).padStart(3, '0')}-1`.toUpperCase(),
    monedaFuncional: 'VES',
    monedaReferencia: 'USD',
    alicuotaIVA: '16',
    decimalesRedondeo: 2,
    modoRedondeo: 'HALF_UP',
    incrementoRedondeo: '0',
  })

  const ctxPropietario = contextoDe('PROPIETARIO', {
    usuarioId: duenio.id,
    email: duenio.email,
    organizacionId: organizacion.id,
    empresaId: empresa.id,
  })

  // Vincular al cajero y al supervisor con sus roles.
  for (const [usuario, clave] of [
    [cajero, 'CAJERO'],
    [supervisor, 'SUPERVISOR'],
  ] as const) {
    const rol = await db.rol.findUniqueOrThrow({
      where: { organizacionId_clave: { organizacionId: organizacion.id, clave } },
    })
    await db.membresia.create({
      data: { organizacionId: organizacion.id, userId: usuario.id, rolId: rol.id },
    })
  }

  const almacen = await db.almacen.findFirstOrThrow({
    where: { organizacionId: organizacion.id, esPredeterminado: true },
  })
  const caja = await db.caja.findFirstOrThrow({ where: { organizacionId: organizacion.id } })
  const listaPrecio = await db.listaPrecio.findFirstOrThrow({
    where: { organizacionId: organizacion.id, esPredeterminada: true },
  })

  const [ivaGeneral, exento] = await Promise.all([
    db.impuesto.findFirstOrThrow({
      where: { organizacionId: organizacion.id, tipo: 'IVA', clasificacion: 'GENERAL' },
    }),
    db.impuesto.findFirstOrThrow({
      where: { organizacionId: organizacion.id, clasificacion: 'EXENTA' },
    }),
  ])

  // El quiosco publica precios con IVA incluido: es como funciona un mostrador
  // donde el cliente paga un número redondo.
  await db.impuesto.update({ where: { id: ivaGeneral.id }, data: { incluidoEnPrecio: true } })

  const [und, caja24] = await Promise.all([
    db.unidadMedida.findFirstOrThrow({ where: { organizacionId: organizacion.id, codigo: 'UND' } }),
    db.unidadMedida.findFirstOrThrow({ where: { organizacionId: organizacion.id, codigo: 'CAJA24' } }),
  ])

  const [efectivo, divisa, pagoMovil] = await Promise.all([
    db.metodoPago.findFirstOrThrow({ where: { organizacionId: organizacion.id, codigo: 'EFEC-BS' } }),
    db.metodoPago.findFirstOrThrow({ where: { organizacionId: organizacion.id, codigo: 'EFEC-USD' } }),
    db.metodoPago.findFirstOrThrow({ where: { organizacionId: organizacion.id, codigo: 'PM' } }),
  ])

  // ── Productos ───────────────────────────────────────────────────────
  const definiciones = [
    {
      clave: 'refresco' as const,
      nombre: 'Refresco 2L',
      sku: `REF2L-${sufijo}`,
      codigoBarras: `7591${String(contador).padStart(9, '0')}`,
      impuestoId: ivaGeneral.id,
      unidadVentaId: und.id,
      unidadCompraId: caja24.id,
      precio: '58.00',
      costo: '32.500000',
      stockInicial: '48',
    },
    {
      clave: 'caramelo' as const,
      nombre: 'Caramelo surtido',
      sku: `CAR-${sufijo}`,
      codigoBarras: `7592${String(contador).padStart(9, '0')}`,
      impuestoId: ivaGeneral.id,
      unidadVentaId: und.id,
      // Se compra la caja de 24 y se vende por unidad: el fraccionamiento sale
      // del factor de la unidad, no de un número suelto.
      unidadCompraId: caja24.id,
      precio: '3.50',
      costo: '1.875000',
      stockInicial: '240',
    },
    {
      clave: 'pan' as const,
      nombre: 'Pan canilla',
      sku: `PAN-${sufijo}`,
      codigoBarras: `7593${String(contador).padStart(9, '0')}`,
      impuestoId: exento.id,
      unidadVentaId: und.id,
      unidadCompraId: null,
      precio: '12.00',
      costo: '7.000000',
      stockInicial: '60',
    },
  ]

  const productos = {} as QuioscoDePrueba['productos']

  for (const def of definiciones) {
    const producto = await crearProducto(ctxPropietario, {
      nombre: def.nombre,
      tipo: 'PRODUCTO',
      sku: def.sku,
      unidadVentaId: def.unidadVentaId,
      unidadCompraId: def.unidadCompraId,
      impuestoId: def.impuestoId,
      controlaStock: true,
      manejaLotes: false,
      stockMinimo: '12',
      puntoReorden: '24',
      variantes: [],
      descripcion: null,
      codigoProveedor: null,
      categoriaId: null,
      temporadaId: null,
      cuentaInventarioId: null,
      imagenUrl: null,
    })

    const variante = producto.variantes[0]
    await db.variante.update({ where: { id: variante.id }, data: { codigoBarras: def.codigoBarras } })

    await fijarPrecio(ctxPropietario, {
      listaPrecioId: listaPrecio.id,
      varianteId: variante.id,
      monto: def.precio,
      moneda: 'VES',
    })

    // Existencia inicial, con su movimiento en el kardex: el stock no aparece
    // de la nada, entra con un movimiento que lo explica.
    await registrarMovimiento({
      organizacionId: organizacion.id,
      varianteId: variante.id,
      almacenId: almacen.id,
      tipo: 'SALDO_INICIAL',
      cantidad: def.stockInicial,
      costoUnitario: def.costo,
      motivo: 'Carga inicial de inventario',
      usuarioId: duenio.id,
    })

    productos[def.clave] = {
      productoId: producto.id,
      varianteId: variante.id,
      codigoBarras: def.codigoBarras,
      precio: def.precio,
      costo: def.costo,
    }
  }

  // Tasa del día, necesaria para cobrar en divisas.
  await db.tasaCambio.create({
    data: { empresaId: empresa.id, fecha: new Date(), monedaRef: 'USD', tasa: '36.50000000', fuente: 'BCV' },
  })

  return {
    organizacionId: organizacion.id,
    empresaId: empresa.id,
    sucursalId: sucursal.id,
    almacenId: almacen.id,
    cajaId: caja.id,
    listaPrecioId: listaPrecio.id,
    metodoEfectivoId: efectivo.id,
    metodoDivisaId: divisa.id,
    metodoPagoMovilId: pagoMovil.id,
    productos,
    propietario: ctxPropietario,
    cajero: contextoDe('CAJERO', {
      usuarioId: cajero.id,
      email: cajero.email,
      organizacionId: organizacion.id,
      empresaId: empresa.id,
    }),
    supervisor: contextoDe('SUPERVISOR', {
      usuarioId: supervisor.id,
      email: supervisor.email,
      organizacionId: organizacion.id,
      empresaId: empresa.id,
    }),
  }
}

/** Limpia lo creado por las pruebas del quiosco, respetando el orden de las FKs. */
export async function limpiarQuioscos() {
  const orgs = await db.organizacion.findMany({
    where: { nombre: { contains: 'Quiosco de Prueba' } },
    select: { id: true, empresaId: true },
  })
  if (orgs.length === 0) return
  const orgIds = orgs.map((o) => o.id)
  const empresaIds = orgs.map((o) => o.empresaId)

  await db.arqueoDetalle.deleteMany({ where: { arqueo: { sesionCaja: { organizacionId: { in: orgIds } } } } })
  await db.arqueo.deleteMany({ where: { sesionCaja: { organizacionId: { in: orgIds } } } })
  await db.movimientoCaja.deleteMany({ where: { sesionCaja: { organizacionId: { in: orgIds } } } })
  await db.pago.deleteMany({ where: { organizacionId: { in: orgIds } } })
  await db.movimientoInventario.deleteMany({ where: { organizacionId: { in: orgIds } } })
  await db.ventaDetalle.deleteMany({ where: { venta: { organizacionId: { in: orgIds } } } })
  await db.venta.deleteMany({ where: { organizacionId: { in: orgIds } } })
  await db.sesionCaja.deleteMany({ where: { organizacionId: { in: orgIds } } })
  await db.existencia.deleteMany({ where: { organizacionId: { in: orgIds } } })
  await db.precio.deleteMany({ where: { organizacionId: { in: orgIds } } })
  await db.variante.deleteMany({ where: { organizacionId: { in: orgIds } } })
  await db.producto.deleteMany({ where: { organizacionId: { in: orgIds } } })
  await db.secuenciaOperativa.deleteMany({ where: { organizacionId: { in: orgIds } } })
  await db.membresiaSucursal.deleteMany({ where: { membresia: { organizacionId: { in: orgIds } } } })
  await db.membresia.deleteMany({ where: { organizacionId: { in: orgIds } } })
  await db.rolPermiso.deleteMany({ where: { rol: { organizacionId: { in: orgIds } } } })
  await db.rol.deleteMany({ where: { organizacionId: { in: orgIds } } })
  await db.caja.deleteMany({ where: { organizacionId: { in: orgIds } } })
  await db.categoriaGasto.deleteMany({ where: { organizacionId: { in: orgIds } } })
  await db.metodoPago.deleteMany({ where: { organizacionId: { in: orgIds } } })
  await db.listaPrecio.deleteMany({ where: { organizacionId: { in: orgIds } } })
  await db.impuesto.deleteMany({ where: { organizacionId: { in: orgIds } } })
  await db.almacen.deleteMany({ where: { organizacionId: { in: orgIds } } })
  await db.sucursal.deleteMany({ where: { organizacionId: { in: orgIds } } })
  await db.unidadMedida.deleteMany({ where: { organizacionId: { in: orgIds }, unidadBaseId: { not: null } } })
  await db.unidadMedida.deleteMany({ where: { organizacionId: { in: orgIds } } })
  await db.organizacion.deleteMany({ where: { id: { in: orgIds } } })
  await db.tasaCambio.deleteMany({ where: { empresaId: { in: empresaIds } } })
  await db.userEmpresa.deleteMany({ where: { empresaId: { in: empresaIds } } })
  await db.empresa.deleteMany({ where: { id: { in: empresaIds } } })
  await db.user.deleteMany({ where: { email: { contains: '@quiosco.test' } } })
}
