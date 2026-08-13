import type { Flashcard, Leccion } from "@/lib/aprendizaje/tipos";

/**
 * Módulo 5: Auditoría e Inventario. Dos lecciones: control de efectivo
 * (arqueo de caja + conciliación bancaria) y control de inventario
 * (costeo promedio ponderado, mermas).
 */

export const leccionConciliacionBancaria: Leccion = {
  id: "auditoria-conciliacion-bancaria",
  moduloId: "auditoria",
  titulo: "Arqueo de caja y conciliación bancaria",
  contenidoMarkdown: `
Dos controles básicos, pero fáciles de confundir: el arqueo verifica el
efectivo físico; la conciliación bancaria verifica el efectivo que dice
tener la empresa según sus libros contra lo que dice el banco.

## Arqueo de caja

Es un conteo físico y sorpresivo del efectivo (y equivalentes, como
comprobantes de caja chica) que hay en una caja en un momento dado, para
compararlo contra lo que dicen los registros contables a esa misma
hora. Si el conteo físico no coincide con el registro, hay un
**sobrante** (hay más efectivo del que dicen los libros) o un
**faltante** (hay menos) que hay que investigar.

En empresas con más de una moneda en caja (bolívares y dólares en
efectivo, por ejemplo), el arqueo se hace por separado para cada
moneda — no se puede compensar un faltante de una moneda con un
sobrante de otra.

## Conciliación bancaria

El saldo que la empresa cree tener en el banco (según su libro) casi
nunca coincide exactamente, día a día, con el saldo que reporta el
banco en su estado de cuenta — no porque haya un error, sino por
**diferencias de tiempo**:

- **Depósitos en tránsito**: la empresa ya registró el depósito en su
  libro, pero el banco todavía no lo ha procesado.
- **Cheques pendientes de cobro**: la empresa ya emitió y registró el
  cheque, pero el beneficiario todavía no lo ha cobrado en el banco.
- **Notas de débito/crédito del banco**: cargos o abonos que el banco
  ya aplicó (comisiones, intereses) pero que la empresa todavía no ha
  registrado en su libro porque se entera con el estado de cuenta.

La conciliación ajusta ambos saldos (el del libro y el del banco) para
llegar a un **saldo conciliado** común, que es el que realmente refleja
el efectivo disponible.

## ¿Por qué importa?

Una conciliación mensual regular es de los controles más simples y más
efectivos contra errores (transposición de cifras, un cheque duplicado)
y contra fraude (alguien registrando movimientos falsos que no pasan
nunca por el banco real).
`.trim(),
  preguntas: [
    {
      id: "ac-q1",
      enunciado: "¿Qué verifica un arqueo de caja?",
      opciones: [
        { id: "a", texto: "El efectivo físico contado contra lo que dicen los registros contables" },
        { id: "b", texto: "El saldo del banco contra el estado de cuenta" },
      ],
      opcionCorrectaId: "a",
      explicacion:
        "El arqueo es un conteo físico y sorpresivo del efectivo en caja, comparado contra el registro contable a esa misma hora.",
    },
    {
      id: "ac-q2",
      enunciado: "Si una empresa tiene efectivo en bolívares y en dólares, ¿cómo se hace el arqueo?",
      opciones: [
        { id: "a", texto: "Se puede compensar un faltante en una moneda con un sobrante en la otra" },
        { id: "b", texto: "Por separado para cada moneda, sin compensar entre ellas" },
      ],
      opcionCorrectaId: "b",
      explicacion:
        "Cada moneda se arquea por separado — un sobrante de dólares no explica ni compensa un faltante de bolívares, son controles independientes.",
    },
    {
      id: "ac-q3",
      enunciado: "¿Qué es un 'depósito en tránsito' en una conciliación bancaria?",
      opciones: [
        { id: "a", texto: "Un depósito que la empresa ya registró, pero el banco todavía no ha procesado" },
        { id: "b", texto: "Un depósito que el banco ya procesó pero la empresa nunca registró" },
      ],
      opcionCorrectaId: "a",
      explicacion:
        "El depósito en tránsito está registrado del lado de la empresa (libro) pero aún no aparece en el estado de cuenta del banco — es una diferencia de tiempo, no un error.",
    },
    {
      id: "ac-q4",
      enunciado: "¿Qué es un 'cheque pendiente de cobro'?",
      opciones: [
        { id: "a", texto: "Un cheque que la empresa emitió y registró, pero el beneficiario aún no ha cobrado en el banco" },
        { id: "b", texto: "Un cheque que el banco rechazó por fondos insuficientes" },
      ],
      opcionCorrectaId: "a",
      explicacion:
        "Ya salió del libro contable de la empresa (se registró como pagado), pero todavía no se refleja en el saldo del banco porque el beneficiario no lo ha cobrado.",
    },
    {
      id: "ac-q5",
      enunciado: "¿Por qué una conciliación bancaria mensual regular es un control importante?",
      opciones: [
        { id: "a", texto: "Ayuda a detectar errores y posibles fraudes que no coinciden con los movimientos reales del banco" },
        { id: "b", texto: "Es un requisito solo estético, sin efecto práctico en el control interno" },
      ],
      opcionCorrectaId: "a",
      explicacion:
        "Es uno de los controles más simples y efectivos: expone errores de registro y movimientos que nunca pasaron realmente por el banco.",
    },
  ],
};

