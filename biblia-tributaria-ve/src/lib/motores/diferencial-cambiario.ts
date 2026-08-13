import type { TipoDiferencial, TrazaCalculo, ValorConFuente } from "./tipos";

/**
 * Motor de diferencial cambiario (NIC 21 "Efectos de las Variaciones en
 * las Tasas de Cambio de la Moneda Extranjera").
 *
 * Una partida en moneda extranjera (CxC o CxP en USD) se reconoce a la
 * tasa histórica del día de la operación. Cada vez que se compara ese
 * monto histórico contra un monto en bolívares calculado a una tasa
 * distinta —al liquidarla (realizado) o al cierre si sigue abierta (no
 * realizado)— surge un diferencial cambiario.
 *
 * Convención de signos: el diferencial se calcula siempre como
 * (monto en VES a la tasa nueva) − (monto en VES a la tasa histórica).
 * Si la partida es un ACTIVO (derecho a cobrar divisas), un diferencial
 * positivo es GANANCIA: el bolívar se depreció y el activo en divisas
 * vale más en VES. Si la partida es un PASIVO (obligación de pagar
 * divisas), es al revés: un diferencial positivo (la deuda cuesta más
 * VES) es PÉRDIDA.
 */

export type NaturalezaPartida = "ACTIVO" | "PASIVO";

interface InsumosDiferencialCambiario {
  naturalezaPartida: NaturalezaPartida;
  /** Monto en divisa que se está comparando (el total liquidado, o el
   *  saldo pendiente al cierre). */
  montoDivisa: number;
  /** Tasa a la que se reconoció originalmente ese monto (histórica). */
  tasaHistorica: ValorConFuente;
  /** Tasa a la que se está revaluando ahora (de liquidación, o de
   *  cierre del período). */
  tasaNueva: ValorConFuente;
}

interface ResultadoDiferencialCambiario {
  montoVesHistorico: number;
  montoVesNuevo: number;
  /** Con signo: positivo = ganancia, negativo = pérdida, siempre desde
   *  la perspectiva de la empresa (ya aplicada la convención de signos
   *  según naturalezaPartida). */
  diferencialCambiario: number;
  tipoDiferencial: TipoDiferencial;
  traza: TrazaCalculo;
}

function calcularNucleoDiferencial(
  insumos: InsumosDiferencialCambiario,
  etiquetaEvento: string,
): ResultadoDiferencialCambiario {
  const { naturalezaPartida, montoDivisa, tasaHistorica, tasaNueva } = insumos;

  if (montoDivisa <= 0) {
    throw new Error("montoDivisa debe ser mayor que cero.");
  }
  if (tasaHistorica.valor <= 0 || tasaNueva.valor <= 0) {
    throw new Error("Las tasas de cambio deben ser mayores que cero.");
  }

  const montoVesHistorico = montoDivisa * tasaHistorica.valor;
  const montoVesNuevo = montoDivisa * tasaNueva.valor;

  // Variación nominal en VES: positiva si la tasa subió (el bolívar se
  // depreció respecto a la moneda extranjera).
  const variacionNominal = montoVesNuevo - montoVesHistorico;

  // Para un ACTIVO en divisas, la depreciación del bolívar es ganancia
  // (el signo de variacionNominal ya es el correcto). Para un PASIVO en
  // divisas, es pérdida, así que se invierte el signo.
  const diferencialCambiario =
    naturalezaPartida === "ACTIVO" ? variacionNominal : -variacionNominal;

  const tipoDiferencial: TipoDiferencial =
    diferencialCambiario > 0
      ? "GANANCIA"
      : diferencialCambiario < 0
        ? "PERDIDA"
        : "NEUTRO";

  const traza: TrazaCalculo = {
    formula:
      naturalezaPartida === "ACTIVO"
        ? `diferencial = montoDivisa × (tasaNueva − tasaHistorica)  [${etiquetaEvento}, partida ACTIVO]`
        : `diferencial = −montoDivisa × (tasaNueva − tasaHistorica)  [${etiquetaEvento}, partida PASIVO]`,
    insumos: {
      naturalezaPartida,
      montoDivisa,
      tasaHistoricaValor: tasaHistorica.valor,
      tasaHistoricaFecha: tasaHistorica.fecha,
      tasaNuevaValor: tasaNueva.valor,
      tasaNuevaFecha: tasaNueva.fecha,
    },
    parametrosUsados: [
      {
        nombre: "Tasa de cambio histórica (BCV)",
        valor: tasaHistorica.valor,
        fecha: tasaHistorica.fecha,
        fuenteOficial: tasaHistorica.fuenteOficial,
        verificado: tasaHistorica.verificado,
      },
      {
        nombre: "Tasa de cambio nueva (BCV)",
        valor: tasaNueva.valor,
        fecha: tasaNueva.fecha,
        fuenteOficial: tasaNueva.fuenteOficial,
        verificado: tasaNueva.verificado,
      },
    ],
    resultado: {
      montoVesHistorico,
      montoVesNuevo,
      diferencialCambiario,
      tipoDiferencial,
    },
  };

  return { montoVesHistorico, montoVesNuevo, diferencialCambiario, tipoDiferencial, traza };
}

/**
 * Diferencial cambiario REALIZADO: se calcula al momento de liquidar
 * (cobrar/pagar) total o parcialmente una partida en moneda extranjera.
 * Es definitivo — pasa a resultado del ejercicio (NIC 21.28).
 */
export function calcularDiferencialCambiarioRealizado(
  insumos: InsumosDiferencialCambiario,
): ResultadoDiferencialCambiario {
  return calcularNucleoDiferencial(insumos, "liquidación");
}

/**
 * Diferencial cambiario NO REALIZADO: se calcula al cierre de cada
 * período sobre el saldo pendiente de una partida que sigue abierta. Es
 * una estimación que se revierte en el siguiente cierre (o al momento
 * en que la partida finalmente se liquide, con
 * calcularDiferencialCambiarioRealizado).
 */
export function calcularDiferencialCambiarioNoRealizado(
  insumos: InsumosDiferencialCambiario,
): ResultadoDiferencialCambiario {
  return calcularNucleoDiferencial(insumos, "cierre de período");
}
