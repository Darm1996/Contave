import type { Flashcard, Leccion } from "@/lib/aprendizaje/tipos";

/**
 * Módulo 3: Tributario Nacional (SENIAT). Tres lecciones, una por
 * tributo — reaprovechan el conocimiento normativo ya investigado para
 * el motor de cálculo del simulador (biblia-tributaria-ve), pero aquí
 * el objetivo es entender el mecanismo, no calcular con datos reales.
 * Ningún porcentaje de este contenido es una cifra oficial vigente —
 * donde hace falta un número para el ejemplo, se marca explícitamente
 * como ilustrativo.
 */

export const leccionIVA: Leccion = {
  id: "tributario-iva",
  moduloId: "tributario",
  titulo: "IVA: cómo funciona el crédito y el débito fiscal",
  contenidoMarkdown: `
El IVA (Impuesto al Valor Agregado) grava el valor que cada empresa
**agrega** en la cadena de producción y venta — no el precio total del
producto. El mecanismo que logra esto es la resta entre débito y
crédito fiscal.

## Débito fiscal y crédito fiscal

- **Débito fiscal**: el IVA que la empresa **cobra** a sus clientes en
  sus ventas.
- **Crédito fiscal**: el IVA que la empresa **paga** a sus proveedores
  en sus compras.

Al final del período, la empresa entera al SENIAT la diferencia:

**IVA a pagar = débito fiscal − crédito fiscal**

Si el crédito fiscal es mayor que el débito (compraste más de lo que
vendiste ese mes), no hay que pagar nada — el excedente de crédito se
arrastra al siguiente período.

## Retención de IVA (75% / 100%)

Ciertos compradores (los agentes de retención designados por el
SENIAT, típicamente Sujetos Pasivos Especiales) no le pagan el IVA
completo a su proveedor: retienen una parte (75% o 100%, según el
caso) y se la enteran directamente al SENIAT en nombre del proveedor.
El proveedor recibe el resto y usa el comprobante de retención como
crédito a su favor en su propia declaración.

## Prorrateo de crédito fiscal

Si una empresa vende **tanto productos gravados como exentos o
exonerados** en el mismo período, no todo su crédito fiscal de compras
es 100% deducible — solo la proporción que corresponde a la parte
gravada de sus ventas. Eso se llama prorrateo:

**prorrata = ventas gravadas / ventas totales**

Ese porcentaje se aplica al crédito fiscal de las compras de "uso
mixto" (las que sirven tanto para lo gravado como para lo exento) para
saber cuánto de ese crédito sí se puede deducir.

## Exento vs. exonerado

Dos cosas que se confunden seguido:

- **Exento**: la ley dice directamente que esa operación no paga IVA
  (p.ej. ciertos alimentos de la cesta básica).
- **Exonerado**: la operación sí está gravada por ley, pero el
  Ejecutivo Nacional decidió liberarla del pago mediante un decreto,
  normalmente por tiempo limitado.
`.trim(),
  preguntas: [
    {
      id: "iva-q1",
      enunciado: "¿Cómo se calcula el IVA a pagar en un período?",
      opciones: [
        { id: "a", texto: "Débito fiscal − Crédito fiscal" },
        { id: "b", texto: "Débito fiscal + Crédito fiscal" },
        { id: "c", texto: "Solo el débito fiscal" },
      ],
      opcionCorrectaId: "a",
      explicacion:
        "El IVA a pagar es la diferencia entre lo que cobraste (débito) y lo que pagaste (crédito) en el período.",
    },
    {
      id: "iva-q2",
      enunciado: "¿Qué es el débito fiscal?",
      opciones: [
        { id: "a", texto: "El IVA que la empresa paga a sus proveedores" },
        { id: "b", texto: "El IVA que la empresa cobra a sus clientes" },
      ],
      opcionCorrectaId: "b",
      explicacion: "El débito fiscal es el IVA cobrado en las ventas; el crédito fiscal es el IVA pagado en las compras.",
    },
    {
      id: "iva-q3",
      enunciado: "Si el crédito fiscal de un período es mayor que el débito fiscal, ¿qué pasa?",
      opciones: [
        { id: "a", texto: "Hay que pagar la diferencia igual" },
        { id: "b", texto: "No hay que pagar nada; el excedente se arrastra al siguiente período" },
      ],
      opcionCorrectaId: "b",
      explicacion:
        "Cuando el crédito supera al débito, se genera un excedente de crédito fiscal que se traslada al período siguiente, no un pago negativo.",
    },
    {
      id: "iva-q4",
      enunciado: "¿Cuándo aplica el prorrateo de crédito fiscal?",
      opciones: [
        { id: "a", texto: "Cuando la empresa vende únicamente productos gravados" },
        { id: "b", texto: "Cuando la empresa vende productos gravados y también exentos/exonerados en el mismo período" },
      ],
      opcionCorrectaId: "b",
      explicacion:
        "El prorrateo solo aplica cuando hay ventas mixtas (gravadas + exentas/exoneradas), porque ahí no todo el crédito fiscal de compras es deducible.",
    },
    {
      id: "iva-q5",
      enunciado: "¿Cuál es la diferencia entre exento y exonerado?",
      opciones: [
        { id: "a", texto: "Exento lo define la ley directamente; exonerado lo decide el Ejecutivo por decreto" },
        { id: "b", texto: "Son sinónimos, no hay diferencia práctica" },
      ],
      opcionCorrectaId: "a",
      explicacion:
        "Exento = la ley excluye esa operación del IVA. Exonerado = la operación sí está gravada por ley, pero un decreto del Ejecutivo la libera del pago, normalmente por tiempo limitado.",
    },
  ],
};

