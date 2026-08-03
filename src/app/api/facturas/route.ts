import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa, requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { calcularIVA, calcularRetencionIVA, validarRIF, validarNCF, parseFechaVE } from '@/lib/contabilidad/ven-nif'

export async function GET(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const { searchParams } = new URL(req.url)
    const tipo = searchParams.get('tipo') || undefined
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    const limit = parseInt(searchParams.get('limit') || '200')

    const where: any = { empresaId }
    if (tipo) where.tipo = tipo
    if (desde || hasta) {
      where.fechaEmision = {}
      if (desde) where.fechaEmision.gte = new Date(desde)
      if (hasta) where.fechaEmision.lte = new Date(hasta)
    }
    const facturas = await db.factura.findMany({
      where,
      orderBy: { fechaEmision: 'desc' },
      take: limit,
      include: { asiento: { select: { id: true, numero: true } } },
    })
    return NextResponse.json({ facturas })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const user = await requireAuth()
    const body = await req.json()

    // Validar RIF
    const rifCheck = validarRIF(body.rifContraparte || '')
    if (!rifCheck.valido) {
      return NextResponse.json({ error: `RIF inválido: ${body.rifContraparte}` }, { status: 400 })
    }

    // Validar NCF si viene
    let ncfNormalizado = body.ncf || null
    if (body.ncf) {
      const ncfCheck = validarNCF(body.ncf)
      if (!ncfCheck.valido) {
        return NextResponse.json({ error: `NCF inválido: ${body.ncf}` }, { status: 400 })
      }
      ncfNormalizado = ncfCheck.normalizado
    }

    // Calcular montos
    const baseImponible = Number(body.baseImponible) || 0
    const montoExento = Number(body.montoExento) || 0
    const montoExonerado = Number(body.montoExonerado) || 0
    const alicuotaIVA = Number(body.alicuotaIVA) || 16
    const montoIVA = body.montoIVA != null ? Number(body.montoIVA) : calcularIVA(baseImponible, alicuotaIVA)
    const subtotal = baseImponible + montoExento + montoExonerado
    const total = subtotal + montoIVA

    // Retención IVA (si la empresa es agente)
    const empresa = await db.empresa.findUnique({ where: { id: empresaId } })
    const retIVA = calcularRetencionIVA(
      montoIVA,
      empresa?.esAgenteRetencionIVA ?? false,
      Boolean(body.contraparteEspecial),
    )
    const montoRetencionIVA = retIVA.monto
    const porcentajeRetIVA = retIVA.porcentaje

    // Retención ISLR (si viene en el body desde el VLM o el usuario la completa)
    let montoRetencionISLR: number | null = body.montoRetencionISLR != null ? Number(body.montoRetencionISLR) : null
    let porcentajeRetencionISLR: number | null = body.porcentajeRetencionISLR != null ? Number(body.porcentajeRetencionISLR) : null
    let baseRetencionISLR: number | null = body.baseRetencionISLR != null ? Number(body.baseRetencionISLR) : null
    let tarifaISLRCodigo: string | null = body.tarifaISLRCodigo || null

    // Si el usuario eligió tarifa ISLR pero no hay monto, calcularlo
    if (tarifaISLRCodigo && !montoRetencionISLR) {
      const { calcularRetencionISLR, buscarTarifaISLR } = await import('@/lib/contabilidad/islr')
      const tarifa = buscarTarifaISLR(tarifaISLRCodigo)
      if (tarifa) {
        const pago = subtotal // Base de pago sin IVA exento
        const calc = calcularRetencionISLR(pago, tarifa)
        if (calc.aplicaRetencion) {
          montoRetencionISLR = calc.montoRetenido
          porcentajeRetencionISLR = tarifa.porcentaje
          baseRetencionISLR = calc.baseImponible
        }
      }
    }

    const totalRetencion = (montoRetencionIVA ?? 0) + (montoRetencionISLR ?? 0)
    const totalAPagar = total - totalRetencion

    // Conversión a moneda funcional
    let tasaCambio: number | null = null
    let totalMonedaFuncional = total
    const monedaOriginal = body.monedaOriginal || 'VES'
    if (monedaOriginal !== empresa?.monedaFuncional) {
      tasaCambio = body.tasaCambio ? Number(body.tasaCambio) : null
      if (tasaCambio) {
        totalMonedaFuncional = monedaOriginal === 'USD' ? total * tasaCambio : total / tasaCambio
      }
    }

    const fechaEmision = body.fechaEmision ? (parseFechaVE(body.fechaEmision) || new Date(body.fechaEmision)) : new Date()

    const factura = await db.factura.create({
      data: {
        empresaId,
        userId: user.id,
        tipo: body.tipo || 'COMPRA',
        rifContraparte: rifCheck.normalizado,
        nombreContraparte: body.nombreContraparte || '',
        numeroFactura: body.numeroFactura || null,
        numeroControl: body.numeroControl || null,
        ncf: ncfNormalizado,
        fechaEmision,
        monedaOriginal,
        baseImponible,
        montoExento,
        montoExonerado,
        alicuotaIVA,
        montoIVA,
        porcentajeRetencionIVA: porcentajeRetIVA,
        montoRetencionIVA,
        tarifaISLRCodigo,
        porcentajeRetencionISLR,
        baseRetencionISLR,
        montoRetencionISLR,
        subtotal,
        total,
        totalRetencion,
        totalAPagar,
        tasaCambio,
        totalMonedaFuncional,
        descripcion: body.descripcion || null,
        imagenData: body.imagenData || null,
        // Solo aplica a NOTA_CREDITO/NOTA_DEBITO; se ignora para los demás tipos.
        ncfAfectaVenta: body.ncfAfectaVenta != null ? Boolean(body.ncfAfectaVenta) : true,
        estado: 'REGISTRADA',
      },
      include: { asiento: true },
    })
    return NextResponse.json({ factura })
  } catch (e: any) {
    console.error('Create factura error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
