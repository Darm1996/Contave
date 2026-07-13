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
import { useApp, apiFetch } from '@/lib/store'
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
      const r = await apiFetch<{ valido: boolean; datos: any }>('/api/procesar-factura', {
        method: 'POST',
        body: JSON.stringify({ imagenBase64: base64, mimeType }),
      })
      
      if (!r.ok) {
        toast.error(r.error || 'No se pudo analizar la factura')
        return
      }

      const datosGemini = r.data.datos
      
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

    const r = await apiFetch<{ factura: any }>('/api/facturas', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (!r.ok) {
      toast.error(r.error || 'Error al guardar la factura')
      return
    }
    setFacturaGuardadaId(r.data.factura.id)
    toast.success('Factura guardada. Ahora puedes contabilizarla para generar el asiento.')
  }

  async function contabilizar() {
    if (!facturaGuardadaId) return
    setContabilizando(true)
    const r = await apiFetch<{ asiento: any; lineas: number }>(`/api/facturas/${facturaGuardadaId}/contabilizar`, {
      method: 'POST',
      body: JSON.stringify({
        esInventario,
        usoGasto,
        clienteRetieneIVA,
        aplicaA,
      }),
    })
    setContabilizando(false)
    if (!r.ok) {
      toast.error(r.error || 'Error al contabilizar')
      return
    }
    toast.success(`Asiento #${
