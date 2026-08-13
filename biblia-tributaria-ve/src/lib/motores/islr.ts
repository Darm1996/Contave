import type { TrazaCalculo, ValorConFuente } from "./tipos";

/**
 * Motor de ISLR (Ley de Impuesto Sobre la Renta).
 *
 * Cinco piezas independientes:
 *  1. calcularRetencionISLR — retención (Decreto 1808) sobre un pago.
 *  2. calcularConciliacionFiscal — de utilidad contable a renta gravable.
 *  3. calcularISLRTarifaProgresiva — tarifas 1/2/3, tabla de tramos en
 *     UT genérica (los tramos son un insumo, nunca están hardcodeados).
 *  4. calcularRebajaPorNuevasInversiones — Art. 56 y siguientes LISLR.
 *  5. calcularAnticipoDeclaracionEstimada — anticipo de mitad de año.
 */

// ───────────────────────────────────────────────────────────────────────
// 1. Retención de ISLR (Decreto 1808)
// ───────────────────────────────────────────────────────────────────────

interface InsumosRetencionISLR {
  montoSujetoARetencion: number;
  porcentajeRetencion: ValorConFuente;
  /** Solo aplica cuando el beneficiario es persona natural residente —
   *  el Decreto 1808 permite restar un sustraendo en UT antes de
   *  aplicar el resultado. Para personas jurídicas o no residentes,
   *  pasar 0. */
  sustraendoUT?: ValorConFuente;
  valorUT?: ValorConFuente; // requerido si sustraendoUT > 0
}

interface ResultadoRetencionISLR {
  montoRetenido: number;
  traza: TrazaCalculo;
}

export function calcularRetencionISLR(insumos: InsumosRetencionISLR): ResultadoRetencionISLR {
  const { montoSujetoARetencion, porcentajeRetencion, sustraendoUT, valorUT } = insumos;

  if (montoSujetoARetencion < 0) {
    throw new Error("montoSujetoARetencion no puede ser negativo.");
  }
  if (porcentajeRetencion.valor < 0 || porcentajeRetencion.valor > 100) {
    throw new Error("porcentajeRetencion debe estar entre 0 y 100.");
  }
  if (sustraendoUT && sustraendoUT.valor > 0 && !valorUT) {
    throw new Error("Se requiere valorUT para convertir el sustraendo en UT a bolívares.");
  }

  const retencionBruta = montoSujetoARetencion * (porcentajeRetencion.valor / 100);
  const sustraendoVES = sustraendoUT && valorUT ? sustraendoUT.valor * valorUT.valor : 0;
  const montoRetenido = Math.max(0, retencionBruta - sustraendoVES);

  const parametrosUsados: TrazaCalculo["parametrosUsados"] = [
    {
      nombre: "Porcentaje de retención (Decreto 1808)",
      valor: porcentajeRetencion.valor,
      fecha: porcentajeRetencion.fecha,
      fuenteOficial: porcentajeRetencion.fuenteOficial,
      verificado: porcentajeRetencion.verificado,
    },
  ];
  if (sustraendoUT && valorUT) {
    parametrosUsados.push(
      {
        nombre: "Sustraendo (UT)",
        valor: sustraendoUT.valor,
        fecha: sustraendoUT.fecha,
        fuenteOficial: sustraendoUT.fuenteOficial,
        verificado: sustraendoUT.verificado,
      },
      {
        nombre: "Valor de la Unidad Tributaria",
        valor: valorUT.valor,
        fecha: valorUT.fecha,
        fuenteOficial: valorUT.fuenteOficial,
        verificado: valorUT.verificado,
      },
    );
  }

  const traza: TrazaCalculo = {
    formula:
      "montoRetenido = max(0, montoSujetoARetencion × porcentaje/100 − sustraendoUT × valorUT)",
    insumos: { montoSujetoARetencion, retencionBruta, sustraendoVES },
    parametrosUsados,
    resultado: { montoRetenido },
  };

  return { montoRetenido, traza };
}

// ───────────────────────────────────────────────────────────────────────
// 2. Conciliación fiscal (utilidad contable → renta gravable)
// ───────────────────────────────────────────────────────────────────────

interface InsumosConciliacionFiscal {
  utilidadContableAntesISLR: number;
  /** Gastos contabilizados que la LISLR no permite deducir (p.ej.
   *  multas, gastos sin comprobación, exceso de depreciación fiscal vs.
   *  contable) — se SUMAN a la utilidad contable. */
  partidasNoDeducibles: number;
  /** Ingresos contabilizados que no son gravables (p.ej. dividendos ya
   *  gravados en cabeza de otra sociedad, rentas exentas) — se RESTAN de
   *  la utilidad contable. */
  partidasNoGravables: number;
}

