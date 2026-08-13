import type { TrazaCalculo, ValorConFuente } from "./tipos";

/**
 * Motor de Ajuste por Inflación Financiero (BA VEN-NIF 2 / NIC 29),
 * método de nivel general de precios usando el Índice Nacional de
 * Precios al Consumidor (INPC) que publica el BCV.
 *
 * Dos piezas independientes, ambas requeridas para el ajuste integral:
 *
 *  1. Reexpresión de partidas NO monetarias (inventario, activo fijo,
 *     capital social): se multiplican por el factor INPC_cierre /
 *     INPC_origen. Las partidas MONETARIAS (efectivo, CxC, CxP) NO se
 *     reexpresan — ya están en unidades de cierre por definición.
 *
 *  2. REPOMAN — Resultado por Posición Monetaria: el efecto de haber
 *     mantenido partidas monetarias durante un período inflacionario.
 *     Mantener activos monetarios netos (más efectivo/CxC que CxP)
 *     durante inflación es una PÉRDIDA de poder adquisitivo; mantener
 *     pasivos monetarios netos es una GANANCIA (la deuda se paga con
 *     bolívares que valen menos).
 */

interface InsumosReexpresion {
  valorHistorico: number;
  inpcOrigen: ValorConFuente;
  inpcCierre: ValorConFuente;
}

interface ResultadoReexpresion {
  factorReexpresion: number;
  valorReexpresado: number;
  /** valorReexpresado − valorHistorico. Siempre positivo si hay
   *  inflación (inpcCierre > inpcOrigen) — el ajuste incrementa el
   *  valor en libros de la partida no monetaria. */
  ajustePorInflacion: number;
  traza: TrazaCalculo;
}

/**
 * Reexpresa una única partida NO monetaria al nivel general de precios
 * de cierre.
 */
export function reexpresarPartidaNoMonetaria(
  insumos: InsumosReexpresion,
): ResultadoReexpresion {
  const { valorHistorico, inpcOrigen, inpcCierre } = insumos;

  if (valorHistorico <= 0) {
    throw new Error("valorHistorico debe ser mayor que cero.");
  }
  if (inpcOrigen.valor <= 0 || inpcCierre.valor <= 0) {
    throw new Error("Los índices INPC deben ser mayores que cero.");
  }
  if (new Date(inpcCierre.fecha) < new Date(inpcOrigen.fecha)) {
    throw new Error("La fecha de cierre no puede ser anterior a la fecha de origen.");
  }

  const factorReexpresion = inpcCierre.valor / inpcOrigen.valor;
  const valorReexpresado = valorHistorico * factorReexpresion;
  const ajustePorInflacion = valorReexpresado - valorHistorico;

  const traza: TrazaCalculo = {
    formula: "valorReexpresado = valorHistorico × (INPC_cierre / INPC_origen)",
    insumos: {
      valorHistorico,
      inpcOrigenValor: inpcOrigen.valor,
      inpcOrigenFecha: inpcOrigen.fecha,
      inpcCierreValor: inpcCierre.valor,
      inpcCierreFecha: inpcCierre.fecha,
    },
    parametrosUsados: [
      {
        nombre: "INPC de origen (fecha de adquisición)",
        valor: inpcOrigen.valor,
        fecha: inpcOrigen.fecha,
        fuenteOficial: inpcOrigen.fuenteOficial,
        verificado: inpcOrigen.verificado,
      },
      {
        nombre: "INPC de cierre",
        valor: inpcCierre.valor,
        fecha: inpcCierre.fecha,
        fuenteOficial: inpcCierre.fuenteOficial,
        verificado: inpcCierre.verificado,
      },
    ],
    resultado: { factorReexpresion, valorReexpresado, ajustePorInflacion },
  };

  return { factorReexpresion, valorReexpresado, ajustePorInflacion, traza };
}

/**
 * Reexpresa una lista de partidas no monetarias y devuelve el total.
 * Cada partida puede tener su propia fecha de origen (y por lo tanto su
 * propio INPC de origen) — no se asume que todas se adquirieron el
 * mismo día.
 */
export function reexpresarPartidasNoMonetarias(
  partidas: Array<{ id: string; descripcion: string } & InsumosReexpresion>,
): {
  totalHistorico: number;
  totalReexpresado: number;
  totalAjustePorInflacion: number;
  detalle: Array<{ id: string; descripcion: string } & ResultadoReexpresion>;
} {
  const detalle = partidas.map((p) => ({
    id: p.id,
    descripcion: p.descripcion,
    ...reexpresarPartidaNoMonetaria(p),
  }));

  const totalHistorico = partidas.reduce((acc, p) => acc + p.valorHistorico, 0);
  const totalReexpresado = detalle.reduce((acc, d) => acc + d.valorReexpresado, 0);
  const totalAjustePorInflacion = detalle.reduce((acc, d) => acc + d.ajustePorInflacion, 0);

  return { totalHistorico, totalReexpresado, totalAjustePorInflacion, detalle };
}

// ───────────────────────────────────────────────────────────────────────
// REPOMAN — Resultado por Posición Monetaria
// ───────────────────────────────────────────────────────────────────────

