-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CONTADOR',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sesion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizaciones" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rubro" TEXT NOT NULL DEFAULT 'GENERAL',
    "empresaId" TEXT NOT NULL,
    "monedaFuncional" TEXT NOT NULL DEFAULT 'VES',
    "monedaReferencia" TEXT NOT NULL DEFAULT 'USD',
    "decimalesRedondeo" INTEGER NOT NULL DEFAULT 2,
    "modoRedondeo" TEXT NOT NULL DEFAULT 'HALF_UP',
    "incrementoRedondeo" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "plan" TEXT NOT NULL DEFAULT 'BASICO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "organizaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sucursales" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "telefono" TEXT,
    "centroCosto" TEXT,
    "esPrincipal" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "sucursales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "almacenes" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'VENTA',
    "esPredeterminado" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "almacenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permisos" (
    "clave" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,

    CONSTRAINT "permisos_pkey" PRIMARY KEY ("clave")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "esSistema" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles_permisos" (
    "rolId" TEXT NOT NULL,
    "permisoClave" TEXT NOT NULL,

    CONSTRAINT "roles_permisos_pkey" PRIMARY KEY ("rolId","permisoClave")
);

-- CreateTable
CREATE TABLE "usuarios_organizacion" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rolId" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "empleadoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "usuarios_organizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios_sucursales" (
    "membresiaId" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,

    CONSTRAINT "usuarios_sucursales_pkey" PRIMARY KEY ("membresiaId","sucursalId")
);