export const leccionInventario: Leccion = {
  id: "auditoria-inventario",
  moduloId: "auditoria",
  titulo: "Control de inventario: costeo promedio ponderado",
  contenidoMarkdown: `
Cuando una empresa compra el mismo producto varias veces a precios
distintos, necesita una regla consistente para decidir a qué costo
sale cada unidad cuando se vende. En Venezuela, bajo VEN-NIF, el método
más usado es el **promedio ponderado**.

## La idea central

Cada vez que entra mercancía a un costo distinto, se recalcula un
**costo promedio** de todo el inventario disponible — no se rastrea
cada unidad individualmente por su costo original.

**costo promedio = valor total del inventario disponible / cantidad total disponible**

Cuando sale mercancía (una venta), sale valorada a ese costo promedio
vigente en ese momento — no importa si esa unidad física en particular
vino del lote más viejo o del más nuevo.

## Ejemplo simplificado

- Inventario inicial: 100 unidades a 10 VES c/u = 1.000 VES
- Compra: 100 unidades a 14 VES c/u = 1.400 VES
- Total disponible: 200 unidades, 2.400 VES → costo promedio = 12 VES/unidad
- Venta de 50 unidades: sale a 12 VES/unidad = 600 VES de costo
- Queda: 150 unidades a 12 VES/unidad = 1.800 VES

Si después hay otra compra a un precio distinto, se vuelve a
recalcular el promedio sobre el nuevo total disponible — el "kardex"
(la tarjeta de control de inventario) lleva ese recálculo movimiento a
movimiento.

## Mermas

Una merma es una pérdida de inventario que no viene de una venta —
por deterioro, vencimiento, robo, o error de conteo. Al detectarse
(normalmente en una toma física), se ajusta el inventario hacia abajo
y se reconoce como un gasto del período, a ese mismo costo promedio
vigente.

## Toma física

Es el conteo físico completo del inventario (no solo de caja), que se
compara contra lo que dice el kardex. Las diferencias que aparecen ahí
—casi siempre faltantes— son la fuente más común de mermas
reconocidas contablemente.
`.trim(),
  preguntas: [
    {
      id: "inv-q1",
      enunciado: "Bajo el método de costeo promedio ponderado, ¿a qué costo sale una unidad cuando se vende?",
      opciones: [
        { id: "a", texto: "Al costo original de esa unidad física específica" },
        { id: "b", texto: "Al costo promedio de todo el inventario disponible en ese momento" },
      ],
      opcionCorrectaId: "b",
      explicacion:
        "El promedio ponderado no rastrea el costo individual de cada unidad — recalcula un promedio del inventario disponible y usa ese valor para todas las salidas.",
    },
    {
      id: "inv-q2",
      enunciado: "¿Cuándo se recalcula el costo promedio ponderado?",
      opciones: [
        { id: "a", texto: "Solo al cierre del ejercicio, una vez al año" },
        { id: "b", texto: "Cada vez que entra mercancía a un costo distinto" },
      ],
      opcionCorrectaId: "b",
      explicacion:
        "Cada nueva compra a un precio distinto cambia el total disponible y su valor, así que el promedio se recalcula en ese momento, no solo al cierre.",
    },
    {
      id: "inv-q3",
      enunciado: "100 unidades a 10 VES + 100 unidades a 14 VES. ¿Cuál es el costo promedio ponderado?",
      opciones: [
        { id: "a", texto: "12 VES por unidad" },
        { id: "b", texto: "14 VES por unidad" },
      ],
      opcionCorrectaId: "a",
      explicacion:
        "Valor total = 1.000 + 1.400 = 2.400 VES; cantidad total = 200 unidades; 2.400 / 200 = 12 VES por unidad.",
    },
    {
      id: "inv-q4",
      enunciado: "¿Qué es una merma de inventario?",
      opciones: [
        { id: "a", texto: "Una pérdida de inventario que no viene de una venta (deterioro, robo, vencimiento)" },
        { id: "b", texto: "El descuento que se le da a un cliente por comprar al mayor" },
      ],
      opcionCorrectaId: "a",
      explicacion:
        "La merma es inventario que desaparece sin haberse vendido — se ajusta hacia abajo y se reconoce como gasto del período.",
    },
    {
      id: "inv-q5",
      enunciado: "¿Qué es una toma física de inventario?",
      opciones: [
        { id: "a", texto: "Un conteo físico completo del inventario, comparado contra el kardex" },
        { id: "b", texto: "Un reporte financiero mensual sin conteo real" },
      ],
      opcionCorrectaId: "a",
      explicacion:
        "Es el conteo real de las existencias, cuya comparación contra el kardex (el registro contable) es la forma más común de detectar mermas.",
    },
  ],
};

