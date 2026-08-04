'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useApp, apiFetch } from '@/lib/store'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'

interface EmpresaCompleta {
  id: string
  nombre: string
  rif: string
  direccion: string | null
  telefono: string | null
  email: string | null
  esAgenteRetencionIVA: boolean
  esContribuyenteEspecial: boolean
  alicuotaIVA: number
  monedaFuncional: string
}

export function Configuracion() {
  const { empresaActiva, setEmpresaActiva } = useApp()
  const [empresa, setEmpresa] = useState<EmpresaCompleta | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!empresaActiva) { setLoading(false); return }
    apiFetch<{ empresas: EmpresaCompleta[] }>('/api/empresas').then((r) => {
      if (r.ok && r.data) {
        const actual = r.data.empresas.find((e) => e.id === empresaActiva.id)
        if (actual) setEmpresa(actual)
      }
      setLoading(false)
    })
  }, [empresaActiva?.id])

  if (!empresaActiva) {
    return <div className="p-10 text-center text-slate-500 dark:text-slate-400">Selecciona una empresa activa primero.</div>
  }
  if (loading) {
    return <div className="p-10 text-center text-slate-500 dark:text-slate-400">Cargando...</div>
  }
  if (!empresa) {
    return <div className="p-10 text-center text-slate-500 dark:text-slate-400">No se pudo cargar la configuración de la empresa.</div>
  }

  function actualizar<K extends keyof EmpresaCompleta>(campo: K, valor: EmpresaCompleta[K]) {
    setEmpresa((e) => (e ? { ...e, [campo]: valor } : e))
  }

  async function guardar() {
    if (!empresa) return
    setSaving(true)
    const r = await apiFetch<{ empresa: EmpresaCompleta }>('/api/empresas', {
      method: 'PATCH',
      body: JSON.stringify({
        nombre: empresa.nombre,
        direccion: empresa.direccion,
        telefono: empresa.telefono,
        email: empresa.email,
        esAgenteRetencionIVA: empresa.esAgenteRetencionIVA,
        esContribuyenteEspecial: empresa.esContribuyenteEspecial,
        alicuotaIVA: empresa.alicuotaIVA,
        monedaFuncional: empresa.monedaFuncional,
      }),
    })
    setSaving(false)
    if (!r.ok) {
      toast.error(r.error || 'Error al guardar')
      return
    }
    toast.success('Configuración guardada')
    if (r.data) {
      setEmpresaActiva({ ...empresaActiva, ...r.data.empresa })
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Configuración</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Datos y parámetros fiscales de {empresa.nombre}</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Datos de la empresa</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>RIF (no editable)</Label>
            <Input value={empresa.rif} disabled />
          </div>
          <div>
            <Label>Nombre / Razón social</Label>
            <Input value={empresa.nombre} onChange={(e) => actualizar('nombre', e.target.value)} />
          </div>
          <div>
            <Label>Dirección</Label>
            <Input value={empresa.direccion || ''} onChange={(e) => actualizar('direccion', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Teléfono</Label>
              <Input value={empresa.telefono || ''} onChange={(e) => actualizar('telefono', e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={empresa.email || ''} onChange={(e) => actualizar('email', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Parámetros fiscales</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="esAgente">Agente de retención de IVA</Label>
              <p className="text-xs text-slate-500 dark:text-slate-400">Retiene IVA a sus proveedores según lo exige el SENIAT.</p>
            </div>
            <Switch id="esAgente" checked={empresa.esAgenteRetencionIVA} onCheckedChange={(v) => actualizar('esAgenteRetencionIVA', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="esEspecial">Contribuyente especial</Label>
              <p className="text-xs text-slate-500 dark:text-slate-400">Aplica retención de IVA al 100% en vez de 75%.</p>
            </div>
            <Switch id="esEspecial" checked={empresa.esContribuyenteEspecial} onCheckedChange={(v) => actualizar('esContribuyenteEspecial', v)} />
          </div>
          <div>
            <Label>Alícuota general de IVA (%)</Label>
            <Input
              type="number" step="0.01" min="0" max="100"
              value={empresa.alicuotaIVA}
              onChange={(e) => actualizar('alicuotaIVA', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <Label>Moneda funcional</Label>
            <Select value={empresa.monedaFuncional} onValueChange={(v) => actualizar('monedaFuncional', v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="VES">VES (Bolívares)</SelectItem>
                <SelectItem value="USD">USD (Dólares)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Button onClick={guardar} disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Guardar cambios
      </Button>
    </div>
  )
}
