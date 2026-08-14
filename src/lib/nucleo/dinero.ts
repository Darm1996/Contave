// ═══════════════════════════════════════════════════════════════════════
//  Aritmética de dinero y cantidades
// ═══════════════════════════════════════════════════════════════════════
//
// Toda operación con dinero, cantidades, costos y tasas del sistema pasa por
// aquí. La razón no es estilo: es que el tipo `number` de JavaScript es un
// flotante binario de doble precisión y no puede representar 0.10 de forma
// exacta. Las consecuencias en un sistema administrativo son concretas:
//
//   0.1 + 0.2                    → 0.30000000000000004
//   1.005 redondeado a 2         → 1.00  (no 1.01, porque 1.005 en binario
//                                  es en realidad 1.00499999999999989)
//   19.99 * 3                    → 59.97000000000001
//
// Un céntimo de error por línea, en mil tickets al mes, es un arqueo que
// nunca cuadra y un inventario que nadie puede explicar. Usamos Decimal
// (decimal.js, que ya viene con Prisma) que opera en base 10 y es exacto
// para las cuatro operaciones dentro de su precisión.
//
// REGLA DEL REDONDEO ÚNICO
// ---------------------------------------------------------------------
// Los cálculos intermedios NO se redondean. Se acumulan con toda la
// precisión disponible y se redondea UNA sola vez, al final, cuando el
// número se convierte en un importe cobrable o en un asiento. Redondear en
// cada paso ("redondeo en cascada") introduce un error que crece con el
// número de pasos. Por eso los costos promedio se guardan con 6 decimales y
// solo el total del documento se redondea a 2.

import { Prisma } from '@prisma/client'

/** Decimal exacto en base 10. Se reexporta para no acoplar al import de Prisma. */
export const Decimal = Prisma.Decimal
export type Decimal = Prisma.Decimal

/**
 * Todo lo que se puede interpretar como número exacto. Se acepta `number`
 * por comodidad en la entrada (un precio que teclea el usuario, una
 * constante literal), pero nunca se hace aritmética con él directamente.
 */
export type Numerico = Prisma.Decimal | number | string

export const CERO = new Decimal(0)
export const UNO = new Decimal(1)
export const CIEN = new Decimal(100)

/** Modos de redondeo soportados, con el nombre que se guarda en la organización. */
export type ModoRedondeo = 'HALF_UP' | 'HALF_EVEN' | 'UP' | 'DOWN'

const MODOS: Record<ModoRedondeo, Prisma.Decimal.Rounding> = {
  // Comercial: 0.5 sube. Es lo que espera cualquier cliente frente a un
  // ticket, y el criterio por defecto del sistema.
  HALF_UP: Decimal.ROUND_HALF_UP,
  // Bancario: 0.5 va al par más cercano. Reduce el sesgo acumulado cuando
  // se redondean millones de importes, a costa de ser poco intuitivo.
  HALF_EVEN: Decimal.ROUND_HALF_EVEN,
  UP: Decimal.ROUND_UP,
  DOWN: Decimal.ROUND_DOWN,
}

/** Convierte cualquier entrada a Decimal. Lanza si el valor no es numérico. */
export function d(valor: Numerico | null | undefined): Prisma.Decimal {
  if (valor === null || valor === undefined) return CERO
  if (valor instanceof Decimal) return valor
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) {
      throw new Error(`Valor numérico no finito: ${valor}`)
    }
    // Vía string: `new Decimal(0.1)` desde un number arrastra el error
    // binario del literal. Convertir primero a su representación decimal
    // más corta preserva lo que el usuario realmente quiso decir.
    return new Decimal(valor.toString())
  }
  const limpio = valor.trim()
  if (limpio === '') return CERO
  try {
    return new Decimal(limpio)
  } catch {
    throw new Error(`Valor no numérico: "${valor}"`)
  }
}

// ───────────────────────────────────────────────────────────────────────
//  OPERACIONES
// ───────────────────────────────────────────────────────────────────────

export function suma(...valores: Array<Numerico | null | undefined>): Prisma.Decimal {
  return valores.reduce<Prisma.Decimal>((acc, v) => acc.plus(d(v)), CERO)
}

export function resta(a: Numerico, b: Numerico): Prisma.Decimal {
  return d(a).minus(d(b))
}

export function mult(...valores: Numerico[]): Prisma.Decimal {
  if (valores.length === 0) return CERO
  return valores.reduce<Prisma.Decimal>((acc, v) => acc.times(d(v)), UNO)
}

