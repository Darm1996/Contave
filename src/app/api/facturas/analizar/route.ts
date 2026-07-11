import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresa, requireAuth } from '@/lib/auth'
import { analizarFactura } from '@/lib/contabilidad/analizador-vlm'

// POST /api/facturas/analizar
// Body: { imagen: <base64>, mimeType: 'image/jpeg' }
// Returns: FacturaExtraida
export async function POST(req: NextRequest) {
  try {
    await requireAuth()
    const { imagen, mimeType } = await req.json()
    if (!imagen) {
      return NextResponse.json({ error: 'Imagen base64 requerida' }, { status: 400 })
    }
    const resultado = await analizarFactura(imagen, mimeType || 'image/jpeg')
    return NextResponse.json({ resultado })
  } catch (e: any) {
    console.error('Analizar factura error:', e)
    return NextResponse.json({ error: e.message || 'Error al analizar la factura' }, { status: 500 })
  }
}
