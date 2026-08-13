import type { Flashcard, Leccion } from "@/lib/aprendizaje/tipos";

/**
 * Módulo 4: Estados Financieros (VEN-NIF / NIC 1). Dos lecciones: los
 * 4 estados y qué muestra cada uno, y cómo se relacionan/encadenan
 * entre sí (algo que se entiende mejor una vez que ya se conoce cada
 * estado por separado).
 */

export const leccionCuatroEstados: Leccion = {
  id: "ef-cuatro-estados",
  moduloId: "estados-financieros",
  titulo: "Los 4 estados financieros y qué muestra cada uno",
  contenidoMarkdown: `
Un juego completo de estados financieros bajo VEN-NIF (basado en NIC 1)
tiene **cuatro** piezas, y cada una responde una pregunta distinta
sobre la empresa.

## 1. Estado de Situación Financiera (Balance General)

Responde: **¿qué tiene la empresa y cómo lo financió, en un momento
exacto en el tiempo?** Es una fotografía, no una película — muestra el
Activo, el Pasivo y el Patrimonio a una fecha de corte específica (por
ejemplo, al 31 de diciembre). Es donde vive la ecuación contable:
Activo = Pasivo + Patrimonio.

## 2. Estado de Resultados Integrales

Responde: **¿la empresa ganó o perdió dinero durante un período?** A
diferencia del Balance, este sí es una película: cubre un rango de
tiempo (un mes, un trimestre, un año). Empieza con los ingresos, resta
los costos y gastos, y llega a la utilidad (o pérdida) neta del
período.

## 3. Estado de Cambios en el Patrimonio

Responde: **¿por qué cambió el patrimonio de la empresa de un período
a otro?** Muestra el patrimonio al inicio del período, le suma la
utilidad neta que vino del Estado de Resultados, le resta lo que se
repartió como dividendos, y suma o resta cualquier otro movimiento
directo al patrimonio (como un nuevo aporte de capital), hasta llegar
al patrimonio de cierre.

## 4. Estado de Flujos de Efectivo

Responde: **¿de dónde salió y a dónde fue el efectivo de la empresa?**
Una empresa puede reportar utilidad en el Estado de Resultados y aun
así quedarse sin efectivo (por ejemplo, si vendió mucho a crédito y
todavía no cobra). Este estado separa los movimientos de efectivo en
tres actividades:

- **Operación**: efectivo generado o usado por el negocio del día a
  día (cobros a clientes, pagos a proveedores y empleados).
- **Inversión**: compra o venta de activos de largo plazo (equipos,
  propiedades, inversiones financieras).
- **Financiamiento**: préstamos recibidos o pagados, aportes de
  capital, dividendos pagados.
`.trim(),
  preguntas: [
    {
      id: "ef1-q1",
      enunciado: "¿Qué estado financiero es una 'fotografía' a una fecha exacta, no un rango de tiempo?",
      opciones: [
        { id: "a", texto: "Estado de Situación Financiera (Balance General)" },
        { id: "b", texto: "Estado de Resultados Integrales" },
      ],
      opcionCorrectaId: "a",
      explicacion:
        "El Balance muestra Activo, Pasivo y Patrimonio a una fecha de corte específica — es una foto de un momento, no una película de un período.",
    },
    {
      id: "ef1-q2",
      enunciado: "¿Qué estado financiero responde si la empresa ganó o perdió dinero durante un período?",
      opciones: [
        { id: "a", texto: "Estado de Situación Financiera" },
        { id: "b", texto: "Estado de Resultados Integrales" },
      ],
      opcionCorrectaId: "b",
      explicacion:
        "El Estado de Resultados cubre un rango de tiempo y llega a la utilidad o pérdida neta del período, restando costos y gastos de los ingresos.",
    },
    {
      id: "ef1-q3",
      enunciado: "¿Qué muestra el Estado de Cambios en el Patrimonio?",
      opciones: [
        { id: "a", texto: "Por qué cambió el patrimonio de un período a otro (utilidad, dividendos, aportes)" },
        { id: "b", texto: "El detalle de todas las cuentas por cobrar" },
      ],
      opcionCorrectaId: "a",
      explicacion:
        "Parte del patrimonio inicial, suma la utilidad del período, resta dividendos repartidos y otros movimientos, y llega al patrimonio de cierre.",
    },
    {
      id: "ef1-q4",
      enunciado: "¿Por qué una empresa puede tener utilidad en el Estado de Resultados y aun así quedarse sin efectivo?",
      opciones: [
        { id: "a", texto: "Porque vendió mucho a crédito y todavía no ha cobrado ese dinero" },
        { id: "b", texto: "Eso no puede pasar nunca" },
      ],
      opcionCorrectaId: "a",
      explicacion:
        "La utilidad contable incluye ventas a crédito ya reconocidas como ingreso, aunque el efectivo todavía no haya entrado — por eso hace falta el Estado de Flujos de Efectivo aparte.",
    },
    {
      id: "ef1-q5",
      enunciado: "¿Cuáles son las tres actividades en que se divide el Estado de Flujos de Efectivo?",
      opciones: [
        { id: "a", texto: "Operación, Inversión, Financiamiento" },
        { id: "b", texto: "Activo, Pasivo, Patrimonio" },
      ],
      opcionCorrectaId: "a",
      explicacion:
        "El flujo de efectivo se separa en operación (negocio del día a día), inversión (activos de largo plazo) y financiamiento (deuda y capital).",
    },
  ],
};

