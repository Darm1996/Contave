'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search } from 'lucide-react'

interface Cuenta {
  id: string
  codigo: string
  nombre: string
  tipo: string
  naturaleza: string
  nivel: number
  imputable: boolean
  uso: string | null
}

const TIPO_COLOR: Record<string, string> = {
  ACTIVO: 'bg-emerald-100 text-emerald-800',
  PASIVO: 'bg-red-100 text-red-800',
  PATRIMONIO: 'bg-purple-100 text-purple-800',
  INGRESO: 'bg-cyan-100 text-cyan-800',
  COSTO: 'bg-amber-100 text-amber-800',
  GASTO: 'bg-orange-100 text-orange-800',
}

export function PlanCuentas() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [filtro, setFiltro] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/cuentas')
      .then((r) => r.json())
      .then((d) => { if (!d.error) setCuentas(d.cuentas) })
      .finally(() => setLoading(false))
  }, [])

  const filtradas = cuentas.filter((c) => {
    if (!filtro) return true
    const s = `${c.codigo} ${c.nombre} ${c.uso || ''} ${c.tipo}`.toLowerCase()
    return s.includes(filtro.toLowerCase())
  })

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Plan de Cuentas — VEN-NIF Pymes</h2>
        <p className="text-sm text-slate-500">{cuentas.length} cuentas en el catálogo</p>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Buscar por código, nombre o uso..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-100 z-10">
                <tr className="text-left">
                  <th className="px-3 py-2 font-semibold text-slate-700">Código</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Cuenta</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Tipo</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Naturaleza</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Uso (auto-mapeo)</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-8 text-slate-400">Cargando...</td></tr>
                ) : filtradas.map((c) => {
                  const indent = (c.codigo.split('.').length - 1) * 16
                  const esTitulo = !c.imputable
                  return (
                    <tr key={c.id} className={`border-t hover:bg-slate-50 ${esTitulo ? 'bg-slate-50 font-semibold' : ''}`}>
                      <td className="px-3 py-2 font-mono text-xs text-slate-600">{c.codigo}</td>
                      <td className="px-3 py-2 text-slate-800" style={{ paddingLeft: `${12 + indent}px` }}>
                        {c.nombre}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${TIPO_COLOR[c.tipo] || 'bg-slate-100'}`}>
                          {c.tipo}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-xs">{c.naturaleza}</Badge>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500 font-mono">{c.uso || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
