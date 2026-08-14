import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/lib/db'
import { crearQuioscoDePrueba, limpiarQuioscos, type QuioscoDePrueba } from './helpers-quiosco'
import { confirmarVenta, anularVenta, margenPeriodo } from '@/lib/nucleo/ventas'
import { abrirTurno, cerrarTurno, resumenTurno, registrarMovimientoCaja } from '@/lib/nucleo/caja'
import { existenciaDisponible, verificarIntegridadKardex } from '@/lib/nucleo/inventario'
import { buscarPorCodigoBarras, listarProductos } from '@/lib/nucleo/catalogo'
import { igual, iguales, d } from '@/lib/nucleo/dinero'

let q: QuioscoDePrueba

beforeAll(async () => {
  await limpiarQuioscos()
  q = await crearQuioscoDePrueba()
}, 60000)

afterAll(async () => {
  await limpiarQuioscos()
}, 60000)

/** Abre un turno nuevo para aislar cada prueba de caja. */
async function turnoNuevo(fondo = '100.00') {
  const abierto = await db.sesionCaja.findFirst({ where: { cajaId: q.cajaId, estado: 'ABIERTA' } })
  if (abierto) {
    await db.sesionCaja.update({ where: { id: abierto.id }, data: { estado: 'CERRADA', fechaCierre: new Date() } })
  }
  return abrirTurno(q.cajero, { cajaId: q.cajaId, montoInicial: fondo })
}

describe('POS: búsqueda en el mostrador', () => {
  it('resuelve un producto por su código de barras', async () => {
    const variante = await buscarPorCodigoBarras(q.cajero, q.productos.refresco.codigoBarras)
    expect(variante.producto.nombre).toBe('Refresco 2L')
  })

  it('avisa cuando el código no existe, en vez de fallar en silencio', async () => {
    await expect(buscarPorCodigoBarras(q.cajero, '0000000000000')).rejects.toThrow(/Ningún producto/)
  })

  it('encuentra por nombre parcial', async () => {
    const r = await listarProductos(q.cajero, { busqueda: 'Refres' })
    expect(r.productos.length).toBe(1)
  })
})

describe('POS: una venta simple', () => {
  it('cobra en efectivo, descuenta el inventario y cuadra el total', async () => {
    const turno = await turnoNuevo()
    const antes = await existenciaDisponible(q.productos.refresco.varianteId, q.almacenId)

    // 2 refrescos a 58.00 con IVA incluido = 116.00
    const venta = await confirmarVenta(q.cajero, {
      sucursalId: q.sucursalId,
      almacenId: q.almacenId,
      sesionCajaId: turno.id,
      lineas: [{ varianteId: q.productos.refresco.varianteId, cantidad: '2' }],
      cobros: [{ metodoPagoId: q.metodoEfectivoId, monto: '116.00' }],
    })

    expect(venta.estado).toBe('CONFIRMADA')
    expect(venta.estadoPago).toBe('PAGADA')
    expect(igual(venta.total, '116.00')).toBe(true)

    // Con IVA incluido al 16 %: base 100.00 e impuesto 16.00
    expect(igual(venta.subtotal, '100.00')).toBe(true)
    expect(igual(venta.impuestoTotal, '16.00')).toBe(true)

    // El inventario bajó exactamente 2
    const despues = await existenciaDisponible(q.productos.refresco.varianteId, q.almacenId)
    expect(igual(despues, d(antes).minus(2))).toBe(true)
  })

  it('congela el costo de la línea al momento de la venta', async () => {
    const turno = await turnoNuevo()
    const venta = await confirmarVenta(q.cajero, {
      sucursalId: q.sucursalId,
      almacenId: q.almacenId,
      sesionCajaId: turno.id,
      lineas: [{ varianteId: q.productos.caramelo.varianteId, cantidad: '10' }],
      cobros: [{ metodoPagoId: q.metodoEfectivoId, monto: '35.00' }],
    })

    expect(igual(venta.detalles[0].costoUnitario, q.productos.caramelo.costo)).toBe(true)
    // costoTotal = 10 × 1.875 = 18.75
    expect(igual(venta.costoTotal, '18.75')).toBe(true)
  })

  it('no aplica impuesto a un producto exento', async () => {
    const turno = await turnoNuevo()
    const venta = await confirmarVenta(q.cajero, {
      sucursalId: q.sucursalId,
      almacenId: q.almacenId,
      sesionCajaId: turno.id,
      lineas: [{ varianteId: q.productos.pan.varianteId, cantidad: '3' }],
      cobros: [{ metodoPagoId: q.metodoEfectivoId, monto: '36.00' }],
    })
    expect(igual(venta.impuestoTotal, '0')).toBe(true)
    expect(igual(venta.total, '36.00')).toBe(true)
  })

  it('emite correlativos consecutivos sin huecos', async () => {
    const turno = await turnoNuevo()
    const numeros: number[] = []
    for (let i = 0; i < 3; i += 1) {
      const v = await confirmarVenta(q.cajero, {
        sucursalId: q.sucursalId,
        almacenId: q.almacenId,
        sesionCajaId: turno.id,
        lineas: [{ varianteId: q.productos.pan.varianteId, cantidad: '1' }],
        cobros: [{ metodoPagoId: q.metodoEfectivoId, monto: '12.00' }],
      })
      numeros.push(v.numero)
    }
    expect(numeros[1]).toBe(numeros[0] + 1)
    expect(numeros[2]).toBe(numeros[1] + 1)
  })
})

