// La sesión del día. La idea pedagógica: nunca abrir la app y no saber qué
// hacer. Siempre hay una lista corta, ordenada y con tiempo estimado.

import type { EstadoLeccion } from './progreso'
import type { Semana } from './tipos'

export interface Actividad {
  id: string
  titulo: string
  descripcion: string
  minutos: number
  ruta: string
  icono: 'repaso' | 'gramatica' | 'vocabulario' | 'ejercicios' | 'dialogo' | 'escritura' | 'habla'
  hecho: boolean
  /** Se marca la primera pendiente, para que el botón grande sepa a dónde ir. */
  siguiente?: boolean
}

export interface PlanDelDia {
  actividades: Actividad[]
  minutosTotales: number
  completadas: number
  siguiente?: Actividad
}

/**
 * Construye la sesión del día. El orden no es casual:
 * 1. Repaso espaciado primero (lo que está a punto de olvidarse).
 * 2. Gramática nueva (con la cabeza fresca).
 * 3. Vocabulario, ejercicios y diálogo (aplicar).
 * 4. Escritura y habla al final (producir).
 */
export function construirPlan(
  semana: Semana,
  estado: EstadoLeccion,
  tarjetasPendientes: number
): PlanDelDia {
  const actividades: Actividad[] = []

  if (tarjetasPendientes > 0) {
    actividades.push({
      id: 'repaso',
      titulo: 'Repaso de vocabulario',
      descripcion: `${tarjetasPendientes} ${tarjetasPendientes === 1 ? 'palabra toca' : 'palabras tocan'} hoy`,
      minutos: Math.min(10, Math.max(3, Math.ceil(tarjetasPendientes / 6))),
      ruta: '/vocabulario',
      icono: 'repaso',
      hecho: false,
    })
  }

  actividades.push(
    {
      id: 'gramatica',
      titulo: 'Gramática de la semana',
      descripcion: semana.gramatica.map((g) => g.titulo).join(' · '),
      minutos: 6,
      ruta: `/semana/${semana.numero}/gramatica`,
      icono: 'gramatica',
      hecho: estado.gramatica,
    },
    {
      id: 'vocabulario',
      titulo: 'Palabras nuevas',
      descripcion: `${semana.vocabulario.length} palabras con audio`,
      minutos: 5,
      ruta: `/semana/${semana.numero}/vocabulario`,
      icono: 'vocabulario',
      hecho: estado.vocabulario,
    },
    {
      id: 'ejercicios',
      titulo: 'Ejercicios',
      descripcion: `${semana.ejercicios.length} ejercicios mezclados`,
      minutos: 8,
      ruta: `/semana/${semana.numero}/ejercicios`,
      icono: 'ejercicios',
      hecho: estado.ejercicios,
    },
    {
      id: 'dialogo',
      titulo: 'Diálogo con el profesor',
      descripcion: semana.dialogo.titulo,
      minutos: 5,
      ruta: `/semana/${semana.numero}/dialogo`,
      icono: 'dialogo',
      hecho: estado.dialogo,
    },
    {
      id: 'pronunciacion',
      titulo: 'Pronunciación',
      descripcion: semana.pronunciacion.foco,
      minutos: 4,
      ruta: `/semana/${semana.numero}/pronunciacion`,
      icono: 'habla',
      hecho: estado.pronunciacion,
    },
    {
      id: 'escritura',
      titulo: 'Escritura',
      descripcion: semana.escritura[0]?.titulo ?? 'Redacción de la semana',
      minutos: 10,
      ruta: `/semana/${semana.numero}/escritura`,
      icono: 'escritura',
      hecho: estado.escritura,
    }
  )

  const siguiente = actividades.find((a) => !a.hecho)
  if (siguiente) siguiente.siguiente = true

  return {
    actividades,
    minutosTotales: actividades.filter((a) => !a.hecho).reduce((n, a) => n + a.minutos, 0),
    completadas: actividades.filter((a) => a.hecho).length,
    siguiente,
  }
}

/** Consejo del día: rota según el día del año, para que no sea siempre el mismo. */
const CONSEJOS = [
  'Habla en voz alta desde el primer día. Leer en silencio no entrena la boca.',
  'Es mejor estudiar 20 minutos todos los días que 3 horas el domingo. El cerebro aprende por repetición espaciada, no por maratones.',
  'Cuando no sepas una palabra, no pares: descríbela con las que ya sabes. Eso es exactamente lo que hace un hablante fluido.',
  'Grábate hablando una vez por semana. Oírte es la corrección más rápida y más incómoda que existe.',
  'No traduzcas palabra por palabra. Aprende frases completas: son bloques que salen solos.',
  'Los errores no son un problema, son el método. El que no se equivoca es porque no habla.',
  'Pon el teléfono en inglés. Son 50 palabras nuevas al día sin esfuerzo.',
  'Ve series con subtítulos en inglés, no en español. Con los de español tu cerebro apaga el oído.',
  'Repite el diálogo de la semana imitando la entonación, no solo las palabras. El ritmo importa más que los sonidos sueltos.',
  'Si una regla no te entra, déjala y sigue. Muchas se entienden solas dos semanas después.',
  'Escribe siempre, aunque sea mal. Escribir es hablar en cámara lenta: te da tiempo de pensar la estructura.',
  'Aprende los verbos irregulares en frases, nunca en listas sueltas.',
  'Cuando entiendas el 70% de una conversación, ya puedes participar. No esperes al 100%.',
  'Busca a alguien con quien hablar, aunque sea diez minutos por semana. El idioma es para usarlo con gente.',
]

export function consejoDelDia(): string {
  const dia = Math.floor(Date.now() / 86400000)
  return CONSEJOS[dia % CONSEJOS.length]
}
