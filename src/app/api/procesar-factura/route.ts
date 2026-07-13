import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Inicializamos el motor oficial de Google Gemini
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || '');

export async function POST(req: NextRequest) {
  try {
    // Verificación de seguridad por si acaso olvidas configurar la clave en Vercel
    if (!apiKey) {
      return NextResponse.json({ error: "Falta la variable de entorno GEMINI_API_KEY en Vercel" }, { status: 500 });
    }

    const body = await req.json();
    const { imagenBase64, mimeType } = body;

    if (!imagenBase64) {
      return NextResponse.json({ error: "No se proporcionó ninguna imagen de factura" }, { status: 400 });
    }

    // Estructuramos la imagen para Gemini
    const imagePart = {
      inlineData: {
        data: imagenBase64.split(',')[1] || imagenBase64, // Limpia cabeceras de Base64 si existen
        mimeType: mimeType || 'image/png'
      },
    };

    // Usamos el modelo optimizado para visión y velocidad
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: "application/json" } // Obligamos a Gemini a responder en JSON estructurado
    });

    const prompt = `
      Eres un asistente experto en contabilidad venezolana (Leyes de IVA, ISLR y providencias del SENIAT).
      Tu tarea es analizar detalladamente la imagen de esta factura y extraer los datos requeridos.
      
      Debes devolver UNICAMENTE un objeto JSON con la siguiente estructura exacta, sin textos ni saludos adicionales:
      {
        "rifContraparte": "El RIF del emisor de la factura. Debe incluir la letra (J, G, V, E) y guiones. Ej: J-12345678-9",
        "nombreContraparte": "Razón social o nombre completo del proveedor",
        "numeroFactura": "Número de factura impreso",
        "numeroControl": "Número de control del SENIAT (ej: 00-12345678). Si no tiene, pon null",
        "fechaEmision": "Fecha de la factura en formato estricto YYYY-MM-DD",
        "monedaOriginal": "Coloca 'VES' si la factura es en Bolívares o 'USD' si está expresada en Dólares",
        "baseImponible": 0.00, // Número decimal. Suma de montos gravados
        "montoExento": 0.00, // Número decimal. Monto exento de IVA si aplica
        "montoExonerado": 0.00, // Número decimal. Monto exonerado si aplica
        "alicuotaIVA": 16.00, // Número decimal. Porcentaje del IVA aplicado (ej: 16.00 o 8.00)
        "montoIVA": 0.00, // Número decimal. Monto total del impuesto
        "total": 0.00, // Número decimal. Total general de la factura
        "descripcion": "Breve resumen comercial de los artículos comprados o servicios recibidos"
      }

      Reglas contables estrictas:
      1. Si un campo numérico no está en la factura, devuélvelo como 0.00.
      2. No inventes datos. Si un dato no es legible, pon null.
      3. Limpia los separadores: usa obligatoriamente el punto (.) para los decimales y remueve los puntos de miles.
    `;

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    
    // Convertimos la respuesta de texto de Gemini a un JSON real para enviarlo seguro al frontend
    const datosFactura = JSON.parse(responseText);

    return NextResponse.json({ valido: true, datos: datosFactura });

  } catch (error: any) {
    console.error("Error en procesamiento Gemini Puro:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
