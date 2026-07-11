// Retenciones de ISLR (Impuesto Sobre La Renta) - Venezuela
// Tabla de tarifas según Ley de ISLR (Art. 9, 10, 27, 31) y Providencias SNAT
// Tarifas vigentes actualizadas a 2024

export interface TarifaISLR {
  codigo: string
  concepto: string
  porcentaje: number // Porcentaje a retener
  baseImponiblePct: number // Porcentaje de la base sobre la que se aplica (90% = 0.9, 100% = 1.0, etc.)
  sustracto: number // Sustracto en UT (para personas naturales por períodos)
  requiereUT: boolean // Si requiere unidad tributaria
  usoGasto: string // Mapeo a cuenta contable
  notas?: string
}

// Tabla de retenciones ISLR (sujeto activo = empresa que paga)
// Referencia: Ley de ISLR Art. 9, Decreto 1.805 (Providencia SNAT/2008/0197)
// Tabla popularmente conocida como "Tabla de Retenciones ISLR SENIAT"
export const TARIFAS_ISLR: TarifaISLR[] = [
  // ── Honorarios profesionales no mercantiles (Art. 27 L-ISLR) ──
  {
    codigo: '01',
    concepto: 'Honorarios profesionales no mercantiles (médicos, abogados, ingenieros, etc.)',
    porcentaje: 1,
    baseImponiblePct: 0.9, // Se aplica sobre el 90% del pago
    sustracto: 0,
    requiereUT: true, // No se retiene si el pago es menor a 1 UT
    usoGasto: 'GASTO_HONORARIOS',
    notas: 'Persona natural residente. Se aplica sobre el 90% del pago (Art. 27 L-ISLR).',
  },
  {
    codigo: '02',
    concepto: 'Honorarios profesionales no mercantiles - Persona jurídica',
    porcentaje: 2,
    baseImponiblePct: 0.9,
    sustracto: 0,
    requiereUT: true,
    usoGasto: 'GASTO_HONORARIOS',
    notas: 'Sociedades de profesionales. Se aplica sobre el 90% del pago.',
  },
  // ── Servicios (Art. 9 L-ISLR) ──
  {
    codigo: '03',
    concepto: 'Servicios (transporte, limpieza, seguridad, etc.) - Persona natural',
    porcentaje: 2,
    baseImponiblePct: 0.9,
    sustracto: 0,
    requiereUT: true,
    usoGasto: 'GASTO_OTROS',
    notas: 'Se aplica sobre el 90% del pago. Mínimo no sujeto a retención: 1 UT.',
  },
  {
    codigo: '04',
    concepto: 'Servicios - Persona jurídica',
    porcentaje: 2,
    baseImponiblePct: 1.0, // 100% para PJ
    sustracto: 0,
    requiereUT: false,
    usoGasto: 'GASTO_OTROS',
    notas: 'Se aplica sobre el 100% del pago.',
  },
  {
    codigo: '05',
    concepto: 'Servicios de publicidad y propaganda',
    porcentaje: 3,
    baseImponiblePct: 1.0,
    sustracto: 0,
    requiereUT: false,
    usoGasto: 'GASTO_PUBLICIDAD',
  },
  {
    codigo: '06',
    concepto: 'Servicios de salud (clínicas, laboratorios)',
    porcentaje: 1,
    baseImponiblePct: 0.9,
    sustracto: 0,
    requiereUT: true,
    usoGasto: 'GASTO_OTROS',
  },
  // ── Alquileres / Arrendamientos (Art. 27 L-ISLR) ──
  {
    codigo: '07',
    concepto: 'Arrendamiento de inmuebles - Comercial',
    porcentaje: 3,
    baseImponiblePct: 0.95, // 95% del pago
    sustracto: 0,
    requiereUT: false,
    usoGasto: 'GASTO_ALQUILER',
    notas: 'Se retiene el 3% sobre el 95% del pago (Art. 27 L-ISLR, Parágrafo Sexto).',
  },
  {
    codigo: '08',
    concepto: 'Arrendamiento de inmuebles - Vivienda (principal)',
    porcentaje: 0, // No se retiene
    baseImponiblePct: 1.0,
    sustracto: 0,
    requiereUT: false,
    usoGasto: 'GASTO_ALQUILER',
    notas: 'No se retiene ISLR sobre alquileres de vivienda principal (Art. 27 Parágrafo Sexto).',
  },
  {
    codigo: '09',
    concepto: 'Arrendamiento de bienes muebles',
    porcentaje: 2,
    baseImponiblePct: 1.0,
    sustracto: 0,
    requiereUT: false,
    usoGasto: 'GASTO_ALQUILER',
  },
  // ── Comisiones ──
  {
    codigo: '10',
    concepto: 'Comisiones por ventas (vendedores, distribuidores)',
    porcentaje: 3,
    baseImponiblePct: 1.0,
    sustracto: 0,
    requiereUT: false,
    usoGasto: 'GASTO_OTROS',
  },
  {
    codigo: '11',
    concepto: 'Comisiones corredores de seguros',
    porcentaje: 1,
    baseImponiblePct: 1.0,
    sustracto: 0,
    requiereUT: false,
    usoGasto: 'GASTO_OTROS',
  },
  // ── Intereses (Art. 9, 31 L-ISLR) ──
  {
    codigo: '12',
    concepto: 'Intereses de capital (préstamos, financiamiento)',
    porcentaje: 4.95,
    baseImponiblePct: 1.0,
    sustracto: 0,
    requiereUT: false,
    usoGasto: 'GASTO_FINANCIERO',
    notas: '4.95% (5% sobre 99%). Aplica para personas naturales y jurídicas.',
  },
  {
    codigo: '13',
    concepto: 'Intereses pagados a bancos e instituciones financieras',
    porcentaje: 4.95,
    baseImponiblePct: 1.0,
    sustracto: 0,
    requiereUT: false,
    usoGasto: 'GASTO_FINANCIERO',
    notas: 'Bancos actúan como agentes de retención.',
  },
  // ── Seguros ──
  {
    codigo: '14',
    concepto: 'Primas de seguros',
    porcentaje: 5,
    baseImponiblePct: 1.0,
    sustracto: 0,
    requiereUT: false,
    usoGasto: 'GASTO_OTROS',
  },
  // ── royalties ──
  {
    codigo: '15',
    concepto: 'Regalías (royalties) - Persona natural',
    porcentaje: 5,
    baseImponiblePct: 0.9,
    sustracto: 0,
    requiereUT: false,
    usoGasto: 'GASTO_OTROS',
  },
  {
    codigo: '16',
    concepto: 'Regalías (royalties) - Persona jurídica',
    porcentaje: 5,
    baseImponiblePct: 1.0,
    sustracto: 0,
    requiereUT: false,
    usoGasto: 'GASTO_OTROS',
  },
  // ── Otros ──
  {
    codigo: '17',
    concepto: 'Compra de bienes a productores agrícolas',
    porcentaje: 0, // No se retiene generalmente
    baseImponiblePct: 1.0,
    sustracto: 0,
    requiereUT: false,
    usoGasto: 'MERCANCIA',
    notas: 'Solo si el vendedor es persona natural sin RIF válido.',
  },
  {
    codigo: '18',
    concepto: 'Gastos de representación',
    porcentaje: 3,
    baseImponiblePct: 1.0,
    sustracto: 0,
    requiereUT: false,
    usoGasto: 'GASTO_VIAJE',
  },
  {
    codigo: '19',
    concepto: 'Enriquecimientos obtenidos por contribuyentes no residentes',
    porcentaje: 34,
    baseImponiblePct: 1.0,
    sustracto: 0,
    requiereUT: false,
    usoGasto: 'GASTO_OTROS',
    notas: 'Tasa proporcional para no residentes (Art. 9 L-ISLR).',
  },
]

