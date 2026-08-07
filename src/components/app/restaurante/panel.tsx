'use client'
// Panel del negocio: la pantalla que se abre cada mañana.
//
// Responde en un vistazo las cuatro preguntas del dueño: cuánto entró este
// mes, cuánto salió, cuánto queda en cada caja y a quién le debo. Arriba van
// los avisos de lo que falta hacer, para no tener que acordarse.

import { useCallback, useEffect, useState } from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { apiFetch } from '@/lib/store'
import { formatoBs, formatoUSD } from '@/lib/restaurante/calculos'
import {
  ArrowDownRight, ArrowUpRight, Banknote, CalendarCheck, HandCoins,
  PiggyBank, TrendingUp, Wallet, AlertCircle,
} from 'lucide-react'
import { Cargando, Cifra, Encabezado, MESES, Pastilla, SelectorMes, SinDatos, TarjetaSuave, tono } from './ui'
import { cn } from '@/lib/utils'

interface PanelData {
  mes: number
  ano: number
  tasaActual: number
  resumen: {
    ingresos: number; egresos: number; utilidad: number; margen: number
    diasTrabajados: number; ventasTotales: number; ticketPromedio: number; ventaPromedioDia: number
  }
  serieDiaria: Array<{ fecha: string; ingresos: number; egresos: number; ventas: number }>
  egresosPorCategoria: Array<{ categoria: string; label: string; monto: number }>
  fondos: Array<{ id: string; nombre: string; moneda: string; color: string; saldo: number; saldoUSD: number }>
  totalEnCajaUSD: number
  porPagar: { total: number; cantidad: number; antiguedad: Record<string, number> }
  porCobrar: { total: number; cantidad: number }
  topProveedores: Array<{ nombre: string; monto: number }>
  alertas: Array<{ tipo: string; mensaje: string; nivel: 'info' | 'aviso' | 'urgente' }>
  mesesComparativos: Array<{ etiqueta: string; ingresos: number; egresos: number; utilidad: number }>
}

const COLOR_INGRESO = '#34d399' // emerald-400
const COLOR_EGRESO = '#fb7185' // rose-400

