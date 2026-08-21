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
    "rif" TEXT NOT NULL,
    "razonSocial" TEXT,
    "direccion" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "paisFiscal" TEXT NOT NULL DEFAULT 'VE',
    "esContribuyenteEspecial" BOOLEAN NOT NULL DEFAULT false,
    "esAgenteRetencionIVA" BOOLEAN NOT NULL DEFAULT false,
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
CREATE TABLE "secuencias_operativas" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "serie" TEXT NOT NULL DEFAULT 'A',
    "siguienteNumero" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "secuencias_operativas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasas_cambio" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "monedaRef" TEXT NOT NULL DEFAULT 'USD',
    "tasa" DECIMAL(18,8) NOT NULL,
    "fuente" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasas_cambio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bitacora_auditoria" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
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
    "organizacionId" TEXT NOT NULL,
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
    "organizacionId" TEXT NOT NULL,
    "ventaId" TEXT,
    "compraId" TEXT,
    "userId" TEXT NOT NULL,
    "monto" DECIMAL(18,4) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'VES',
    "tasaCambio" DECIMAL(18,8),
    "montoMonedaFuncional" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metodoPagoId" TEXT,
    "referencia" TEXT,
    "montoIGTF" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "sesionCajaId" TEXT,
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
CREATE TABLE "empleados" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cargo" TEXT,
    "telefono" TEXT,
    "fechaIngreso" DATE NOT NULL,
    "fechaEgreso" DATE,
    "porcentajeComision" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "empleados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adelantos_empleado" (
    "id" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'ADELANTO',
    "monto" DECIMAL(18,4) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'VES',
    "saldoPendiente" DECIMAL(18,4) NOT NULL,
    "concepto" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adelantos_empleado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "entidadId" TEXT,
    "destinatario" TEXT,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "errorMensaje" TEXT,
    "enviadaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Sesion_token_key" ON "Sesion"("token");

-- CreateIndex
CREATE INDEX "Sesion_userId_idx" ON "Sesion"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "organizaciones_rif_key" ON "organizaciones"("rif");

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
CREATE UNIQUE INDEX "secuencias_operativas_organizacionId_tipo_serie_key" ON "secuencias_operativas"("organizacionId", "tipo", "serie");

-- CreateIndex
CREATE INDEX "tasas_cambio_organizacionId_monedaRef_fecha_idx" ON "tasas_cambio"("organizacionId", "monedaRef", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "tasas_cambio_organizacionId_fecha_monedaRef_key" ON "tasas_cambio"("organizacionId", "fecha", "monedaRef");

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
CREATE UNIQUE INDEX "clientes_organizacionId_rif_key" ON "clientes"("organizacionId", "rif");

-- CreateIndex
CREATE INDEX "metodos_pago_organizacionId_activo_orden_idx" ON "metodos_pago"("organizacionId", "activo", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "metodos_pago_organizacionId_codigo_key" ON "metodos_pago"("organizacionId", "codigo");

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
CREATE UNIQUE INDEX "pagos_pagoReversadoId_key" ON "pagos"("pagoReversadoId");

-- CreateIndex
CREATE INDEX "pagos_ventaId_idx" ON "pagos"("ventaId");

-- CreateIndex
CREATE INDEX "pagos_compraId_idx" ON "pagos"("compraId");

-- CreateIndex
CREATE INDEX "pagos_organizacionId_fecha_idx" ON "pagos"("organizacionId", "fecha");

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
CREATE INDEX "empleados_organizacionId_activo_idx" ON "empleados"("organizacionId", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "empleados_organizacionId_cedula_key" ON "empleados"("organizacionId", "cedula");

-- CreateIndex
CREATE INDEX "adelantos_empleado_empleadoId_idx" ON "adelantos_empleado"("empleadoId");

-- CreateIndex
CREATE INDEX "notificaciones_organizacionId_estado_idx" ON "notificaciones"("organizacionId", "estado");

-- CreateIndex
CREATE INDEX "notificaciones_organizacionId_leida_createdAt_idx" ON "notificaciones"("organizacionId", "leida", "createdAt");

-- AddForeignKey
ALTER TABLE "Sesion" ADD CONSTRAINT "Sesion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "usuarios_organizacion" ADD CONSTRAINT "usuarios_organizacion_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_sucursales" ADD CONSTRAINT "usuarios_sucursales_membresiaId_fkey" FOREIGN KEY ("membresiaId") REFERENCES "usuarios_organizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_sucursales" ADD CONSTRAINT "usuarios_sucursales_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "sucursales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secuencias_operativas" ADD CONSTRAINT "secuencias_operativas_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasas_cambio" ADD CONSTRAINT "tasas_cambio_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adelantos_empleado" ADD CONSTRAINT "adelantos_empleado_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
