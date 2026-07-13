import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Forzar comportamiento dinámico para evitar problemas con cookies/sesión en Vercel
export const dynamic = 'force-dynamic'

// Inicializamos el SDK con la versión correcta
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(req: Request) {
  try {
    const { imagenBase64, mimeType } = await req.json()

    if (!imagenBase64) {
      return NextResponse.json({ valido: false, error: 'No se proporcionó ninguna imagen' }, { status: 400 })
    }

    // CORRECCIÓN: Usamos gemini-1.5-flash, que es el modelo actual disponible
    const model = ai.getGenerativeModel({
      model: 'gemini-1.5-flash', 
      generationConfig: {
        responseMimeType: 'application/json',
      },
    })

    const prompt = `
      Analiza esta imagen de factura emitida en Venezuela y extrae los datos de forma estrictamente estructurada en formato JSON.
      Devuelve SOLO un objeto JSON con los siguientes campos:
      tipoDetectado (COMPRA/VENTA/GASTO_MENOR), nombreContraparte, rifContraparte, numeroFactura, numeroControl, ncf, fechaEmision (YYYY-MM-DD), monedaOriginal (VES/USD), baseImponible (num), montoExento (num), montoExonerado (num), alicuotaIVA (num), montoIVA (num), total (num), descripcion, confianza (num), advertencias (array).
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
    // Limpieza de seguridad por si el modelo incluye bloques de markdown
    const cleanedText = textResponse.replace(/```json/g, '').replace(/```/g, '').trim()
    const datosJSON = JSON.parse(cleanedText)

    return NextResponse.json({ valido: true, datos: datosJSON })
  } catch (error: any) {
    console.error('Error procesando factura con Gemini:', error)
    return NextResponse.json({ valido: false, error: error.message }, { status: 500 })
  }
}
