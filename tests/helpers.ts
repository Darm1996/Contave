import { db } from '@/lib/db'

// Plan de cuentas mínimo necesario para que el motor de asientos
// (asientos-engine.ts) y el cierre de ejercicio (ejercicios.ts) funcionen
// en las pruebas de integración, sin depender del script de seed real.
const CUENTAS_PRUEBA: Array<{
  codigo: string
  nombre: string
  tipo: string
  naturaleza: string
  uso: string
}> = [
  { codigo: '1.1.01', nombre: 'Caja Chica', tipo: 'ACTIVO', naturaleza: 'DEUDORA', uso: 'CAJA_CHICA' },
  { codigo: '1.1.02', nombre: 'Bancos Bs.', tipo: 'ACTIVO', naturaleza: 'DEUDORA', uso: 'BANCOS_BS' },
  { codigo: '1.1.03', nombre: 'Cuentas por Cobrar Clientes', tipo: 'ACTIVO', naturaleza: 'DEUDORA', uso: 'CXC_CLIENTES' },
  { codigo: '1.1.04', nombre: 'IVA Crédito Fiscal', tipo: 'ACTIVO', naturaleza: 'DEUDORA', uso: 'IVA_CREDITO_FISCAL' },
  { codigo: '1.1.05', nombre: 'Retención IVA Soportada', tipo: 'ACTIVO', naturaleza: 'DEUDORA', uso: 'RET_IVA_SOPORTADA' },
  { codigo: '1.1.06', nombre: 'Mercancía', tipo: 'ACTIVO', naturaleza: 'DEUDORA', uso: 'MERCANCIA' },
  { codigo: '2.1.01', nombre: 'Cuentas por Pagar Proveedores', tipo: 'PASIVO', naturaleza: 'ACREEDORA', uso: 'CXP_PROVEEDORES' },
  { codigo: '2.1.02', nombre: 'IVA Débito Fiscal', tipo: 'PASIVO', naturaleza: 'ACREEDORA', uso: 'IVA_DEBITO_FISCAL' },
  { codigo: '2.1.03', nombre: 'Retención IVA por Enterar', tipo: 'PASIVO', naturaleza: 'ACREEDORA', uso: 'RET_IVA_POR_ENTERAR' },
  { codigo: '2.1.04', nombre: 'ISLR por Pagar', tipo: 'PASIVO', naturaleza: 'ACREEDORA', uso: 'ISLR_POR_PAGAR' },
  { codigo: '3.2.01', nombre: 'Utilidad del Ejercicio', tipo: 'PATRIMONIO', naturaleza: 'ACREEDORA', uso: 'UTILIDAD_EJERCICIO' },
  { codigo: '3.2.02', nombre: 'Pérdida del Ejercicio', tipo: 'PATRIMONIO', naturaleza: 'DEUDORA', uso: 'PERDIDA_EJERCICIO' },
  { codigo: '4.1.01', nombre: 'Ventas Gravables', tipo: 'INGRESO', naturaleza: 'ACREEDORA', uso: 'VENTAS_GRAVABLES' },
  { codigo: '4.1.02', nombre: 'Ventas Exentas', tipo: 'INGRESO', naturaleza: 'ACREEDORA', uso: 'VENTAS_EXENTAS' },
  { codigo: '5.1.01', nombre: 'Costo de Venta', tipo: 'COSTO', naturaleza: 'DEUDORA', uso: 'COSTO_VENTA' },
  { codigo: '6.1.01', nombre: 'Otros Gastos Operacionales', tipo: 'GASTO', naturaleza: 'DEUDORA', uso: 'GASTO_OTROS' },
  { codigo: '6.1.02', nombre: 'Honorarios Profesionales', tipo: 'GASTO', naturaleza: 'DEUDORA', uso: 'GASTO_HONORARIOS' },
]

let contador = 0
// Prefijo por proceso/módulo para que dos archivos de prueba corriendo en
// paralelo (cada uno con su propio `contador` reiniciado en 0) no generen el
// mismo RIF al chocar contra la misma base de datos.
const prefijoProceso = Math.random().toString(36).slice(2, 8)

// Crea un usuario + empresa + plan de cuentas mínimo aislado para una prueba.
// Cada llamada usa un RIF/email únicos para no chocar entre pruebas.
export async function crearEmpresaDePrueba() {
  contador += 1
  const sufijo = `${prefijoProceso}-${contador}`

  const user = await db.user.create({
    data: {
      email: `test-${sufijo}@contave.test`,
      name: 'Usuario de Prueba',
      passwordHash: 'no-se-usa-en-estas-pruebas',
      role: 'ADMIN',
    },
  })

  const empresa = await db.empresa.create({
    data: {
      nombre: `Empresa de Prueba ${sufijo}`,
      rif: `J-${prefijoProceso}${String(contador).padStart(3, '0')}-0`.toUpperCase(),
      esAgenteRetencionIVA: false,
      alicuotaIVA: 16,
      monedaFuncional: 'VES',
    },
  })

  await db.userEmpresa.create({
    data: { userId: user.id, empresaId: empresa.id, rol: 'ADMIN' },
  })

  await db.cuenta.createMany({
    data: CUENTAS_PRUEBA.map((c) => ({
      empresaId: empresa.id,
      codigo: c.codigo,
      nombre: c.nombre,
      tipo: c.tipo,
      naturaleza: c.naturaleza,
      nivel: 3,
      imputable: true,
      uso: c.uso,
    })),
  })

  const cuentas = await db.cuenta.findMany({ where: { empresaId: empresa.id } })
  const cuentaPorUso = (uso: string) => {
    const c = cuentas.find((c) => c.uso === uso)
    if (!c) throw new Error(`Cuenta de prueba con uso ${uso} no encontrada`)
    return c
  }

  return { user, empresa, cuentas, cuentaPorUso }
}

// Limpia todo lo creado por las pruebas (orden respeta las FKs).
export async function limpiarDatosDePrueba() {
  await db.movimientoBanco.deleteMany({ where: { conciliacion: { cuenta: { empresa: { nombre: { contains: 'Empresa de Prueba' } } } } } })
  await db.conciliacionBanco.deleteMany({ where: { empresa: { nombre: { contains: 'Empresa de Prueba' } } } })
  await db.asientoLinea.deleteMany({ where: { asiento: { empresa: { nombre: { contains: 'Empresa de Prueba' } } } } })
  await db.asiento.deleteMany({ where: { empresa: { nombre: { contains: 'Empresa de Prueba' } } } })
  await db.factura.deleteMany({ where: { empresa: { nombre: { contains: 'Empresa de Prueba' } } } })
  await db.ejercicio.deleteMany({ where: { empresa: { nombre: { contains: 'Empresa de Prueba' } } } })
  await db.cuenta.deleteMany({ where: { empresa: { nombre: { contains: 'Empresa de Prueba' } } } })
  await db.userEmpresa.deleteMany({ where: { empresa: { nombre: { contains: 'Empresa de Prueba' } } } })
  await db.empresa.deleteMany({ where: { nombre: { contains: 'Empresa de Prueba' } } })
  await db.user.deleteMany({ where: { email: { contains: '@contave.test' } } })
}
