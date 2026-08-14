// Conciliación bancaria
// Permite cargar movimientos del extracto bancario y compararlos con los asientos contables

import { db } from '@/lib/db'
import { aNumero } from '@/lib/nucleo/dinero'

export interface MovimientoBancoInput {
  fecha: string | Date
  descripcion: string
  referencia?: string
  monto: number // Positivo = entrada, Negativo = salida
  tipo?: string // DEPOSITO, CHEQUE, TRANSFERENCIA, NOTA_CREDITO, NOTA_DEBITO, OTRO
}

export interface ResultadoConciliacion {
  conciliacion: any
  movimientosCargados: number
  movimientosConciliados: number
  diferenciaFinal: number
  cuadra: boolean
}

// Crear o actualizar una conciliación para una cuenta/mes/año
export async function crearOActualizarConciliacion(
  empresaId: string,
  cuentaId: string,
  mes: number,
  ano: number,
  saldoInicialBanco: number = 0,
  saldoFinalBanco: number = 0,
): Promise<any> {
  // Verificar que la cuenta sea de bancos
  const cuenta = await db.cuenta.findUnique({ where: { id: cuentaId } })
  if (!cuenta) throw new Error('Cuenta no encontrada')
  if (!cuenta.uso?.includes('BANCOS') && !cuenta.uso?.includes('CAJA')) {
    throw new Error('La cuenta debe ser de bancos o caja')
  }

  const inicioMes = new Date(ano, mes - 1, 1)
  const finMes = new Date(ano, mes, 0, 23, 59, 59)

  // Calcular saldo inicial del libro (saldo de la cuenta al inicio del mes)
  const lineasAntes = await db.asientoLinea.findMany({
    where: {
      cuentaId,
      asiento: { empresaId, fecha: { lt: inicioMes } },
    },
    select: { debit: true, credit: true },
  })
  const saldoInicialLibro = lineasAntes.reduce((s, l) => s + aNumero(l.debit) - aNumero(l.credit), 0)

  // Calcular saldo final del libro (saldo al cierre del mes)
  const lineasMes = await db.asientoLinea.findMany({
    where: {
      cuentaId,
      asiento: { empresaId, fecha: { gte: inicioMes, lte: finMes } },
    },
    select: { debit: true, credit: true },
  })
  const movimientosLibro = lineasMes.reduce((s, l) => s + aNumero(l.debit) - aNumero(l.credit), 0)
  const saldoFinalLibro = saldoInicialLibro + movimientosLibro

  // Upsert conciliación
  const conciliacion = await db.conciliacionBanco.upsert({
    where: { empresaId_cuentaId_mes_ano: { empresaId, cuentaId, mes, ano } },
    update: {
      saldoInicialLibro,
      saldoFinalLibro,
      saldoInicialBanco,
      saldoFinalBanco,
    },
    create: {
      empresaId,
      cuentaId,
      mes,
      ano,
      saldoInicialLibro,
      saldoFinalLibro,
      saldoInicialBanco,
      saldoFinalBanco,
    },
    include: { movimientos: true, cuenta: true },
  })

  return conciliacion
}

// Cargar movimientos desde un extracto bancario (array de objetos)
export async function cargarMovimientosBanco(
  conciliacionId: string,
  movimientos: MovimientoBancoInput[],
): Promise<{ cargados: number; conciliados: number }> {
  // Eliminar movimientos anteriores no conciliados
  await db.movimientoBanco.deleteMany({
    where: { conciliacionId, conciliado: false },
  })

  let conciliados = 0
  for (const mov of movimientos) {
    // Intentar auto-conciliar con asientos del libro
    const fechaMov = new Date(mov.fecha)
    const conciliacion = await db.conciliacionBanco.findUnique({
      where: { id: conciliacionId },
    })
    if (!conciliacion) continue

    // Buscar líneas de asiento de la cuenta que coincidan en monto
    const montoAbs = Math.abs(mov.monto)
    const inicioMes = new Date(conciliacion.ano, conciliacion.mes - 1, 1)
    const finMes = new Date(conciliacion.ano, conciliacion.mes, 0, 23, 59, 59)

    // Si monto > 0 (depósito), buscar débito en el libro; si < 0 (cheque), buscar crédito
    const lineasCandidatas = await db.asientoLinea.findMany({
      where: {
        cuentaId: conciliacion.cuentaId,
        asiento: { empresaId: conciliacion.empresaId, fecha: { gte: inicioMes, lte: finMes } },
        OR: mov.monto > 0
          ? [{ debit: { gte: montoAbs - 0.5, lte: montoAbs + 0.5 } }]
          : [{ credit: { gte: montoAbs - 0.5, lte: montoAbs + 0.5 } }],
      },
      include: { asiento: true },
      take: 5,
    })

    // Buscar una línea que no esté ya conciliada
    let lineaConciliada: typeof lineasCandidatas[number] | null = null
    for (const l of lineasCandidatas) {
      // Verificar si esta línea ya está conciliada con otro movimiento
      const yaConciliada = await db.movimientoBanco.findFirst({
        where: { asientoLineaId: l.id, conciliado: true },
      })
      if (!yaConciliada) {
        lineaConciliada = l
        break
      }
    }

    const tipoDetectado = mov.tipo || detectarTipoMovimiento(mov.descripcion, mov.monto)
    const creado = await db.movimientoBanco.create({
      data: {
        conciliacionId,
        fecha: fechaMov,
        descripcion: mov.descripcion,
        referencia: mov.referencia || null,
        monto: mov.monto,
        tipo: tipoDetectado,
        conciliado: !!lineaConciliada,
        asientoLineaId: lineaConciliada?.id || null,
      },
    })
    if (lineaConciliada) conciliados++
  }

  // Recalcular diferencias
  await recalcularDiferencias(conciliacionId)

  return { cargados: movimientos.length, conciliados }
}