describe('POS: reglas innegociables', () => {
  it('no cierra una venta sin método de pago identificado', async () => {
    const turno = await turnoNuevo()
    await expect(
      confirmarVenta(q.cajero, {
        sucursalId: q.sucursalId,
        almacenId: q.almacenId,
        sesionCajaId: turno.id,
        lineas: [{ varianteId: q.productos.pan.varianteId, cantidad: '1' }],
        cobros: [],
      }),
    ).rejects.toThrow(/sin método de pago/)
  })

  it('no cobra efectivo sin un turno de caja abierto', async () => {
    await expect(
      confirmarVenta(q.cajero, {
        sucursalId: q.sucursalId,
        almacenId: q.almacenId,
        lineas: [{ varianteId: q.productos.pan.varianteId, cantidad: '1' }],
        cobros: [{ metodoPagoId: q.metodoEfectivoId, monto: '12.00' }],
      }),
    ).rejects.toThrow(/turno de caja/)
  })

  it('rechaza cobros que no alcanzan el total', async () => {
    const turno = await turnoNuevo()
    await expect(
      confirmarVenta(q.cajero, {
        sucursalId: q.sucursalId,
        almacenId: q.almacenId,
        sesionCajaId: turno.id,
        lineas: [{ varianteId: q.productos.refresco.varianteId, cantidad: '2' }],
        cobros: [{ metodoPagoId: q.metodoEfectivoId, monto: '50.00' }],
      }),
    ).rejects.toThrow(/no alcanzan el total/)
  })

  it('no vende más de lo que hay en existencia', async () => {
    const turno = await turnoNuevo()
    await expect(
      confirmarVenta(q.cajero, {
        sucursalId: q.sucursalId,
        almacenId: q.almacenId,
        sesionCajaId: turno.id,
        lineas: [{ varianteId: q.productos.pan.varianteId, cantidad: '99999' }],
        cobros: [{ metodoPagoId: q.metodoEfectivoId, monto: '1199988.00' }],
      }),
    ).rejects.toThrow(/existencia suficiente/)
  })

  it('exige referencia en los métodos que la necesitan', async () => {
    const turno = await turnoNuevo()
    await expect(
      confirmarVenta(q.cajero, {
        sucursalId: q.sucursalId,
        almacenId: q.almacenId,
        sesionCajaId: turno.id,
        lineas: [{ varianteId: q.productos.pan.varianteId, cantidad: '1' }],
        cobros: [{ metodoPagoId: q.metodoPagoMovilId, monto: '12.00' }],
      }),
    ).rejects.toThrow(/referencia/)
  })

  it('un cajero no puede vender a crédito', async () => {
    const turno = await turnoNuevo()
    await expect(
      confirmarVenta(q.cajero, {
        sucursalId: q.sucursalId,
        almacenId: q.almacenId,
        sesionCajaId: turno.id,
        lineas: [{ varianteId: q.productos.pan.varianteId, cantidad: '1' }],
        cobros: [],
        aCredito: true,
      }),
    ).rejects.toThrow(/no permite vender a crédito/)
  })

  it('no permite un descuento mayor que la línea', async () => {
    const turno = await turnoNuevo()
    await expect(
      confirmarVenta(q.supervisor, {
        sucursalId: q.sucursalId,
        almacenId: q.almacenId,
        sesionCajaId: turno.id,
        lineas: [{ varianteId: q.productos.pan.varianteId, cantidad: '1', descuentoMonto: '50.00' }],
        cobros: [{ metodoPagoId: q.metodoEfectivoId, monto: '1.00' }],
      }),
    ).rejects.toThrow(/no puede superar el importe/)
  })
})

