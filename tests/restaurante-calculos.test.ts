import { describe, it, expect } from 'vitest'
import {
  agruparPorAntiguedad, bsAUsd, calcularNetoLinea, calcularSaldoFondo, calcularResumenMes,
  calcularTotalDia, calcularTotalesNomina, diasDeAntiguedad, estadoDeuda, rangoMes,
  redondear, repartirPropinas, saldoDeuda, semanaDe, ticketPromedio, tramoAntiguedad, usdABs,
} from '@/lib/restaurante/calculos'
import { completarMontos } from '@/lib/restaurante/fondos'

describe('conversión de moneda', () => {
  it('convierte bolívares a dólares con la tasa del día', () => {
    expect(bsAUsd(33000, 330)).toBe(100)
    expect(usdABs(100, 330)).toBe(33000)
  })

  it('devuelve 0 en vez de Infinity cuando no hay tasa', () => {
    expect(bsAUsd(33000, 0)).toBe(0)
    expect(bsAUsd(33000, -5)).toBe(0)
    expect(usdABs(100, 0)).toBe(0)
  })

  it('redondea sin arrastrar el error binario', () => {
    expect(redondear(0.1 + 0.2)).toBe(0.3)
    expect(redondear(1.005)).toBe(1.01)
    expect(redondear(NaN)).toBe(0)
  })
})

describe('cierre del día', () => {
  // Cifras tomadas de un día real de la hoja de cálculo del negocio.
  it('suma dólares y bolívares llevando todo a dólares', () => {
    const d = calcularTotalDia({
      ventaZelle: 18.7,
      ventaEfectivoUSD: 18,
      ventaBs: 225.04,
      ventaPuntoVenta: 0,
      tasa: 2,
    })
    expect(d.enDolares).toBe(36.7)
    expect(d.enBolivares).toBe(225.04)
    expect(d.bolivaresEnUSD).toBe(112.52)
    expect(d.totalUSD).toBe(149.22)
  })

  it('sin tasa, las ventas en bolívares no inflan el total en dólares', () => {
    const d = calcularTotalDia({
      ventaZelle: 50, ventaEfectivoUSD: 0, ventaBs: 10000, ventaPuntoVenta: 0, tasa: 0,
    })
    expect(d.totalUSD).toBe(50)
    expect(d.bolivaresEnUSD).toBe(0)
  })

  it('el ticket promedio no revienta con cero ventas', () => {
    expect(ticketPromedio(300, 10)).toBe(30)
    expect(ticketPromedio(300, 0)).toBe(0)
  })
})

describe('saldos de fondos', () => {
  it('un fondo en dólares suma y resta sus montos en dólares', () => {
    const saldo = calcularSaldoFondo(174, 'USD', [
      { tipo: 'INGRESO', montoUSD: 35, montoVES: 0 },
      { tipo: 'INGRESO', montoUSD: 18.7, montoVES: 0 },
      { tipo: 'EGRESO', montoUSD: 13.99, montoVES: 0 },
    ])
    expect(saldo).toBe(213.71)
  })

  it('un fondo en bolívares ignora la columna de dólares', () => {
    const saldo = calcularSaldoFondo(474866.13, 'VES', [
      { tipo: 'INGRESO', montoUSD: 100, montoVES: 94721.08 },
      { tipo: 'EGRESO', montoUSD: 50, montoVES: 21024.53 },
    ])
    expect(saldo).toBe(548562.68)
  })

  it('sin movimientos queda el saldo inicial', () => {
    expect(calcularSaldoFondo(581, 'USD', [])).toBe(581)
  })
})

describe('reparto de propinas', () => {
  it('reparte en partes iguales entre quienes participan', () => {
    const r = repartirPropinas(90, [{ id: 'a' }, { id: 'b' }, { id: 'c' }])
    expect(r).toEqual({ a: 30, b: 30, c: 30 })
  })

  it('reparte proporcional al peso de cada quien', () => {
    const r = repartirPropinas(100, [{ id: 'a', peso: 1 }, { id: 'b', peso: 0.5 }])
    expect(redondear(r.a + r.b)).toBe(100)
    expect(r.b).toBeLessThan(r.a)
  })

  it('las partes suman exactamente el pote aunque el reparto no sea exacto', () => {
    const r = repartirPropinas(100, [{ id: 'a' }, { id: 'b' }, { id: 'c' }])
    expect(redondear(r.a + r.b + r.c)).toBe(100)
  })

  it('sin participantes o sin pote no reparte nada', () => {
    expect(repartirPropinas(100, [])).toEqual({})
    expect(repartirPropinas(0, [{ id: 'a' }])).toEqual({ a: 0 })
  })
})

