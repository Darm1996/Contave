// Reglas fiscales de Venezuela: RIF, NCF, IVA, retenciones IVA
// Referencia: SENIAT - Providencias Administrativas (NCF vigentes desde 2018)

// ── RIF (Registro de Información Fiscal) ──
// Formato: LETRA + 9 dígitos + dígito verificador. Ej: J-12345678-9
// Letras válidas:
//   V = Venezolano natural
//   E = Extranjero residente
//   J = Jurídico (empresa)
//   G = Gobierno
//   P = Pasaporte (no residente)
//   C = Cédula latinoamericana

const RIF_LETRAS = ['V', 'E', 'J', 'G', 'P', 'C']

export function validarRIF(rif: string): { valido: boolean; formatoValido: boolean; digitoVerificadorValido: boolean; normalizado: string } {
  if (!rif) return { valido: false, formatoValido: false, digitoVerificadorValido: false, normalizado: '' }
  // Limpiar: quitar espacios, puntos, barras; dejar letra + dígitos + guion
  const limpio = rif.trim().toUpperCase().replace(/[\s./]/g, '')
  // Aceptar formatos: J123456789, J-12345678-9, J12345678-9, V-8.456.723-1, V-1234567-1
  // Para V/E (personas naturales): 6-9 dígitos + 1 verificador (cédula venezolana)
  // Para J/G (jurídicos): 9 dígitos + 1 verificador
  const match = limpio.match(/^([VEJGPC])\-?(\d{6,9})\-?(\d)$/)
  if (!match) return { valido: false, formatoValido: false, digitoVerificadorValido: false, normalizado: limpio }
  const [, letra, numeros, verif] = match
  if (!RIF_LETRAS.includes(letra)) return { valido: false, formatoValido: false, digitoVerificadorValido: false, normalizado: limpio }
  // Validación del dígito verificador (algoritmo SENIAT)
  // El RIF estándar es LETRA + 9 dígitos (el último es verificador)
  // Para cédulas con menos dígitos, se rellena con ceros a la izquierda
  const numerosPadded = numeros.padStart(9, '0')
  const pesos = [4, 3, 2, 7, 6, 5, 4, 3, 2]
  const letraVal: Record<string, number> = { V: 1, E: 2, J: 3, G: 4, P: 5, C: 6 }
  // Los 9 pesos aplican a: letra + primeros 8 dígitos (no al verificador)
  const calcDigits = [letraVal[letra], ...numerosPadded.slice(0, 8).split('').map(Number)]
  const suma = calcDigits.reduce((acc, d, i) => acc + d * pesos[i], 0)
  const residuo = suma % 11
  const calcVerif = (11 - residuo) % 11
  const verifNum = parseInt(verif, 10)
  const digitoVerificadorValido = calcVerif === verifNum
  return {
    // válido = formato correcto. El dígito verificador es solo advertencia.
    valido: true,
    formatoValido: true,
    digitoVerificadorValido,
    // Normalizar manteniendo el número de dígitos original (sin rellenar con ceros)
    normalizado: `${letra}-${numeros}-${verif}`,
  }
}

// ── NCF (Número de Comprobante Fiscal) ──
// Formato vigente (Providencia SNAT/2018/000078):
//   11 dígitos: 8 dígitos secuencia + 3 dígitos de validación, separados por guion
//   Ej: 01001001-00012345
// Prefijos comunes:
//   01 = Factura fiscal (ventas a contribuyentes ordinarios)
//   02 = Factura no fiscal (ventas a no contribuyentes)
//   03 = Nota de débito fiscal
//   04 = Nota de crédito fiscal
//   05 = Nota de débito no fiscal
//   06 = Nota de crédito no fiscal
//   07 = Comprobante de retención de IVA
//   08 = Comprobante de retención de ISLR

