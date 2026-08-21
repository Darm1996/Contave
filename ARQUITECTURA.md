# AdminHub — Arquitectura

Sistema de administración de negocios multi-rubro: restaurante, tienda de
ropa, quiosco o cualquier negocio con inventario, ventas, compras y gastos.

Proyecto nuevo. No comparte código ni modelo de datos con nada anterior.

---

## 1. Principio rector

**Un núcleo común + módulos verticales por rubro.** No hay tres sistemas: hay
un motor con comportamientos configurables. Una comanda de restaurante
termina en una `Venta` normal, una receta descuenta del mismo kardex, y la
matriz talla × color de una tienda de ropa es el sistema de variantes que
también usa un quiosco para vender presentaciones distintas del mismo
refresco.

Las prioridades de diseño, en orden y sin empates:

1. Que los números cuadren siempre.
2. Que una persona sin formación contable pueda operarlo.
3. Que sea rápido en el día a día.
4. Que sea bonito.

Cuando dos prioridades chocan, gana la de arriba. Ese orden explica varias
decisiones de este documento que a primera vista parecen exageradas.

---

## 2. Alcance: qué es y qué no es

**Es** un sistema para operar un negocio: saber qué hay en el almacén, cuánto
costó, a cuánto se vende, cuánto entró hoy en la caja y si cuadra.

**No es** un sistema contable. No lleva partida doble, ni plan de cuentas, ni
asientos, ni estados financieros. Esa decisión es deliberada: mezclar la
operación diaria con la contabilidad formal produce un sistema que el cajero
no entiende y el contador no usa. Los datos que este sistema guarda —cada
venta con su impuesto desglosado, cada compra con su proveedor y su RIF— son
exactamente los que un contador necesita para llevar los libros por fuera, y
la Fase 7 los expone como libro de compras y libro de ventas exportables.

### Un núcleo, tres verticales

No hay tres sistemas: hay un motor con comportamientos configurables. Una
comanda de restaurante termina en una `Venta` normal, una receta descuenta del
mismo kardex, y la matriz talla × color de una tienda de ropa es el mismo
sistema de variantes que un quiosco usa para vender presentaciones distintas
del mismo refresco.

### Una sola raíz de tenencia

`Organizacion` es el negocio y su identidad fiscal a la vez: rubro, monedas,
criterio de redondeo, RIF y datos de facturación viven en el mismo registro.
Toda tabla del sistema cuelga de ella, directamente o a través de su documento
padre.

Las alícuotas concretas no viven ahí sino en la tabla `impuestos`, para que
cambiar el IVA sea editar una fila y los documentos ya emitidos conserven la
tasa que se les aplicó.

## 3. La decisión más importante: `Decimal`, no `Float`

Ningún campo de dinero, cantidad, costo, tasa o porcentaje es `Float`. Todos
son `Decimal`. **Esto no es una preferencia de estilo.**

`number` en JavaScript es un flotante binario de doble precisión y no puede
representar `0.10` de forma exacta:

```
0.1 + 0.2                   → 0.30000000000000004
1.1 * 3                     → 3.3000000000000003
0.07 * 100                  → 7.000000000000001
Math.round(1.005 * 100)/100 → 1.00   (no 1.01)
```

Las consecuencias en un sistema administrativo son concretas y caras:

- **El kardex se descuadra.** El costo promedio ponderado se recalcula en cada
  entrada. Con `Float` y redondeo a 2 decimales por paso, el error se acumula
  hasta que la valorización del inventario deja de coincidir con la suma del
  kardex, y nadie puede explicar la diferencia.
- **El arqueo reporta diferencias que no existen.** Un céntimo de error por
  línea, en mil tickets al mes, es un cajero acusado de un faltante que es en
  realidad un defecto del software.
- **El libro de ventas no cuadra**, porque la suma de los IVA de las líneas no
  da el IVA del total del documento, y el desglose que se declara al fisco sale
  de esa suma.

### La convención de precisión

| Precisión | Para qué | Por qué |
|---|---|---|
| `Decimal(18,4)` | Importes de dinero | 4 decimales para que un monto en USD convertido a Bs no pierda céntimos antes del redondeo final |
| `Decimal(18,3)` | Cantidades de inventario | Gramos y mililitros al fraccionar (kg → g, L → ml) |
| `Decimal(18,6)` | Costos unitarios y costo promedio | **Más** precisión que los montos, a propósito (ver abajo) |
| `Decimal(18,8)` | Tasas de cambio y factores | La tasa Bs/USD es grande y precisa; truncarla mueve totales completos |
| `Decimal(7,4)` | Porcentajes y alícuotas | `16.0000` = 16 % |