/**
 * División protegida. Devuelve `siCero` (0 por defecto) cuando el divisor es
 * cero, en vez de Infinity o NaN. Esto importa porque el caso "dividir entre
 * la cantidad en existencia" ocurre de verdad cuando el stock queda en cero,
 * y un NaN ahí se propaga silenciosamente a todo un reporte.
 */
export function div(a: Numerico, b: Numerico, siCero: Numerico = CERO): Prisma.Decimal {
  const divisor = d(b)
  if (divisor.isZero()) return d(siCero)
  return d(a).dividedBy(divisor)
}

/** Suma una propiedad numérica sobre una lista. Reemplaza a `reduce((s,x) => s + x.campo, 0)`. */
export function sumarPor<T>(items: readonly T[], selector: (item: T) => Numerico | null | undefined): Prisma.Decimal {
  return items.reduce<Prisma.Decimal>((acc, item) => acc.plus(d(selector(item))), CERO)
}

/** Aplica un porcentaje: `porcentaje(1000, 16)` → 160. */
export function porcentaje(base: Numerico, tasa: Numerico): Prisma.Decimal {
  return div(mult(base, tasa), CIEN)
}

/**
 * Extrae la porción de impuesto de un importe que YA lo lleva incluido.
 * Con base 116 y tasa 16 devuelve 16, no 18.56. Confundir este cálculo con
 * `porcentaje()` es la causa más frecuente de descuadres en el libro de
 * ventas de negocios que publican precios con IVA incluido.
 */
export function impuestoIncluido(importeConImpuesto: Numerico, tasa: Numerico): Prisma.Decimal {
  const t = d(tasa)
  return div(mult(importeConImpuesto, t), CIEN.plus(t))
}

/** Base imponible de un importe que ya lleva el impuesto incluido. */
export function baseDeImporteConImpuesto(importeConImpuesto: Numerico, tasa: Numerico): Prisma.Decimal {
  return resta(importeConImpuesto, impuestoIncluido(importeConImpuesto, tasa))
}

// ───────────────────────────────────────────────────────────────────────
//  COMPARACIONES
// ───────────────────────────────────────────────────────────────────────

export function esCero(v: Numerico): boolean {
  return d(v).isZero()
}
export function esPositivo(v: Numerico): boolean {
  return d(v).greaterThan(CERO)
}
export function esNegativo(v: Numerico): boolean {
  return d(v).lessThan(CERO)
}
export function igual(a: Numerico, b: Numerico): boolean {
  return d(a).equals(d(b))
}
export function mayor(a: Numerico, b: Numerico): boolean {
  return d(a).greaterThan(d(b))
}
export function mayorOIgual(a: Numerico, b: Numerico): boolean {
  return d(a).greaterThanOrEqualTo(d(b))
}
export function menor(a: Numerico, b: Numerico): boolean {
  return d(a).lessThan(d(b))
}
export function maximo(a: Numerico, b: Numerico): Prisma.Decimal {
  return mayor(a, b) ? d(a) : d(b)
}
export function minimo(a: Numerico, b: Numerico): Prisma.Decimal {
  return menor(a, b) ? d(a) : d(b)
}
export function absoluto(v: Numerico): Prisma.Decimal {
  return d(v).absoluteValue()
}
export function negar(v: Numerico): Prisma.Decimal {
  return d(v).negated()
}

/**
 * Igualdad con tolerancia, para comparar dos importes que se calcularon por
 * caminos distintos (ej. el total de un asiento por el debe y por el haber).
 * La tolerancia por defecto es medio céntimo.
 */
export function iguales(a: Numerico, b: Numerico, tolerancia: Numerico = '0.005'): boolean {
  return absoluto(resta(a, b)).lessThanOrEqualTo(d(tolerancia))
}

// ───────────────────────────────────────────────────────────────────────
//  REDONDEO
// ───────────────────────────────────────────────────────────────────────

export interface CriterioRedondeo {
  decimales: number
  modo: ModoRedondeo
  /** Múltiplo al que se redondea (ej. 0.25). Cero = sin múltiplo. */
  incremento?: Numerico
}

export const REDONDEO_MONEDA: CriterioRedondeo = { decimales: 2, modo: 'HALF_UP' }
/** Precisión de trabajo para costos unitarios y promedios ponderados. */
export const DECIMALES_COSTO = 6
/** Precisión de trabajo para cantidades de inventario. */
export const DECIMALES_CANTIDAD = 3

/**
 * Redondeo final de un importe. Es la ÚNICA función que debe redondear
 * dinero en todo el sistema, y se llama una vez por documento, al cerrarlo.
 */