// Detectar tipo de movimiento por descripción
function detectarTipoMovimiento(descripcion: string, monto: number): string {
  const d = descripcion.toUpperCase()
  if (monto > 0) {
    if (d.includes('DEPÓSITO') || d.includes('DEPOSITO') || d.includes('TRANSFERENCIA RECIBIDA')) return 'DEPOSITO'
    if (d.includes('NOTA CRÉDITO') || d.includes('NOTA CREDITO')) return 'NOTA_CREDITO'
    return 'DEPOSITO'
  } else {
    if (d.includes('CHEQUE')) return 'CHEQUE'
    if (d.includes('TRANSFERENCIA') || d.includes('TRANSFER')) return 'TRANSFERENCIA'
    if (d.includes('NOTA DÉBITO') || d.includes('NOTA DEBITO') || d.includes('COMISIÓN') || d.includes('COMISION')) return 'NOTA_DEBITO'
    return 'OTRO'
  }
}

// Recalcular diferencias y estado de la conciliación
export async function recalcularDiferencias(conciliacionId: string) {
  const conc = await db.conciliacionBanco.findUnique({
    where: { id: conciliacionId },
    include: { movimientos: true },
  })
  if (!conc) return

  // Calcular partidas pendientes (movimientos no conciliados)
  const noConciliados = conc.movimientos.filter((m) => !m.conciliado)
  const depositosEnTransito = noConciliados
    .filter((m) => aNumero(m.monto) > 0)
    .reduce((s, m) => s + aNumero(m.monto), 0)
  const chequesPendientes = noConciliados
    .filter((m) => aNumero(m.monto) < 0)
    .reduce((s, m) => s + Math.abs(aNumero(m.monto)), 0)

  // Diferencia = (saldoFinalBanco + depositosEnTransito - chequesPendientes) - saldoFinalLibro
  const saldoBancoAjustado = aNumero(conc.saldoFinalBanco) + depositosEnTransito - chequesPendientes
  const diferencia = saldoBancoAjustado - aNumero(conc.saldoFinalLibro)

  // Buscar también partidas en el libro que no están en el banco
  // (notas de crédito/débito contabilizadas pero no reflejadas en el banco)
  const inicioMes = new Date(conc.ano, conc.mes - 1, 1)
  const finMes = new Date(conc.ano, conc.mes, 0, 23, 59, 59)
  const lineasLibro = await db.asientoLinea.findMany({
    where: {
      cuentaId: conc.cuentaId,
      asiento: { empresaId: conc.empresaId, fecha: { gte: inicioMes, lte: finMes } },
    },
    include: { asiento: true },
  })
  // Identificar líneas del libro sin movimiento bancario correspondiente
  const lineasNoConciliadas: typeof lineasLibro = []
  for (const l of lineasLibro) {
    const movRelacionado = await db.movimientoBanco.findFirst({
      where: { asientoLineaId: l.id, conciliado: true },
    })
    if (!movRelacionado) lineasNoConciliadas.push(l)
  }
  const notasCredito = lineasNoConciliadas
    .filter((l) => aNumero(l.credit) > 0)
    .reduce((s, l) => s + aNumero(l.credit), 0)
  const notasDebito = lineasNoConciliadas
    .filter((l) => aNumero(l.debit) > 0)
    .reduce((s, l) => s + aNumero(l.debit), 0)

  const diferenciaFinal = diferencia - notasCredito + notasDebito
  const cuadra = Math.abs(diferenciaFinal) < 0.01

  return db.conciliacionBanco.update({
    where: { id: conciliacionId },
    data: {
      depositosEnTransito,
      chequesPendientes,
      notasCredito,
      notasDebito,
      diferencia: diferenciaFinal,
      estado: cuadra ? 'CUADRADO' : 'PENDIENTE',
    },
  })
}

// Marcar/desmarcar un movimiento como conciliado manualmente
export async function toggleConciliacionMovimiento(
  movimientoId: string,
  asientoLineaId?: string,
): Promise<any> {
  const mov = await db.movimientoBanco.findUnique({ where: { id: movimientoId } })
  if (!mov) throw new Error('Movimiento no encontrado')

  const updated = await db.movimientoBanco.update({
    where: { id: movimientoId },
    data: {
      conciliado: !mov.conciliado,
      asientoLineaId: asientoLineaId || (mov.conciliado ? null : mov.asientoLineaId),
    },
  })

  await recalcularDiferencias(mov.conciliacionId)
  return updated
}

// Listar conciliaciones de una empresa
export async function listarConciliaciones(empresaId: string) {
  return db.conciliacionBanco.findMany({
    where: { empresaId },
    include: { cuenta: true, _count: { select: { movimientos: true } } },
    orderBy: [{ ano: 'desc' }, { mes: 'desc' }],
  })
}

// Obtener detalle de una conciliación con movimientos
export async function obtenerConciliacion(conciliacionId: string) {
  return db.conciliacionBanco.findUnique({
    where: { id: conciliacionId },
    include: {
      cuenta: true,
      movimientos: { orderBy: { fecha: 'asc' } },
    },
  })
}
