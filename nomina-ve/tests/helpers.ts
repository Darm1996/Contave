import { PARAMETROS_SEMILLA, ParametrosVigentes, type Parametro, type Unidad } from '../src/engine'
import { CRITERIOS_POR_DEFECTO, type CriteriosEmpresa } from '../src/engine'

export const EMPRESA = 'EMP-PRUEBA'

/**
 * Parámetro de PRUEBA. Los valores pendientes (días de utilidades, tasas de
 * interés) se inventan aquí solo para ejercitar el motor; NO son oficiales.
 */
export function prueba(codigo: string, valor: string, unidad: Unidad, desde = '2012-05-07', hasta: string | null = null, empresaId: string | null = null): Parametro {
  return { codigo, empresaId, valor, unidad, vigenteDesde: desde, vigenteHasta: hasta, fuente: 'VALOR DE PRUEBA — no oficial', verificado: true }
}

export const BASE_PRUEBA: Parametro[] = [
  ...PARAMETROS_SEMILLA,
  prueba('UTILIDADES_DIAS_EMPRESA', '30', 'DIAS', '2012-05-07', null, EMPRESA),
]

export function crearParams(extra: Parametro[] = [], reemplazar: string[] = []): ParametrosVigentes {
  const base = BASE_PRUEBA.filter((p) => !reemplazar.includes(p.codigo))
  return new ParametrosVigentes([...base, ...extra], EMPRESA)
}

export const criterios = (c: Partial<CriteriosEmpresa> = {}): CriteriosEmpresa => ({ ...CRITERIOS_POR_DEFECTO, ...c })

/** Compara un Decimal con un valor esperado exacto en céntimos. */
export const s = (d: { toFixed: (n: number) => string }, dec = 2) => d.toFixed(dec)
