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

// ... (El resto de tus interfaces y la constante USOS_GASTO se mantienen igual)
// Nota: Asegúrate de mantener todas las interfaces y constantes que tenías arriba

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
  
  const [tarifasISLR, setTarifasISLR] = useState<Array<any>>([])
  const [tarifaISLRSeleccionada, setTarifaISLRSeleccionada] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/islr/tarifas')
      .then((r) => r.json())
      .then((d) => { if (d.tarifas) setTarifasISLR(d.tarifas) })
      .catch(() => {})
  }, [])

  const recalcularFinanzas = (datos: FacturaExtraida, tarifaCodigo = tarifaISLRSeleccionada) => {
    const base = datos.baseImponible || 0
    const exento = datos.montoExento || 0
    const exonerado = datos.montoExonerado || 0
    const alicuota = datos.alicuotaIVA || 0
    
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

  // ... (Tus funciones handleMontoChange, handleTarifaISLRChange, handleFile, analizar, guardarFactura y contabilizar se quedan igual)
  
  // ¡IMPORTANTE!: Asegúrate de que al final de la función contabilizar() 
  // tu código incluya el cierre de todas las llaves correctamente.
  
  // ... (Tu renderizado JSX se mantiene igual)
}
