// Cuentas adicionales específicas para restaurantes, pensadas para agregarse
// ENCIMA del catálogo base VEN-NIF Pymes (CUENTAS_VEN_NIF), no en su lugar.
// Se usan cuando una empresa se crea con plantilla: 'RESTAURANTE' en
// POST /api/empresas (ver esa ruta). Incluye separación de alimentos vs.
// bebidas alcohólicas/no alcohólicas (impuesto de licores), delivery por
// plataformas, y propinas recaudadas para el personal.
import { CuentaPlanVenNif } from './plan-cuentas-ven-nif'

export const CUENTAS_RESTAURANTE: CuentaPlanVenNif[] = [
  // ── ACTIVO: inventario y activos fijos propios de cocina/barra ──
  { codigo: '1.1.4.02', nombre: 'Inventario de Alimentos (Materia Prima)', tipo: 'ACTIVO', naturaleza: 'DEUDORA', nivel: 4, uso: 'INV_ALIMENTOS', monetaria: false },
  { codigo: '1.1.4.03', nombre: 'Inventario de Bebidas No Alcohólicas', tipo: 'ACTIVO', naturaleza: 'DEUDORA', nivel: 4, uso: 'INV_BEBIDAS', monetaria: false },
  { codigo: '1.1.4.04', nombre: 'Inventario de Bebidas Alcohólicas', tipo: 'ACTIVO', naturaleza: 'DEUDORA', nivel: 4, uso: 'INV_LICORES', monetaria: false },
  { codigo: '1.1.4.05', nombre: 'Inventario de Suministros y Empaques', tipo: 'ACTIVO', naturaleza: 'DEUDORA', nivel: 4, uso: 'INV_SUMINISTROS', monetaria: false },
  { codigo: '1.2.1.06', nombre: 'Equipos de Cocina y Refrigeración', tipo: 'ACTIVO', naturaleza: 'DEUDORA', nivel: 4, uso: 'AF_EQUIPO_COCINA', monetaria: false },

  // ── PASIVO: patente de licores y propinas recaudadas para el personal ──
  { codigo: '2.1.3.03', nombre: 'Patente de Licores por Pagar', tipo: 'PASIVO', naturaleza: 'ACREEDORA', nivel: 4, uso: 'PATENTE_LICORES_POR_PAGAR' },
  { codigo: '2.1.5', nombre: 'Propinas', tipo: 'PASIVO', naturaleza: 'ACREEDORA', nivel: 3, imputable: false },
  { codigo: '2.1.5.01', nombre: 'Propinas por Pagar al Personal', tipo: 'PASIVO', naturaleza: 'ACREEDORA', nivel: 4, uso: 'PROPINAS_POR_PAGAR' },

  // ── INGRESOS: separados por línea (alimentos / bebidas / licores / delivery) ──
  { codigo: '4.1.04', nombre: 'Ventas de Alimentos', tipo: 'INGRESO', naturaleza: 'ACREEDORA', nivel: 3, uso: 'VENTAS_ALIMENTOS' },
  { codigo: '4.1.05', nombre: 'Ventas de Bebidas No Alcohólicas', tipo: 'INGRESO', naturaleza: 'ACREEDORA', nivel: 3, uso: 'VENTAS_BEBIDAS' },
  { codigo: '4.1.06', nombre: 'Ventas de Bebidas Alcohólicas', tipo: 'INGRESO', naturaleza: 'ACREEDORA', nivel: 3, uso: 'VENTAS_LICORES' },
  { codigo: '4.1.07', nombre: 'Ingresos por Domicilios (Delivery)', tipo: 'INGRESO', naturaleza: 'ACREEDORA', nivel: 3, uso: 'INGRESOS_DELIVERY' },

  // ── COSTOS: food cost separado de bebidas/licores, más mermas ──
  { codigo: '5.1.02', nombre: 'Costo de Alimentos (Food Cost)', tipo: 'COSTO', naturaleza: 'DEUDORA', nivel: 3, uso: 'COSTO_ALIMENTOS' },
  { codigo: '5.1.03', nombre: 'Costo de Bebidas No Alcohólicas', tipo: 'COSTO', naturaleza: 'DEUDORA', nivel: 3, uso: 'COSTO_BEBIDAS' },
  { codigo: '5.1.04', nombre: 'Costo de Bebidas Alcohólicas', tipo: 'COSTO', naturaleza: 'DEUDORA', nivel: 3, uso: 'COSTO_LICORES' },
  { codigo: '5.1.05', nombre: 'Mermas y Desperdicio de Alimentos', tipo: 'COSTO', naturaleza: 'DEUDORA', nivel: 3, uso: 'MERMA_ALIMENTOS' },

  // ── GASTOS: operación típica de un restaurante ──
  { codigo: '6.1.19', nombre: 'Comisiones de Plataformas de Delivery', tipo: 'GASTO', naturaleza: 'DEUDORA', nivel: 3, uso: 'GASTO_COMISION_DELIVERY' },
  { codigo: '6.1.20', nombre: 'Gas de Cocina (GLP)', tipo: 'GASTO', naturaleza: 'DEUDORA', nivel: 3, uso: 'GASTO_GAS' },
  { codigo: '6.1.21', nombre: 'Uniformes y Lavandería', tipo: 'GASTO', naturaleza: 'DEUDORA', nivel: 3, uso: 'GASTO_UNIFORMES' },
  { codigo: '6.1.22', nombre: 'Menaje, Vajilla y Utensilios', tipo: 'GASTO', naturaleza: 'DEUDORA', nivel: 3, uso: 'GASTO_MENAJE' },
  { codigo: '6.1.23', nombre: 'Empaques y Desechables', tipo: 'GASTO', naturaleza: 'DEUDORA', nivel: 3, uso: 'GASTO_EMPAQUES' },
  { codigo: '6.1.24', nombre: 'Patente y Permisos de Licores', tipo: 'GASTO', naturaleza: 'DEUDORA', nivel: 3, uso: 'GASTO_PERMISOS_LICORES' },
  { codigo: '6.1.25', nombre: 'Fumigación y Control de Plagas', tipo: 'GASTO', naturaleza: 'DEUDORA', nivel: 3, uso: 'GASTO_FUMIGACION' },
  { codigo: '6.1.26', nombre: 'Derechos de Autor (Música - SACVEN)', tipo: 'GASTO', naturaleza: 'DEUDORA', nivel: 3, uso: 'GASTO_DERECHOS_AUTOR' },
]
