# AdminHub — Arquitectura

Sistema de administración de negocios multi-rubro (restaurante, ropa, quiosco
y cualquier negocio con inventario, ventas, compras y gastos), construido
sobre el motor contable-fiscal venezolano de ContaVE.

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

## 2. Punto de partida: qué se reutiliza y qué se construyó

El repositorio ya contenía **ContaVE**: un motor contable y fiscal venezolano
sólido pero sin interfaz — 44 grupos de rutas API, 22 librerías de cálculo y
una sola página.

**Se reutiliza** (no se reescribió nada de esto):

| Módulo | Qué resuelve |
|---|---|
| `asientos-engine` | Partida doble, asientos automáticos por tipo de documento |
| `declaracion-iva`, `islr`, `declaracion-igtf`, `declaracion-islr-anual` | Motor fiscal: IVA, retenciones, IGTF, ISLR |
| `libros-seniat` | Libro de compras y de ventas, con exportación TXT |
| `plan-cuentas-ven-nif`, `ven-nif` | Plan de cuentas y criterios VEN-NIF |
| `nomina`, `nomina-lottt` | Nómina, prestaciones, vacaciones y liquidaciones LOTTT |
| `ajuste-inflacion` | Reexpresión por nivel general de precios |
| `estados-financieros`, `ejercicios` | Estados financieros y cierre de ejercicio |
| `activos-fijos` | Depreciación |
| `conciliacion-banco` | Conciliación bancaria |
| `auditoria`, `notificaciones`, `bcv-scraper` | Bitácora, avisos, tasa del BCV |

**Se construyó nuevo**: todo el dominio operativo — catálogo con variantes,
inventario por almacén con kardex inmutable, compras, ventas y POS, caja y
arqueo, gastos, y los tres módulos verticales.

### `Organizacion` y `Empresa`: por qué son dos tablas

- **`Organizacion`** es el negocio: cómo opera (rubro, monedas, sucursales,
  cajas, inventario, redondeo).
- **`Empresa`** es su identidad fiscal: RIF, alícuota, si es agente de
  retención, calendario del SENIAT.

Son 1:1 y obligatorias juntas. Se mantienen separadas porque el motor fiscal
ya está escrito y probado contra `empresaId`: al conservar `Empresa` como
perfil fiscal, ese motor sigue funcionando sin tocarlo, y el **motor fiscal
queda aislado del operativo** — que es exactamente lo que pide el requisito
de "capa fiscal parametrizable, no incrustada en la lógica de ventas".

La raíz de tenencia es `Organizacion`: toda tabla operativa lleva
`organizacionId`.

---

## 3. La decisión más importante: `Decimal`, no `Float`

El esquema heredado usaba `Float` en los 94 campos de dinero y cantidad. Se
migraron todos a `Decimal`. **Esto no es una preferencia de estilo.**

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
- **El libro de ventas no cuadra con el SENIAT**, porque la suma de los IVA de
  las líneas no da el IVA del total.

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
número se convierte en un importe cobrable o en un asiento. Toda esa
aritmética vive en `src/lib/nucleo/dinero.ts`, y es el único módulo autorizado
a redondear dinero.

Cuando el total redondeado no coincide con la suma de las líneas redondeadas,
la diferencia se guarda explícita en `Venta.ajusteRedondeo`, para que la suma
de lo que el cliente ve en el ticket dé exactamente el total que pagó.

### Qué se migró y qué queda pendiente

- ✅ **Almacenamiento**: 100 % `Decimal`. Ninguna columna de dinero, cantidad,
  costo, tasa o porcentaje es `Float`.
- ✅ **Rutas de cálculo crítico en aritmética exacta**: costeo promedio
  ponderado, kardex, partida doble (`asientos-engine`), cuentas por cobrar y
  pagar, impuestos sobre documentos, conversión multimoneda, prorrateo.
