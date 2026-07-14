// Analizador de facturas venezolanas usando Google Gemini SDK
// Extrae: RIF emisor/receptor, NCF, número de control, fecha, montos, IVA, retención IVA, retención ISLR, etc.
// Prompt con few-shot examples para mayor robustez con facturas reales venezolanas

import { GoogleGenerativeAI } from '@google/generative-ai'
import { validarRIF, validarNCF, parseFechaVE } from './ven-nif'

export interface FacturaExtraida {
  // Tipo de documento detectado
  tipoDetectado: 'COMPRA' | 'VENTA' | 'NOTA_CREDITO' | 'NOTA_DEBITO' | 'GASTO_MENOR' | 'DESCONOCIDO'
  // Datos del emisor (quien emite la factura)
  emisor: {
    nombre: string
    rif: string
    rifValido: boolean
    direccion?: string
    telefono?: string
  }
  // Datos del receptor (a quien se emite)
  receptor: {
    nombre: string
    rif: string
    rifValido: boolean
  }
  // Datos fiscales
  numeroFactura: string
  numeroControl: string
  ncf: string
  ncfValido: boolean
  ncfTipo: string | null
  fechaEmision: string // ISO date string
  // Montos
  monedaOriginal: 'VES' | 'USD' | 'EUR' | 'OTRA'
  baseImponible: number
  montoExento: number
  montoExonerado: number
  alicuotaIVA: number
  montoIVA: number
  subtotal: number
  total: number
  // Retención IVA (si aparece en la factura)
  retencionIVAPorcentaje: number | null
  retencionIVAMonto: number | null
  // Retención ISLR (si aparece el comprobante de retención)
  retencionISLRPorcentaje: number | null
  retencionISLRMonto: number | null
  retencionISLRBase: number | null // Base imponible sobre la que se calcula el ISLR
  // Detalles
  descripcion: string
  items: Array<{ descripcion: string; cantidad: number; precioUnitario: number; total: number }>
  // Confianza
  confianza: number
  advertencias: string[]
  rawText?: string // Texto crudo detectado por el VLM (para debug)
}

