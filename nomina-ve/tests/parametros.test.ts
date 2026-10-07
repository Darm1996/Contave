import { describe, expect, it } from 'vitest'
import { agregarVigencia, ParametroFaltanteError, ParametrosVigentes, validarParametros, P, PARAMETROS_SEMILLA } from '../src/engine'
import { BASE_PRUEBA, crearParams, EMPRESA, prueba } from './helpers'

describe('Tabla de parámetros con vigencia', () => {
  it('se detiene si falta un parámetro (nunca usa un valor por defecto)', () => {
    const params = crearParams()
    expect(() => params.valor(P.TASA_INTERES_PRESTACIONES_PCT, '2026-01-31')).toThrow(ParametroFaltanteError)
    expect(() => params.valor(P.INGRESO_MINIMO_INTEGRAL, '2026-04-30')).toThrow(/INGRESO_MINIMO_INTEGRAL/)
  })

  it('el valor de la empresa prevalece sobre el nacional', () => {
    const nacional = prueba(P.BONO_VAC_DIAS_ADICIONALES_EMPRESA, '0', 'DIAS')
    const empresa = prueba(P.BONO_VAC_DIAS_ADICIONALES_EMPRESA, '5', 'DIAS', '2012-05-07', null, EMPRESA)
    const lista = [...BASE_PRUEBA.filter((p) => p.codigo !== P.BONO_VAC_DIAS_ADICIONALES_EMPRESA), nacional, empresa]
    expect(new ParametrosVigentes(lista, EMPRESA).valor(P.BONO_VAC_DIAS_ADICIONALES_EMPRESA, '2026-01-01').toString()).toBe('5')
    expect(new ParametrosVigentes(lista, 'OTRA').valor(P.BONO_VAC_DIAS_ADICIONALES_EMPRESA, '2026-01-01').toString()).toBe('0')
  })

  it('una Gaceta nueva cierra la vigencia anterior y los períodos viejos conservan su valor', () => {
    const nueva = { ...prueba(P.SALARIO_MINIMO_MENSUAL, '200', 'VES', '2026-06-16'), fuente: 'Decreto de prueba' }
    const lista = agregarVigencia(BASE_PRUEBA, nueva)
    const anterior = lista.find((p) => p.codigo === P.SALARIO_MINIMO_MENSUAL && p.valor === '130')!
    expect(anterior.vigenteHasta).toBe('2026-06-15')
    const params = new ParametrosVigentes(lista, EMPRESA)
    expect(params.valor(P.SALARIO_MINIMO_MENSUAL, '2026-06-15').toString()).toBe('130')
    expect(params.valor(P.SALARIO_MINIMO_MENSUAL, '2026-06-16').toString()).toBe('200')
    expect(BASE_PRUEBA.find((p) => p.codigo === P.SALARIO_MINIMO_MENSUAL)!.vigenteHasta).toBeNull() // no muta la original
  })

  it('detecta vigencias solapadas, fuente vacía y valores no numéricos', () => {
    const errores = validarParametros([
      prueba('X', '1', 'DIAS', '2026-01-01'),
      prueba('X', '2', 'DIAS', '2026-06-01'),
      { ...prueba('Y', 'abc', 'DIAS'), fuente: ' ' },
    ])
    expect(errores.some((e) => e.includes('se solapa'))).toBe(true)
    expect(errores.some((e) => e.includes('falta la fuente'))).toBe(true)
    expect(errores.some((e) => e.includes('no numérico'))).toBe(true)
    expect(validarParametros(PARAMETROS_SEMILLA)).toEqual([])
  })

  it('prorratea por días un cambio a mitad de período', () => {
    const params = new ParametrosVigentes(agregarVigencia(BASE_PRUEBA, prueba(P.SALARIO_MINIMO_MENSUAL, '200', 'VES', '2026-06-16')), EMPRESA)
    const r = params.prorrateado(P.SALARIO_MINIMO_MENSUAL, '2026-06-01', '2026-06-30')
    expect(r.valor.toString()).toBe('165') // (130 × 15 + 200 × 15) ÷ 30
    expect(r.tramos).toHaveLength(2)
  })

  it('advierte cuando se usa un parámetro semilla sin verificar', () => {
    const params = crearParams()
    params.valor(P.IVSS_TRABAJADOR_PCT, '2026-06-01')
    expect(params.alertasSinVerificar().map((a) => a.codigo)).toContain('PARAMETRO_SIN_VERIFICAR')
    expect(params.usados().map((p) => p.codigo)).toEqual([P.IVSS_TRABAJADOR_PCT])
  })
})
