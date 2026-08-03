import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'

// ==========================================
// 1. TU FUNCIÓN GET EXISTENTE (NO SE TOCA)
// ==========================================
export async function GET(req: NextRequest) {
  try {
    const empresaId = await requireEmpresa()
    const { searchParams } = new URL(req.url)
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    const limit = parseInt(searchParams.get('limit') || '500')

    const where: any = { empresaId }
    if (desde || hasta) {
      where.fecha = {}
      if (desde) where.fecha.gte = new Date(desde)
      if (hasta) where.fecha.lte = new Date(hasta)
    }

    const asientos = await db.asiento.findMany({
      where,
      orderBy: [ { fecha: 'asc' }, { numero: 'asc' } ],
      take: limit,
      include: {
        lineas: {
          include: { cuenta: true },
          orderBy: { id: 'asc' }
        }
      }
    })
    return NextResponse.json({ asientos })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 })
  }
}

// ==========================================
// 2. NUEVA FUNCIÓN POST (MOTOR CONTABLE VEN-NIF)
// ==========================================
export async function POST(request: Request) {
  try {
    // Validamos que el usuario esté autenticado en la empresa activa
    const empresaId = await requireEmpresa()
    
    const body = await request.json()
    const {
      nombreContraparte,
      rifContraparte,
      numeroFactura,
      subtotal,
      montoExento,
      montoIVA,
      total,
      monedaOriginal,
      usoGasto,           // Ej: 'GASTO_TELEFONO', 'GASTO_ALQUILER'
      aplicaRetencionIVA, // boolean
      porcentajeRetRes,   // 75 o 100
      codigoRetISLR       // Código de tarifa o null
    } = body

    // Mapeo dinámico al Plan de Cuentas venezolano
    const MAPEO_CUENTAS_GASTO: Record<string, string> = {
      GASTO_SERVICIOS_BASICOS: '6.1.01.01.001',
      GASTO_TELEFONO:          '6.1.01.01.002',
      GASTO_ALQUILER:          '6.1.01.01.003',
      GASTO_UTILES:            '6.1.01.02.001',
      GASTO_PUBLICIDAD:        '6.1.01.03.001',
      GASTO_MANTENIMIENTO:     '6.1.01.04.001',
      GASTO_HONORARIOS:        '6.1.01.05.001',
      GASTO_VIAJE:             '6.1.01.06.001',
      GASTO_COMBUSTIBLE:       '6.1.01.07.001',
      GASTO_SUELDOS:           '6.1.02.01.001',
      GASTO_OTROS:             '6.1.01.99.001'
    }

    const CUENTA_GASTO = MAPEO_CUENTAS_GASTO[usoGasto] || MAPEO_CUENTAS_GASTO['GASTO_OTROS']
    const CUENTA_CREDITO_FISCAL = '1.1.03.01.001' 
    const CUENTA_PROVEEDORES =      '2.1.01.01.001' 
    const CUENTA_RET_IVA_PAGAR =   '2.1.03.01.001' 
    const CUENTA_RET_ISLR_PAGAR =  '2.1.03.02.001' 

    // Cálculos de Retenciones Fiscales (SENIAT)
    let retencionIVAMonto = 0
    if (aplicaRetencionIVA && montoIVA > 0) {
      const factor = porcentajeRetRes === 100 ? 1.0 : 0.75
      retencionIVAMonto = Number((montoIVA * factor).toFixed(2))
    }

    let retencionISLRMonto = 0
    if (codigoRetISLR && usoGasto === 'GASTO_HONORARIOS') {
      // Cálculo estimado para Honorarios (ej. 2% para PJ)
      retencionISLRMonto = Number((subtotal * 0.02).toFixed(2))
    }

    const montoNetoPorPagar = Number((total - retencionIVAMonto - retencionISLRMonto).toFixed(2))
    const lineasAsiento: Array<{ cuentaCodigo: string; descripcion: string; debe: number; haber: number }> = []

    // ---- DEBE ----
    lineasAsiento.push({
      cuentaCodigo: CUENTA_GASTO,
      descripcion: `Gasto según fac. ${numeroFactura} - ${nombreContraparte}`,
      debe: Number((subtotal + montoExento).toFixed(2)),
      haber: 0
    })

    if (montoIVA > 0) {
      lineasAsiento.push({
        cuentaCodigo: CUENTA_CREDITO_FISCAL,
        descripcion: `IVA Crédito Fiscal fac. ${numeroFactura}`,
        debe: montoIVA,
        haber: 0
      })
    }

    // ---- HABER ----
    lineasAsiento.push({
      cuentaCodigo: CUENTA_PROVEEDORES,
      descripcion: `Provisión de obligación fac. ${numeroFactura}`,
      debe: 0,
      haber: montoNetoPorPagar
    })

    if (retencionIVAMonto > 0) {
      lineasAsiento.push({
        cuentaCodigo: CUENTA_RET_IVA_PAGAR,
        descripcion: `Retención IVA ${porcentajeRetRes}% fac. ${numeroFactura}`,
        debe: 0,
        haber: retencionIVAMonto
      })
    }

    if (retencionISLRMonto > 0) {
      lineasAsiento.push({
        cuentaCodigo: CUENTA_RET_ISLR_PAGAR,
        descripcion: `Retención ISLR cód. ${codigoRetISLR} fac. ${numeroFactura}`,
        debe: 0,
        haber: retencionISLRMonto
      })
    }

    return NextResponse.json({
      ok: true,
      mensaje: 'Estructura de asiento pre-calculada exitosamente',
      data: {
        empresaId,
        resumenFiscal: {
          subtotal,
          montoIVA,
          retencionIVA: retencionIVAMonto,
          retencionISLR: retencionISLRMonto,
          netoPasivo: montoNetoPorPagar
        },
        asientoEstructura: lineasAsiento
      }
    })

  } catch (error: any) {
    console.error('Error al generar el asiento:', error)
    return NextResponse.json({ ok: false, error: error.message || 'Error en el motor contable' }, { status: 500 })
  }
}
