// Analizador de facturas venezolanas usando Z-AI VLM
// Extrae: RIF emisor/receptor, NCF, número de control, fecha, montos, IVA, retención IVA, retención ISLR, etc.
// Prompt con few-shot examples para mayor robustez con facturas reales venezolanas

import ZAI from 'z-ai-web-dev-sdk'
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
  retencionISLRBase: number | null // Base imponible sobre la que se calcula el ISLR (puede ser 90% del pago para honorarios, etc.)
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
  const zai = await ZAI.create()

  const response = await zai.chat.completions.createVision({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: PROMPT_ANALISIS },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
            },
          },
        ],
      },
    ],
    thinking: { type: 'disabled' },
  })

  const content = response.choices[0]?.message?.content || ''
  return parsearRespuestaVLM(content)
}

function parsearRespuestaVLM(content: string): FacturaExtraida {
  const advertencias: string[] = []

  // Limpiar el contenido (a veces viene con markdown ```json)
  let jsonStr = content.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
  }

  let data: any
  try {
    data = JSON.parse(jsonStr)
  } catch {
    // Intentar extraer el primer objeto JSON del texto
    const match = jsonStr.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        data = JSON.parse(match[0])
      } catch (e) {
        throw new Error('El modelo no devolvió un JSON válido: ' + content.substring(0, 200))
      }
    } else {
      throw new Error('No se pudo extraer JSON de la respuesta del VLM')
    }
  }

  // Validar y normalizar RIFs
  const emisorRif = data.emisor?.rif || ''
  const emisorRifCheck = emisorRif ? validarRIF(emisorRif) : { valido: false, digitoVerificadorValido: false, normalizado: '' }
  if (emisorRif && !emisorRifCheck.digitoVerificadorValido) {
    advertencias.push('RIF del emisor: el dígito verificador no coincide. Verifique manualmente.')
  }
  if (emisorRif && !emisorRifCheck.formatoValido) {
    advertencias.push('RIF del emisor no tiene el formato esperado (LETRA-XXXXXXXX-X).')
  }

  const receptorRif = data.receptor?.rif || ''
  const receptorRifCheck = receptorRif ? validarRIF(receptorRif) : { valido: false, digitoVerificadorValido: false, normalizado: '' }
  if (receptorRif && !receptorRifCheck.digitoVerificadorValido) {
    advertencias.push('RIF del receptor: el dígito verificador no coincide. Verifique manualmente.')
  }

  // Validar NCF
  const ncf = data.ncf || ''
  const ncfCheck = ncf ? validarNCF(ncf) : { valido: false, normalizado: '', tipo: null }
  if (ncf && !ncfCheck.valido) {
    advertencias.push('NCF no tiene formato válido (debe ser 8 dígitos-8 dígitos, ej: 01001001-00012345).')
  }

  // Parsear fecha
  const fechaStr = data.fechaEmision || ''
  const fechaDate = parseFechaVE(fechaStr)
  if (!fechaDate) advertencias.push('No se pudo parsear la fecha de emisión. Se usará la fecha actual.')

  // Validar coherencia numérica
  const baseImponible = Number(data.baseImponible) || 0
  const exento = Number(data.montoExento) || 0
  const exonerado = Number(data.montoExonerado) || 0
  const iva = Number(data.montoIVA) || 0
  const alicuota = Number(data.alicuotaIVA) || 16
  const total = Number(data.total) || 0
  const subtotal = Number(data.subtotal) || (baseImponible + exento + exonerado)

  // Recalcular IVA si parece incorrecto
  const ivaEsperado = Math.round(baseImponible * alicuota) / 100
  if (iva > 0 && Math.abs(iva - ivaEsperado) > 0.5) {
    advertencias.push(`El IVA declarado (${iva}) no coincide con base × alícuota (${ivaEsperado}). Se usará el declarado.`)
  }

  // Validar coherencia del total
  const totalEsperado = subtotal + iva
  if (total > 0 && Math.abs(total - totalEsperado) > 0.5) {
    advertencias.push(`El total declarado (${total}) no coincide con subtotal + IVA (${totalEsperado}). Se usará el declarado.`)
  }

  // Validar coherencia de retención IVA
  const retIVAPct = data.retencionIVAPorcentaje != null ? Number(data.retencionIVAPorcentaje) : null
  const retIVAMonto = data.retencionIVAMonto != null ? Number(data.retencionIVAMonto) : null
  if (retIVAPct && retIVAMonto && iva > 0) {
    const retEsperada = Math.round(iva * retIVAPct) / 100
    if (Math.abs(retIVAMonto - retEsperada) > 0.5) {
      advertencias.push(`La retención de IVA declarada (${retIVAMonto}) no coincide con IVA × ${retIVAPct}% (${retEsperada}). Se usará el declarado.`)
    }
  }

  // Validar coherencia de retención ISLR
  const retISLRPct = data.retencionISLRPorcentaje != null ? Number(data.retencionISLRPorcentaje) : null
  const retISLRMonto = data.retencionISLRMonto != null ? Number(data.retencionISLRMonto) : null
  const retISLRBase = data.retencionISLRBase != null ? Number(data.retencionISLRBase) : null
  if (retISLRPct && retISLRMonto && retISLRBase) {
    const retEsperada = Math.round(retISLRBase * retISLRPct) / 100
    if (Math.abs(retISLRMonto - retEsperada) > 0.5) {
      advertencias.push(`La retención de ISLR declarada (${retISLRMonto}) no coincide con base × ${retISLRPct}% (${retEsperada}). Se usará el declarado.`)
    }
  }

  // Calcular confianza
  let confianza = 0
  if (emisorRif) confianza += 15
  if (emisorRifCheck.digitoVerificadorValido) confianza += 10
  if (receptorRif) confianza += 10
  if (ncf) confianza += 15
  if (ncfCheck.valido) confianza += 10
  if (fechaDate) confianza += 10
  if (total > 0) confianza += 15
  if (iva > 0 || baseImponible > 0) confianza += 5
  if (data.descripcion) confianza += 5
  if (Array.isArray(data.items) && data.items.length > 0) confianza += 5
  confianza = Math.min(confianza, 100)

  return {
    tipoDetectado: data.tipoDetectado || 'DESCONOCIDO',
    emisor: {
      nombre: data.emisor?.nombre || '',
      rif: emisorRifCheck.normalizado || emisorRif,
      rifValido: emisorRifCheck.formatoValido,
      direccion: data.emisor?.direccion || undefined,
      telefono: data.emisor?.telefono || undefined,
    },
    receptor: {
      nombre: data.receptor?.nombre || '',
      rif: receptorRifCheck.normalizado || receptorRif,
      rifValido: receptorRifCheck.formatoValido,
    },
    numeroFactura: data.numeroFactura || '',
    numeroControl: data.numeroControl || '',
    ncf: ncfCheck.normalizado || ncf,
    ncfValido: ncfCheck.valido,
    ncfTipo: ncfCheck.tipo,
    fechaEmision: fechaDate ? fechaDate.toISOString() : new Date().toISOString(),
    monedaOriginal: ['VES', 'USD', 'EUR'].includes(data.monedaOriginal) ? data.monedaOriginal : 'VES',
    baseImponible,
    montoExento: exento,
    montoExonerado: exonerado,
    alicuotaIVA: alicuota,
    montoIVA: iva,
    subtotal,
    total,
    retencionIVAPorcentaje: retIVAPct,
    retencionIVAMonto: retIVAMonto,
    retencionISLRPorcentaje: retISLRPct,
    retencionISLRMonto: retISLRMonto,
    retencionISLRBase: retISLRBase,
    descripcion: data.descripcion || `Factura ${data.emisor?.nombre || ''}`.trim(),
    items: Array.isArray(data.items) ? data.items : [],
    confianza,
    advertencias,
    rawText: content.substring(0, 500),
  }
}