export function redondear(valor: Numerico, criterio: CriterioRedondeo = REDONDEO_MONEDA): Prisma.Decimal {
  const v = d(valor)
  const modo = MODOS[criterio.modo]
  const incremento = d(criterio.incremento ?? CERO)

  if (incremento.greaterThan(CERO)) {
    // Redondeo al múltiplo más cercano: para negocios donde no circulan
    // monedas fraccionarias y todo se cobra en múltiplos de, por ejemplo,
    // 0.25. Se divide, se redondea al entero y se multiplica de vuelta.
    return v.dividedBy(incremento).toDecimalPlaces(0, modo).times(incremento).toDecimalPlaces(criterio.decimales, modo)
  }
  return v.toDecimalPlaces(criterio.decimales, modo)
}

/** Redondea a la precisión de costos (6 decimales). No es el redondeo final. */
export function redondearCosto(valor: Numerico): Prisma.Decimal {
  return d(valor).toDecimalPlaces(DECIMALES_COSTO, Decimal.ROUND_HALF_UP)
}

/** Redondea a la precisión de cantidades (3 decimales). */
export function redondearCantidad(valor: Numerico, decimales = DECIMALES_CANTIDAD): Prisma.Decimal {
  return d(valor).toDecimalPlaces(decimales, Decimal.ROUND_HALF_UP)
}

/**
 * Diferencia entre un total redondeado y la suma de sus partes redondeadas.
 * Se guarda como "ajuste por redondeo" en el documento para que la suma de
 * las líneas más los impuestos dé exactamente el total cobrado. Sin este
 * ajuste explícito, el ticket muestra un total que no coincide con la suma
 * de lo que el cliente ve, y no hay forma de explicárselo.
 */
export function ajusteRedondeo(total: Numerico, partes: readonly Numerico[]): Prisma.Decimal {
  return resta(total, suma(...partes))
}

// ───────────────────────────────────────────────────────────────────────
//  PRORRATEO
// ───────────────────────────────────────────────────────────────────────

/**
 * Reparte un importe entre varias partes según pesos, garantizando que la
 * suma de los repartos sea EXACTAMENTE el importe original.
 *
 * Se usa para prorratear el flete de una compra entre sus líneas y para
 * repartir un descuento de documento entre los renglones. El reparto
 * ingenuo (multiplicar por el peso relativo y redondear cada parte) pierde o
 * inventa céntimos: repartir 100 entre tres partes iguales da 33.33 × 3 =
 * 99.99. Aquí el residuo se asigna a la parte de mayor peso, de modo que el
 * total siempre cuadra y el sesgo cae donde menos se nota.
 */
export function prorratear(
  importe: Numerico,
  pesos: readonly Numerico[],
  criterio: CriterioRedondeo = REDONDEO_MONEDA,
): Prisma.Decimal[] {
  if (pesos.length === 0) return []

  const total = d(importe)
  const pesosD = pesos.map((p) => d(p))
  const sumaPesos = suma(...pesosD)

  // Sin pesos con los que discriminar, se reparte en partes iguales.
  if (sumaPesos.isZero()) {
    const iguales = pesosD.map(() => redondear(div(total, pesosD.length), criterio))
    return asignarResiduo(total, iguales, pesosD.map(() => UNO), criterio)
  }

  const repartos = pesosD.map((peso) => redondear(mult(total, div(peso, sumaPesos)), criterio))
  return asignarResiduo(total, repartos, pesosD, criterio)
}

/** Añade el residuo del prorrateo a la parte de mayor peso. */
function asignarResiduo(
  total: Prisma.Decimal,
  repartos: Prisma.Decimal[],
  pesos: readonly Prisma.Decimal[],
  criterio: CriterioRedondeo,
): Prisma.Decimal[] {
  const residuo = resta(total, suma(...repartos))
  if (residuo.isZero()) return repartos

  let indiceMayor = 0
  for (let i = 1; i < pesos.length; i += 1) {
    if (pesos[i].greaterThan(pesos[indiceMayor])) indiceMayor = i
  }
  const ajustados = [...repartos]
  ajustados[indiceMayor] = redondear(ajustados[indiceMayor].plus(residuo), criterio)
  return ajustados
}

// ───────────────────────────────────────────────────────────────────────
//  COSTO PROMEDIO PONDERADO
// ───────────────────────────────────────────────────────────────────────

export interface ResultadoPromedioPonderado {
  cantidadSaldo: Prisma.Decimal
  costoPromedio: Prisma.Decimal
}

/**
 * Recalcula el costo promedio ponderado al ingresar mercancía.
 *
 *   promedio = (valor en existencia + valor que entra) / cantidad total
 *
 * El resultado se guarda con 6 decimales y NO con 2, a propósito: es un
 * valor intermedio que se vuelve a usar en el siguiente movimiento.
 * Redondearlo a 2 en cada entrada hace que el error se acumule hasta que la
 * valorización del inventario deja de coincidir con el kardex.
 *
 * Ejemplo del criterio de aceptación: 10 unidades a 10.00 más 10 unidades a
 * 20.00 da 20 unidades a 15.00 exactos.
 */