interface MovimientoMonetarioNeto {
  descripcion: string;
  /** Monto neto del movimiento monetario (activos monetarios menos
   *  pasivos monetarios generados por el movimiento). Positivo si el
   *  movimiento aumenta la posición monetaria neta (p.ej. una venta de
   *  contado); negativo si la disminuye (p.ej. una compra de contado o
   *  un pago). */
  montoNeto: number;
  inpcFecha: ValorConFuente;
}

interface InsumosREPOMAN {
  /** Posición monetaria neta al inicio del período: (efectivo + CxC) −
   *  (CxP + otros pasivos monetarios), valuada a bolívares nominales de
   *  esa fecha. */
  posicionMonetariaNetaInicial: number;
  inpcInicial: ValorConFuente;
  inpcCierre: ValorConFuente;
  /** Movimientos monetarios netos ocurridos durante el período, cada
   *  uno con el INPC de su propia fecha — necesario porque cada
   *  movimiento pierde poder adquisitivo solo desde el día en que
   *  ocurrió, no desde el inicio del período. */
  movimientos?: MovimientoMonetarioNeto[];
}

interface ContribucionREPOMAN {
  descripcion: string;
  montoNeto: number;
  factorReexpresion: number;
  resultadoMonetario: number;
}

interface ResultadoREPOMAN {
  /** Con signo: positivo = ganancia monetaria (posición neta pasiva
   *  durante inflación), negativo = pérdida monetaria (posición neta
   *  activa durante inflación). */
  resultadoRepoman: number;
  contribuciones: ContribucionREPOMAN[];
  traza: TrazaCalculo;
}

function factorEntre(inpcInicio: ValorConFuente, inpcCierre: ValorConFuente): number {
  return inpcCierre.valor / inpcInicio.valor;
}

/**
 * Calcula el REPOMAN del período: cuánto ganó o perdió la empresa en
 * poder adquisitivo por mantener una posición monetaria neta (positiva
 * o negativa) durante un período inflacionario.
 *
 * Para cada monto monetario neto (la posición inicial, y cada
 * movimiento intermedio), la pérdida/ganancia de poder adquisitivo es
 * ese monto multiplicado por (1 − factorReexpresión) desde su propia
 * fecha hasta el cierre: si el monto es positivo (posición activa neta)
 * y hay inflación (factor > 1), el resultado es negativo (pérdida). Si
 * el monto es negativo (posición pasiva neta), el resultado es
 * positivo (ganancia).
 */
export function calcularREPOMAN(insumos: InsumosREPOMAN): ResultadoREPOMAN {
  const { posicionMonetariaNetaInicial, inpcInicial, inpcCierre, movimientos = [] } = insumos;

  if (inpcInicial.valor <= 0 || inpcCierre.valor <= 0) {
    throw new Error("Los índices INPC deben ser mayores que cero.");
  }

  const contribuciones: ContribucionREPOMAN[] = [];

  const factorPosicionInicial = factorEntre(inpcInicial, inpcCierre);
  contribuciones.push({
    descripcion: "Posición monetaria neta inicial",
    montoNeto: posicionMonetariaNetaInicial,
    factorReexpresion: factorPosicionInicial,
    resultadoMonetario: posicionMonetariaNetaInicial * (1 - factorPosicionInicial),
  });

  for (const mov of movimientos) {
    const factor = factorEntre(mov.inpcFecha, inpcCierre);
    contribuciones.push({
      descripcion: mov.descripcion,
      montoNeto: mov.montoNeto,
      factorReexpresion: factor,
      resultadoMonetario: mov.montoNeto * (1 - factor),
    });
  }

  const resultadoRepoman = contribuciones.reduce((acc, c) => acc + c.resultadoMonetario, 0);

  const traza: TrazaCalculo = {
    formula:
      "REPOMAN = Σ [montoNeto_i × (1 − INPC_fecha_i/INPC_cierre)] para la posición inicial y cada movimiento monetario neto del período",
    insumos: {
      posicionMonetariaNetaInicial,
      inpcInicialValor: inpcInicial.valor,
      inpcInicialFecha: inpcInicial.fecha,
      inpcCierreValor: inpcCierre.valor,
      inpcCierreFecha: inpcCierre.fecha,
      cantidadMovimientos: movimientos.length,
    },
    parametrosUsados: [
      {
        nombre: "INPC inicial del período",
        valor: inpcInicial.valor,
        fecha: inpcInicial.fecha,
        fuenteOficial: inpcInicial.fuenteOficial,
        verificado: inpcInicial.verificado,
      },
      {
        nombre: "INPC de cierre",
        valor: inpcCierre.valor,
        fecha: inpcCierre.fecha,
        fuenteOficial: inpcCierre.fuenteOficial,
        verificado: inpcCierre.verificado,
      },
      ...movimientos.map((m) => ({
        nombre: `INPC de "${m.descripcion}"`,
        valor: m.inpcFecha.valor,
        fecha: m.inpcFecha.fecha,
        fuenteOficial: m.inpcFecha.fuenteOficial,
        verificado: m.inpcFecha.verificado,
      })),
    ],
    resultado: { resultadoRepoman },
  };

  return { resultadoRepoman, contribuciones, traza };
}
