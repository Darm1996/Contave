'use client'
import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useApp } from '@/lib/store'
import { toast } from 'sonner'
import { formatBs, formatUSD } from '@/lib/contabilidad/ven-nif'
import { Upload, FileText, X, Image as ImageIcon } from 'lucide-react'
import { apiFetch } from '@/lib/store'

interface FacturaExtraida {
  tipoDetectado: string
  emisor: { nombre: string; rif: string; rifValido: boolean }
  receptor: { nombre: string; rif: string; rifValido: boolean }
  numeroFactura: string
  numeroControl: string
  ncf: string
  fechaEmision: string
  monedaOriginal: string
  baseImponible: number
  montoExento: number
  montoExonerado: number
  alicuotaIVA: number
  montoIVA: number
  descripcion: string
  items: any[]
  confianza: number
  advertencias: string[]
  retencionISLRMonto: number | null
  retencionISLRPorcentaje: number | null
  retencionISLRBase: number | null
}

export function EscanerFacturas() {
  const { empresaActiva } = useApp()
  const [imagen, setImagen] = useState<string | null>(null)
  const [resultado, setResultado] = useState<FacturaExtraida | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [contabilizando, setContabilizando] = useState(false)
  const [facturaGuardadaId, setFacturaGuardadaId] = useState<string | null>(null)
  const [esInventario, setEsInventario] = useState(false)
  const [usoGasto, setUsoGasto] = useState('GASTOS_GENERALES')
  const [clienteRetieneIVA, setClienteRetieneIVA] = useState(false)
  const [aplicaA, setAplicaA] = useState<'COMPRA' | 'VENTA'>('COMPRA')
  const [tasaManual, setTasaManual] = useState<string>('')
  const [tarifaISLRSeleccionada, setTarifaISLRSeleccionada] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!empresaActiva) {
    return <div className="p-10 text-center text-slate-500">Por favor, selecciona una empresa activa para usar el escáner.</div>
  }

  async function handleFile(file: File) {
    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64 = reader.result as string
      setImagen(base64)
      await analizar(base64, file.type)
    }
    reader.readAsDataURL(file)
  }

  async function analizar(base64: string, mimeType: string) {
    setAnalyzing(true)
    setResultado(null)
    const r = await apiFetch<{ resultado: FacturaExtraida }>('/api/facturas/analizar', {
      method: 'POST',
      body: JSON.stringify({ imagen: base64, mimeType }),
    })
    setAnalyzing(false)
    if (!r.ok) {
      toast.error(r.error || 'No se pudo analizar la factura')
      return
    }
    setResultado(r.data?.resultado || null)
    toast.success(`Factura analizada (${r.data?.resultado.confianza}% confianza)`)
  }

  function reset() {
    setImagen(null)
    setResultado(null)
    setFacturaGuardadaId(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function guardarFactura() {
    if (!resultado) return
    setSaving(true)
    const esCompra = resultado.tipoDetectado === 'COMPRA' || resultado.tipoDetectado === 'GASTO_MENOR'
    const contraparte = esCompra ? resultado.emisor : resultado.receptor

    const body: any = {
      tipo: resultado.tipoDetectado,
      rifContraparte: contraparte.rif,
      nombreContraparte: contraparte.nombre,
      numeroFactura: resultado.numeroFactura,
      numeroControl: resultado.numeroControl,
      ncf: resultado.ncf,
      fechaEmision: new Date(resultado.fechaEmision).toISOString().slice(0, 10),
      monedaOriginal: resultado.monedaOriginal,
      baseImponible: resultado.baseImponible,
      montoExento: resultado.montoExento,
      montoExonerado: resultado.montoExonerado,
      alicuotaIVA: resultado.alicuotaIVA,
      montoIVA: resultado.montoIVA,
      descripcion: resultado.descripcion,
      imagenData: imagen,
      tasaCambio: tasaManual ? parseFloat(tasaManual) : undefined,
      tarifaISLRCodigo: tarifaISLRSeleccionada || undefined,
    }

    const r = await apiFetch<{ factura: { id: string } }>('/api/facturas', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (!r.ok) {
      toast.error(r.error || 'Error al guardar')
      return
    }
    setFacturaGuardadaId(r.data?.factura.id || null)
    toast.success('Factura guardada.')
  }

  async function contabilizar() {
    if (!facturaGuardadaId) return
    setContabilizando(true)
    const r = await apiFetch<{ asiento: { numero: string } }>(`/api/facturas/${facturaGuardadaId}/contabilizar`, {
      method: 'POST',
      body: JSON.stringify({ esInventario, usoGasto, clienteRetieneIVA, aplicaA }),
    })
    setContabilizando(false)
    if (!r.ok) {
      toast.error(r.error || 'Error al contabilizar')
      return
    }
    toast.success(`Asiento #${r.data?.asiento.numero} generado.`)
    reset()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Escáner de Facturas</h2>
        {(resultado || imagen) && <Button variant="outline" onClick={reset}>Limpiar</Button>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            {!imagen ? (
              <label htmlFor="file-upload" className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer block">
                <Upload className="mx-auto mb-3" />
                <p>Haz clic para subir factura</p>
                <input id="file-upload" ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              </label>
            ) : (
              <div className="space-y-3">
                <img src={imagen} alt="Factura" className="w-full max-h-[400px] object-contain" />
                {analyzing && <p>Analizando...</p>}
                <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>Cambiar imagen</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {resultado && (
              <ScrollArea className="h-[460px]">
                <Button className="w-full" onClick={!facturaGuardadaId ? guardarFactura : contabilizar} disabled={saving || contabilizando}>
                  {!facturaGuardadaId ? 'Guardar Factura' : 'Contabilizar'}
                </Button>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}