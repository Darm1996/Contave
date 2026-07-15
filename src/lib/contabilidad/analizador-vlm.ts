import { GoogleGenerativeAI } from '@google/generative-ai'

// Interfaz para asegurar la estructura
export interface FacturaExtraida {
  tipoDetectado: string
  emisor: { nombre: string; rif: string; rifValido: boolean }
  receptor: { nombre: string; rif: string; rifValido: boolean }
  numeroFactura: string
  numeroControl: string
  ncf: string
  fechaEmision: string
  total: number
  items: Array<{ descripcion: string; cantidad: number; precioUnitario: number; total: number }>
}

function parsearRespuestaVLM(content: string): FacturaExtraida {
  let jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim()
  const inicio = jsonStr.indexOf('{')
  const fin = jsonStr.lastIndexOf('}')
  if (inicio === -1 || fin === -1) throw new Error('Respuesta no contiene un JSON válido')
  jsonStr = jsonStr.substring(inicio, fin + 1)
  return JSON.parse(jsonStr) as FacturaExtraida
}

export async function analizarFactura(imageBase64: string, mimeType: string = 'image/jpeg'): Promise<FacturaExtraida> {
  const apiKey = process.env.GEMINI_API_KEY
  
  if (!apiKey) {
    console.error("ERROR: GEMINI_API_KEY no encontrada en process.env")
    throw new Error('GEMINI_API_KEY no está configurada')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  // Usamos el modelo con sufijo -001 para mayor estabilidad en v1beta
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-001' })

  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "")
  const imagePart = { inlineData: { data: base64Data, mimeType } }

  const prompt = "Eres un contador experto. Analiza la factura y devuelve SOLO un JSON plano sin markdown, sin texto adicional."
  
  const result = await model.generateContent([prompt, imagePart])
  const text = result.response.text()
  
  return parsearRespuestaVLM(text)
}