export const leccionISLR: Leccion = {
  id: "tributario-islr",
  moduloId: "tributario",
  titulo: "ISLR: de la utilidad contable al impuesto a pagar",
  contenidoMarkdown: `
El ISLR (Impuesto Sobre la Renta) no se calcula directamente sobre la
utilidad contable de la empresa — primero hay que ajustarla para
llegar a la **renta gravable**, y luego aplicar la tarifa.

## Conciliación fiscal: de la utilidad contable a la renta gravable

La contabilidad financiera y la ley tributaria no siempre coinciden en
qué cuenta como gasto o como ingreso. La conciliación fiscal ajusta la
utilidad contable:

**renta gravable = utilidad contable + partidas no deducibles − partidas no gravables**

- **Partidas no deducibles**: gastos que sí se contabilizaron pero que
  la ley no permite restar (p.ej. multas, gastos sin comprobación
  fiscal válida) — se **suman** de vuelta.
- **Partidas no gravables**: ingresos que sí se contabilizaron pero que
  la ley no considera gravables (p.ej. ciertos dividendos ya gravados
  en otra empresa) — se **restan**.

## Tarifas progresivas

El ISLR usa tarifas progresivas por tramos, expresadas en Unidades
Tributarias (UT): a mayor renta gravable, mayor es el porcentaje que
se aplica sobre el excedente de cada tramo. Existen tarifas distintas
según el tipo de contribuyente (personas naturales, personas
jurídicas, actividades específicas como hidrocarburos).

## Retenciones (Decreto 1808)

Cuando una empresa le paga a otra por ciertos servicios o conceptos
(honorarios, arrendamientos, publicidad, entre muchos otros), debe
**retener** un porcentaje de ISLR sobre ese pago y enterarlo al SENIAT
— el beneficiario recibe el resto y usa el comprobante como anticipo
de su propio impuesto anual.

## Declaración estimada vs. definitiva

- **Estimada**: un anticipo que se paga a mitad del ejercicio fiscal,
  calculado como un porcentaje del impuesto del ejercicio anterior —
  para que el Estado no tenga que esperar un año entero para recibir
  algo.
- **Definitiva**: el cálculo real del impuesto del ejercicio ya
  cerrado, contra el cual se descuentan tanto el anticipo estimado
  como las retenciones que le practicaron a la empresa durante el año.
`.trim(),
  preguntas: [
    {
      id: "islr-q1",
      enunciado: "¿Cómo se pasa de la utilidad contable a la renta gravable?",
      opciones: [
        { id: "a", texto: "Utilidad contable + partidas no deducibles − partidas no gravables" },
        { id: "b", texto: "Utilidad contable × tarifa de ISLR directamente" },
      ],
      opcionCorrectaId: "a",
      explicacion:
        "La conciliación fiscal ajusta la utilidad contable sumando lo que la ley no deja deducir y restando lo que la ley no considera gravable.",
    },
    {
      id: "islr-q2",
      enunciado: "Una multa que la empresa pagó y contabilizó como gasto es un ejemplo de...",
      opciones: [
        { id: "a", texto: "Partida no gravable (se resta)" },
        { id: "b", texto: "Partida no deducible (se suma de vuelta)" },
      ],
      opcionCorrectaId: "b",
      explicacion:
        "Las multas son un gasto contable pero la ley no las considera deducibles para efectos fiscales — hay que sumarlas de vuelta a la utilidad contable.",
    },
    {
      id: "islr-q3",
      enunciado: "¿En qué unidad se expresan los tramos de las tarifas progresivas de ISLR?",
      opciones: [
        { id: "a", texto: "En bolívares directamente" },
        { id: "b", texto: "En Unidades Tributarias (UT)" },
      ],
      opcionCorrectaId: "b",
      explicacion:
        "Los tramos de la tarifa progresiva se expresan en UT, no en un monto fijo de bolívares, para que se ajusten con el tiempo.",
    },
    {
      id: "islr-q4",
      enunciado: "¿Qué es una retención de ISLR según el Decreto 1808?",
      opciones: [
        { id: "a", texto: "Un anticipo que el beneficiario del pago recibe por adelantado" },
        { id: "b", texto: "Un porcentaje que quien paga descuenta y entera al SENIAT en nombre del beneficiario" },
      ],
      opcionCorrectaId: "b",
      explicacion:
        "Quien hace el pago retiene un porcentaje y lo entera al SENIAT; el beneficiario recibe el resto y usa el comprobante de retención como anticipo de su propio ISLR anual.",
    },
    {
      id: "islr-q5",
      enunciado: "¿Cuál es la diferencia entre declaración estimada y definitiva?",
      opciones: [
        { id: "a", texto: "La estimada es un anticipo a mitad de año; la definitiva es el cálculo real al cierre del ejercicio" },
        { id: "b", texto: "Son el mismo trámite con nombres distintos" },
      ],
      opcionCorrectaId: "a",
      explicacion:
        "La estimada adelanta un pago a mitad de año basado en el impuesto del año anterior; la definitiva calcula el impuesto real del ejercicio cerrado y descuenta lo ya anticipado.",
    },
  ],
};

