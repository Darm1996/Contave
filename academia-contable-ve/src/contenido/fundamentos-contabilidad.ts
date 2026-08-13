import type { Flashcard, Leccion } from "@/lib/aprendizaje/tipos";

/**
 * Lección 1 del módulo "Fundamentos de Contabilidad". Contenido
 * general de contabilidad (partida doble, ecuación contable,
 * naturaleza de las cuentas) — son principios universales, no cifras
 * legales venezolanas, así que no aplica aquí la regla de "nunca
 * inventar un número sin fuente oficial" (esa regla es para alícuotas,
 * UT, tasas, etc., no para la definición de qué es un débito).
 */

export const leccionPartidaDoble: Leccion = {
  id: "fundamentos-partida-doble",
  moduloId: "fundamentos",
  titulo: "Partida doble y la ecuación contable",
  contenidoMarkdown: `
Toda la contabilidad moderna se sostiene sobre una idea simple: **cada
transacción afecta a la empresa desde dos ángulos a la vez**, y esos dos
ángulos siempre deben quedar en equilibrio. A eso se le llama **partida
doble**.

## La ecuación contable

**Activo = Pasivo + Patrimonio**

- **Activo**: todo lo que la empresa tiene o le deben (efectivo,
  cuentas por cobrar, inventario, equipos).
- **Pasivo**: todo lo que la empresa debe a terceros (proveedores,
  préstamos, impuestos por pagar).
- **Patrimonio**: lo que queda para los dueños después de restar el
  pasivo del activo — es literalmente Activo − Pasivo despejado.

Esta ecuación **nunca se desequilibra**. Si compras un equipo de
oficina de 500 USD de contado, el activo "Equipos" sube 500 y el activo
"Efectivo" baja 500 — el total del activo no cambia, y el pasivo y el
patrimonio tampoco. Si en cambio lo compras a crédito, el activo
"Equipos" sube 500 y el pasivo "Cuentas por pagar" sube 500 — ambos
lados suben igual.

## Débito y crédito: no significan "más" o "menos"

Un error común es pensar que débito = aumento y crédito = disminución.
Eso solo es cierto para **algunas** cuentas. Lo que en realidad importa
es la **naturaleza** de la cuenta:

- Cuentas de naturaleza **deudora** (Activo, Gasto): aumentan con
  **débitos**, disminuyen con créditos.
- Cuentas de naturaleza **acreedora** (Pasivo, Patrimonio, Ingreso):
  aumentan con **créditos**, disminuyen con débitos.

Por eso una cuenta por pagar (pasivo) *aumenta* cuando la *acreditas* —
lo contrario de lo que pasa con el efectivo (activo).

## El asiento: siempre balanceado

Un asiento contable es la anotación de una transacción. La regla de oro:
**la suma de los débitos siempre debe ser igual a la suma de los
créditos**. Si no cuadra, hay un error — no es una opinión, es
aritmética.

Ejemplo: la empresa vende mercancía por 1.000.000 VES de contado.

- Débito: Efectivo — 1.000.000 (el activo "Efectivo" sube)
- Crédito: Ventas — 1.000.000 (el ingreso sube, y los ingresos son de
  naturaleza acreedora)

Débitos (1.000.000) = Créditos (1.000.000). Balanceado.
`.trim(),
  preguntas: [
    {
      id: "pd-q1",
      enunciado: "¿Cuál es la ecuación contable fundamental?",
      opciones: [
        { id: "a", texto: "Ingresos = Gastos + Utilidad" },
        { id: "b", texto: "Activo = Pasivo + Patrimonio" },
        { id: "c", texto: "Débitos = Ingresos" },
      ],
      opcionCorrectaId: "b",
      explicacion:
        "Activo = Pasivo + Patrimonio es la base de la partida doble: todo lo que la empresa tiene se financió o con deuda (pasivo) o con recursos propios (patrimonio).",
    },
    {
      id: "pd-q2",
      enunciado: "Una cuenta de Pasivo (p.ej. Cuentas por Pagar) aumenta su saldo con...",
      opciones: [
        { id: "a", texto: "un débito" },
        { id: "b", texto: "un crédito" },
      ],
      opcionCorrectaId: "b",
      explicacion:
        "El pasivo es de naturaleza acreedora: aumenta con créditos y disminuye con débitos — al revés que el activo.",
    },
    {
      id: "pd-q3",
      enunciado:
        "La empresa compra un vehículo por 5.000 USD a crédito (a pagar en 90 días). ¿Qué pasa con el Activo total en ese momento?",
      opciones: [
        { id: "a", texto: "Sube 5.000 USD" },
        { id: "b", texto: "No cambia" },
        { id: "c", texto: "Baja 5.000 USD" },
      ],
      opcionCorrectaId: "a",
      explicacion:
        "El activo 'Vehículos' sube 5.000. Como fue a crédito (no se pagó de contado), el efectivo no baja — en cambio sube el pasivo 'Cuentas por pagar' en 5.000, manteniendo la ecuación balanceada.",
    },
    {
      id: "pd-q4",
      enunciado: "¿Qué naturaleza tiene una cuenta de Ingreso (p.ej. Ventas)?",
      opciones: [
        { id: "a", texto: "Deudora — aumenta con débitos" },
        { id: "b", texto: "Acreedora — aumenta con créditos" },
      ],
      opcionCorrectaId: "b",
      explicacion:
        "Los ingresos son de naturaleza acreedora, igual que el pasivo y el patrimonio — tiene sentido, porque un ingreso aumenta el patrimonio de la empresa.",
    },
    {
      id: "pd-q5",
      enunciado: "En un asiento contable correcto, la suma de los débitos debe ser...",
      opciones: [
        { id: "a", texto: "Mayor que la suma de los créditos" },
        { id: "b", texto: "Igual a la suma de los créditos" },
        { id: "c", texto: "No hay relación obligatoria entre ambos" },
      ],
      opcionCorrectaId: "b",
      explicacion:
        "Si los débitos no igualan a los créditos, el asiento tiene un error — es la verificación aritmética básica de cualquier registro contable.",
    },
  ],
};