describe('nómina semanal', () => {
  it('el neto suma base, propina, transporte y delivery, y resta el descuento', () => {
    expect(calcularNetoLinea({ base: 80, propina: 19.09, transporte: 9, delivery: 0, descuento: 5 })).toBe(103.09)
  })

  it('un descuento mayor que el bruto no genera un neto negativo', () => {
    expect(calcularNetoLinea({ base: 20, descuento: 50 })).toBe(0)
  })

  it('los totales de la semana cuadran con la suma de las líneas', () => {
    const t = calcularTotalesNomina([
      { base: 80, propina: 19.09, transporte: 0, delivery: 0, descuento: 0 },
      { base: 40, propina: 19.09, transporte: 4, delivery: 0, descuento: 5 },
    ])
    expect(t.totalBase).toBe(120)
    expect(t.totalPropina).toBe(38.18)
    expect(t.totalTransporte).toBe(4)
    expect(t.totalDescuento).toBe(5)
    expect(t.totalNeto).toBe(157.18)
  })
})

describe('deudas', () => {
  it('clasifica el estado según lo abonado', () => {
    expect(estadoDeuda(100, 0)).toBe('PENDIENTE')
    expect(estadoDeuda(100, 40)).toBe('ABONADA')
    expect(estadoDeuda(100, 100)).toBe('PAGADA')
  })

  it('un centavo de redondeo no deja la nota eternamente abonada', () => {
    expect(estadoDeuda(100, 99.999)).toBe('PAGADA')
  })

  it('el saldo nunca es negativo', () => {
    expect(saldoDeuda(100, 30)).toBe(70)
    expect(saldoDeuda(100, 120)).toBe(0)
  })

  it('agrupa los saldos por antigüedad', () => {
    const hoy = new Date(Date.UTC(2026, 0, 31))
    const tramos = agruparPorAntiguedad([
      { fecha: new Date(Date.UTC(2026, 0, 30)), saldo: 10 }, // 1 día
      { fecha: new Date(Date.UTC(2026, 0, 20)), saldo: 20 }, // 11 días
      { fecha: new Date(Date.UTC(2025, 11, 1)), saldo: 30 }, // más de 30
    ], hoy)
    expect(tramos['0-7']).toBe(10)
    expect(tramos['8-15']).toBe(20)
    expect(tramos['+30']).toBe(30)
  })

  it('una fecha futura cuenta como 0 días', () => {
    const hoy = new Date(Date.UTC(2026, 0, 1))
    expect(diasDeAntiguedad(new Date(Date.UTC(2026, 0, 5)), hoy)).toBe(0)
    expect(tramoAntiguedad(0)).toBe('0-7')
    expect(tramoAntiguedad(31)).toBe('+30')
  })
})

describe('resumen del mes', () => {
  it('calcula utilidad, margen y promedios', () => {
    const r = calcularResumenMes(
      [{ totalUSD: 100, numVentas: 5 }, { totalUSD: 300, numVentas: 15 }],
      200,
    )
    expect(r.ingresos).toBe(400)
    expect(r.egresos).toBe(200)
    expect(r.utilidad).toBe(200)
    expect(r.margen).toBe(50)
    expect(r.ticketPromedio).toBe(20)
    expect(r.ventaPromedioDia).toBe(200)
  })

  it('los días sin ventas (feriado) no diluyen el promedio', () => {
    const r = calcularResumenMes(
      [{ totalUSD: 0, numVentas: 0 }, { totalUSD: 300, numVentas: 10 }],
      0,
    )
    expect(r.diasTrabajados).toBe(1)
    expect(r.ventaPromedioDia).toBe(300)
  })

  it('un mes sin ingresos reporta margen 0 en vez de dividir por cero', () => {
    const r = calcularResumenMes([], 150)
    expect(r.ingresos).toBe(0)
    expect(r.margen).toBe(0)
    expect(r.utilidad).toBe(-150)
  })
})

describe('fechas', () => {
  it('la semana va de lunes a domingo', () => {
    // 2026-01-14 es miércoles.
    const s = semanaDe('2026-01-14')
    expect(s.inicio.toISOString().slice(0, 10)).toBe('2026-01-12')
    expect(s.fin.toISOString().slice(0, 10)).toBe('2026-01-18')
  })

  it('un domingo pertenece a la semana que empezó el lunes anterior', () => {
    const s = semanaDe('2026-01-18')
    expect(s.inicio.toISOString().slice(0, 10)).toBe('2026-01-12')
  })

  it('el rango del mes cubre desde el día 1 hasta el último instante del último día', () => {
    const { desde, hasta } = rangoMes(2026, 2)
    expect(desde.toISOString().slice(0, 10)).toBe('2026-02-01')
    expect(hasta.toISOString().slice(0, 10)).toBe('2026-02-28')
  })
})

describe('completar montos con la tasa', () => {
  it('deriva los bolívares cuando solo se escribió el monto en dólares', () => {
    expect(completarMontos({ montoUSD: 100, tasa: 330 })).toEqual({ montoUSD: 100, montoVES: 33000, tasa: 330 })
  })

  it('deriva los dólares cuando solo se escribió el monto en bolívares', () => {
    expect(completarMontos({ montoVES: 33000, tasa: 330 })).toEqual({ montoUSD: 100, montoVES: 33000, tasa: 330 })
  })

  it('sin tasa no inventa la conversión', () => {
    expect(completarMontos({ montoUSD: 100 })).toEqual({ montoUSD: 100, montoVES: 0, tasa: 0 })
  })
})