export const leccionRelacionEstados: Leccion = {
  id: "ef-relacion-estados",
  moduloId: "estados-financieros",
  titulo: "Cómo se encadenan los 4 estados entre sí",
  contenidoMarkdown: `
Los cuatro estados financieros no son documentos aislados — cada uno
alimenta al siguiente. Entender ese encadenamiento es lo que permite
leer un juego de estados financieros como una historia completa, en
vez de cuatro reportes sueltos.

## De Resultados a Cambios en el Patrimonio

La utilidad (o pérdida) neta que sale al final del **Estado de
Resultados Integrales** es exactamente el número que entra al
**Estado de Cambios en el Patrimonio** como el principal aumento (o
disminución) del patrimonio del período.

## De Cambios en el Patrimonio al Balance

El patrimonio de **cierre** que calcula el Estado de Cambios en el
Patrimonio es el mismo número que aparece como Patrimonio en el
**Estado de Situación Financiera** a esa fecha de cierre. Así se
conecta lo que pasó durante el período con la foto final.

## Del Balance al Flujo de Efectivo

El saldo de Efectivo que aparece en el **Estado de Situación
Financiera** al inicio y al final del período son, respectivamente, el
punto de partida y el punto de llegada del **Estado de Flujos de
Efectivo**: este último explica, paso a paso, cómo se pasó de un saldo
de efectivo al otro.

## El circuito completo

1. Resultados → utilidad neta del período
2. Esa utilidad → entra al Estado de Cambios en el Patrimonio
3. El patrimonio de cierre → aparece en el Balance
4. El efectivo inicial y final del Balance → se explican en el Flujo
   de Efectivo

Por eso, si un solo estado tiene un error, normalmente se nota — el
encadenamiento deja de cuadrar en alguno de estos cuatro puntos de
conexión. Es la misma lógica que la partida doble, pero a nivel de
estados completos en vez de asientos individuales.
`.trim(),
  preguntas: [
    {
      id: "ef2-q1",
      enunciado: "¿A cuál de los otros estados 'alimenta' la utilidad neta del Estado de Resultados?",
      opciones: [
        { id: "a", texto: "Al Estado de Cambios en el Patrimonio" },
        { id: "b", texto: "Directamente al Estado de Flujos de Efectivo" },
      ],
      opcionCorrectaId: "a",
      explicacion:
        "La utilidad neta del período entra al Estado de Cambios en el Patrimonio como el principal movimiento que aumenta (o reduce, si hay pérdida) el patrimonio.",
    },
    {
      id: "ef2-q2",
      enunciado: "El patrimonio de cierre calculado en el Estado de Cambios en el Patrimonio, ¿dónde vuelve a aparecer?",
      opciones: [
        { id: "a", texto: "En el Estado de Situación Financiera, como el Patrimonio a esa fecha" },
        { id: "b", texto: "No vuelve a aparecer en ningún otro estado" },
      ],
      opcionCorrectaId: "a",
      explicacion:
        "El patrimonio de cierre que calcula el Estado de Cambios en el Patrimonio es el mismo valor que se reporta como Patrimonio en el Balance a esa fecha.",
    },
    {
      id: "ef2-q3",
      enunciado: "¿Qué explica, paso a paso, el Estado de Flujos de Efectivo?",
      opciones: [
        { id: "a", texto: "Cómo se pasó del saldo de efectivo inicial al saldo de efectivo final del Balance" },
        { id: "b", texto: "Cómo cambió el inventario durante el período" },
      ],
      opcionCorrectaId: "a",
      explicacion:
        "El efectivo inicial y final que aparecen en el Balance son el punto de partida y de llegada del Estado de Flujos de Efectivo, que explica ese cambio por actividad.",
    },
    {
      id: "ef2-q4",
      enunciado: "¿Cuál es el orden correcto del encadenamiento entre los 4 estados?",
      opciones: [
        { id: "a", texto: "Resultados → Cambios en el Patrimonio → Balance → Flujo de Efectivo" },
        { id: "b", texto: "Flujo de Efectivo → Balance → Resultados → Cambios en el Patrimonio" },
      ],
      opcionCorrectaId: "a",
      explicacion:
        "La utilidad de Resultados alimenta Cambios en el Patrimonio; el patrimonio de cierre alimenta el Balance; y el efectivo del Balance se explica en el Flujo de Efectivo.",
    },
    {
      id: "ef2-q5",
      enunciado: "Si un error rompe el encadenamiento entre los estados, ¿qué suele pasar?",
      opciones: [
        { id: "a", texto: "Normalmente se nota, porque los números dejan de cuadrar entre un estado y el siguiente" },
        { id: "b", texto: "No hay forma de detectarlo, cada estado es completamente independiente" },
      ],
      opcionCorrectaId: "a",
      explicacion:
        "Como cada estado alimenta al siguiente, un error en alguno normalmente se hace visible cuando los números no cuadran en el punto de conexión — parecido a como funciona la partida doble en los asientos.",
    },
  ],
};

