import { AppShell } from "@/components/layout/app-shell";
import { SimuladorIVA } from "@/components/modulo-3/simulador-iva";

export default function Modulo3Page() {
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight">
        Módulo 3 · Ecosistema Tributario Nacional (SENIAT)
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-gris-500">
        Esta iteración cubre IVA: libro de compras/ventas (esquema de
        datos), prorrateo de crédito fiscal, retenciones 75%/100% y
        declaración mensual. ISLR e IGTF quedan para la siguiente
        sub-iteración de este mismo módulo.
      </p>

      <div className="mt-8 max-w-3xl space-y-8">
        <SimuladorIVA />
      </div>
    </AppShell>
  );
}
