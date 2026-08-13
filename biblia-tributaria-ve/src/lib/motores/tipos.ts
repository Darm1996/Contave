/**
 * Tipos compartidos por todos los motores de cálculo (capa 2 de la
 * arquitectura de §3 del prompt maestro: funciones puras y testeadas que
 * reciben insumos + parámetros vigentes y devuelven resultado + traza).
 *
 * Ningún motor de cálculo importa datos de Supabase directamente: recibe
 * los parámetros ya resueltos (tasa BCV, INPC) como argumentos. Esto es
 * intencional — permite testear el motor sin base de datos y deja la
 * responsabilidad de "elegir el parámetro vigente a la fecha" en la capa
 * que sí conoce la fecha de la operación (ver ejemplo en
 * src/lib/parametros/consulta.ts, Módulo posterior).
 */

/** Un valor numérico que proviene de una fuente oficial versionada
 *  (fila de `series_temporales` o `parametros_fiscales`), nunca de un
 *  literal en código. */
export interface ValorConFuente {
  valor: number;
  fecha: string; // ISO 8601 — fecha a la que corresponde el valor (no necesariamente hoy)
  fuenteOficial: string;
  /** Si es false, el motor igual calcula (para no bloquear al usuario),
   *  pero el resultado debe mostrarse con ⚠️ verificar en fuente oficial
   *  y no debe usarse en una declaración definitiva. */
  verificado: boolean;
}

/** Traza completa de un cálculo: fórmula, insumos, parámetros con su
 *  vigencia y el resultado. Es lo que la UI muestra para que un
 *  contador pueda auditar el número (§1, "Trazabilidad, no cajas
 *  negras"). */
export interface TrazaCalculo {
  formula: string;
  insumos: Record<string, number | string>;
  parametrosUsados: Array<{
    nombre: string;
    valor: number;
    fecha: string;
    fuenteOficial: string;
    verificado: boolean;
  }>;
  resultado: Record<string, number | string>;
}

export type TipoDiferencial = "GANANCIA" | "PERDIDA" | "NEUTRO";
