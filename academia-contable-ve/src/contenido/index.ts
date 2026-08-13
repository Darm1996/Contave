import type { Flashcard, Leccion } from "@/lib/aprendizaje/tipos";
import { flashcardsFundamentos, leccionPartidaDoble } from "./fundamentos-contabilidad";
import {
  flashcardsMultimonedaInflacion,
  leccionAjusteInflacion,
  leccionDiferencialCambiario,
} from "./multimoneda-inflacion";
import { flashcardsTributario, leccionIGTF, leccionISLR, leccionIVA } from "./tributario";

export { MODULOS } from "./modulos";

const TODAS_LAS_LECCIONES: Leccion[] = [
  leccionPartidaDoble,
  leccionDiferencialCambiario,
  leccionAjusteInflacion,
  leccionIVA,
  leccionISLR,
  leccionIGTF,
];
const TODAS_LAS_FLASHCARDS: Flashcard[] = [
  ...flashcardsFundamentos,
  ...flashcardsMultimonedaInflacion,
  ...flashcardsTributario,
];

export function obtenerLeccion(id: string): Leccion | undefined {
  return TODAS_LAS_LECCIONES.find((l) => l.id === id);
}

export function obtenerFlashcards(): Flashcard[] {
  return TODAS_LAS_FLASHCARDS;
}

export function obtenerFlashcardsPorModulo(moduloId: string): Flashcard[] {
  return TODAS_LAS_FLASHCARDS.filter((f) => f.moduloId === moduloId);
}