export const flashcardsFundamentos: Flashcard[] = [
  {
    id: "fc-fundamentos-1",
    moduloId: "fundamentos",
    pregunta: "¿Cuál es la ecuación contable fundamental?",
    respuesta: "Activo = Pasivo + Patrimonio",
  },
  {
    id: "fc-fundamentos-2",
    moduloId: "fundamentos",
    pregunta: "¿Qué naturaleza tiene el Activo: deudora o acreedora?",
    respuesta: "Deudora — aumenta con débitos, disminuye con créditos.",
  },
  {
    id: "fc-fundamentos-3",
    moduloId: "fundamentos",
    pregunta: "¿Qué naturaleza tiene el Pasivo: deudora o acreedora?",
    respuesta: "Acreedora — aumenta con créditos, disminuye con débitos.",
  },
  {
    id: "fc-fundamentos-4",
    moduloId: "fundamentos",
    pregunta: "¿Qué naturaleza tiene el Patrimonio?",
    respuesta: "Acreedora — igual que el Pasivo, aumenta con créditos.",
  },
  {
    id: "fc-fundamentos-5",
    moduloId: "fundamentos",
    pregunta: "¿Qué naturaleza tienen los Gastos?",
    respuesta: "Deudora — aumentan con débitos, igual que el Activo.",
  },
  {
    id: "fc-fundamentos-6",
    moduloId: "fundamentos",
    pregunta: "¿Qué naturaleza tienen los Ingresos?",
    respuesta: "Acreedora — aumentan con créditos, igual que el Pasivo y el Patrimonio.",
  },
  {
    id: "fc-fundamentos-7",
    moduloId: "fundamentos",
    pregunta: "En un asiento contable, ¿qué debe cumplirse siempre?",
    respuesta: "Que la suma de los débitos sea igual a la suma de los créditos.",
  },
  {
    id: "fc-fundamentos-8",
    moduloId: "fundamentos",
    pregunta: "¿Cómo se calcula el Patrimonio a partir del Activo y el Pasivo?",
    respuesta: "Patrimonio = Activo − Pasivo",
  },
];
