import { NextResponse } from 'next/server'
import { requireEmpresa } from '@/lib/auth'
import { db } from '@/lib/db'
import { generarFacturaPdfBuffer } from '@/lib/exports/factura-pdf'
import { aNumero } from '@/lib/nucleo/dinero'

// GET /api/facturas/[id]/pdf - genera y descarga el PDF de una factura de venta emitida
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const empresaId = await requireEmpresa()
    const { id } = await params
    const factura = await db.factura.findUnique({ where: { id } })
    if (!factura || factura.empresaId !== empresaId) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    }
    const empresa = await db.empresa.findUnique({ where: { id: empresaId } })
    if (!empresa) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })

    const buffer = await generarFacturaPdfBuffer({
      empresa: { nombre: empresa.nombre, rif: empresa.rif, direccion: empresa.direccion, telefono: empresa.telefono, email: empresa.email },
      factura: {
        numeroFactura: factura.numeroFactura,
        numeroControl: factura.numeroControl,
        fechaEmision: factura.fechaEmision,
        rifContraparte: factura.rifContraparte,
        nombreContraparte: factura.nombreContraparte,
        descripcion: factura.descripcion,
        baseImponible: aNumero(factura.baseImponible),
        montoExento: aNumero(factura.montoExento),
        alicuotaIVA: aNumero(factura.alicuotaIVA),
        montoIVA: aNumero(factura.montoIVA),
        total: aNumero(factura.total),
      },
    })

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Factura_${factura.numeroFactura || factura.id}.pdf"`,
      },
    })
  } catch (e: any) {
    console.error('Generar PDF factura error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