export function promedioPonderado(
  cantidadActual: Numerico,
  costoPromedioActual: Numerico,
  cantidadEntrada: Numerico,
  costoEntrada: Numerico,
): ResultadoPromedioPonderado {
  const cantActual = d(cantidadActual)
  const cantEntrada = d(cantidadEntrada)
  const cantidadSaldo = cantActual.plus(cantEntrada)

  // Si el saldo queda en cero (o negativo por una devolución total), no hay
  // sobre qué promediar: se conserva el último costo conocido para no
  // perder la referencia de reposición.
  if (!cantidadSaldo.greaterThan(CERO)) {
    return { cantidadSaldo, costoPromedio: redondearCosto(costoPromedioActual) }
  }

  const valorTotal = mult(cantActual, costoPromedioActual).plus(mult(cantEntrada, costoEntrada))
  return {
    cantidadSaldo: redondearCantidad(cantidadSaldo),
    costoPromedio: redondearCosto(div(valorTotal, cantidadSaldo)),
  }
}

// ───────────────────────────────────────────────────────────────────────
//  MULTIMONEDA
// ───────────────────────────────────────────────────────────────────────

export interface ConversionMoneda {
  /** Importe en la moneda de origen, tal como se pactó. */
  montoOrigen: Prisma.Decimal
  monedaOrigen: string
  /** Tasa aplicada, congelada en el documento. */
  tasaAplicada: Prisma.Decimal
  /** Equivalente en moneda funcional, ya redondeado. */
  montoFuncional: Prisma.Decimal
  monedaFuncional: string
}

/**
 * Convierte un importe a la moneda funcional y devuelve las tres cosas que
 * un documento debe guardar: monto de origen, tasa aplicada y equivalente.
 *
 * Guardar la tasa junto al documento (en vez de leerla al generar el
 * reporte) es lo que hace que un reporte del mes pasado muestre los mismos
 * montos hoy que mañana aunque el BCV publique otra tasa. Es la diferencia
 * entre un sistema auditable y uno en el que la historia cambia sola.
 */
export function convertir(
  monto: Numerico,
  tasa: Numerico,
  monedaOrigen: string,
  monedaFuncional: string,
  criterio: CriterioRedondeo = REDONDEO_MONEDA,
): ConversionMoneda {
  const montoOrigen = d(monto)
  const tasaAplicada = d(tasa)

  if (monedaOrigen === monedaFuncional) {
    return {
      montoOrigen,
      monedaOrigen,
      tasaAplicada: UNO,
      montoFuncional: redondear(montoOrigen, criterio),
      monedaFuncional,
    }
  }

  if (!tasaAplicada.greaterThan(CERO)) {
    throw new Error(
      `No hay tasa de cambio válida para convertir de ${monedaOrigen} a ${monedaFuncional}. ` +
        'Registra la tasa del día antes de continuar.',
    )
  }

  return {
    montoOrigen,
    monedaOrigen,
    tasaAplicada,
    montoFuncional: redondear(mult(montoOrigen, tasaAplicada), criterio),
    monedaFuncional,
  }
}

// ───────────────────────────────────────────────────────────────────────
//  FRONTERAS: PRESENTACIÓN Y SERIALIZACIÓN
// ───────────────────────────────────────────────────────────────────────

/**
 * Convierte a `number` para presentación (una celda de Excel, un punto de
 * una gráfica, un PDF). Se llama explícitamente y con este nombre para que
 * en una revisión de código quede claro que ahí termina la aritmética
 * exacta y empieza el render. NO usar en cálculos.
 */
export function aNumero(valor: Numerico | null | undefined): number {
  return d(valor).toNumber()
}

/**
 * Serializa a string para respuestas JSON. Se usa string y no number porque
 * `JSON.parse` de un number vuelve a un flotante binario, y el cliente
 * perdería la exactitud que el servidor cuidó.
 */
export function aCadena(valor: Numerico | null | undefined, decimales = 2): string {
  return d(valor).toFixed(decimales)
}

/** Formatea para mostrar al usuario, con separadores de miles locales. */
export function formatear(valor: Numerico | null | undefined, moneda = 'VES', decimales = 2): string {
  const n = aNumero(valor)
  const simbolos: Record<string, string> = { VES: 'Bs', USD: '$', EUR: '€' }
  const simbolo = simbolos[moneda] ?? moneda
  return `${simbolo} ${n.toLocaleString('es-VE', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })}`
}
