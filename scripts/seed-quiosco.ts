/**
 * Semilla de un quiosco operable.
 *
 *   npm run seed:quiosco
 *
 * Crea un negocio completo y listo para vender: organización con su perfil
 * fiscal, sucursal, almacén, caja, unidades con conversión, impuestos, lista de
 * precios, métodos de cobro, tres usuarios con roles distintos y un catálogo de
 * productos de alta rotación con código de barras, precio y existencia inicial.
 *
 * Usa los mismos servicios de dominio que la aplicación, así que si la semilla
 * corre, el camino real de creación funciona.
 */

import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth'
import { crearOrganizacion } from '../src/lib/nucleo/organizacion'
import { crearProducto, fijarPrecio } from '../src/lib/nucleo/catalogo'
import { registrarMovimiento } from '../src/lib/nucleo/inventario'
import { permisosDeRol, type ContextoOperacion, type Rol } from '../src/lib/nucleo/permisos'

const RIF = 'J-505050501'
const CLAVE = 'quiosco123'

function contextoDe(
  rol: Rol,
  datos: { usuarioId: string; email: string; organizacionId: string; empresaId: string },
): ContextoOperacion {
  const permisos = permisosDeRol(rol)
  return {
    usuarioId: datos.usuarioId,
    email: datos.email,
    nombre: 'Semilla',
    organizacionId: datos.organizacionId,
    empresaId: datos.empresaId,
    rol,
    permisos,
    sucursalesPermitidas: [],
    puede: (p) => permisos.includes(p),
  }
}

/** Catálogo de un quiosco real: alta rotación, bajo margen, código de barras. */
const CATALOGO = [
  // clave, nombre, código de barras, unidad de venta, unidad de compra, precio, costo, existencia
  { nombre: 'Refresco cola 2L', barras: '7591001000019', venta: 'UND', compra: 'CAJA12', precio: '58.00', costo: '32.500000', stock: '48', exento: false },
  { nombre: 'Refresco naranja 2L', barras: '7591001000026', venta: 'UND', compra: 'CAJA12', precio: '58.00', costo: '32.500000', stock: '36', exento: false },
  { nombre: 'Agua mineral 600ml', barras: '7591001000033', venta: 'UND', compra: 'CAJA24', precio: '18.00', costo: '9.750000', stock: '120', exento: false },
  { nombre: 'Caramelo surtido', barras: '7591001000040', venta: 'UND', compra: 'CAJA24', precio: '3.50', costo: '1.875000', stock: '480', exento: false },
  { nombre: 'Chicle menta', barras: '7591001000057', venta: 'UND', compra: 'CAJA24', precio: '4.00', costo: '2.100000', stock: '360', exento: false },
  { nombre: 'Galleta de soda', barras: '7591001000064', venta: 'UND', compra: 'CAJA12', precio: '22.00', costo: '13.400000', stock: '96', exento: false },
  { nombre: 'Papas fritas', barras: '7591001000071', venta: 'UND', compra: 'CAJA12', precio: '35.00', costo: '21.000000', stock: '72', exento: false },
  { nombre: 'Café instantáneo sobre', barras: '7591001000088', venta: 'UND', compra: 'CAJA24', precio: '9.00', costo: '5.200000', stock: '240', exento: false },
  // Exentos de IVA (alimentos de la canasta básica)
  { nombre: 'Pan canilla', barras: '7591001000095', venta: 'UND', compra: null, precio: '12.00', costo: '7.000000', stock: '60', exento: true },
  { nombre: 'Harina de maíz 1kg', barras: '7591001000101', venta: 'UND', compra: 'CAJA24', precio: '28.00', costo: '18.500000', stock: '144', exento: true },
  { nombre: 'Arroz 1kg', barras: '7591001000118', venta: 'UND', compra: 'CAJA24', precio: '32.00', costo: '21.000000', stock: '120', exento: true },
  { nombre: 'Leche en polvo 400g', barras: '7591001000125', venta: 'UND', compra: 'CAJA12', precio: '95.00', costo: '68.000000', stock: '48', exento: true },
]

