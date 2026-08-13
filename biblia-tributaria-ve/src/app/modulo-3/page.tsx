import { AppShell } from "@/components/layout/app-shell";
import { SimuladorIGTF } from "@/components/modulo-3/simulador-igtf";
import { SimuladorISLR } from "@/components/modulo-3/simulador-islr";
import { SimuladorIVA } from "@/components/modulo-3/simulador-iva";

export default function Modulo3Page() {
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight">
        Módulo 3 · Ecosistema Tributario Nacional (SENIAT)
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-gris-500">
        IVA (libro de compras/ventas, prorrateo, retenciones, declaración
        mensual), ISLR (retención Decreto 1808, conciliación fiscal,
        tarifa progresiva, rebajas por inversión) e IGTF (sujeción y
        cálculo, declaración quincenal).
      </p>
      <p className="mt-2 max-w-2xl text-xs text-gris-500">
        La distinción Contribuyente Ordinario vs. Sujeto Pasivo Especial
        (<code className="cifra">empresas.tipo_contribuyente</code>) ya
        vive en el esquema desde la Iteración 1 y determina, entre otras
        cosas, si aplica la retención de IVA quincenal y el agente de
        retención de ISLR/IGTF. Un flujo de UI que cambie según ese tipo
        de contribuyente se implementa cuando se conecte la aplicación a
        datos reales de una empresa (siguiente iteración con Supabase).
      </p>

      <div className="mt-8 max-w-3xl space-y-8">
        <SimuladorIVA />
        <SimuladorISLR />
        <SimuladorIGTF />
      </div>
    </AppShell>
  );
}
