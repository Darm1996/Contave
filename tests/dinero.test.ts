import { describe, it, expect } from 'vitest'
import {
  d,
  suma,
  resta,
  mult,
  div,
  sumarPor,
  porcentaje,
  impuestoIncluido,
  baseDeImporteConImpuesto,
  redondear,
  redondearCosto,
  ajusteRedondeo,
  prorratear,
  promedioPonderado,
  convertir,
  iguales,
  aCadena,
  aNumero,
  REDONDEO_MONEDA,
  type CriterioRedondeo,
} from '@/lib/nucleo/dinero'

describe('dinero: exactitud frente al punto flotante', () => {
  it('suma 0.1 + 0.2 exactamente igual a 0.3', () => {
    // Este es el caso que Float NO puede hacer: 0.1 + 0.2 === 0.30000000000000004
    expect(suma('0.1', '0.2').toString()).toBe('0.3')
    expect(0.1 + 0.2).not.toBe(0.3) // se deja explícito por qué existe este módulo
  })

  it('no arrastra el error binario cuando la entrada viene como number', () => {
    // new Decimal(0.1) desde un literal number podría arrastrar basura; d()
    // pasa por string para evitarlo.
    expect(d(0.1).toString()).toBe('0.1')
    expect(suma(0.1, 0.2).toString()).toBe('0.3')
  })

  it('multiplica precios sin residuos', () => {
    expect(mult('19.99', 3).toString()).toBe('59.97')
    // Caso real de residuo en flotante: 1.1 * 3 === 3.3000000000000003
    expect(mult('1.1', 3).toString()).toBe('3.3')
    expect(1.1 * 3).not.toBe(3.3)
    // Y el clásico de convertir a céntimos: 0.07 * 100 === 7.000000000000001
    expect(mult('0.07', 100).toString()).toBe('7')
    expect(0.07 * 100).not.toBe(7)
  })

  it('redondea 1.005 a 1.01 y no a 1.00', () => {
    // Con Float, 1.005 es en realidad 1.00499999999999989 y Math.round da 1.00
    expect(redondear('1.005').toString()).toBe('1.01')
  })

  it('suma una lista de importes sin perder céntimos', () => {
    const lineas = Array.from({ length: 100 }, () => ({ monto: '0.01' }))
    expect(sumarPor(lineas, (l) => l.monto).toString()).toBe('1')
  })

  it('protege la división entre cero en vez de devolver Infinity o NaN', () => {
    expect(div(100, 0).toString()).toBe('0')
    expect(div(100, 0, '-1').toString()).toBe('-1')
    expect(Number.isNaN(aNumero(div(0, 0)))).toBe(false)
  })

  it('rechaza entradas no numéricas en vez de propagar NaN', () => {
    expect(() => d('no soy un número')).toThrow(/no numérico/)
    expect(() => d(Number.POSITIVE_INFINITY)).toThrow(/no finito/)
  })

  it('trata null y undefined como cero', () => {
    expect(suma(null, undefined, 5).toString()).toBe('5')
  })
})

describe('dinero: impuestos', () => {
  it('calcula el IVA sobre una base gravable', () => {
    expect(porcentaje('1000', '16').toString()).toBe('160')
  })

  it('desglosa el IVA de un precio que ya lo lleva incluido', () => {
    // Un quiosco publica "Bs 116 con IVA incluido": la base es 100 y el
    // impuesto 16. Aplicar 16 % sobre 116 daría 18.56, que es el error.
    expect(impuestoIncluido('116', '16').toString()).toBe('16')
    expect(baseDeImporteConImpuesto('116', '16').toString()).toBe('100')
    expect(porcentaje('116', '16').toString()).not.toBe('16')
  })

  it('mantiene la identidad base + impuesto = total con IVA incluido', () => {
    const total = '99.99'
    const base = baseDeImporteConImpuesto(total, '16')
    const iva = impuestoIncluido(total, '16')
    expect(iguales(suma(base, iva), total)).toBe(true)
  })

  it('calcula IGTF del 3 % sobre un pago en divisas', () => {
    expect(redondear(porcentaje('250.50', '3')).toString()).toBe('7.52')
  })
})