describe('POS: cobro mixto y divisas', () => {
  it('acepta pago mixto en efectivo y pago móvil', async () => {
    const turno = await turnoNuevo()
    const venta = await confirmarVenta(q.cajero, {
      sucursalId: q.sucursalId,
      almacenId: q.almacenId,
      sesionCajaId: turno.id,
      lineas: [{ varianteId: q.productos.refresco.varianteId, cantidad: '2' }],
      cobros: [
        { metodoPagoId: q.metodoEfectivoId, monto: '66.00' },
        { metodoPagoId: q.metodoPagoMovilId, monto: '50.00', referencia: '0451' },
      ],
    })
    expect(venta.pagos.length).toBe(2)
    expect(venta.estadoPago).toBe('PAGADA')
  })

  it('cobra en divisas aplicando la tasa y causando IGTF del 3 %', async () => {
    const turno = await turnoNuevo()
    // 1 pan de 12.00. Se paga con USD 1 a tasa 36.50 = Bs 36.50
    const venta = await confirmarVenta(q.cajero, {
      sucursalId: q.sucursalId,
      almacenId: q.almacenId,
      sesionCajaId: turno.id,
      lineas: [{ varianteId: q.productos.pan.varianteId, cantidad: '1' }],
      cobros: [{ metodoPagoId: q.metodoDivisaId, monto: '1', tasaCambio: '36.50' }],
    })

    // IGTF = 3 % de 36.50 = 1.095 → 1.10
    expect(igual(venta.igtfTotal, '1.10')).toBe(true)
    // El total sube por el IGTF: 12.00 + 1.10
    expect(igual(venta.total, '13.10')).toBe(true)

    const pago = venta.pagos[0]
    expect(pago.moneda).toBe('USD')
    expect(igual(pago.tasaCambio ?? 0, '36.50')).toBe(true)
    // La tasa queda congelada en el pago: el equivalente no se recalcula.
    expect(igual(pago.montoMonedaFuncional, '36.50')).toBe(true)
  })

  it('exige la tasa del día para cobrar en otra moneda', async () => {
    const turno = await turnoNuevo()
    await expect(
      confirmarVenta(q.cajero, {
        sucursalId: q.sucursalId,
        almacenId: q.almacenId,
        sesionCajaId: turno.id,
        lineas: [{ varianteId: q.productos.pan.varianteId, cantidad: '1' }],
        cobros: [{ metodoPagoId: q.metodoDivisaId, monto: '1' }],
      }),
    ).rejects.toThrow(/tasa de cambio/)
  })
})

