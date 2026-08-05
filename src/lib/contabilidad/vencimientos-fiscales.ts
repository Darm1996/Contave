// Calendario de vencimientos fiscales. Simplificación: usa días calendario
// (no hábiles) porque no tenemos el calendario oficial de feriados/SENIAT del
// año en curso — el usuario debe verificar la fecha exacta contra el
// calendario oficial que publica el SENIAT para su grupo de RIF, sobre todo
// si es contribuyente especial (el día exacto lo define esa empresa en
// Configuración: Empresa.diaVencimientoIVA).

export interface VencimientoFiscal {
  tipo: string
  descripcion: string
  fecha: Date
  diasRestantes: number
  urgente: boolean // <= 5 días
  vencido: boolean
}

function diasEntre(desde: Date, hasta: Date): number {
  const msPorDia = 1000 * 60 * 60 * 24
  const a = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate())
  const b = new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate())
  return Math.round((b.getTime() - a.getTime()) / msPorDia)
}

function construirVencimiento(tipo: string, descripcion: string, fecha: Date, hoy: Date): VencimientoFiscal {
  const diasRestantes = diasEntre(hoy, fecha)
  return {
    tipo,
    descripcion,
    fecha,
    diasRestantes,
    urgente: diasRestantes >= 0 && diasRestantes <= 5,
    vencido: diasRestantes < 0,
  }
}

export interface EmpresaVencimientos {
  diaVencimientoIVA: number
}

export interface EjercicioVencimiento {
  ano: number
  estado: string
  fechaCierre: Date
}

// Próximo vencimiento mensual de Declaración de IVA: día `diaVencimientoIVA`
// del mes siguiente al período que se declara. Si ya pasó este mes, se
// calcula el del mes próximo.
function proximoVencimientoIVA(empresa: EmpresaVencimientos, hoy: Date): VencimientoFiscal {
  const dia = Math.min(Math.max(empresa.diaVencimientoIVA || 15, 1), 28)
  let candidato = new Date(hoy.getFullYear(), hoy.getMonth(), dia)
  if (diasEntre(hoy, candidato) < 0) {
    candidato = new Date(hoy.getFullYear(), hoy.getMonth() + 1, dia)
  }
  const mesDeclarado = new Date(candidato.getFullYear(), candidato.getMonth() - 1, 1)
  const nombreMes = mesDeclarado.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' })
  return construirVencimiento('IVA', `Declaración y pago de IVA — período ${nombreMes}`, candidato, hoy)
}

// Retenciones de ISLR: deben enterarse dentro de los primeros 3 días
// calendario del mes siguiente (aproximación; el reglamento habla de días
// hábiles, no calendario).
function proximoVencimientoRetencionesISLR(hoy: Date): VencimientoFiscal {
  let candidato = new Date(hoy.getFullYear(), hoy.getMonth(), 3)
  if (diasEntre(hoy, candidato) < 0) {
    candidato = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 3)
  }
  const mesDeclarado = new Date(candidato.getFullYear(), candidato.getMonth() - 1, 1)
  const nombreMes = mesDeclarado.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' })
  return construirVencimiento('ISLR_RETENCION', `Enterar retenciones de ISLR — período ${nombreMes}`, candidato, hoy)
}

// Cierre de ejercicio fiscal y declaración anual de ISLR (3 meses calendario
// después del cierre, Art. 82 Ley de ISLR), a partir del ejercicio abierto.
function vencimientosEjercicio(ejercicioAbierto: EjercicioVencimiento | undefined, hoy: Date): VencimientoFiscal[] {
  if (!ejercicioAbierto) return []
  const resultado: VencimientoFiscal[] = []
  resultado.push(construirVencimiento(
    'CIERRE_EJERCICIO',
    `Cierre del ejercicio fiscal ${ejercicioAbierto.ano}`,
    ejercicioAbierto.fechaCierre,
    hoy,
  ))
  const declaracionAnual = new Date(ejercicioAbierto.fechaCierre)
  declaracionAnual.setMonth(declaracionAnual.getMonth() + 3)
  resultado.push(construirVencimiento(
    'ISLR_ANUAL',
    `Declaración anual de ISLR — ejercicio ${ejercicioAbierto.ano}`,
    declaracionAnual,
    hoy,
  ))
  return resultado
}

export function calcularProximosVencimientos(
  empresa: EmpresaVencimientos,
  ejercicioAbierto: EjercicioVencimiento | undefined,
  hoy: Date = new Date(),
): VencimientoFiscal[] {
  const lista = [
    proximoVencimientoIVA(empresa, hoy),
    proximoVencimientoRetencionesISLR(hoy),
    ...vencimientosEjercicio(ejercicioAbierto, hoy),
  ]
  return lista.sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
}
