/**
 * Design tokens concretos (§5 del prompt maestro).
 *
 * Única fuente de verdad para el sistema visual. `globals.css` los
 * traduce a variables CSS (`@theme`) para que Tailwind los use como
 * utilidades; este archivo los expone también como valores TS para
 * componentes que no pueden usar clases de Tailwind (p.ej. `recharts`
 * u otras librerías que piden un color en JS, cuando se integren en
 * módulos posteriores).
 *
 * Decisión declarada: el prompt pide "un único hex de acento para
 * acciones/alertas". Se interpreta como un único acento de marca para
 * acciones (botones, enlaces, estados activos) — pero se reserva un rojo
 * semántico aparte, exclusivo para dos casos que no pueden compartir
 * color con una acción normal: (a) el marcador ⚠️ verificar en fuente
 * oficial de §1, y (b) acciones destructivas. Mezclarlos con el acento
 * de marca haría indistinguible "esto es una acción normal" de "esta
 * cifra no está verificada legalmente", que es precisamente el tipo de
 * ambigüedad que este sistema no se puede permitir.
 */

export const designTokens = {
  color: {
    acento: "#2563EB", // acciones primarias, enlaces, estados activos
    alerta: "#DC2626", // ⚠️ verificar en fuente oficial, acciones destructivas
    exito: "#16A34A", // confirmaciones (parámetro verificado, obligación cumplida)
    gris: {
      50: "#FAFAFA",
      100: "#F5F5F5",
      200: "#E5E5E5",
      300: "#D4D4D4",
      400: "#A3A3A3",
      500: "#737373",
      600: "#525252",
      700: "#404040",
      800: "#262626",
      900: "#171717",
      950: "#0A0A0A",
    },
  },
  fuente: {
    ui: "var(--font-inter)",
    mono: "var(--font-jetbrains-mono)", // cifras, tablas, números de comprobante
  },
  espaciado: {
    1: "4px",
    2: "8px",
    3: "12px",
    4: "16px",
    6: "24px",
    8: "32px",
    12: "48px",
    16: "64px",
  },
  radio: {
    sm: "4px",
    md: "8px",
    lg: "12px",
  },
} as const;
