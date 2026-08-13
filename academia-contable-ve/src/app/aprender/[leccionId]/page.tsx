import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ContenidoLeccion } from "@/components/aprendizaje/contenido-leccion";
import { QuizLeccion } from "@/components/aprendizaje/quiz-leccion";
import { obtenerLeccion } from "@/contenido";

export default async function LeccionPage({
  params,
}: {
  params: Promise<{ leccionId: string }>;
}) {
  const { leccionId } = await params;
  const leccion = obtenerLeccion(leccionId);

  if (!leccion) notFound();

  return (
    <AppShell>
      <Link href="/" className="text-xs text-gris-500 hover:text-acento">
        ← Módulos
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{leccion.titulo}</h1>

      <div className="mt-6">
        <ContenidoLeccion markdown={leccion.contenidoMarkdown} />
      </div>

      <QuizLeccion leccionId={leccion.id} preguntas={leccion.preguntas} />
    </AppShell>
  );
}
