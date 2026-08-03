import OpenAI from 'openai';
import { validarRIF } from './ven-nif';

export interface FacturaExtraida {
  tipoDetectado: 'COMPRA' | 'VENTA' | 'NOTA_CREDITO' | 'NOTA_DEBITO' | 'GASTO_MENOR' | 'DESCONOCIDO';
  emisor: { nombre: string; rif: string; rifValido: boolean };
  receptor: { nombre: string; rif: string; rifValido: boolean };
  numeroFactura: string;
  numeroControl: string;
  ncf: string;
  fechaEmision: string;
  monedaOriginal: 'VES' | 'USD';
  baseImponible: number;
  montoExento: number;
  montoExonerado: number;
  alicuotaIVA: number;
  montoIVA: number;
  total: number;
  descripcion: string;
  items: Array<{ descripcion: string; total: number }>;
  confianza: number;
  advertencias: string[];
  retencionISLRMonto: number | null;
  retencionISLRPorcentaje: number | null;
  retencionISLRBase: number | null;
}

const PROMPT_EXTRACCION = `Eres un asistente contable especializado en facturación venezolana (normas SENIAT). Analiza la imagen de esta factura, nota de crédito o nota de débito y devuelve ÚNICAMENTE un objeto JSON (sin texto adicional, sin bloques de markdown) con exactamente esta forma:

{
  "tipoDetectado": "COMPRA" | "VENTA" | "NOTA_CREDITO" | "NOTA_DEBITO" | "GASTO_MENOR" | "DESCONOCIDO",
  "emisor": { "nombre": string, "rif": string },
  "receptor": { "nombre": string, "rif": string },
  "numeroFactura": string,
  "numeroControl": string,
  "ncf": string,
  "fechaEmision": string (formato YYYY-MM-DD),
  "monedaOriginal": "VES" | "USD",
  "baseImponible": number (monto gravado, sin IVA),
  "montoExento": number (monto exento de IVA, 0 si no aplica),
  "montoExonerado": number (monto exonerado de IVA, 0 si no aplica),
  "alicuotaIVA": number (porcentaje de IVA aplicado, normalmente 16),
  "montoIVA": number,
  "total": number,
  "descripcion": string (breve descripción del concepto o los bienes/servicios),
  "items": [ { "descripcion": string, "total": number } ],
  "confianza": number (0-100, qué tan seguro estás de la extracción),
  "advertencias": [ string ] (campos ilegibles, inconsistencias entre montos, RIF con formato dudoso, etc.)
}

Reglas:
- "tipoDetectado": VENTA si el documento es una factura fiscal común de venta/servicio; COMPRA si es una compra a un proveedor; NOTA_CREDITO o NOTA_DEBITO si el documento lo indica explícitamente; GASTO_MENOR si es un recibo/ticket sin desglose fiscal claro; DESCONOCIDO si no se puede determinar.
- El RIF venezolano tiene el formato [VEJPG]-########-#. Transcríbelo tal como aparece en el documento, sin inventar dígitos.
- Si un campo no aparece en la imagen o no puedes leerlo con certeza, usa "" para strings, 0 para números, y agrega una nota en "advertencias" explicando qué campo falta.
- baseImponible + montoExento + montoExonerado + montoIVA debe ser aproximadamente igual a total; si no cuadra, prioriza el total impreso en el documento y anota la discrepancia en "advertencias".
- No inventes datos que no estén en la imagen.`

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : (v == null ? '' : String(v))
}

// Normaliza la respuesta cruda del modelo a la forma exacta que espera la app,
// rellenando con valores seguros lo que el modelo omita o devuelva mal tipado,
// y verificando el RIF con el validador local en vez de confiar en el modelo.
export function normalizarRespuesta(raw: any): FacturaExtraida {
  const tiposValidos = ['COMPRA', 'VENTA', 'NOTA_CREDITO', 'NOTA_DEBITO', 'GASTO_MENOR', 'DESCONOCIDO']
  const tipoDetectado = tiposValidos.includes(raw?.tipoDetectado) ? raw.tipoDetectado : 'DESCONOCIDO'

  const emisorRif = validarRIF(str(raw?.emisor?.rif))
  const receptorRif = validarRIF(str(raw?.receptor?.rif))

  const advertencias: string[] = Array.isArray(raw?.advertencias) ? raw.advertencias.map(str) : []
  if (tipoDetectado === 'DESCONOCIDO') advertencias.push('No se pudo determinar el tipo de documento con certeza.')

  return {
    tipoDetectado,
    emisor: { nombre: str(raw?.emisor?.nombre), rif: emisorRif.normalizado, rifValido: emisorRif.valido },
    receptor: { nombre: str(raw?.receptor?.nombre), rif: receptorRif.normalizado, rifValido: receptorRif.valido },
    numeroFactura: str(raw?.numeroFactura),
    numeroControl: str(raw?.numeroControl),
    ncf: str(raw?.ncf),
    fechaEmision: str(raw?.fechaEmision) || new Date().toISOString().slice(0, 10),
    monedaOriginal: raw?.monedaOriginal === 'USD' ? 'USD' : 'VES',
    baseImponible: num(raw?.baseImponible),
    montoExento: num(raw?.montoExento),
    montoExonerado: num(raw?.montoExonerado),
    alicuotaIVA: raw?.alicuotaIVA != null ? num(raw.alicuotaIVA) : 16,
    montoIVA: num(raw?.montoIVA),
    total: num(raw?.total),
    descripcion: str(raw?.descripcion),
    items: Array.isArray(raw?.items)
      ? raw.items.map((it: any) => ({ descripcion: str(it?.descripcion), total: num(it?.total) }))
      : [],
    confianza: Math.max(0, Math.min(100, num(raw?.confianza))),
    advertencias,
    // La retención de ISLR no aparece en la imagen: la calcula la app según
    // la tarifa que el usuario seleccione al revisar los datos extraídos.
    retencionISLRMonto: null,
    retencionISLRPorcentaje: null,
    retencionISLRBase: null,
  }
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
          { type: "text", text: PROMPT_EXTRACCION },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } }
        ],
      },
    ],
  });

  const content = response.choices[0].message.content || '{}';
  const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
  let raw: any
  try {
    raw = JSON.parse(cleaned)
  } catch {
    throw new Error('El modelo no devolvió un JSON válido. Intenta con una imagen más clara.')
  }
  return normalizarRespuesta(raw);
}
