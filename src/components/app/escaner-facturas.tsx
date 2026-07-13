'use client'
import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useApp } from '@/lib/store'
import { toast } from 'sonner'
import { formatBs, formatUSD, TIPOS_FACTURA } from '@/lib/contabilidad/ven-nif'
import {
  Upload, ScanLine, Loader2, CheckCircle2, AlertTriangle, Save, BookPlus,
  FileText, X, Image as ImageIcon,
} from 'lucide-react'

interface ItemFactura {
  [key: string]: any
}

interface FacturaExtraida {
  tipoDetectado: string
  emisor: { nombre: string; rif: string; rifValido: boolean }
  receptor: { nombre: string; rif: string; rifValido: boolean }
  numeroFactura: string
  numeroControl: string
  ncf: string
  ncfValido: boolean
  ncfTipo: string | null
  fechaEmision: string
  monedaOriginal: string
  baseImponible: number
  montoExento: number
  montoExonerado: number
  alicuotaIVA: number
  montoIVA: number
  subtotal: number
  total: number
  retencionIVAPorcentaje: number | null
  retencionIVAMonto: number | null
  retencionISLRPorcentaje: number | null
  retencionISLRMonto: number | null
  retencionISLRBase: number | null
  descripcion: string
  items: ItemFactura[]
  confianza: number
  advertencias: string[]
}

const USOS_GASTO = [
  { value: 'GASTO_SERVICIOS_BASICOS', label: 'Servicios básicos (luz, agua)' },
  { value: 'GASTO_TELEFONO', label: 'Teléfono e internet' },
  { value: 'GASTO_ALQUILER', label: 'Alquileres' },
  { value: 'GASTO_UTILES', label: 'Útiles de oficina' },
  { value: 'GASTO_PUBLICIDAD', label: 'Publicidad' },
  { value: 'GASTO_MANTENIMIENTO', label: 'Mantenimiento' },
  { value: 'GASTO_HONORARIOS', label: 'Honorarios profesionales' },
  { value: 'GASTO_VIAJE', label: 'Viajes y representación' },
  { value: 'GASTO_COMBUSTIBLE', label: 'Combustible' },
  { value: 'GASTO_SUELDOS', label: 'Sueldos y salarios' },
  { value: 'GASTO_OTROS', label: 'Otros gastos' },
]

