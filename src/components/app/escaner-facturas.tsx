'use client'
import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useApp, apiFetch } from '@/lib/store'
import { toast } from 'sonner'
import { calcularIVA, formatBs, formatUSD, TIPOS_FACTURA, validarRIF } from '@/lib/contabilidad/ven-nif'
import { Upload, AlertTriangle, Calculator, FileEdit, Sparkles } from 'lucide-react'

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
  total: number
  descripcion: string
  items: any[]
  confianza: number
  advertencias: string[]
  retencionISLRMonto: number | null
  retencionISLRPorcentaje: number | null
  retencionISLRBase: number | null
}

interface TarifaISLR {
  codigo: string
  concepto: string
  porcentaje: number
  usoGasto: string
}

const USOS_GASTO: Record<string, string> = {
  GASTO_SUELDOS: 'Sueldos y Salarios',
  GASTO_SERVICIOS_BASICOS: 'Servicios Básicos (Luz, Agua)',
  GASTO_TELEFONO: 'Teléfono e Internet',
  GASTO_ALQUILER: 'Alquileres',
  GASTO_UTILES: 'Materiales y Útiles de Oficina',
  GASTO_PUBLICIDAD: 'Publicidad y Propaganda',
  GASTO_MANTENIMIENTO: 'Mantenimiento y Reparaciones',
  GASTO_HONORARIOS: 'Honorarios Profesionales',
  GASTO_VIAJE: 'Gastos de Viaje y Representación',
  GASTO_COMBUSTIBLE: 'Combustible y Lubricantes',
  GASTO_FINANCIERO: 'Gastos Financieros',
  GASTO_OTROS: 'Otros Gastos Operacionales',
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
  const [pagoDivisaOCripto, setPagoDivisaOCripto] = useState(false)
  const [pagoEfectivo, setPagoEfectivo] = useState(false)
  const [usoGasto, setUsoGasto] = useState('GASTO_OTROS')
  const [clienteRetieneIVA, setClienteRetieneIVA] = useState(false)
  const [aplicaA, setAplicaA] = useState<'COMPRA' | 'VENTA'>('COMPRA')
  const [tasaManual, setTasaManual] = useState<string>('')
  const [tarifaISLRSeleccionada, setTarifaISLRSeleccionada] = useState('')
  const [tarifaISLRSugerida, setTarifaISLRSugerida] = useState(false)
  const [tarifasISLR, setTarifasISLR] = useState<TarifaISLR[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    apiFetch<{ tarifas: TarifaISLR[] }>('/api/islr/tarifas').then((r) => {
      if (r.ok && r.data) setTarifasISLR(r.data.tarifas)
    })
  }, [])

  if (!empresaActiva) {
    return <div className="p-10 text-center text-slate-500 dark:text-slate-400">Por favor, selecciona una empresa activa para usar el escáner.</div>
  }

  function actualizar<K extends keyof FacturaExtraida>(campo: K, valor: FacturaExtraida[K]) {
    setResultado((r) => (r ? { ...r, [campo]: valor } : r))
  }

  function actualizarParte(parte: 'emisor' | 'receptor', campo: 'nombre' | 'rif', valor: string) {
    setResultado((r) => {
      if (!r) return r
      if (campo === 'rif') {
        const check = validarRIF(valor)
        return { ...r, [parte]: { ...r[parte], rif: valor, rifValido: valor === '' || check.valido } }
      }
      return { ...r, [parte]: { ...r[parte], [campo]: valor } }
    })
  }

  function recalcularIVA() {
    if (!resultado) return
    const montoIVA = calcularIVA(resultado.baseImponible, resultado.alicuotaIVA)
    const total = resultado.baseImponible + resultado.montoExento + resultado.montoExonerado + montoIVA
    setResultado({ ...resultado, montoIVA, total })
  }

  // Al elegir la categoría del gasto, sugerimos automáticamente la tarifa de
  // retención ISLR asociada (tabla de tarifas sin modificar, solo se
  // automatiza encontrarla) para que el usuario no tenga que buscarla en las
  // ~19 filas. Solo se auto-selecciona cuando hay una única tarifa posible
  // para esa categoría; si hay varias (ej. persona natural vs. jurídica en
  // Honorarios) se deja la lista filtrada a esas opciones, mejor que la
  // completa, pero sin adivinar cuál aplica.
  function seleccionarUsoGasto(v: string) {
    setUsoGasto(v)
    const candidatas = tarifasISLR.filter((t) => t.usoGasto === v)
    if (candidatas.length === 1) {
      setTarifaISLRSeleccionada(candidatas[0].codigo)
      setTarifaISLRSugerida(true)
    } else {
      setTarifaISLRSeleccionada('')
      setTarifaISLRSugerida(false)
    }
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
    setFacturaGuardadaId(null)
    const r = await apiFetch<{ resultado: FacturaExtraida }>('/api/facturas/analizar', {
      method: 'POST',
      body: JSON.stringify({ imagen: base64, mimeType }),
    })
    setAnalyzing(false)
    if (!r.ok) {
      toast.error(r.error || 'No se pudo analizar la factura')
      return
    }
    if (!r.data?.resultado) return
    setResultado(r.data.resultado)
    setAplicaA(r.data.resultado.tipoDetectado === 'VENTA' ? 'VENTA' : 'COMPRA')
    toast.success(`Factura analizada (${r.data.resultado.confianza}% confianza)`)
  }

  function registrarManualmente() {
    setImagen(null)
    setResultado({
      tipoDetectado: 'COMPRA',
      emisor: { nombre: '', rif: '', rifValido: true },
      receptor: { nombre: '', rif: '', rifValido: true },
      numeroFactura: '',
      numeroControl: '',
      ncf: '',
      fechaEmision: new Date().toISOString().slice(0, 10),
      monedaOriginal: 'VES',
      baseImponible: 0,
      montoExento: 0,
      montoExonerado: 0,
      alicuotaIVA: 16,
      montoIVA: 0,
      total: 0,
      descripcion: '',
      items: [],
      confianza: 100,
      advertencias: [],
      retencionISLRMonto: null,
      retencionISLRPorcentaje: null,
      retencionISLRBase: null,
    })
    setAplicaA('COMPRA')
  }

  function reset() {
    setImagen(null)
    setResultado(null)
    setFacturaGuardadaId(null)
    setEsInventario(false)
    setUsoGasto('GASTO_OTROS')
    setClienteRetieneIVA(false)
    setAplicaA('COMPRA')
    setTasaManual('')
    setTarifaISLRSeleccionada('')
    setTarifaISLRSugerida(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function guardarFactura() {
    if (!resultado) return
    if (!resultado.emisor.rif && !resultado.receptor.rif) {
      toast.error('Verifica el RIF de la contraparte antes de guardar')
      return
    }
    if (!(resultado.tipoDetectado in TIPOS_FACTURA)) {
      toast.error('No se pudo determinar el tipo de documento. Selecciona "Tipo de documento" antes de guardar.')
      return
    }
    setSaving(true)
    const esNota = resultado.tipoDetectado === 'NOTA_CREDITO' || resultado.tipoDetectado === 'NOTA_DEBITO'
    const esCompra = resultado.tipoDetectado === 'COMPRA' || resultado.tipoDetectado === 'GASTO_MENOR'
      || (esNota && aplicaA === 'COMPRA')
    const contraparte = esCompra ? resultado.emisor : resultado.receptor

    const body: any = {
      tipo: resultado.tipoDetectado,
      rifContraparte: contraparte.rif,
      nombreContraparte: contraparte.nombre,
      numeroFactura: resultado.numeroFactura,
      numeroControl: resultado.numeroControl,
      ncf: resultado.ncf,
      fechaEmision: resultado.fechaEmision,
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
      ncfAfectaVenta: esNota ? aplicaA === 'VENTA' : true,
      pagoDivisaOCripto: esCompra ? pagoDivisaOCripto : false,
      pagoEfectivo: esCompra ? pagoEfectivo : false,
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
    const nuevaFacturaId = r.data?.factura.id || null
    setFacturaGuardadaId(nuevaFacturaId)
    // Se contabiliza automáticamente al guardar para que el libro diario, el
    // mayor, el balance de comprobación y el dashboard queden al día de una
    // vez, sin depender de que el usuario encuentre y pulse un segundo botón.
    if (nuevaFacturaId) await contabilizar(nuevaFacturaId)
  }

  async function contabilizar(idParam?: string) {
    const id = idParam || facturaGuardadaId
    if (!id) return
    setContabilizando(true)
    const r = await apiFetch<{ asiento: { numero: string } }>(`/api/facturas/${id}/contabilizar`, {
      method: 'POST',
      body: JSON.stringify({ esInventario, usoGasto, clienteRetieneIVA, aplicaA }),
    })
    setContabilizando(false)
    if (!r.ok) {
      toast.error(`Factura guardada, pero no se pudo contabilizar automáticamente: ${r.error || 'Error'}. Ajusta las opciones contables y vuelve a intentarlo.`)
      return
    }
    toast.success(`Factura guardada y contabilizada. Asiento #${r.data?.asiento.numero} generado.`)
    reset()
  }

  const esNota = resultado?.tipoDetectado === 'NOTA_CREDITO' || resultado?.tipoDetectado === 'NOTA_DEBITO'
  const esCompraOGasto = resultado?.tipoDetectado === 'COMPRA' || resultado?.tipoDetectado === 'GASTO_MENOR'
  const esVenta = resultado?.tipoDetectado === 'VENTA'
  const requiereTasa = !!resultado && resultado.monedaOriginal !== empresaActiva.monedaFuncional

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Escáner de Facturas</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Sube una foto de la factura, revisa los datos extraídos y contabilízala</p>
        </div>
        {(resultado || imagen) && <Button variant="outline" onClick={reset}>Limpiar</Button>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            {!imagen && !resultado ? (
              <div className="space-y-3">
                <label htmlFor="file-upload" className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer block">
                  <Upload className="mx-auto mb-3" />
                  <p>Haz clic para subir factura</p>
                  <input id="file-upload" ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                </label>
                <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                  o
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                </div>
                <Button variant="outline" className="w-full" onClick={registrarManualmente}>
                  <FileEdit className="w-4 h-4 mr-2" /> Registrar factura manualmente
                </Button>
              </div>
            ) : !imagen && resultado ? (
              <div className="p-12 text-center text-sm text-slate-400 dark:text-slate-500 border-2 border-dashed rounded-lg">
                Registrando factura sin imagen. Completa los datos a la derecha.
              </div>
            ) : (
              <div className="space-y-3">
                <img src={imagen ?? ''} alt="Factura" className="w-full max-h-[400px] object-contain" />
                {analyzing && <p className="text-sm text-slate-500 dark:text-slate-400 text-center">Analizando con IA...</p>}
                <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={analyzing}>Cambiar imagen</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {!resultado && !analyzing && (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-16">Los datos extraídos aparecerán aquí</p>
            )}
            {resultado && (
              <div className="flex flex-col">
              <ScrollArea className="h-[440px] pr-3">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={resultado.confianza >= 70 ? 'default' : 'secondary'}>
                      Confianza: {resultado.confianza}%
                    </Badge>
                    {facturaGuardadaId && <Badge variant="outline">Guardada</Badge>}
                  </div>

                  {resultado.advertencias.length > 0 && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <ul className="list-disc pl-4">
                          {resultado.advertencias.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div>
                    <Label>Tipo de documento</Label>
                    <Select value={resultado.tipoDetectado} onValueChange={(v) => actualizar('tipoDetectado', v)} disabled={!!facturaGuardadaId}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TIPOS_FACTURA).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Emisor (nombre)</Label>
                      <Input value={resultado.emisor.nombre} onChange={(e) => actualizarParte('emisor', 'nombre', e.target.value)} disabled={!!facturaGuardadaId} />
                    </div>
                    <div>
                      <Label>Emisor (RIF)</Label>
                      <Input value={resultado.emisor.rif} onChange={(e) => actualizarParte('emisor', 'rif', e.target.value)} disabled={!!facturaGuardadaId} className={!resultado.emisor.rifValido ? 'border-amber-400' : ''} />
                    </div>
                    <div>
                      <Label>Receptor (nombre)</Label>
                      <Input value={resultado.receptor.nombre} onChange={(e) => actualizarParte('receptor', 'nombre', e.target.value)} disabled={!!facturaGuardadaId} />
                    </div>
                    <div>
                      <Label>Receptor (RIF)</Label>
                      <Input value={resultado.receptor.rif} onChange={(e) => actualizarParte('receptor', 'rif', e.target.value)} disabled={!!facturaGuardadaId} className={!resultado.receptor.rifValido ? 'border-amber-400' : ''} />
                    </div>
                  </div>

                  {esNota && (
                    <div>
                      <Label>¿Esta nota afecta una venta o una compra?</Label>
                      <Select value={aplicaA} onValueChange={(v) => setAplicaA(v as 'COMPRA' | 'VENTA')} disabled={!!facturaGuardadaId}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="COMPRA">Afecta una compra</SelectItem>
                          <SelectItem value="VENTA">Afecta una venta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>N° de factura</Label>
                      <Input value={resultado.numeroFactura} onChange={(e) => actualizar('numeroFactura', e.target.value)} disabled={!!facturaGuardadaId} />
                    </div>
                    <div>
                      <Label>N° de control</Label>
                      <Input value={resultado.numeroControl} onChange={(e) => actualizar('numeroControl', e.target.value)} disabled={!!facturaGuardadaId} />
                    </div>
                    <div>
                      <Label>NCF</Label>
                      <Input value={resultado.ncf} onChange={(e) => actualizar('ncf', e.target.value)} disabled={!!facturaGuardadaId} />
                    </div>
                    <div>
                      <Label>Fecha de emisión</Label>
                      <Input type="date" value={resultado.fechaEmision?.slice(0, 10)} onChange={(e) => actualizar('fechaEmision', e.target.value)} disabled={!!facturaGuardadaId} />
                    </div>
                    <div>
                      <Label>Moneda</Label>
                      <Select value={resultado.monedaOriginal} onValueChange={(v) => actualizar('monedaOriginal', v)} disabled={!!facturaGuardadaId}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="VES">VES (Bolívares)</SelectItem>
                          <SelectItem value="USD">USD (Dólares)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {requiereTasa && (
                      <div>
                        <Label>Tasa de cambio (Bs./USD)</Label>
                        <Input type="number" step="0.01" value={tasaManual} onChange={(e) => setTasaManual(e.target.value)} disabled={!!facturaGuardadaId} placeholder="Requerida" />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Base imponible</Label>
                      <Input type="number" step="0.01" value={resultado.baseImponible} onChange={(e) => actualizar('baseImponible', parseFloat(e.target.value) || 0)} disabled={!!facturaGuardadaId} />
                    </div>
                    <div>
                      <Label>Alícuota IVA (%)</Label>
                      <Input type="number" step="0.01" value={resultado.alicuotaIVA} onChange={(e) => actualizar('alicuotaIVA', parseFloat(e.target.value) || 0)} disabled={!!facturaGuardadaId} />
                    </div>
                    <div>
                      <Label>Monto exento</Label>
                      <Input type="number" step="0.01" value={resultado.montoExento} onChange={(e) => actualizar('montoExento', parseFloat(e.target.value) || 0)} disabled={!!facturaGuardadaId} />
                    </div>
                    <div>
                      <Label>Monto exonerado</Label>
                      <Input type="number" step="0.01" value={resultado.montoExonerado} onChange={(e) => actualizar('montoExonerado', parseFloat(e.target.value) || 0)} disabled={!!facturaGuardadaId} />
                    </div>
                    <div>
                      <Label>Monto IVA</Label>
                      <div className="flex gap-1">
                        <Input type="number" step="0.01" value={resultado.montoIVA} onChange={(e) => actualizar('montoIVA', parseFloat(e.target.value) || 0)} disabled={!!facturaGuardadaId} />
                        {!facturaGuardadaId && (
                          <Button type="button" variant="outline" size="icon" title="Recalcular IVA y total" onClick={recalcularIVA}>
                            <Calculator className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label>Total</Label>
                      <Input type="number" step="0.01" value={resultado.total} onChange={(e) => actualizar('total', parseFloat(e.target.value) || 0)} disabled={!!facturaGuardadaId} />
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {resultado.monedaOriginal === 'USD' ? formatUSD(resultado.total) : formatBs(resultado.total)}
                  </p>

                  <div>
                    <Label>Descripción</Label>
                    <Textarea value={resultado.descripcion} onChange={(e) => actualizar('descripcion', e.target.value)} disabled={!!facturaGuardadaId} rows={2} />
                  </div>

                  {(esCompraOGasto || esVenta) && (
                    <div className="space-y-3 border-t pt-4">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Opciones para generar el asiento contable</p>
                      {esCompraOGasto && (
                        <div className="flex items-center justify-between">
                          <Label htmlFor="esInventario">Es compra de inventario/mercancía</Label>
                          <Switch id="esInventario" checked={esInventario} onCheckedChange={setEsInventario} />
                        </div>
                      )}
                      {esCompraOGasto && !esInventario && (
                        <div>
                          <Label>Categoría del gasto</Label>
                          <Select value={usoGasto} onValueChange={seleccionarUsoGasto}>
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(USOS_GASTO).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {esCompraOGasto && (
                        <div>
                          <Label className="flex items-center gap-1">
                            Tarifa de retención ISLR (si aplica)
                            {tarifaISLRSugerida && tarifaISLRSeleccionada && (
                              <Badge variant="outline" className="text-[10px] gap-1 font-normal"><Sparkles className="w-3 h-3" /> sugerida</Badge>
                            )}
                          </Label>
                          <Select
                            value={tarifaISLRSeleccionada || '__none__'}
                            onValueChange={(v) => { setTarifaISLRSeleccionada(v === '__none__' ? '' : v); setTarifaISLRSugerida(false) }}
                          >
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Sin retención de ISLR</SelectItem>
                              {tarifasISLR.filter((t) => t.usoGasto === usoGasto).length > 1 && (
                                <>
                                  <SelectGroup>
                                    <SelectLabel>Sugeridas para esta categoría</SelectLabel>
                                    {tarifasISLR.filter((t) => t.usoGasto === usoGasto).map((t) => (
                                      <SelectItem key={t.codigo} value={t.codigo}>{t.codigo} — {t.concepto} ({t.porcentaje}%)</SelectItem>
                                    ))}
                                  </SelectGroup>
                                  <SelectSeparator />
                                </>
                              )}
                              {tarifasISLR.map((t) => (
                                <SelectItem key={t.codigo} value={t.codigo}>{t.codigo} — {t.concepto} ({t.porcentaje}%)</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {esVenta && (
                        <div className="flex items-center justify-between">
                          <Label htmlFor="clienteRetieneIVA">El cliente retiene IVA</Label>
                          <Switch id="clienteRetieneIVA" checked={clienteRetieneIVA} onCheckedChange={setClienteRetieneIVA} />
                        </div>
                      )}
                      {esCompraOGasto && (
                        <div className="space-y-2 border-t pt-3">
                          <p className="text-xs text-slate-500 dark:text-slate-400">IGTF (3%, no recuperable) — verifica con tu contador los casos que no cubre esta simplificación</p>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="pagoDivisaOCripto">Pago en divisas o criptomonedas</Label>
                            <Switch id="pagoDivisaOCripto" checked={pagoDivisaOCripto} onCheckedChange={setPagoDivisaOCripto} disabled={!!facturaGuardadaId} />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="pagoEfectivo">Pago en efectivo</Label>
                            <Switch id="pagoEfectivo" checked={pagoEfectivo} onCheckedChange={setPagoEfectivo} disabled={!!facturaGuardadaId} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </ScrollArea>
              <Button className="w-full mt-4 flex-shrink-0" onClick={!facturaGuardadaId ? guardarFactura : () => contabilizar()} disabled={saving || contabilizando}>
                {saving ? 'Guardando...' : contabilizando ? 'Contabilizando...' : !facturaGuardadaId ? 'Guardar y Contabilizar' : 'Reintentar Contabilización'}
              </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
