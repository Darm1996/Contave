import { AppShell } from "@/components/layout/app-shell";
import { RepasarFlashcards } from "@/components/aprendizaje/repasar-flashcards";
import { obtenerFlashcards } from "@/contenido";

export default function RepasarPage() {
  const flashcards = obtenerFlashcards();

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight">Repasar</h1>
      <p className="mt-2 text-sm text-gris-500">
        Repetición espaciada: califica qué tan fácil recordaste cada
        tarjeta y el sistema decide cuándo te la vuelve a mostrar.
      </p>

      <div className="mt-8">
        <RepasarFlashcards flashcards={flashcards} />
      </div>
    </AppShell>
  );
}
