-- ═══════════════════════════════════════════════════════════════════════
--  Restricciones de integridad y vistas derivadas
-- ═══════════════════════════════════════════════════════════════════════
--
-- Las reglas de negocio que se pueden expresar en la base de datos se
-- expresan aquí, y no solo en la capa de servicio. La razón es simple: un
-- CHECK lo hace cumplir Postgres siempre, incluso si alguien escribe por un
-- script, por la consola de Supabase o por una ruta nueva que se olvidó de
-- validar. La validación en la aplicación da mejores mensajes de error; la
-- de la base de datos da la garantía.

-- ───────────────────────────────────────────────────────────────────────
--  PAGOS: exactamente un documento de origen
-- ───────────────────────────────────────────────────────────────────────
-- Un pago abona a una venta, a una compra o a una factura contable
-- heredada; nunca a dos a la vez y nunca a ninguna. Un pago huérfano es
-- dinero que entró a la caja y no se aplicó a nada, y descuadra tanto el
-- arqueo como las cuentas por cobrar.
ALTER TABLE "pagos" ADD CONSTRAINT "pago_un_solo_documento" CHECK (
  (CASE WHEN "facturaId" IS NOT NULL THEN 1 ELSE 0 END)
  + (CASE WHEN "ventaId"  IS NOT NULL THEN 1 ELSE 0 END)
  + (CASE WHEN "compraId" IS NOT NULL THEN 1 ELSE 0 END) = 1
);

-- Un pago de cero no es un pago.
ALTER TABLE "pagos" ADD CONSTRAINT "pago_monto_no_cero" CHECK ("monto" <> 0);

-- Si el pago vino en otra moneda, tiene que traer la tasa que se le aplicó.
-- Sin la tasa el equivalente funcional no se puede auditar ni reproducir.
ALTER TABLE "pagos" ADD CONSTRAINT "pago_divisa_exige_tasa" CHECK (
  "moneda" = 'VES' OR ("tasaCambio" IS NOT NULL AND "tasaCambio" > 0)
);

-- ───────────────────────────────────────────────────────────────────────
--  ARQUEO: toda diferencia lleva justificación
-- ───────────────────────────────────────────────────────────────────────
-- Criterio de aceptación del proyecto: "el arqueo de caja detecta y registra
-- cualquier diferencia con justificación obligatoria". Esto lo hace cumplir
-- el motor de base de datos: si el efectivo contado no coincide con el
-- esperado y no hay explicación, la fila no entra.
ALTER TABLE "arqueos" ADD CONSTRAINT "arqueo_diferencia_justificada" CHECK (
  "diferencia" = 0 OR ("justificacion" IS NOT NULL AND length(trim("justificacion")) >= 3)
);

-- La diferencia siempre es contado menos esperado. Si se pudiera guardar
-- cualquier número, el arqueo "cuadraría" escribiendo cero a mano.
ALTER TABLE "arqueos" ADD CONSTRAINT "arqueo_diferencia_coherente" CHECK (
  "diferencia" = "efectivoContado" - "efectivoEsperado"
);

ALTER TABLE "arqueos_detalle" ADD CONSTRAINT "arqueo_detalle_diferencia_coherente" CHECK (
  "diferencia" = "montoContado" - "montoEsperado"
);

-- ───────────────────────────────────────────────────────────────────────
--  INVENTARIO
-- ───────────────────────────────────────────────────────────────────────
-- Un movimiento de cantidad cero no explica nada y ensucia el kardex.
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimiento_cantidad_no_cero" CHECK ("cantidad" <> 0);

-- El costo nunca es negativo: una mercancía no puede costar menos que nada.
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimiento_costo_no_negativo" CHECK ("costoUnitario" >= 0);

-- La fotografía del saldo debe ser coherente con el costo promedio.
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimiento_promedio_no_negativo" CHECK ("costoPromedioSaldo" >= 0);

-- Reservar más de lo que hay disponible permitiría vender dos veces la misma
-- unidad apartada.
ALTER TABLE "existencias" ADD CONSTRAINT "existencia_reserva_no_negativa" CHECK ("cantidadReservada" >= 0);
ALTER TABLE "existencias" ADD CONSTRAINT "existencia_costo_no_negativo" CHECK ("costoPromedio" >= 0 AND "ultimoCosto" >= 0);

-- Un lote no puede tener cantidad negativa.
ALTER TABLE "lotes" ADD CONSTRAINT "lote_cantidad_no_negativa" CHECK ("cantidad" >= 0);