const PROMPT_ANALISIS = `Eres un asistente experto en contabilidad venezolana con amplia experiencia reconociendo facturas fiscales del SENIAT (Providencia SNAT/2018/000078), recibos, notas de crédito/débito y comprobantes de retención de IVA e ISLR.

Analiza la imagen del documento fiscal venezolano y extrae TODOS los datos en formato JSON válido.

# FORMATO DE SALIDA ESPERADO

Devuelve EXCLUSIVAMENTE un objeto JSON válido (sin markdown, sin texto adicional, sin explicaciones) con esta estructura exacta:

{
  "tipoDetectado": "COMPRA|VENTA|NOTA_CREDITO|NOTA_DEBITO|GASTO_MENOR",
  "emisor": {
    "nombre": "razón social del emisor",
    "rif": "formato J-XXXXXXXX-X o V-XXXXXXXX-X (siempre con guiones)",
    "direccion": "dirección fiscal si aparece",
    "telefono": "teléfono si aparece"
  },
  "receptor": {
    "nombre": "nombre del receptor/cliente",
    "rif": "RIF del receptor con guiones"
  },
  "numeroFactura": "número de factura (sin letras 'N°' o 'Factura')",
  "numeroControl": "número de control fiscal (formato 00-000000 o similar)",
  "ncf": "Número de Comprobante Fiscal formato 01001001-XXXXXXXX",
  "fechaEmision": "DD/MM/YYYY",
  "monedaOriginal": "VES|USD|EUR",
  "baseImponible": número,
  "montoExento": número,
  "montoExonerado": número,
  "alicuotaIVA": 16,
  "montoIVA": número,
  "subtotal": número,
  "total": número,
  "retencionIVAPorcentaje": null o 75 o 100,
  "retencionIVAMonto": null o número,
  "retencionISLRPorcentaje": null o número (ej: 1, 2, 3, 5, 10),
  "retencionISLRMonto": null o número,
  "retencionISLRBase": null o número,
  "descripcion": "concepto general de la factura en una línea",
  "items": [
    {"descripcion": "...", "cantidad": 1, "precioUnitario": 0, "total": 0}
  ]
}

# REGLAS DETALLADAS

## Identificación del tipo de documento
- COMPRA: Factura fiscal emitida por un proveedor a la empresa (NCF que empieza con 010)
- VENTA: Factura fiscal emitida por la empresa a un cliente (NCF que empieza con 010)
- NOTA_CREDITO: Documento que anula o ajusta una factura previa (NCF que empieza con 040)
- NOTA_DEBITO: Cargo adicional a una factura previa (NCF que empieza con 030)
- GASTO_MENOR: Recibos informales, facturas no fiscales, gastos pequeños sin NCF

## Formato del RIF venezolano
- Estructura: LETRA + 9 dígitos + dígito verificador, separados con guiones
- Letras válidas: V (Venezolano), E (Extranjero residente), J (Jurídico), G (Gobierno), P (Pasaporte), C (Cédula)
- Ejemplos válidos: J-12345678-9, V-87654321-0, E-23456789-1
- Si el RIF aparece sin guiones (J123456789), normalízalo a J-12345678-9
- Si aparece como "RIF: J-12345678-9" o "J/12345678/9", extrae solo el RIF con guiones estándar

## Formato del NCF (Providencia SNAT/2018/000078)
- Estructura: 8 dígitos + guion + 8 dígitos = 17 caracteres total
- Prefijos válidos:
  - 01001001 = Factura fiscal (ventas a contribuyentes ordinarios)
  - 02001001 = Factura no fiscal (ventas a no contribuyentes)
  - 03001001 = Nota de débito fiscal
  - 04001001 = Nota de crédito fiscal
  - 05001001 = Nota de débito no fiscal
  - 06001001 = Nota de crédito no fiscal
  - 07001001 = Comprobante de retención de IVA
  - 08001001 = Comprobante de retención de ISLR
- Ejemplo válido: 01001001-00012345
- Si el NCF aparece sin guion (0100100100012345), inserta el guion: 01001001-00012345

## Número de Control
- Aparece generalmente como "N° de Control:" o "Control Fiscal:"
- Formato típico: 2 ceros, guion, 6 dígitos (00-012345) o 8 dígitos
- Algunas facturas antiguas usan formato "SN-012345"

## Fechas
- La fecha de emisión SIEMPRE debe estar en formato DD/MM/YYYY
- Si la fecha aparece como "09-07-2026" o "09-07-26", conviértela a "09/07/2026"
- Si aparecen dos fechas (emisión y vencimiento), usa la de emisión

## Moneda
- VES si el monto tiene "Bs.", "Bs", "Bolívares", "B." o no tiene símbolo
- USD si el monto tiene "$", "USD", "Dólares", "US$"
- EUR si tiene "€" o "EUR"

## Cálculo de IVA
- Alícuota general vigente en Venezuela: 16% (desde 2024)
- Base imponible × 0.16 = monto IVA
- Si la factura no muestra IVA (gasto menor exento), usa 0
- Si la factura muestra "exento", va en montoExento (no en baseImponible)
- Si la factura muestra "exonerado", va en montoExonerado

## Retención de IVA (Providencia SNAT/2005/0379)
- Aparece como "Retención IVA", "IVA Retenido", o en comprobante separado
- 75% para contribuyentes ordinarios
- 100% para contribuyentes especiales y entes públicos
- Si aparece un sello o leyenda "Agente de Retención", probablemente hay retención

## Retención de ISLR (Impuesto Sobre La Renta)
- Aparece como "Retención ISLR", "ISLR Retenido", o en comprobante de retención (NCF 08)
- Porcentajes típicos según el concepto:
  - Honorarios profesionales no mercantiles: 1% (sobre 90% del pago = 0.9% efectivo)
  - Servicios: 2% (sobre 90% = 1.8% efectivo)
  - Alquileres de inmuebles: 3% (variable según uso)
  - Comisión a vendedores: 3%
  - Intereses de capital: 4.95%
  - Seguros: 5%
- Si el documento es específicamente un comprobante de retención (NCF 08001001), completa retencionISLRMonto y retencionISLRPorcentaje

## Descripción y items
- descripcion: resumen de 1 línea del concepto (ej: "Compra de cemento, cabilla y arena")
- items: lista de productos/servicios con cantidad, precio unitario y total
- Si no hay items detallados (solo un total), deja items vacío []

## Si no encuentras un campo
- Strings: usa "" (cadena vacía)
- Números: usa 0
- Para campos opcionales (retenciones): usa null
- Para items sin detalle: usa array vacío []
- NUNCA inventes datos que no estén en la imagen

# EJEMPLOS

## Ejemplo 1: Factura fiscal estándar de compra
{
  "tipoDetectado": "COMPRA",
  "emisor": {"nombre": "DISTRIBUIDORA DEL CENTRO C.A.", "rif": "J-29583471-5", "direccion": "Av. Urdaneta, Caracas", "telefono": "0212-563.45.67"},
  "receptor": {"nombre": "FERRETERÍA EL TORNILLO C.A.", "rif": "J-12384567-3"},
  "numeroFactura": "00004567",
  "numeroControl": "00-012345",
  "ncf": "01001001-00004567",
  "fechaEmision": "09/07/2026",
  "monedaOriginal": "VES",
  "baseImponible": 2105.00,
  "montoExento": 0,
  "montoExonerado": 0,
  "alicuotaIVA": 16,
  "montoIVA": 336.80,
  "subtotal": 2105.00,
  "total": 2441.80,
  "retencionIVAPorcentaje": 75,
  "retencionIVAMonto": 252.60,
  "retencionISLRPorcentaje": null,
  "retencionISLRMonto": null,
  "retencionISLRBase": null,
  "descripcion": "Venta de materiales de construcción",
  "items": [
    {"descripcion": "Cemento Portland 50kg", "cantidad": 50, "precioUnitario": 8.50, "total": 425.00}
  ]
}

## Ejemplo 2: Recibo de honorarios profesionales con retención ISLR
{
  "tipoDetectado": "GASTO_MENOR",
  "emisor": {"nombre": "DR. JOSÉ PÉREZ", "rif": "V-8456723-1"},
  "receptor": {"nombre": "MI EMPRESA C.A.", "rif": "J-12345678-9"},
  "numeroFactura": "",
  "numeroControl": "",
  "ncf": "",
  "fechaEmision": "15/07/2026",
  "monedaOriginal": "VES",
  "baseImponible": 5000.00,
  "montoExento": 0,
  "montoExonerado": 0,
  "alicuotaIVA": 0,
  "montoIVA": 0,
  "subtotal": 5000.00,
  "total": 5000.00,
  "retencionIVAPorcentaje": null,
  "retencionIVAMonto": null,
  "retencionISLRPorcentaje": 1,
  "retencionISLRMonto": 45.00,
  "retencionISLRBase": 4500.00,
  "descripcion": "Honorarios profesionales consultoría",
  "items": []
}`

export async function analizarFactura(imageBase64: string, mimeType: string = 'image/jpeg'): Promise<FacturaExtraida> {
  const apiKey = process.env.GEMINI_API_KEY
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no está configurada en las variables de entorno.')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    }
  })

  // Eliminar el encabezado "data:image/jpeg;base64," si existe, ya que Gemini solo necesita la base64 pura
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "")

  const imagePart = {
    inlineData: {
      data: base64Data,
      mimeType,
    },
  }

  const result = await model.generateContent([PROMPT_ANALISIS, imagePart])
  const content = result.response.text()
  
  return parsearRespuestaVLM(content)
}

function parsearRespuestaVLM(content: string): FacturaExtraida {
  const advertencias: string[] = []

  let jsonStr = content.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^
http://googleusercontent.com/immersive_entry_chip/0

