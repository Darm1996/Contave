import { AppShell } from "@/components/layout/app-shell";

export default function Home() {
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight">
        Panel principal
      </h1>
      <p className="mt-2 max-w-xl text-sm text-gris-500">
        Iteración 1: estructura, esquema de base de datos y layout. Los
        módulos de contenido y los simuladores de cálculo se agregan en
        iteraciones siguientes, empezando por el Módulo 2 (Multimoneda e
        Inflación).
      </p>
    </AppShell>
  );
}
