'use client'
// Configuración del negocio: equipo, gastos fijos y cajas.
//
// Son las tres cosas que se definen una vez y luego el sistema usa solas: el
// equipo alimenta la nómina semanal, los gastos fijos se generan de un clic
// cada mes, y las cajas reciben automáticamente lo que entra y lo que sale.

import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '@/lib/store'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatoBs, formatoUSD } from '@/lib/restaurante/calculos'
import { CARGOS_PERSONAL, TIPOS_FONDO, ROLES_CIERRE } from '@/lib/restaurante/categorias'
import { CalendarClock, Loader2, Plus, Settings, Sparkles, Trash2, Users, Wallet } from 'lucide-react'
import { Cargando, Cifra, Encabezado, MESES, Pastilla, SinDatos, TarjetaSuave, tono } from './ui'
import { cn } from '@/lib/utils'

interface Persona {
  id: string; nombre: string; cargo: string | null
  pagoBaseSemanal: number; recibePropina: boolean; activo: boolean
}
interface GastoFijo {
  id: string; nombre: string; montoUSD: number; diaVencimiento: number; activo: boolean
}
interface Fondo {
  id: string; nombre: string; tipo: string; moneda: string; color: string
  saldo: number; saldoInicial: number; rolCierre: string | null
}

type Pestana = 'equipo' | 'fijos' | 'cajas'

