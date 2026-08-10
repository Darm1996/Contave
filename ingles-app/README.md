# Inglés desde cero — curso de 6 meses

Aplicación web para aprender inglés partiendo de cero, en español, con un profesor
que habla en voz alta. Es un proyecto independiente: no comparte código, base de
datos ni configuración con el resto de este repositorio.

## Qué incluye

| | |
|---|---|
| Semanas de curso | 24 (6 meses, nivel A0 → B1) |
| Palabras de vocabulario | 541, con audio y ejemplos |
| Ejercicios | 288, de 7 tipos distintos |
| Temas de gramática | 48, explicados en español |
| Diálogos | 24, interpretados a dos voces |
| Tareas de escritura | 28, con corrección automática |

## Las seis funciones principales

**1. Un profesor con seis voces.** Cada perfil (Emma 🇬🇧, James 🇬🇧, Olivia 🇺🇸,
Michael 🇺🇸, Charlotte 🇦🇺, Raj 🇮🇳) usa una voz distinta de las instaladas en el
dispositivo, elegida y repartida automáticamente para que ningún personaje suene
igual que otro. Los diálogos se reproducen a varias voces, con la línea activa
resaltada. Todo funciona sin internet y sin claves de API: usa la síntesis de voz
del navegador.

**2. Plan de 6 meses con sesión diaria.** La pantalla de inicio nunca te deja sin
saber qué hacer: calcula la sesión del día en orden pedagógico (repaso → gramática
nueva → vocabulario → ejercicios → diálogo → producción), con el tiempo estimado.

**3. Ejercicios de siete tipos.** Opción múltiple, completar, traducir, ordenar
palabras, dictado (escuchar y escribir), emparejar y **hablar con micrófono**: la
app transcribe lo que dices, lo compara con la frase y te señala qué palabra no se
entendió.

**4. Repaso espaciado (SM-2).** Cada palabra que estudias entra en un sistema de
tarjetas que la devuelve justo antes de que se te olvide. Es lo que diferencia
"estudiar 500 palabras" de "saber 500 palabras a los seis meses".

**5. Corrección de escritura.** Un corrector que caza los errores concretos del
hispanohablante: *I have 25 years*, *she work*, *I no have*, *more better*,
*if I will*, *información**s***, doble negación, palabras en español coladas… Además
comprueba la extensión y que hayas usado las estructuras que pedía la consigna.

**6. Pronunciación con pares mínimos.** Cada semana trabaja un sonido concreto
(ship/sheep, la th, la r que no vibra, la schwa, los tres sonidos de -ed…) con
explicación de por qué nos cuesta a los hispanohablantes y grabación para
comprobarlo.

## El plan de estudio

| Mes | Tema | Al terminar puedes |
|---|---|---|
| 1 | Cimientos | Presentarte, hablar de tu rutina, preguntar |
| 2 | Tu mundo | Describir personas y lugares, decir qué sabes hacer |
| 3 | El pasado | Contar lo que hiciste, pedir en un restaurante |
| 4 | Futuro y opinión | Hablar de planes, comparar, expresar gustos |
| 5 | Conversación real | Experiencias, consejos, obligaciones, condicionales |
| 6 | Fluidez | Hipótesis, anécdotas, voz pasiva, entrevista de trabajo |

## Cómo ejecutarlo

```bash
cd ingles-app
npm install
npm run dev      # http://localhost:3100
```

Otros comandos:

```bash
npm run build    # compilar para producción
npm run start    # servir la versión compilada
npm run validar  # comprobar la integridad del contenido del curso
```

Se despliega en Vercel, Netlify o cualquier hosting de Next.js sin variables de
entorno: **no hay backend, ni base de datos, ni cuentas de usuario**. En Vercel,
configura `ingles-app` como directorio raíz del proyecto.

## Cómo está hecho

- **Next.js 16** (App Router) + **React 19** + **TypeScript** en modo estricto.
- **Tailwind CSS 4**, tema claro y oscuro automáticos, diseño móvil primero.
- **Zustand** con persistencia en `localStorage`: el progreso vive en el
  dispositivo del estudiante y la app funciona sin conexión.
- **Web Speech API** para la voz del profesor y el reconocimiento de voz.
- Sin dependencias de UI pesadas: los componentes base son propios.

```
src/
  app/               pantallas (Next App Router)
    semana/[numero]/ gramática · vocabulario · ejercicios · diálogo ·
                     pronunciación · escritura
  components/        UI base, botón de audio, motor de ejercicios, navegación
  contenido/         el curso: mes-1.ts … mes-6.ts + índice
  lib/               voz, micrófono, repaso espaciado, corrector, progreso
scripts/
  validar-contenido.ts   comprobación de integridad del curso
```

## Compatibilidad

- **Voz del profesor**: Chrome, Edge, Safari, Firefox, Android e iOS.
- **Micrófono (pronunciación)**: Chrome y Edge lo soportan mejor; en navegadores
  sin reconocimiento de voz los ejercicios de hablar siguen disponibles, solo que
  sin corrección automática.
- El número y la calidad de las voces dependen del sistema operativo. La app
  detecta las que hay y reparte los perfiles entre ellas.

## Nota sobre el contenido

Las 24 semanas están escritas para hispanohablantes: cada punto de gramática
explica en qué se diferencia del español y qué error concreto produce esa
diferencia. Los errores marcados en la sección "errores que casi todos cometemos"
y las reglas del corrector automático son los mismos, así que lo que se explica es
exactamente lo que después se corrige.
