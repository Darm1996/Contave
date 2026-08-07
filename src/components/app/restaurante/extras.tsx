'use client'
// Lo que sale sin generar venta: cortesías, producto dañado, comida del
// personal y préstamos a otra sede.
//
// Cada cosa por separado parece pequeña; juntas y valorizadas es donde se
// va parte del margen del mes, y esa es justamente la cifra que el Excel no
// dejaba ver de un vistazo.

import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '@/lib/store'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatoUSD } from '@/lib/restaurante/calculos'
import { TIPOS_INCIDENCIA } from '@/lib/restaurante/categorias'
import { Gift, Loader2, Plus, Trash2 } from 'lucide-react'
import { Cargando, Cifra, Encabezado, Pastilla, SelectorMes, SinDatos, TarjetaSuave, fechaLegible, hoyISO } from './ui'

interface Incidencia {
  id: string; fecha: string; tipo: string; descripcion: string
  cantidad: number; montoUSD: number; referencia: string | null
}
interface ResumenTipo { tipo: string; label: string; color: string; monto: number; cantidad: number }

export function RestauranteExtras() {
  const hoy = new Date()
  const [ano, setAno] = useState(hoy.getUTCFullYear())
  const [mes, setMes] = useState(hoy.getUTCMonth() + 1)
  const [incidencias, setIncidencias] = useState<Incidencia[]>([])
  const [porTipo, setPorTipo] = useState<ResumenTipo[]>([])
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [abierto, setAbierto] = useState(false)

  const [form, setForm] = useState({
    fecha: hoyISO(), tipo: 'CORTESIA', descripcion: '', cantidad: '1', montoUSD: '', referencia: '',
  })

  const cargar = useCallback(async () => {
    setCargando(true)
    const r = await apiFetch<{ incidencias: Incidencia[]; porTipo: ResumenTipo[]; total: number }>(
      `/api/restaurante/incidencias?ano=${ano}&mes=${mes}`,
    )
    if (r.ok && r.data) {
      setIncidencias(r.data.incidencias)
      setPorTipo(r.data.porTipo)
      setTotal(r.data.total)
    }
    setCargando(false)
  }, [ano, mes])

  useEffect(() => { cargar() }, [cargar])

  async function guardar() {
    if (!form.descripcion) { toast.error('Escribe qué fue'); return }
    setGuardando(true)
    const r = await apiFetch('/api/restaurante/incidencias', { method: 'POST', body: JSON.stringify(form) })
    setGuardando(false)
    if (r.ok) {
      toast.success('Registrado')
      setForm({ ...form, descripcion: '', cantidad: '1', montoUSD: '', referencia: '' })
      cargar()
    } else toast.error(r.error || 'No se pudo registrar')
  }

  async function borrar(i: Incidencia) {
    if (!confirm(`¿Borrar "${i.descripcion}"?`)) return
    const r = await apiFetch(`/api/restaurante/incidencias?id=${i.id}`, { method: 'DELETE' })
    if (r.ok) { toast.success('Borrado'); cargar() }
    else toast.error(r.error || 'No se pudo borrar')
  }

  function etiqueta(tipo: string) {
    return TIPOS_INCIDENCIA.find((t) => t.key === tipo)
  }

  return (
    <div className="space-y-5">
      <Encabezado
        titulo="Cortesías y mermas"
        subtitulo="Lo que sale del inventario sin generar venta. Verlo junto es lo que muestra cuánto se está yendo del margen."
        icono={<Gift className="w-5 h-5" />}
        color="teal"
        acciones={
          <>
            <SelectorMes ano={ano} mes={mes} onChange={(a, m) => { setAno(a); setMes(m) }} />
            <Button onClick={() => setAbierto(!abierto)} className="rounded-xl">
              <Plus className="w-4 h-4 mr-1" /> Registrar
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Cifra etiqueta="Total del mes" valor={formatoUSD(total)} color="teal" detalle={`${incidencias.length} registro(s)`} />
        {porTipo.map((t) => (
          <Cifra key={t.tipo} etiqueta={t.label} valor={formatoUSD(t.monto)} color={t.color} detalle={`${t.cantidad} vez/veces`} />
        ))}
      </div>

      {abierto && (
        <TarjetaSuave className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Registrar</h3>

          <div className="flex flex-wrap gap-1.5">
            {TIPOS_INCIDENCIA.map((t) => (
              <button
                key={t.key}
                onClick={() => setForm({ ...form, tipo: t.key })}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  form.tipo === t.key
                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400">{etiqueta(form.tipo)?.ayuda}</p>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs text-slate-500">Fecha</Label>
              <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="rounded-xl mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs text-slate-500">¿Qué fue?</Label>
              <Input placeholder="Ej: 2 nachos, 1 kg de pollo" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className="rounded-xl mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Cantidad</Label>
              <Input type="number" inputMode="decimal" step="0.01" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} className="rounded-xl mt-1 tabular-nums" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Valor en $</Label>
              <Input type="number" inputMode="decimal" step="0.01" placeholder="0.00" value={form.montoUSD} onChange={(e) => setForm({ ...form, montoUSD: e.target.value })} className="rounded-xl mt-1 tabular-nums" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-slate-500">¿A quién / a cuál sede? (opcional)</Label>
            <Input value={form.referencia} onChange={(e) => setForm({ ...form, referencia: e.target.value })} className="rounded-xl mt-1 max-w-sm" />
          </div>

          <div className="flex gap-2">
            <Button onClick={guardar} disabled={guardando} className="rounded-xl">
              {guardando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Guardar
            </Button>
            <Button variant="ghost" onClick={() => setAbierto(false)} className="rounded-xl">Cerrar</Button>
          </div>
        </TarjetaSuave>
      )}

      <TarjetaSuave className="p-0 overflow-hidden">
        {cargando ? <Cargando /> : incidencias.length === 0 ? (
          <SinDatos mensaje="No hay registros este mes" sugerencia="Anota las cortesías y las pérdidas para saber cuánto suman al final del mes" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/40">
                  <th className="px-4 py-2.5 font-medium">Fecha</th>
                  <th className="px-3 py-2.5 font-medium">Tipo</th>
                  <th className="px-3 py-2.5 font-medium">Detalle</th>
                  <th className="px-3 py-2.5 font-medium text-right">Cantidad</th>
                  <th className="px-3 py-2.5 font-medium text-right">Valor</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {incidencias.map((i) => (
                  <tr key={i.id} className="border-t border-slate-50 dark:border-slate-800/60 hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{fechaLegible(i.fecha)}</td>
                    <td className="px-3 py-2.5">
                      <Pastilla color={etiqueta(i.tipo)?.color || 'slate'}>{etiqueta(i.tipo)?.label || i.tipo}</Pastilla>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-slate-700 dark:text-slate-200">{i.descripcion}</div>
                      {i.referencia && <div className="text-[11px] text-slate-400">{i.referencia}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{i.cantidad}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium text-slate-700 dark:text-slate-200">
                      {i.montoUSD ? formatoUSD(i.montoUSD) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button onClick={() => borrar(i)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50">
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
  )
}
