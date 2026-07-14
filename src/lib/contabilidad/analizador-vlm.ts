import { GoogleGenerativeAI } from '@google/generative-ai'

// 1. Definición completa de la interfaz (esto corrige el primer error)
export interface FacturaExtraida {
  tipoDetectado: 'COMPRA' | 'VENTA' | 'NOTA_CREDITO' | 'NOTA_DEBITO' | 'GASTO_MENOR' | 'DESCONOCIDO'
  emisor: { nombre: string; rif: string; rifValido: boolean; direccion?: string; telefono?: string }
  receptor: { nombre: string; rif: string; rifValido: boolean }
  numeroFactura: string
  numeroControl: string
  ncf: string
  ncfValido: boolean
  ncfTipo: string | null
  fechaEmision: string
  monedaOriginal: 'VES' | 'USD' | 'EUR' | 'OTRA'
  baseImponible: number
  montoExento: number
  montoExonerado: number
  alicuotaIVA: number
  montoIVA: number
  subtotal: number
  total: number
  retencionIVAPorcentaje: number | null
  retencionIVAMonto: number | null
  retencionISLRPorcentaje: number | null
  retencionISLRMonto: number | null
  retencionISLRBase: number | null
  descripcion: string
  items: Array<{ descripcion: string; cantidad: number; precioUnitario: number; total: number }>
  confianza: number
  advertencias: string[]
  rawText?: string
}

// 2. Función de parseo (esto corrige el segundo error)
function parsearRespuestaVLM(content: string): FacturaExtraida {
  let jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim()
  const inicio = jsonStr.indexOf('{')
  const fin = jsonStr.lastIndexOf('}')
  if (inicio === -1 || fin === -1) throw new Error('Respuesta no contiene un JSON válido')
  jsonStr = jsonStr.substring(inicio, fin + 1)
  return JSON.parse(jsonStr) as FacturaExtraida
}

// 3. Función principal
export async function analizarFactura(imageBase64: string, mimeType: string = 'image/jpeg'): Promise<FacturaExtraida> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY no está configurada')

  const genAI = new GoogleGenerativeAI(apiKey)
  // Usamos gemini-1.5-flash ya que es el modelo diseñado para visión
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "")
  const imagePart = { inlineData: { data: base64Data, mimeType } }

  const prompt = "Eres un contador experto. Analiza la factura y devuelve SOLO un JSON plano sin markdown, sin texto adicional."
  const result = await model.generateContent([prompt, imagePart])
  const text = result.response.text()
  
  return parsearRespuestaVLM(text)
}