export const leccionIGTF: Leccion = {
  id: "tributario-igtf",
  moduloId: "tributario",
  titulo: "IGTF: cuándo aplica y por qué",
  contenidoMarkdown: `
El IGTF (Impuesto a las Grandes Transacciones Financieras) no grava
todas las operaciones — solo se activa en dos situaciones concretas,
que pueden coexistir.

## Los dos hechos que activan el IGTF

1. **Pago en moneda extranjera o criptoactivo**: si un pago se hace en
   dólares (o cualquier moneda distinta al bolívar) o en criptoactivos,
   está sujeto a IGTF — sin importar si quien paga es un contribuyente
   ordinario o un Sujeto Pasivo Especial.

2. **Pago en efectivo/moneda nacional por un Sujeto Pasivo Especial**:
   si el pagador es un Sujeto Pasivo Especial y paga en bolívares en
   efectivo (fuera del sistema financiero formal), también aplica —
   aunque sea en moneda nacional.

Un contribuyente ordinario que paga en bolívares por el sistema
financiero normal **no** paga IGTF. El impuesto busca dos objetivos
distintos con esos dos hechos: gravar la dolarización de pagos, y
gravar el uso de efectivo fuera del sistema bancario por parte de los
contribuyentes más grandes.

## Percepción vs. autoliquidación

Muchas veces el IGTF no lo calcula ni lo declara directamente quien
paga: los bancos y otros agentes de percepción lo retienen
automáticamente al procesar el pago en divisas. En otros casos (pagos
en efectivo por un SPE, por ejemplo), es la propia empresa la que debe
reconocerlo y declararlo.

## Declaración quincenal

A diferencia del IVA (mensual) o el ISLR (anual con anticipo a mitad
de año), el IGTF se declara y entera **quincenalmente** — dos veces al
mes, sumando todas las operaciones sujetas de esa quincena.
`.trim(),
  preguntas: [
    {
      id: "igtf-q1",
      enunciado: "Un contribuyente ORDINARIO paga una factura en dólares. ¿Aplica IGTF?",
      opciones: [
        { id: "a", texto: "Sí — el pago en divisas aplica a cualquier contribuyente" },
        { id: "b", texto: "No — el IGTF solo aplica a Sujetos Pasivos Especiales" },
      ],
      opcionCorrectaId: "a",
      explicacion:
        "El pago en moneda extranjera o criptoactivo activa el IGTF para cualquier contribuyente, ordinario o especial — es el primer hecho generador, independiente del tipo de contribuyente.",
    },
    {
      id: "igtf-q2",
      enunciado: "Un contribuyente ORDINARIO paga en efectivo, en bolívares. ¿Aplica IGTF?",
      opciones: [
        { id: "a", texto: "Sí, siempre que sea en efectivo" },
        { id: "b", texto: "No — el pago en efectivo nacional solo activa el IGTF si el pagador es Sujeto Pasivo Especial" },
      ],
      opcionCorrectaId: "b",
      explicacion:
        "El segundo hecho generador (efectivo en moneda nacional) solo aplica cuando el pagador es un Sujeto Pasivo Especial — un contribuyente ordinario no queda sujeto por esta vía.",
    },
    {
      id: "igtf-q3",
      enunciado: "¿Cuáles son los DOS hechos que pueden activar el IGTF?",
      opciones: [
        { id: "a", texto: "Pago en divisas/cripto (cualquiera), o efectivo nacional pagado por un SPE" },
        { id: "b", texto: "Cualquier venta gravada con IVA" },
      ],
      opcionCorrectaId: "a",
      explicacion:
        "Son dos hechos independientes que pueden coexistir: pago en moneda extranjera/cripto (aplica a cualquiera), o pago en efectivo nacional hecho por un Sujeto Pasivo Especial.",
    },
    {
      id: "igtf-q4",
      enunciado: "¿Cada cuánto se declara el IGTF?",
      opciones: [
        { id: "a", texto: "Mensualmente, como el IVA" },
        { id: "b", texto: "Quincenalmente" },
      ],
      opcionCorrectaId: "b",
      explicacion: "El IGTF se declara dos veces al mes (quincenalmente), a diferencia del IVA que es mensual.",
    },
    {
      id: "igtf-q5",
      enunciado: "En muchos pagos en divisas, ¿quién suele retener el IGTF automáticamente?",
      opciones: [
        { id: "a", texto: "Los bancos u otros agentes de percepción" },
        { id: "b", texto: "Siempre lo autoliquida directamente el pagador" },
      ],
      opcionCorrectaId: "a",
      explicacion:
        "Los bancos y otros agentes de percepción suelen retener el IGTF automáticamente al procesar pagos en divisas; en otros casos (como efectivo por un SPE), sí lo autoliquida la empresa.",
    },
  ],
};