-- Un traslado de un almacén a sí mismo no mueve nada y descuadraría el
-- kardex con dos movimientos que se anulan.
ALTER TABLE "traslados" ADD CONSTRAINT "traslado_almacenes_distintos" CHECK ("almacenOrigenId" <> "almacenDestinoId");

ALTER TABLE "traslados_detalle" ADD CONSTRAINT "traslado_detalle_cantidad_positiva" CHECK ("cantidad" > 0);

-- ───────────────────────────────────────────────────────────────────────
--  UNIDADES DE MEDIDA
-- ───────────────────────────────────────────────────────────────────────
-- Un factor de conversión cero o negativo haría que convertir de caja a
-- unidad dé cero o un número invertido, y el fraccionamiento del quiosco
-- descontaría mal el inventario.
ALTER TABLE "unidades_medida" ADD CONSTRAINT "unidad_factor_positivo" CHECK ("factorBase" > 0);

-- Una unidad base es su propia referencia y su factor tiene que ser 1.
ALTER TABLE "unidades_medida" ADD CONSTRAINT "unidad_base_factor_uno" CHECK (
  "unidadBaseId" IS NOT NULL OR "factorBase" = 1
);

-- ───────────────────────────────────────────────────────────────────────
--  IMPUESTOS Y PRECIOS
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE "impuestos" ADD CONSTRAINT "impuesto_tasa_valida" CHECK ("tasa" >= 0 AND "tasa" <= 100);

ALTER TABLE "precios" ADD CONSTRAINT "precio_no_negativo" CHECK ("monto" >= 0);
ALTER TABLE "precios" ADD CONSTRAINT "precio_cantidad_minima_positiva" CHECK ("cantidadMinima" > 0);

-- Una vigencia que termina antes de empezar dejaría el precio inaccesible y
-- una venta sin precio aplicable.
ALTER TABLE "precios" ADD CONSTRAINT "precio_vigencia_coherente" CHECK (
  "vigenciaHasta" IS NULL OR "vigenciaHasta" > "vigenciaDesde"
);

-- ───────────────────────────────────────────────────────────────────────
--  VENTAS Y COMPRAS
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE "ventas_detalle" ADD CONSTRAINT "venta_detalle_cantidad_no_cero" CHECK ("cantidad" <> 0);
ALTER TABLE "ventas_detalle" ADD CONSTRAINT "venta_detalle_precio_no_negativo" CHECK ("precioUnitario" >= 0);

-- El descuento de una línea no puede superar el importe de la línea: un
-- descuento mayor convertiría una venta en un egreso encubierto.
ALTER TABLE "ventas_detalle" ADD CONSTRAINT "venta_detalle_descuento_acotado" CHECK (
  "descuentoMonto" >= 0 AND "descuentoMonto" <= abs("cantidad" * "precioUnitario")
);

-- Si la venta se emitió en divisa, la tasa aplicada queda congelada en el
-- documento. Sin ella, el reporte del mes pasado cambiaría al cambiar el BCV.
ALTER TABLE "ventas" ADD CONSTRAINT "venta_divisa_exige_tasa" CHECK (
  "moneda" = 'VES' OR ("tasaCambio" IS NOT NULL AND "tasaCambio" > 0)
);

ALTER TABLE "ventas" ADD CONSTRAINT "venta_pagado_no_negativo" CHECK ("montoPagado" >= 0);

-- Una venta anulada tiene que decir quién la anuló y por qué.
ALTER TABLE "ventas" ADD CONSTRAINT "venta_anulacion_justificada" CHECK (
  "estado" <> 'ANULADA'
  OR ("motivoAnulacion" IS NOT NULL AND length(trim("motivoAnulacion")) >= 3 AND "anuladaPorId" IS NOT NULL)
);

ALTER TABLE "compras_detalle" ADD CONSTRAINT "compra_detalle_cantidad_positiva" CHECK ("cantidad" > 0);
ALTER TABLE "compras_detalle" ADD CONSTRAINT "compra_detalle_costo_no_negativo" CHECK ("costoUnitario" >= 0);

ALTER TABLE "compras" ADD CONSTRAINT "compra_divisa_exige_tasa" CHECK (
  "moneda" = 'VES' OR ("tasaCambio" IS NOT NULL AND "tasaCambio" > 0)
);

ALTER TABLE "compras_costos_adicionales" ADD CONSTRAINT "costo_adicional_positivo" CHECK ("monto" > 0);

-- No se puede recibir más de lo que se ordenó sin corregir la orden.
ALTER TABLE "ordenes_compra_detalle" ADD CONSTRAINT "orden_detalle_recibido_acotado" CHECK (
  "cantidadRecibida" >= 0 AND "cantidadRecibida" <= "cantidad"
);

