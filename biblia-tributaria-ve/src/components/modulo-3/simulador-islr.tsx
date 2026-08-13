"use client";

import { useMemo, useState } from "react";
import {
  calcularConciliacionFiscal,
  calcularISLRTarifaProgresiva,
  calcularRebajaPorNuevasInversiones,
  calcularRetencionISLR,
  type TramoISLR,
} from "@/lib/motores/islr";
import { TrazaPanel } from "@/components/shared/traza-panel";

const inputClase =
  "w-full rounded-md border border-[var(--borde)] bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-acento";
const labelClase = "mb-1 block text-xs font-medium text-gris-500";

function fuenteManual(campo: string) {
  return `Ingresado manualmente en el simulador — reemplazar por la fila correspondiente de parametros_fiscales/tramos_islr para "${campo}"`;
}

// Tabla de tramos ILUSTRATIVA para el simulador — no es la tarifa oficial.
const tramosIlustrativos: TramoISLR[] = [
  { numeroTramo: 1, limiteInferiorUT: 0, limiteSuperiorUT: 1000, porcentaje: 15, sustraendoUT: 0 },
  { numeroTramo: 2, limiteInferiorUT: 1000, limiteSuperiorUT: 3000, porcentaje: 22, sustraendoUT: 70 },
  { numeroTramo: 3, limiteInferiorUT: 3000, limiteSuperiorUT: null, porcentaje: 34, sustraendoUT: 430 },
];

