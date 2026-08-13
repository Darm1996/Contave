import { AppShell } from "@/components/layout/app-shell";
import { SimuladorAjusteInflacion } from "@/components/modulo-2/simulador-ajuste-inflacion";
import { SimuladorDiferencialCambiario } from "@/components/modulo-2/simulador-diferencial-cambiario";

export default function Modulo2Page() {
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight">
        Módulo 2 · Multimoneda y Ajuste por Inflación
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-gris-500">
        Contabilidad bimonetaria (NIC 21) y ajuste por inflación
        financiero (BA VEN-NIF 2 / NIC 29). Ambos simuladores muestran la
        fórmula, los insumos y los parámetros usados en cada cálculo —
        ningún número se presenta sin su traza.
      </p>

      <div className="mt-8 max-w-3xl space-y-8">
        <SimuladorDiferencialCambiario />
        <SimuladorAjusteInflacion />
      </div>
    </AppShell>
  );
}
