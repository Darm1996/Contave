import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa, requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  generarAsientoCompra,
  generarAsientoVenta,
  generarAsientoNota,
  generarAsientoGastoMenor,
  persistirAsiento,
} from '@/lib/contabilidad/asientos-engine'

// POST /api/facturas/[id]/contabilizar
// Genera el asiento contable automático para la factura
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const empresaId = await requireEmpresa()
    const user = await requireAuth()
    const { id } = await params

    const factura = await db.factura.findUnique({
      where: { id },
      include: { asiento: true, empresa: true },
    })
    if (!factura) return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    if (factura.empresaId !== empresaId) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
    if (factura.asiento) return NextResponse.json({ error: 'La factura ya tiene un asiento contable', asiento: factura.asiento }, { status: 400 })

    // Parámetros adicionales del body
    const body = await req.json().catch(() => ({}))
    const esInventario = Boolean(body.esInventario ?? false)
    const usoGasto = body.usoGasto || 'GASTO_OTROS'
    const clienteRetieneIVA = Boolean(body.clienteRetieneIVA ?? false)
    const aplicaA: 'COMPRA' | 'VENTA' = body.aplicaA || 'COMPRA'

    let resultado
    if (factura.tipo === 'COMPRA') {
      resultado = await generarAsientoCompra({
        empresaId,
        tipo: factura.tipo,
        monedaOriginal: factura.monedaOriginal,
        baseImponible: factura.baseImponible,
        montoExento: factura.montoExento,
        montoExonerado: factura.montoExonerado,
        montoIVA: factura.montoIVA,
        subtotal: factura.subtotal,
        total: factura.total,
        montoRetencionIVA: factura.montoRetencionIVA,
        montoRetencionISLR: factura.montoRetencionISLR,
        porcentajeRetencionISLR: factura.porcentajeRetencionISLR,
        totalAPagar: factura.totalAPagar,
        totalMonedaFuncional: factura.totalMonedaFuncional,
        descripcion: factura.descripcion,
        esInventario,
        usoGasto,
      })
    } else if (factura.tipo === 'VENTA') {
      resultado = await generarAsientoVenta({
        empresaId,
        baseImponible: factura.baseImponible,
        montoExento: factura.montoExento,
        montoIVA: factura.montoIVA,
        subtotal: factura.subtotal,
        total: factura.total,
        montoRetencionIVA: factura.montoRetencionIVA,
        totalAPagar: factura.totalAPagar,
        totalMonedaFuncional: factura.totalMonedaFuncional,
        descripcion: factura.descripcion,
        clienteRetieneIVA,
      })
    } else if (factura.tipo === 'NOTA_CREDITO' || factura.tipo === 'NOTA_DEBITO') {
      resultado = await generarAsientoNota({
        empresaId,
        tipo: factura.tipo,
        baseImponible: factura.baseImponible,
        montoExento: factura.montoExento,
        montoIVA: factura.montoIVA,
        total: factura.total,
        totalMonedaFuncional: factura.totalMonedaFuncional,
        descripcion: factura.descripcion,
        aplicaA,
      })
    } else if (factura.tipo === 'GASTO_MENOR') {
      resultado = await generarAsientoGastoMenor({
        empresaId,
        baseImponible: factura.baseImponible,
        montoExento: factura.montoExento,
        montoIVA: factura.montoIVA,
        total: factura.total,
        totalAPagar: factura.totalAPagar,
        totalMonedaFuncional: factura.totalMonedaFuncional,
        montoRetencionISLR: factura.montoRetencionISLR,
        porcentajeRetencionISLR: factura.porcentajeRetencionISLR,
        descripcion: factura.descripcion,
        usoGasto,
      })
    } else {
      return NextResponse.json({ error: `Tipo de factura no reconocido para contabilizar: ${factura.tipo}` }, { status: 400 })
    }

    if (!resultado.balanceado) {
      return NextResponse.json({
        error: `Asiento no balanceado. Débito: ${resultado.totalDebit}, Crédito: ${resultado.totalCredit}. Revise los datos.`,
      }, { status: 400 })
    }

    // Persistir asiento
    const asiento = await persistirAsiento(
      empresaId,
      user.id,
      factura.id,
      `AUTO_${factura.tipo}`,
      factura.fechaEmision,
      resultado.descripcion,
      factura.ncf || factura.numeroFactura || null,
      'foto',
      resultado.lineas,
    )

    // Marcar factura como contabilizada
    await db.factura.update({
      where: { id: factura.id },
      data: { estado: 'CONTABILIZADA' },
    })

    return NextResponse.json({ asiento, lineas: resultado.lineas.length })
  } catch (e: any) {
    console.error('Contabilizar factura error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
