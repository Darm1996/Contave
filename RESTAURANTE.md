# Módulo Restaurante 🍽️

Sistema administrativo para un negocio de comida. Reemplaza el Excel del día
a día: el cierre de caja, los gastos, las notas de proveedores, los fiados,
la nómina semanal con propinas y los gastos fijos del mes.

Vive dentro de ContaVE y usa la misma sesión y la misma empresa activa. Se
entra por la sección **Restaurante** del menú lateral.

## Puesta en marcha

Las tablas del módulo son nuevas, así que hay que crearlas una vez:

```bash
npx prisma generate
npx prisma db push
```

Después, dentro de la app:

1. Entra a **Restaurante → Configurar negocio**.
2. Pulsa **Carga rápida**: crea las cajas, los proveedores más comunes y las
   plantillas de gastos fijos (en 0, para que les pongas tu monto).
3. En la pestaña **Equipo**, agrega a tu personal con su base semanal.
4. En **Gastos fijos**, pon el monto real de cada uno y actívalos.

Con eso ya se puede trabajar.

## El día a día

| Cuándo | Qué se hace | Dónde |
|---|---|---|
| Al cerrar el local | Anotar lo que se vendió por cada medio de pago | Cierre del día |
| Cuando se gasta algo | Anotar el egreso y de cuál caja salió | Gastos |
| Cuando llega una nota | Registrar la nota por pagar; luego el pago | Proveedores |
| Cuando alguien fía | Registrar el fiado; luego el cobro | Fiados |
| Cada semana | Abrir la semana, ajustar y marcar como pagada | Nómina semanal |
| Al empezar el mes | Generar los gastos fijos de un clic | Configurar negocio |

## Lo que el sistema hace solo

- **Convierte moneda.** El negocio piensa en dólares pero cobra y paga en
  bolívares. Cada movimiento guarda monto en dólares, monto en bolívares y la
  tasa con la que se convirtió, así el histórico no se distorsiona cuando la
  tasa cambia después. En los gastos y pagos da igual en cuál moneda se
  escriba el monto: con la tasa se completa el otro.
- **Calcula el total del día.** Se escriben los cuatro medios de pago y el
  total en dólares sale solo. La tasa viene precargada con la del último
  cierre registrado.
- **Lleva los saldos de las cajas.** Nadie registra movimientos a mano: los
  generan el cierre diario, los gastos, los pagos, los cobros y la nómina. El
  saldo de cada caja es la suma de ese rastro.
- **Reparte las propinas.** Al abrir la semana de nómina, suma las propinas de
  los cierres de esos siete días y las reparte entre quienes participan. Los
  centavos del redondeo se ajustan para que las partes sumen exacto.
- **Paga notas en un paso.** Pagar una nota de proveedor deja hecho el abono,
  el egreso de la caja y el gasto del mes, todo de una vez.
- **Genera los gastos fijos.** Alquiler, condominio, luz, internet, gas y
  sistema se cargan de un clic al mes. Repetir la acción no duplica nada.
- **Avisa lo que falta.** El panel señala los días sin cerrar, las notas con
  más de 30 días sin pagar y los gastos fijos que aún no se han generado.

## Corregir cosas

- Guardar el mismo día otra vez lo **corrige**, no lo duplica.
- Borrar un cierre o un gasto **devuelve** el monto al saldo de la caja.
- Una nómina pagada se puede **revertir**: se quita el gasto y el dinero
  vuelve a la caja.

## Estructura del código

```
src/lib/restaurante/
  calculos.ts     Funciones puras: totales, saldos, propinas, antigüedad
  categorias.ts   Catálogos: categorías de gasto, cargos, tipos de caja
  fondos.ts       Libro de movimientos y saldos de las cajas
  nomina.ts       Armado, recálculo y pago de la semana
  panel.ts        Agregación del panel mensual
  setup.ts        Carga inicial idempotente

src/app/api/restaurante/    Endpoints (todos exigen empresa activa)
src/components/app/restaurante/   Pantallas
```

Los cálculos de `calculos.ts` no tocan la base de datos, así que se prueban
solos: `npx vitest run tests/restaurante-calculos.test.ts`.
