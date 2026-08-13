"use client";

import { useMemo, useState } from "react";
import { calcularREPOMAN, reexpresarPartidaNoMonetaria } from "@/lib/motores/ajuste-inflacion";
import { TrazaPanel } from "@/components/shared/traza-panel";

const inputClase =
  "w-full rounded-md border border-[var(--borde)] bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-acento";
const labelClase = "mb-1 block text-xs font-medium text-gris-500";

function fuenteManual(campo: string) {
  return `Ingresado manualmente en el simulador — reemplazar por la fila correspondiente de series_temporales (tipo INPC_MENSUAL) para "${campo}"`;
}

export function SimuladorAjusteInflacion() {
  // Reexpresión de una partida no monetaria
  const [valorHistorico, setValorHistorico] = useState("1000000");
  const [inpcOrigenValor, setInpcOrigenValor] = useState("100");
  const [inpcOrigenFecha, setInpcOrigenFecha] = useState("2026-01-01");
  const [inpcCierreValor, setInpcCierreValor] = useState("135");
  const [inpcCierreFecha, setInpcCierreFecha] = useState("2026-06-30");

  // REPOMAN (posición monetaria neta, sin movimientos intermedios en
  // esta versión simplificada del simulador)
  const [posicionInicial, setPosicionInicial] = useState("500000");

  const reexpresion = useMemo(() => {
    const v = Number(valorHistorico);
    const io = Number(inpcOrigenValor);
    const ic = Number(inpcCierreValor);
    if (!v || !io || !ic) return null;
    try {
      return reexpresarPartidaNoMonetaria({
        valorHistorico: v,
        inpcOrigen: { valor: io, fecha: inpcOrigenFecha, fuenteOficial: fuenteManual("INPC de origen"), verificado: false },
        inpcCierre: { valor: ic, fecha: inpcCierreFecha, fuenteOficial: fuenteManual("INPC de cierre"), verificado: false },
      });
    } catch {
      return null;
    }
  }, [valorHistorico, inpcOrigenValor, inpcOrigenFecha, inpcCierreValor, inpcCierreFecha]);

  const repoman = useMemo(() => {
    const p = Number(posicionInicial);
    const io = Number(inpcOrigenValor);
    const ic = Number(inpcCierreValor);
    if (!io || !ic) return null;
    try {
      return calcularREPOMAN({
        posicionMonetariaNetaInicial: p,
        inpcInicial: { valor: io, fecha: inpcOrigenFecha, fuenteOficial: fuenteManual("INPC inicial"), verificado: false },
        inpcCierre: { valor: ic, fecha: inpcCierreFecha, fuenteOficial: fuenteManual("INPC de cierre"), verificado: false },
      });
    } catch {
      return null;
    }
  }, [posicionInicial, inpcOrigenValor, inpcOrigenFecha, inpcCierreValor, inpcCierreFecha]);

  return (
    <section className="mt-8 rounded-lg border border-[var(--borde)] p-6">
      <h2 className="text-lg font-semibold tracking-tight">
        Ajuste por inflación (BA VEN-NIF 2 / NIC 29)
      </h2>
      <p className="mt-1 text-sm text-gris-500">
        Reexpresa una partida no monetaria por el INPC y calcula el
        REPOMAN (resultado por posición monetaria neta) de un período,
        con la misma pareja de índices INPC de inicio y cierre.
      </p>

      <div className="mt-4 rounded-md border border-alerta/30 bg-alerta/5 px-3 py-2 text-xs text-alerta">
        ⚠️ Los índices INPC de este simulador se ingresan manualmente y
        no provienen de la serie oficial del BCV. No uses este resultado
        en un ajuste por inflación real.
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <label className={labelClase}>INPC de origen (inicio del período)</label>
          <input className={`${inputClase} cifra`} type="number" value={inpcOrigenValor} onChange={(e) => setInpcOrigenValor(e.target.value)} />
        </div>
        <div>
          <label className={labelClase}>Fecha de origen</label>
          <input className={inputClase} type="date" value={inpcOrigenFecha} onChange={(e) => setInpcOrigenFecha(e.target.value)} />
        </div>
        <div>
          <label className={labelClase}>INPC de cierre</label>
          <input className={`${inputClase} cifra`} type="number" value={inpcCierreValor} onChange={(e) => setInpcCierreValor(e.target.value)} />
        </div>
        <div>
          <label className={labelClase}>Fecha de cierre</label>
          <input className={inputClase} type="date" value={inpcCierreFecha} onChange={(e) => setInpcCierreFecha(e.target.value)} />
        </div>
      </div>

      <hr className="my-6 border-[var(--borde)]" />

      <h3 className="text-sm font-medium">Reexpresión de partida no monetaria</h3>
      <div className="mt-3 max-w-xs">
        <label className={labelClase}>Valor histórico (VES)</label>
        <input className={`${inputClase} cifra`} type="number" value={valorHistorico} onChange={(e) => setValorHistorico(e.target.value)} />
      </div>

      {reexpresion && (
        <div className="mt-4">
          <div className="mb-4 flex items-center gap-3">
            <span className="text-sm text-gris-500">Ajuste por inflación:</span>
            <span className="cifra text-lg font-semibold">
              {reexpresion.ajustePorInflacion.toFixed(2)} VES
            </span>
            <span className="text-sm text-gris-500">
              (valor reexpresado: {reexpresion.valorReexpresado.toFixed(2)} VES)
            </span>
          </div>
          <TrazaPanel traza={reexpresion.traza} />
        </div>
      )}

      <hr className="my-6 border-[var(--borde)]" />

      <h3 className="text-sm font-medium">
        REPOMAN — resultado por posición monetaria neta
      </h3>
      <div className="mt-3 max-w-xs">
        <label className={labelClase}>
          Posición monetaria neta inicial (efectivo + CxC − CxP, en VES)
        </label>
        <input className={`${inputClase} cifra`} type="number" value={posicionInicial} onChange={(e) => setPosicionInicial(e.target.value)} />
      </div>

      {repoman && (
        <div className="mt-4">
          <div className="mb-4 flex items-center gap-3">
            <span className="text-sm text-gris-500">REPOMAN:</span>
            <span
              className={`cifra text-lg font-semibold ${
                repoman.resultadoRepoman > 0 ? "text-exito" : repoman.resultadoRepoman < 0 ? "text-alerta" : ""
              }`}
            >
              {repoman.resultadoRepoman.toFixed(2)} VES (
              {repoman.resultadoRepoman > 0 ? "ganancia" : repoman.resultadoRepoman < 0 ? "pérdida" : "neutro"}
              )
            </span>
          </div>
          <TrazaPanel traza={repoman.traza} />
        </div>
      )}
    </section>
  );
}
