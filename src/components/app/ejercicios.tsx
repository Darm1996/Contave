'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { formatBs } from '@/lib/contabilidad/ven-nif'
import { useApp, apiFetch } from '@/lib/store'
import { toast } from 'sonner'
import { Calendar, Lock, Unlock, RefreshCw, Loader2, FileText, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'

interface Ejercicio {
  id: string
  ano: number
  estado: string
  fechaInicio: string
  fechaCierre: string
  utilidadNeta: number | null
  islrEstimado: number | null
  cerradoEn: string | null
}

export function Ejercicios() {
  const { user } = useApp()
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showCerrarConfirm, setShowCerrarConfirm] = useState<number | null>(null)

  async function cargar() {
    setLoading(true)
    const r = await apiFetch('/api/ejercicios')
    if (r.ok && r.data?.ejercicios) setEjercicios(r.data.ejercicios)
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  async function crearEjercicio(ano: number) {
    const r = await apiFetch('/api/ejercicios', {
      method: 'POST',
      body: JSON.stringify({ ano }),
    })
    if (r.ok) {
      toast.success(`Ejercicio ${ano} creado`)
      cargar()
    } else {
      toast.error(r.error || 'Error')
    }
  }

  async function cerrarEjercicio(ano: number) {
    setActionLoading(`cerrar-${ano}`)
    try {
      const r = await apiFetch(`/api/ejercicios/${ano}/cerrar`, { method: 'POST' })
      if (r.ok) {
        const d = r.data
        toast.success(
          `Ejercicio ${ano} cerrado. Utilidad neta: ${formatBs(d.utilidadNeta)}. ` +
          `Asiento de cierre #${d.asientoCierre.numero} (${d.asientoCierre.lineas} líneas). ` +
          (d.asientoApertura ? `Apertura #${d.asientoApertura.numero} para ${ano + 1}.` : '')
        )
        setShowCerrarConfirm(null)
        cargar()
      } else {
        toast.error(r.error || 'Error al cerrar ejercicio')
      }
    } catch (e: any) {
      toast.error(e.message)
    }
    setActionLoading(null)
  }

  async function reabrirEjercicio(ano: number) {
    if (!confirm(`¿Reabrir el ejercicio ${ano}? Se eliminarán los asientos de cierre y apertura generados.`)) return
    setActionLoading(`reabrir-${ano}`)
    const r = await apiFetch(`/api/ejercicios/${ano}/reabrir`, { method: 'POST' })
    if (r.ok) {
      toast.success(`Ejercicio ${ano} reabierto`)
      cargar()
    } else {
      toast.error(r.error || 'Error')
    }
    setActionLoading(null)
  }

  const anoActual = new Date().getFullYear()
  const ejerciciosFaltantes = [anoActual - 1, anoActual, anoActual + 1].filter(
    (a) => !ejercicios.find((e) => e.ano === a)
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-emerald-600" />
            Ejercicios Fiscales
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gestiona cierres anuales y aperturas de nuevos ejercicios</p>
        </div>
        <Button variant="outline" size="sm" onClick={cargar}><RefreshCw className="w-4 h-4 mr-1" /> Actualizar</Button>
      </div>

      {/* Alerta informativa */}
      <Alert>
        <FileText className="w-4 h-4" />
        <AlertTitle>¿Cómo funciona el cierre de ejercicio?</AlertTitle>
        <AlertDescription className="text-sm">
          Al cerrar un ejercicio, el sistema genera automáticamente:
          <ul className="list-disc pl-5 mt-1 space-y-0.5">
            <li><strong>Asiento de cierre:</strong> cancela todas las cuentas de ingresos, costos y gastos contra la cuenta de Utilidad/Pérdida del Ejercicio</li>
            <li><strong>Provisión de ISLR:</strong> calcula el 34% sobre la utilidad antes de ISLR y lo registra como ISLR por pagar</li>
            <li><strong>Asiento de apertura:</strong> traspasa los saldos de activo, pasivo y patrimonio (incluyendo la utilidad/pérdida) al nuevo ejercicio</li>
          </ul>
          Después del cierre, el ejercicio queda bloqueado para cambios. Puedes reabrirlo si necesitas corregir algo.
        </AlertDescription>
      </Alert>

      {/* Crear ejercicios faltantes */}
      {ejerciciosFaltantes.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-sm font-semibold text-amber-800">Ejercicios pendientes por crear</div>
                <div className="text-xs text-amber-700">Años: {ejerciciosFaltantes.join(', ')}</div>
              </div>
              <div className="flex gap-2">
                {ejerciciosFaltantes.map((ano) => (
                  <Button key={ano} size="sm" variant="outline" onClick={() => crearEjercicio(ano)}>
                    Crear {ano}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de ejercicios */}
      {loading ? (
        <Card><CardContent className="text-center py-8 text-slate-400 dark:text-slate-500">Cargando...</CardContent></Card>
      ) : ejercicios.length === 0 ? (
        <Card><CardContent className="text-center py-8 text-slate-400 dark:text-slate-500">No hay ejercicios. Crea el primero arriba.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {ejercicios.map((e) => (
            <Card key={e.id} className={e.estado === 'CERRADO' ? 'opacity-75' : ''}>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-xl ${
                      e.estado === 'CERRADO' ? 'bg-slate-200 text-slate-600 dark:text-slate-400' : 'bg-gradient-to-br from-emerald-500 to-cyan-600 text-white'
                    }`}>
                      {e.ano}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Ejercicio {e.ano}</h3>
                        <Badge variant={e.estado === 'CERRADO' ? 'secondary' : 'default'}
                          className={e.estado === 'CERRADO' ? 'bg-slate-200' : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:border-emerald-700'}>
                          {e.estado === 'CERRADO' ? <Lock className="w-3 h-3 mr-1" /> : <Unlock className="w-3 h-3 mr-1" />}
                          {e.estado}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {new Date(e.fechaInicio).toLocaleDateString('es-VE')} — {new Date(e.fechaCierre).toLocaleDateString('es-VE')}
                        {e.cerradoEn && ` · Cerrado el ${new Date(e.cerradoEn).toLocaleDateString('es-VE')}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {e.estado === 'CERRADO' && e.utilidadNeta !== null && (
                      <div className="text-right">
                        <div className="text-xs text-slate-500 dark:text-slate-400">Utilidad neta</div>
                        <div className={`text-lg font-bold ${e.utilidadNeta >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                          {formatBs(e.utilidadNeta)}
                        </div>
                        {e.islrEstimado && e.islrEstimado > 0 && (
                          <div className="text-xs text-amber-700">ISLR: {formatBs(e.islrEstimado)}</div>
                        )}
                      </div>
                    )}
                    {e.estado === 'ABIERTO' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCerrarConfirm(e.ano)}
                        disabled={actionLoading === `cerrar-${e.ano}`}
                      >
                        {actionLoading === `cerrar-${e.ano}`
                          ? <Loader2 className="w-4 h-4 animate-spin mr-1" />
                          : <Lock className="w-4 h-4 mr-1" />}
                        Cerrar ejercicio
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => reabrirEjercicio(e.ano)}
                        disabled={actionLoading === `reabrir-${e.ano}`}
                      >
                        {actionLoading === `reabrir-${e.ano}`
                          ? <Loader2 className="w-4 h-4 animate-spin mr-1" />
                          : <Unlock className="w-4 h-4 mr-1" />}
                        Reabrir
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de confirmación de cierre */}
      {showCerrarConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCerrarConfirm(null)}>
          <Card className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Confirmar cierre del ejercicio {showCerrarConfirm}
              </CardTitle>
              <CardDescription>
                Esta acción generará asientos contables automáticos y bloqueará el ejercicio.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md text-sm space-y-2">
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600 mt-0.5" />
                  <span>Se cancelarán todas las cuentas de <strong>ingresos</strong> del año</span>
                </div>
                <div className="flex items-start gap-2">
                  <TrendingDown className="w-4 h-4 text-red-600 mt-0.5" />
                  <span>Se cancelarán todas las cuentas de <strong>costos y gastos</strong></span>
                </div>
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-cyan-600 mt-0.5" />
                  <span>Se calculará y provisionará el <strong>ISLR estimado (34%)</strong></span>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-purple-600 mt-0.5" />
                  <span>Se generará el <strong>asiento de apertura</strong> para {showCerrarConfirm + 1}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => cerrarEjercicio(showCerrarConfirm)}
                  disabled={actionLoading === `cerrar-${showCerrarConfirm}`}
                >
                  {actionLoading === `cerrar-${showCerrarConfirm}` && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                  Sí, cerrar ejercicio
                </Button>
                <Button variant="outline" onClick={() => setShowCerrarConfirm(null)}>Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
