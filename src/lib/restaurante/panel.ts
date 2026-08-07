// Armado del panel del módulo Restaurante.
//
// El panel responde de un vistazo las preguntas que el dueño se hace todos
// los días: cuánto entró, cuánto salió, cuánto queda en cada caja, a quién
// le debo y quién me debe. Todo se calcula del mes seleccionado; nada de
// esto se captura a mano.

import { db } from '@/lib/db'
import {
  agruparPorAntiguedad, calcularResumenMes, claveDia, rangoMes, redondear, saldoDeuda,
} from './calculos'
import { saldosDeFondos, type FondoConSaldo } from './fondos'
import { etiquetaCategoria } from './categorias'

export interface PuntoSerieDia {
  fecha: string
  ingresos: number
  egresos: number
  ventas: number
}

export interface PanelRestaurante {
  mes: number
  ano: number
  tasaActual: number
  resumen: ReturnType<typeof calcularResumenMes>
  serieDiaria: PuntoSerieDia[]
  egresosPorCategoria: Array<{ categoria: string; label: string; monto: number }>
  fondos: FondoConSaldo[]
  totalEnCajaUSD: number
  porPagar: { total: number; cantidad: number; antiguedad: Record<string, number> }
  porCobrar: { total: number; cantidad: number }
  topProveedores: Array<{ nombre: string; monto: number }>
  alertas: Array<{ tipo: string; mensaje: string; nivel: 'info' | 'aviso' | 'urgente' }>
  mesesComparativos: Array<{ etiqueta: string; ingresos: number; egresos: number; utilidad: number }>
}

/** Tasa más reciente registrada en un cierre; sirve para totalizar bolívares. */
async function tasaMasReciente(empresaId: string): Promise<number> {
  const ultimo = await db.restCierreDiario.findFirst({
    where: { empresaId, tasa: { gt: 0 } },
    orderBy: { fecha: 'desc' },
    select: { tasa: true },
  })
  return ultimo?.tasa || 0
}

export async function construirPanel(
  empresaId: string,
  ano: number,
  mes: number,
): Promise<PanelRestaurante> {
  const { desde, hasta } = rangoMes(ano, mes)
  const tasaActual = await tasaMasReciente(empresaId)

  const [cierres, gastos, fondos, notas, cobrar] = await Promise.all([
    db.restCierreDiario.findMany({
      where: { empresaId, fecha: { gte: desde, lte: hasta } },
      orderBy: { fecha: 'asc' },
    }),
    db.restGasto.findMany({
      where: { empresaId, fecha: { gte: desde, lte: hasta } },
      include: { proveedor: { select: { nombre: true } } },
    }),
    saldosDeFondos(empresaId, tasaActual),
    db.restNotaProveedor.findMany({
      where: { empresaId, estado: { in: ['PENDIENTE', 'ABONADA'] } },
      include: { proveedor: { select: { nombre: true } } },
    }),
    db.restCuentaCobrar.findMany({
      where: { empresaId, estado: { in: ['PENDIENTE', 'ABONADA'] } },
    }),
  ])

  const egresosUSD = redondear(gastos.reduce((a, g) => a + (g.montoUSD || 0), 0))
  const resumen = calcularResumenMes(cierres, egresosUSD)

  // Serie diaria: se recorre el mes completo para que los días sin registro
  // aparezcan en cero y el gráfico no "salte" fechas.
  const ingresosPorDia = new Map<string, { ingresos: number; ventas: number }>()
  cierres.forEach((c) => {
    ingresosPorDia.set(claveDia(c.fecha), { ingresos: c.totalUSD || 0, ventas: c.numVentas || 0 })
  })
  const egresosPorDia = new Map<string, number>()
  gastos.forEach((g) => {
    const k = claveDia(g.fecha)
    egresosPorDia.set(k, redondear((egresosPorDia.get(k) || 0) + (g.montoUSD || 0)))
  })

  const serieDiaria: PuntoSerieDia[] = []
  const diasDelMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
  for (let d = 1; d <= diasDelMes; d++) {
    const clave = new Date(Date.UTC(ano, mes - 1, d)).toISOString().slice(0, 10)
    const entrada = ingresosPorDia.get(clave)
    serieDiaria.push({
      fecha: clave,
      ingresos: redondear(entrada?.ingresos || 0),
      egresos: redondear(egresosPorDia.get(clave) || 0),
      ventas: entrada?.ventas || 0,
    })
  }

  const porCategoria = new Map<string, number>()
  gastos.forEach((g) => {
    porCategoria.set(g.categoria, redondear((porCategoria.get(g.categoria) || 0) + (g.montoUSD || 0)))
  })
  const egresosPorCategoria = Array.from(porCategoria.entries())
    .map(([categoria, monto]) => ({ categoria, label: etiquetaCategoria(categoria), monto }))
    .sort((a, b) => b.monto - a.monto)

  const porProveedor = new Map<string, number>()
  gastos.forEach((g) => {
    if (!g.proveedor?.nombre) return
    porProveedor.set(
      g.proveedor.nombre,
      redondear((porProveedor.get(g.proveedor.nombre) || 0) + (g.montoUSD || 0)),
    )
  })
  const topProveedores = Array.from(porProveedor.entries())
    .map(([nombre, monto]) => ({ nombre, monto }))
    .sort((a, b) => b.monto - a.monto)
    .slice(0, 5)

  const saldosNotas = notas.map((n) => ({
    fecha: n.fecha,
    saldo: saldoDeuda(n.montoUSD, n.montoPagado),
  }))
  const totalPorPagar = redondear(saldosNotas.reduce((a, n) => a + n.saldo, 0))
  const totalPorCobrar = redondear(
    cobrar.reduce((a, c) => a + saldoDeuda(c.montoUSD, c.montoCobrado), 0),
  )

  const totalEnCajaUSD = redondear(fondos.reduce((a, f) => a + (f.saldoUSD || 0), 0))

  return {
    mes,
    ano,
    tasaActual,
    resumen,
    serieDiaria,
    egresosPorCategoria,
    fondos,
    totalEnCajaUSD,
    porPagar: {
      total: totalPorPagar,
      cantidad: notas.length,
      antiguedad: agruparPorAntiguedad(saldosNotas),
    },
    porCobrar: { total: totalPorCobrar, cantidad: cobrar.length },
    topProveedores,
    alertas: await construirAlertas(empresaId, ano, mes, cierres.length, saldosNotas),
    mesesComparativos: await comparativoMeses(empresaId, ano, mes),
  }
}