export const flashcardsEstadosFinancieros: Flashcard[] = [
  {
    id: "fc-ef-1",
    moduloId: "estados-financieros",
    pregunta: "¿Cuáles son los 4 estados financieros bajo VEN-NIF/NIC 1?",
    respuesta:
      "Estado de Situación Financiera, Estado de Resultados Integrales, Estado de Cambios en el Patrimonio, Estado de Flujos de Efectivo.",
  },
  {
    id: "fc-ef-2",
    moduloId: "estados-financieros",
    pregunta: "¿Qué estado es una 'fotografía' a una fecha exacta?",
    respuesta: "El Estado de Situación Financiera (Balance General).",
  },
  {
    id: "fc-ef-3",
    moduloId: "estados-financieros",
    pregunta: "¿Qué estado cubre un rango de tiempo y llega a la utilidad neta?",
    respuesta: "El Estado de Resultados Integrales.",
  },
  {
    id: "fc-ef-4",
    moduloId: "estados-financieros",
    pregunta: "¿En qué tres actividades se divide el Estado de Flujos de Efectivo?",
    respuesta: "Operación, Inversión y Financiamiento.",
  },
  {
    id: "fc-ef-5",
    moduloId: "estados-financieros",
    pregunta: "¿A qué estado entra la utilidad neta del Estado de Resultados?",
    respuesta: "Al Estado de Cambios en el Patrimonio, como el principal aumento del patrimonio del período.",
  },
  {
    id: "fc-ef-6",
    moduloId: "estados-financieros",
    pregunta: "¿Dónde vuelve a aparecer el patrimonio de cierre del Estado de Cambios en el Patrimonio?",
    respuesta: "Como el Patrimonio en el Estado de Situación Financiera a esa fecha.",
  },
  {
    id: "fc-ef-7",
    moduloId: "estados-financieros",
    pregunta: "¿Qué explica el Estado de Flujos de Efectivo respecto al Balance?",
    respuesta: "Cómo se pasó del saldo de efectivo inicial al final que aparecen en el Balance.",
  },
  {
    id: "fc-ef-8",
    moduloId: "estados-financieros",
    pregunta: "¿Por qué una empresa con utilidad puede quedarse sin efectivo?",
    respuesta: "Porque parte de esa utilidad puede venir de ventas a crédito todavía no cobradas.",
  },
];
