// Scraper de la tasa de cambio USD/Bs. desde el BCV
// URL: https://www.bcv.org.ve/estadisticas/tipo-de-cambio
// El BCV actualiza la tasa diariamente alrededor de las 3:30 PM hora Venezuela

// Fallback en caso de que el scraping falle (última tasa conocida aproximada)
const TASA_FALLBACK = 145.50

export interface TasaBCV {
  tasa: number
  fecha: Date
  fuente: string
  moneda: string
}

// Scraper con fetch simple + regex (sin dependencias externas)
// El BCV expone la tasa en su página HTML con clases específicas
export async function obtenerTasaBCV(): Promise<TasaBCV> {
  const url = 'https://www.bcv.org.ve/estadisticas/tipo-de-cambio'

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-VE,es;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(15000), // timeout 15s
    })
    if (!res.ok) {
      throw new Error(`BCV respondió con status ${res.status}`)
    }
    const html = await res.text()

    // El BCV tiene la tasa USD con clase "centro" y contenido en <strong>
    // Buscar patrón como: <strong>145,50</strong> o 145.50 dentro de la sección de USD
    const tasa = extraerTasaUSD(html)
    const fecha = extraerFechaBCV(html)

    if (!tasa) {
      throw new Error('No se pudo extraer la tasa USD del HTML del BCV')
    }

    return {
      tasa,
      fecha: fecha || new Date(),
      fuente: 'BCV',
      moneda: 'USD',
    }
  } catch (e: any) {
    // Fallback: devolver tasa aproximada con marca de "BCV-fallback"
    return {
      tasa: TASA_FALLBACK,
      fecha: new Date(),
      fuente: 'BCV-fallback',
      moneda: 'USD',
    }
  }
}

// Extraer la tasa de USD del HTML del BCV
// Estructura típica:
// <div class="col-sm-6 col-xs-6 centrado">
//   <div class="col-sm-12 col-xs-12 text-center">
//     <h1>Dólar</h1>
//     <div style="margin-top: 20px;">
//       <img src="/sites/default/files/dolar.svg" alt="Dólar" />
//     </div>
//     <div class="centro"><strong>145,50</strong></div>
//   </div>
// </div>
function extraerTasaUSD(html: string): number | null {
  // Estrategia 1: buscar la sección "Dólar" y luego el <strong> dentro de un div.centrado
  const dolarSection = html.match(/D[oó]lar[\s\S]{0,1500}?centro[\s\S]{0,500}?<strong[^>]*>([^<]+)<\/strong>/i)
  if (dolarSection && dolarSection[1]) {
    const num = parsearNumeroBCV(dolarSection[1])
    if (num && num > 0) return num
  }

  // Estrategia 2: buscar el primer <strong> que contenga un número con coma o punto decimal
  // después de la palabra "dolar"
  const strongs = html.match(/<strong[^>]*>\s*([\d.,]+)\s*<\/strong>/gi) || []
  // Filtrar para encontrar el que parece ser USD (entre 50 y 5000 Bs por USD)
  for (const s of strongs) {
    const m = s.match(/<strong[^>]*>\s*([\d.,]+)\s*<\/strong>/i)
    if (m) {
      const num = parsearNumeroBCV(m[1])
      if (num && num > 50 && num < 10000) {
        return num
      }
    }
  }

  // Estrategia 3: buscar en JSON embebido o data attributes
  const dataMatch = html.match(/data-tasa[^=]*=["']\s*([\d.,]+)\s*["']/i)
  if (dataMatch) {
    const num = parsearNumeroBCV(dataMatch[1])
    if (num && num > 0) return num
  }

  return null
}

// Extraer fecha de la tasa desde el HTML
// El BCV muestra la fecha en formato "Miércoles, 09 de Julio de 2026"
function extraerFechaBCV(html: string): Date | null {
  const meses: Record<string, number> = {
    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
    'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11,
  }
  // Buscar patrón: "dd de Mes de yyyy"
  const m = html.match(/(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/i)
  if (m) {
    const dia = parseInt(m[1], 10)
    const mes = meses[m[2].toLowerCase()]
    const anio = parseInt(m[3], 10)
    if (mes !== undefined) {
      return new Date(anio, mes, dia)
    }
  }
  // Fallback: buscar ISO date
  const m2 = html.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (m2) {
    return new Date(parseInt(m2[1]), parseInt(m2[2]) - 1, parseInt(m2[3]))
  }
  return null
}

// Parsear número del BCV (formato venezolano: "145,50" = 145.50)
function parsearNumeroBCV(s: string): number | null {
  const limpio = s.trim().replace(/\s/g, '')
  // Caso 1: "145,50" (formato VE)
  if (/^\d+,\d+$/.test(limpio)) {
    return parseFloat(limpio.replace(',', '.'))
  }
  // Caso 2: "145.50" (formato US)
  if (/^\d+\.\d+$/.test(limpio)) {
    return parseFloat(limpio)
  }
  // Caso 3: "1.234,56" (formato VE con miles)
  if (/^\d{1,3}(\.\d{3})*,\d+$/.test(limpio)) {
    return parseFloat(limpio.replace(/\./g, '').replace(',', '.'))
  }
  // Caso 4: "1,234.56" (formato US con miles)
  if (/^\d{1,3}(,\d{3})*\.\d+$/.test(limpio)) {
    return parseFloat(limpio.replace(/,/g, ''))
  }
  // Intento genérico
  const n = parseFloat(limpio.replace(/[^0-9.,]/g, '').replace(',', '.'))
  return isNaN(n) ? null : n
}