interface ResultadoConciliacionFiscal {
  enriquecimientoNetoFiscal: number;
  traza: TrazaCalculo;
}

export function calcularConciliacionFiscal(
  insumos: InsumosConciliacionFiscal,
): ResultadoConciliacionFiscal {
  const { utilidadContableAntesISLR, partidasNoDeducibles, partidasNoGravables } = insumos;

  if (partidasNoDeducibles < 0 || partidasNoGravables < 0) {
    throw new Error("Las partidas de conciliación no pueden ser negativas (usa el signo ya implícito en cada categoría).");
  }

  const enriquecimientoNetoFiscal =
    utilidadContableAntesISLR + partidasNoDeducibles - partidasNoGravables;

  const traza: TrazaCalculo = {
    formula:
      "enriquecimientoNetoFiscal = utilidadContableAntesISLR + partidasNoDeducibles − partidasNoGravables",
    insumos: { utilidadContableAntesISLR, partidasNoDeducibles, partidasNoGravables },
    parametrosUsados: [],
    resultado: { enriquecimientoNetoFiscal },
  };

  return { enriquecimientoNetoFiscal, traza };
}

// ───────────────────────────────────────────────────────────────────────
// 3. Tarifas progresivas 1/2/3 (tabla de tramos en UT genérica)
// ───────────────────────────────────────────────────────────────────────

export interface TramoISLR {
  numeroTramo: number;
  limiteInferiorUT: number;
  limiteSuperiorUT: number | null; // null = sin límite (último tramo)
  porcentaje: number;
  sustraendoUT: number;
}

interface InsumosTarifaProgresiva {
  enriquecimientoNetoFiscal: number;
  valorUT: ValorConFuente;
  /** Los tramos vigentes a la fecha del ejercicio — insumo, nunca
   *  hardcodeado en el motor. Deben venir ordenados por numeroTramo. */
  tramos: TramoISLR[];
}

interface ResultadoTarifaProgresiva {
  enriquecimientoNetoUT: number;
  tramoAplicado: TramoISLR;
  impuestoUT: number;
  impuestoVES: number;
  traza: TrazaCalculo;
}

export function calcularISLRTarifaProgresiva(
  insumos: InsumosTarifaProgresiva,
): ResultadoTarifaProgresiva {
  const { enriquecimientoNetoFiscal, valorUT, tramos } = insumos;

  if (enriquecimientoNetoFiscal < 0) {
    throw new Error("enriquecimientoNetoFiscal no puede ser negativo.");
  }
  if (valorUT.valor <= 0) {
    throw new Error("El valor de la UT debe ser mayor que cero.");
  }
  if (tramos.length === 0) {
    throw new Error("Se requiere al menos un tramo de la tarifa.");
  }

  const enriquecimientoNetoUT = enriquecimientoNetoFiscal / valorUT.valor;

  const tramoAplicado = tramos.find(
    (t) =>
      enriquecimientoNetoUT >= t.limiteInferiorUT &&
      (t.limiteSuperiorUT === null || enriquecimientoNetoUT <= t.limiteSuperiorUT),
  );

  if (!tramoAplicado) {
    throw new Error(
      `Ningún tramo cubre un enriquecimiento neto de ${enriquecimientoNetoUT} UT. Revisa la tabla de tramos.`,
    );
  }

  // Método del sustraendo: impuesto = enriquecimientoNetoUT × porcentaje/100 − sustraendoUT.
  // El sustraendo ya incorpora el efecto acumulado de los tramos
  // anteriores, así que no hace falta sumar tramo por tramo.
  const impuestoUT = Math.max(
    0,
    enriquecimientoNetoUT * (tramoAplicado.porcentaje / 100) - tramoAplicado.sustraendoUT,
  );
  const impuestoVES = impuestoUT * valorUT.valor;

  const traza: TrazaCalculo = {
    formula:
      "enriquecimientoNetoUT = enriquecimientoNetoFiscal / valorUT; " +
      "impuestoUT = max(0, enriquecimientoNetoUT × tramo.porcentaje/100 − tramo.sustraendoUT); " +
      "impuestoVES = impuestoUT × valorUT",
    insumos: {
      enriquecimientoNetoFiscal,
      enriquecimientoNetoUT,
      tramoNumero: tramoAplicado.numeroTramo,
      tramoPorcentaje: tramoAplicado.porcentaje,
      tramoSustraendoUT: tramoAplicado.sustraendoUT,
    },
    parametrosUsados: [
      {
        nombre: "Valor de la Unidad Tributaria",
        valor: valorUT.valor,
        fecha: valorUT.fecha,
        fuenteOficial: valorUT.fuenteOficial,
        verificado: valorUT.verificado,
      },
    ],
    resultado: { impuestoUT, impuestoVES },
  };

  return { enriquecimientoNetoUT, tramoAplicado, impuestoUT, impuestoVES, traza };
}