export function EscanerFacturas() {
  const { empresaActiva } = useApp()
  const [imagen, setImagen] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [contabilizando, setContabilizando] = useState(false)
  const [resultado, setResultado] = useState<FacturaExtraida | null>(null)
  const [facturaGuardadaId, setFacturaGuardadaId] = useState<string | null>(null)
  const [esInventario, setEsInventario] = useState(false)
  const [usoGasto, setUsoGasto] = useState('GASTO_OTROS')
  const [clienteRetieneIVA, setClienteRetieneIVA] = useState(false)
  const [aplicaA, setAplicaA] = useState<'COMPRA' | 'VENTA'>('COMPRA')
  const [tasaManual, setTasaManual] = useState<string>('')
  
  // ISLR
  const [tarifasISLR, setTarifasISLR] = useState<Array<{codigo: string; concepto: string; porcentaje: number; baseImponiblePct: number; usoGasto: string}>>([])
  const [tarifaISLRSeleccionada, setTarifaISLRSeleccionada] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cargar tarifas ISLR al montar
  useEffect(() => {
    fetch('/api/islr/tarifas')
      .then((r) => r.json())
      .then((d) => { if (d.tarifas) setTarifasISLR(d.tarifas) })
      .catch(() => {})
  }, [])

  // Recalcular montos y retenciones de forma automática
  const recalcularFinanzas = (datos: FacturaExtraida, tarifaCodigo = tarifaISLRSeleccionada) => {
    const base = datos.baseImponible || 0
    const exento = datos.montoExento || 0
    const exonerado = datos.montoExonerado || 0
    const alicuota = datos.alicuotaIVA || 0
    
    // Calcular IVA de forma precisa
    const montoIVA = Math.round(base * (alicuota / 100) * 100) / 100
    const subtotal = base + exento + exonerado
    const total = Math.round((subtotal + montoIVA) * 100) / 100

    let retencionISLRBase = null
    let retencionISLRPorcentaje = null
    let retencionISLRMonto = null

    if (tarifaCodigo) {
      const tarifa = tarifasISLR.find(t => t.codigo === tarifaCodigo)
      if (tarifa) {
        retencionISLRBase = Math.round(base * tarifa.baseImponiblePct * 100) / 100
        retencionISLRPorcentaje = tarifa.porcentaje
        retencionISLRMonto = Math.round(retencionISLRBase * (tarifa.porcentaje / 100) * 100) / 100
      }
    }

    return {
      ...datos,
      montoIVA,
      subtotal,
      total,
      retencionISLRBase,
      retencionISLRPorcentaje,
      retencionISLRMonto
    }
  }

  const handleMontoChange = (campo: keyof FacturaExtraida, valor: number) => {
    if (!resultado) return
    const copia = { ...resultado, [campo]: valor }
    setResultado(recalcularFinanzas(copia))
  }

  const handleTarifaISLRChange = (codigo: string) => {
    setTarifaISLRSeleccionada(codigo)
    if (!resultado) return
    setResultado(recalcularFinanzas(resultado, codigo))
  }

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = (e.target?.result as string).split(',')[1]
      setImagen(e.target?.result as string)
      analizar(base64, file.type)
    }
    reader.readAsDataURL(file)
  }

  async function analizar(base64: string, mimeType: string) {
    setAnalyzing(true)
    setResultado(null)
    setFacturaGuardadaId(null)
    
    try {
      const response = await fetch('/api/procesar-factura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagenBase64: base64, mimeType }),
      })
      
      const r = await response.json()
      
      if (!response.ok || !r.valido) {
        toast.error(r.error || 'No se pudo analizar la factura')
        return
      }

      const datosGemini = r.datos
      
      const contraparteObj = {
        nombre: datosGemini.nombreContraparte || '',
        rif: datosGemini.rifContraparte || '',
        rifValido: !!datosGemini.rifContraparte
      }

      const resultadoAdaptado: FacturaExtraida = {
        tipoDetectado: datosGemini.tipoDetectado || 'COMPRA', 
        emisor: contraparteObj,
        receptor: contraparteObj, 
        numeroFactura: datosGemini.numeroFactura || '',
        numeroControl: datosGemini.numeroControl || '',
        ncf: datosGemini.ncf || '',
        ncfValido: !!datosGemini.ncf,
        ncfTipo: null,
        fechaEmision: datosGemini.fechaEmision ? new Date(datosGemini.fechaEmision).toISOString() : new Date().toISOString(),
        monedaOriginal: datosGemini.monedaOriginal || 'VES',
        baseImponible: datosGemini.baseImponible || 0,
        montoExento: datosGemini.montoExento || 0,
        montoExonerado: datosGemini.montoExonerado || 0,
        alicuotaIVA: datosGemini.alicuotaIVA || 16,
        montoIVA: datosGemini.montoIVA || 0,
        subtotal: 0,
        total: datosGemini.total || 0,
        retencionIVAPorcentaje: null,
        retencionIVAMonto: null,
        retencionISLRPorcentaje: null,
        retencionISLRMonto: null,
        retencionISLRBase: null,
        descripcion: datosGemini.descripcion || 'Procesado por Gemini AI',
        items: datosGemini.items || [],
        confianza: datosGemini.confianza || 95,
        advertencias: datosGemini.advertencias || []
      }

      setResultado(recalcularFinanzas(resultadoAdaptado))
      setEsInventario(false)
      toast.success('¡Factura analizada con éxito por Gemini!')
    } catch (error) {
      toast.error('Error al conectar con el servidor de análisis')
    } finally {
      setAnalyzing(false)
    }
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
      total: resultado.total,
      descripcion: resultado.descripcion,
      imagenData: imagen,
      tasaCambio: tasaManual ? parseFloat(tasaManual) : undefined,
      tarifaISLRCodigo: tarifaISLRSeleccionada || undefined,
      montoRetencionISLR: resultado.retencionISLRMonto ?? undefined,
      porcentajeRetencionISLR: resultado.retencionISLRPorcentaje ?? undefined,
      baseRetencionISLR: resultado.retencionISLRBase ?? undefined,
    }

    try {
      const response = await fetch('/api/facturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      
      const r = await response.json()
      setSaving(false)
      
      if (!response.ok) {
        toast.error(r.error || 'Error al guardar la factura')
        return
      }
      setFacturaGuardadaId(r.factura.id)
      toast.success('Factura guardada. Ahora puedes contabilizarla para generar el asiento.')
    } catch (error) {
      setSaving(false)
      toast.error('Error de red al guardar la factura')
    }
  }

  async function contabilizar() {
    if (!facturaGuardadaId) return
    setContabilizando(true)
    
    try {
      const response = await fetch(`/api/facturas/${facturaGuardadaId}/contabilizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          esInventario,
          usoGasto,
          clienteRetieneIVA,
          aplicaA,
        }),
      })
      
      const r = await response.json()
      setContabilizando(false)
      
      if (!response.ok) {
        toast.error(r.error || 'Error al contabilizar')
        return
      }
      toast.success(`Asiento #${r.asiento.numero} generado con ${r.lineas} líneas`)
      reset()
    } catch (error) {
      setContabilizando(false)
      toast.error('Error de red al intentar contabilizar')
    }
  }

  function reset() {
    setImagen(null)
    setResultado(null)
    setFacturaGuardadaId(null)
    setEsInventario(false)
    setTasaManual('')
    setTarifaISLRSeleccionada('')
  }

  const fmt = (n: number) => resultado?.monedaOriginal === 'USD' ? formatUSD(n) : formatBs(n)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Escáner de Facturas</h2>
          <p className="text-sm text-slate-500">Sube una foto de la factura y el sistema extrae los datos automáticamente</p>
        </div>
        {(resultado || imagen) && (
          <Button variant="outline" onClick={reset}>
            <X className="w-4 h-4 mr-1" /> Limpiar
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna izquierda: Imagen / Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="w-4 h-4" /> Imagen de la factura
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!imagen ? (
              <label
                htmlFor="file-upload"
                className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors block"
              >
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-700">Haz clic para subir una factura</p>
                <p className="text-xs text-slate-500 mt-1">Formatos: JPG, PNG, WEBP · Máx ~5MB</p>
                <input
                  id="file-upload"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFile(f)
                  }}
                />
              </label>
            ) : (
              <div className="space-y-3">
                <div className="relative rounded-lg overflow-hidden border border-slate-200">
                  <img src={imagen} alt="Factura" className="w-full max-h-[400px] object-contain bg-slate-50" />
                  {analyzing && (
                    <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center text-white">
                      <Loader2 className="w-8 h-8 animate-spin mb-2" />
                      <p className="text-sm">Analizando con Gemini AI...</p>
                    </div>
                  )}
                </div>
                <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                  <ScanLine className="w-4 h-4 mr-2" /> Re-analizar / Subir otra
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Columna derecha: Edición y Resultados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4" /> Datos extraídos
            </CardTitle>
            {resultado && (
              <CardDescription className="flex items-center gap-2">
                <Badge variant={resultado.confianza >= 70 ? 'default' : 'secondary'}>
                  {resultado.confianza}% confianza
                </Badge>
                {resultado.advertencias.length > 0 && (
                  <span className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {resultado.advertencias.length} advertencia(s)
                  </span>
                )}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {!resultado ? (
              <div className="text-center py-12 text-slate-400">
                {analyzing ? (
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                ) : (
                  <ScanLine className="w-10 h-10 mx-auto mb-2 opacity-40" />
                )}
                <p className="text-sm">{analyzing ? 'Procesando imagen...' : 'Los datos aparecerán aquí'}</p>
              </div>
            ) : (
              <ScrollArea className="h-[460px] pr-3">
                <div className="space-y-3">
                  {resultado.advertencias.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3 space-y-1">
                      {resultado.advertencias.map((a, i) => (
                        <p key={i} className="text-xs text-amber-700 flex items-start gap-1">
                          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" /> {a}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Tipo de Documento */}
                  <div>
                    <Label className="text-xs">Tipo de documento</Label>
                    <Select
                      value={resultado.tipoDetectado}
                      onValueChange={(v) => setResultado({ ...resultado, tipoDetectado: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TIPOS_FACTURA).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Contraparte Fiscal */}
                  <div className="border-t pt-3">
                    <Label className="text-xs font-semibold text-emerald-700">
                      {resultado.tipoDetectado === 'COMPRA' || resultado.tipoDetectado === 'GASTO_MENOR'
                        ? 'Proveedor (emisor)'
                        : 'Cliente (receptor)'}
                    </Label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <Input
                        value={resultado.emisor.nombre}
                        onChange={(e) => setResultado({ ...resultado, emisor: { ...resultado.emisor, nombre: e.target.value } })}
                        placeholder="Razón social"
                      />
                      <div className="flex gap-1">
                        <Input
                          value={resultado.emisor.rif}
                          onChange={(e) => setResultado({ ...resultado, emisor: { ...resultado.emisor, rif: e.target.value.toUpperCase() } })}
                          placeholder="J-XXXXXXXX-X"
                          className={resultado.emisor.rifValido ? 'border-emerald-400' : 'border-amber-400'}
                        />
                        {resultado.emisor.rifValido && <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-3 flex-shrink-0" />}
                      </div>
                    </div>
                  </div>

                  {/* Controles Fiscales */}
                  <div className="border-t pt-3 grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">N° Factura</Label>
                      <Input value={resultado.numeroFactura} onChange={(e) => setResultado({ ...resultado, numeroFactura: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">N° Control</Label>
                      <Input value={resultado.numeroControl} onChange={(e) => setResultado({ ...resultado, numeroControl: e.target.value })} />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">NCF (N° Comprobante Fiscal - Si aplica)</Label>
                      <Input
                        value={resultado.ncf}
                        onChange={(e) => setResultado({ ...resultado, ncf: e.target.value })}
                        placeholder="01001001-00012345"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Fecha emisión</Label>
                      <Input
                        type="date"
                        value={new Date(resultado.fechaEmision).toISOString().slice(0, 10)}
                        onChange={(e) => setResultado({ ...resultado, fechaEmision: e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString() })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Moneda original</Label>
                      <Select 
                        value={resultado.monedaOriginal} 
                        onValueChange={(v) => setResultado(recalcularFinanzas({ ...resultado, monedaOriginal: v }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="VES">Bs. (Bolívares)</SelectItem>
                          <SelectItem value="USD">$ (Dólares)</SelectItem>
                          <SelectItem value="EUR">€ (Euros)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Desglose de Montos */}
                  <div className="border-t pt-3 grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Base Imponible</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={resultado.baseImponible}
                        onChange={(e) => handleMontoChange('baseImponible', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Monto Exento</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={resultado.montoExento}
                        onChange={(e) => handleMontoChange('montoExento', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Alícuota IVA (%)</Label>
                      <Input
                        type="number"
                        value={resultado.alicuotaIVA}
                        onChange={(e) => handleMontoChange('alicuotaIVA', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Monto IVA (Auto)</Label>
                      <Input
                        type="number"
                        readOnly
                        className="bg-slate-50 font-medium"
                        value={resultado.montoIVA}
                      />
                    </div>
                    <div className="col-span-2 bg-slate-900 rounded-md p-3 flex justify-between items-center text-white">
                      <span className="text-sm font-medium opacity-90">Total Factura</span>
                      <span className="text-xl font-bold">{fmt(resultado.total)}</span>
                    </div>
                  </div>

                  {/* Multimoneda */}
                  {resultado.monedaOriginal !== empresaActiva?.monedaFuncional && (
                    <div className="border-t pt-3 bg-slate-50 p-2 rounded-md border">
                      <Label className="text-xs font-medium">Tasa de cambio ({resultado.monedaOriginal} → {empresaActiva?.monedaFuncional || 'VES'})</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={tasaManual}
                        onChange={(e) => setTasaManual(e.target.value)}
                        placeholder="Ej. 45.50 (Tasa Oficial BCV)"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Total Equivalente: <strong>{formatBs(tasaManual ? resultado.total * parseFloat(tasaManual) : 0)}</strong>
                      </p>
                    </div>
                  )}

                  {/* Glosa */}
                  <div className="border-t pt-3">
                    <Label className="text-xs">Descripción / Glosa Asiento</Label>
                    <Textarea
                      value={resultado.descripcion}
                      onChange={(e) => setResultado({ ...resultado, descripcion: e.target.value })}
                      rows={2}
                    />
                  </div>

                  {/* Parámetros de Contabilización */}
                  <div className="border-t pt-3 space-y-2">
                    <Label className="text-xs font-semibold text-slate-700">Parámetros de contabilización</Label>
                    
                    {resultado.tipoDetectado === 'COMPRA' && (
                      <div className="flex items-center justify-between p-2 bg-slate-50 rounded-md">
                        <Label htmlFor="inv" className="text-xs cursor-pointer">¿Es compra de mercancía (inventario)?</Label>
                        <Switch id="inv" checked={esInventario} onCheckedChange={setEsInventario} />
                      </div>
                    )}
                    
                    {(resultado.tipoDetectado === 'COMPRA' || resultado.tipoDetectado === 'GASTO_MENOR') && !esInventario && (
                      <div>
                        <Label className="text-xs">Categoría de gasto (cuenta contable)</Label>
                        <Select value={usoGasto} onValueChange={setUsoGasto}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {USOS_GASTO.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {resultado.tipoDetectado === 'VENTA' && (
                      <div className="flex items-center justify-between p-2 bg-slate-50 rounded-md">
                        <Label htmlFor="ret" className="text-xs cursor-pointer">¿El cliente es agente de retención IVA?</Label>
                        <Switch id="ret" checked={clienteRetieneIVA} onCheckedChange={setClienteRetieneIVA} />
                      </div>
                    )}

                    {/* Módulo de Retención ISLR */}
                    {(resultado.tipoDetectado === 'COMPRA' || resultado.tipoDetectado === 'GASTO_MENOR') && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-md space-y-2">
                        <Label className="text-xs font-semibold text-amber-800">
                          Retención ISLR (Decreto 1808)
                        </Label>
                        <Select value={tarifaISLRSeleccionada} onValueChange={handleTarifaISLRChange}>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Sin retención ISLR (no aplica)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Sin retención ISLR</SelectItem>
                            {tarifasISLR.filter((t) => t.porcentaje > 0).map((t) => (
                              <SelectItem key={t.codigo} value={t.codigo}>
                                [{t.codigo}] {t.concepto} — {t.porcentaje}% sobre {(t.baseImponiblePct * 100).toFixed(0)}%
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        {resultado.retencionISLRMonto !== null && resultado.retencionISLRMonto > 0 && (
                          <div className="text-xs text-amber-900 bg-white/60 p-2 rounded border border-amber-200 space-y-0.5">
                            <p>Base Cálculo: <strong>Bs. {resultado.retencionISLRBase?.toFixed(2)}</strong></p>
                            <p>Monto a Retener: <strong className="text-red-700">Bs. {resultado.retencionISLRMonto?.toFixed(2)} ({resultado.retencionISLRPorcentaje}%)</strong></p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Acciones de Persistencia */}
                  <div className="border-t pt-3 space-y-2">
                    {!facturaGuardadaId ? (
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={guardarFactura} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                        Guardar factura
                      </Button>
                    ) : (
                      <>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-md p-2 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs text-emerald-700">Factura guardada. Listo para procesar en el Libro correspondiente.</span>
                        </div>
                        <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white" onClick={contabilizar} disabled={contabilizando}>
                          {contabilizando ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <BookPlus className="w-4 h-4 mr-1" />}
                          Contabilizar y generar asiento
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
