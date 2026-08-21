// Prueba de humo del POS contra los datos sembrados por seed:quiosco.
import { db } from '../src/lib/db'
import { permisosDeRol, type ContextoOperacion, type Rol } from '../src/lib/nucleo/permisos'
import { confirmarVenta, anularVenta } from '../src/lib/nucleo/ventas'
import { abrirTurno, cerrarTurno, resumenTurno } from '../src/lib/nucleo/caja'
import { existenciaDisponible, verificarIntegridadKardex } from '../src/lib/nucleo/inventario'
import { buscarPorCodigoBarras } from '../src/lib/nucleo/catalogo'

function ctxDe(rol: Rol, u: { usuarioId: string; email: string; organizacionId: string }): ContextoOperacion {
  const permisos = permisosDeRol(rol)
  return { ...u, nombre: 'humo', rol, permisos, sucursalesPermitidas: [], puede: (p) => permisos.includes(p) }
}

async function main() {
  const org = await db.organizacion.findFirstOrThrow({ where: { nombre: 'Quiosco La Esquina' } })
  const cajeroU = await db.user.findFirstOrThrow({ where: { email: 'cajero@quiosco.demo' } })
  const supU = await db.user.findFirstOrThrow({ where: { email: 'supervisor@quiosco.demo' } })
  const suc = await db.sucursal.findFirstOrThrow({ where: { organizacionId: org.id } })
  const alm = await db.almacen.findFirstOrThrow({ where: { organizacionId: org.id, esPredeterminado: true } })
  const caja = await db.caja.findFirstOrThrow({ where: { organizacionId: org.id } })
  const efectivo = await db.metodoPago.findFirstOrThrow({ where: { organizacionId: org.id, codigo: 'EFEC-BS' } })
  const pm = await db.metodoPago.findFirstOrThrow({ where: { organizacionId: org.id, codigo: 'PM' } })

  const base = { organizacionId: org.id }
  const cajero = ctxDe('CAJERO', { usuarioId: cajeroU.id, email: cajeroU.email, ...base })
  const sup = ctxDe('SUPERVISOR', { usuarioId: supU.id, email: supU.email, ...base })

  const abierta = await db.sesionCaja.findFirst({ where: { cajaId: caja.id, estado: 'ABIERTA' } })
  if (abierta) await db.sesionCaja.update({ where: { id: abierta.id }, data: { estado: 'CERRADA', fechaCierre: new Date() } })

  const turno = await abrirTurno(cajero, { cajaId: caja.id, montoInicial: '200.00' })
  console.log(`\n1. Turno abierto con fondo de Bs 200,00`)

  const refresco = await buscarPorCodigoBarras(cajero, '7591001000019')
  const pan = await buscarPorCodigoBarras(cajero, '7591001000095')
  console.log(`2. Escaneo: "${refresco.producto.nombre}" y "${pan.producto.nombre}"`)

  const stockRefrescoAntes = await existenciaDisponible(refresco.id, alm.id)

  // 2 refrescos (58,00 c/u con IVA incluido) + 3 panes (12,00 exento) = 116 + 36 = 152
  const venta = await confirmarVenta(cajero, {
    sucursalId: suc.id, almacenId: alm.id, sesionCajaId: turno.id,
    lineas: [
      { varianteId: refresco.id, cantidad: '2' },
      { varianteId: pan.id, cantidad: '3' },
    ],
    cobros: [
      { metodoPagoId: efectivo.id, monto: '100.00' },
      { metodoPagoId: pm.id, monto: '52.00', referencia: '004512' },
    ],
  })

  console.log(`3. Venta ${venta.tipoDocumento} ${venta.serie}-${venta.numero} confirmada`)
  console.log(`   Base gravable   Bs ${venta.subtotal}`)
  console.log(`   IVA             Bs ${venta.impuestoTotal}   (solo los refrescos; el pan es exento)`)
  console.log(`   Total cobrado   Bs ${venta.total}`)
  console.log(`   Costo congelado Bs ${venta.costoTotal}`)
  console.log(`   Cobros: ${venta.pagos.length} (efectivo Bs 100,00 + pago móvil Bs 52,00)`)

  const stockRefrescoDespues = await existenciaDisponible(refresco.id, alm.id)
  console.log(`4. Inventario refresco: ${stockRefrescoAntes} → ${stockRefrescoDespues}`)

  const resumen = await resumenTurno(sup, turno.id)
  console.log(`5. Efectivo esperado en gaveta: Bs ${resumen.efectivoEsperado}`)
  console.log(`   (200 de fondo + 100 en efectivo; el pago móvil NO entra a la gaveta)`)

  // Un cajero no debe poder anular
  try {
    await anularVenta(cajero, venta.id, 'intento del cajero')
    console.log('   ✗ FALLO: el cajero pudo anular')
  } catch {
    console.log(`6. El cajero NO puede anular (correcto); lo hace la supervisora`)
  }

  await anularVenta(sup, venta.id, 'Cliente cambió de opinión')
  const stockFinal = await existenciaDisponible(refresco.id, alm.id)
  const resumenFinal = await resumenTurno(sup, turno.id)
  console.log(`7. Anulada. Inventario refresco vuelve a ${stockFinal}`)
  console.log(`   Efectivo esperado vuelve a Bs ${resumenFinal.efectivoEsperado}`)

  const integridad = await verificarIntegridadKardex(org.id)
  console.log(`8. Kardex cuadrado con existencias: ${integridad.cuadrado ? 'sí' : 'NO — ' + JSON.stringify(integridad.discrepancias)}`)

  // Arqueo con faltante sin justificar: debe rechazar
  try {
    await cerrarTurno(cajero, { sesionCajaId: turno.id, efectivoContado: '190.00' })
    console.log('   ✗ FALLO: cerró con faltante sin justificar')
  } catch (e) {
    console.log(`9. Arqueo rechaza faltante sin justificar:`)
    console.log(`   "${e instanceof Error ? e.message : e}"`)
  }

  const cierre = await cerrarTurno(cajero, {
    sesionCajaId: turno.id, efectivoContado: '190.00',
    justificacion: 'Se pagó el flete del proveedor en efectivo sin registrarlo',
  })
  console.log(`10. Turno cerrado con diferencia Bs ${cierre.arqueo.diferencia} justificada\n`)
}

main().catch((e) => { console.error('FALLO:', e); process.exitCode = 1 }).finally(() => db.$disconnect())
