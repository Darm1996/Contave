// Catálogos del módulo Restaurante.
//
// Las categorías salen de cómo el negocio ya clasifica sus egresos en el
// Excel (columna "TIPO DE GASTO"): proveedor, compras del día, nómina,
// transporte, delivery, comisión bancaria, vueltos, etc. Mantenerlas fijas
// permite que el resumen del mes se arme solo, sin que nadie tenga que
// escribir la categoría a mano dos veces igual.

export interface CategoriaGasto {
  key: string
  label: string
  /** Acento visual (clave de color Tailwind) usado en la UI. */
  color: string
  /** Ayuda que se muestra bajo el selector. */
  ayuda: string
}

export const CATEGORIAS_GASTO: CategoriaGasto[] = [
  { key: 'PROVEEDOR', label: 'Proveedor', color: 'rose', ayuda: 'Pago de notas de proveedores (carnes, verduras, quesos…)' },
  { key: 'COMPRAS', label: 'Compras del día', color: 'amber', ayuda: 'Compras sueltas: mercado, especias, papelería' },
  { key: 'NOMINA', label: 'Nómina', color: 'violet', ayuda: 'Pago semanal al personal' },
  { key: 'TRANSPORTE', label: 'Transporte', color: 'sky', ayuda: 'Traslado del personal' },
  { key: 'DELIVERY', label: 'Delivery', color: 'cyan', ayuda: 'Pago a repartidores' },
  { key: 'GASTO_FIJO', label: 'Gasto fijo', color: 'indigo', ayuda: 'Alquiler, condominio, luz, internet, gas, sistema' },
  { key: 'SERVICIOS', label: 'Servicios', color: 'teal', ayuda: 'Mantenimiento, fumigación, publicidad' },
  { key: 'COMISION', label: 'Comisión bancaria', color: 'slate', ayuda: 'Comisiones que cobra el banco' },
  { key: 'VUELTO', label: 'Vuelto', color: 'stone', ayuda: 'Vuelto entregado al cliente' },
  { key: 'CAJA', label: 'Retiro de caja', color: 'orange', ayuda: 'Dinero que sale de caja hacia los socios o el ahorro' },
  { key: 'OTROS', label: 'Otros', color: 'gray', ayuda: 'Cualquier egreso que no encaje arriba' },
]

export const CATEGORIAS_GASTO_KEYS = CATEGORIAS_GASTO.map((c) => c.key)

export function etiquetaCategoria(key: string): string {
  return CATEGORIAS_GASTO.find((c) => c.key === key)?.label ?? key
}

export function colorCategoria(key: string): string {
  return CATEGORIAS_GASTO.find((c) => c.key === key)?.color ?? 'gray'
}

export const CATEGORIAS_PROVEEDOR = [
  { key: 'PROTEINAS', label: 'Proteínas' },
  { key: 'VERDURAS', label: 'Verduras y frutas' },
  { key: 'LACTEOS', label: 'Lácteos y quesos' },
  { key: 'BEBIDAS', label: 'Bebidas' },
  { key: 'INSUMOS', label: 'Insumos y desechables' },
  { key: 'SERVICIOS', label: 'Servicios' },
] as const

export const CARGOS_PERSONAL = [
  { key: 'COCINA', label: 'Cocina' },
  { key: 'MESONERO', label: 'Mesonero' },
  { key: 'DELIVERY', label: 'Delivery' },
  { key: 'TRANSPORTE', label: 'Transporte' },
  { key: 'ADMINISTRACION', label: 'Administración' },
] as const

export const TIPOS_INCIDENCIA = [
  { key: 'CORTESIA', label: 'Cortesía', color: 'emerald', ayuda: 'Plato o bebida que se regaló' },
  { key: 'MERMA', label: 'Producto dañado', color: 'rose', ayuda: 'Producto que se perdió o se dañó' },
  { key: 'CONSUMO_PERSONAL', label: 'Consumo del personal', color: 'amber', ayuda: 'Comida del equipo' },
  { key: 'PRESTAMO_SEDE', label: 'Préstamo a otra sede', color: 'sky', ayuda: 'Producto prestado a otro local' },
] as const

export const TIPOS_FONDO = [
  { key: 'BANCO', label: 'Cuenta bancaria' },
  { key: 'EFECTIVO', label: 'Efectivo' },
  { key: 'DIGITAL', label: 'Pago digital' },
  { key: 'PUNTO_VENTA', label: 'Punto de venta' },
] as const

// Fondos que se crean al activar el módulo. Son exactamente las "cajas"
// que el negocio ya distingue en su hoja de balance: Zelle, el banco en
// bolívares, el efectivo en dólares y la caja en bolívares.
export const FONDOS_INICIALES = [
  { nombre: 'Zelle', tipo: 'DIGITAL', moneda: 'USD', color: 'violet', orden: 1, rolCierre: 'ZELLE' },
  { nombre: 'Efectivo $', tipo: 'EFECTIVO', moneda: 'USD', color: 'emerald', orden: 2, rolCierre: 'EFECTIVO_USD' },
  { nombre: 'Banco Bs.', tipo: 'BANCO', moneda: 'VES', color: 'sky', orden: 3, rolCierre: 'BS_TRANSFERENCIA' },
  { nombre: 'Punto de venta', tipo: 'PUNTO_VENTA', moneda: 'VES', color: 'rose', orden: 4, rolCierre: 'PUNTO_VENTA' },
  { nombre: 'Caja Bs.', tipo: 'EFECTIVO', moneda: 'VES', color: 'amber', orden: 5, rolCierre: null },
] as const

/** Medio de pago del cierre diario ↔ campo del cierre que lo alimenta. */
export const ROLES_CIERRE = [
  { rol: 'ZELLE', campo: 'ventaZelle', moneda: 'USD', label: 'Zelle' },
  { rol: 'EFECTIVO_USD', campo: 'ventaEfectivoUSD', moneda: 'USD', label: 'Efectivo $' },
  { rol: 'BS_TRANSFERENCIA', campo: 'ventaBs', moneda: 'VES', label: 'Transferencia Bs.' },
  { rol: 'PUNTO_VENTA', campo: 'ventaPuntoVenta', moneda: 'VES', label: 'Punto de venta' },
] as const