**Por qué los costos llevan más decimales que el dinero:** el costo promedio
es un valor *intermedio* que se vuelve a usar en el siguiente movimiento.
Redondearlo a 2 decimales en cada entrada es precisamente lo que acumula el
error. El dinero se redondea porque se cobra; el costo promedio no se cobra,
se arrastra.

### La regla del redondeo único

Los cálculos intermedios **no se redondean**. Se acumulan con toda la
precisión disponible y se redondea **una sola vez**, al final, cuando el
número se convierte en un importe cobrable. Toda esa
aritmética vive en `src/lib/nucleo/dinero.ts`, y es el único módulo autorizado
a redondear dinero.

Cuando el total redondeado no coincide con la suma de las líneas redondeadas,
la diferencia se guarda explícita en `Venta.ajusteRedondeo`, para que la suma
de lo que el cliente ve en el ticket dé exactamente el total que pagó.

### La frontera de presentación

`number` solo aparece donde el número deja de ser dinero y pasa a ser algo que
se dibuja: una celda de Excel, un punto de una gráfica, un PDF. Esa conversión
se hace con `aNumero()`, que se llama así justamente para que en una revisión
de código salte a la vista dónde termina la aritmética exacta.

En las respuestas JSON los importes viajan como **string**, no como number: si
viajaran como number, `JSON.parse` en el navegador los devolvería a flotante
binario y se perdería la exactitud que el servidor cuidó en todo el cálculo.

---

## 4. Inventario: el corazón del sistema

### El stock vive en `(Variante, Almacen)`

`Existencia` es la tabla de saldos, con clave única `(varianteId, almacenId)`.
`MovimientoInventario` es el libro.

**Un producto sin variantes declaradas tiene exactamente una variante**
(`esPredeterminada = true`). Se hizo así para que exista **un solo camino de
descuento de stock**. La alternativa —stock en el producto cuando no hay
variantes, y en la variante cuando sí— crea dos caminos, y tarde o temprano
uno de los dos deja de descontar. Un solo camino es la única forma de
garantizar que el inventario no se descuadre.

### El kardex es inmutable

`MovimientoInventario` no tiene `updatedAt` ni borrado lógico, a propósito. Un
error no se corrige editando la fila: se registra una **reversa** que apunta
al original (`movimientoReversadoId`). Así el kardex siempre explica cómo se
llegó al saldo actual, y una auditoría puede reconstruir la existencia a
cualquier fecha pasada.

La reversa se valora al **costo del movimiento original**, no al promedio de
hoy. Si se reversara al costo actual, anular una venta antigua cambiaría la
valorización del inventario y el resultado de un período ya cerrado.

### La existencia es un caché, no la verdad

La verdad es la suma de los movimientos. `Existencia` existe para que el POS
responda en milisegundos en vez de sumar 40.000 filas.
`verificarIntegridadKardex()` compara los dos y reporta cualquier divergencia
en vez de esconderla.

### Concurrencia: el bug que tenía el motor anterior

El motor heredado leía la existencia, calculaba y escribía en tres pasos
separados, **sin transacción**. Dos cajeros vendiendo la última unidad al
mismo tiempo leían "1 disponible" los dos, y la segunda escritura
sobrescribía a la primera: una salida se perdía y el stock quedaba
descuadrado sin ninguna huella.

El motor nuevo hace todo dentro de una transacción con **bloqueo de fila**
(`SELECT ... FOR UPDATE` sobre `existencias`). Es el bug más difícil de
detectar de todo el sistema, porque solo aparece bajo carga y nunca en
pruebas de un solo usuario.

---

## 5. Permisos: dos preguntas distintas

El requisito dice: *"un usuario cajero no puede ver costos ni márgenes por
ninguna vía, incluida la API"*. Cumplirlo exige separar dos cosas que suelen
confundirse:

1. **¿Puede EJECUTAR esta acción?** → `exigirPermiso()`
2. **¿Puede VER este dato?** → `filtrarCostos()`

La segunda es la que se olvida. Un cajero necesita listar productos para
vender, así que darle lectura es inevitable; pero la misma respuesta que le
dice el precio no debe decirle el costo.

Hay **dos barreras**, porque un solo olvido en cualquiera de las dos es una
fuga:

- `seleccionExistencia(ctx)` excluye los costos del `SELECT` de Prisma: el dato
  no sale de Postgres.
- `filtrarCostos(datos, ctx)` limpia la respuesta **recursivamente**. Es
  recursivo a propósito: los costos aparecen anidados (un producto trae sus
  variantes, que traen sus existencias, que traen el costo promedio), y
  filtrar solo el primer nivel dejaría el dato expuesto un nivel más abajo.