- ⚠️ **Pendiente**: los motores de **reporte** (`estados-financieros`,
  `ejercicios`, `conciliacion-banco`, `activos-fijos`, `ajuste-inflacion`,
  `nomina`) leen valores exactos de la base y calculan el reporte
  internamente en `number`. La frontera está marcada explícitamente con
  `aNumero()` en cada lectura.

  Se dejó así **deliberadamente**: convertir la aritmética interna de 4.900
  líneas de cálculo fiscal con 69 pruebas de cobertura, en el mismo paso que
  el resto del sistema, es la forma más fácil de alterar una fórmula de
  impuestos sin que nadie lo note. El almacenamiento ya es exacto, así que la
  precisión no se pierde; lo que queda es acabar de mover el cálculo
  intermedio de esos reportes, motor por motor, con pruebas de regresión que
  fijen los valores actuales antes de tocar nada.

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
| Una línea de asiento es debe **o** haber | `CHECK ((debit>0 AND credit=0) OR (credit>0 AND debit=0))` |
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
    90-contabilidad.prisma       Motor contable y fiscal heredado (migrado a Decimal)
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
  contabilidad/                  Motor fiscal heredado (22 módulos)
  auth.ts, auditoria.ts, db.ts

src/app/api/                     Rutas (74+)
tests/                           13 archivos, 132 pruebas
```

---

## 12. Estado de las fases

| Fase | Estado |
|---|---|
| **1 — Fundación**: auth, organizaciones, sucursales, usuarios y roles, catálogo, almacenes | Esquema completo, servicios de dominio y rutas de catálogo listos; faltan las rutas de organización/sucursal/almacén y la interfaz |
| **2 — Inventario**: movimientos, kardex, costeo promedio, ajustes, alertas | Motor completo y probado; faltan tomas físicas y traslados a nivel de servicio |
| **3 — Operación**: compras, ventas, POS, clientes, proveedores, caja | Esquema completo; servicios pendientes |
| **4 — Dinero**: gastos, CxC/CxP, bancos, flujo de caja | Esquema y vistas completos; servicios pendientes |
| **5 — Inteligencia**: reportes, dashboard, rentabilidad, exportaciones | Dashboard y exportaciones heredadas funcionando |
| **6 — Verticales**: restaurante, ropa, quiosco | Esquema completo; servicios pendientes |
| **7 — Fiscal y multimoneda avanzada** | Heredado y funcionando (IVA, ISLR, IGTF, libros SENIAT, tasas históricas) |

### Criterios de aceptación

| Criterio | Estado |
|---|---|
| Comprar el mismo producto a dos costos distintos da el promedio ponderado correcto | ✅ probado (`dinero.test.ts`) |
| Un reporte del mes pasado muestra los mismos montos aunque cambie la tasa | ✅ probado |
| Un cajero no puede ver costos ni márgenes por ninguna vía, incluida la API | ✅ probado (`permisos.test.ts`) |
| El arqueo detecta y registra toda diferencia con justificación obligatoria | ✅ garantizado por `CHECK` en la base de datos |
| Vender un plato descuenta los insumos de su receta y el costo coincide | ⏳ esquema listo, motor de recetas pendiente |
| Anular una venta devuelve el inventario y ajusta la caja sin diferencia | ⏳ reversa de kardex lista, motor de ventas pendiente |

---

## 13. Cosas que se corrigieron de paso

Tres defectos del repositorio que contradecían los requisitos:

1. **`prisma/migrations/` estaba en `.gitignore`.** Sin migraciones
   versionadas no hay forma de reproducir un entorno ni de saber qué se aplicó
   en producción. Corregido.
2. **`registrarMovimiento` no usaba transacción** (ver §4).
3. **`catch (e: any)` en las rutas**, que además de usar `any` devolvía 400
   para todo y escondía si el problema era de permisos, de datos o del
   servidor. Reemplazado por `manejarError()` en las rutas migradas; quedan
   rutas heredadas por migrar.

---

## 14. Deuda técnica conocida

- `noImplicitAny: false` en `tsconfig.json`. El requisito pide TypeScript
  estricto sin `any`; activarlo es el siguiente paso, y hay que hacerlo con el
  build en verde para ver cuántos sitios aparecen.
- Los motores de reporte listados en §3 todavía calculan en `number`.
- Faltan las rutas API y la interfaz de las fases 1, 3, 4 y 6.
- El POS como PWA con cola de sincronización offline no está empezado.
- Sin RLS: los permisos se hacen cumplir en la capa de servidor sobre Prisma
  (decisión tomada explícitamente). Si en el futuro se quiere la garantía del
  motor, hay que migrar las lecturas sensibles a un rol de conexión no
  privilegiado.
