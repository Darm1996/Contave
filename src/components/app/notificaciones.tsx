'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TableScrollHint } from '@/components/ui/table-scroll-hint'
import { apiFetch, useApp } from '@/lib/store'
import { toast } from 'sonner'
import { Mail, RefreshCw, Send, Loader2, Info } from 'lucide-react'

interface Notificacion {
  id: string
  tipo: string
  destinatario: string
  asunto: string
  cuerpo: string
  estado: string
  errorMensaje: string | null
  enviadaAt: string | null
  createdAt: string
}

const TIPO_LABEL: Record<string, string> = {
  VENCIMIENTO_FISCAL: 'Vencimiento fiscal',
  CXC_VENCIDA: 'Factura vencida (CxC)',
}

function badgeEstado(estado: string) {
  if (estado === 'ENVIADA') return <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:border-emerald-700">Enviada</Badge>
  if (estado === 'ERROR') return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 dark:border-red-700">Error</Badge>
  return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 dark:border-amber-700">Pendiente</Badge>
}

export function Notificaciones() {
  const { user, empresaActiva } = useApp()
  const puedeGestionar = empresaActiva?.rol === 'ADMIN' || empresaActiva?.rol === 'CONTADOR' || user?.role === 'SUPER_ADMIN'
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(true)
  const [generando, setGenerando] = useState(false)
  const [enviandoId, setEnviandoId] = useState<string | null>(null)

  async function cargar() {
    setLoading(true)
    const r = await apiFetch('/api/notificaciones')
    if (r.ok) setNotificaciones(r.data.notificaciones)
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  async function generar() {
    setGenerando(true)
    const r = await apiFetch<{ creadas: number; motivo?: string }>('/api/notificaciones/generar', { method: 'POST' })
    setGenerando(false)
    if (r.ok && r.data) {
      if (r.data.motivo) toast.error(r.data.motivo)
      else toast.success(r.data.creadas > 0 ? `${r.data.creadas} notificación(es) generada(s)` : 'No hay vencimientos ni facturas vencidas nuevas por notificar')
      cargar()
    } else {
      toast.error(r.error || 'Error al generar notificaciones')
    }
  }

  async function enviar(id: string) {
    setEnviandoId(id)
    const r = await apiFetch(`/api/notificaciones/${id}/enviar`, { method: 'POST' })
    setEnviandoId(null)
    if (r.ok) {
      const estado = r.data.notificacion.estado
      if (estado === 'ENVIADA') toast.success('Email enviado')
      else toast.error(r.data.notificacion.errorMensaje || 'No se pudo enviar')
      cargar()
    } else {
      toast.error(r.error || 'Error al enviar')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Mail className="w-6 h-6 text-cyan-600" />
            Notificaciones
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Avisos de vencimientos fiscales próximos y facturas por cobrar vencidas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={cargar}><RefreshCw className="w-4 h-4 mr-1" /> Actualizar</Button>
          {puedeGestionar && (
            <Button size="sm" onClick={generar} disabled={generando}>
              {generando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Generar notificaciones
            </Button>
          )}
        </div>
      </div>

      <Alert className="border-cyan-300 dark:border-cyan-700 bg-cyan-50 dark:bg-cyan-900/20">
        <Info className="w-4 h-4 text-cyan-600" />
        <AlertDescription className="text-cyan-900 dark:text-cyan-200 text-sm">
          El envío real de email requiere conectar un proveedor (recomendado: <strong>Resend</strong>, tiene plan gratuito). Agrega{' '}
          <code className="px-1 rounded bg-cyan-100 dark:bg-cyan-900/40">RESEND_API_KEY</code> como variable de entorno en Vercel y el botón
          "Enviar" empezará a funcionar sin tocar código. Mientras tanto, las notificaciones se generan y quedan visibles aquí con el asunto y
          cuerpo del correo que se enviaría.
        </AlertDescription>
      </Alert>

      <Card>
        <TableScrollHint />
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full min-w-[800px] text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr className="text-left">
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Fecha</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Tipo</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Asunto</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Destinatario</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-center">Estado</th>
                {puedeGestionar && <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300 text-center">Acción</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-6 text-slate-400 dark:text-slate-500">Cargando...</td></tr>
              ) : notificaciones.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-6 text-slate-400 dark:text-slate-500">Sin notificaciones. Usa "Generar notificaciones" para revisar vencimientos y facturas vencidas.</td></tr>
              ) : notificaciones.map((n) => (
                <tr key={n.id} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="px-2 py-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">{new Date(n.createdAt).toLocaleDateString('es-VE')}</td>
                  <td className="px-2 py-2 text-slate-700 dark:text-slate-300">{TIPO_LABEL[n.tipo] || n.tipo}</td>
                  <td className="px-2 py-2 text-slate-700 dark:text-slate-300 max-w-[260px] truncate" title={n.asunto}>{n.asunto}</td>
                  <td className="px-2 py-2 text-slate-500 dark:text-slate-400">{n.destinatario}</td>
                  <td className="px-2 py-2 text-center">
                    {badgeEstado(n.estado)}
                    {n.estado === 'ERROR' && n.errorMensaje && (
                      <div className="text-[10px] text-red-500 mt-1 max-w-[180px]" title={n.errorMensaje}>{n.errorMensaje.slice(0, 60)}</div>
                    )}
                  </td>
                  {puedeGestionar && (
                    <td className="px-2 py-2 text-center">
                      {n.estado !== 'ENVIADA' && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => enviar(n.id)} disabled={enviandoId === n.id}>
                          {enviandoId === n.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                          Enviar
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
