'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { apiFetch } from '@/lib/store'
import { toast } from 'sonner'
import { Search, Plus, Pencil, Loader2 } from 'lucide-react'

interface Cuenta {
  id: string
  codigo: string
  nombre: string
  tipo: string
  naturaleza: string
  nivel: number
  imputable: boolean
  uso: string | null
}

const TIPO_COLOR: Record<string, string> = {
  ACTIVO: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  PASIVO: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  PATRIMONIO: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  INGRESO: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
  COSTO: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  GASTO: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
}

const TIPOS = ['ACTIVO', 'PASIVO', 'PATRIMONIO', 'INGRESO', 'COSTO', 'GASTO']

type FormCuenta = { id?: string; codigo: string; nombre: string; tipo: string; naturaleza: string }

const FORM_VACIO: FormCuenta = { codigo: '', nombre: '', tipo: 'GASTO', naturaleza: 'DEUDORA' }

export function PlanCuentas() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [filtro, setFiltro] = useState('')
  const [loading, setLoading] = useState(true)
  const [dialogAbierto, setDialogAbierto] = useState(false)
  const [form, setForm] = useState<FormCuenta>(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)

  function cargar() {
    setLoading(true)
    apiFetch<{ cuentas: Cuenta[] }>('/api/cuentas').then((r) => {
      if (r.ok && r.data) setCuentas(r.data.cuentas)
      setLoading(false)
    })
  }

  useEffect(() => { cargar() }, [])

  const filtradas = cuentas.filter((c) => {
    if (!filtro) return true
    const s = `${c.codigo} ${c.nombre} ${c.uso || ''} ${c.tipo}`.toLowerCase()
    return s.includes(filtro.toLowerCase())
  })

  function abrirNueva() {
    setForm(FORM_VACIO)
    setDialogAbierto(true)
  }

  function abrirEditar(c: Cuenta) {
    setForm({ id: c.id, codigo: c.codigo, nombre: c.nombre, tipo: c.tipo, naturaleza: c.naturaleza })
    setDialogAbierto(true)
  }

  async function guardar() {
    if (!form.codigo.trim() || !form.nombre.trim()) {
      toast.error('Código y nombre son requeridos')
      return
    }
    setGuardando(true)
    const esEdicion = !!form.id
    const r = esEdicion
      ? await apiFetch(`/api/cuentas`, {
          method: 'PATCH',
          body: JSON.stringify({ id: form.id, nombre: form.nombre, tipo: form.tipo, naturaleza: form.naturaleza }),
        })
      : await apiFetch('/api/cuentas', {
          method: 'POST',
          body: JSON.stringify(form),
        })
    setGuardando(false)
    if (!r.ok) {
      toast.error(r.error || 'Error al guardar la cuenta')
      return
    }
    toast.success(esEdicion ? 'Cuenta actualizada' : 'Cuenta creada')
    setDialogAbierto(false)
    cargar()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Plan de Cuentas — VEN-NIF Pymes</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{cuentas.length} cuentas en el catálogo</p>
        </div>
        <Button onClick={abrirNueva}>
          <Plus className="w-4 h-4 mr-2" /> Agregar cuenta
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-slate-500" />
            <Input
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Buscar por código, nombre o uso..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <ScrollArea className="h-[600px]">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10">
                <tr className="text-left">
                  <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Código</th>
                  <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Cuenta</th>
                  <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Tipo</th>
                  <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Naturaleza</th>
                  <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Uso (auto-mapeo)</th>
                  <th className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-400 dark:text-slate-500">Cargando...</td></tr>
                ) : filtradas.map((c) => {
                  const indent = (c.codigo.split('.').length - 1) * 16
                  const esTitulo = !c.imputable
                  return (
                    <tr key={c.id} className={`border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${esTitulo ? 'bg-slate-50 dark:bg-slate-800/50 font-semibold' : ''}`}>
                      <td className="px-3 py-2 font-mono text-xs text-slate-600 dark:text-slate-400">{c.codigo}</td>
                      <td className="px-3 py-2 text-slate-800 dark:text-slate-200" style={{ paddingLeft: `${12 + indent}px` }}>
                        {c.nombre}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${TIPO_COLOR[c.tipo] || 'bg-slate-100 dark:bg-slate-800'}`}>
                          {c.tipo}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-xs">{c.naturaleza}</Badge>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 font-mono">{c.uso || '—'}</td>
                      <td className="px-3 py-2">
                        <Button variant="ghost" size="sm" onClick={() => abrirEditar(c)} title="Editar cuenta">
                          <Pencil className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? 'Editar cuenta' : 'Agregar cuenta nueva'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Código</Label>
              <Input
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                placeholder="Ej: 6.1.11"
                disabled={!!form.id}
              />
              {!form.id && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Usa el mismo formato del resto del catálogo (ej: 6.1.11).</p>}
            </div>
            <div>
              <Label>Nombre</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Seguros" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Naturaleza</Label>
                <Select value={form.naturaleza} onValueChange={(v) => setForm({ ...form, naturaleza: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEUDORA">Deudora</SelectItem>
                    <SelectItem value="ACREEDORA">Acreedora</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAbierto(false)}>Cancelar</Button>
            <Button onClick={guardar} disabled={guardando}>
              {guardando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