describe('POS: criterio de aceptación — anular una venta cuadra inventario y caja', () => {
  it('devuelve el inventario y deja la caja sin diferencia', async () => {
    const turno = await turnoNuevo('100.00')

    const stockAntes = await existenciaDisponible(q.productos.refresco.varianteId, q.almacenId)
    const resumenAntes = await resumenTurno(q.supervisor, turno.id)

    const venta = await confirmarVenta(q.cajero, {
      sucursalId: q.sucursalId,
      almacenId: q.almacenId,
      sesionCajaId: turno.id,
      lineas: [{ varianteId: q.productos.refresco.varianteId, cantidad: '3' }],
      cobros: [{ metodoPagoId: q.metodoEfectivoId, monto: '174.00' }],
    })

    const stockVendido = await existenciaDisponible(q.productos.refresco.varianteId, q.almacenId)
    expect(igual(stockVendido, d(stockAntes).minus(3))).toBe(true)

    const resumenVendido = await resumenTurno(q.supervisor, turno.id)
    expect(igual(resumenVendido.efectivoEsperado, d(resumenAntes.efectivoEsperado).plus('174.00'))).toBe(true)

    // ── Anulación (la hace el supervisor: el cajero no puede) ──
    const anulada = await anularVenta(q.supervisor, venta.id, 'Cliente devolvió la mercancía')

    expect(anulada.estado).toBe('ANULADA')
    expect(anulada.motivoAnulacion).toBe('Cliente devolvió la mercancía')
    expect(anulada.anuladaPorId).toBe(q.supervisor.usuarioId)

    // El inventario volvió exactamente a donde estaba
    const stockFinal = await existenciaDisponible(q.productos.refresco.varianteId, q.almacenId)
    expect(igual(stockFinal, stockAntes)).toBe(true)

    // Y la caja también, sin dejar diferencia
    const resumenFinal = await resumenTurno(q.supervisor, turno.id)
    expect(igual(resumenFinal.efectivoEsperado, resumenAntes.efectivoEsperado)).toBe(true)

    // El kardex sigue cuadrado con las existencias
    const integridad = await verificarIntegridadKardex(q.organizacionId)
    expect(integridad.cuadrado).toBe(true)
  })

  it('no borra el documento: queda anulado y con su número', async () => {
    const turno = await turnoNuevo()
    const venta = await confirmarVenta(q.cajero, {
      sucursalId: q.sucursalId,
      almacenId: q.almacenId,
      sesionCajaId: turno.id,
      lineas: [{ varianteId: q.productos.pan.varianteId, cantidad: '1' }],
      cobros: [{ metodoPagoId: q.metodoEfectivoId, monto: '12.00' }],
    })
    await anularVenta(q.supervisor, venta.id, 'Error de captura')

    const enBase = await db.venta.findUnique({ where: { id: venta.id } })
    expect(enBase).not.toBeNull()
    expect(enBase?.numero).toBe(venta.numero)
    expect(enBase?.deletedAt).toBeNull()
  })

  it('exige motivo para anular', async () => {
    const turno = await turnoNuevo()
    const venta = await confirmarVenta(q.cajero, {
      sucursalId: q.sucursalId,
      almacenId: q.almacenId,
      sesionCajaId: turno.id,
      lineas: [{ varianteId: q.productos.pan.varianteId, cantidad: '1' }],
      cobros: [{ metodoPagoId: q.metodoEfectivoId, monto: '12.00' }],
    })
    await expect(anularVenta(q.supervisor, venta.id, '')).rejects.toThrow(/motivo/)
  })

  it('no anula dos veces la misma venta', async () => {
    const turno = await turnoNuevo()
    const venta = await confirmarVenta(q.cajero, {
      sucursalId: q.sucursalId,
      almacenId: q.almacenId,
      sesionCajaId: turno.id,
      lineas: [{ varianteId: q.productos.pan.varianteId, cantidad: '1' }],
      cobros: [{ metodoPagoId: q.metodoEfectivoId, monto: '12.00' }],
    })
    await anularVenta(q.supervisor, venta.id, 'Primera anulación')
    await expect(anularVenta(q.supervisor, venta.id, 'Segunda')).rejects.toThrow(/ya está anulada/)
  })

  it('el kardex conserva el movimiento original y su reversa', async () => {
    const turno = await turnoNuevo()
    const venta = await confirmarVenta(q.cajero, {
      sucursalId: q.sucursalId,
      almacenId: q.almacenId,
      sesionCajaId: turno.id,
      lineas: [{ varianteId: q.productos.caramelo.varianteId, cantidad: '5' }],
      cobros: [{ metodoPagoId: q.metodoEfectivoId, monto: '17.50' }],
    })
    await anularVenta(q.supervisor, venta.id, 'Anulada para probar el rastro')

    const movimientos = await db.movimientoInventario.findMany({
      where: { ventaId: venta.id },
      orderBy: { createdAt: 'asc' },
    })
    expect(movimientos.length).toBe(2)
    expect(movimientos[0].tipo).toBe('SALIDA_VENTA')
    expect(movimientos[1].tipo).toBe('REVERSA')
    expect(movimientos[1].movimientoReversadoId).toBe(movimientos[0].id)
    // La reversa se valora al costo original, no al promedio de hoy
    expect(igual(movimientos[1].costoUnitario, movimientos[0].costoUnitario)).toBe(true)
  })
})