export function RestaurantePanel({ onIrACierre }: { onIrACierre?: () => void }) {
  const hoy = new Date()
  const [ano, setAno] = useState(hoy.getUTCFullYear())
  const [mes, setMes] = useState(hoy.getUTCMonth() + 1)
  const [panel, setPanel] = useState<PanelData | null>(null)
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    setCargando(true)
    const r = await apiFetch<{ panel: PanelData }>(`/api/restaurante/panel?ano=${ano}&mes=${mes}`)
    if (r.ok && r.data) setPanel(r.data.panel)
    setCargando(false)
  }, [ano, mes])

  useEffect(() => { cargar() }, [cargar])

  if (cargando && !panel) return <Cargando texto="Preparando tu panel…" />
  if (!panel) return <SinDatos mensaje="No se pudo cargar el panel" sugerencia="Revisa que tengas una empresa activa seleccionada" />

  const { resumen } = panel
  const utilidadPositiva = resumen.utilidad >= 0

  // El gráfico diario solo muestra hasta el último día con algún registro,
  // para que un mes en curso no se vea como una caída a cero.
  const ultimoConDatos = panel.serieDiaria.reduce(
    (ultimo, d, i) => (d.ingresos > 0 || d.egresos > 0 ? i : ultimo), -1,
  )
  const serie = ultimoConDatos >= 0
    ? panel.serieDiaria.slice(0, ultimoConDatos + 1).map((d) => ({ ...d, dia: Number(d.fecha.slice(8, 10)) }))
    : []

  const maxCategoria = Math.max(1, ...panel.egresosPorCategoria.map((c) => c.monto))

  return (
    <div className="space-y-5">
      <Encabezado
        titulo="Panel del negocio"
        subtitulo={`Cómo va ${MESES[panel.mes - 1]} de ${panel.ano}`}
        icono={<TrendingUp className="w-5 h-5" />}
        color="emerald"
        acciones={<SelectorMes ano={ano} mes={mes} onChange={(a, m) => { setAno(a); setMes(m) }} />}
      />

      {panel.alertas.length > 0 && (
        <div className="space-y-2">
          {panel.alertas.map((a, i) => {
            const color = a.nivel === 'urgente' ? 'rose' : a.nivel === 'aviso' ? 'amber' : 'sky'
            const t = tono(color)
            return (
              <div key={i} className={cn('rounded-2xl border px-4 py-3 flex items-center gap-3 text-sm', t.suave, t.borde, t.texto)}>
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="flex-1">{a.mensaje}</span>
                {a.tipo === 'CIERRES' && onIrACierre && (
                  <button onClick={onIrACierre} className="text-xs font-medium underline underline-offset-2 shrink-0">
                    Registrar día
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Las cuatro cifras del mes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Cifra
          etiqueta="Entró este mes" color="emerald" icono={<ArrowUpRight className="w-4 h-4" />}
          valor={formatoUSD(resumen.ingresos)}
          detalle={`${resumen.diasTrabajados} día(s) trabajado(s)`}
        />
        <Cifra
          etiqueta="Salió este mes" color="rose" icono={<ArrowDownRight className="w-4 h-4" />}
          valor={formatoUSD(resumen.egresos)}
          detalle={`${panel.egresosPorCategoria.length} categoría(s) de gasto`}
        />
        <Cifra
          etiqueta={utilidadPositiva ? 'Ganancia' : 'Pérdida'}
          color={utilidadPositiva ? 'teal' : 'orange'}
          icono={<PiggyBank className="w-4 h-4" />}
          valor={formatoUSD(Math.abs(resumen.utilidad))}
          detalle={`Margen ${resumen.margen}%`}
        />
        <Cifra
          etiqueta="Dinero disponible" color="violet" icono={<Wallet className="w-4 h-4" />}
          valor={formatoUSD(panel.totalEnCajaUSD)}
          detalle={panel.tasaActual > 0 ? `Bs. convertidos a ${panel.tasaActual.toFixed(2)}` : 'Suma de todas las cajas'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Movimiento diario */}
        <TarjetaSuave className="lg:col-span-2">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Día a día</h3>
            <span className="text-xs text-slate-400">Ventas contra gastos, en dólares</span>
          </div>
          {serie.length === 0 ? (
            <SinDatos mensaje="Todavía no hay días registrados en este mes" sugerencia="Empieza por el cierre del día en la pestaña “Cierre del día”" />
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={serie} margin={{ left: -18, right: 6, top: 4 }}>
                <defs>
                  <linearGradient id="gIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLOR_INGRESO} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={COLOR_INGRESO} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gEgresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLOR_EGRESO} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={COLOR_EGRESO} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="3 3" />
                <XAxis dataKey="dia" tickLine={false} axisLine={false} fontSize={11} tickMargin={6} stroke="currentColor" className="text-slate-400" />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={54} stroke="currentColor" className="text-slate-400" tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(valor: number, nombre) => [formatoUSD(valor), nombre === 'ingresos' ? 'Ventas' : 'Gastos']}
                  labelFormatter={(d) => `Día ${d}`}
                  contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Area type="monotone" dataKey="ingresos" stroke={COLOR_INGRESO} strokeWidth={2} fill="url(#gIngresos)" />
                <Area type="monotone" dataKey="egresos" stroke={COLOR_EGRESO} strokeWidth={2} fill="url(#gEgresos)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </TarjetaSuave>

        {/* Cajas */}
        <TarjetaSuave>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Tus cajas</h3>
          <div className="space-y-2">
            {panel.fondos.length === 0 ? (
              <SinDatos mensaje="Aún no hay cajas configuradas" />
            ) : panel.fondos.map((f) => {
              const t = tono(f.color)
              return (
                <div key={f.id} className={cn('flex items-center justify-between rounded-xl px-3 py-2.5', t.suave)}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn('w-2 h-2 rounded-full shrink-0', t.punto)} />
                    <span className="text-sm text-slate-600 dark:text-slate-300 truncate">{f.nombre}</span>
                  </div>
                  <span className={cn('text-sm font-semibold tabular-nums shrink-0', t.texto)}>
                    {f.moneda === 'VES' ? formatoBs(f.saldo) : formatoUSD(f.saldo)}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">Total en dólares</span>
            <span className="text-base font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
              {formatoUSD(panel.totalEnCajaUSD)}
            </span>
          </div>
        </TarjetaSuave>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* En qué se va la plata */}
        <TarjetaSuave className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">¿En qué se va la plata?</h3>
          {panel.egresosPorCategoria.length === 0 ? (
            <SinDatos mensaje="No hay gastos registrados este mes" />
          ) : (
            <div className="space-y-2.5">
              {panel.egresosPorCategoria.map((c) => (
                <div key={c.categoria}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 dark:text-slate-300">{c.label}</span>
                    <span className="text-slate-500 dark:text-slate-400 tabular-nums">{formatoUSD(c.monto)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-300 to-rose-400 dark:from-rose-700 dark:to-rose-500"
                      style={{ width: `${Math.max(3, (c.monto / maxCategoria) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </TarjetaSuave>

        {/* Deudas */}
        <div className="space-y-4">
          <Cifra
            etiqueta="Le debo a proveedores" color="rose" icono={<HandCoins className="w-4 h-4" />}
            valor={formatoUSD(panel.porPagar.total)}
            detalle={`${panel.porPagar.cantidad} nota(s) sin pagar`}
          />
          <Cifra
            etiqueta="Me deben (fiados)" color="amber" icono={<Banknote className="w-4 h-4" />}
            valor={formatoUSD(panel.porCobrar.total)}
            detalle={`${panel.porCobrar.cantidad} cuenta(s) por cobrar`}
          />
          <TarjetaSuave>
            <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">Antigüedad de lo que debo</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(panel.porPagar.antiguedad).map(([tramo, monto]) => (
                <div key={tramo} className="rounded-xl bg-slate-50 dark:bg-slate-800/60 px-2.5 py-2">
                  <div className="text-[10px] text-slate-400">{tramo} días</div>
                  <div className="text-sm font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
                    {formatoUSD(monto)}
                  </div>
                </div>
              ))}
            </div>
          </TarjetaSuave>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tendencia */}
        <TarjetaSuave className="lg:col-span-2">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Últimos 6 meses</h3>
            <span className="text-xs text-slate-400">Ventas contra gastos</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={panel.mesesComparativos} margin={{ left: -18, right: 6, top: 4 }}>
              <CartesianGrid vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="3 3" />
              <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} fontSize={11} tickMargin={6} stroke="currentColor" className="text-slate-400" />
              <YAxis tickLine={false} axisLine={false} fontSize={11} width={54} stroke="currentColor" className="text-slate-400" tickFormatter={(v) => `$${v}`} />
              <Tooltip
                formatter={(valor: number, nombre) => [formatoUSD(valor), nombre === 'ingresos' ? 'Ventas' : 'Gastos']}
                contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <Legend formatter={(v) => (v === 'ingresos' ? 'Ventas' : 'Gastos')} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="ingresos" fill={COLOR_INGRESO} radius={[6, 6, 0, 0]} />
              <Bar dataKey="egresos" fill={COLOR_EGRESO} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </TarjetaSuave>

        <div className="space-y-4">
          <TarjetaSuave>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Cómo se vendió</h3>
            <div className="space-y-2 text-sm">
              <FilaDato etiqueta="Ventas del mes" valor={String(resumen.ventasTotales)} />
              <FilaDato etiqueta="Ticket promedio" valor={formatoUSD(resumen.ticketPromedio)} />
              <FilaDato etiqueta="Promedio por día" valor={formatoUSD(resumen.ventaPromedioDia)} />
              <FilaDato etiqueta="Días trabajados" valor={String(resumen.diasTrabajados)} />
            </div>
          </TarjetaSuave>

          <TarjetaSuave>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Mayores proveedores</h3>
            {panel.topProveedores.length === 0 ? (
              <SinDatos mensaje="Sin pagos a proveedores este mes" />
            ) : (
              <div className="space-y-2">
                {panel.topProveedores.map((p) => (
                  <div key={p.nombre} className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-300 truncate pr-2">{p.nombre}</span>
                    <span className="text-slate-500 dark:text-slate-400 tabular-nums shrink-0">{formatoUSD(p.monto)}</span>
                  </div>
                ))}
              </div>
            )}
          </TarjetaSuave>
        </div>
      </div>

      {panel.tasaActual > 0 && (
        <div className="flex justify-center">
          <Pastilla color="sky">
            <CalendarCheck className="w-3 h-3" />
            Última tasa registrada: Bs. {panel.tasaActual.toFixed(2)} por dólar
          </Pastilla>
        </div>
      )}
    </div>
  )
}

function FilaDato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500 dark:text-slate-400">{etiqueta}</span>
      <span className="font-medium text-slate-700 dark:text-slate-200 tabular-nums">{valor}</span>
    </div>
  )
}
