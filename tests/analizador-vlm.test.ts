import { describe, it, expect } from 'vitest'
import { normalizarRespuesta } from '@/lib/contabilidad/analizador-vlm'

describe('normalizarRespuesta (VLM)', () => {
  it('normaliza una respuesta completa y bien formada', () => {
    const r = normalizarRespuesta({
      tipoDetectado: 'COMPRA',
      emisor: { nombre: 'Proveedor C.A.', rif: 'J-12345678-9' },
      receptor: { nombre: 'Mi Empresa', rif: 'J-87654321-0' },
      numeroFactura: '00123',
      numeroControl: '00-00456',
      ncf: '',
      fechaEmision: '2026-07-15',
      monedaOriginal: 'VES',
      baseImponible: 1000,
      montoExento: 0,
      montoExonerado: 0,
      alicuotaIVA: 16,
      montoIVA: 160,
      total: 1160,
      descripcion: 'Compra de insumos',
      items: [{ descripcion: 'Insumo A', total: 1160 }],
      confianza: 92,
      advertencias: [],
    })
    expect(r.tipoDetectado).toBe('COMPRA')
    expect(r.baseImponible).toBe(1000)
    expect(r.total).toBe(1160)
    expect(r.emisor.rif).toBe('J-12345678-9')
  })

  it('rellena con valores seguros cuando el modelo omite campos', () => {
    const r = normalizarRespuesta({ tipoDetectado: 'VENTA' })
    expect(r.baseImponible).toBe(0)
    expect(r.montoIVA).toBe(0)
    expect(r.items).toEqual([])
    expect(r.advertencias).toEqual([])
    expect(r.numeroFactura).toBe('')
    expect(r.monedaOriginal).toBe('VES')
    expect(r.alicuotaIVA).toBe(16)
  })

  it('no revienta si el modelo devuelve tipos incorrectos (strings en vez de números)', () => {
    const r = normalizarRespuesta({
      tipoDetectado: 'COMPRA',
      baseImponible: '1.000,50', // formato inválido, no numérico limpio
      montoIVA: null,
      items: 'no es un array',
      advertencias: 'tampoco es un array',
    })
    expect(typeof r.baseImponible).toBe('number')
    expect(typeof r.montoIVA).toBe('number')
    expect(Array.isArray(r.items)).toBe(true)
    expect(Array.isArray(r.advertencias)).toBe(true)
  })

  it('cae a DESCONOCIDO y agrega advertencia si tipoDetectado no es válido', () => {
    const r = normalizarRespuesta({ tipoDetectado: 'ALGO_RARO' })
    expect(r.tipoDetectado).toBe('DESCONOCIDO')
    expect(r.advertencias.length).toBeGreaterThan(0)
  })

  it('valida el RIF con el validador local en vez de confiar ciegamente en el modelo', () => {
    const r = normalizarRespuesta({
      tipoDetectado: 'VENTA',
      emisor: { nombre: 'X', rif: 'RIF-INVALIDO' },
      receptor: { nombre: 'Y', rif: 'J-12345678-9' },
    })
    expect(r.emisor.rifValido).toBe(false)
    expect(r.receptor.rifValido).toBe(true)
  })

  it('no explota si emisor/receptor vienen completamente ausentes', () => {
    const r = normalizarRespuesta({})
    expect(r.emisor.nombre).toBe('')
    expect(r.receptor.rif).toBe('')
    expect(r.tipoDetectado).toBe('DESCONOCIDO')
  })
})
