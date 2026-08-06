'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatBs } from '@/lib/contabilidad/ven-nif'
import { apiFetch } from '@/lib/store'
import { exportarExcelCliente } from '@/lib/exports/cliente'
import { FileBarChart, RefreshCw, Download, Info } from 'lucide-react'

interface Declaracion {
  ano: number
  utValor: number
  utilidadContable: number
  igtfNoDeducible: number
  partidasNoDeduciblesManual: number
  partidasExentas: number
  rentaNetaGravable: number
  rentaGravableUT: number
  tramoAplicado: { hastaUT: number | null; tarifaPct: number; sustraendoUT: number }
  impuestoDeterminadoBs: number
  anticiposRetenciones: number
  islrPorPagar: number
  islrAFavor: number
}

export function DeclaracionISLRAnual() {
  const [ano, setAno] = useState(new Date().getFullYear())
  const [partidasNoDeducibles, setPartidasNoDeducibles] = useState('0')
  const [partidasExentas, setPartidasExentas] = useState('0')
  const [declaracion, setDeclaracion] = useState<Declaracion | null>(null)
  const [loading, setLoading] = useState(true)

  async function cargar() {
    setLoading(true)
    const r = await apiFetch<{ declaracion: Declaracion }>(
      `/api/declaracion-islr-anual?ano=${ano}&partidasNoDeducibles=${partidasNoDeducibles || 0}&partidasExentas=${partidasExentas || 0}`,
    )
    if (r.ok && r.data) setDeclaracion(r.data.declaracion)
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  function exportar() {
    if (!declaracion) return
    exportarExcelCliente(`DeclaracionISLR_${ano}.xlsx`, [{
      nombre: 'Declaración Anual ISLR',
      columnas: [
        { header: 'Concepto', key: 'concepto', width: 40 },
        { header: 'Monto', key: 'monto', width: 18, numFmt: '#,##0.00' },
      ],
      filas: [
        { concepto: 'Utilidad contable antes de ISLR', monto: declaracion.utilidadContable },
        { concepto: '(+) IGTF del período (no deducible)', monto: declaracion.igtfNoDeducible },
        { concepto: '(+) Otras partidas no deducibles', monto: declaracion.partidasNoDeduciblesManual },
        { concepto: '(-) Partidas exentas/exoneradas', monto: -declaracion.partidasExentas },
        { concepto: 'RENTA NETA GRAVABLE', monto: declaracion.rentaNetaGravable },
        { concepto: `Renta gravable en UT (UT = Bs. ${declaracion.utValor})`, monto: declaracion.rentaGravableUT },
        { concepto: `Tarifa aplicada: ${declaracion.tramoAplicado.tarifaPct}% - sustraendo ${declaracion.tramoAplicado.sustraendoUT} UT`, monto: 0 },
        { concepto: 'IMPUESTO DETERMINADO', monto: declaracion.impuestoDeterminadoBs },
        { concepto: '(-) Anticipos / retenciones ISLR soportadas en el año', monto: -declaracion.anticiposRetenciones },
        { concepto: 'ISLR POR PAGAR', monto: declaracion.islrPorPagar },
        { concepto: 'ISLR A FAVOR (excedente de retenciones)', monto: declaracion.islrAFavor },
      ],
    }])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-cyan-600" />
            Declaración Anual de ISLR
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Renta neta gravable y tarifa progresiva para personas jurídicas (Art. 52 Ley ISLR)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={cargar}><RefreshCw className="w-4 h-4 mr-1" /> Actualizar</Button>
          <Button variant="outline" size="sm" onClick={exportar} disabled={!declaracion}><Download className="w-4 h-4 mr-1" /> Exportar Excel</Button>
        </div>
      </div>

      <Alert className="border-cyan-300 dark:border-cyan-700 bg-cyan-50 dark:bg-cyan-900/20">
        <Info className="w-4 h-4 text-cyan-600" />
        <AlertDescription className="text-cyan-900 dark:text-cyan-200 text-sm">
          La conciliación fiscal automática solo ajusta el IGTF del período (no deducible por ley). Agrega manualmente cualquier
          otra partida no deducible (multas, gastos sin comprobación) o exenta/exonerada que aplique a tu empresa antes de presentar la declaración definitiva.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <Label>Ejercicio fiscal (año)</Label>
            <Input type="number" value={ano} onChange={(e) => setAno(parseInt(e.target.value) || ano)} />
          </div>
          <div>
            <Label>Otras partidas no deducibles (Bs.)</Label>
            <Input type="number" value={partidasNoDeducibles} onChange={(e) => setPartidasNoDeducibles(e.target.value)} />
          </div>
          <div>
            <Label>Partidas exentas/exoneradas (Bs.)</Label>
            <Input type="number" value={partidasExentas} onChange={(e) => setPartidasExentas(e.target.value)} />
          </div>
          <Button onClick={cargar}>Recalcular</Button>
        </CardContent>
      </Card>

      {loading ? (
        <Card><CardContent className="text-center py-8 text-slate-400 dark:text-slate-500">Calculando...</CardContent></Card>
      ) : declaracion && (
        <Card>
          <CardHeader className="pb-3 bg-slate-50 dark:bg-slate-900">
            <CardTitle className="text-base">Conciliación fiscal del ejercicio {declaracion.ano}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <Fila label="Utilidad contable antes de ISLR" valor={declaracion.utilidadContable} />
            <Fila label="(+) IGTF del período (no deducible)" valor={declaracion.igtfNoDeducible} />
            <Fila label="(+) Otras partidas no deducibles" valor={declaracion.partidasNoDeduciblesManual} />
            <Fila label="(-) Partidas exentas/exoneradas" valor={-declaracion.partidasExentas} />
            <div className="border-t-2 pt-2 mt-2">
              <Fila label="RENTA NETA GRAVABLE" valor={declaracion.rentaNetaGravable} bold />
            </div>

            <div className="pt-4 pb-1 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Tarifa N° 2 (Art. 52 Ley ISLR)</div>
            <div className="text-sm text-slate-600 dark:text-slate-400 pl-3">
              Renta gravable: {declaracion.rentaGravableUT.toLocaleString('es-VE')} UT (UT = {formatBs(declaracion.utValor)})
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 pl-3">
              Tramo aplicado: {declaracion.tramoAplicado.tarifaPct}% menos sustraendo de {declaracion.tramoAplicado.sustraendoUT} UT
            </div>
            <div className="border-t-2 pt-2 mt-2">
              <Fila label="IMPUESTO DETERMINADO" valor={declaracion.impuestoDeterminadoBs} bold className="text-amber-700" />
            </div>

            <Fila label="(-) Anticipos / retenciones ISLR soportadas en el año" valor={-declaracion.anticiposRetenciones} />

            <div className="border-t-2 pt-3 mt-3 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-md space-y-1">
              {declaracion.islrPorPagar > 0 ? (
                <Fila label="ISLR POR PAGAR" valor={declaracion.islrPorPagar} bold className="text-xl text-red-700" />
              ) : (
                <Fila label="ISLR A FAVOR (excedente de retenciones)" valor={declaracion.islrAFavor} bold className="text-xl text-emerald-800" />
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Fila({ label, valor, bold = false, className = '' }: { label: string; valor: number; bold?: boolean; className?: string }) {
  return (
    <div className={`flex justify-between text-sm py-1 ${bold ? 'font-bold text-base' : ''} ${className}`}>
      <span className={bold ? '' : 'text-slate-600 dark:text-slate-400'}>{label}</span>
      <span className={`font-mono ${valor < 0 ? 'text-red-600' : ''}`}>{formatBs(valor)}</span>
    </div>
  )
}
