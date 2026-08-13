import { AppShell } from "@/components/layout/app-shell";
import { FormularioCuenta } from "@/components/cuenta/formulario-cuenta";

export default function CuentaPage() {
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight">Tu cuenta</h1>
      <p className="mt-2 text-sm text-gris-500">
        Inicia sesión para sincronizar tu progreso entre dispositivos.
      </p>
      <div className="mt-8">
        <FormularioCuenta />
      </div>
    </AppShell>
  );
}
