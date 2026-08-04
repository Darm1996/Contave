// Catálogo VEN-NIF Pymes adaptado al contexto venezolano, usado como plan de
// cuentas inicial estándar para toda empresa nueva (scripts/seed.ts y el
// endpoint POST /api/empresas). Formato código: Grupo.Subgrupo.Cuenta.Subcuenta
// El campo "uso" permite mapear automáticamente los asientos contables.
export interface CuentaPlanVenNif {
  codigo: string
  nombre: string
  tipo: string
  naturaleza: string
  nivel: number
  imputable?: boolean
  uso?: string
  // Ajuste por inflación: false = partida no monetaria (se reexpresa). Omitir = monetaria (true).
  monetaria?: boolean
}

export const CUENTAS_VEN_NIF: CuentaPlanVenNif[] = [
  // ── ACTIVO ──
  { codigo: '1', nombre: 'ACTIVO', tipo: 'ACTIVO', naturaleza: 'DEUDORA', nivel: 1, imputable: false },
  { codigo: '1.1', nombre: 'Activo Corriente', tipo: 'ACTIVO', naturaleza: 'DEUDORA', nivel: 2, imputable: false },
  { codigo: '1.1.1', nombre: 'Efectivo y Equivalentes', tipo: 'ACTIVO', naturaleza: 'DEUDORA', nivel: 3, imputable: false },
  { codigo: '1.1.1.01', nombre: 'Caja', tipo: 'ACTIVO', naturaleza: 'DEUDORA', nivel: 4, uso: 'CAJA' },
  { codigo: '1.1.1.02', nombre: 'Bancos - Cuenta Corriente Bs.', tipo: 'ACTIVO', naturaleza: 'DEUDORA', nivel: 4, uso: 'BANCOS_BS' },
  { codigo: '1.1.1.03', nombre: 'Bancos - Cuenta Corriente USD', tipo: 'ACTIVO', naturaleza: 'DEUDORA', nivel: 4, uso: 'BANCOS_USD' },
  { codigo: '1.1.1.04', nombre: 'Caja Chica', tipo: 'ACTIVO', naturaleza: 'DEUDORA', nivel: 4, uso: 'CAJA_CHICA' },
  { codigo: '1.1.2', nombre: 'Cuentas por Cobrar Comerciales', tipo: 'ACTIVO', naturaleza: 'DEUDORA', nivel: 3, imputable: false },
  { codigo: '1.1.2.01', nombre: 'Clientes', tipo: 'ACTIVO', naturaleza: 'DEUDORA', nivel: 4, uso: 'CXC_CLIENTES' },
  { codigo: '1.1.2.02', nombre: 'Cuentas por Cobrar Diversas', tipo: 'ACTIVO', naturaleza: 'DEUDORA', nivel: 4, uso: 'CXC_DIVERSAS' },
  { codigo: '1.1.3', nombre: 'Créditos Fiscales IVA', tipo: 'ACTIVO', naturaleza: 'DEUDORA', nivel: 3, imputable: false },
  { codigo: '1.1.3.01', nombre: 'IVA Crédito Fiscal (16%)', tipo: 'ACTIVO', naturaleza: 'DEUDORA', nivel: 4, uso: 'IVA_CREDITO_FISCAL' },
  { codigo: '1.1.3.02', nombre: 'Retenciones de IVA Soportadas', tipo: 'ACTIVO', naturaleza: 'DEUDORA', nivel: 4, uso: 'RET_IVA_SOPORTADA' },
  { codigo: '1.1.4', nombre: 'Inventario', tipo: 'ACTIVO', naturaleza: 'DEUDORA', nivel: 3, imputable: false },
  { codigo: '1.1.4.01', nombre: 'Mercancía para la Venta', tipo: 'ACTIVO', naturaleza: 'DEUDORA', nivel: 4, uso: 'MERCANCIA', monetaria: false },
  { codigo: '1.2', nombre: 'Activo No Corriente', tipo: 'ACTIVO', naturaleza: 'DEUDORA', nivel: 2, imputable: false },
  { codigo: '1.2.1', nombre: 'Activos Fijos Tangibles', tipo: 'ACTIVO', naturaleza: 'DEUDORA', nivel: 3, imputable: false },
  { codigo: '1.2.1.01', nombre: 'Equipo de Oficina', tipo: 'ACTIVO', naturaleza: 'DEUDORA', nivel: 4, uso: 'AF_EQUIPO_OFICINA', monetaria: false },
  { codigo: '1.2.1.02', nombre: 'Vehículos', tipo: 'ACTIVO', naturaleza: 'DEUDORA', nivel: 4, uso: 'AF_VEHICULOS', monetaria: false },
  { codigo: '1.2.1.03', nombre: 'Depreciación Acumulada (Crédito)', tipo: 'ACTIVO', naturaleza: 'ACREEDORA', nivel: 4, uso: 'DEP_ACUMULADA', monetaria: false },
  { codigo: '1.2.1.04', nombre: 'Maquinaria y Equipos', tipo: 'ACTIVO', naturaleza: 'DEUDORA', nivel: 4, uso: 'AF_MAQUINARIA', monetaria: false },
  { codigo: '1.2.1.05', nombre: 'Mobiliario y Equipos de Computación', tipo: 'ACTIVO', naturaleza: 'DEUDORA', nivel: 4, uso: 'AF_MOBILIARIO', monetaria: false },

  // ── PASIVO ──
  { codigo: '2', nombre: 'PASIVO', tipo: 'PASIVO', naturaleza: 'ACREEDORA', nivel: 1, imputable: false },
  { codigo: '2.1', nombre: 'Pasivo Corriente', tipo: 'PASIVO', naturaleza: 'ACREEDORA', nivel: 2, imputable: false },
  { codigo: '2.1.1', nombre: 'Cuentas por Pagar Comerciales', tipo: 'PASIVO', naturaleza: 'ACREEDORA', nivel: 3, imputable: false },
  { codigo: '2.1.1.01', nombre: 'Proveedores', tipo: 'PASIVO', naturaleza: 'ACREEDORA', nivel: 4, uso: 'CXP_PROVEEDORES' },
  { codigo: '2.1.1.02', nombre: 'Cuentas por Pagar Diversas', tipo: 'PASIVO', naturaleza: 'ACREEDORA', nivel: 4, uso: 'CXP_DIVERSAS' },
  { codigo: '2.1.2', nombre: 'Débitos Fiscales IVA', tipo: 'PASIVO', naturaleza: 'ACREEDORA', nivel: 3, imputable: false },
  { codigo: '2.1.2.01', nombre: 'IVA Débito Fiscal (16%)', tipo: 'PASIVO', naturaleza: 'ACREEDORA', nivel: 4, uso: 'IVA_DEBITO_FISCAL' },
  { codigo: '2.1.2.02', nombre: 'Retenciones de IVA por Enterar', tipo: 'PASIVO', naturaleza: 'ACREEDORA', nivel: 4, uso: 'RET_IVA_POR_ENTERAR' },
  { codigo: '2.1.3', nombre: 'Impuestos por Pagar', tipo: 'PASIVO', naturaleza: 'ACREEDORA', nivel: 3, imputable: false },
  { codigo: '2.1.3.01', nombre: 'ISLR por Pagar', tipo: 'PASIVO', naturaleza: 'ACREEDORA', nivel: 4, uso: 'ISLR_POR_PAGAR' },
  { codigo: '2.1.3.02', nombre: 'Patente Municipal por Pagar', tipo: 'PASIVO', naturaleza: 'ACREEDORA', nivel: 4, uso: 'PATENTE_POR_PAGAR' },
  { codigo: '2.1.3.99', nombre: 'Otros Impuestos por Pagar', tipo: 'PASIVO', naturaleza: 'ACREEDORA', nivel: 4, uso: 'IMPUESTOS_POR_PAGAR' },
  { codigo: '2.1.4', nombre: 'Nómina por Pagar', tipo: 'PASIVO', naturaleza: 'ACREEDORA', nivel: 3, imputable: false },
  { codigo: '2.1.4.01', nombre: 'Sueldos por Pagar', tipo: 'PASIVO', naturaleza: 'ACREEDORA', nivel: 4, uso: 'NOMINA_SUELDOS_POR_PAGAR' },
  { codigo: '2.1.4.02', nombre: 'IVSS por Pagar', tipo: 'PASIVO', naturaleza: 'ACREEDORA', nivel: 4, uso: 'IVSS_POR_PAGAR' },
  { codigo: '2.1.4.03', nombre: 'FAOV por Pagar', tipo: 'PASIVO', naturaleza: 'ACREEDORA', nivel: 4, uso: 'FAOV_POR_PAGAR' },
  { codigo: '2.1.4.04', nombre: 'INCES por Pagar', tipo: 'PASIVO', naturaleza: 'ACREEDORA', nivel: 4, uso: 'INCES_POR_PAGAR' },
  { codigo: '2.1.4.05', nombre: 'Prestaciones Sociales por Pagar', tipo: 'PASIVO', naturaleza: 'ACREEDORA', nivel: 4, uso: 'PRESTACIONES_POR_PAGAR' },
  { codigo: '2.1.4.06', nombre: 'Utilidades por Pagar', tipo: 'PASIVO', naturaleza: 'ACREEDORA', nivel: 4, uso: 'UTILIDADES_POR_PAGAR' },

  // ── PATRIMONIO ──
  { codigo: '3', nombre: 'PATRIMONIO', tipo: 'PATRIMONIO', naturaleza: 'ACREEDORA', nivel: 1, imputable: false },
  { codigo: '3.1', nombre: 'Capital Social', tipo: 'PATRIMONIO', naturaleza: 'ACREEDORA', nivel: 2, imputable: false },
  { codigo: '3.1.01', nombre: 'Capital Social Suscrito y Pagado', tipo: 'PATRIMONIO', naturaleza: 'ACREEDORA', nivel: 3, uso: 'CAPITAL_SOCIAL', monetaria: false },
  { codigo: '3.2', nombre: 'Resultados', tipo: 'PATRIMONIO', naturaleza: 'ACREEDORA', nivel: 2, imputable: false },
  { codigo: '3.2.01', nombre: 'Utilidad del Ejercicio', tipo: 'PATRIMONIO', naturaleza: 'ACREEDORA', nivel: 3, uso: 'UTILIDAD_EJERCICIO' },
  { codigo: '3.2.02', nombre: 'Pérdida del Ejercicio', tipo: 'PATRIMONIO', naturaleza: 'DEUDORA', nivel: 3, uso: 'PERDIDA_EJERCICIO' },
  { codigo: '3.3', nombre: 'Ajustes por Inflación', tipo: 'PATRIMONIO', naturaleza: 'ACREEDORA', nivel: 2, imputable: false },
  { codigo: '3.3.01', nombre: 'Ajuste por Inflación - Partidas No Monetarias', tipo: 'PATRIMONIO', naturaleza: 'ACREEDORA', nivel: 3, uso: 'AJUSTE_INFLACION_PATRIMONIO' },

  // ── INGRESOS ──
  { codigo: '4', nombre: 'INGRESOS', tipo: 'INGRESO', naturaleza: 'ACREEDORA', nivel: 1, imputable: false },
  { codigo: '4.1', nombre: 'Ingresos Operacionales', tipo: 'INGRESO', naturaleza: 'ACREEDORA', nivel: 2, imputable: false },
  { codigo: '4.1.01', nombre: 'Ventas de Mercancía Gravables', tipo: 'INGRESO', naturaleza: 'ACREEDORA', nivel: 3, uso: 'VENTAS_GRAVABLES' },
  { codigo: '4.1.02', nombre: 'Ventas de Mercancía Exentas', tipo: 'INGRESO', naturaleza: 'ACREEDORA', nivel: 3, uso: 'VENTAS_EXENTAS' },
  { codigo: '4.1.03', nombre: 'Ingresos por Servicios Gravables', tipo: 'INGRESO', naturaleza: 'ACREEDORA', nivel: 3, uso: 'INGRESOS_SERVICIOS' },
  { codigo: '4.2', nombre: 'Ingresos No Operacionales', tipo: 'INGRESO', naturaleza: 'ACREEDORA', nivel: 2, imputable: false },
  { codigo: '4.2.01', nombre: 'Ganancia en Cambio', tipo: 'INGRESO', naturaleza: 'ACREEDORA', nivel: 3, uso: 'GANANCIA_CAMBIO' },
  { codigo: '4.2.02', nombre: 'Ganancia por Exposición a la Inflación', tipo: 'INGRESO', naturaleza: 'ACREEDORA', nivel: 3, uso: 'GANANCIA_EXPOSICION_INFLACION' },

  // ── COSTOS ──
  { codigo: '5', nombre: 'COSTOS', tipo: 'COSTO', naturaleza: 'DEUDORA', nivel: 1, imputable: false },
  { codigo: '5.1', nombre: 'Costo de Ventas', tipo: 'COSTO', naturaleza: 'DEUDORA', nivel: 2, imputable: false },
  { codigo: '5.1.01', nombre: 'Costo de Mercancía Vendida', tipo: 'COSTO', naturaleza: 'DEUDORA', nivel: 3, uso: 'COSTO_VENTA' },

  // ── GASTOS ──
  { codigo: '6', nombre: 'GASTOS', tipo: 'GASTO', naturaleza: 'DEUDORA', nivel: 1, imputable: false },
  { codigo: '6.1', nombre: 'Gastos Operacionales de Administración', tipo: 'GASTO', naturaleza: 'DEUDORA', nivel: 2, imputable: false },
  { codigo: '6.1.01', nombre: 'Sueldos y Salarios', tipo: 'GASTO', naturaleza: 'DEUDORA', nivel: 3, uso: 'GASTO_SUELDOS' },
  { codigo: '6.1.02', nombre: 'Servicios Básicos (Electricidad, Agua)', tipo: 'GASTO', naturaleza: 'DEUDORA', nivel: 3, uso: 'GASTO_SERVICIOS_BASICOS' },
  { codigo: '6.1.03', nombre: 'Teléfono e Internet', tipo: 'GASTO', naturaleza: 'DEUDORA', nivel: 3, uso: 'GASTO_TELEFONO' },
  { codigo: '6.1.04', nombre: 'Alquileres', tipo: 'GASTO', naturaleza: 'DEUDORA', nivel: 3, uso: 'GASTO_ALQUILER' },
  { codigo: '6.1.05', nombre: 'Materiales y Útiles de Oficina', tipo: 'GASTO', naturaleza: 'DEUDORA', nivel: 3, uso: 'GASTO_UTILES' },
  { codigo: '6.1.06', nombre: 'Publicidad y Propaganda', tipo: 'GASTO', naturaleza: 'DEUDORA', nivel: 3, uso: 'GASTO_PUBLICIDAD' },
  { codigo: '6.1.07', nombre: 'Mantenimiento y Reparaciones', tipo: 'GASTO', naturaleza: 'DEUDORA', nivel: 3, uso: 'GASTO_MANTENIMIENTO' },
  { codigo: '6.1.08', nombre: 'Honorarios Profesionales', tipo: 'GASTO', naturaleza: 'DEUDORA', nivel: 3, uso: 'GASTO_HONORARIOS' },
  { codigo: '6.1.09', nombre: 'Gastos de Viaje y Representación', tipo: 'GASTO', naturaleza: 'DEUDORA', nivel: 3, uso: 'GASTO_VIAJE' },
  { codigo: '6.1.10', nombre: 'Combustible y Lubricantes', tipo: 'GASTO', naturaleza: 'DEUDORA', nivel: 3, uso: 'GASTO_COMBUSTIBLE' },
  { codigo: '6.1.99', nombre: 'Otros Gastos Operacionales', tipo: 'GASTO', naturaleza: 'DEUDORA', nivel: 3, uso: 'GASTO_OTROS' },
  { codigo: '6.1.11', nombre: 'Impuesto a las Grandes Transacciones Financieras (IGTF)', tipo: 'GASTO', naturaleza: 'DEUDORA', nivel: 3, uso: 'GASTO_IGTF' },
  { codigo: '6.1.12', nombre: 'Bono de Alimentación', tipo: 'GASTO', naturaleza: 'DEUDORA', nivel: 3, uso: 'GASTO_BONO_ALIMENTACION' },
  { codigo: '6.1.13', nombre: 'Aportes Patronales (IVSS, FAOV, INCES)', tipo: 'GASTO', naturaleza: 'DEUDORA', nivel: 3, uso: 'GASTO_APORTES_PATRONALES' },
  { codigo: '6.1.14', nombre: 'Provisión de Prestaciones Sociales', tipo: 'GASTO', naturaleza: 'DEUDORA', nivel: 3, uso: 'GASTO_PRESTACIONES' },
  { codigo: '6.1.15', nombre: 'Provisión de Utilidades', tipo: 'GASTO', naturaleza: 'DEUDORA', nivel: 3, uso: 'GASTO_UTILIDADES' },
  { codigo: '6.1.16', nombre: 'Gasto de Depreciación', tipo: 'GASTO', naturaleza: 'DEUDORA', nivel: 3, uso: 'GASTO_DEPRECIACION' },
  { codigo: '6.2', nombre: 'Gastos No Operacionales', tipo: 'GASTO', naturaleza: 'DEUDORA', nivel: 2, imputable: false },
  { codigo: '6.2.01', nombre: 'Pérdida en Cambio', tipo: 'GASTO', naturaleza: 'DEUDORA', nivel: 3, uso: 'PERDIDA_CAMBIO' },
  { codigo: '6.2.02', nombre: 'Gastos Financieros', tipo: 'GASTO', naturaleza: 'DEUDORA', nivel: 3, uso: 'GASTO_FINANCIERO' },
  { codigo: '6.2.03', nombre: 'Pérdida por Exposición a la Inflación', tipo: 'GASTO', naturaleza: 'DEUDORA', nivel: 3, uso: 'PERDIDA_EXPOSICION_INFLACION' },
]