describe('dinero: costo promedio ponderado', () => {
  it('cumple el criterio de aceptación: dos costos distintos dan el promedio correcto', () => {
    // 10 unidades a 10.00 + 10 unidades a 20.00 = 20 unidades a 15.00
    const r = promedioPonderado(10, '10.00', 10, '20.00')
    expect(r.cantidadSaldo.toString()).toBe('20')
    expect(r.costoPromedio.toString()).toBe('15')
  })

  it('promedia correctamente con cantidades desiguales', () => {
    // 30 a 5.00 + 10 a 9.00 → (150 + 90) / 40 = 6.00
    const r = promedioPonderado(30, '5', 10, '9')
    expect(r.costoPromedio.toString()).toBe('6')
  })

  it('conserva precisión en promedios que no son exactos', () => {
    // (1 * 10 + 2 * 20) / 3 = 16.666666...  Se guarda con 6 decimales, no 2.
    const r = promedioPonderado(1, '10', 2, '20')
    expect(r.costoPromedio.toString()).toBe('16.666667')
  })

  it('NO acumula error al repetir muchas entradas', () => {
    // Este es el escenario que rompe el redondeo a 2 decimales por paso:
    // 300 entradas de 1 unidad a un costo con decimales infinitos.
    let cantidad = d(0)
    let costo = d(0)
    for (let i = 0; i < 300; i += 1) {
      const r = promedioPonderado(cantidad, costo, 1, '3.333333')
      cantidad = r.cantidadSaldo
      costo = r.costoPromedio
    }
    expect(cantidad.toString()).toBe('300')
    // El promedio de 300 entradas al mismo costo debe seguir siendo ese costo.
    expect(costo.toString()).toBe('3.333333')
    // Y la valorización debe cuadrar con cantidad × costo.
    expect(mult(cantidad, costo).toString()).toBe('999.9999')
  })

  it('conserva el último costo conocido cuando el saldo llega a cero', () => {
    const r = promedioPonderado(5, '12.50', -5, '12.50')
    expect(r.cantidadSaldo.toString()).toBe('0')
    expect(r.costoPromedio.toString()).toBe('12.5')
  })

  it('una salida no altera el costo promedio', () => {
    // Modelado como entrada negativa al mismo costo promedio vigente.
    const r = promedioPonderado(20, '15', -8, '15')
    expect(r.cantidadSaldo.toString()).toBe('12')
    expect(r.costoPromedio.toString()).toBe('15')
  })
})

describe('dinero: prorrateo', () => {
  it('reparte 100 entre tres partes iguales sin perder céntimos', () => {
    // El reparto ingenuo da 33.33 × 3 = 99.99 y pierde un céntimo.
    const partes = prorratear('100', ['1', '1', '1'])
    // La propiedad que importa: la suma de las partes es exactamente el total.
    expect(suma(...partes).toString()).toBe('100')
    // Con pesos empatados el residuo se asigna a la primera parte.
    expect(partes.map((p) => p.toString())).toEqual(['33.34', '33.33', '33.33'])
  })

  it('prorratea el flete de una compra por valor de línea', () => {
    // Flete de 50 sobre líneas de 300 y 700 → 15 y 35.
    const partes = prorratear('50', ['300', '700'])
    expect(partes.map((p) => p.toString())).toEqual(['15', '35'])
    expect(suma(...partes).toString()).toBe('50')
  })

  it('cuadra exactamente con importes y pesos irregulares', () => {
    const pesos = ['123.45', '67.89', '1000.01', '0.55']
    const partes = prorratear('987.65', pesos)
    expect(suma(...partes).toString()).toBe('987.65')
  })

  it('reparte en partes iguales cuando todos los pesos son cero', () => {
    const partes = prorratear('10', ['0', '0', '0'])
    expect(suma(...partes).toString()).toBe('10')
  })

  it('devuelve lista vacía sin pesos', () => {
    expect(prorratear('10', [])).toEqual([])
  })
})

