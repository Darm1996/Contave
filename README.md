# AdminHub

Sistema de administración de negocios multi-rubro: restaurante, tienda de
ropa, quiosco o cualquier negocio con inventario, ventas, compras y gastos.

Un núcleo común con comportamientos configurables por rubro — no tres
sistemas distintos.

## Estado

El núcleo funciona de punta a punta: catálogo con variantes, inventario por
almacén con kardex inmutable, punto de venta y turno de caja con arqueo. La
interfaz web está por construir; todo se opera hoy por la API.

| Módulo | Estado |
|---|---|
| Catálogo, variantes, precios con vigencia, unidades con conversión | ✅ |
| Inventario por almacén, costeo promedio ponderado, kardex, reversas | ✅ |
| Punto de venta: escaneo, cobro mixto, IGTF, anulación | ✅ |
| Turno de caja y arqueo con justificación obligatoria | ✅ |
| Permisos por rol con ocultamiento de costos | ✅ |
| Compras con recepción y costos prorrateables | Esquema listo, servicio pendiente |
| Gastos | Esquema listo, servicio pendiente |
| Verticales: recetas, mesas, matriz talla × color | Esquema listo, servicio pendiente |
| Interfaz web | Pendiente |

## Probarlo en cinco minutos

```bash
npm install
cp .env.example .env        # apunta DATABASE_URL a tu Postgres
npx prisma migrate deploy   # crea el esquema
npm run seed                # monta un quiosco con 12 productos y 3 usuarios
npm run humo                # recorre el flujo completo y lo explica paso a paso
```

`npm run humo` abre un turno, escanea productos, cobra con efectivo y pago
móvil, comprueba que el inventario baja, anula la venta con el supervisor y
verifica que el inventario y la caja vuelven exactamente a su valor anterior.

Usuarios de la semilla (clave `quiosco123`):

| Correo | Rol | Puede |
|---|---|---|
| `duenio@quiosco.demo` | Propietario | Todo |
| `supervisor@quiosco.demo` | Supervisor | Vender, anular, autorizar descuentos, ver costos |
| `cajero@quiosco.demo` | Cajero | Vender y cobrar. **No ve costos ni márgenes por ninguna vía** |

## Comandos

```bash
npm run dev        # servidor de desarrollo
npm test           # 108 pruebas
npm run lint
npx tsc --noEmit   # verificación de tipos
```

## Decisiones de diseño

Están documentadas con su razón de negocio en **[ARQUITECTURA.md](./ARQUITECTURA.md)**.
Las tres que más explican el resto:

- **Todo el dinero es `Decimal`, nunca `Float`.** `0.1 + 0.2` no da `0.3` en
  binario, y ese error se acumula en el costo promedio hasta descuadrar el
  inventario y hacer que el arqueo reporte faltantes que no existen.
- **El kardex es inmutable.** Un error no se edita: se registra una reversa.
  Así el inventario a cualquier fecha pasada siempre se puede reconstruir.
- **Los permisos se validan en cada motor, no solo en las rutas.** Ocultar un
  botón no es seguridad, y validar solo en la capa de rutas deja la puerta
  abierta a cualquier script.

## Stack

Next.js 16 · TypeScript · Prisma · PostgreSQL (Supabase) · Zod · Tailwind ·
shadcn/ui · Vitest