// ───────────────────────────────────────────────────────────────────────
// 4. Rebaja por nuevas inversiones
// ───────────────────────────────────────────────────────────────────────

interface InsumosRebajaInversiones {
  montoInversion: number;
  porcentajeRebaja: ValorConFuente;
  impuestoDeterminado: number;
}

interface ResultadoRebajaInversiones {
  rebajaCalculada: number;
  /** La rebaja nunca puede exceder el impuesto determinado del
   *  ejercicio — el exceso, si lo hay, se pierde en este cálculo simple
   *  (la LISLR permite trasladarlo a ejercicios futuros, pero eso
   *  requiere una tabla de arrastre que no es parte de esta iteración). */
  rebajaAplicada: number;
  impuestoNeto: number;
  traza: TrazaCalculo;
}

export function calcularRebajaPorNuevasInversiones(
  insumos: InsumosRebajaInversiones,
): ResultadoRebajaInversiones {
  const { montoInversion, porcentajeRebaja, impuestoDeterminado } = insumos;

  if (montoInversion < 0 || impuestoDeterminado < 0) {
    throw new Error("montoInversion e impuestoDeterminado no pueden ser negativos.");
  }
  if (porcentajeRebaja.valor < 0 || porcentajeRebaja.valor > 100) {
    throw new Error("porcentajeRebaja debe estar entre 0 y 100.");
  }

  const rebajaCalculada = montoInversion * (porcentajeRebaja.valor / 100);
  const rebajaAplicada = Math.min(rebajaCalculada, impuestoDeterminado);
  const impuestoNeto = impuestoDeterminado - rebajaAplicada;

  const traza: TrazaCalculo = {
    formula:
      "rebajaCalculada = montoInversion × porcentajeRebaja/100; " +
      "rebajaAplicada = min(rebajaCalculada, impuestoDeterminado); " +
      "impuestoNeto = impuestoDeterminado − rebajaAplicada",
    insumos: { montoInversion, impuestoDeterminado, rebajaCalculada },
    parametrosUsados: [
      {
        nombre: "Porcentaje de rebaja por nuevas inversiones",
        valor: porcentajeRebaja.valor,
        fecha: porcentajeRebaja.fecha,
        fuenteOficial: porcentajeRebaja.fuenteOficial,
        verificado: porcentajeRebaja.verificado,
      },
    ],
    resultado: { rebajaAplicada, impuestoNeto },
  };

  return { rebajaCalculada, rebajaAplicada, impuestoNeto, traza };
}

// ───────────────────────────────────────────────────────────────────────
// 5. Anticipo de la declaración estimada
// ───────────────────────────────────────────────────────────────────────

interface InsumosAnticipoEstimada {
  impuestoDelEjercicioAnterior: number;
  porcentajeAnticipo: ValorConFuente;
}

interface ResultadoAnticipoEstimada {
  anticipoEstimado: number;
  traza: TrazaCalculo;
}

export function calcularAnticipoDeclaracionEstimada(
  insumos: InsumosAnticipoEstimada,
): ResultadoAnticipoEstimada {
  const { impuestoDelEjercicioAnterior, porcentajeAnticipo } = insumos;

  if (impuestoDelEjercicioAnterior < 0) {
    throw new Error("impuestoDelEjercicioAnterior no puede ser negativo.");
  }
  if (porcentajeAnticipo.valor < 0 || porcentajeAnticipo.valor > 100) {
    throw new Error("porcentajeAnticipo debe estar entre 0 y 100.");
  }

  const anticipoEstimado = impuestoDelEjercicioAnterior * (porcentajeAnticipo.valor / 100);

  const traza: TrazaCalculo = {
    formula: "anticipoEstimado = impuestoDelEjercicioAnterior × porcentajeAnticipo/100",
    insumos: { impuestoDelEjercicioAnterior },
    parametrosUsados: [
      {
        nombre: "Porcentaje de anticipo de la declaración estimada",
        valor: porcentajeAnticipo.valor,
        fecha: porcentajeAnticipo.fecha,
        fuenteOficial: porcentajeAnticipo.fuenteOficial,
        verificado: porcentajeAnticipo.verificado,
      },
    ],
    resultado: { anticipoEstimado },
  };

  return { anticipoEstimado, traza };
}