export const flashcardsAuditoriaInventario: Flashcard[] = [
  {
    id: "fc-audit-1",
    moduloId: "auditoria",
    pregunta: "¿Qué verifica un arqueo de caja?",
    respuesta: "El efectivo físico contado contra lo que dicen los registros contables.",
  },
  {
    id: "fc-audit-2",
    moduloId: "auditoria",
    pregunta: "Con efectivo en varias monedas, ¿se puede compensar un faltante en una con un sobrante en otra?",
    respuesta: "No — cada moneda se arquea y se controla por separado.",
  },
  {
    id: "fc-audit-3",
    moduloId: "auditoria",
    pregunta: "¿Qué es un depósito en tránsito?",
    respuesta: "Un depósito que la empresa ya registró en su libro, pero el banco todavía no ha procesado.",
  },
  {
    id: "fc-audit-4",
    moduloId: "auditoria",
    pregunta: "¿Qué es un cheque pendiente de cobro?",
    respuesta: "Un cheque ya emitido y registrado por la empresa, que el beneficiario aún no ha cobrado en el banco.",
  },
  {
    id: "fc-audit-5",
    moduloId: "auditoria",
    pregunta: "Fórmula del costo promedio ponderado",
    respuesta: "Valor total del inventario disponible / cantidad total disponible",
  },
  {
    id: "fc-audit-6",
    moduloId: "auditoria",
    pregunta: "¿A qué costo sale una unidad vendida bajo promedio ponderado?",
    respuesta: "Al costo promedio vigente del inventario disponible en ese momento, no al costo original de esa unidad.",
  },
  {
    id: "fc-audit-7",
    moduloId: "auditoria",
    pregunta: "¿Qué es una merma de inventario?",
    respuesta: "Una pérdida de inventario que no viene de una venta (deterioro, vencimiento, robo, error de conteo).",
  },
  {
    id: "fc-audit-8",
    moduloId: "auditoria",
    pregunta: "¿Qué es una toma física de inventario?",
    respuesta: "Un conteo físico completo de las existencias, comparado contra el kardex.",
  },
];
