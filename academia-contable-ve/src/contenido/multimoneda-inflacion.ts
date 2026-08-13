import type { Flashcard, Leccion } from "@/lib/aprendizaje/tipos";

/**
 * Módulo 2: Multimoneda y Ajuste por Inflación. Dos lecciones, cada una
 * cubriendo una norma distinta — se separan porque son dos mecanismos
 * independientes que conviene aprender por separado antes de mezclarlos:
 *
 *  1. Diferencial cambiario (NIC 21): efecto de tener partidas en
 *     moneda extranjera cuando cambia la tasa.
 *  2. Ajuste por inflación (BA VEN-NIF 2 / NIC 29): efecto de la
 *     inflación sobre partidas no monetarias (reexpresión) y sobre la
 *     posición monetaria neta (REPOMAN).
 */

export const leccionDiferencialCambiario: Leccion = {
  id: "multimoneda-diferencial-cambiario",
  moduloId: "multimoneda-inflacion",
  titulo: "Diferencial cambiario (NIC 21)",
  contenidoMarkdown: `
Cuando una empresa venezolana tiene una cuenta por cobrar o por pagar
denominada en dólares, el valor en bolívares de esa cuenta cambia cada
vez que se mueve la tasa de cambio — aunque el monto en dólares sea
siempre el mismo. Esa diferencia es el **diferencial cambiario**.

## El punto de partida: la tasa histórica

Cuando se reconoce una partida en moneda extranjera (por ejemplo, una
venta a crédito de 1.000 USD), se registra usando la tasa del **día de
la operación** — la "tasa histórica". Ese valor en bolívares queda fijo
como referencia, aunque la tasa siga cambiando después.

## Activo vs. Pasivo: el signo importa

- Si la partida es un **Activo** en divisas (te deben dólares) y el
  bolívar se **deprecia** (la tasa sube), esa cuenta por cobrar ahora
  vale más en bolívares → **ganancia** cambiaria.
- Si la partida es un **Pasivo** en divisas (debes dólares) y el
  bolívar se deprecia, tu deuda ahora cuesta más bolívares para
  pagarla → **pérdida** cambiaria.

Es la misma variación de tasa, pero el efecto es contrario según si
estás del lado de cobrar o de pagar.

## Realizado vs. no realizado

- **Realizado**: se calcula cuando la partida se **liquida** de verdad
  (cobras o pagas). Es definitivo, pasa a resultado del ejercicio.
- **No realizado**: se calcula al **cierre de un período** sobre una
  partida que sigue abierta (todavía no se cobra ni se paga). Es una
  estimación — se revierte en el siguiente cierre o cuando finalmente
  se liquide.

## Ejemplo

Vendes mercancía a crédito por 1.000 USD cuando la tasa está en 40
VES/USD (queda registrado en 40.000 VES). Un mes después, cuando cobras,
la tasa está en 48 VES/USD: recibes el equivalente a 48.000 VES.

Diferencial = 48.000 − 40.000 = **8.000 VES de ganancia** (es un
activo, y el bolívar se depreció — a tu favor).
`.trim(),
  preguntas: [
    {
      id: "dc-q1",
      enunciado: "¿A qué tasa se reconoce inicialmente una partida en moneda extranjera?",
      opciones: [
        { id: "a", texto: "La tasa del día en que se cobra o se paga" },
        { id: "b", texto: "La tasa del día de la operación (tasa histórica)" },
        { id: "c", texto: "La tasa promedio del mes" },
      ],
      opcionCorrectaId: "b",
      explicacion:
        "Se usa la tasa histórica (el día de la operación) como referencia fija; contra ella se comparan las tasas posteriores para calcular el diferencial.",
    },
    {
      id: "dc-q2",
      enunciado:
        "Tienes una cuenta por PAGAR en USD. El bolívar se deprecia (la tasa sube). ¿Qué le pasa a tu resultado?",
      opciones: [
        { id: "a", texto: "Ganancia cambiaria" },
        { id: "b", texto: "Pérdida cambiaria" },
      ],
      opcionCorrectaId: "b",
      explicacion:
        "Si debes dólares y el bolívar se deprecia, tu deuda cuesta más bolívares para pagarla — es una pérdida, al contrario de lo que pasa con un activo en divisas.",
    },
    {
      id: "dc-q3",
      enunciado:
        "Tienes una cuenta por COBRAR en USD. El bolívar se aprecia (la tasa baja). ¿Qué le pasa a tu resultado?",
      opciones: [
        { id: "a", texto: "Ganancia cambiaria" },
        { id: "b", texto: "Pérdida cambiaria" },
      ],
      opcionCorrectaId: "b",
      explicacion:
        "Si te deben dólares y el bolívar se aprecia (la tasa baja), esos dólares ahora valen menos en bolívares cuando los cobres — es una pérdida.",
    },
    {
      id: "dc-q4",
      enunciado: "¿Cuándo se calcula un diferencial cambiario NO realizado?",
      opciones: [
        { id: "a", texto: "Al momento de cobrar o pagar la partida" },
        { id: "b", texto: "Al cierre de un período, sobre una partida que sigue abierta" },
      ],
      opcionCorrectaId: "b",
      explicacion:
        "El no realizado es una estimación de cierre de período sobre partidas que todavía no se han liquidado — se revierte en el siguiente cierre o al liquidarse.",
    },
    {
      id: "dc-q5",
      enunciado: "¿Cuándo se vuelve definitivo (pasa a resultado del ejercicio) un diferencial cambiario?",
      opciones: [
        { id: "a", texto: "Cuando se realiza, es decir, cuando se cobra o se paga la partida" },
        { id: "b", texto: "Nunca — siempre es una estimación" },
      ],
      opcionCorrectaId: "a",
      explicacion:
        "El diferencial realizado, calculado al momento de la liquidación efectiva, es definitivo — a diferencia del no realizado, que es una estimación temporal.",
    },
  ],
};