-- CreateTable
CREATE TABLE "TasaCambio" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "monedaRef" TEXT NOT NULL DEFAULT 'USD',
    "tasa" DECIMAL(18,8) NOT NULL,
    "fuente" TEXT NOT NULL DEFAULT 'BCV',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TasaCambio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bitacora_auditoria" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "organizacionId" TEXT,
    "userId" TEXT,
    "userEmail" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT,
    "entidadId" TEXT,
    "detalle" TEXT,
    "valorAnterior" TEXT,
    "valorNuevo" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bitacora_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidades_medida" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'UNIDAD',
    "unidadBaseId" TEXT,
    "factorBase" DECIMAL(18,8) NOT NULL DEFAULT 1,
    "decimales" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "unidades_medida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "padreId" TEXT,
    "ruta" TEXT NOT NULL DEFAULT '',
    "nivel" INTEGER NOT NULL DEFAULT 1,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "impuestos" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'IVA',
    "clasificacion" TEXT NOT NULL DEFAULT 'GENERAL',
    "tasa" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "incluidoEnPrecio" BOOLEAN NOT NULL DEFAULT false,
    "esPredeterminado" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "impuestos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "categoriaId" TEXT,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'PRODUCTO',
    "sku" TEXT NOT NULL,
    "codigoProveedor" TEXT,
    "unidadVentaId" TEXT NOT NULL,
    "unidadCompraId" TEXT,
    "impuestoId" TEXT,
    "controlaStock" BOOLEAN NOT NULL DEFAULT true,
    "manejaLotes" BOOLEAN NOT NULL DEFAULT false,
    "tieneVariantes" BOOLEAN NOT NULL DEFAULT false,
    "stockMinimo" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "puntoReorden" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "temporadaId" TEXT,
    "cuentaInventarioId" TEXT,
    "imagenUrl" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variantes" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL DEFAULT '',
    "sku" TEXT NOT NULL,
    "codigoBarras" TEXT,
    "esPredeterminada" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "variantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atributos" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "atributos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atributos_valores" (
    "id" TEXT NOT NULL,
    "atributoId" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "atributos_valores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variantes_valores" (
    "varianteId" TEXT NOT NULL,
    "atributoValorId" TEXT NOT NULL,

    CONSTRAINT "variantes_valores_pkey" PRIMARY KEY ("varianteId","atributoValorId")
);

-- CreateTable
CREATE TABLE "listas_precios" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'DETAL',
    "moneda" TEXT NOT NULL DEFAULT 'VES',
    "esPredeterminada" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "listas_precios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "precios" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "listaPrecioId" TEXT NOT NULL,
    "varianteId" TEXT NOT NULL,
    "monto" DECIMAL(18,4) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'VES',
    "cantidadMinima" DECIMAL(18,3) NOT NULL DEFAULT 1,
    "vigenciaDesde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigenciaHasta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "precios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "existencias" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "varianteId" TEXT NOT NULL,
    "almacenId" TEXT NOT NULL,
    "cantidad" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "costoPromedio" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "ultimoCosto" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "cantidadReservada" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "existencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lotes" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "varianteId" TEXT NOT NULL,
    "almacenId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "fechaVencimiento" DATE,
    "cantidad" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "costoUnitario" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_inventario" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "varianteId" TEXT NOT NULL,
    "almacenId" TEXT NOT NULL,
    "loteId" TEXT,
    "tipo" TEXT NOT NULL,
    "cantidad" DECIMAL(18,3) NOT NULL,
    "costoUnitario" DECIMAL(18,6) NOT NULL,
    "costoTotal" DECIMAL(18,4) NOT NULL,
    "cantidadSaldo" DECIMAL(18,3) NOT NULL,
    "costoPromedioSaldo" DECIMAL(18,6) NOT NULL,
    "ventaId" TEXT,
    "compraId" TEXT,
    "trasladoId" TEXT,
    "tomaId" TEXT,
    "comandaId" TEXT,
    "asientoId" TEXT,
    "motivo" TEXT,
    "usuarioId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "movimientoReversadoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traslados" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "almacenOrigenId" TEXT NOT NULL,
    "almacenDestinoId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaRecepcion" TIMESTAMP(3),
    "motivo" TEXT,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "traslados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traslados_detalle" (
    "id" TEXT NOT NULL,
    "trasladoId" TEXT NOT NULL,
    "varianteId" TEXT NOT NULL,
    "cantidad" DECIMAL(18,3) NOT NULL,
    "cantidadRecibida" DECIMAL(18,3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "traslados_detalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tomas_inventario" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "almacenId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ABIERTA',
    "fechaApertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaCierre" TIMESTAMP(3),
    "responsableId" TEXT,
    "motivo" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "tomas_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tomas_inventario_detalle" (
    "id" TEXT NOT NULL,
    "tomaId" TEXT NOT NULL,
    "varianteId" TEXT NOT NULL,
    "cantidadTeorica" DECIMAL(18,3) NOT NULL,
    "cantidadFisica" DECIMAL(18,3),
    "costoPromedio" DECIMAL(18,6) NOT NULL,
    "observacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tomas_inventario_detalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedores" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "rif" TEXT,
    "nombre" TEXT NOT NULL,
    "contacto" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "condicionPago" TEXT NOT NULL DEFAULT 'CONTADO',
    "diasCredito" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordenes_compra" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaEsperada" TIMESTAMP(3),
    "moneda" TEXT NOT NULL DEFAULT 'VES',
    "tasaCambio" DECIMAL(18,8),
    "subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "impuestoTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ordenes_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordenes_compra_detalle" (
    "id" TEXT NOT NULL,
    "ordenCompraId" TEXT NOT NULL,
    "varianteId" TEXT NOT NULL,
    "cantidad" DECIMAL(18,3) NOT NULL,
    "cantidadRecibida" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "costoUnitario" DECIMAL(18,6) NOT NULL,
    "total" DECIMAL(18,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ordenes_compra_detalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compras" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "almacenId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "ordenCompraId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "numeroFactura" TEXT,
    "numeroControl" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaVencimiento" TIMESTAMP(3),
    "moneda" TEXT NOT NULL DEFAULT 'VES',
    "tasaCambio" DECIMAL(18,8),
    "subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "descuentoTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "impuestoTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "costosAdicionales" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalMonedaFuncional" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "montoPagado" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "estadoPago" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "facturaId" TEXT,
    "compraOrigenId" TEXT,
    "condicionPago" TEXT NOT NULL DEFAULT 'CONTADO',
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "compras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compras_detalle" (
    "id" TEXT NOT NULL,
    "compraId" TEXT NOT NULL,
    "varianteId" TEXT NOT NULL,
    "cantidad" DECIMAL(18,3) NOT NULL,
    "costoUnitario" DECIMAL(18,6) NOT NULL,
    "descuentoMonto" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "impuestoId" TEXT,
    "impuestoTasa" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "impuestoMonto" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "costoUnitarioFinal" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,4) NOT NULL,
    "loteCodigo" TEXT,
    "fechaVencimiento" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compras_detalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compras_costos_adicionales" (
    "id" TEXT NOT NULL,
    "compraId" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "monto" DECIMAL(18,4) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'VES',
    "criterioProrrateo" TEXT NOT NULL DEFAULT 'VALOR',
    "proveedorNombre" TEXT,
    "numeroDocumento" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compras_costos_adicionales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "organizacionId" TEXT,
    "rif" TEXT,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "limiteCredito" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "diasCredito" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metodos_pago" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'EFECTIVO',
    "moneda" TEXT NOT NULL DEFAULT 'VES',
    "afectaCajaFisica" BOOLEAN NOT NULL DEFAULT true,
    "cuentaBancariaId" TEXT,
    "causaIGTF" BOOLEAN NOT NULL DEFAULT false,
    "comisionPorcentaje" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "requiereReferencia" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "metodos_pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "almacenId" TEXT NOT NULL,
    "clienteId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "sesionCajaId" TEXT,
    "listaPrecioId" TEXT,
    "tipoDocumento" TEXT NOT NULL DEFAULT 'TICKET',
    "serie" TEXT NOT NULL DEFAULT 'A',
    "numero" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canal" TEXT NOT NULL DEFAULT 'MOSTRADOR',
    "moneda" TEXT NOT NULL DEFAULT 'VES',
    "tasaCambio" DECIMAL(18,8),
    "subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "descuentoTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "impuestoTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "igtfTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "propina" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "ajusteRedondeo" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalMonedaFuncional" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "costoTotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "montoPagado" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "estadoPago" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "facturaId" TEXT,
    "ventaOrigenId" TEXT,
    "motivoAnulacion" TEXT,
    "anuladaPorId" TEXT,
    "anuladaEn" TIMESTAMP(3),
    "mesaId" TEXT,
    "comandaId" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas_detalle" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "varianteId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cantidad" DECIMAL(18,3) NOT NULL,
    "precioUnitario" DECIMAL(18,4) NOT NULL,
    "descuentoMonto" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "autorizadoPorId" TEXT,
    "impuestoId" TEXT,
    "impuestoTasa" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "impuestoMonto" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "costoUnitario" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,4) NOT NULL,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ventas_detalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "organizacionId" TEXT,
    "facturaId" TEXT,
    "ventaId" TEXT,
    "compraId" TEXT,
    "userId" TEXT NOT NULL,
    "monto" DECIMAL(18,4) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'VES',
    "tasaCambio" DECIMAL(18,8),
    "montoMonedaFuncional" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metodoPago" TEXT NOT NULL DEFAULT 'TRANSFERENCIA',
    "metodoPagoId" TEXT,
    "referencia" TEXT,
    "montoIGTF" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "sesionCajaId" TEXT,
    "cuentaId" TEXT,
    "asientoId" TEXT,
    "pagoReversadoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apartados" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ABIERTO',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaVencimiento" TIMESTAMP(3),
    "moneda" TEXT NOT NULL DEFAULT 'VES',
    "total" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "montoAbonado" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "ventaId" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "apartados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apartados_detalle" (
    "id" TEXT NOT NULL,
    "apartadoId" TEXT NOT NULL,
    "varianteId" TEXT NOT NULL,
    "cantidad" DECIMAL(18,3) NOT NULL,
    "precioUnitario" DECIMAL(18,4) NOT NULL,
    "total" DECIMAL(18,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "apartados_detalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apartados_abonos" (
    "id" TEXT NOT NULL,
    "apartadoId" TEXT NOT NULL,
    "metodoPagoId" TEXT,
    "monto" DECIMAL(18,4) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'VES',
    "tasaCambio" DECIMAL(18,8),
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referencia" TEXT,
    "sesionCajaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "apartados_abonos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cajas" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "cajas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones_caja" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "cajaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ABIERTA',
    "fechaApertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaCierre" TIMESTAMP(3),
    "montoInicial" DECIMAL(18,4) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'VES',
    "totalVentas" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalCobros" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalIngresos" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalEgresos" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "efectivoEsperado" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sesiones_caja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_caja" (
    "id" TEXT NOT NULL,
    "sesionCajaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "monto" DECIMAL(18,4) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'VES',
    "tasaCambio" DECIMAL(18,8),
    "referencia" TEXT,
    "usuarioId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_caja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arqueos" (
    "id" TEXT NOT NULL,
    "sesionCajaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "efectivoEsperado" DECIMAL(18,4) NOT NULL,
    "efectivoContado" DECIMAL(18,4) NOT NULL,
    "diferencia" DECIMAL(18,4) NOT NULL,
    "justificacion" TEXT,
    "moneda" TEXT NOT NULL DEFAULT 'VES',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arqueos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arqueos_detalle" (
    "id" TEXT NOT NULL,
    "arqueoId" TEXT NOT NULL,
    "metodoPagoId" TEXT NOT NULL,
    "montoEsperado" DECIMAL(18,4) NOT NULL,
    "montoContado" DECIMAL(18,4) NOT NULL,
    "diferencia" DECIMAL(18,4) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'VES',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arqueos_detalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuentas_bancarias" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "banco" TEXT NOT NULL,
    "numeroCuenta" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'CORRIENTE',
    "moneda" TEXT NOT NULL DEFAULT 'VES',
    "saldoInicial" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "saldoActual" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "cuentaId" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "cuentas_bancarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_bancarios" (
    "id" TEXT NOT NULL,
    "cuentaBancariaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "monto" DECIMAL(18,4) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'VES',
    "tasaCambio" DECIMAL(18,8),
    "referencia" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conciliado" BOOLEAN NOT NULL DEFAULT false,
    "contraparteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_bancarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_gasto" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "padreId" TEXT,
    "destino" TEXT NOT NULL DEFAULT 'GASTO',
    "naturaleza" TEXT NOT NULL DEFAULT 'VARIABLE',
    "clasificacion" TEXT NOT NULL DEFAULT 'OPERATIVO',
    "cuentaId" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "categorias_gasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gastos" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "categoriaGastoId" TEXT NOT NULL,
    "proveedorId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "concepto" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "fechaVencimiento" DATE,
    "moneda" TEXT NOT NULL DEFAULT 'VES',
    "tasaCambio" DECIMAL(18,8),
    "subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "impuestoMonto" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,4) NOT NULL,
    "totalMonedaFuncional" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'REGISTRADO',
    "estadoPago" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "montoPagado" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "numeroFactura" TEXT,
    "numeroControl" TEXT,
    "comprobanteUrl" TEXT,
    "sesionCajaId" TEXT,
    "cuentaBancariaId" TEXT,
    "gastoRecurrenteId" TEXT,
    "asientoId" TEXT,
    "facturaId" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "gastos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gastos_recurrentes" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "sucursalId" TEXT,
    "categoriaGastoId" TEXT NOT NULL,
    "proveedorId" TEXT,
    "concepto" TEXT NOT NULL,
    "monto" DECIMAL(18,4) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'VES',
    "periodicidad" TEXT NOT NULL DEFAULT 'MENSUAL',
    "diaVencimiento" INTEGER NOT NULL DEFAULT 1,
    "fechaInicio" DATE NOT NULL,
    "fechaFin" DATE,
    "proximaGeneracion" DATE NOT NULL,
    "diasAviso" INTEGER NOT NULL DEFAULT 3,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "gastos_recurrentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mesas" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "capacidad" INTEGER NOT NULL DEFAULT 4,
    "estado" TEXT NOT NULL DEFAULT 'LIBRE',
    "posicionX" INTEGER NOT NULL DEFAULT 0,
    "posicionY" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mesas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comandas" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "mesaId" TEXT,
    "clienteId" TEXT,
    "numero" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ABIERTA',
    "canal" TEXT NOT NULL DEFAULT 'SALON',
    "comensales" INTEGER NOT NULL DEFAULT 1,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaEnvio" TIMESTAMP(3),
    "meseroId" TEXT,
    "comandaPadreId" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "comandas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comandas_detalle" (
    "id" TEXT NOT NULL,
    "comandaId" TEXT NOT NULL,
    "varianteId" TEXT NOT NULL,
    "cantidad" DECIMAL(18,3) NOT NULL,
    "precioUnitario" DECIMAL(18,4) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "destino" TEXT NOT NULL DEFAULT 'COCINA',
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comandas_detalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recetas" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL DEFAULT '',
    "rendimiento" DECIMAL(18,3) NOT NULL DEFAULT 1,
    "porcentajeMermaGlobal" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "recetas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recetas_detalle" (
    "id" TEXT NOT NULL,
    "recetaId" TEXT NOT NULL,
    "varianteId" TEXT NOT NULL,
    "cantidad" DECIMAL(18,3) NOT NULL,
    "unidadMedidaId" TEXT NOT NULL,
    "porcentajeMerma" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "esOpcional" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recetas_detalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grupos_modificador" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "minSelecciones" INTEGER NOT NULL DEFAULT 0,
    "maxSelecciones" INTEGER NOT NULL DEFAULT 1,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grupos_modificador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modificadores" (
    "id" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precioExtra" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "varianteInsumoId" TEXT,
    "cantidadInsumo" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modificadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grupos_modificador_productos" (
    "grupoId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,

    CONSTRAINT "grupos_modificador_productos_pkey" PRIMARY KEY ("grupoId","productoId")
);

-- CreateTable
CREATE TABLE "comandas_detalle_modificadores" (
    "id" TEXT NOT NULL,
    "comandaDetalleId" TEXT NOT NULL,
    "modificadorId" TEXT NOT NULL,
    "precioExtra" DECIMAL(18,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comandas_detalle_modificadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas_detalle_modificadores" (
    "id" TEXT NOT NULL,
    "ventaDetalleId" TEXT NOT NULL,
    "modificadorId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precioExtra" DECIMAL(18,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ventas_detalle_modificadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "temporadas" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "coleccion" TEXT,
    "fechaInicio" DATE,
    "fechaFin" DATE,
    "esAnterior" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "temporadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rif" TEXT NOT NULL,
    "direccion" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "esAgenteRetencionIVA" BOOLEAN NOT NULL DEFAULT false,
    "esContribuyenteEspecial" BOOLEAN NOT NULL DEFAULT false,
    "alicuotaIVA" DECIMAL(7,4) NOT NULL DEFAULT 16.0,
    "monedaFuncional" TEXT NOT NULL DEFAULT 'VES',
    "porcentajeIVSSPatronal" DECIMAL(7,4) NOT NULL DEFAULT 9,
    "porcentajeFAOVEmpleado" DECIMAL(7,4) NOT NULL DEFAULT 1,
    "porcentajeFAOVPatronal" DECIMAL(7,4) NOT NULL DEFAULT 2,
    "porcentajeINCES" DECIMAL(7,4) NOT NULL DEFAULT 2,
    "diasPrestacionesPorMes" DECIMAL(9,4) NOT NULL DEFAULT 5,
    "porcentajeUtilidades" DECIMAL(7,4) NOT NULL DEFAULT 8.33,
    "diaVencimientoIVA" INTEGER NOT NULL DEFAULT 15,
    "diasCreditoClientes" INTEGER NOT NULL DEFAULT 30,
    "diasCreditoProveedores" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEmpresa" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'CONTADOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserEmpresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cuenta" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "naturaleza" TEXT NOT NULL,
    "nivel" INTEGER NOT NULL DEFAULT 4,
    "padreId" TEXT,
    "imputable" BOOLEAN NOT NULL DEFAULT true,
    "uso" TEXT,
    "esMonetaria" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cuenta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Factura" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "rifContraparte" TEXT NOT NULL,
    "nombreContraparte" TEXT NOT NULL,
    "numeroFactura" TEXT,
    "numeroControl" TEXT,
    "ncf" TEXT,
    "fechaEmision" TIMESTAMP(3) NOT NULL,
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monedaOriginal" TEXT NOT NULL DEFAULT 'VES',
    "baseImponible" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "montoExento" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "montoExonerado" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "alicuotaIVA" DECIMAL(7,4) NOT NULL DEFAULT 16.0,
    "montoIVA" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "porcentajeRetencionIVA" DECIMAL(7,4),
    "montoRetencionIVA" DECIMAL(18,4),
    "tarifaISLRCodigo" TEXT,
    "porcentajeRetencionISLR" DECIMAL(7,4),
    "baseRetencionISLR" DECIMAL(18,4),
    "montoRetencionISLR" DECIMAL(18,4),
    "pagoDivisaOCripto" BOOLEAN NOT NULL DEFAULT false,
    "pagoEfectivo" BOOLEAN NOT NULL DEFAULT false,
    "porcentajeIGTF" DECIMAL(7,4),
    "montoIGTF" DECIMAL(18,4),
    "subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalRetencion" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalAPagar" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "tasaCambio" DECIMAL(18,8),
    "totalMonedaFuncional" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "descripcion" TEXT,
    "imagenUrl" TEXT,
    "imagenData" TEXT,
    "ncfAfectaVenta" BOOLEAN NOT NULL DEFAULT true,
    "estado" TEXT NOT NULL DEFAULT 'REGISTRADA',
    "montoPagado" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "estadoPago" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Factura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asiento" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "referencia" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'MANUAL',
    "facturaId" TEXT,
    "fuente" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsientoLinea" (
    "id" TEXT NOT NULL,
    "asientoId" TEXT NOT NULL,
    "cuentaId" TEXT NOT NULL,
    "debit" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "credit" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AsientoLinea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ejercicio" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ABIERTO',
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaCierre" TIMESTAMP(3) NOT NULL,
    "asientoCierreId" TEXT,
    "asientoAperturaId" TEXT,
    "utilidadNeta" DECIMAL(18,4),
    "islrEstimado" DECIMAL(18,4),
    "cerradoPor" TEXT,
    "cerradoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ejercicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConciliacionBanco" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "cuentaId" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "saldoInicialLibro" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "saldoInicialBanco" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "saldoFinalLibro" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "saldoFinalBanco" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "depositosEnTransito" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "chequesPendientes" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "notasCredito" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "notasDebito" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "diferencia" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConciliacionBanco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoBanco" (
    "id" TEXT NOT NULL,
    "conciliacionId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "referencia" TEXT,
    "monto" DECIMAL(18,4) NOT NULL,
    "tipo" TEXT NOT NULL,
    "conciliado" BOOLEAN NOT NULL DEFAULT false,
    "asientoLineaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoBanco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecuenciaDocumento" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "siguienteNumero" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecuenciaDocumento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndiceInflacion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "indice" DECIMAL(18,8) NOT NULL,
    "fuente" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndiceInflacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AjusteInflacion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "indiceInicial" DECIMAL(18,8) NOT NULL,
    "indiceFinal" DECIMAL(18,8) NOT NULL,
    "factorReexpresion" DECIMAL(18,8) NOT NULL,
    "totalReexpresadoActivos" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "resultadoExposicionInflacion" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "asientoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AjusteInflacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empleado" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cargo" TEXT,
    "fechaIngreso" TIMESTAMP(3) NOT NULL,
    "salarioBase" DECIMAL(18,4) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fechaEgreso" TIMESTAMP(3),
    "motivoEgreso" TEXT,
    "prestacionesAcumuladas" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "porcentajeComision" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empleado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nomina" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "fechaPago" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "totalSueldos" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalBonoAlimentacion" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalDeducciones" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalAportesPatronales" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalPrestaciones" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalUtilidades" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalNeto" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "asientoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Nomina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NominaDetalle" (
    "id" TEXT NOT NULL,
    "nominaId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "salarioBase" DECIMAL(18,4) NOT NULL,
    "bonoAlimentacion" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "deduccionIVSS" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "deduccionFAOV" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalDeducciones" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "aportePatronalIVSS" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "aportePatronalFAOV" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "aportePatronalINCES" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "provisionPrestaciones" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "provisionUtilidades" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "netoAPagar" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NominaDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vacacion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "diasDisfrutados" DECIMAL(9,4) NOT NULL,
    "montoVacaciones" DECIMAL(18,4) NOT NULL,
    "montoBonoVacacional" DECIMAL(18,4) NOT NULL,
    "asientoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vacacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Liquidacion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "fechaEgreso" TIMESTAMP(3) NOT NULL,
    "motivoEgreso" TEXT NOT NULL,
    "aniosServicio" DECIMAL(9,4) NOT NULL,
    "salarioIntegralDiario" DECIMAL(18,4) NOT NULL,
    "prestacionesSociales" DECIMAL(18,4) NOT NULL,
    "vacacionesVencidas" DECIMAL(18,4) NOT NULL,
    "vacacionesFraccionadas" DECIMAL(18,4) NOT NULL,
    "bonoVacacionalFraccionado" DECIMAL(18,4) NOT NULL,
    "utilidadesFraccionadas" DECIMAL(18,4) NOT NULL,
    "indemnizacionDespido" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "totalLiquidacion" DECIMAL(18,4) NOT NULL,
    "asientoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Liquidacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivoFijo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cuentaActivoId" TEXT NOT NULL,
    "costoAdquisicion" DECIMAL(18,4) NOT NULL,
    "fechaAdquisicion" TIMESTAMP(3) NOT NULL,
    "vidaUtilMeses" INTEGER NOT NULL,
    "valorResidual" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "metodoDepreciacion" TEXT NOT NULL DEFAULT 'LINEA_RECTA',
    "depreciacionAcumulada" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivoFijo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoDepreciacion" (
    "id" TEXT NOT NULL,
    "activoFijoId" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "montoDepreciado" DECIMAL(18,4) NOT NULL,
    "valorLibroDespues" DECIMAL(18,4) NOT NULL,
    "asientoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoDepreciacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Accionista" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "identificacion" TEXT NOT NULL,
    "numeroAcciones" DECIMAL(18,4) NOT NULL,
    "fechaIngreso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Accionista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActaAsamblea" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tipo" TEXT NOT NULL,
    "lugar" TEXT,
    "agenda" TEXT NOT NULL,
    "acuerdos" TEXT NOT NULL,
    "asistentes" TEXT NOT NULL,
    "accionesRepresentadas" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActaAsamblea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "destinatario" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "entidadId" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "errorMensaje" TEXT,
    "enviadaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Sesion_token_key" ON "Sesion"("token");

-- CreateIndex
CREATE INDEX "Sesion_userId_idx" ON "Sesion"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "organizaciones_empresaId_key" ON "organizaciones"("empresaId");

-- CreateIndex
CREATE INDEX "organizaciones_activo_idx" ON "organizaciones"("activo");

-- CreateIndex
CREATE INDEX "sucursales_organizacionId_activo_idx" ON "sucursales"("organizacionId", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "sucursales_organizacionId_codigo_key" ON "sucursales"("organizacionId", "codigo");

-- CreateIndex
CREATE INDEX "almacenes_organizacionId_sucursalId_activo_idx" ON "almacenes"("organizacionId", "sucursalId", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "almacenes_organizacionId_codigo_key" ON "almacenes"("organizacionId", "codigo");

-- CreateIndex
CREATE INDEX "permisos_modulo_idx" ON "permisos"("modulo");

-- CreateIndex
CREATE UNIQUE INDEX "roles_organizacionId_clave_key" ON "roles"("organizacionId", "clave");

-- CreateIndex
CREATE INDEX "roles_permisos_permisoClave_idx" ON "roles_permisos"("permisoClave");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_organizacion_empleadoId_key" ON "usuarios_organizacion"("empleadoId");

-- CreateIndex
CREATE INDEX "usuarios_organizacion_userId_idx" ON "usuarios_organizacion"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_organizacion_organizacionId_userId_key" ON "usuarios_organizacion"("organizacionId", "userId");

-- CreateIndex
CREATE INDEX "usuarios_sucursales_sucursalId_idx" ON "usuarios_sucursales"("sucursalId");

-- CreateIndex
CREATE INDEX "TasaCambio_empresaId_monedaRef_fecha_idx" ON "TasaCambio"("empresaId", "monedaRef", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "TasaCambio_empresaId_fecha_monedaRef_key" ON "TasaCambio"("empresaId", "fecha", "monedaRef");

-- CreateIndex
CREATE INDEX "bitacora_auditoria_empresaId_createdAt_idx" ON "bitacora_auditoria"("empresaId", "createdAt");

-- CreateIndex
CREATE INDEX "bitacora_auditoria_organizacionId_createdAt_idx" ON "bitacora_auditoria"("organizacionId", "createdAt");

-- CreateIndex
CREATE INDEX "bitacora_auditoria_entidad_entidadId_idx" ON "bitacora_auditoria"("entidad", "entidadId");

-- CreateIndex
CREATE INDEX "unidades_medida_organizacionId_tipo_idx" ON "unidades_medida"("organizacionId", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "unidades_medida_organizacionId_codigo_key" ON "unidades_medida"("organizacionId", "codigo");

-- CreateIndex
CREATE INDEX "categorias_organizacionId_ruta_idx" ON "categorias"("organizacionId", "ruta");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_organizacionId_padreId_nombre_key" ON "categorias"("organizacionId", "padreId", "nombre");

-- CreateIndex
CREATE INDEX "impuestos_organizacionId_tipo_activo_idx" ON "impuestos"("organizacionId", "tipo", "activo");

-- CreateIndex
CREATE INDEX "productos_organizacionId_activo_nombre_idx" ON "productos"("organizacionId", "activo", "nombre");

-- CreateIndex
CREATE INDEX "productos_organizacionId_categoriaId_idx" ON "productos"("organizacionId", "categoriaId");

-- CreateIndex
CREATE INDEX "productos_organizacionId_tipo_idx" ON "productos"("organizacionId", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "productos_organizacionId_sku_key" ON "productos"("organizacionId", "sku");

-- CreateIndex
CREATE INDEX "variantes_productoId_activo_idx" ON "variantes"("productoId", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "variantes_organizacionId_sku_key" ON "variantes"("organizacionId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "variantes_organizacionId_codigoBarras_key" ON "variantes"("organizacionId", "codigoBarras");

-- CreateIndex
CREATE UNIQUE INDEX "atributos_organizacionId_nombre_key" ON "atributos"("organizacionId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "atributos_valores_atributoId_valor_key" ON "atributos_valores"("atributoId", "valor");

-- CreateIndex
CREATE INDEX "variantes_valores_atributoValorId_idx" ON "variantes_valores"("atributoValorId");

-- CreateIndex
CREATE UNIQUE INDEX "listas_precios_organizacionId_nombre_key" ON "listas_precios"("organizacionId", "nombre");

-- CreateIndex
CREATE INDEX "precios_organizacionId_varianteId_listaPrecioId_vigenciaDes_idx" ON "precios"("organizacionId", "varianteId", "listaPrecioId", "vigenciaDesde");

-- CreateIndex
CREATE INDEX "precios_listaPrecioId_vigenciaHasta_idx" ON "precios"("listaPrecioId", "vigenciaHasta");

-- CreateIndex
CREATE INDEX "existencias_organizacionId_almacenId_idx" ON "existencias"("organizacionId", "almacenId");

-- CreateIndex
CREATE UNIQUE INDEX "existencias_varianteId_almacenId_key" ON "existencias"("varianteId", "almacenId");

-- CreateIndex
CREATE INDEX "lotes_organizacionId_fechaVencimiento_idx" ON "lotes"("organizacionId", "fechaVencimiento");

-- CreateIndex
CREATE UNIQUE INDEX "lotes_varianteId_almacenId_codigo_key" ON "lotes"("varianteId", "almacenId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "movimientos_inventario_movimientoReversadoId_key" ON "movimientos_inventario"("movimientoReversadoId");

-- CreateIndex
CREATE INDEX "movimientos_inventario_organizacionId_varianteId_almacenId__idx" ON "movimientos_inventario"("organizacionId", "varianteId", "almacenId", "fecha");

-- CreateIndex
CREATE INDEX "movimientos_inventario_organizacionId_fecha_idx" ON "movimientos_inventario"("organizacionId", "fecha");

-- CreateIndex
CREATE INDEX "movimientos_inventario_ventaId_idx" ON "movimientos_inventario"("ventaId");

-- CreateIndex
CREATE INDEX "movimientos_inventario_compraId_idx" ON "movimientos_inventario"("compraId");

-- CreateIndex
CREATE INDEX "traslados_organizacionId_estado_idx" ON "traslados"("organizacionId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "traslados_organizacionId_numero_key" ON "traslados"("organizacionId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "traslados_detalle_trasladoId_varianteId_key" ON "traslados_detalle"("trasladoId", "varianteId");

-- CreateIndex
CREATE INDEX "tomas_inventario_organizacionId_estado_idx" ON "tomas_inventario"("organizacionId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "tomas_inventario_organizacionId_numero_key" ON "tomas_inventario"("organizacionId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "tomas_inventario_detalle_tomaId_varianteId_key" ON "tomas_inventario_detalle"("tomaId", "varianteId");

-- CreateIndex
CREATE INDEX "proveedores_organizacionId_activo_nombre_idx" ON "proveedores"("organizacionId", "activo", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "proveedores_organizacionId_rif_key" ON "proveedores"("organizacionId", "rif");

-- CreateIndex
CREATE INDEX "ordenes_compra_organizacionId_estado_idx" ON "ordenes_compra"("organizacionId", "estado");

-- CreateIndex
CREATE INDEX "ordenes_compra_proveedorId_idx" ON "ordenes_compra"("proveedorId");

-- CreateIndex
CREATE UNIQUE INDEX "ordenes_compra_organizacionId_numero_key" ON "ordenes_compra"("organizacionId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "ordenes_compra_detalle_ordenCompraId_varianteId_key" ON "ordenes_compra_detalle"("ordenCompraId", "varianteId");

-- CreateIndex
CREATE UNIQUE INDEX "compras_facturaId_key" ON "compras"("facturaId");

-- CreateIndex
CREATE INDEX "compras_organizacionId_fecha_idx" ON "compras"("organizacionId", "fecha");

-- CreateIndex
CREATE INDEX "compras_organizacionId_estado_estadoPago_idx" ON "compras"("organizacionId", "estado", "estadoPago");

-- CreateIndex
CREATE INDEX "compras_proveedorId_fecha_idx" ON "compras"("proveedorId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "compras_organizacionId_numero_key" ON "compras"("organizacionId", "numero");

-- CreateIndex
CREATE INDEX "compras_detalle_compraId_idx" ON "compras_detalle"("compraId");

-- CreateIndex
CREATE INDEX "compras_detalle_varianteId_idx" ON "compras_detalle"("varianteId");

-- CreateIndex
CREATE INDEX "compras_costos_adicionales_compraId_idx" ON "compras_costos_adicionales"("compraId");

-- CreateIndex
CREATE INDEX "clientes_organizacionId_activo_nombre_idx" ON "clientes"("organizacionId", "activo", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_empresaId_rif_key" ON "clientes"("empresaId", "rif");

-- CreateIndex
CREATE INDEX "metodos_pago_organizacionId_activo_orden_idx" ON "metodos_pago"("organizacionId", "activo", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "metodos_pago_organizacionId_codigo_key" ON "metodos_pago"("organizacionId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "ventas_facturaId_key" ON "ventas"("facturaId");

-- CreateIndex
CREATE UNIQUE INDEX "ventas_comandaId_key" ON "ventas"("comandaId");

-- CreateIndex
CREATE INDEX "ventas_organizacionId_fecha_idx" ON "ventas"("organizacionId", "fecha");

-- CreateIndex
CREATE INDEX "ventas_organizacionId_estado_fecha_idx" ON "ventas"("organizacionId", "estado", "fecha");

-- CreateIndex
CREATE INDEX "ventas_organizacionId_sucursalId_fecha_idx" ON "ventas"("organizacionId", "sucursalId", "fecha");

-- CreateIndex
CREATE INDEX "ventas_clienteId_estadoPago_idx" ON "ventas"("clienteId", "estadoPago");

-- CreateIndex
CREATE INDEX "ventas_sesionCajaId_idx" ON "ventas"("sesionCajaId");

-- CreateIndex
CREATE UNIQUE INDEX "ventas_organizacionId_tipoDocumento_serie_numero_key" ON "ventas"("organizacionId", "tipoDocumento", "serie", "numero");

-- CreateIndex
CREATE INDEX "ventas_detalle_ventaId_idx" ON "ventas_detalle"("ventaId");

-- CreateIndex
CREATE INDEX "ventas_detalle_varianteId_idx" ON "ventas_detalle"("varianteId");

-- CreateIndex
CREATE UNIQUE INDEX "pagos_asientoId_key" ON "pagos"("asientoId");

-- CreateIndex
CREATE UNIQUE INDEX "pagos_pagoReversadoId_key" ON "pagos"("pagoReversadoId");

-- CreateIndex
CREATE INDEX "pagos_facturaId_idx" ON "pagos"("facturaId");

-- CreateIndex
CREATE INDEX "pagos_ventaId_idx" ON "pagos"("ventaId");

-- CreateIndex
CREATE INDEX "pagos_compraId_idx" ON "pagos"("compraId");

-- CreateIndex
CREATE INDEX "pagos_empresaId_fecha_idx" ON "pagos"("empresaId", "fecha");

-- CreateIndex
CREATE INDEX "pagos_sesionCajaId_idx" ON "pagos"("sesionCajaId");

-- CreateIndex
CREATE INDEX "apartados_organizacionId_estado_idx" ON "apartados"("organizacionId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "apartados_organizacionId_numero_key" ON "apartados"("organizacionId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "apartados_detalle_apartadoId_varianteId_key" ON "apartados_detalle"("apartadoId", "varianteId");

-- CreateIndex
CREATE INDEX "apartados_abonos_apartadoId_idx" ON "apartados_abonos"("apartadoId");

-- CreateIndex
CREATE INDEX "cajas_organizacionId_sucursalId_activo_idx" ON "cajas"("organizacionId", "sucursalId", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "cajas_organizacionId_codigo_key" ON "cajas"("organizacionId", "codigo");

-- CreateIndex
CREATE INDEX "sesiones_caja_organizacionId_estado_idx" ON "sesiones_caja"("organizacionId", "estado");

-- CreateIndex
CREATE INDEX "sesiones_caja_cajaId_fechaApertura_idx" ON "sesiones_caja"("cajaId", "fechaApertura");

-- CreateIndex
CREATE INDEX "movimientos_caja_sesionCajaId_fecha_idx" ON "movimientos_caja"("sesionCajaId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "arqueos_sesionCajaId_key" ON "arqueos"("sesionCajaId");

-- CreateIndex
CREATE UNIQUE INDEX "arqueos_detalle_arqueoId_metodoPagoId_key" ON "arqueos_detalle"("arqueoId", "metodoPagoId");

-- CreateIndex
CREATE UNIQUE INDEX "cuentas_bancarias_organizacionId_banco_numeroCuenta_key" ON "cuentas_bancarias"("organizacionId", "banco", "numeroCuenta");

-- CreateIndex
CREATE UNIQUE INDEX "movimientos_bancarios_contraparteId_key" ON "movimientos_bancarios"("contraparteId");

-- CreateIndex
CREATE INDEX "movimientos_bancarios_cuentaBancariaId_fecha_idx" ON "movimientos_bancarios"("cuentaBancariaId", "fecha");

-- CreateIndex
CREATE INDEX "movimientos_bancarios_cuentaBancariaId_conciliado_idx" ON "movimientos_bancarios"("cuentaBancariaId", "conciliado");

-- CreateIndex
CREATE INDEX "categorias_gasto_organizacionId_activo_idx" ON "categorias_gasto"("organizacionId", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_gasto_organizacionId_padreId_nombre_key" ON "categorias_gasto"("organizacionId", "padreId", "nombre");

-- CreateIndex
CREATE INDEX "gastos_organizacionId_fecha_idx" ON "gastos"("organizacionId", "fecha");

-- CreateIndex
CREATE INDEX "gastos_organizacionId_categoriaGastoId_fecha_idx" ON "gastos"("organizacionId", "categoriaGastoId", "fecha");

-- CreateIndex
CREATE INDEX "gastos_organizacionId_sucursalId_fecha_idx" ON "gastos"("organizacionId", "sucursalId", "fecha");

-- CreateIndex
CREATE INDEX "gastos_organizacionId_estadoPago_idx" ON "gastos"("organizacionId", "estadoPago");

-- CreateIndex
CREATE UNIQUE INDEX "gastos_organizacionId_numero_key" ON "gastos"("organizacionId", "numero");

-- CreateIndex
CREATE INDEX "gastos_recurrentes_organizacionId_activo_proximaGeneracion_idx" ON "gastos_recurrentes"("organizacionId", "activo", "proximaGeneracion");

-- CreateIndex
CREATE UNIQUE INDEX "areas_sucursalId_nombre_key" ON "areas"("sucursalId", "nombre");

-- CreateIndex
CREATE INDEX "mesas_organizacionId_estado_idx" ON "mesas"("organizacionId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "mesas_organizacionId_codigo_key" ON "mesas"("organizacionId", "codigo");

-- CreateIndex
CREATE INDEX "comandas_organizacionId_estado_idx" ON "comandas"("organizacionId", "estado");

-- CreateIndex
CREATE INDEX "comandas_mesaId_estado_idx" ON "comandas"("mesaId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "comandas_organizacionId_numero_key" ON "comandas"("organizacionId", "numero");

-- CreateIndex
CREATE INDEX "comandas_detalle_comandaId_idx" ON "comandas_detalle"("comandaId");

-- CreateIndex
CREATE INDEX "recetas_organizacionId_activo_idx" ON "recetas"("organizacionId", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "recetas_productoId_key" ON "recetas"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "recetas_detalle_recetaId_varianteId_key" ON "recetas_detalle"("recetaId", "varianteId");

-- CreateIndex
CREATE UNIQUE INDEX "grupos_modificador_organizacionId_nombre_key" ON "grupos_modificador"("organizacionId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "modificadores_grupoId_nombre_key" ON "modificadores"("grupoId", "nombre");

-- CreateIndex
CREATE INDEX "grupos_modificador_productos_productoId_idx" ON "grupos_modificador_productos"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "comandas_detalle_modificadores_comandaDetalleId_modificador_key" ON "comandas_detalle_modificadores"("comandaDetalleId", "modificadorId");

-- CreateIndex
CREATE UNIQUE INDEX "ventas_detalle_modificadores_ventaDetalleId_modificadorId_key" ON "ventas_detalle_modificadores"("ventaDetalleId", "modificadorId");

-- CreateIndex
CREATE UNIQUE INDEX "temporadas_organizacionId_nombre_key" ON "temporadas"("organizacionId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_rif_key" ON "Empresa"("rif");

-- CreateIndex
CREATE UNIQUE INDEX "UserEmpresa_userId_empresaId_key" ON "UserEmpresa"("userId", "empresaId");

-- CreateIndex
CREATE INDEX "Cuenta_empresaId_uso_idx" ON "Cuenta"("empresaId", "uso");

-- CreateIndex
CREATE UNIQUE INDEX "Cuenta_empresaId_codigo_key" ON "Cuenta"("empresaId", "codigo");

-- CreateIndex
CREATE INDEX "Factura_empresaId_tipo_fechaEmision_idx" ON "Factura"("empresaId", "tipo", "fechaEmision");

-- CreateIndex
CREATE INDEX "Factura_empresaId_ncf_idx" ON "Factura"("empresaId", "ncf");

-- CreateIndex
CREATE UNIQUE INDEX "Asiento_facturaId_key" ON "Asiento"("facturaId");

-- CreateIndex
CREATE INDEX "Asiento_empresaId_fecha_idx" ON "Asiento"("empresaId", "fecha");

-- CreateIndex
CREATE INDEX "Asiento_empresaId_numero_idx" ON "Asiento"("empresaId", "numero");

-- CreateIndex
CREATE INDEX "AsientoLinea_asientoId_idx" ON "AsientoLinea"("asientoId");

-- CreateIndex
CREATE INDEX "AsientoLinea_cuentaId_idx" ON "AsientoLinea"("cuentaId");

-- CreateIndex
CREATE INDEX "Ejercicio_empresaId_estado_idx" ON "Ejercicio"("empresaId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "Ejercicio_empresaId_ano_key" ON "Ejercicio"("empresaId", "ano");

-- CreateIndex
CREATE INDEX "ConciliacionBanco_empresaId_mes_ano_idx" ON "ConciliacionBanco"("empresaId", "mes", "ano");

-- CreateIndex
CREATE UNIQUE INDEX "ConciliacionBanco_empresaId_cuentaId_mes_ano_key" ON "ConciliacionBanco"("empresaId", "cuentaId", "mes", "ano");

-- CreateIndex
CREATE INDEX "MovimientoBanco_conciliacionId_idx" ON "MovimientoBanco"("conciliacionId");

-- CreateIndex
CREATE INDEX "MovimientoBanco_conciliacionId_conciliado_idx" ON "MovimientoBanco"("conciliacionId", "conciliado");

-- CreateIndex
CREATE UNIQUE INDEX "SecuenciaDocumento_empresaId_tipo_key" ON "SecuenciaDocumento"("empresaId", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "IndiceInflacion_empresaId_mes_ano_key" ON "IndiceInflacion"("empresaId", "mes", "ano");

-- CreateIndex
CREATE UNIQUE INDEX "AjusteInflacion_empresaId_mes_ano_key" ON "AjusteInflacion"("empresaId", "mes", "ano");

-- CreateIndex
CREATE UNIQUE INDEX "Empleado_empresaId_cedula_key" ON "Empleado"("empresaId", "cedula");

-- CreateIndex
CREATE UNIQUE INDEX "Nomina_empresaId_mes_ano_key" ON "Nomina"("empresaId", "mes", "ano");

-- CreateIndex
CREATE INDEX "NominaDetalle_nominaId_idx" ON "NominaDetalle"("nominaId");

-- CreateIndex
CREATE UNIQUE INDEX "NominaDetalle_nominaId_empleadoId_key" ON "NominaDetalle"("nominaId", "empleadoId");

-- CreateIndex
CREATE UNIQUE INDEX "Vacacion_asientoId_key" ON "Vacacion"("asientoId");

-- CreateIndex
CREATE INDEX "Vacacion_empleadoId_idx" ON "Vacacion"("empleadoId");

-- CreateIndex
CREATE UNIQUE INDEX "Liquidacion_empleadoId_key" ON "Liquidacion"("empleadoId");

-- CreateIndex
CREATE UNIQUE INDEX "Liquidacion_asientoId_key" ON "Liquidacion"("asientoId");

-- CreateIndex
CREATE INDEX "ActivoFijo_empresaId_estado_idx" ON "ActivoFijo"("empresaId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "MovimientoDepreciacion_activoFijoId_mes_ano_key" ON "MovimientoDepreciacion"("activoFijoId", "mes", "ano");

-- CreateIndex
CREATE UNIQUE INDEX "Accionista_empresaId_identificacion_key" ON "Accionista"("empresaId", "identificacion");

-- CreateIndex
CREATE UNIQUE INDEX "ActaAsamblea_empresaId_numero_key" ON "ActaAsamblea"("empresaId", "numero");

-- CreateIndex
CREATE INDEX "Notificacion_empresaId_estado_idx" ON "Notificacion"("empresaId", "estado");

-- AddForeignKey
ALTER TABLE "Sesion" ADD CONSTRAINT "Sesion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizaciones" ADD CONSTRAINT "organizaciones_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sucursales" ADD CONSTRAINT "sucursales_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacenes" ADD CONSTRAINT "almacenes_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacenes" ADD CONSTRAINT "almacenes_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "sucursales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles_permisos" ADD CONSTRAINT "roles_permisos_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles_permisos" ADD CONSTRAINT "roles_permisos_permisoClave_fkey" FOREIGN KEY ("permisoClave") REFERENCES "permisos"("clave") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_organizacion" ADD CONSTRAINT "usuarios_organizacion_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_organizacion" ADD CONSTRAINT "usuarios_organizacion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_organizacion" ADD CONSTRAINT "usuarios_organizacion_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_organizacion" ADD CONSTRAINT "usuarios_organizacion_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_sucursales" ADD CONSTRAINT "usuarios_sucursales_membresiaId_fkey" FOREIGN KEY ("membresiaId") REFERENCES "usuarios_organizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_sucursales" ADD CONSTRAINT "usuarios_sucursales_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "sucursales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TasaCambio" ADD CONSTRAINT "TasaCambio_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bitacora_auditoria" ADD CONSTRAINT "bitacora_auditoria_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bitacora_auditoria" ADD CONSTRAINT "bitacora_auditoria_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidades_medida" ADD CONSTRAINT "unidades_medida_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidades_medida" ADD CONSTRAINT "unidades_medida_unidadBaseId_fkey" FOREIGN KEY ("unidadBaseId") REFERENCES "unidades_medida"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_padreId_fkey" FOREIGN KEY ("padreId") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impuestos" ADD CONSTRAINT "impuestos_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_unidadVentaId_fkey" FOREIGN KEY ("unidadVentaId") REFERENCES "unidades_medida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_unidadCompraId_fkey" FOREIGN KEY ("unidadCompraId") REFERENCES "unidades_medida"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_impuestoId_fkey" FOREIGN KEY ("impuestoId") REFERENCES "impuestos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_temporadaId_fkey" FOREIGN KEY ("temporadaId") REFERENCES "temporadas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variantes" ADD CONSTRAINT "variantes_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variantes" ADD CONSTRAINT "variantes_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atributos" ADD CONSTRAINT "atributos_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atributos_valores" ADD CONSTRAINT "atributos_valores_atributoId_fkey" FOREIGN KEY ("atributoId") REFERENCES "atributos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variantes_valores" ADD CONSTRAINT "variantes_valores_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "variantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variantes_valores" ADD CONSTRAINT "variantes_valores_atributoValorId_fkey" FOREIGN KEY ("atributoValorId") REFERENCES "atributos_valores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listas_precios" ADD CONSTRAINT "listas_precios_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "precios" ADD CONSTRAINT "precios_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "precios" ADD CONSTRAINT "precios_listaPrecioId_fkey" FOREIGN KEY ("listaPrecioId") REFERENCES "listas_precios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "precios" ADD CONSTRAINT "precios_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "variantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "existencias" ADD CONSTRAINT "existencias_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "existencias" ADD CONSTRAINT "existencias_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "variantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "existencias" ADD CONSTRAINT "existencias_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES "almacenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "variantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES "almacenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "variantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES "almacenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "lotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "compras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_trasladoId_fkey" FOREIGN KEY ("trasladoId") REFERENCES "traslados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_tomaId_fkey" FOREIGN KEY ("tomaId") REFERENCES "tomas_inventario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_movimientoReversadoId_fkey" FOREIGN KEY ("movimientoReversadoId") REFERENCES "movimientos_inventario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traslados" ADD CONSTRAINT "traslados_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traslados" ADD CONSTRAINT "traslados_almacenOrigenId_fkey" FOREIGN KEY ("almacenOrigenId") REFERENCES "almacenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traslados" ADD CONSTRAINT "traslados_almacenDestinoId_fkey" FOREIGN KEY ("almacenDestinoId") REFERENCES "almacenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traslados_detalle" ADD CONSTRAINT "traslados_detalle_trasladoId_fkey" FOREIGN KEY ("trasladoId") REFERENCES "traslados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traslados_detalle" ADD CONSTRAINT "traslados_detalle_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "variantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tomas_inventario" ADD CONSTRAINT "tomas_inventario_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tomas_inventario" ADD CONSTRAINT "tomas_inventario_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tomas_inventario" ADD CONSTRAINT "tomas_inventario_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES "almacenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tomas_inventario_detalle" ADD CONSTRAINT "tomas_inventario_detalle_tomaId_fkey" FOREIGN KEY ("tomaId") REFERENCES "tomas_inventario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tomas_inventario_detalle" ADD CONSTRAINT "tomas_inventario_detalle_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "variantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedores" ADD CONSTRAINT "proveedores_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_compra_detalle" ADD CONSTRAINT "ordenes_compra_detalle_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "ordenes_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_compra_detalle" ADD CONSTRAINT "ordenes_compra_detalle_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "variantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES "almacenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "ordenes_compra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "Factura"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_compraOrigenId_fkey" FOREIGN KEY ("compraOrigenId") REFERENCES "compras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras_detalle" ADD CONSTRAINT "compras_detalle_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "compras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras_detalle" ADD CONSTRAINT "compras_detalle_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "variantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras_detalle" ADD CONSTRAINT "compras_detalle_impuestoId_fkey" FOREIGN KEY ("impuestoId") REFERENCES "impuestos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras_costos_adicionales" ADD CONSTRAINT "compras_costos_adicionales_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "compras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metodos_pago" ADD CONSTRAINT "metodos_pago_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metodos_pago" ADD CONSTRAINT "metodos_pago_cuentaBancariaId_fkey" FOREIGN KEY ("cuentaBancariaId") REFERENCES "cuentas_bancarias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_almacenId_fkey" FOREIGN KEY ("almacenId") REFERENCES "almacenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_sesionCajaId_fkey" FOREIGN KEY ("sesionCajaId") REFERENCES "sesiones_caja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_listaPrecioId_fkey" FOREIGN KEY ("listaPrecioId") REFERENCES "listas_precios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "Factura"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "mesas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "comandas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_ventaOrigenId_fkey" FOREIGN KEY ("ventaOrigenId") REFERENCES "ventas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas_detalle" ADD CONSTRAINT "ventas_detalle_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas_detalle" ADD CONSTRAINT "ventas_detalle_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "variantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas_detalle" ADD CONSTRAINT "ventas_detalle_impuestoId_fkey" FOREIGN KEY ("impuestoId") REFERENCES "impuestos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "Factura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "compras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_metodoPagoId_fkey" FOREIGN KEY ("metodoPagoId") REFERENCES "metodos_pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_sesionCajaId_fkey" FOREIGN KEY ("sesionCajaId") REFERENCES "sesiones_caja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_pagoReversadoId_fkey" FOREIGN KEY ("pagoReversadoId") REFERENCES "pagos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apartados" ADD CONSTRAINT "apartados_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apartados" ADD CONSTRAINT "apartados_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apartados_detalle" ADD CONSTRAINT "apartados_detalle_apartadoId_fkey" FOREIGN KEY ("apartadoId") REFERENCES "apartados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apartados_detalle" ADD CONSTRAINT "apartados_detalle_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "variantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apartados_abonos" ADD CONSTRAINT "apartados_abonos_apartadoId_fkey" FOREIGN KEY ("apartadoId") REFERENCES "apartados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apartados_abonos" ADD CONSTRAINT "apartados_abonos_metodoPagoId_fkey" FOREIGN KEY ("metodoPagoId") REFERENCES "metodos_pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apartados_abonos" ADD CONSTRAINT "apartados_abonos_sesionCajaId_fkey" FOREIGN KEY ("sesionCajaId") REFERENCES "sesiones_caja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas" ADD CONSTRAINT "cajas_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cajas" ADD CONSTRAINT "cajas_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "sucursales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_caja" ADD CONSTRAINT "sesiones_caja_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_caja" ADD CONSTRAINT "sesiones_caja_cajaId_fkey" FOREIGN KEY ("cajaId") REFERENCES "cajas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_caja" ADD CONSTRAINT "sesiones_caja_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_caja" ADD CONSTRAINT "movimientos_caja_sesionCajaId_fkey" FOREIGN KEY ("sesionCajaId") REFERENCES "sesiones_caja"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arqueos" ADD CONSTRAINT "arqueos_sesionCajaId_fkey" FOREIGN KEY ("sesionCajaId") REFERENCES "sesiones_caja"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arqueos" ADD CONSTRAINT "arqueos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arqueos_detalle" ADD CONSTRAINT "arqueos_detalle_arqueoId_fkey" FOREIGN KEY ("arqueoId") REFERENCES "arqueos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arqueos_detalle" ADD CONSTRAINT "arqueos_detalle_metodoPagoId_fkey" FOREIGN KEY ("metodoPagoId") REFERENCES "metodos_pago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuentas_bancarias" ADD CONSTRAINT "cuentas_bancarias_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_bancarios" ADD CONSTRAINT "movimientos_bancarios_cuentaBancariaId_fkey" FOREIGN KEY ("cuentaBancariaId") REFERENCES "cuentas_bancarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_bancarios" ADD CONSTRAINT "movimientos_bancarios_contraparteId_fkey" FOREIGN KEY ("contraparteId") REFERENCES "movimientos_bancarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias_gasto" ADD CONSTRAINT "categorias_gasto_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias_gasto" ADD CONSTRAINT "categorias_gasto_padreId_fkey" FOREIGN KEY ("padreId") REFERENCES "categorias_gasto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_categoriaGastoId_fkey" FOREIGN KEY ("categoriaGastoId") REFERENCES "categorias_gasto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_sesionCajaId_fkey" FOREIGN KEY ("sesionCajaId") REFERENCES "sesiones_caja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_cuentaBancariaId_fkey" FOREIGN KEY ("cuentaBancariaId") REFERENCES "cuentas_bancarias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_gastoRecurrenteId_fkey" FOREIGN KEY ("gastoRecurrenteId") REFERENCES "gastos_recurrentes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos_recurrentes" ADD CONSTRAINT "gastos_recurrentes_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos_recurrentes" ADD CONSTRAINT "gastos_recurrentes_categoriaGastoId_fkey" FOREIGN KEY ("categoriaGastoId") REFERENCES "categorias_gasto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "sucursales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mesas" ADD CONSTRAINT "mesas_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mesas" ADD CONSTRAINT "mesas_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comandas" ADD CONSTRAINT "comandas_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comandas" ADD CONSTRAINT "comandas_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "mesas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comandas" ADD CONSTRAINT "comandas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comandas" ADD CONSTRAINT "comandas_comandaPadreId_fkey" FOREIGN KEY ("comandaPadreId") REFERENCES "comandas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comandas_detalle" ADD CONSTRAINT "comandas_detalle_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "comandas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comandas_detalle" ADD CONSTRAINT "comandas_detalle_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "variantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recetas" ADD CONSTRAINT "recetas_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recetas" ADD CONSTRAINT "recetas_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recetas_detalle" ADD CONSTRAINT "recetas_detalle_recetaId_fkey" FOREIGN KEY ("recetaId") REFERENCES "recetas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recetas_detalle" ADD CONSTRAINT "recetas_detalle_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "variantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recetas_detalle" ADD CONSTRAINT "recetas_detalle_unidadMedidaId_fkey" FOREIGN KEY ("unidadMedidaId") REFERENCES "unidades_medida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupos_modificador" ADD CONSTRAINT "grupos_modificador_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modificadores" ADD CONSTRAINT "modificadores_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "grupos_modificador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupos_modificador_productos" ADD CONSTRAINT "grupos_modificador_productos_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "grupos_modificador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupos_modificador_productos" ADD CONSTRAINT "grupos_modificador_productos_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comandas_detalle_modificadores" ADD CONSTRAINT "comandas_detalle_modificadores_comandaDetalleId_fkey" FOREIGN KEY ("comandaDetalleId") REFERENCES "comandas_detalle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comandas_detalle_modificadores" ADD CONSTRAINT "comandas_detalle_modificadores_modificadorId_fkey" FOREIGN KEY ("modificadorId") REFERENCES "modificadores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas_detalle_modificadores" ADD CONSTRAINT "ventas_detalle_modificadores_ventaDetalleId_fkey" FOREIGN KEY ("ventaDetalleId") REFERENCES "ventas_detalle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas_detalle_modificadores" ADD CONSTRAINT "ventas_detalle_modificadores_modificadorId_fkey" FOREIGN KEY ("modificadorId") REFERENCES "modificadores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temporadas" ADD CONSTRAINT "temporadas_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEmpresa" ADD CONSTRAINT "UserEmpresa_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEmpresa" ADD CONSTRAINT "UserEmpresa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cuenta" ADD CONSTRAINT "Cuenta_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asiento" ADD CONSTRAINT "Asiento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asiento" ADD CONSTRAINT "Asiento_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asiento" ADD CONSTRAINT "Asiento_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "Factura"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsientoLinea" ADD CONSTRAINT "AsientoLinea_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "Cuenta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsientoLinea" ADD CONSTRAINT "AsientoLinea_asientoId_fkey" FOREIGN KEY ("asientoId") REFERENCES "Asiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ejercicio" ADD CONSTRAINT "Ejercicio_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConciliacionBanco" ADD CONSTRAINT "ConciliacionBanco_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConciliacionBanco" ADD CONSTRAINT "ConciliacionBanco_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "Cuenta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoBanco" ADD CONSTRAINT "MovimientoBanco_conciliacionId_fkey" FOREIGN KEY ("conciliacionId") REFERENCES "ConciliacionBanco"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecuenciaDocumento" ADD CONSTRAINT "SecuenciaDocumento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndiceInflacion" ADD CONSTRAINT "IndiceInflacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AjusteInflacion" ADD CONSTRAINT "AjusteInflacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Empleado" ADD CONSTRAINT "Empleado_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nomina" ADD CONSTRAINT "Nomina_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NominaDetalle" ADD CONSTRAINT "NominaDetalle_nominaId_fkey" FOREIGN KEY ("nominaId") REFERENCES "Nomina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NominaDetalle" ADD CONSTRAINT "NominaDetalle_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vacacion" ADD CONSTRAINT "Vacacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vacacion" ADD CONSTRAINT "Vacacion_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Liquidacion" ADD CONSTRAINT "Liquidacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Liquidacion" ADD CONSTRAINT "Liquidacion_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivoFijo" ADD CONSTRAINT "ActivoFijo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoDepreciacion" ADD CONSTRAINT "MovimientoDepreciacion_activoFijoId_fkey" FOREIGN KEY ("activoFijoId") REFERENCES "ActivoFijo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Accionista" ADD CONSTRAINT "Accionista_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActaAsamblea" ADD CONSTRAINT "ActaAsamblea_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
