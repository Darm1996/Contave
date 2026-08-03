import { describe, it, expect } from 'vitest'
import { CUENTAS_VEN_NIF } from '@/lib/contabilidad/plan-cuentas-ven-nif'
import { USOS_REQUERIDOS } from '@/lib/contabilidad/asientos-engine'

describe('CUENTAS_VEN_NIF (plan de cuentas estándar para empresas nuevas)', () => {
  it('no tiene códigos de cuenta duplicados', () => {
    const codigos = CUENTAS_VEN_NIF.map((c) => c.codigo)
    expect(new Set(codigos).size).toBe(codigos.length)
  })

  it('incluye todas las cuentas "uso" que el motor de asientos necesita', () => {
    const usosDisponibles = new Set(CUENTAS_VEN_NIF.map((c) => c.uso).filter(Boolean))
    const usosRequeridos = Object.values(USOS_REQUERIDOS)
    const faltantes = usosRequeridos.filter((u) => !usosDisponibles.has(u))
    expect(faltantes).toEqual([])
  })

  it('toda cuenta imputable tiene tipo y naturaleza válidos', () => {
    const tiposValidos = ['ACTIVO', 'PASIVO', 'PATRIMONIO', 'INGRESO', 'COSTO', 'GASTO']
    const naturalezasValidas = ['DEUDORA', 'ACREEDORA']
    for (const c of CUENTAS_VEN_NIF) {
      expect(tiposValidos).toContain(c.tipo)
      expect(naturalezasValidas).toContain(c.naturaleza)
    }
  })

  it('incluye al menos una cuenta GASTO_OTROS (fallback del motor de gastos)', () => {
    expect(CUENTAS_VEN_NIF.some((c) => c.uso === 'GASTO_OTROS')).toBe(true)
  })
})
