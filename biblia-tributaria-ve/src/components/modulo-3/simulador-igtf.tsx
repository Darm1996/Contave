"use client";

import { useMemo, useState } from "react";
import { calcularIGTF, esOperacionSujetaIGTF } from "@/lib/motores/igtf";
import { TrazaPanel } from "@/components/shared/traza-panel";

const inputClase =
  "w-full rounded-md border border-[var(--borde)] bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-acento";
const labelClase = "mb-1 block text-xs font-medium text-gris-500";

export function SimuladorIGTF() {
  const [montoOperacion, setMontoOperacion] = useState("1000");
  const [alicuota, setAlicuota] = useState("3");
  const [esContribuyenteEspecial, setEsContribuyenteEspecial] = useState(false);
  const [pagoEnDivisasOCripto, setPagoEnDivisasOCripto] = useState(true);
  const [pagoEnEfectivoNacional, setPagoEnEfectivoNacional] = useState(false);

  const sujecion = useMemo(
    () =>
      esOperacionSujetaIGTF({
        esContribuyenteEspecial,
        pagoEnDivisasOCripto,
        pagoEnEfectivoNacional,
      }),
    [esContribuyenteEspecial, pagoEnDivisasOCripto, pagoEnEfectivoNacional],
  );

  const resultado = useMemo(() => {
    try {
      return calcularIGTF({
        montoOperacion: Number(montoOperacion) || 0,
        alicuota: {
          valor: Number(alicuota) || 0,
          fecha: "hoy",
          fuenteOficial:
            'Ingresado manualmente en el simulador — reemplazar por la fila correspondiente de parametros_fiscales (codigo IGTF_ALICUOTA)',
          verificado: false,
        },
        sujecion,
      });
    } catch {
      return null;
    }
  }, [montoOperacion, alicuota, sujecion]);

  return (
    <section className="rounded-lg border border-[var(--borde)] p-6">
      <h2 className="text-lg font-semibold tracking-tight">IGTF</h2>
      <p className="mt-1 text-sm text-gris-500">
        Determina primero si la operación está sujeta a IGTF (pago en
        divisas/cripto, o efectivo nacional pagado por un Sujeto Pasivo
        Especial) y luego calcula el monto.
      </p>

      <div className="mt-4 rounded-md border border-alerta/30 bg-alerta/5 px-3 py-2 text-xs text-alerta">
        ⚠️ La alícuota de este simulador se ingresa manualmente y no
        proviene del catálogo oficial de parámetros.
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <label className={labelClase}>Monto de la operación (VES)</label>
          <input className={`${inputClase} cifra`} type="number" value={montoOperacion} onChange={(e) => setMontoOperacion(e.target.value)} />
        </div>
        <div>
          <label className={labelClase}>Alícuota (%)</label>
          <input className={`${inputClase} cifra`} type="number" value={alicuota} onChange={(e) => setAlicuota(e.target.value)} />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <label className="flex items-center gap-2 text-xs text-gris-600 dark:text-gris-400">
          <input type="checkbox" checked={esContribuyenteEspecial} onChange={(e) => setEsContribuyenteEspecial(e.target.checked)} />
          El pagador es Sujeto Pasivo Especial
        </label>
        <label className="flex items-center gap-2 text-xs text-gris-600 dark:text-gris-400">
          <input
            type="checkbox"
            checked={pagoEnDivisasOCripto}
            onChange={(e) => {
              setPagoEnDivisasOCripto(e.target.checked);
              if (e.target.checked) setPagoEnEfectivoNacional(false);
            }}
          />
          El pago se hizo en moneda extranjera o criptoactivo
        </label>
        <label className="flex items-center gap-2 text-xs text-gris-600 dark:text-gris-400">
          <input
            type="checkbox"
            checked={pagoEnEfectivoNacional}
            onChange={(e) => {
              setPagoEnEfectivoNacional(e.target.checked);
              if (e.target.checked) setPagoEnDivisasOCripto(false);
            }}
          />
          El pago se hizo en efectivo/moneda nacional
        </label>
      </div>

      <div className="mt-4 rounded-md border border-[var(--borde)] bg-[var(--bg-panel)] px-3 py-2 text-xs">
        <span className={sujecion.sujetaAIGTF ? "text-alerta" : "text-gris-500"}>
          {sujecion.sujetaAIGTF ? "Sujeta a IGTF" : "No sujeta a IGTF"}
        </span>
        <span className="text-gris-500"> — {sujecion.motivo}</span>
      </div>

      {resultado && (
        <div className="mt-4">
          <div className="mb-4 text-sm text-gris-500">
            Monto IGTF:{" "}
            <span className={`cifra font-semibold ${resultado.montoIGTF > 0 ? "text-alerta" : ""}`}>
              {resultado.montoIGTF.toFixed(2)} VES
            </span>
          </div>
          <TrazaPanel traza={resultado.traza} />
        </div>
      )}
    </section>
  );
}