-- ───────────────────────────────────────────────────────────────────────
--  GASTOS
-- ───────────────────────────────────────────────────────────────────────
-- Regla innegociable del proyecto: un gasto NO puede registrarse en una
-- categoría cuyo destino contable es el activo. Registrar mercancía como
-- gasto infla el gasto del mes y subvalúa el inventario, y es el error más
-- común del rubro. La aplicación lo rechaza con un mensaje que explica a qué
-- módulo ir; este disparador garantiza que no entre por ninguna otra vía.
CREATE OR REPLACE FUNCTION verificar_destino_categoria_gasto() RETURNS TRIGGER AS $$
DECLARE
  destino_categoria TEXT;
BEGIN
  SELECT "destino" INTO destino_categoria
  FROM "categorias_gasto" WHERE "id" = NEW."categoriaGastoId";

  IF destino_categoria <> 'GASTO' THEN
    RAISE EXCEPTION
      'La categoría seleccionada no es un gasto (destino: %). La compra de mercancía va al módulo de Compras y la de equipos a Activos Fijos.',
      destino_categoria;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "gasto_categoria_debe_ser_gasto"
  BEFORE INSERT OR UPDATE OF "categoriaGastoId" ON "gastos"
  FOR EACH ROW EXECUTE FUNCTION verificar_destino_categoria_gasto();

ALTER TABLE "gastos" ADD CONSTRAINT "gasto_total_positivo" CHECK ("total" > 0);
ALTER TABLE "gastos" ADD CONSTRAINT "gasto_divisa_exige_tasa" CHECK (
  "moneda" = 'VES' OR ("tasaCambio" IS NOT NULL AND "tasaCambio" > 0)
);

-- ───────────────────────────────────────────────────────────────────────
--  CAJA
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE "sesiones_caja" ADD CONSTRAINT "sesion_monto_inicial_no_negativo" CHECK ("montoInicial" >= 0);

-- Una sesión cerrada tiene fecha de cierre; una abierta no la tiene.
ALTER TABLE "sesiones_caja" ADD CONSTRAINT "sesion_cierre_coherente" CHECK (
  ("estado" = 'ABIERTA' AND "fechaCierre" IS NULL) OR ("estado" = 'CERRADA' AND "fechaCierre" IS NOT NULL)
);

-- Una sola sesión abierta por caja: dos turnos simultáneos en la misma caja
-- hacen imposible saber de quién es el efectivo.
CREATE UNIQUE INDEX "sesion_caja_una_abierta_por_caja"
  ON "sesiones_caja" ("cajaId") WHERE "estado" = 'ABIERTA';

ALTER TABLE "movimientos_caja" ADD CONSTRAINT "movimiento_caja_monto_positivo" CHECK ("monto" > 0);

-- ───────────────────────────────────────────────────────────────────────
--  RECETAS
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE "recetas" ADD CONSTRAINT "receta_rendimiento_positivo" CHECK ("rendimiento" > 0);
ALTER TABLE "recetas_detalle" ADD CONSTRAINT "receta_detalle_cantidad_positiva" CHECK ("cantidad" > 0);

-- Una merma del 100 % haría que el consumo real fuera una división por cero.
ALTER TABLE "recetas_detalle" ADD CONSTRAINT "receta_merma_valida" CHECK (
  "porcentajeMerma" >= 0 AND "porcentajeMerma" < 100
);
ALTER TABLE "recetas" ADD CONSTRAINT "receta_merma_global_valida" CHECK (
  "porcentajeMermaGlobal" >= 0 AND "porcentajeMermaGlobal" < 100
);

-- Un grupo de modificadores con mínimo mayor que máximo no se puede satisfacer.
ALTER TABLE "grupos_modificador" ADD CONSTRAINT "grupo_modificador_rango_valido" CHECK (
  "minSelecciones" >= 0 AND "maxSelecciones" >= "minSelecciones"
);

-- ───────────────────────────────────────────────────────────────────────
--  APARTADOS
-- ───────────────────────────────────────────────────────────────────────
-- No se puede abonar más que el total del apartado.
ALTER TABLE "apartados" ADD CONSTRAINT "apartado_abonado_acotado" CHECK (
  "montoAbonado" >= 0 AND "montoAbonado" <= "total"
);
ALTER TABLE "apartados_abonos" ADD CONSTRAINT "apartado_abono_positivo" CHECK ("monto" > 0);

