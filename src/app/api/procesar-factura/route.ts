import { NextResponse } from 'next/server'
import { GoogleGenAI, Type, Schema } from '@google/generative-ai'

// Inicializamos el SDK con la clave de API que tienes en tu entorno
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' })

// Esquema adaptado exactamente a la interfaz de tu frontend
const facturaSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    nombreContraparte: { type: Type.STRING, description: "Razón social o nombre del emisor." },
    rifContraparte: { type: Type.STRING, description: "RIF del emisor (ej: J-12345678-9)." },
    numeroFactura: { type: Type.STRING, description: "Número de la factura." },
    numeroControl: { type: Type.STRING, description: "Número de control del SENIAT." },
    fechaEmision: { type: Type.STRING, description: "Fecha en formato YYYY-MM-DD." },
    monedaOriginal: { type: Type.STRING, description: "Moneda: 'VES' o 'USD'." },
    subtotal: { type: Type.NUMBER, description: "Monto total de los conceptos gravados (Base Imponible)." },
    montoExento: { type: Type.NUMBER, description: "Monto exento de IVA." },
    alicuotaIVA: { type: Type.NUMBER, description: "Porcentaje de IVA (ej: 16 o 8)." },
    montoIVA: { type: Type.NUMBER, description: "Monto total del IVA calculado." },
    total: { type: Type.NUMBER, description: "Monto total (Subtotal + Exento + IVA)." },
    descripcion: { type: Type.STRING, description: "Breve descripción o glosa de la compra." }
  },
  required: [
    "nombreContraparte", "rifContraparte", "numeroFactura", "numeroControl", 
    "fechaEmision", "monedaOriginal", "subtotal", "montoExento", 
    "montoIVA", "total", "descripcion"
  ]
}

export async function POST(request: Request) {
  try {
    const { imagenBase64, mimeType } = await request.json()

    if (!imagenBase64 || !mimeType) {
      return NextResponse.json({ valido: false, error: 'Faltan datos de la imagen' }, { status: 400 })
    }

    // Usamos el modelo flash para máxima velocidad de lectura
    const model = ai.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: facturaSchema,
        temperature: 0.1, // Evita alucinaciones numéricas
      }
    })

    const systemInstruction = `
      Eres un auditor fiscal experto en la legislación venezolana (providencias del SENIAT).
      Extrae con ultra-precisión los datos de la factura provista.
      
      Reglas:
      1. Limpia el RIF: sin espacios, mayúsculas y con guiones (ej: J-29934224-0).
      2. Si la factura muestra montos en dólares y bolívares, prioriza la moneda en la que se totaliza el pago o la divisa si es la base principal.
      3. Valida la matemática: subtotal + montoExento + montoIVA debe ser igual al total.
    `

    const partesImagen = [
      {
        inlineData: {
          data: imagenBase64,
          mimeType: mimeType
        }
      }
    ]

    const resultado = await model.generateContent([systemInstruction, ...partesImagen])
    const respuestaTexto = resultado.response.text()

    if (!respuestaTexto) {
      throw new Error('Gemini no retornó datos válidos')
    }

    const datosExtraidos = JSON.parse(respuestaTexto)

    // Devolvemos la estructura limpia directa para tu componente
    return NextResponse.json({
      ok: true,
      valido: true,
      data: datosExtraidos
    })

  } catch (error: any) {
    console.error('Error en procesamiento:', error)
    return NextResponse.json({ 
      ok: false, 
      valido: false, 
      error: error.message || 'Error interno del servidor' 
    }, { status: 500 })
  }
}
