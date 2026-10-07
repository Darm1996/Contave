// Tabla de parámetros con vigencia (principio de diseño n.º 1).
//
// Ningún porcentaje, tope, mínimo, número de días legal o tasa está escrito en
// las reglas: todas lo piden aquí por código y fecha. Cuando el Ejecutivo
// cambia un valor se agrega un registro nuevo (ver `agregarVigencia`) y los
// períodos anteriores se siguen calculando con el valor que les correspondía.
//
// Si falta un parámetro para la fecha pedida, el motor se detiene con
// ParametroFaltanteError: nunca se usa un valor por defecto.
import { D, type Decimal } from './decimal'
import { comparar, diasEntre, enRango, sumarDias, cadaDia } from './fechas'
import { ErrorMotor, type Alerta, type Fecha } from './tipos'

export type Unidad =
  | 'PORCENTAJE'
  | 'VES'
  | 'USD'
  | 'DIAS'
  | 'SEMANAS'
  | 'HORAS'
  | 'MESES'
  | 'ANIOS'
  | 'SALARIOS_MINIMOS'
  | 'UT'
  | 'TRABAJADORES'

export interface Parametro {
  codigo: string
  /** null = valor nacional; con valor = política o excepción de esa empresa. */
  empresaId: string | null
  valor: string
  unidad: Unidad
  vigenteDesde: Fecha
  /** Inclusive. null = vigente. */
  vigenteHasta: Fecha | null
  /** Obligatoria: Gaceta Oficial, decreto, providencia, artículo o "Política interna". */
  fuente: string
  referencia?: string
  /** false hasta que un profesional lo confirme contra la Gaceta. */
  verificado: boolean
}

export class ParametroFaltanteError extends ErrorMotor {
  constructor(public codigoParametro: string, public fecha: Fecha) {
    super(
      'PARAMETRO_FALTANTE',
      `Falta el parámetro ${codigoParametro} vigente al ${fecha}. Cárguelo en la tabla de parámetros con su fuente oficial.`,
    )
  }
}

export class ParametrosVigentes {
  private readonly usadosMap = new Map<string, Parametro>()

  constructor(
    private readonly registros: readonly Parametro[],
    private readonly empresaId: string | null = null,
  ) {}

  /** Registro vigente a la fecha: primero el de la empresa, si no el nacional. */
  registro(codigo: string, fecha: Fecha): Parametro {
    const candidatos = this.registros.filter((p) => p.codigo === codigo && enRango(fecha, p.vigenteDesde, p.vigenteHasta))
    const encontrado =
      (this.empresaId && candidatos.find((p) => p.empresaId === this.empresaId)) ||
      candidatos.find((p) => p.empresaId === null)
    if (!encontrado) throw new ParametroFaltanteError(codigo, fecha)
    this.usadosMap.set(`${codigo}@${encontrado.vigenteDesde}@${encontrado.empresaId ?? ''}`, encontrado)
    return encontrado
  }

  valor(codigo: string, fecha: Fecha): Decimal {
    return D(this.registro(codigo, fecha).valor)
  }

  existe(codigo: string, fecha: Fecha): boolean {
    try {
      this.registro(codigo, fecha)
      return true
    } catch (e) {
      if (e instanceof ParametroFaltanteError) return false
      throw e
    }
  }

  /**
   * Promedio ponderado por días del valor de un parámetro en [desde, hasta].
   * Se usa cuando un monto (salario mínimo, cestaticket, ingreso mínimo)
   * cambia a mitad de período (criterio A6 por defecto: prorrateo).
   */
  prorrateado(codigo: string, desde: Fecha, hasta: Fecha): { valor: Decimal; tramos: { desde: Fecha; hasta: Fecha; valor: string; fuente: string }[] } {
    const tramos: { desde: Fecha; hasta: Fecha; valor: string; fuente: string }[] = []
    for (const dia of cadaDia(desde, hasta)) {
      const reg = this.registro(codigo, dia)
      const ultimo = tramos[tramos.length - 1]
      if (ultimo && ultimo.valor === reg.valor && ultimo.fuente === reg.fuente) ultimo.hasta = dia
      else tramos.push({ desde: dia, hasta: dia, valor: reg.valor, fuente: reg.fuente })
    }
    const totalDias = diasEntre(desde, hasta) + 1
    const suma = tramos.reduce((acc, t) => acc.plus(D(t.valor).times(diasEntre(t.desde, t.hasta) + 1)), D(0))
    return { valor: suma.div(totalDias), tramos }
  }

  /** Snapshot de los parámetros efectivamente usados (se guarda al cerrar el período). */
  usados(): Parametro[] {
    return [...this.usadosMap.values()]
  }

  /** Advertencia por cada parámetro usado que aún no ha sido verificado contra la Gaceta. */
  alertasSinVerificar(): Alerta[] {
    return this.usados()
      .filter((p) => !p.verificado)
      .map((p) => ({
        nivel: 'ADVERTENCIA' as const,
        codigo: 'PARAMETRO_SIN_VERIFICAR',
        mensaje: `${p.codigo} = ${p.valor} (${p.fuente}, desde ${p.vigenteDesde}) no ha sido verificado contra la Gaceta Oficial.`,
      }))
  }
}

/** Valida la tabla: fuente obligatoria, rangos coherentes y sin vigencias solapadas por (código, empresa). */
export function validarParametros(registros: readonly Parametro[]): string[] {
  const errores: string[] = []
  for (const p of registros) {
    if (!p.fuente?.trim()) errores.push(`${p.codigo} desde ${p.vigenteDesde}: falta la fuente`)
    if (p.vigenteHasta && comparar(p.vigenteHasta, p.vigenteDesde) < 0)
      errores.push(`${p.codigo} desde ${p.vigenteDesde}: vigenteHasta es anterior a vigenteDesde`)
    if (!/^-?\d+(\.\d+)?$/.test(p.valor)) errores.push(`${p.codigo} desde ${p.vigenteDesde}: valor no numérico "${p.valor}"`)
  }
  const grupos = new Map<string, Parametro[]>()
  for (const p of registros) {
    const k = `${p.codigo}|${p.empresaId ?? ''}`
    grupos.set(k, [...(grupos.get(k) ?? []), p])
  }
  for (const lista of grupos.values()) {
    const orden = [...lista].sort((a, b) => comparar(a.vigenteDesde, b.vigenteDesde))
    for (let i = 1; i < orden.length; i++) {
      const prev = orden[i - 1]!
      const act = orden[i]!
      if (prev.vigenteHasta === null || comparar(prev.vigenteHasta, act.vigenteDesde) >= 0)
        errores.push(`${act.codigo}: la vigencia desde ${act.vigenteDesde} se solapa con la que inicia ${prev.vigenteDesde}`)
    }
  }
  return errores
}

/**
 * Flujo "salió una Gaceta nueva": cierra el registro abierto del mismo
 * (código, empresa) el día anterior a la nueva vigencia y agrega el nuevo.
 * No modifica la lista recibida.
 */
export function agregarVigencia(registros: readonly Parametro[], nuevo: Parametro): Parametro[] {
  const resultado = registros.map((p) => {
    if (p.codigo === nuevo.codigo && p.empresaId === nuevo.empresaId && p.vigenteHasta === null && p.vigenteDesde < nuevo.vigenteDesde)
      return { ...p, vigenteHasta: sumarDias(nuevo.vigenteDesde, -1) }
    return p
  })
  resultado.push(nuevo)
  const errores = validarParametros(resultado)
  if (errores.length) throw new ErrorMotor('PARAMETROS_INVALIDOS', errores.join('; '))
  return resultado
}