describe('dinero: redondeo', () => {
  it('aplica el modo bancario cuando se pide', () => {
    const bancario: CriterioRedondeo = { decimales: 2, modo: 'HALF_EVEN' }
    expect(redondear('1.005', bancario).toString()).toBe('1')
    expect(redondear('1.015', bancario).toString()).toBe('1.02')
  })

  it('redondea al múltiplo más cercano cuando hay incremento', () => {
    const cuartos: CriterioRedondeo = { decimales: 2, modo: 'HALF_UP', incremento: '0.25' }
    expect(redondear('10.10', cuartos).toString()).toBe('10')
    expect(redondear('10.13', cuartos).toString()).toBe('10.25')
    expect(redondear('10.80', cuartos).toString()).toBe('10.75')
  })

  it('mantiene 6 decimales en costos unitarios', () => {
    expect(redondearCosto('3.14159265').toString()).toBe('3.141593')
  })

  it('calcula el ajuste por redondeo para que el documento cuadre', () => {
    // Tres líneas de 33.333... que redondeadas suman 99.99 contra un total de 100.
    const lineas = ['33.33', '33.33', '33.33']
    const ajuste = ajusteRedondeo('100', lineas)
    expect(ajuste.toString()).toBe('0.01')
    expect(suma(...lineas, ajuste).toString()).toBe('100')
  })
})

describe('dinero: multimoneda', () => {
  it('convierte USD a Bs guardando monto de origen, tasa y equivalente', () => {
    const c = convertir('100', '36.5432', 'USD', 'VES')
    expect(c.montoOrigen.toString()).toBe('100')
    expect(c.tasaAplicada.toString()).toBe('36.5432')
    expect(c.montoFuncional.toString()).toBe('3654.32')
  })

  it('no toca el importe cuando origen y destino son la misma moneda', () => {
    const c = convertir('123.456', '0', 'VES', 'VES')
    expect(c.tasaAplicada.toString()).toBe('1')
    expect(c.montoFuncional.toString()).toBe('123.46')
  })

  it('exige tasa válida en vez de convertir a cero en silencio', () => {
    expect(() => convertir('100', '0', 'USD', 'VES')).toThrow(/tasa de cambio/)
    expect(() => convertir('100', '-5', 'USD', 'VES')).toThrow(/tasa de cambio/)
  })

  it('un documento histórico no cambia cuando cambia la tasa del día', () => {
    // Se convierte con la tasa del día del documento y el equivalente queda
    // congelado; recalcular con la tasa nueva daría otro número, y eso es
    // precisamente lo que el sistema NO debe hacer.
    const documento = convertir('100', '36.00', 'USD', 'VES')
    const tasaDeHoy = '41.75'
    const siRecalculara = convertir('100', tasaDeHoy, 'USD', 'VES')

    expect(documento.montoFuncional.toString()).toBe('3600')
    expect(siRecalculara.montoFuncional.toString()).toBe('4175')
    // El documento guardado conserva su tasa, no la de hoy.
    expect(documento.tasaAplicada.toString()).toBe('36')
  })

  it('conserva precisión de tasa con 8 decimales', () => {
    const c = convertir('7.5', '36.54321987', 'USD', 'VES')
    expect(c.montoFuncional.toString()).toBe('274.07')
  })
})

describe('dinero: fronteras de presentación', () => {
  it('serializa a string con los decimales pedidos', () => {
    expect(aCadena('1234.5')).toBe('1234.50')
    expect(aCadena('3.14159', 4)).toBe('3.1416')
  })

  it('convierte a number solo en la frontera de presentación', () => {
    expect(aNumero('1234.56')).toBe(1234.56)
  })

  it('el criterio de moneda por defecto es 2 decimales, medio hacia arriba', () => {
    expect(REDONDEO_MONEDA).toEqual({ decimales: 2, modo: 'HALF_UP' })
  })
})

describe('dinero: comparaciones con tolerancia', () => {
  it('considera iguales dos importes que difieren menos de medio céntimo', () => {
    expect(iguales('100.00', '100.004')).toBe(true)
    expect(iguales('100.00', '100.01')).toBe(false)
  })

  it('sirve para validar que un asiento cuadra por el debe y por el haber', () => {
    const debe = suma('116000.00', '18560.00')
    const haber = suma('100000.00', '34560.00')
    expect(iguales(debe, haber)).toBe(true)
  })

  it('resta sin residuo', () => {
    expect(resta('0.3', '0.1').toString()).toBe('0.2')
    expect(0.3 - 0.1).not.toBe(0.2)
  })
})
