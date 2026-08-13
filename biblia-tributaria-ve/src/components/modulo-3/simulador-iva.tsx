"use client";

import { useMemo, useState } from "react";
import {
  calcularDeclaracionIVAMensual,
  calcularIVADocumento,
  calcularProrrateoCreditoFiscal,
  calcularRetencionIVA,
} from "@/lib/motores/iva";
import { TrazaPanel } from "@/components/shared/traza-panel";

const inputClase =
  "w-full rounded-md border border-[var(--borde)] bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-acento";
const labelClase = "mb-1 block text-xs font-medium text-gris-500";

function fuenteManual(campo: string) {
  return `Ingresado manualmente en el simulador — reemplazar por la fila correspondiente de parametros_fiscales (codigo IVA_ALICUOTA_GENERAL o ISLR/IVA_RETENCION) para "${campo}"`;
}

export function SimuladorIVA() {
  // 1. IVA de un documento + retención
  const [baseImponible, setBaseImponible] = useState("1000");
  const [alicuota, setAlicuota] = useState("16");
  const [aplicaRetencion, setAplicaRetencion] = useState(true);
  const [porcentajeRetencion, setPorcentajeRetencion] = useState<"75" | "100">("75");

  const documento = useMemo(() => {
    const base = Number(baseImponible);
    const alic = Number(alicuota);
    if (!base || !alic) return null;
    try {
      return calcularIVADocumento({
        baseImponibleGravada: base,
        alicuota: { valor: alic, fecha: "hoy", fuenteOficial: fuenteManual("alícuota"), verificado: false },
      });
    } catch {
      return null;
    }
  }, [baseImponible, alicuota]);

  const retencion = useMemo(() => {
    if (!documento || !aplicaRetencion) return null;
    try {
      return calcularRetencionIVA({
        montoIVA: documento.montoIVA,
        porcentajeRetencion: {
          valor: Number(porcentajeRetencion),
          fecha: "hoy",
          fuenteOficial: fuenteManual("% retención IVA"),
          verificado: false,
        },
      });
    } catch {
      return null;
    }
  }, [documento, aplicaRetencion, porcentajeRetencion]);

  // 2. Prorrateo de crédito fiscal
  const [ventasGravadas, setVentasGravadas] = useState("700000");
  const [ventasExentas, setVentasExentas] = useState("300000");
  const [creditoProrrateable, setCreditoProrrateable] = useState("50000");

  const prorrateo = useMemo(() => {
    try {
      return calcularProrrateoCreditoFiscal({
        ventasGravadas: Number(ventasGravadas) || 0,
        ventasExentas: Number(ventasExentas) || 0,
        ventasExoneradas: 0,
        creditoFiscalProrrateable: Number(creditoProrrateable) || 0,
      });
    } catch {
      return null;
    }
  }, [ventasGravadas, ventasExentas, creditoProrrateable]);

  // 3. Declaración mensual
  const [debitoFiscal, setDebitoFiscal] = useState("160000");
  const [creditoFiscal, setCreditoFiscal] = useState("70000");
  const [retencionesSoportadas, setRetencionesSoportadas] = useState("0");
  const [excedenteAnterior, setExcedenteAnterior] = useState("0");

  const declaracion = useMemo(() => {
    try {
      return calcularDeclaracionIVAMensual({
        debitoFiscal: Number(debitoFiscal) || 0,
        creditoFiscalDeducible: Number(creditoFiscal) || 0,
        retencionesIVASoportadas: Number(retencionesSoportadas) || 0,
        excedenteCreditoPeriodoAnterior: Number(excedenteAnterior) || 0,
      });
    } catch {
      return null;
    }
  }, [debitoFiscal, creditoFiscal, retencionesSoportadas, excedenteAnterior]);

  return (
    <section className="rounded-lg border border-[var(--borde)] p-6">
      <h2 className="text-lg font-semibold tracking-tight">IVA</h2>
      <p className="mt-1 text-sm text-gris-500">
        IVA de un documento, retención al proveedor, prorrateo de crédito
        fiscal (Art. 34 LIVA) y consolidación de la declaración mensual.
      </p>

      <div className="mt-4 rounded-md border border-alerta/30 bg-alerta/5 px-3 py-2 text-xs text-alerta">
        ⚠️ La alícuota y el porcentaje de retención de este simulador se
        ingresan manualmente y no provienen del catálogo oficial de
        parámetros. No uses este resultado en una declaración real.
      </div>

      {/* IVA de un documento */}
      <h3 className="mt-6 text-sm font-medium">IVA de un documento</h3>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <label className={labelClase}>Base imponible gravada (VES)</label>
          <input className={`${inputClase} cifra`} type="number" value={baseImponible} onChange={(e) => setBaseImponible(e.target.value)} />
        </div>
        <div>
          <label className={labelClase}>Alícuota (%)</label>
          <input className={`${inputClase} cifra`} type="number" value={alicuota} onChange={(e) => setAlicuota(e.target.value)} />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4">
        <label className="flex items-center gap-2 text-xs text-gris-600 dark:text-gris-400">
          <input type="checkbox" checked={aplicaRetencion} onChange={(e) => setAplicaRetencion(e.target.checked)} />
          Es una compra sujeta a retención de IVA
        </label>
        {aplicaRetencion && (
          <select
            className={`${inputClase} w-32`}
            value={porcentajeRetencion}
            onChange={(e) => setPorcentajeRetencion(e.target.value as "75" | "100")}
          >
            <option value="75">75%</option>
            <option value="100">100%</option>
          </select>
        )}
      </div>

      {documento && (
        <div className="mt-4">
          <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-1">
            <span className="text-sm text-gris-500">
              IVA causado: <span className="cifra font-semibold">{documento.montoIVA.toFixed(2)} VES</span>
            </span>
            {retencion && (
              <>
                <span className="text-sm text-gris-500">
                  Retenido: <span className="cifra font-semibold text-alerta">{retencion.montoRetencion.toFixed(2)} VES</span>
                </span>
                <span className="text-sm text-gris-500">
                  A pagar al proveedor: <span className="cifra font-semibold">{retencion.montoAPagarAlProveedor.toFixed(2)} VES</span>
                </span>
              </>
            )}
          </div>
          <TrazaPanel traza={retencion ? retencion.traza : documento.traza} />
        </div>
      )}

      <hr className="my-6 border-[var(--borde)]" />

      {/* Prorrateo de crédito fiscal */}
      <h3 className="text-sm font-medium">Prorrateo de crédito fiscal (Art. 34 LIVA)</h3>
      <p className="mt-1 text-xs text-gris-500">
        Para compras de uso mixto cuando la empresa tiene ventas gravadas
        y exentas/exoneradas en el mismo período.
      </p>
      <div className="mt-3 grid grid-cols-3 gap-4">
        <div>
          <label className={labelClase}>Ventas gravadas del período</label>
          <input className={`${inputClase} cifra`} type="number" value={ventasGravadas} onChange={(e) => setVentasGravadas(e.target.value)} />
        </div>
        <div>
          <label className={labelClase}>Ventas exentas/exoneradas</label>
          <input className={`${inputClase} cifra`} type="number" value={ventasExentas} onChange={(e) => setVentasExentas(e.target.value)} />
        </div>
        <div>
          <label className={labelClase}>Crédito fiscal prorrateable</label>
          <input className={`${inputClase} cifra`} type="number" value={creditoProrrateable} onChange={(e) => setCreditoProrrateable(e.target.value)} />
        </div>
      </div>

      {prorrateo && (
        <div className="mt-4">
          <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-1">
            <span className="text-sm text-gris-500">
              Prorrata: <span className="cifra font-semibold">{(prorrateo.prorrata * 100).toFixed(2)}%</span>
            </span>
            <span className="text-sm text-gris-500">
              Deducible: <span className="cifra font-semibold text-exito">{prorrateo.creditoFiscalDeducible.toFixed(2)} VES</span>
            </span>
            <span className="text-sm text-gris-500">
              No deducible: <span className="cifra font-semibold text-alerta">{prorrateo.creditoFiscalNoDeducible.toFixed(2)} VES</span>
            </span>
          </div>
          <TrazaPanel traza={prorrateo.traza} />
        </div>
      )}

      <hr className="my-6 border-[var(--borde)]" />

      {/* Declaración mensual */}
      <h3 className="text-sm font-medium">Declaración mensual</h3>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <label className={labelClase}>Débito fiscal (Σ IVA ventas)</label>
          <input className={`${inputClase} cifra`} type="number" value={debitoFiscal} onChange={(e) => setDebitoFiscal(e.target.value)} />
        </div>
        <div>
          <label className={labelClase}>Crédito fiscal deducible</label>
          <input className={`${inputClase} cifra`} type="number" value={creditoFiscal} onChange={(e) => setCreditoFiscal(e.target.value)} />
        </div>
        <div>
          <label className={labelClase}>Retenciones de IVA soportadas</label>
          <input className={`${inputClase} cifra`} type="number" value={retencionesSoportadas} onChange={(e) => setRetencionesSoportadas(e.target.value)} />
        </div>
        <div>
          <label className={labelClase}>Excedente de crédito del período anterior</label>
          <input className={`${inputClase} cifra`} type="number" value={excedenteAnterior} onChange={(e) => setExcedenteAnterior(e.target.value)} />
        </div>
      </div>

      {declaracion && (
        <div className="mt-4">
          <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-1">
            <span className="text-sm text-gris-500">
              Impuesto a pagar:{" "}
              <span className={`cifra font-semibold ${declaracion.impuestoAPagar > 0 ? "text-alerta" : ""}`}>
                {declaracion.impuestoAPagar.toFixed(2)} VES
              </span>
            </span>
            <span className="text-sm text-gris-500">
              Excedente de crédito siguiente:{" "}
              <span className={`cifra font-semibold ${declaracion.excedenteCreditoSiguiente > 0 ? "text-exito" : ""}`}>
                {declaracion.excedenteCreditoSiguiente.toFixed(2)} VES
              </span>
            </span>
          </div>
          <TrazaPanel traza={declaracion.traza} />
        </div>
      )}
    </section>
  );
}