export const leccionAjusteInflacion: Leccion = {
  id: "multimoneda-ajuste-inflacion",
  moduloId: "multimoneda-inflacion",
  titulo: "Ajuste por inflación: reexpresión y REPOMAN",
  contenidoMarkdown: `
En un país con inflación alta, un bolívar de hoy no vale lo mismo que
un bolívar de hace seis meses. El ajuste por inflación existe para que
los estados financieros reflejen esa pérdida de poder adquisitivo, en
vez de mostrar cifras históricas que ya no representan valor real.

## Partidas monetarias vs. no monetarias

Esta distinción es la base de todo el ajuste:

- **Partidas monetarias** (efectivo, cuentas por cobrar, cuentas por
  pagar): representan un derecho u obligación de una suma **fija** de
  dinero. Ya están expresadas en bolívares "de hoy" — **no se
  reexpresan** por inflación.
- **Partidas no monetarias** (inventario, activo fijo, capital social):
  su valor histórico en bolívares pierde sentido con la inflación —
  **sí se reexpresan**, multiplicando por el índice de precios.

## Reexpresión de partidas no monetarias

La fórmula usa el **INPC** (Índice Nacional de Precios al Consumidor,
que publica el BCV):

**valor reexpresado = valor histórico × (INPC de cierre / INPC de origen)**

Si compraste una máquina en 1.000.000 VES cuando el INPC estaba en 100,
y al cierre el INPC subió a 135, el valor reexpresado es 1.000.000 ×
(135/100) = 1.350.000 VES. El ajuste (350.000 VES) refleja cuánto valor
nominal hay que sumarle solo para que represente lo mismo en poder
adquisitivo.

## REPOMAN: el costo (o beneficio) de mantener dinero

**REPOMAN** significa Resultado por Posición Monetaria: el efecto de
haber mantenido partidas monetarias durante un período inflacionario.

- Si tienes **más activos monetarios que pasivos monetarios** (más
  efectivo y cuentas por cobrar que deudas), mantener ese dinero
  durante la inflación es una **pérdida** — pierde poder adquisitivo
  mientras lo tienes.
- Si tienes **más pasivos monetarios que activos monetarios** (más
  deudas que efectivo), es lo contrario: una **ganancia** — pagas esa
  deuda con bolívares que valen menos que cuando la contrajiste.

Por eso una empresa muy endeudada en bolívares (sin ajuste por
inflación de por medio) puede beneficiarse de la inflación en ese
sentido específico, mientras que una empresa con mucho efectivo
ocioso en bolívares pierde valor solo por tenerlo guardado.
`.trim(),
  preguntas: [
    {
      id: "ai-q1",
      enunciado: "¿Las partidas monetarias (efectivo, CxC, CxP) se reexpresan por inflación?",
      opciones: [
        { id: "a", texto: "Sí, siempre" },
        { id: "b", texto: "No — ya están expresadas en bolívares de cierre" },
      ],
      opcionCorrectaId: "b",
      explicacion:
        "Las partidas monetarias representan una suma fija de dinero, ya en unidades de cierre — lo que sí les afecta es el REPOMAN, no la reexpresión.",
    },
    {
      id: "ai-q2",
      enunciado: "¿Cuál es la fórmula de reexpresión de una partida no monetaria?",
      opciones: [
        { id: "a", texto: "valor histórico × (INPC de cierre / INPC de origen)" },
        { id: "b", texto: "valor histórico + tasa de cambio" },
        { id: "c", texto: "valor histórico × alícuota de IVA" },
      ],
      opcionCorrectaId: "a",
      explicacion:
        "Se multiplica el valor histórico por el factor de reexpresión (INPC de cierre entre INPC de origen), llevándolo a unidades de poder adquisitivo del cierre.",
    },
    {
      id: "ai-q3",
      enunciado: "¿Qué significa REPOMAN?",
      opciones: [
        { id: "a", texto: "Retención Porcentual de Manejo" },
        { id: "b", texto: "Resultado por Posición Monetaria" },
      ],
      opcionCorrectaId: "b",
      explicacion:
        "REPOMAN es el efecto de haber mantenido una posición monetaria neta (activos monetarios menos pasivos monetarios) durante un período inflacionario.",
    },
    {
      id: "ai-q4",
      enunciado:
        "Una empresa tiene mucho más efectivo y cuentas por cobrar que deudas. Durante un período inflacionario, el REPOMAN de esa posición es...",
      opciones: [
        { id: "a", texto: "Una ganancia monetaria" },
        { id: "b", texto: "Una pérdida monetaria" },
      ],
      opcionCorrectaId: "b",
      explicacion:
        "Mantener una posición monetaria activa neta (más efectivo/CxC que CxP) durante inflación es una pérdida: ese dinero pierde poder adquisitivo mientras lo tienes.",
    },
    {
      id: "ai-q5",
      enunciado:
        "Una empresa tiene mucha más deuda (pasivo monetario) que efectivo o cuentas por cobrar. El REPOMAN de esa posición es...",
      opciones: [
        { id: "a", texto: "Una ganancia monetaria" },
        { id: "b", texto: "Una pérdida monetaria" },
      ],
      opcionCorrectaId: "a",
      explicacion:
        "Una posición monetaria pasiva neta (más deudas que efectivo/CxC) genera ganancia durante inflación: la deuda se termina pagando con bolívares que valen menos.",
    },
  ],
};