// Valor de la Unidad Tributaria (UT) vigente
// Última actualización: Providencia SNAT/2024/000012 (28/02/2024) - 9 Bs.
export const UT_VIGENTE_BS = 9.0

// Calcular la retención de ISLR
export function calcularRetencionISLR(
  montoPago: number,
  tarifa: TarifaISLR,
  utActual: number = UT_VIGENTE_BS,
): { baseImponible: number; montoRetenido: number; aplicaRetencion: boolean; motivo: string } {
  // Calcular base imponible según el porcentaje
  const baseImponible = montoPago * tarifa.baseImponiblePct
  // Calcular monto a retener
  const montoRetenido = Math.round(baseImponible * tarifa.porcentaje) / 100
  // Verificar si aplica retención
  if (tarifa.porcentaje === 0) {
    return { baseImponible, montoRetenido: 0, aplicaRetencion: false, motivo: 'Tarifa exenta de retención' }
  }
  if (tarifa.requiereUT && montoPago < utActual) {
    return { baseImponible, montoRetenido: 0, aplicaRetencion: false, motivo: `Pago menor a 1 UT (${utActual} Bs.) - no se retiene` }
  }
  return {
    baseImponible,
    montoRetenido,
    aplicaRetencion: true,
    motivo: `${tarifa.porcentaje}% sobre ${tarifa.baseImponiblePct * 100}% del pago`,
  }
}

// Buscar tarifa por código
export function buscarTarifaISLR(codigo: string): TarifaISLR | null {
  return TARIFAS_ISLR.find((t) => t.codigo === codigo) || null
}

// Buscar tarifa por uso de gasto
export function buscarTarifaPorUsoGasto(usoGasto: string): TarifaISLR | null {
  return TARIFAS_ISLR.find((t) => t.usoGasto === usoGasto) || null
}

// Listar todas las tarifas agrupadas por categoría
export function listarTarifasPorCategoria(): Record<string, TarifaISLR[]> {
  const cats: Record<string, TarifaISLR[]> = {
    'Honorarios': [],
    'Servicios': [],
    'Arrendamientos': [],
    'Comisiones': [],
    'Intereses': [],
    'Seguros': [],
    'Regalías': [],
    'Otros': [],
  }
  for (const t of TARIFAS_ISLR) {
    if (t.codigo.startsWith('0')) cats['Honorarios'].push(t)
    else if (t.codigo.startsWith('1')) cats['Otros'].push(t)
    else if (t.concepto.includes('servicio') || t.concepto.includes('Servicio')) cats['Servicios'].push(t)
    else if (t.concepto.includes('rendamiento')) cats['Arrendamientos'].push(t)
    else if (t.concepto.includes('omision')) cats['Comisiones'].push(t)
    else if (t.concepto.includes('nterés') || t.concepto.includes('ntereses')) cats['Intereses'].push(t)
    else if (t.concepto.includes('eguro')) cats['Seguros'].push(t)
    else if (t.concepto.includes('egalí')) cats['Regalías'].push(t)
    else cats['Otros'].push(t)
  }
  return cats
}