describe('Caja: criterio de aceptación — el arqueo detecta y exige justificar', () => {
  it('calcula el efectivo esperado desde los cobros, no a mano', async () => {
    const turno = await turnoNuevo('50.00')
    await confirmarVenta(q.cajero, {
      sucursalId: q.sucursalId,
      almacenId: q.almacenId,
      sesionCajaId: turno.id,
      lineas: [{ varianteId: q.productos.pan.varianteId, cantidad: '2' }],
      cobros: [{ metodoPagoId: q.metodoEfectivoId, monto: '24.00' }],
    })

    const resumen = await resumenTurno(q.cajero, turno.id)
    // 50 de fondo + 24 cobrados en efectivo
    expect(igual(resumen.efectivoEsperado, '74.00')).toBe(true)
  })

  it('el pago móvil no entra a la gaveta pero sí al total de cobros', async () => {
    const turno = await turnoNuevo('50.00')
    await confirmarVenta(q.cajero, {
      sucursalId: q.sucursalId,
      almacenId: q.almacenId,
      sesionCajaId: turno.id,
      lineas: [{ varianteId: q.productos.pan.varianteId, cantidad: '2' }],
      cobros: [{ metodoPagoId: q.metodoPagoMovilId, monto: '24.00', referencia: '9981' }],
    })

    const resumen = await resumenTurno(q.cajero, turno.id)
    expect(igual(resumen.efectivoEsperado, '50.00')).toBe(true)
    expect(igual(resumen.totalCobros, '24.00')).toBe(true)
  })

  it('cierra sin novedad cuando el conteo coincide', async () => {
    const turno = await turnoNuevo('50.00')
    await confirmarVenta(q.cajero, {
      sucursalId: q.sucursalId,
      almacenId: q.almacenId,
      sesionCajaId: turno.id,
      lineas: [{ varianteId: q.productos.pan.varianteId, cantidad: '1' }],
      cobros: [{ metodoPagoId: q.metodoEfectivoId, monto: '12.00' }],
    })

    const { arqueo, sesion } = await cerrarTurno(q.cajero, {
      sesionCajaId: turno.id,
      efectivoContado: '62.00',
    })

    expect(igual(arqueo.diferencia, '0')).toBe(true)
    expect(sesion.estado).toBe('CERRADA')
    expect(sesion.fechaCierre).not.toBeNull()
  })

  it('RECHAZA el cierre cuando falta dinero y no hay justificación', async () => {
    const turno = await turnoNuevo('50.00')
    await confirmarVenta(q.cajero, {
      sucursalId: q.sucursalId,
      almacenId: q.almacenId,
      sesionCajaId: turno.id,
      lineas: [{ varianteId: q.productos.pan.varianteId, cantidad: '1' }],
      cobros: [{ metodoPagoId: q.metodoEfectivoId, monto: '12.00' }],
    })

    await expect(
      cerrarTurno(q.cajero, { sesionCajaId: turno.id, efectivoContado: '57.00' }),
    ).rejects.toThrow(/faltan 5\.00/)
  })

  it('registra la diferencia cuando se justifica', async () => {
    const turno = await turnoNuevo('50.00')
    const { arqueo } = await cerrarTurno(q.cajero, {
      sesionCajaId: turno.id,
      efectivoContado: '45.00',
      justificacion: 'Se pagó un flete en efectivo sin registrarlo',
    })

    expect(igual(arqueo.diferencia, '-5.00')).toBe(true)
    expect(arqueo.justificacion).toContain('flete')
  })

  it('también exige justificar un sobrante', async () => {
    const turno = await turnoNuevo('50.00')
    await expect(
      cerrarTurno(q.cajero, { sesionCajaId: turno.id, efectivoContado: '53.00' }),
    ).rejects.toThrow(/sobran 3\.00/)
  })

  it('un egreso de caja baja el efectivo esperado', async () => {
    const turno = await turnoNuevo('100.00')
    // Lo registra el supervisor: sacar dinero de la caja por un concepto
    // distinto de una venta no es algo que el cajero pueda hacer solo.
    await registrarMovimientoCaja(q.supervisor, {
      sesionCajaId: turno.id,
      tipo: 'EGRESO',
      concepto: 'Compra de bolsas plásticas',
      monto: '20.00',
    })
    const resumen = await resumenTurno(q.cajero, turno.id)
    expect(igual(resumen.efectivoEsperado, '80.00')).toBe(true)
  })

  it('no abre dos turnos en la misma caja', async () => {
    await turnoNuevo('10.00')
    await expect(abrirTurno(q.cajero, { cajaId: q.cajaId, montoInicial: '10.00' })).rejects.toThrow(
      /ya tiene un turno abierto/,
    )
  })

  it('no cierra dos veces el mismo turno', async () => {
    const turno = await turnoNuevo('10.00')
    await cerrarTurno(q.cajero, { sesionCajaId: turno.id, efectivoContado: '10.00' })
    await expect(
      cerrarTurno(q.cajero, { sesionCajaId: turno.id, efectivoContado: '10.00' }),
    ).rejects.toThrow(/ya está cerrado/)
  })
})

