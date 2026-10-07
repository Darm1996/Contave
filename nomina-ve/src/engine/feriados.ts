// Días feriados — LOTTT Art. 184 y Ley de Fiestas Nacionales.
// Genera la lista semilla de un año; la app la guarda en su tabla de feriados
// donde el usuario puede editarla (feriados decretados, regionales, etc.).
import { crear, domingoPascua, sumarDias } from './fechas'
import type { Fecha } from './tipos'

export interface DiaFeriado {
  fecha: Fecha
  nombre: string
  fuente: 'LOTTT Art. 184' | 'Ley de Fiestas Nacionales'
}

export function feriadosNacionales(anio: number): DiaFeriado[] {
  const pascua = domingoPascua(anio)
  const l = (fecha: Fecha, nombre: string): DiaFeriado => ({ fecha, nombre, fuente: 'LOTTT Art. 184' })
  const f = (fecha: Fecha, nombre: string): DiaFeriado => ({ fecha, nombre, fuente: 'Ley de Fiestas Nacionales' })
  return [
    l(crear(anio, 1, 1), 'Año Nuevo'),
    l(sumarDias(pascua, -48), 'Lunes de Carnaval'),
    l(sumarDias(pascua, -47), 'Martes de Carnaval'),
    l(sumarDias(pascua, -3), 'Jueves Santo'),
    l(sumarDias(pascua, -2), 'Viernes Santo'),
    f(crear(anio, 4, 19), 'Declaración de la Independencia'),
    l(crear(anio, 5, 1), 'Día del Trabajador'),
    f(crear(anio, 6, 24), 'Batalla de Carabobo'),
    f(crear(anio, 7, 5), 'Día de la Independencia'),
    f(crear(anio, 7, 24), 'Natalicio del Libertador'),
    f(crear(anio, 10, 12), 'Día de la Resistencia Indígena'),
    l(crear(anio, 12, 24), 'Víspera de Navidad'),
    l(crear(anio, 12, 25), 'Navidad'),
    l(crear(anio, 12, 31), 'Fin de año'),
  ].sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
}
