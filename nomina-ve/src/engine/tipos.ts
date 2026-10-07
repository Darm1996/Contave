// Tipos comunes del motor. Cada regla devuelve el resultado junto con el
// desglose de "cómo se calculó", la base legal aplicada y las alertas.
import type { Decimal } from './decimal'

/** Fecha ISO 'AAAA-MM-DD'. Se trabaja sin hora para evitar problemas de zona horaria. */
export type Fecha = string

export interface Paso {
  descripcion: string
  formula?: string
  valor: string
}

export type NivelAlerta = 'INFO' | 'ADVERTENCIA' | 'BLOQUEANTE'

export interface Alerta {
  nivel: NivelAlerta
  codigo: string
  mensaje: string
}

export interface Resultado<T = Decimal> {
  valor: T
  desglose: Paso[]
  baseLegal: string[]
  alertas: Alerta[]
}

export type Moneda = 'VES' | 'USD'
export type TipoJornada = 'DIURNA' | 'NOCTURNA' | 'MIXTA'
export type Frecuencia = 'SEMANAL' | 'QUINCENAL' | 'MENSUAL'
export type NivelRiesgo = 'MINIMO' | 'MEDIO' | 'MAXIMO'
export type MotivoEgreso =
  | 'RENUNCIA'
  | 'DESPIDO_JUSTIFICADO'
  | 'DESPIDO_INJUSTIFICADO'
  | 'MUTUO_ACUERDO'
  | 'FIN_CONTRATO'
  | 'FALLECIMIENTO'

export class ErrorMotor extends Error {
  constructor(public codigo: string, mensaje: string) {
    super(mensaje)
    this.name = 'ErrorMotor'
  }
}
