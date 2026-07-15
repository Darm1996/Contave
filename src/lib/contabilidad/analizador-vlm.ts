import OpenAI from 'openai';

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
  if (!apiKey) throw new Error('ZAI_API_KEY no está configurada');

  // 1. Limpieza inicial del Base64
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  
  // 2. Validación de tamaño (6MB aproximado en base64 es ~8,000,000 caracteres)
  // Calculamos el tamaño estimado: (longitud * 3) / 4 / 1024 / 1024 en MB
  const sizeInMB = (base64Data.length * 0.75) / (1024 * 1024);
  
  if (sizeInMB > 4.5) {
    // Si supera el límite de Vercel (4.5MB), lanzamos error antes de que el servidor colapse
    throw new Error(`La imagen pesa ${sizeInMB.toFixed(2)}MB y supera el límite permitido de 4.5MB. Por favor, redúcela.`);
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
          { type: "text", text: "Extrae los datos de esta factura en JSON plano." },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } }
        ],
      },
    ],
  });

  const content = response.choices[0].message.content || '{}';
  return JSON.parse(content.replace(/```json/g, '').replace(/```/g, '').trim());
}