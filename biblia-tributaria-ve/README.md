# Biblia y Simulador de Contabilidad y Tributos de Venezuela

Proyecto **independiente** de ContaVE (que vive en la raíz de este repo).
Vive por completo en esta carpeta: no comparte código, base de datos ni
dependencias con ContaVE.

## Supuestos declarados en esta iteración

Como el usuario respondió "usa tu criterio" en los puntos no confirmados
explícitamente, se declaran aquí los supuestos tomados (§0 del prompt maestro):

1. **Audiencia**: firma contable con varios clientes (multi-tenant). Un
   usuario (contador) puede pertenecer a varias `empresas` con un rol
   distinto en cada una. Esto se revisa en la tabla `empresa_usuarios`.
2. **Alcance v1**: base de conocimiento navegable **y** simuladores de
   cálculo — el prompt maestro lista ambos como parte del mismo sistema y
   la tabla de parámetros versionados (§3) es un requisito compartido por
   los dos, así que no tiene sentido separarlos en esta etapa.
3. **Stack**: Next.js (App Router) + TypeScript + Tailwind, igual que
   ContaVE, para reusar la experiencia de despliegue en Vercel y no
   introducir una segunda convención de frontend en el mismo repo. Base
   de datos: Supabase/Postgres con Row Level Security desde el día 1
   (a diferencia de ContaVE, que usa control de acceso a nivel de
   aplicación con Prisma).

Si alguno de estos supuestos no es el que quieres, dímelo antes de que se
siga construyendo sobre ellos.

## Estructura

```
biblia-tributaria-ve/
  src/
    app/                    # Next.js App Router
      layout.tsx
      globals.css
      page.tsx
    components/
      layout/                # Navbar + Sidebar (app shell)
    lib/
      design-tokens.ts        # Tokens de diseño concretos (§5)
      supabase/                # Clientes de Supabase (browser/server), stubs
    types/
      database.ts              # Tipos generados de Supabase (placeholder)
  supabase/
    migrations/
      0001_init.sql             # Esquema completo (§3, §4, módulos)
    README.md
```

## Estado

- **Iteración 1**: estructura, esquema de base de datos, layout base.
- **Iteración 2 — Módulo 2 (Multimoneda e Inflación)**:
  - `supabase/migrations/0002_modulo2_multimoneda_inflacion.sql`: plan
    de cuentas mínimo (monetaria/no monetaria, moneda), partidas en
    moneda extranjera con sus liquidaciones (diferencial realizado) y
    cierres de período (diferencial no realizado), partidas no
    monetarias y ajuste por inflación por período (reexpresión +
    REPOMAN). RLS en todas las tablas nuevas.
  - `src/lib/motores/diferencial-cambiario.ts` y
    `src/lib/motores/ajuste-inflacion.ts`: funciones puras, sin
    dependencia de base de datos, cada una devuelve su traza completa
    (fórmula, insumos, parámetros con fecha/fuente/verificado,
    resultado). 20 tests unitarios en `tests/` cubren ganancia/pérdida
    en ambos sentidos, partidas activas vs. pasivas, posición monetaria
    neta activa vs. pasiva, movimientos intermedios y validaciones de
    error.
  - `/modulo-2`: simuladores interactivos de ambos motores, con
    advertencia explícita de que los valores de tasa/INPC se ingresan a
    mano y no son datos oficiales — ver §1, "prohibido inventar cifras
    legales".

**Aún no se ha instalado ninguna dependencia de producción externa a
Next.js/Supabase, ni se ha desplegado nada ni provisionado un proyecto
de Supabase real.** Los parámetros que usan los simuladores no vienen
todavía de `series_temporales` — eso requiere primero tener un proyecto
de Supabase conectado y una capa de consulta de parámetros vigentes
(pendiente, ver siguiente iteración sugerida).

Pendiente: conectar los simuladores a un proyecto real de Supabase, o
profundizar en el siguiente módulo — a definir con el usuario.
