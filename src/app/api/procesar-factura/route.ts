import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Forzar comportamiento dinámico para evitar problemas con cookies/sesión en Vercel
export const dynamic = 'force-dynamic'

// Inicializamos el SDK con la versión correcta de la clase
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(req: Request) {
  try {
    const { imagenBase64, mimeType } = await req.json()

    if (!imagenBase64) {
      return NextResponse.json({ valido: false, error: 'No se proporcionó ninguna imagen' }, { status: 400 })
    }

    // Usamos el modelo optimizado para visión y estructuración de datos
    const model = ai.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    })

    const prompt = `
      Analiza esta imagen de factura emitida en Venezuela y extrae los datos de forma estrictamente estructurada en formato JSON.
      Devuelve los siguientes campos:
      - tipoDetectado: 'COMPRA' o 'VENTA' o 'GASTO_MENOR'
      - nombreContraparte: Nombre o razón social del emisor/receptor
      - rifContraparte: RIF limpio (ej. J123456789)
      - numeroFactura: Número del documento
      - numeroControl: Número de control fiscal
      - ncf: Número de comprobante fiscal si aplica (o vacío)
      - fechaEmision: Fecha en formato YYYY-MM-DD
      - monedaOriginal: 'VES' o 'USD'
      - baseImponible: número
      - montoExento: número
      - montoExonerado: número
      - alicuotaIVA: número (usualmente 16)
      - montoIVA: número
      - total: número
      - descripcion: Breve glosa del gasto o compra
      - confianza: número de 1 a 100
      - advertencias: arreglo de strings con anomalías visuales si las hay
    `

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imagenBase64,
          mimeType: mimeType || 'image/jpeg'
        }
      }
    ])

    const textResponse = result.response.text()
    const datosJSON = JSON.parse(textResponse)

    return NextResponse.json({ valido: true, datos: datosJSON })
  } catch (error: any) {
    console.error('Error procesando factura con Gemini:', error)
    return NextResponse.json({ valido: false, error: error.message }, { status: 500 })
  }
}