async function main() {
  console.log('Sembrando quiosco de demostración...\n')

  const existente = await db.empresa.findUnique({ where: { rif: RIF.replace(/-/g, '') } })
  if (existente) {
    console.log(`Ya existe un negocio con el RIF ${RIF}. Nada que hacer.`)
    console.log('Para volver a sembrar, elimina esa organización primero.')
    return
  }

  const passwordHash = await hashPassword(CLAVE)

  const [duenio, cajero, supervisor] = await Promise.all([
    db.user.upsert({
      where: { email: 'duenio@quiosco.demo' },
      create: { email: 'duenio@quiosco.demo', name: 'María — Dueña', passwordHash, role: 'ADMIN' },
      update: { passwordHash },
    }),
    db.user.upsert({
      where: { email: 'cajero@quiosco.demo' },
      create: { email: 'cajero@quiosco.demo', name: 'Luis — Cajero', passwordHash, role: 'AUXILIAR' },
      update: { passwordHash },
    }),
    db.user.upsert({
      where: { email: 'supervisor@quiosco.demo' },
      create: { email: 'supervisor@quiosco.demo', name: 'Ana — Supervisora', passwordHash, role: 'AUXILIAR' },
      update: { passwordHash },
    }),
  ])

  const { organizacion, empresa, sucursal } = await crearOrganizacion(duenio.id, {
    nombre: 'Quiosco La Esquina',
    rubro: 'QUIOSCO',
    rif: RIF,
    direccion: 'Av. Principal, Local 4',
    telefono: '0412-1234567',
    email: 'quiosco@laesquina.demo',
    monedaFuncional: 'VES',
    monedaReferencia: 'USD',
    alicuotaIVA: '16',
    decimalesRedondeo: 2,
    modoRedondeo: 'HALF_UP',
    incrementoRedondeo: '0',
  })
  console.log(`✓ Organización "${organizacion.nombre}" (RIF ${empresa.rif})`)
  console.log(`✓ Sucursal "${sucursal.nombre}", con su almacén y caja`)

  const ctx = contextoDe('PROPIETARIO', {
    usuarioId: duenio.id,
    email: duenio.email,
    organizacionId: organizacion.id,
    empresaId: empresa.id,
  })

  // Equipo
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
  console.log('✓ Equipo: dueña (propietario), Ana (supervisor), Luis (cajero)')

  const almacen = await db.almacen.findFirstOrThrow({
    where: { organizacionId: organizacion.id, esPredeterminado: true },
  })
  const listaPrecio = await db.listaPrecio.findFirstOrThrow({
    where: { organizacionId: organizacion.id, esPredeterminada: true },
  })

  const [ivaGeneral, exento] = await Promise.all([
    db.impuesto.findFirstOrThrow({
      where: { organizacionId: organizacion.id, tipo: 'IVA', clasificacion: 'GENERAL' },
    }),
    db.impuesto.findFirstOrThrow({ where: { organizacionId: organizacion.id, clasificacion: 'EXENTA' } }),
  ])

  // Un quiosco publica precios con IVA incluido: el cliente paga un número
  // redondo y el impuesto se desglosa hacia atrás para el libro de ventas.
  await db.impuesto.update({ where: { id: ivaGeneral.id }, data: { incluidoEnPrecio: true } })
  console.log('✓ IVA 16 % configurado como incluido en el precio')

  const unidades = await db.unidadMedida.findMany({ where: { organizacionId: organizacion.id } })
  const porCodigo = new Map(unidades.map((u) => [u.codigo, u.id]))

  // Categorías
  const bebidas = await db.categoria.create({
    data: { organizacionId: organizacion.id, nombre: 'Bebidas', ruta: 'Bebidas', nivel: 1, createdBy: duenio.id },
  })
  const golosinas = await db.categoria.create({
    data: { organizacionId: organizacion.id, nombre: 'Golosinas', ruta: 'Golosinas', nivel: 1, orden: 1, createdBy: duenio.id },
  })
  const viveres = await db.categoria.create({
    data: { organizacionId: organizacion.id, nombre: 'Víveres', ruta: 'Víveres', nivel: 1, orden: 2, createdBy: duenio.id },
  })

  let creados = 0
  for (const item of CATALOGO) {
    const categoriaId = item.exento
      ? viveres.id
      : item.nombre.match(/Refresco|Agua/)
        ? bebidas.id
        : golosinas.id

    const producto = await crearProducto(ctx, {
      nombre: item.nombre,
      tipo: 'PRODUCTO',
      sku: item.barras.slice(-6),
      categoriaId,
      unidadVentaId: porCodigo.get(item.venta) as string,
      unidadCompraId: item.compra ? (porCodigo.get(item.compra) as string) : null,
      impuestoId: item.exento ? exento.id : ivaGeneral.id,
      controlaStock: true,
      manejaLotes: false,
      stockMinimo: '12',
      puntoReorden: '24',
      variantes: [],
      descripcion: null,
      codigoProveedor: null,
      temporadaId: null,
      cuentaInventarioId: null,
      imagenUrl: null,
    })

    const variante = producto.variantes[0]
    await db.variante.update({ where: { id: variante.id }, data: { codigoBarras: item.barras } })

    await fijarPrecio(ctx, {
      listaPrecioId: listaPrecio.id,
      varianteId: variante.id,
      monto: item.precio,
      moneda: 'VES',
    })

    // La existencia entra con un movimiento que la explica: el stock no
    // aparece de la nada.
    await registrarMovimiento({
      organizacionId: organizacion.id,
      varianteId: variante.id,
      almacenId: almacen.id,
      tipo: 'SALDO_INICIAL',
      cantidad: item.stock,
      costoUnitario: item.costo,
      motivo: 'Carga inicial de inventario',
      usuarioId: duenio.id,
    })

    creados += 1
  }
  console.log(`✓ ${creados} productos con código de barras, precio y existencia inicial`)

  // Tasa del BCV, necesaria para cobrar en divisas
  await db.tasaCambio.create({
    data: {
      empresaId: empresa.id,
      fecha: new Date(new Date().toISOString().slice(0, 10)),
      monedaRef: 'USD',
      tasa: '36.50000000',
      fuente: 'BCV',
    },
  })
  console.log('✓ Tasa BCV del día: 36,50 Bs/USD')

  // Un cliente con crédito, para probar el fiado
  await db.cliente.create({
    data: {
      empresaId: empresa.id,
      organizacionId: organizacion.id,
      nombre: 'Señora Carmen (vecina)',
      telefono: '0414-9876543',
      limiteCredito: '500.0000',
      diasCredito: 15,
    },
  })
  console.log('✓ Cliente con crédito de Bs 500 para probar el fiado')

  console.log('\n─── Listo. Entra con: ───')
  console.log(`  Dueña:      duenio@quiosco.demo      / ${CLAVE}`)
  console.log(`  Supervisora: supervisor@quiosco.demo / ${CLAVE}`)
  console.log(`  Cajero:     cajero@quiosco.demo      / ${CLAVE}`)
  console.log('\nEl cajero puede vender y cobrar, pero no verá costos ni márgenes')
  console.log('por ninguna vía, ni siquiera llamando la API directamente.')
}

main()
  .catch((e) => {
    console.error('\nLa semilla falló:', e instanceof Error ? e.message : e)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })
