/**
 * Contrato del futuro pipeline de lectura automática de facturas (VLM).
 *
 * §2 del prompt maestro pide dejar la arquitectura lista para integrar
 * scripts de Python + modelos de visión-lenguaje, aunque la
 * implementación quede como stub en esta iteración. Este archivo fija
 * la interfaz: cualquier implementación futura (Next.js API route que
 * llama a un servicio Python, una Edge Function, o un modelo llamado
 * directamente) debe cumplir este contrato para que la UI y el resto
 * del backend no tengan que cambiar.
 */

export interface SolicitudExtraccionFactura {
  /** Imagen en base64 (JPEG/PNG) o URL firmada de Supabase Storage. */
  imagen: { tipo: "base64"; datos: string } | { tipo: "url"; url: string };
  empresaId: string;
}

export interface CampoExtraido<T> {
  valor: T;
  /** Confianza del modelo entre 0 y 1. Por debajo de un umbral (a definir
   *  al implementar), la UI debe pedir confirmación manual del contador
   *  antes de contabilizar — nunca se contabiliza automáticamente un
   *  campo con confianza baja. */
  confianza: number;
}

export interface RespuestaExtraccionFactura {
  rifContraparte: CampoExtraido<string>;
  nombreContraparte: CampoExtraido<string>;
  numeroFactura: CampoExtraido<string | null>;
  numeroControl: CampoExtraido<string | null>;
  fechaEmision: CampoExtraido<string>; // ISO 8601
  baseImponible: CampoExtraido<number>;
  montoIVA: CampoExtraido<number>;
  total: CampoExtraido<number>;
  /** Modelo/versión que produjo la extracción, para trazabilidad. */
  modeloUsado: string;
  procesadoEn: string; // ISO 8601
}
