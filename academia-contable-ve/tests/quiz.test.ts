import { describe, expect, it } from "vitest";
import { calificarQuiz } from "@/lib/aprendizaje/quiz";
import type { Pregunta } from "@/lib/aprendizaje/tipos";

const preguntas: Pregunta[] = [
  {
    id: "p1",
    enunciado: "¿Toda partida doble mantiene el balance de qué ecuación?",
    opciones: [
      { id: "a", texto: "Activo = Pasivo + Patrimonio" },
      { id: "b", texto: "Ingresos = Gastos" },
    ],
    opcionCorrectaId: "a",
    explicacion: "La ecuación contable fundamental es Activo = Pasivo + Patrimonio.",
  },
  {
    id: "p2",
    enunciado: "Una cuenta de activo aumenta con...",
    opciones: [
      { id: "a", texto: "un crédito" },
      { id: "b", texto: "un débito" },
    ],
    opcionCorrectaId: "b",
    explicacion: "Las cuentas de activo tienen naturaleza deudora: aumentan con débitos.",
  },
  {
    id: "p3",
    enunciado: "¿Qué representa el patrimonio?",
    opciones: [
      { id: "a", texto: "Lo que la empresa debe a terceros" },
      { id: "b", texto: "Lo que queda para los dueños tras restar los pasivos de los activos" },
    ],
    opcionCorrectaId: "b",
    explicacion: "Patrimonio = Activo − Pasivo: el residual que pertenece a los dueños.",
  },
];

describe("calificarQuiz", () => {
  it("aprueba cuando el porcentaje de aciertos alcanza el umbral", () => {
    const r = calificarQuiz(preguntas, [
      { preguntaId: "p1", opcionElegidaId: "a" },
      { preguntaId: "p2", opcionElegidaId: "b" },
      { preguntaId: "p3", opcionElegidaId: "b" },
    ]);
    expect(r.aciertos).toBe(3);
    expect(r.porcentaje).toBe(100);
    expect(r.aprobado).toBe(true);
  });

  it("no aprueba si el porcentaje queda por debajo del umbral", () => {
    const r = calificarQuiz(preguntas, [
      { preguntaId: "p1", opcionElegidaId: "b" }, // incorrecta
      { preguntaId: "p2", opcionElegidaId: "a" }, // incorrecta
      { preguntaId: "p3", opcionElegidaId: "b" }, // correcta
    ]);
    expect(r.aciertos).toBe(1);
    expect(r.porcentaje).toBe(33);
    expect(r.aprobado).toBe(false);
  });

  it("cuenta una pregunta sin respuesta como incorrecta, no como error", () => {
    const r = calificarQuiz(preguntas, [
      { preguntaId: "p1", opcionElegidaId: "a" },
      { preguntaId: "p2", opcionElegidaId: "b" },
      // p3 sin responder
    ]);
    expect(r.total).toBe(3);
    expect(r.aciertos).toBe(2);
    expect(r.detalle.find((d) => d.preguntaId === "p3")?.correcta).toBe(false);
  });

  it("incluye el detalle por pregunta con la opción correcta e incorrecta elegida", () => {
    const r = calificarQuiz(preguntas, [{ preguntaId: "p1", opcionElegidaId: "b" }]);
    const detalleP1 = r.detalle.find((d) => d.preguntaId === "p1");
    expect(detalleP1).toEqual({
      preguntaId: "p1",
      correcta: false,
      opcionElegidaId: "b",
      opcionCorrectaId: "a",
    });
  });

  it("rechaza calificar un quiz sin preguntas", () => {
    expect(() => calificarQuiz([], [])).toThrow(/sin preguntas/);
  });
});