Los seis roles (`PROPIETARIO`, `ADMINISTRADOR`, `SUPERVISOR`, `CAJERO`,
`ALMACENISTA`, `CONTADOR`) están definidos de forma **explícita y no por
herencia**, porque los permisos sensibles no siguen la misma escalera que los
operativos: un almacenista ve costos y no puede vender; un cajero vende y no
ve costos.

---

## 6. Reglas que hace cumplir la base de datos

Las reglas que se pueden expresar en SQL se expresan en SQL, además de en la
capa de servicio. La aplicación da mejores mensajes de error; **la base de
datos da la garantía** — un `CHECK` se cumple siempre, incluso si alguien
escribe por un script, por la consola de Supabase o por una ruta nueva que se
olvidó de validar.

Hay 45 restricciones. Las que más importan:

| Regla | Cómo se hace cumplir |
|---|---|
| Toda diferencia de arqueo lleva justificación | `CHECK (diferencia = 0 OR justificacion IS NOT NULL)` |
| La diferencia de arqueo es contado − esperado | `CHECK (diferencia = efectivoContado - efectivoEsperado)` — impide "cuadrar" escribiendo cero |
| Un pago abona a exactamente un documento | `CHECK` de suma de los tres `IS NOT NULL` = 1 |
| Todo documento en divisa guarda su tasa | `CHECK (moneda = 'VES' OR tasaCambio > 0)` |
| Una venta anulada dice quién y por qué | `CHECK` sobre `motivoAnulacion` y `anuladaPorId` |
| Una sola sesión de caja abierta por caja | Índice único parcial `WHERE estado='ABIERTA'` |
| **Un gasto no puede ser compra de inventario** | Disparador `gasto_categoria_debe_ser_gasto` |

Ese último merece explicación, porque es el error más común del rubro:

- Un **gasto** afecta el resultado del período (alquiler, luz, sueldos).
- Una **compra de inventario** afecta el activo: sigue en el almacén y se
  vuelve costo solo cuando se vende.

Registrar mercancía como gasto infla el gasto del mes, subvalúa el inventario
y hace que el margen del negocio parezca peor de lo que es. El módulo de
gastos **no tiene ninguna relación con variantes ni almacenes**: es
estructuralmente incapaz de mover inventario. Y la categoría declara su
destino contable, así que el disparador rechaza el intento con un mensaje que
dice a qué módulo ir.

---

## 7. Cuentas por cobrar y por pagar: vistas, no tablas

El requisito las pedía como tablas. **Se implementaron como vistas SQL**, con
los nombres y columnas pedidos, y esta es la razón:

Materializar el saldo pendiente crea una **segunda fuente de verdad**. El
saldo estaría en la tabla de cuentas por cobrar *y* sería deducible de las
ventas menos los pagos. En cuanto un pago se registre sin actualizar la otra
tabla —un error de una línea— los dos números divergen y no hay forma de
saber cuál es el correcto.

Como vista, el saldo se deriva siempre de los documentos y sus pagos: no
puede descuadrar. Se consultan igual que una tabla.

Por la misma razón hay **un solo subledger de pagos** (`pagos`) que cubre los
tres casos —cobro de venta, pago de compra, abono a factura contable— en vez
de tres tablas separadas. Con tablas separadas siempre queda una que nadie
actualiza.

---

## 8. Multimoneda: la historia no cambia

Todo documento guarda tres cosas: **monto en moneda de origen, tasa aplicada
y equivalente funcional**. El equivalente se calcula una vez y queda
congelado.

`TasaCambio` (historial por fecha) sirve solo para **proponer** la tasa del
día. Nunca se usa para recalcular un documento histórico.

Esto es lo que hace que un reporte del mes pasado muestre los mismos montos
hoy que mañana aunque el BCV publique otra tasa. Es la diferencia entre un
sistema auditable y uno en el que la historia cambia sola. Está cubierto por
la prueba *"un documento histórico no cambia cuando cambia la tasa del día"*.

---

## 9. Precios con vigencia

Un precio **no se edita**: se cierra la vigencia del anterior
(`vigenciaHasta`) y se abre uno nuevo. `precioVigente()` consulta por fecha,
no "el último precio".

Así una venta de la semana pasada se puede auditar contra el precio que regía
ese día. Editar el precio en su sitio haría que el ticket de ayer parezca un
error de cálculo.

---

## 10. Unidades de medida y fraccionamiento

