'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { apiFetch, useApp } from '@/lib/store'
import { CalendarClock, RefreshCw, AlertTriangle, Settings } from 'lucide-react'

interface Vencimiento {
  tipo: string
  descripcion: string
  fecha: string
  diasRestantes: number
  urgente: boolean
  vencido: boolean
}

export function VencimientosFiscales() {
  const { setTab } = useApp()
  const [vencimientos, setVencimientos] = useState<Vencimiento[]>([])
  const [loading, setLoading] = useState(true)

  async function cargar() {
    setLoading(true)
    const r = await apiFetch<{ vencimientos: Vencimiento[] }>('/api/vencimientos-fiscales')
    if (r.ok && r.data) setVencimientos(r.data.vencimientos)
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-cyan-600" />
            Calendario Fiscal
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Próximos vencimientos ante el SENIAT</p>
        </div>
        <Button variant="outline" size="sm" onClick={cargar}><RefreshCw className="w-4 h-4 mr-1" /> Actualizar</Button>
      </div>

      <Alert>
        <AlertTriangle className="w-4 h-4" />
        <AlertDescription className="text-sm">
          Las fechas de IVA se calculan con el día que configuraste en <button className="underline font-medium" onClick={() => setTab('configuracion')}>Configuración</button> (el SENIAT publica un calendario distinto cada año según el último dígito de tu RIF). Las demás fechas son días calendario, no hábiles — verificalas contra el calendario oficial antes de una fecha límite importante.
        </AlertDescription>
      </Alert>

      <div className="space-y-3">
        {loading ? (
          <Card><CardContent className="text-center py-8 text-slate-400 dark:text-slate-500">Cargando...</CardContent></Card>
        ) : vencimientos.length === 0 ? (
          <Card><CardContent className="text-center py-8 text-slate-400 dark:text-slate-500">Sin vencimientos próximos</CardContent></Card>
        ) : vencimientos.map((v, i) => (
          <Card key={i} className={v.urgente ? 'border-l-4 border-l-red-500' : v.vencido ? 'border-l-4 border-l-slate-400' : 'border-l-4 border-l-cyan-500'}>
            <CardContent className="pt-4 flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="font-medium text-slate-800 dark:text-slate-100">{v.descripcion}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {new Date(v.fecha).toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <Badge className={
                v.vencido ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' :
                v.urgente ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300' :
                'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-900/40 dark:text-cyan-300'
              }>
                {v.vencido ? 'Vencido' : v.diasRestantes === 0 ? 'Hoy' : `En ${v.diasRestantes} día(s)`}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={() => setTab('configuracion')}>
        <Settings className="w-4 h-4 mr-1" /> Ajustar día de vencimiento de IVA
      </Button>
    </div>
  )
}
