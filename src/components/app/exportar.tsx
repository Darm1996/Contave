'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useApp, apiFetch } from '@/lib/store'
import { toast } from 'sonner'
import { Download, FileSpreadsheet, Cloud, Loader2, CheckCircle2, Info } from 'lucide-react'

export function Exportar() {
  const { empresaActiva } = useApp()
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [exporting, setExporting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [gsEnabled, setGsEnabled] = useState(false)
  const [checkingGs, setCheckingGs] = useState(true)

  useEffect(() => {
    apiFetch<{ habilitado: boolean }>('/api/export/google-sheets')
      .then((r) => { if (r.ok && r.data) setGsEnabled(r.data.habilitado) })
      .finally(() => setCheckingGs(false))
  }, [])

  async function exportExcel() {
    setExporting(true)
    try {
      const res = await fetch('/api/export/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ desde, hasta }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Error al exportar')
        setExporting(false)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ContaVE_${empresaActiva?.rif || 'empresa'}_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Excel descargado con éxito')
    } catch (e: any) {
      toast.error(e.message)
    }
    setExporting(false)
  }

  async function syncGoogleSheets() {
    setSyncing(true)
    const r = await apiFetch('/api/export/google-sheets', {
      method: 'POST',
      body: JSON.stringify({ que: ['facturas', 'diario', 'balance'] }),
    })
    setSyncing(false)
    if (r.ok) {
      toast.success('Sincronización a Google Sheets completada')
    } else {
      toast.error(r.error || 'Error al sincronizar')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Exportar y Sincronizar</h2>
        <p className="text-sm text-slate-500">Descarga el Excel completo o sincroniza con Google Sheets</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Exportar a Excel (.xlsx)
          </CardTitle>
          <CardDescription>
            Genera un libro con 5 hojas: Portada, Facturas, Libro Diario, Libro Mayor y Balance de Comprobación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <Label>Desde (opcional)</Label>
              <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div>
              <Label>Hasta (opcional)</Label>
              <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>
            <Button onClick={exportExcel} disabled={exporting} className="bg-emerald-600 hover:bg-emerald-700">
              {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}
              Descargar Excel
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Si no seleccionas fechas, se exportarán todos los registros de {empresaActiva?.nombre}.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Cloud className="w-4 h-4 text-cyan-600" /> Sincronizar con Google Sheets
          </CardTitle>
          <CardDescription>
            Envía facturas, libro diario y balance a una hoja de cálculo de Google
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {checkingGs ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Verificando configuración...
            </div>
          ) : gsEnabled ? (
            <>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Configurado
                </Badge>
                <span className="text-sm text-slate-600">Google Sheets listo para sincronizar</span>
              </div>
              <Button onClick={syncGoogleSheets} disabled={syncing} className="bg-cyan-600 hover:bg-cyan-700">
                {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Cloud className="w-4 h-4 mr-1" />}
                Sincronizar ahora
              </Button>
            </>
          ) : (
            <Alert>
              <Info className="w-4 h-4" />
              <AlertTitle>Google Sheets no configurado</AlertTitle>
              <AlertDescription className="mt-2">
                <p className="text-sm mb-2">
                  Para habilitar la sincronización, configura estas variables de entorno en el servidor:
                </p>
                <ul className="text-xs font-mono space-y-1 bg-slate-50 p-2 rounded">
                  <li>GOOGLE_SHEETS_CLIENT_EMAIL=tu-sa@proyecto.iam.gserviceaccount.com</li>
                  <li>GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."</li>
                  <li>GOOGLE_SHEETS_SPREADSHEET_ID=1ABC123...</li>
                </ul>
                <p className="text-xs mt-2 text-slate-600">
                  Pasos: 1) Crear Service Account en Google Cloud Console, 2) Habilitar Google Sheets API,
                  3) Compartir el spreadsheet con el email de la SA, 4) Configurar variables de entorno.
                </p>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