Cada unidad declara a qué unidad base pertenece y cuántas equivale
(`factorBase`). Convertir es multiplicar por el factor de origen y dividir por
el del destino: **una sola regla** para caja → unidad, kg → g y litro → ml,
sin tablas de pares.

Es lo que resuelve el fraccionamiento del quiosco: se compra la caja de 24 y
se venden 24 unidades, y el factor sale del catálogo en vez de ser un número
que alguien tiene que recordar actualizar en dos sitios.

---

## 10.b Punto de venta: cómo se cierra una venta

Una venta confirmada hace cuatro cosas que tienen que pasar juntas o no pasar:
descontar el inventario, registrar los cobros, afectar el turno de caja y
consumir el correlativo. **Todo ocurre dentro de una transacción.** Si algo
falla, nada queda escrito: no existe el estado intermedio donde la mercancía
salió pero el cobro no se registró, que es el que deja al negocio con dinero
que nadie sabe dónde está.

### Impuesto incluido contra impuesto añadido

Es la causa más frecuente de descuadres en el libro de ventas:

- **Añadido** (típico en factura): base 100, IVA 16 → total 116.
- **Incluido** (típico en quiosco): total 116 → base 100, IVA 16.

Aplicar 16 % sobre 116 daría 18,56 y el libro no cuadraría con lo cobrado. La
configuración vive en `Impuesto.incluidoEnPrecio`, por producto, no en el
código de ventas.

### El correlativo se bloquea, no se calcula

`SecuenciaOperativa` existe como tabla, y no como un `MAX(numero) + 1`, porque
el máximo se calcula sobre filas que otra transacción todavía no confirmó: dos
cajeros cobrando al mismo tiempo leerían el mismo máximo y emitirían dos
tickets con el mismo número. La fila de la secuencia se bloquea con
`FOR UPDATE` dentro de la misma transacción que crea el documento.

### El IGTF lo causa el método de cobro, no la venta

`MetodoPago.causaIGTF` marca los métodos en divisas. Así cambiar la política
fiscal es editar una fila, no el motor de ventas — que es el requisito de tener
la capa fiscal parametrizable.

### Anular deja la caja sin diferencia

Cada cobro genera un pago de reversa con el mismo monto y **la misma tasa**. El
efectivo esperado del turno se deriva sumando los pagos, así que los negativos
restan solos y el esperado vuelve a su valor anterior exacto. El inventario
vuelve con una reversa valorada al costo original del movimiento, no al
promedio de hoy, para que el resultado de un período ya cerrado no cambie.

### El efectivo esperado se deriva, nunca se escribe

`resumenTurno()` lo calcula: fondo inicial + cobros por métodos que entran a la
gaveta + ingresos manuales − egresos. Los métodos que no entran a la gaveta
(pago móvil, punto de venta) suman al total de cobros pero **no** al efectivo
esperado, y se conciertan contra el banco.

---

## 11. Estructura de carpetas

```
prisma/
  schema/                        Esquema multi-archivo (~60 modelos)
    00-base.prisma               Generador, datasource, convención de precisión
    10-nucleo.prisma             Organización, sucursales, almacenes, roles, permisos, tasas
    20-catalogo.prisma           Unidades, categorías, productos, variantes, precios, impuestos
    30-inventario.prisma         Existencias, lotes, kardex, traslados, tomas físicas
    40-compras.prisma            Proveedores, órdenes, compras, costos prorrateables
    50-ventas.prisma             Clientes, métodos de cobro, ventas, pagos, apartados
    60-caja.prisma               Cajas, turnos, arqueos, cuentas bancarias
    70-gastos.prisma             Categorías de gasto, gastos, recurrentes
    80-verticales.prisma         Mesas, comandas, recetas, modificadores, temporadas
    90-personal.prisma           Empleados, comisiones, adelantos y avisos
  migrations/                    Migraciones versionadas (ahora sí en control de versiones)

src/lib/
  nucleo/                        Dominio operativo nuevo
    dinero.ts                    Aritmética exacta, redondeo único, prorrateo, multimoneda
    permisos.ts                  Roles, permisos granulares, filtrado de costos
    esquemas.ts                  Validación Zod compartida cliente/servidor
    respuesta.ts                 Errores tipados y serialización de Decimal
    inventario.ts                Kardex, costeo promedio, reversas, transacciones
    organizacion.ts              Organizaciones, sucursales, almacenes, equipo
    catalogo.ts                  Categorías, productos, variantes, precios, conversión
    ventas.ts                    Venta atómica, cobro mixto, IGTF, anulación, margen
    caja.ts                      Turnos, efectivo esperado derivado, arqueo, flujo de caja
  auth.ts                        Sesión con JWT en cookie HTTP-only
  auditoria.ts                   Bitácora de operaciones sensibles
  db.ts                          Cliente Prisma

src/app/api/
  pos/buscar/                    Escaneo por código de barras y búsqueda del mostrador
  ventas/                        Confirmar, consultar y anular ventas
  caja/turnos/                   Abrir turno, resumen, cerrar con arqueo
  caja/movimientos/              Ingresos y egresos de caja
  ...                            Rutas heredadas del módulo contable

scripts/
  seed-quiosco.ts                Quiosco operable: npm run seed:quiosco
  humo-pos.ts                    Prueba de humo del flujo completo contra la semilla

tests/                           14 archivos, 171 pruebas
```

