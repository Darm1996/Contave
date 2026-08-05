'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { formatBs, calcularIVA } from '@/lib/contabilidad/ven-nif'
import { apiFetch } from '@/lib/store'
import { toast } from 'sonner'
import { FilePlus, Loader2, Download, RefreshCw } from 'lucide-react'

interface Cliente { id: string; rif: string; nombre: string }

export function FacturarVenta() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteId, setClienteId] = useState('')
  const [clienteRetieneIVA, setClienteRetieneIVA] = useState(false)
  const [form, setForm] = useState({
    fechaEmision: new Date().toISOString().slice(0, 10),
    baseImponible: '',
    alicuotaIVA: '16',
    montoExento: '0',
    descripcion: '',
  })
  const [guardando, setGuardando] = useState(false)
  const [facturaEmitida, setFacturaEmitida] = useState<{ id: string; numeroFactura: string; total: number } | null>(null)

  async function cargarClientes() {
    const r = await apiFetch('/api/clientes')
    if (r.ok) setClientes(r.data.clientes)
  }
  useEffect(() => { cargarClientes() }, [])

  const baseImponible = parseFloat(form.baseImponible) || 0
  const alicuotaIVA = parseFloat(form.alicuotaIVA) || 0
  const montoExento = parseFloat(form.montoExento) || 0
  const montoIVA = calcularIVA(baseImponible, alicuotaIVA)
  const total = baseImponible + montoExento + montoIVA

  async function emitir() {
    if (!clienteId) { toast.error('Selecciona un cliente'); return }
    if (baseImponible <= 0 && montoExento <= 0) { toast.error('Ingresa un monto base o exento'); return }
    const cliente = clientes.find((c) => c.id === clienteId)
    if (!cliente) return

    setGuardando(true)
    try {
      const rSec = await apiFetch<{ numero: number }>('/api/secuencia-documento', {
        method: 'POST',
        body: JSON.stringify({ tipo: 'FACTURA_VENTA' }),
      })
      if (!rSec.ok || !rSec.data) throw new Error(rSec.error || 'No se pudo generar el número de factura')
      const numeroFactura = String(rSec.data.numero).padStart(8, '0')

      const rFactura = await apiFetch<{ factura: { id: string } }>('/api/facturas', {
        method: 'POST',
        body: JSON.stringify({
          tipo: 'VENTA',
          rifContraparte: cliente.rif,
          nombreContraparte: cliente.nombre,
          numeroFactura,
          numeroControl: numeroFactura,
          fechaEmision: form.fechaEmision,
          monedaOriginal: 'VES',
          baseImponible,
          montoExento,
          montoExonerado: 0,
          alicuotaIVA,
          montoIVA,
          descripcion: form.descripcion,
        }),
      })
      if (!rFactura.ok || !rFactura.data) throw new Error(rFactura.error || 'Error al emitir la factura')

      const facturaId = rFactura.data.factura.id
      const rContab = await apiFetch(`/api/facturas/${facturaId}/contabilizar`, {
        method: 'POST',
        body: JSON.stringify({ clienteRetieneIVA }),
      })
      if (!rContab.ok) {
        toast.error(`Factura emitida, pero no se pudo contabilizar: ${rContab.error || 'Error'}`)
      } else {
        toast.success('Factura emitida y contabilizada')
      }
      setFacturaEmitida({ id: facturaId, numeroFactura, total })
      setForm({ fechaEmision: new Date().toISOString().slice(0, 10), baseImponible: '', alicuotaIVA: '16', montoExento: '0', descripcion: '' })
      setClienteId('')
    } catch (e: any) {
      toast.error(e.message)
    }
    setGuardando(false)
  }

  function nuevaFactura() {
    setFacturaEmitida(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FilePlus className="w-6 h-6 text-emerald-600" />
            Facturar Venta
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Emite una factura a un cliente con numeración fiscal propia</p>
        </div>
      </div>

      {facturaEmitida ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Factura N° {facturaEmitida.numeroFactura} emitida</CardTitle>
            <CardDescription>Total: {formatBs(facturaEmitida.total)}</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild>
              <a href={`/api/facturas/${facturaEmitida.id}/pdf`} target="_blank" rel="noopener noreferrer">
                <Download className="w-4 h-4 mr-1" /> Descargar PDF
              </a>
            </Button>
            <Button variant="outline" onClick={nuevaFactura}><RefreshCw className="w-4 h-4 mr-1" /> Nueva factura</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nueva factura</CardTitle>
            <CardDescription>Solo encabezado (un monto base + IVA), sin líneas de detalle por ítem</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Cliente</Label>
                <select className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                  <option value="">Selecciona un cliente...</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.rif} — {c.nombre}</option>)}
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">¿No está en la lista? Créalo en "Clientes" antes de facturar.</p>
              </div>
              <div>
                <Label>Fecha de emisión</Label>
                <Input type="date" value={form.fechaEmision} onChange={(e) => setForm({ ...form, fechaEmision: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label>Base imponible</Label>
                <Input type="number" step="0.01" value={form.baseImponible} onChange={(e) => setForm({ ...form, baseImponible: e.target.value })} placeholder="0.00" />
              </div>
              <div>
                <Label>Alícuota IVA (%)</Label>
                <Input type="number" step="0.01" value={form.alicuotaIVA} onChange={(e) => setForm({ ...form, alicuotaIVA: e.target.value })} />
              </div>
              <div>
                <Label>Monto exento</Label>
                <Input type="number" step="0.01" value={form.montoExento} onChange={(e) => setForm({ ...form, montoExento: e.target.value })} />
              </div>
              <div>
                <Label>IVA calculado</Label>
                <Input type="number" value={montoIVA.toFixed(2)} disabled />
              </div>
            </div>
            <div>
              <Label>Descripción / concepto</Label>
              <Textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={2} />
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <Label htmlFor="clienteRetieneIVA">El cliente retiene IVA</Label>
              <Switch id="clienteRetieneIVA" checked={clienteRetieneIVA} onCheckedChange={setClienteRetieneIVA} />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Total a facturar: <strong>{formatBs(total)}</strong></p>
            <Button onClick={emitir} disabled={guardando}>
              {guardando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Emitir factura
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
