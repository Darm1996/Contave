import OpenAI from 'openai';

// Definición de la estructura de datos esperada
export interface FacturaExtraida {
  tipoDetectado: 'COMPRA' | 'VENTA' | 'NOTA_CREDITO' | 'NOTA_DEBITO' | 'GASTO_MENOR' | 'DESCONOCIDO';
  emisor: { nombre: string; rif: string; rifValido: boolean };
  receptor: { nombre: string; rif: string; rifValido: boolean };
  numeroFactura: string;
  total: number;
  items: Array<{ descripcion: string; total: number }>;
}

export async function analizarFactura(imageBase64: string, mimeType: string = 'image/jpeg'): Promise<FacturaExtraida> {
  const apiKey = process.env.ZAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('ZAI_API_KEY no está configurada en las variables de entorno');
  }

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://api.z.ai/v1' 
  });

  const response = await client.chat.completions.create({
    model: 'glm-5v-turbo',
    messages: [
      {
        role: "user",
        content: [
          { 
            type: "text", 
            text: "Eres un contador experto. Analiza la imagen de la factura y extrae los datos. Devuelve ÚNICAMENTE un objeto JSON plano que coincida con esta estructura: { tipoDetectado, emisor, receptor, numeroFactura, total, items }. No incluyas explicaciones ni formato markdown." 
          },
          { 
            type: "image_url", 
            image_url: { url: `data:${mimeType};base64,${imageBase64}` } 
          }
        ],
      },
    ],
  });

  const content = response.choices[0].message.content || '{}';
  
  // Limpieza robusta del string para asegurar que sea un JSON válido
  const jsonString = content
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(jsonString) as FacturaExtraida;
  } catch (error) {
    console.error("Error al parsear el JSON de Z.ai:", content);
    throw new Error("La IA no devolvió un formato JSON válido.");
  }
}