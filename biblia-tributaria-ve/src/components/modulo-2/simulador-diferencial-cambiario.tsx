"use client";

import { useMemo, useState } from "react";
import {
  calcularDiferencialCambiarioNoRealizado,
  calcularDiferencialCambiarioRealizado,
  type NaturalezaPartida,
} from "@/lib/motores/diferencial-cambiario";
import { TrazaPanel } from "@/components/shared/traza-panel";

const inputClase =
  "w-full rounded-md border border-[var(--borde)] bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-acento";
const labelClase = "mb-1 block text-xs font-medium text-gris-500";

export function SimuladorDiferencialCambiario() {
  const [evento, setEvento] = useState<"REALIZADO" | "NO_REALIZADO">("REALIZADO");
  const [naturalezaPartida, setNaturalezaPartida] = useState<NaturalezaPartida>("ACTIVO");
  const [montoDivisa, setMontoDivisa] = useState("1000");
  const [tasaHistoricaValor, setTasaHistoricaValor] = useState("40");
  const [tasaHistoricaFecha, setTasaHistoricaFecha] = useState("2026-06-01");
  const [tasaNuevaValor, setTasaNuevaValor] = useState("48");
  const [tasaNuevaFecha, setTasaNuevaFecha] = useState("2026-07-13");

  const resultado = useMemo(() => {
    const montoDivisaNum = Number(montoDivisa);
    const tasaHistoricaNum = Number(tasaHistoricaValor);
    const tasaNuevaNum = Number(tasaNuevaValor);

    if (!montoDivisaNum || !tasaHistoricaNum || !tasaNuevaNum) return null;

    try {
      const insumos = {
        naturalezaPartida,
        montoDivisa: montoDivisaNum,
        tasaHistorica: {
          valor: tasaHistoricaNum,
          fecha: tasaHistoricaFecha,
          fuenteOficial: "Ingresado manualmente en el simulador — reemplazar por la fila correspondiente de series_temporales (tipo TASA_CAMBIO_BCV_USD)",
          verificado: false,
        },
        tasaNueva: {
          valor: tasaNuevaNum,
          fecha: tasaNuevaFecha,
          fuenteOficial: "Ingresado manualmente en el simulador — reemplazar por la fila correspondiente de series_temporales (tipo TASA_CAMBIO_BCV_USD)",
          verificado: false,
        },
      };

      return evento === "REALIZADO"
        ? calcularDiferencialCambiarioRealizado(insumos)
        : calcularDiferencialCambiarioNoRealizado(insumos);
    } catch {
      return null;
    }
  }, [evento, naturalezaPartida, montoDivisa, tasaHistoricaValor, tasaHistoricaFecha, tasaNuevaValor, tasaNuevaFecha]);

  return (
    <section className="rounded-lg border border-[var(--borde)] p-6">
      <h2 className="text-lg font-semibold tracking-tight">
        Diferencial cambiario (NIC 21)
      </h2>
      <p className="mt-1 text-sm text-gris-500">
        Compara el monto en bolívares de una partida en moneda extranjera
        a dos tasas distintas. Usa &quot;Realizado&quot; al liquidar la
        partida y &quot;No realizado&quot; al cierre de un período con la
        partida todavía abierta.
      </p>

      <div className="mt-4 rounded-md border border-alerta/30 bg-alerta/5 px-3 py-2 text-xs text-alerta">
        ⚠️ Los valores de tasa de este simulador se ingresan manualmente
        y no provienen de la serie oficial del BCV. No uses este
        resultado en una declaración o registro contable real.
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <label className={labelClase}>Momento del cálculo</label>
          <select
            className={inputClase}
            value={evento}
            onChange={(e) => setEvento(e.target.value as typeof evento)}
          >
            <option value="REALIZADO">Realizado (liquidación)</option>
            <option value="NO_REALIZADO">No realizado (cierre de período)</option>
          </select>
        </div>

        <div>
          <label className={labelClase}>Naturaleza de la partida</label>
          <select
            className={inputClase}
            value={naturalezaPartida}
            onChange={(e) => setNaturalezaPartida(e.target.value as NaturalezaPartida)}
          >
            <option value="ACTIVO">Activo (cuenta por cobrar en USD)</option>
            <option value="PASIVO">Pasivo (cuenta por pagar en USD)</option>
          </select>
        </div>

        <div>
          <label className={labelClase}>Monto en divisa (USD)</label>
          <input
            className={`${inputClase} cifra`}
            type="number"
            value={montoDivisa}
            onChange={(e) => setMontoDivisa(e.target.value)}
          />
        </div>

        <div />

        <div>
          <label className={labelClase}>Tasa histórica (origen)</label>
          <input
            className={`${inputClase} cifra`}
            type="number"
            value={tasaHistoricaValor}
            onChange={(e) => setTasaHistoricaValor(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClase}>Fecha de origen</label>
          <input
            className={inputClase}
            type="date"
            value={tasaHistoricaFecha}
            onChange={(e) => setTasaHistoricaFecha(e.target.value)}
          />
        </div>

        <div>
          <label className={labelClase}>
            {evento === "REALIZADO" ? "Tasa de liquidación" : "Tasa de cierre"}
          </label>
          <input
            className={`${inputClase} cifra`}
            type="number"
            value={tasaNuevaValor}
            onChange={(e) => setTasaNuevaValor(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClase}>
            {evento === "REALIZADO" ? "Fecha de liquidación" : "Fecha de cierre"}
          </label>
          <input
            className={inputClase}
            type="date"
            value={tasaNuevaFecha}
            onChange={(e) => setTasaNuevaFecha(e.target.value)}
          />
        </div>
      </div>

      {resultado && (
        <div className="mt-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="text-sm text-gris-500">Diferencial cambiario:</span>
            <span
              className={`cifra text-lg font-semibold ${
                resultado.tipoDiferencial === "GANANCIA"
                  ? "text-exito"
                  : resultado.tipoDiferencial === "PERDIDA"
                    ? "text-alerta"
                    : "text-gris-500"
              }`}
            >
              {resultado.diferencialCambiario.toFixed(2)} VES ({resultado.tipoDiferencial})
            </span>
          </div>
          <TrazaPanel traza={resultado.traza} />
        </div>
      )}
    </section>
  );
}