export const flashcardsTributario: Flashcard[] = [
  {
    id: "fc-trib-1",
    moduloId: "tributario",
    pregunta: "Fórmula del IVA a pagar en un período",
    respuesta: "Débito fiscal − Crédito fiscal",
  },
  {
    id: "fc-trib-2",
    moduloId: "tributario",
    pregunta: "¿Qué es el débito fiscal?",
    respuesta: "El IVA que la empresa cobra a sus clientes en las ventas.",
  },
  {
    id: "fc-trib-3",
    moduloId: "tributario",
    pregunta: "¿Qué es el crédito fiscal?",
    respuesta: "El IVA que la empresa paga a sus proveedores en las compras.",
  },
  {
    id: "fc-trib-4",
    moduloId: "tributario",
    pregunta: "¿Cuándo aplica el prorrateo de crédito fiscal de IVA?",
    respuesta: "Cuando la empresa tiene ventas gravadas Y exentas/exoneradas en el mismo período.",
  },
  {
    id: "fc-trib-5",
    moduloId: "tributario",
    pregunta: "Exento vs. exonerado, ¿cuál es la diferencia?",
    respuesta: "Exento: la ley lo excluye del IVA. Exonerado: está gravado por ley, pero un decreto del Ejecutivo lo libera del pago.",
  },
  {
    id: "fc-trib-6",
    moduloId: "tributario",
    pregunta: "Fórmula de la conciliación fiscal del ISLR",
    respuesta: "Renta gravable = utilidad contable + partidas no deducibles − partidas no gravables",
  },
  {
    id: "fc-trib-7",
    moduloId: "tributario",
    pregunta: "¿En qué unidad se expresan los tramos de la tarifa progresiva del ISLR?",
    respuesta: "En Unidades Tributarias (UT).",
  },
  {
    id: "fc-trib-8",
    moduloId: "tributario",
    pregunta: "Declaración estimada vs. definitiva de ISLR",
    respuesta: "Estimada: anticipo a mitad de año según el impuesto del año anterior. Definitiva: cálculo real al cierre del ejercicio.",
  },
  {
    id: "fc-trib-9",
    moduloId: "tributario",
    pregunta: "¿Qué dos hechos activan el IGTF?",
    respuesta: "Pago en divisas/criptoactivo (cualquier contribuyente), o pago en efectivo nacional hecho por un Sujeto Pasivo Especial.",
  },
  {
    id: "fc-trib-10",
    moduloId: "tributario",
    pregunta: "¿Cada cuánto se declara el IGTF?",
    respuesta: "Quincenalmente (dos veces al mes).",
  },
];
