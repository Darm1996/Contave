// Correlativo atómico por empresa y tipo de documento (ej. FACTURA_VENTA).
// Independiente de numeroControl/numeroFactura de facturas registradas por
// escaneo/entrada manual (que son de terceros y no llevan secuencia propia).

import { db } from '@/lib/db'

export async function siguienteNumeroDocumento(empresaId: string, tipo: string): Promise<number> {
  return db.$transaction(async (tx) => {
    const existente = await tx.secuenciaDocumento.findUnique({
      where: { empresaId_tipo: { empresaId, tipo } },
    })
    if (!existente) {
      await tx.secuenciaDocumento.create({ data: { empresaId, tipo, siguienteNumero: 2 } })
      return 1
    }
    const numero = existente.siguienteNumero
    await tx.secuenciaDocumento.update({
      where: { empresaId_tipo: { empresaId, tipo } },
      data: { siguienteNumero: numero + 1 },
    })
    return numero
  })
}