export function validarNCF(ncf: string): { valido: boolean; normalizado: string; tipo: string | null } {
  if (!ncf) return { valido: false, normalizado: '', tipo: null }
  const limpio = ncf.trim().toUpperCase().replace(/\s/g, '')
  // Formato: 8 dígitos - 8 dígitos
  const match = limpio.match(/^(\d{3})(\d{5})-?(\d{8})$/)
  if (!match) return { valido: false, normalizado: limpio, tipo: null }
  const [, prefijo] = match
  const tipos: Record<string, string> = {
    '010': 'FACTURA_FISCAL',
    '020': 'FACTURA_NO_FISCAL',
    '030': 'NOTA_DEBITO_FISCAL',
    '040': 'NOTA_CREDITO_FISCAL',
    '050': 'NOTA_DEBITO_NO_FISCAL',
    '060': 'NOTA_CREDITO_NO_FISCAL',
    '070': 'COMPROBANTE_RETENCION_IVA',
    '080': 'COMPROBANTE_RETENCION_ISLR',
  }
  const tipo = tipos[prefijo] || null
  return {
    valido: true,
    normalizado: `${match[1]}${match[2]}-${match[3]}`,
    tipo,
  }
}

// ── IVA Venezuela ──
// Alícuota general vigente: 16% (desde 01/03/2024, antes 16% en 2024, 12% en 2023, 16% en 2018-2022)
// Exentos: alimentos básicos, libros, medicinas, etc.
// Exonerados: según decretos especiales

export const ALICUOTAS_IVA = {
  GENERAL: 16.0,
  REDUCIDA: 8.0, // No vigente actualmente, histórica
  EXENTA: 0,
  EXONERADA: 0,
} as const

export function calcularIVA(baseImponible: number, alicuota: number = 16.0): number {
  return Math.round(baseImponible * alicuota) / 100
}

// ── Retenciones de IVA ──
// Providencia SNAT/2005/0379 y modificatorias
// Sujetos pasivos calificados como agentes de retención retienen:
//   - Contribuyente ordinario: 75% del IVA
//   - Contribuyente especial: 100% del IVA
//   - Entidades públicas: 100%
// Excepciones (no se retiene):
//   - Operaciones exentas o exoneradas
//   - Contribuyentes formales (no emiten NCF fiscal)
//   - Cuando el monto del IVA retenido sea menor a 1 UT (aprox. 9 Bs.)

export function calcularRetencionIVA(
  montoIVA: number,
  esAgenteRetencion: boolean,
  esContribuyenteEspecialContraparte: boolean = false,
): { porcentaje: number | null; monto: number | null } {
  if (!esAgenteRetencion) return { porcentaje: null, monto: null }
  if (montoIVA <= 0) return { porcentaje: null, monto: null }
  const pct = esContribuyenteEspecialContraparte ? 100 : 75
  const monto = Math.round(montoIVA * pct) / 100
  // No se retienen montos menores a 1 UT (aproximadamente 9 Bs. - referencia 2024)
  if (monto < 9) return { porcentaje: null, monto: null }
  return { porcentaje: pct, monto }
}

// ── Formato de moneda venezolana ──
export function formatBs(amount: number): string {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'VES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatMonto(amount: number, moneda: string = 'VES'): string {
  return moneda === 'USD' ? formatUSD(amount) : formatBs(amount)
}

// ── Mapeo de tipos de factura a label ──
export const TIPOS_FACTURA: Record<string, string> = {
  COMPRA: 'Factura de Compra',
  VENTA: 'Factura de Venta',
  NOTA_CREDITO: 'Nota de Crédito',
  NOTA_DEBITO: 'Nota de Débito',
  GASTO_MENOR: 'Gasto Menor',
}

// ── Helpers de fecha en zona horaria de Caracas ──
export function fechaCaracas(date: Date = new Date()): Date {
  // America/Caracas = UTC-4
  const utc = date.getTime() + date.getTimezoneOffset() * 60000
  return new Date(utc - 4 * 3600 * 1000)
}

export function parseFechaVE(s: string): Date | null {
  if (!s) return null
  // Aceptar formatos: dd/mm/yyyy, yyyy-mm-dd, dd-mm-yyyy
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m1) return new Date(parseInt(m1[3]), parseInt(m1[2]) - 1, parseInt(m1[1]))
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m2) return new Date(parseInt(m2[1]), parseInt(m2[2]) - 1, parseInt(m2[3]))
  const m3 = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (m3) return new Date(parseInt(m3[3]), parseInt(m3[2]) - 1, parseInt(m3[1]))
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}