export const flashcardsMultimonedaInflacion: Flashcard[] = [
  {
    id: "fc-mi-1",
    moduloId: "multimoneda-inflacion",
    pregunta: "¿A qué tasa se registra inicialmente una partida en moneda extranjera?",
    respuesta: "A la tasa histórica: la tasa de cambio del día de la operación.",
  },
  {
    id: "fc-mi-2",
    moduloId: "multimoneda-inflacion",
    pregunta: "Cuenta por cobrar en USD + el bolívar se deprecia → ¿ganancia o pérdida?",
    respuesta: "Ganancia cambiaria (el activo en divisas vale más en bolívares).",
  },
  {
    id: "fc-mi-3",
    moduloId: "multimoneda-inflacion",
    pregunta: "Cuenta por pagar en USD + el bolívar se deprecia → ¿ganancia o pérdida?",
    respuesta: "Pérdida cambiaria (la deuda cuesta más bolívares para pagarla).",
  },
  {
    id: "fc-mi-4",
    moduloId: "multimoneda-inflacion",
    pregunta: "¿Diferencial cambiario realizado vs. no realizado?",
    respuesta:
      "Realizado = al liquidar (cobrar/pagar), es definitivo. No realizado = al cierre de período sobre partida abierta, es una estimación reversible.",
  },
  {
    id: "fc-mi-5",
    moduloId: "multimoneda-inflacion",
    pregunta: "¿Qué partidas se reexpresan por inflación: monetarias o no monetarias?",
    respuesta: "Las no monetarias (inventario, activo fijo, capital) — las monetarias no se reexpresan.",
  },
  {
    id: "fc-mi-6",
    moduloId: "multimoneda-inflacion",
    pregunta: "Fórmula de reexpresión de una partida no monetaria",
    respuesta: "valor histórico × (INPC de cierre / INPC de origen)",
  },
  {
    id: "fc-mi-7",
    moduloId: "multimoneda-inflacion",
    pregunta: "¿Qué mide el REPOMAN?",
    respuesta:
      "El efecto de mantener una posición monetaria neta (activos monetarios − pasivos monetarios) durante un período inflacionario.",
  },
  {
    id: "fc-mi-8",
    moduloId: "multimoneda-inflacion",
    pregunta: "Posición monetaria ACTIVA neta (más efectivo/CxC que CxP) durante inflación → ¿ganancia o pérdida?",
    respuesta: "Pérdida monetaria — ese dinero pierde poder adquisitivo mientras se mantiene.",
  },
  {
    id: "fc-mi-9",
    moduloId: "multimoneda-inflacion",
    pregunta: "Posición monetaria PASIVA neta (más deudas que efectivo/CxC) durante inflación → ¿ganancia o pérdida?",
    respuesta: "Ganancia monetaria — la deuda se paga con bolívares que valen menos.",
  },
  {
    id: "fc-mi-10",
    moduloId: "multimoneda-inflacion",
    pregunta: "¿Qué índice se usa para reexpresar por inflación en Venezuela?",
    respuesta: "El INPC (Índice Nacional de Precios al Consumidor) que publica el BCV.",
  },
];