---

## 12. Estado de las fases

| Fase | Estado |
|---|---|
| **1 — Fundación**: auth, organizaciones, sucursales, usuarios y roles, catálogo, almacenes | Esquema completo, servicios de dominio y rutas de catálogo listos; faltan las rutas de organización/sucursal/almacén y la interfaz |
| **2 — Inventario**: movimientos, kardex, costeo promedio, ajustes, alertas | ✅ Motor completo y probado; faltan tomas físicas y traslados a nivel de servicio |
| **3 — Operación**: compras, ventas, POS, clientes, proveedores, caja | ✅ **Ventas, POS y caja completos, probados y con semilla operable.** Compras y proveedores: esquema listo, servicios pendientes |
| **4 — Dinero**: gastos, CxC/CxP, bancos, flujo de caja | Esquema y vistas completos; servicios pendientes |
| **5 — Inteligencia**: reportes, dashboard, rentabilidad, exportaciones | Dashboard y exportaciones heredadas funcionando |
| **6 — Verticales**: restaurante, ropa, quiosco | Esquema completo; servicios pendientes |
| **7 — Fiscal**: libro de compras y ventas, retenciones | Multimoneda con tasas históricas ✅. Los libros se derivarán de `ventas` y `compras`; pendientes |

### Criterios de aceptación

| Criterio | Estado |
|---|---|
| Comprar el mismo producto a dos costos distintos da el promedio ponderado correcto | ✅ probado (`dinero.test.ts`) |
| Un reporte del mes pasado muestra los mismos montos aunque cambie la tasa | ✅ probado |
| Un cajero no puede ver costos ni márgenes por ninguna vía, incluida la API | ✅ probado en `permisos.test.ts` y en el POS real (`pos.test.ts`) |
| El arqueo detecta y registra toda diferencia con justificación obligatoria | ✅ probado, y además garantizado por `CHECK` en la base de datos |
| Una venta se cierra en menos de 10 segundos y nunca sin método de pago | ✅ probado: el motor rechaza cerrar sin cobro identificado |
| Vender un plato descuenta los insumos de su receta y el costo coincide | ⏳ esquema listo, motor de recetas pendiente |
| Anular una venta devuelve el inventario y ajusta la caja sin diferencia | ✅ probado (`pos.test.ts`) y verificado de punta a punta con `humo-pos.ts` |

---

## 13. Un defecto que encontró la prueba de humo

Los permisos se validaban solo en la capa de rutas, y los motores confiaban en
eso. Un cajero llamando `anularVenta()` directamente —desde un script, una
tarea programada o una ruta nueva— anulaba la venta sin que nada lo detuviera.

"Validar en el servidor" no puede significar "validar en las rutas". Ahora cada
motor comprueba sus propios permisos con `exigirEnContexto()`, y hay pruebas de
regresión que llaman a los motores con roles insuficientes para que el agujero
no vuelva a abrirse.

Lo encontró `scripts/humo-pos.ts`, no las pruebas unitarias: recorrer el flujo
real de punta a punta destapa cosas que probar cada pieza por separado no.

---

## 14. Deuda técnica conocida

- `noImplicitAny: false` en `tsconfig.json`. El objetivo es TypeScript estricto
  sin `any`; activarlo es un paso pendiente que conviene dar con el build en
  verde para medir cuántos sitios aparecen.
- **No hay interfaz web.** Todo el núcleo se opera por la API.
- Compras, gastos y los tres verticales tienen el esquema y las restricciones
  listas, pero no los servicios.
- El POS como PWA con cola de sincronización offline no está empezado.
- Sin RLS: los permisos se hacen cumplir en la capa de servidor sobre Prisma
  (decisión explícita). Si en el futuro se quiere la garantía del motor, hay
  que migrar las lecturas sensibles a un rol de conexión no privilegiado.