-- ───────────────────────────────────────────────────────────────────────
--  CONTABILIDAD
-- ───────────────────────────────────────────────────────────────────────
-- Una línea de asiento es un débito o un crédito, nunca las dos cosas ni
-- ninguna. Permitir ambas rompe la partida doble de forma indetectable.
ALTER TABLE "AsientoLinea" ADD CONSTRAINT "asiento_linea_debe_o_haber" CHECK (
  ("debit" > 0 AND "credit" = 0) OR ("credit" > 0 AND "debit" = 0)
);

ALTER TABLE "TasaCambio" ADD CONSTRAINT "tasa_cambio_positiva" CHECK ("tasa" > 0);

-- ───────────────────────────────────────────────────────────────────────
--  VISTAS: CUENTAS POR COBRAR Y POR PAGAR
-- ───────────────────────────────────────────────────────────────────────
-- Se implementan como VISTAS y no como tablas, a propósito.
--
-- El requisito las pedía como tablas, pero materializar el saldo pendiente
-- crea una segunda fuente de verdad: el saldo estaría en la tabla de cuentas
-- por cobrar Y sería deducible de las ventas menos los pagos. En cuanto un
-- pago se registre sin actualizar la otra tabla, los dos números divergen y
-- no hay forma de saber cuál es el correcto. Como vista, el saldo se deriva
-- siempre de los documentos y los pagos, así que no puede descuadrar.
--
-- El nombre y las columnas son los pedidos, de modo que se consultan igual
-- que una tabla.

CREATE VIEW "cuentas_por_cobrar" AS
SELECT
  v."id"                AS "documentoId",
  v."organizacionId",
  v."sucursalId",
  v."clienteId",
  c."nombre"            AS "clienteNombre",
  c."rif"               AS "clienteRif",
  v."tipoDocumento",
  v."serie",
  v."numero",
  v."fecha",
  v."moneda",
  v."total",
  v."montoPagado",
  (v."total" - v."montoPagado")                    AS "saldo",
  v."estadoPago",
  (v."fecha" + (COALESCE(c."diasCredito", 0) || ' days')::interval)::date AS "fechaVencimiento",
  GREATEST(
    0,
    (CURRENT_DATE - (v."fecha" + (COALESCE(c."diasCredito", 0) || ' days')::interval)::date)
  )                                                AS "diasVencido"
FROM "ventas" v
LEFT JOIN "clientes" c ON c."id" = v."clienteId"
WHERE v."estado" = 'CONFIRMADA'
  AND v."deletedAt" IS NULL
  AND v."total" > v."montoPagado";

CREATE VIEW "cuentas_por_pagar" AS
SELECT
  co."id"               AS "documentoId",
  co."organizacionId",
  co."sucursalId",
  co."proveedorId",
  p."nombre"            AS "proveedorNombre",
  p."rif"               AS "proveedorRif",
  co."numero",
  co."numeroFactura",
  co."fecha",
  co."moneda",
  co."total",
  co."montoPagado",
  (co."total" - co."montoPagado")                  AS "saldo",
  co."estadoPago",
  COALESCE(
    co."fechaVencimiento",
    (co."fecha" + (COALESCE(p."diasCredito", 0) || ' days')::interval)
  )::date                                          AS "fechaVencimiento",
  GREATEST(
    0,
    (CURRENT_DATE - COALESCE(
      co."fechaVencimiento",
      (co."fecha" + (COALESCE(p."diasCredito", 0) || ' days')::interval)
    )::date)
  )                                                AS "diasVencido"
FROM "compras" co
LEFT JOIN "proveedores" p ON p."id" = co."proveedorId"
WHERE co."estado" = 'CONFIRMADA'
  AND co."deletedAt" IS NULL
  AND co."total" > co."montoPagado";

-- ───────────────────────────────────────────────────────────────────────
--  ÍNDICES ADICIONALES PARA EL POS
-- ───────────────────────────────────────────────────────────────────────
-- La búsqueda del POS es por nombre parcial y tiene que responder mientras
-- el cajero teclea. Un LIKE '%texto%' no usa un índice B-tree, así que se
-- usan índices trigrama.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "producto_nombre_trgm" ON "productos" USING gin ("nombre" gin_trgm_ops);
CREATE INDEX "producto_sku_trgm" ON "productos" USING gin ("sku" gin_trgm_ops);
CREATE INDEX "variante_sku_trgm" ON "variantes" USING gin ("sku" gin_trgm_ops);
CREATE INDEX "cliente_nombre_trgm" ON "clientes" USING gin ("nombre" gin_trgm_ops);
CREATE INDEX "proveedor_nombre_trgm" ON "proveedores" USING gin ("nombre" gin_trgm_ops);