describe('POS: el motor valida permisos por sí mismo, no solo la ruta', () => {
  // Regresión: el motor confiaba en que la ruta hubiera llamado a
  // exigirPermiso, así que llamarlo directamente (un script, una tarea
  // programada, una ruta nueva) saltaba el control. "Validar en el servidor"
  // no puede significar "validar en la capa de rutas".
  it('un cajero no puede anular llamando al motor directamente', async () => {
    const turno = await turnoNuevo()
    const venta = await confirmarVenta(q.cajero, {
      sucursalId: q.sucursalId,
      almacenId: q.almacenId,
      sesionCajaId: turno.id,
      lineas: [{ varianteId: q.productos.pan.varianteId, cantidad: '1' }],
      cobros: [{ metodoPagoId: q.metodoEfectivoId, monto: '12.00' }],
    })

    await expect(anularVenta(q.cajero, venta.id, 'intento directo del cajero')).rejects.toThrow(
      /no permite/,
    )

    // Y la venta sigue confirmada: el intento no dejó estado a medias.
    const enBase = await db.venta.findUniqueOrThrow({ where: { id: venta.id } })
    expect(enBase.estado).toBe('CONFIRMADA')
  })

  it('un cajero no puede consultar el margen ni llamando al motor', async () => {
    await expect(margenPeriodo(q.cajero, new Date(Date.now() - 60_000), new Date())).rejects.toThrow(
      /no permite/,
    )
  })

  it('un almacenista no puede vender aunque llame al motor', async () => {
    const turno = await turnoNuevo()
    const almacenista = { ...q.supervisor }
    // Se construye un contexto de almacenista sobre el mismo negocio.
    const { contextoDe } = await import('./helpers-quiosco')
    const ctxAlmacenista = contextoDe('ALMACENISTA', {
      usuarioId: almacenista.usuarioId,
      email: almacenista.email,
      organizacionId: q.organizacionId,
      empresaId: q.empresaId,
    })

    await expect(
      confirmarVenta(ctxAlmacenista, {
        sucursalId: q.sucursalId,
        almacenId: q.almacenId,
        sesionCajaId: turno.id,
        lineas: [{ varianteId: q.productos.pan.varianteId, cantidad: '1' }],
        cobros: [{ metodoPagoId: q.metodoEfectivoId, monto: '12.00' }],
      }),
    ).rejects.toThrow(/no permite/)
  })

  it('un cajero no puede registrar movimientos de caja', async () => {
    const turno = await turnoNuevo()
    // El cajero abre y cierra su turno, pero sacar dinero de la caja por otro
    // concepto necesita supervisor.
    await expect(
      registrarMovimientoCaja(q.cajero, {
        sesionCajaId: turno.id,
        tipo: 'EGRESO',
        concepto: 'Retiro sin autorización',
        monto: '50.00',
      }),
    ).rejects.toThrow(/no permite/)
  })
})

describe('POS: criterio de aceptación — el cajero no ve costos por ninguna vía', () => {
  it('la lista de productos que recibe el cajero no trae costos', async () => {
    const resultado = await listarProductos(q.cajero, {})
    const json = JSON.stringify(resultado)
    expect(json).not.toMatch(/costoPromedio/)
    expect(json).not.toMatch(/ultimoCosto/)
    // Pero sí trae lo que necesita para vender
    expect(json).toMatch(/precio|monto/)
  })

  it('la misma consulta SÍ trae costos para el supervisor', async () => {
    const resultado = await listarProductos(q.supervisor, {})
    expect(JSON.stringify(resultado)).toMatch(/costoPromedio/)
  })

  it('la búsqueda por código de barras tampoco filtra el costo al cajero', async () => {
    const variante = await buscarPorCodigoBarras(q.cajero, q.productos.caramelo.codigoBarras)
    expect(JSON.stringify(variante)).not.toMatch(/costoPromedio/)
  })
})

describe('Rentabilidad: el margen usa el costo congelado', () => {
  it('calcula margen de un período con los costos del momento de cada venta', async () => {
    const turno = await turnoNuevo()
    const desde = new Date(Date.now() - 60_000)

    await confirmarVenta(q.cajero, {
      sucursalId: q.sucursalId,
      almacenId: q.almacenId,
      sesionCajaId: turno.id,
      lineas: [{ varianteId: q.productos.pan.varianteId, cantidad: '10' }],
      cobros: [{ metodoPagoId: q.metodoEfectivoId, monto: '120.00' }],
    })

    const margen = await margenPeriodo(q.supervisor, desde, new Date(Date.now() + 60_000))
    expect(margen.cantidadVentas).toBeGreaterThan(0)
    // El margen nunca puede ser mayor que el ingreso
    expect(iguales(margen.margen, d(margen.ingreso).minus(margen.costo))).toBe(true)
  })
})
