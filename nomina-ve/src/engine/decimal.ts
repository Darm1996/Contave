// Aritmética monetaria. El motor NUNCA usa `number` para dinero: todo pasa
// por decimal.js con precisión alta y se redondea a 2 decimales solo al final
// de cada concepto (r2), nunca en pasos intermedios.
import DecimalBase from 'decimal.js'

export const Decimal = DecimalBase.clone({ precision: 40, rounding: DecimalBase.ROUND_HALF_UP })
export type Decimal = InstanceType<typeof Decimal>
export type Num = Decimal | string | number

export const D = (v: Num): Decimal => new Decimal(v)
export const CERO = D(0)

/** Redondeo final de un concepto a céntimos (mitad hacia arriba). */
export const r2 = (v: Num): Decimal => D(v).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)

export const sumar = (valores: Num[]): Decimal => valores.reduce<Decimal>((acc, v) => acc.plus(v), CERO)

export const max = (a: Num, b: Num): Decimal => Decimal.max(a, b)
export const min = (a: Num, b: Num): Decimal => Decimal.min(a, b)

/** Porcentaje expresado como 9 = 9 %. */
export const pct = (base: Num, porcentaje: Num): Decimal => D(base).times(porcentaje).div(100)

/** Formato para desgloses legibles (es-VE, sin redondear el valor guardado). */
export const fmt = (v: Num, decimales = 2): string =>
  D(v).toFixed(decimales).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
