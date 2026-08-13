# Academia Contable VE

App de **repaso y aprendizaje** de contabilidad y tributos venezolanos —
como una app de aprender inglés, pero para refrescar/reforzar
conocimiento contable. **No es un simulador operativo**: no registra
facturas ni genera declaraciones. El objetivo es que quien la usa
termine sabiendo más de contabilidad venezolana, con explicaciones,
preguntas y repaso espaciado.

Proyecto **independiente**: no comparte código con ContaVE (raíz del
repo) ni con `biblia-tributaria-ve/` (el simulador tributario construido
antes, que se mantiene aparte por si se retoma más adelante).

## Mecánica de aprendizaje

Dos modos, como se decidió con el usuario:

1. **Lecciones + quiz**: cada lección explica un concepto en un lenguaje
   directo (con ejemplos venezolanos) y termina con preguntas de opción
   múltiple/verdadero-falso con retroalimentación inmediata que explica
   por qué la respuesta es correcta o incorrecta.
2. **Flashcards con repetición espaciada** (algoritmo SM-2, el mismo
   principio que Anki): cada flashcard tiene una pregunta corta y una
   respuesta. Al repasar, el usuario califica qué tan fácil le resultó
   recordarla, y eso determina cuándo vuelve a aparecer — lo que se le
   dificulta se repite más seguido, lo que domina se espacia más.

## Alcance de contenido

Orden decidido por diseño pedagógico (fundamentos primero, luego lo más
especializado), no por el usuario. Se agrega módulo por módulo:

1. **Fundamentos de contabilidad general** — partida doble, ecuación
   contable, plan de cuentas, tipos de cuenta. *(Implementado.)*
2. **Multimoneda y ajuste por inflación** (NIC 21, BA VEN-NIF 2/NIC 29)
   — dos lecciones: diferencial cambiario, y reexpresión/REPOMAN.
   *(Implementado.)*
3. **Tributario nacional: IVA, ISLR, IGTF** — tres lecciones, una por
   tributo. *(Implementado.)*
4. Estados financieros (VEN-NIF/NIC 1)
5. Auditoría e inventario

## Estructura

```
academia-contable-ve/
  src/
    app/
      page.tsx                 # Dashboard: módulos y progreso
      aprender/[leccionId]/     # Vista de una lección + quiz
      repasar/                  # Modo flashcards (repetición espaciada)
    components/
      aprendizaje/               # UI de lección, quiz, flashcard
      layout/                     # Navbar + Sidebar (mismo lenguaje visual)
    contenido/
      modulos.ts                  # Catálogo de módulos y lecciones
      fundamentos-contabilidad.ts # Contenido de la lección 1 (texto + quiz + flashcards)
    lib/
      aprendizaje/
        repeticion-espaciada.ts    # Algoritmo SM-2, puro y testeado
        quiz.ts                     # Calificación de quiz, puro y testeado
        progreso-local.ts            # Persistencia en localStorage (temporal, sin Supabase)
      design-tokens.ts
  supabase/
    migrations/
      0001_init.sql              # Esquema para cuando se conecte Supabase
  tests/
```

## Estado

**Aún no desplegado.** Persistencia de progreso en `localStorage` del
navegador por ahora — el esquema de Supabase para progreso por usuario
ya está diseñado (`supabase/migrations/0001_init.sql`) pero no hay
proyecto conectado, siguiendo la misma decisión que en
`biblia-tributaria-ve` (Supabase se conecta más adelante).