export function SimuladorISLR() {
  // Retención
  const [montoSujeto, setMontoSujeto] = useState("50000");
  const [porcentajeRetencion, setPorcentajeRetencion] = useState("5");
  const [esPersonaNatural, setEsPersonaNatural] = useState(false);
  const [sustraendoUT, setSustraendoUT] = useState("10");
  const [valorUT, setValorUT] = useState("9");

  const retencion = useMemo(() => {
    try {
      return calcularRetencionISLR({
        montoSujetoARetencion: Number(montoSujeto) || 0,
        porcentajeRetencion: { valor: Number(porcentajeRetencion) || 0, fecha: "hoy", fuenteOficial: fuenteManual("% retención"), verificado: false },
        ...(esPersonaNatural
          ? {
              sustraendoUT: { valor: Number(sustraendoUT) || 0, fecha: "hoy", fuenteOficial: fuenteManual("sustraendo UT"), verificado: false },
              valorUT: { valor: Number(valorUT) || 1, fecha: "hoy", fuenteOficial: fuenteManual("valor UT"), verificado: false },
            }
          : {}),
      });
    } catch {
      return null;
    }
  }, [montoSujeto, porcentajeRetencion, esPersonaNatural, sustraendoUT, valorUT]);

  // Conciliación fiscal + tarifa progresiva
  const [utilidadContable, setUtilidadContable] = useState("500000");
  const [noDeducibles, setNoDeducibles] = useState("50000");
  const [noGravables, setNoGravables] = useState("20000");
  const [valorUTTarifa, setValorUTTarifa] = useState("9");

  const conciliacion = useMemo(() => {
    try {
      return calcularConciliacionFiscal({
        utilidadContableAntesISLR: Number(utilidadContable) || 0,
        partidasNoDeducibles: Number(noDeducibles) || 0,
        partidasNoGravables: Number(noGravables) || 0,
      });
    } catch {
      return null;
    }
  }, [utilidadContable, noDeducibles, noGravables]);

  const tarifa = useMemo(() => {
    if (!conciliacion) return null;
    try {
      return calcularISLRTarifaProgresiva({
        enriquecimientoNetoFiscal: conciliacion.enriquecimientoNetoFiscal,
        valorUT: { valor: Number(valorUTTarifa) || 1, fecha: "hoy", fuenteOficial: fuenteManual("valor UT"), verificado: false },
        tramos: tramosIlustrativos,
      });
    } catch {
      return null;
    }
  }, [conciliacion, valorUTTarifa]);

  // Rebaja por nuevas inversiones
  const [montoInversion, setMontoInversion] = useState("200000");
  const [porcentajeRebaja, setPorcentajeRebaja] = useState("10");

  const rebaja = useMemo(() => {
    if (!tarifa) return null;
    try {
      return calcularRebajaPorNuevasInversiones({
        montoInversion: Number(montoInversion) || 0,
        porcentajeRebaja: { valor: Number(porcentajeRebaja) || 0, fecha: "hoy", fuenteOficial: fuenteManual("% rebaja"), verificado: false },
        impuestoDeterminado: tarifa.impuestoVES,
      });
    } catch {
      return null;
    }
  }, [tarifa, montoInversion, porcentajeRebaja]);

  return (
    <section className="rounded-lg border border-[var(--borde)] p-6">
      <h2 className="text-lg font-semibold tracking-tight">ISLR</h2>
      <p className="mt-1 text-sm text-gris-500">
        Retención (Decreto 1808), conciliación fiscal, tarifa progresiva
        (tabla de tramos ilustrativa) y rebaja por nuevas inversiones.
      </p>

      <div className="mt-4 rounded-md border border-alerta/30 bg-alerta/5 px-3 py-2 text-xs text-alerta">
        ⚠️ Los porcentajes, el valor de la UT y la tabla de tramos de este
        simulador son ilustrativos y no son los valores oficiales
        vigentes. No uses este resultado en una declaración real.
      </div>

      {/* Retención */}
      <h3 className="mt-6 text-sm font-medium">Retención sobre un pago</h3>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <label className={labelClase}>Monto sujeto a retención (VES)</label>
          <input className={`${inputClase} cifra`} type="number" value={montoSujeto} onChange={(e) => setMontoSujeto(e.target.value)} />
        </div>
        <div>
          <label className={labelClase}>Porcentaje de retención</label>
          <input className={`${inputClase} cifra`} type="number" value={porcentajeRetencion} onChange={(e) => setPorcentajeRetencion(e.target.value)} />
        </div>
      </div>
      <label className="mt-3 flex items-center gap-2 text-xs text-gris-600 dark:text-gris-400">
        <input type="checkbox" checked={esPersonaNatural} onChange={(e) => setEsPersonaNatural(e.target.checked)} />
        Beneficiario persona natural residente (aplica sustraendo en UT)
      </label>
      {esPersonaNatural && (
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <label className={labelClase}>Sustraendo (UT)</label>
            <input className={`${inputClase} cifra`} type="number" value={sustraendoUT} onChange={(e) => setSustraendoUT(e.target.value)} />
          </div>
          <div>
            <label className={labelClase}>Valor de la UT</label>
            <input className={`${inputClase} cifra`} type="number" value={valorUT} onChange={(e) => setValorUT(e.target.value)} />
          </div>
        </div>
      )}

      {retencion && (
        <div className="mt-4">
          <div className="mb-4 text-sm text-gris-500">
            Monto retenido: <span className="cifra font-semibold text-alerta">{retencion.montoRetenido.toFixed(2)} VES</span>
          </div>
          <TrazaPanel traza={retencion.traza} />
        </div>
      )}

      <hr className="my-6 border-[var(--borde)]" />

      {/* Conciliación + tarifa */}
      <h3 className="text-sm font-medium">Conciliación fiscal y tarifa progresiva</h3>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <label className={labelClase}>Utilidad contable antes de ISLR</label>
          <input className={`${inputClase} cifra`} type="number" value={utilidadContable} onChange={(e) => setUtilidadContable(e.target.value)} />
        </div>
        <div>
          <label className={labelClase}>Valor de la UT</label>
          <input className={`${inputClase} cifra`} type="number" value={valorUTTarifa} onChange={(e) => setValorUTTarifa(e.target.value)} />
        </div>
        <div>
          <label className={labelClase}>Partidas no deducibles</label>
          <input className={`${inputClase} cifra`} type="number" value={noDeducibles} onChange={(e) => setNoDeducibles(e.target.value)} />
        </div>
        <div>
          <label className={labelClase}>Partidas no gravables</label>
          <input className={`${inputClase} cifra`} type="number" value={noGravables} onChange={(e) => setNoGravables(e.target.value)} />
        </div>
      </div>

      {conciliacion && (
        <div className="mt-4 text-sm text-gris-500">
          Enriquecimiento neto fiscal:{" "}
          <span className="cifra font-semibold">{conciliacion.enriquecimientoNetoFiscal.toFixed(2)} VES</span>
        </div>
      )}

      {tarifa && (
        <div className="mt-4">
          <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-gris-500">
            <span>
              Tramo aplicado: <span className="cifra font-semibold">{tarifa.tramoAplicado.numeroTramo}</span>
            </span>
            <span>
              Impuesto determinado: <span className="cifra font-semibold">{tarifa.impuestoVES.toFixed(2)} VES</span>
            </span>
          </div>
          <TrazaPanel traza={tarifa.traza} />
        </div>
      )}

      <hr className="my-6 border-[var(--borde)]" />

      {/* Rebaja por inversiones */}
      <h3 className="text-sm font-medium">Rebaja por nuevas inversiones</h3>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <label className={labelClase}>Monto de la inversión</label>
          <input className={`${inputClase} cifra`} type="number" value={montoInversion} onChange={(e) => setMontoInversion(e.target.value)} />
        </div>
        <div>
          <label className={labelClase}>Porcentaje de rebaja</label>
          <input className={`${inputClase} cifra`} type="number" value={porcentajeRebaja} onChange={(e) => setPorcentajeRebaja(e.target.value)} />
        </div>
      </div>

      {rebaja && (
        <div className="mt-4">
          <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-gris-500">
            <span>
              Rebaja aplicada: <span className="cifra font-semibold text-exito">{rebaja.rebajaAplicada.toFixed(2)} VES</span>
            </span>
            <span>
              Impuesto neto: <span className="cifra font-semibold">{rebaja.impuestoNeto.toFixed(2)} VES</span>
            </span>
          </div>
          <TrazaPanel traza={rebaja.traza} />
        </div>
      )}
    </section>
  );
}
