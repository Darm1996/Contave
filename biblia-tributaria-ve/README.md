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

- **Iteración 3 — Módulo 3, sub-iteración IVA (Ecosistema SENIAT)**:
  - `supabase/migrations/0003_modulo3_iva.sql`: libro de compras/ventas
    (`documentos_iva`, un tipo de documento por fila — factura, nota de
    crédito/débito), prorrateo de crédito fiscal (Art. 34 LIVA),
    declaración mensual (`declaraciones_iva`) y retención de IVA
    quincenal para el Sujeto Pasivo Especial. RLS en todas las tablas.
  - `src/lib/motores/iva.ts`: 4 funciones puras — IVA de un documento,
    retención 75%/100%, prorrateo de crédito fiscal, y consolidación de
    la declaración mensual (débito − crédito − retenciones soportadas −
    excedente anterior). 19 tests unitarios.
  - `/modulo-3`: simulador de las 4 piezas de IVA, con la misma
    advertencia de valores manuales no oficiales.
- **Iteración 4 — Módulo 3, sub-iteración ISLR + IGTF (cierra el Módulo 3)**:
  - `supabase/migrations/0004_modulo3_islr_igtf.sql`: `tramos_islr`
    (tabla de tramos de las tarifas 1/2/3, catálogo compartido con RLS
    de lectura general/escritura SUPER_ADMIN — igual patrón que
    `parametros_fiscales`), `retenciones_islr` (Decreto 1808),
    `conciliaciones_fiscales_islr`, `declaraciones_islr`
    (estimada/definitiva), `operaciones_igtf` y
    `declaraciones_igtf_quincenales`. RLS en todo.
  - `src/lib/motores/islr.ts`: retención (con sustraendo en UT para
    personas naturales), conciliación fiscal (utilidad contable → renta
    gravable), tarifa progresiva genérica (recibe la tabla de tramos
    como insumo, nunca hardcodeada — funciona para tarifa 1, 2 o 3),
    rebaja por nuevas inversiones, anticipo de la declaración estimada.
  - `src/lib/motores/igtf.ts`: `esOperacionSujetaIGTF` deja explícita la
    regla de sujeción (divisas/cripto para cualquiera, o efectivo
    nacional solo para SPE) separada del cálculo del monto; declaración
    quincenal como suma de operaciones sujetas.
  - 25 tests unitarios nuevos (64 en total en el proyecto).
  - `/modulo-3` ahora tiene los tres simuladores (IVA, ISLR, IGTF) y una
    nota explicando que `empresas.tipo_contribuyente` (Ordinario/SPE) ya
    está en el esquema desde la Iteración 1, y que un flujo de UI que
    cambie según ese tipo se implementa al conectar datos reales.

**Módulo 3 completo** (IVA + ISLR + IGTF). Aún no se ha instalado
ninguna dependencia de producción externa a Next.js/Supabase, ni se ha
desplegado nada ni provisionado un proyecto de Supabase real (decisión
explícita del usuario: Supabase se conecta más adelante). Los
parámetros que usan los simuladores no vienen todavía de
`series_temporales`/`parametros_fiscales`/`tramos_islr` — eso requiere
primero tener un proyecto de Supabase conectado y una capa de consulta
de parámetros vigentes.

Pendiente: siguiente módulo del prompt maestro — a definir con el
usuario (Módulo 4 Municipal/Estadal, Módulo 5 Nómina, Módulo 6 Estados
Financieros o Módulo 7 Auditoría), o conectar Supabase.
