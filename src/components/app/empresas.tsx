'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useApp, apiFetch } from '@/lib/store'
import { toast } from 'sonner'
import { Building2, Plus, Check, Trash2, AlertCircle, Crown } from 'lucide-react'

interface Empresa {
  id: string
  nombre: string
  rif: string
  direccion?: string
  telefono?: string
  email?: string
  esAgenteRetencionIVA: boolean
  esContribuyenteEspecial: boolean
  alicuotaIVA: number
  monedaFuncional: string
  rol?: string
}

const MAX_EMPRESAS = 5

export function Empresas() {
  const { user, empresaActiva, setEmpresaActiva, setEmpresas, empresas } = useApp()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    nombre: '', rif: '', direccion: '', telefono: '', email: '',
    esAgenteRetencionIVA: true, esContribuyenteEspecial: false, alicuotaIVA: 16, monedaFuncional: 'VES',
  })

  const esSuperAdmin = user?.role === 'SUPER_ADMIN'
  const puedeCrearMas = esSuperAdmin || empresas.length < MAX_EMPRESAS
  const empresasRestantes = MAX_EMPRESAS - empresas.length

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    const r = await apiFetch('/api/empresas')
    if (r.ok && r.data?.empresas) setEmpresas(r.data.empresas)
  }

  async function cambiarActiva(id: string) {
    const r = await apiFetch('/api/empresa-activa', {
      method: 'POST',
      body: JSON.stringify({ empresaId: id }),
    })
    if (r.ok) {
      const emp = empresas.find((e) => e.id === id)
      if (emp) setEmpresaActiva(emp)
      toast.success(`Empresa activa: ${emp?.nombre}`)
    } else {
      toast.error(r.error || 'Error')
    }
  }

  async function crear() {
    if (!form.nombre || !form.rif) {
      toast.error('Nombre y RIF son requeridos')
      return
    }
    const r = await apiFetch('/api/empresas', {
      method: 'POST',
      body: JSON.stringify(form),
    })
    if (r.ok) {
      toast.success('Empresa creada con plan de cuentas VEN-NIF clonado')
      setShowForm(false)
      setForm({ nombre: '', rif: '', direccion: '', telefono: '', email: '', esAgenteRetencionIVA: true, esContribuyenteEspecial: false, alicuotaIVA: 16, monedaFuncional: 'VES' })
      cargar()
    } else {
      toast.error(r.error || 'Error')
    }
  }

  async function desasociar(id: string, nombre: string) {
    if (!confirm(`¿Desasociar la empresa "${nombre}"? Podrás reasociarla luego con el RIF. Los datos contables no se pierden.`)) return
    const r = await apiFetch(`/api/empresas?empresaId=${id}`, { method: 'DELETE' })
    if (r.ok) {
      toast.success('Empresa desasociada')
      cargar()
    } else {
      toast.error(r.error || 'Error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            Empresas
            {esSuperAdmin && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                <Crown className="w-3 h-3 mr-1" /> Super Admin
              </Badge>
            )}
          </h2>
          <p className="text-sm text-slate-500">
            {esSuperAdmin
              ? 'Sin límite de empresas (Super Admin)'
              : `${empresas.length} de ${MAX_EMPRESAS} empresas utilizadas (${empresasRestantes} restantes)`}
          </p>
        </div>
        {user?.role === 'ADMIN' && (
          <Button onClick={() => setShowForm(!showForm)} disabled={!puedeCrearMas}>
            <Plus className="w-4 h-4 mr-1" /> Nueva empresa
          </Button>
        )}
      </div>

      {/* Aviso de límite */}
      {!esSuperAdmin && !puedeCrearMas && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Límite alcanzado:</strong> Has llegado al máximo de {MAX_EMPRESAS} empresas.
            Para gestionar más empresas, desasocia alguna que no uses o contacta al Super Administrador.
          </AlertDescription>
        </Alert>
      )}

      {/* Barra de progreso visual */}
      {!esSuperAdmin && (
        <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all ${empresas.length >= MAX_EMPRESAS ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${(empresas.length / MAX_EMPRESAS) * 100}%` }}
          />
        </div>
      )}

      {showForm && puedeCrearMas && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Crear nueva empresa</CardTitle>
            <CardDescription>Se clonará el plan de cuentas VEN-NIF Pymes automáticamente</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Nombre / Razón social *</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Mi Empresa C.A." />
            </div>
            <div>
              <Label>RIF *</Label>
              <Input value={form.rif} onChange={(e) => setForm({ ...form, rif: e.target.value })} placeholder="J-XXXXXXXX-X" />
            </div>
            <div className="md:col-span-2">
              <Label>Dirección fiscal</Label>
              <Input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Alícuota IVA (%)</Label>
              <Input type="number" value={form.alicuotaIVA} onChange={(e) => setForm({ ...form, alicuotaIVA: parseFloat(e.target.value) || 16 })} />
            </div>
            <div>
              <Label>Moneda funcional</Label>
              <select className="w-full h-9 px-3 rounded-md border border-input bg-background" value={form.monedaFuncional} onChange={(e) => setForm({ ...form, monedaFuncional: e.target.value })}>
                <option value="VES">Bolívares (Bs.)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </div>
            <div className="md:col-span-2 space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label>¿Es agente de retención de IVA?</Label>
                <Switch checked={form.esAgenteRetencionIVA} onCheckedChange={(v) => setForm({ ...form, esAgenteRetencionIVA: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>¿Es contribuyente especial?</Label>
                <Switch checked={form.esContribuyenteEspecial} onCheckedChange={(v) => setForm({ ...form, esContribuyenteEspecial: v })} />
              </div>
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button onClick={crear}>Crear empresa</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {empresas.map((e) => (
          <Card key={e.id} className={empresaActiva?.id === e.id ? 'border-emerald-400 bg-emerald-50/30' : ''}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div className="flex gap-1">
                  {empresaActiva?.id === e.id && (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                      <Check className="w-3 h-3 mr-1" /> Activa
                    </Badge>
                  )}
                  {empresas.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-slate-400 hover:text-red-500"
                      onClick={() => desasociar(e.id, e.nombre)}
                      title="Desasociar empresa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <h3 className="font-semibold text-slate-800">{e.nombre}</h3>
              <p className="text-xs text-slate-500 mb-2">RIF: {e.rif}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {e.esAgenteRetencionIVA && <Badge variant="secondary" className="text-xs">Agente Retención IVA</Badge>}
                {e.esContribuyenteEspecial && <Badge variant="secondary" className="text-xs">Contrib. Especial</Badge>}
                <Badge variant="outline" className="text-xs">IVA {e.alicuotaIVA}%</Badge>
                <Badge variant="outline" className="text-xs">{e.monedaFuncional}</Badge>
                {e.rol && <Badge variant="outline" className="text-xs">{e.rol}</Badge>}
              </div>
              {empresaActiva?.id !== e.id && (
                <Button variant="outline" size="sm" className="w-full" onClick={() => cambiarActiva(e.id)}>
                  Activar
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
