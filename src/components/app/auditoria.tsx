'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TableScrollHint } from '@/components/ui/table-scroll-hint'
import { apiFetch, useApp } from '@/lib/store'
import { ShieldAlert, RefreshCw } from 'lucide-react'

interface Registro {
  id: string
  userEmail: string
  accion: string
  entidad: string | null
  entidadId: string | null
  detalle: string | null
  createdAt: string
}

const ACCIONES: Record<string, { label: string; className: string }> = {
  EJERCICIO_CERRADO: { label: 'Ejercicio cerrado', className: 'bg-red-100 text-red-800 border-red-300 dark:border-red-700' },
  EJERCICIO_REABIERTO: { label: 'Ejercicio reabierto', className: 'bg-amber-100 text-amber-800 border-amber-300 dark:border-amber-700' },
  LIQUIDACION_PROCESADA: { label: 'Liquidación procesada', className: 'bg-red-100 text-red-800 border-red-300 dark:border-red-700' },
  MIEMBRO_AGREGADO: { label: 'Miembro agregado', className: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:border-emerald-700' },
  ROL_CAMBIADO: { label: 'Rol cambiado', className: 'bg-amber-100 text-amber-800 border-amber-300 dark:border-amber-700' },
  MIEMBRO_REMOVIDO: { label: 'Miembro removido', className: 'bg-red-100 text-red-800 border-red-300 dark:border-red-700' },
  EMPRESA_EDITADA: { label: 'Empresa editada', className: 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:border-cyan-700' },
  EMPLEADO_DESACTIVADO: { label: 'Empleado desactivado', className: 'bg-slate-100 text-slate-600 border-slate-300 dark:border-slate-700' },
  PRODUCTO_DESACTIVADO: { label: 'Producto desactivado', className: 'bg-slate-100 text-slate-600 border-slate-300 dark:border-slate-700' },
  ACCIONISTA_DESACTIVADO: { label: 'Accionista desactivado', className: 'bg-slate-100 text-slate-600 border-slate-300 dark:border-slate-700' },
}

export function Auditoria() {
  const { user, empresaActiva } = useApp()
  const esAdmin = empresaActiva?.rol === 'ADMIN' || user?.role === 'SUPER_ADMIN'
  const [registros, setRegistros] = useState<Registro[]>([])
  const [loading, setLoading] = useState(true)

  async function cargar() {
    setLoading(true)
    const r = await apiFetch('/api/auditoria')
    if (r.ok) setRegistros(r.data.registros)
    setLoading(false)
  }
  useEffect(() => { if (esAdmin) cargar() }, [esAdmin])

  if (!esAdmin) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-cyan-600" />
          Auditoría
        </h2>
        <Card><CardContent className="text-center py-8 text-slate-400 dark:text-slate-500">Solo los administradores de la empresa pueden ver el historial de auditoría.</CardContent></Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-cyan-600" />
            Auditoría
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Historial de acciones sensibles: cierres de ejercicio, liquidaciones, cambios de rol, desactivaciones</p>
        </div>
        <Button variant="outline" size="sm" onClick={cargar}><RefreshCw className="w-4 h-4 mr-1" /> Actualizar</Button>
      </div>

      <Card>
        <TableScrollHint />
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full min-w-[750px] text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr className="text-left">
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Fecha</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Usuario</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Acción</th>
                <th className="px-2 py-2 font-semibold text-slate-700 dark:text-slate-300">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-6 text-slate-400 dark:text-slate-500">Cargando...</td></tr>
              ) : registros.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-6 text-slate-400 dark:text-slate-500">Sin registros de auditoría</td></tr>
              ) : registros.map((r) => (
                <tr key={r.id} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="px-2 py-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">{new Date(r.createdAt).toLocaleString('es-VE')}</td>
                  <td className="px-2 py-2 text-slate-700 dark:text-slate-300">{r.userEmail}</td>
                  <td className="px-2 py-2">
                    <Badge variant="outline" className={ACCIONES[r.accion]?.className || 'bg-slate-100 text-slate-600 border-slate-300 dark:border-slate-700'}>
                      {ACCIONES[r.accion]?.label || r.accion}
                    </Badge>
                  </td>
                  <td className="px-2 py-2 text-slate-600 dark:text-slate-400">{r.detalle || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