/**
 * Avisos accionables. La idea es que el sistema le diga al usuario qué le
 * falta hacer en vez de que él tenga que acordarse.
 */
async function construirAlertas(
  empresaId: string,
  ano: number,
  mes: number,
  cierresRegistrados: number,
  saldosNotas: Array<{ fecha: Date; saldo: number }>,
): Promise<PanelRestaurante['alertas']> {
  const alertas: PanelRestaurante['alertas'] = []
  const hoy = new Date()
  const esMesEnCurso = hoy.getUTCFullYear() === ano && hoy.getUTCMonth() + 1 === mes

  if (esMesEnCurso) {
    const diaDeHoy = hoy.getUTCDate()
    const faltantes = diaDeHoy - cierresRegistrados
    if (faltantes > 0) {
      alertas.push({
        tipo: 'CIERRES',
        mensaje: faltantes === 1
          ? 'Falta registrar el cierre de 1 día de este mes'
          : `Faltan ${faltantes} días de este mes por registrar`,
        nivel: faltantes > 3 ? 'urgente' : 'aviso',
      })
    }
  }

  const antiguas = saldosNotas.filter((n) => {
    const dias = Math.round((Date.now() - n.fecha.getTime()) / 86400000)
    return dias > 30
  })
  if (antiguas.length) {
    const monto = redondear(antiguas.reduce((a, n) => a + n.saldo, 0))
    alertas.push({
      tipo: 'CXP',
      mensaje: `${antiguas.length} nota(s) de proveedor con más de 30 días sin pagar ($${monto.toFixed(2)})`,
      nivel: 'urgente',
    })
  }

  const fijosDelMes = await db.restGasto.count({
    where: {
      empresaId,
      categoria: 'GASTO_FIJO',
      fecha: { gte: rangoMes(ano, mes).desde, lte: rangoMes(ano, mes).hasta },
    },
  })
  const fijosActivos = await db.restGastoFijo.count({ where: { empresaId, activo: true } })
  if (fijosActivos > 0 && fijosDelMes === 0) {
    alertas.push({
      tipo: 'GASTOS_FIJOS',
      mensaje: 'Los gastos fijos de este mes todavía no se han generado',
      nivel: 'aviso',
    })
  }

  return alertas
}

/** Últimos 6 meses de ingresos vs egresos, para ver la tendencia del negocio. */
async function comparativoMeses(empresaId: string, ano: number, mes: number) {
  const meses: Array<{ etiqueta: string; ingresos: number; egresos: number; utilidad: number }> = []
  const NOMBRES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

  for (let i = 5; i >= 0; i--) {
    const ref = new Date(Date.UTC(ano, mes - 1 - i, 1))
    const a = ref.getUTCFullYear()
    const m = ref.getUTCMonth() + 1
    const { desde, hasta } = rangoMes(a, m)
    const [ing, egr] = await Promise.all([
      db.restCierreDiario.aggregate({
        where: { empresaId, fecha: { gte: desde, lte: hasta } },
        _sum: { totalUSD: true },
      }),
      db.restGasto.aggregate({
        where: { empresaId, fecha: { gte: desde, lte: hasta } },
        _sum: { montoUSD: true },
      }),
    ])
    const ingresos = redondear(ing._sum.totalUSD || 0)
    const egresos = redondear(egr._sum.montoUSD || 0)
    meses.push({
      etiqueta: `${NOMBRES[m - 1]} ${String(a).slice(2)}`,
      ingresos,
      egresos,
      utilidad: redondear(ingresos - egresos),
    })
  }
  return meses
}