export function RestauranteConfiguracion() {
  const [pestana, setPestana] = useState<Pestana>('equipo')
  const [personal, setPersonal] = useState<Persona[]>([])
  const [nominaSemanal, setNominaSemanal] = useState(0)
  const [fijos, setFijos] = useState<GastoFijo[]>([])
  const [totalFijos, setTotalFijos] = useState(0)
  const [fondos, setFondos] = useState<Fondo[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const [formPersona, setFormPersona] = useState({ nombre: '', cargo: 'COCINA', pagoBaseSemanal: '', recibePropina: true })
  const [formFijo, setFormFijo] = useState({ nombre: '', montoUSD: '', diaVencimiento: '5' })
  const [formFondo, setFormFondo] = useState({ nombre: '', tipo: 'EFECTIVO', moneda: 'USD', saldoInicial: '' })

  const hoy = new Date()
  const [genAno, setGenAno] = useState(hoy.getUTCFullYear())
  const [genMes, setGenMes] = useState(hoy.getUTCMonth() + 1)
  const [genFondo, setGenFondo] = useState('')
  const [genTasa, setGenTasa] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    const [p, g, f] = await Promise.all([
      apiFetch<{ personal: Persona[]; nominaSemanal: number }>('/api/restaurante/personal'),
      apiFetch<{ fijos: GastoFijo[]; totalMensual: number }>('/api/restaurante/gastos-fijos'),
      apiFetch<{ fondos: Fondo[] }>('/api/restaurante/fondos'),
    ])
    if (p.ok && p.data) { setPersonal(p.data.personal); setNominaSemanal(p.data.nominaSemanal) }
    if (g.ok && g.data) { setFijos(g.data.fijos); setTotalFijos(g.data.totalMensual) }
    if (f.ok && f.data) {
      setFondos(f.data.fondos)
      setGenFondo((prev) => prev || f.data!.fondos[0]?.id || '')
    }
    setCargando(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function cargaRapida() {
    if (!confirm('Se cargarán los proveedores más comunes y las plantillas de gastos fijos. No se borra nada de lo que ya tengas. ¿Continuar?')) return
    setGuardando(true)
    const r = await apiFetch<{ resultado: { proveedores: number; gastosFijos: number } }>(
      '/api/restaurante/setup', { method: 'POST' },
    )
    setGuardando(false)
    if (r.ok && r.data) {
      const { proveedores, gastosFijos } = r.data.resultado
      toast.success(`Listo: ${proveedores} proveedor(es) y ${gastosFijos} gasto(s) fijo(s) agregados`)
      cargar()
    } else toast.error(r.error || 'No se pudo hacer la carga inicial')
  }

  // ── Equipo ──────────────────────────────────────────────────────────
  async function agregarPersona() {
    if (!formPersona.nombre) { toast.error('Escribe el nombre'); return }
    setGuardando(true)
    const r = await apiFetch('/api/restaurante/personal', { method: 'POST', body: JSON.stringify(formPersona) })
    setGuardando(false)
    if (r.ok) {
      toast.success('Persona agregada')
      setFormPersona({ nombre: '', cargo: 'COCINA', pagoBaseSemanal: '', recibePropina: true })
      cargar()
    } else toast.error(r.error || 'No se pudo agregar')
  }

  async function actualizarPersona(id: string, cambios: Record<string, unknown>) {
    const r = await apiFetch('/api/restaurante/personal', { method: 'PATCH', body: JSON.stringify({ id, ...cambios }) })
    if (r.ok) cargar()
    else toast.error(r.error || 'No se pudo actualizar')
  }

  // ── Gastos fijos ────────────────────────────────────────────────────
  async function agregarFijo() {
    if (!formFijo.nombre || !formFijo.montoUSD) { toast.error('Escribe el nombre y el monto'); return }
    setGuardando(true)
    const r = await apiFetch('/api/restaurante/gastos-fijos', { method: 'POST', body: JSON.stringify(formFijo) })
    setGuardando(false)
    if (r.ok) {
      toast.success('Gasto fijo agregado')
      setFormFijo({ nombre: '', montoUSD: '', diaVencimiento: '5' })
      cargar()
    } else toast.error(r.error || 'No se pudo agregar')
  }

  async function actualizarFijo(id: string, cambios: Record<string, unknown>) {
    const r = await apiFetch('/api/restaurante/gastos-fijos', { method: 'PATCH', body: JSON.stringify({ id, ...cambios }) })
    if (r.ok) cargar()
    else toast.error(r.error || 'No se pudo actualizar')
  }

  async function borrarFijo(f: GastoFijo) {
    if (!confirm(`¿Quitar "${f.nombre}" de los gastos fijos? Los gastos ya generados no se borran.`)) return
    const r = await apiFetch(`/api/restaurante/gastos-fijos?id=${f.id}`, { method: 'DELETE' })
    if (r.ok) { toast.success('Quitado'); cargar() }
    else toast.error(r.error || 'No se pudo quitar')
  }

  async function generarDelMes() {
    if (!genFondo) { toast.error('Elige de cuál caja se pagan'); return }
    setGuardando(true)
    const r = await apiFetch<{ creados: string[]; omitidos: string[] }>(
      '/api/restaurante/gastos-fijos/generar',
      { method: 'POST', body: JSON.stringify({ ano: genAno, mes: genMes, fondoId: genFondo, tasa: genTasa || 0 }) },
    )
    setGuardando(false)
    if (r.ok && r.data) {
      const { creados, omitidos } = r.data
      if (creados.length === 0) toast.info(`Ya estaban todos cargados en ${MESES[genMes - 1]}`)
      else toast.success(`${creados.length} gasto(s) generado(s)${omitidos.length ? `, ${omitidos.length} ya estaban` : ''}`)
    } else toast.error(r.error || 'No se pudieron generar')
  }

  // ── Cajas ───────────────────────────────────────────────────────────
  async function agregarFondo() {
    if (!formFondo.nombre) { toast.error('Escribe el nombre de la caja'); return }
    setGuardando(true)
    const r = await apiFetch('/api/restaurante/fondos', { method: 'POST', body: JSON.stringify(formFondo) })
    setGuardando(false)
    if (r.ok) {
      toast.success('Caja agregada')
      setFormFondo({ nombre: '', tipo: 'EFECTIVO', moneda: 'USD', saldoInicial: '' })
      cargar()
    } else toast.error(r.error || 'No se pudo agregar')
  }

  const entrada = 'h-9 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-700 dark:text-slate-200'
  const activos = personal.filter((p) => p.activo)

  const PESTANAS: Array<{ key: Pestana; label: string; icono: React.ReactNode }> = [
    { key: 'equipo', label: 'Equipo', icono: <Users className="w-4 h-4" /> },
    { key: 'fijos', label: 'Gastos fijos', icono: <CalendarClock className="w-4 h-4" /> },
    { key: 'cajas', label: 'Cajas', icono: <Wallet className="w-4 h-4" /> },
  ]

  return (
    <div className="space-y-5">
      <Encabezado
        titulo="Configuración del negocio"
        subtitulo="Lo que se define una vez: tu equipo, tus gastos fijos y tus cajas."
        icono={<Settings className="w-5 h-5" />}
        color="sky"
        acciones={
          <Button variant="outline" onClick={cargaRapida} disabled={guardando} className="rounded-xl">
            <Sparkles className="w-4 h-4 mr-1" /> Carga rápida
          </Button>
        }
      />

      <div className="flex gap-1.5 flex-wrap">
        {PESTANAS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPestana(p.key)}
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors',
              pestana === p.key
                ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
            )}
          >
            {p.icono}{p.label}
          </button>
        ))}
      </div>

      {cargando ? <Cargando /> : pestana === 'equipo' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Cifra etiqueta="En el equipo" valor={String(activos.length)} color="violet" />
            <Cifra etiqueta="Base semanal" valor={formatoUSD(nominaSemanal)} color="indigo" detalle="Sin propinas ni transporte" />
            <Cifra etiqueta="Al mes (aprox.)" valor={formatoUSD(nominaSemanal * 4)} color="slate" />
          </div>

          <TarjetaSuave className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Agregar a alguien</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Nombre</Label>
                <Input value={formPersona.nombre} onChange={(e) => setFormPersona({ ...formPersona, nombre: e.target.value })} className="rounded-xl mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Cargo</Label>
                <select className={`${entrada} mt-1`} value={formPersona.cargo} onChange={(e) => setFormPersona({ ...formPersona, cargo: e.target.value })}>
                  {CARGOS_PERSONAL.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Base semanal ($)</Label>
                <Input type="number" inputMode="decimal" step="0.01" placeholder="0.00" value={formPersona.pagoBaseSemanal} onChange={(e) => setFormPersona({ ...formPersona, pagoBaseSemanal: e.target.value })} className="rounded-xl mt-1 tabular-nums" />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-1.5 text-xs text-slate-500 h-9 cursor-pointer">
                  <input type="checkbox" checked={formPersona.recibePropina} onChange={(e) => setFormPersona({ ...formPersona, recibePropina: e.target.checked })} className="rounded" />
                  Recibe propina
                </label>
                <Button onClick={agregarPersona} disabled={guardando} className="rounded-xl">
                  {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </TarjetaSuave>

          <TarjetaSuave className="p-0 overflow-hidden">
            {personal.length === 0 ? (
              <SinDatos mensaje="Todavía no has registrado a nadie" sugerencia="Agrega a tu equipo para que la nómina semanal se arme sola" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/40">
                      <th className="px-4 py-2.5 font-medium">Nombre</th>
                      <th className="px-3 py-2.5 font-medium">Cargo</th>
                      <th className="px-3 py-2.5 font-medium text-right">Base semanal</th>
                      <th className="px-3 py-2.5 font-medium text-center">Propina</th>
                      <th className="px-3 py-2.5 font-medium text-center">Activo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personal.map((p) => (
                      <tr key={p.id} className={cn('border-t border-slate-50 dark:border-slate-800/60', !p.activo && 'opacity-50')}>
                        <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{p.nombre}</td>
                        <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                          {CARGOS_PERSONAL.find((c) => c.key === p.cargo)?.label || p.cargo || '—'}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number" step="0.01" defaultValue={p.pagoBaseSemanal || ''}
                            onBlur={(e) => {
                              const valor = Number(e.target.value) || 0
                              if (valor !== p.pagoBaseSemanal) actualizarPersona(p.id, { pagoBaseSemanal: valor })
                            }}
                            className="w-24 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-right text-sm tabular-nums text-slate-700 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input type="checkbox" checked={p.recibePropina} onChange={(e) => actualizarPersona(p.id, { recibePropina: e.target.checked })} className="rounded" />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input type="checkbox" checked={p.activo} onChange={(e) => actualizarPersona(p.id, { activo: e.target.checked })} className="rounded" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TarjetaSuave>
        </div>
      ) : pestana === 'fijos' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Cifra etiqueta="Gastos fijos activos" valor={String(fijos.filter((f) => f.activo).length)} color="indigo" />
            <Cifra etiqueta="Total al mes" valor={formatoUSD(totalFijos)} color="rose" />
            <Cifra etiqueta="Al año" valor={formatoUSD(totalFijos * 12)} color="slate" />
          </div>

          <TarjetaSuave color="emerald" className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Generar los gastos fijos del mes</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Los carga de una vez como gastos reales. Si ya estaban cargados, no se duplican.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Mes</Label>
                <select className={`${entrada} mt-1`} value={genMes} onChange={(e) => setGenMes(Number(e.target.value))}>
                  {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Año</Label>
                <Input type="number" value={genAno} onChange={(e) => setGenAno(Number(e.target.value))} className="rounded-xl mt-1 tabular-nums" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs text-slate-500">¿De cuál caja se pagan?</Label>
                <select className={`${entrada} mt-1`} value={genFondo} onChange={(e) => setGenFondo(e.target.value)}>
                  {fondos.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <Button onClick={generarDelMes} disabled={guardando} className="rounded-xl w-full">
                  {guardando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Generar
                </Button>
              </div>
            </div>
          </TarjetaSuave>

          <TarjetaSuave className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Agregar un gasto fijo</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs text-slate-500">Nombre</Label>
                <Input placeholder="Ej: Alquiler, Internet" value={formFijo.nombre} onChange={(e) => setFormFijo({ ...formFijo, nombre: e.target.value })} className="rounded-xl mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Monto al mes ($)</Label>
                <Input type="number" inputMode="decimal" step="0.01" placeholder="0.00" value={formFijo.montoUSD} onChange={(e) => setFormFijo({ ...formFijo, montoUSD: e.target.value })} className="rounded-xl mt-1 tabular-nums" />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label className="text-xs text-slate-500">Día de pago</Label>
                  <Input type="number" min={1} max={28} value={formFijo.diaVencimiento} onChange={(e) => setFormFijo({ ...formFijo, diaVencimiento: e.target.value })} className="rounded-xl mt-1 tabular-nums" />
                </div>
                <Button onClick={agregarFijo} disabled={guardando} className="rounded-xl">
                  {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </TarjetaSuave>

          <TarjetaSuave className="p-0 overflow-hidden">
            {fijos.length === 0 ? (
              <SinDatos mensaje="No tienes gastos fijos configurados" sugerencia="Usa “Carga rápida” para traer los más comunes y ponerles tu monto" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/40">
                      <th className="px-4 py-2.5 font-medium">Gasto</th>
                      <th className="px-3 py-2.5 font-medium text-right">Monto al mes</th>
                      <th className="px-3 py-2.5 font-medium text-center">Día</th>
                      <th className="px-3 py-2.5 font-medium text-center">Activo</th>
                      <th className="px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {fijos.map((f) => (
                      <tr key={f.id} className={cn('border-t border-slate-50 dark:border-slate-800/60', !f.activo && 'opacity-50')}>
                        <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{f.nombre}</td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number" step="0.01" defaultValue={f.montoUSD || ''}
                            onBlur={(e) => {
                              const valor = Number(e.target.value) || 0
                              if (valor !== f.montoUSD) actualizarFijo(f.id, { montoUSD: valor })
                            }}
                            className="w-24 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-right text-sm tabular-nums text-slate-700 dark:text-slate-200"
                          />
                        </td>
                        <td className="px-3 py-2 text-center text-slate-500">{f.diaVencimiento}</td>
                        <td className="px-3 py-2 text-center">
                          <input type="checkbox" checked={f.activo} onChange={(e) => actualizarFijo(f.id, { activo: e.target.checked })} className="rounded" />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => borrarFijo(f)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TarjetaSuave>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fondos.map((f) => {
              const t = tono(f.color)
              const rol = ROLES_CIERRE.find((r) => r.rol === f.rolCierre)
              return (
                <div key={f.id} className={cn('rounded-2xl border p-4', t.suave, t.borde)}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{f.nombre}</span>
                    <Pastilla color={f.color}>{f.moneda}</Pastilla>
                  </div>
                  <div className={cn('text-2xl font-semibold tabular-nums mt-2', t.texto)}>
                    {f.moneda === 'VES' ? formatoBs(f.saldo) : formatoUSD(f.saldo)}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {rol ? `Recibe automáticamente: ${rol.label}` : 'Solo movimientos manuales'}
                  </p>
                </div>
              )
            })}
          </div>

          <TarjetaSuave className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Agregar una caja</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Nombre</Label>
                <Input placeholder="Ej: Banesco Bs." value={formFondo.nombre} onChange={(e) => setFormFondo({ ...formFondo, nombre: e.target.value })} className="rounded-xl mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Tipo</Label>
                <select className={`${entrada} mt-1`} value={formFondo.tipo} onChange={(e) => setFormFondo({ ...formFondo, tipo: e.target.value })}>
                  {TIPOS_FONDO.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Moneda</Label>
                <select className={`${entrada} mt-1`} value={formFondo.moneda} onChange={(e) => setFormFondo({ ...formFondo, moneda: e.target.value })}>
                  <option value="USD">Dólares</option>
                  <option value="VES">Bolívares</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label className="text-xs text-slate-500">Saldo inicial</Label>
                  <Input type="number" inputMode="decimal" step="0.01" placeholder="0.00" value={formFondo.saldoInicial} onChange={(e) => setFormFondo({ ...formFondo, saldoInicial: e.target.value })} className="rounded-xl mt-1 tabular-nums" />
                </div>
                <Button onClick={agregarFondo} disabled={guardando} className="rounded-xl">
                  {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </TarjetaSuave>
        </div>
      )}
    </div>
  )
}
