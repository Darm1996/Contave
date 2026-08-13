import type { Modulo } from "@/lib/aprendizaje/tipos";

/**
 * Catálogo de módulos. El orden aquí es el orden pedagógico decidido
 * (fundamentos primero) — ver README para la justificación. Cada
 * módulo se completa con su propio archivo de contenido en esta misma
 * carpeta (p.ej. fundamentos-contabilidad.ts) a medida que se agrega.
 */
export const MODULOS: Modulo[] = [
  {
    id: "fundamentos",
    numero: 1,
    nombre: "Fundamentos de Contabilidad",
    descripcion: "Partida doble, ecuación contable, naturaleza de las cuentas.",
    leccionesIds: ["fundamentos-partida-doble"],
  },
  {
    id: "multimoneda-inflacion",
    numero: 2,
    nombre: "Multimoneda y Ajuste por Inflación",
    descripcion: "NIC 21 (diferencial cambiario) y BA VEN-NIF 2/NIC 29 (reexpresión, REPOMAN).",
    leccionesIds: ["multimoneda-diferencial-cambiario", "multimoneda-ajuste-inflacion"],
  },
  {
    id: "tributario",
    numero: 3,
    nombre: "Tributario Nacional (SENIAT)",
    descripcion: "IVA, ISLR, IGTF: cómo se calculan y cuándo aplican.",
    leccionesIds: ["tributario-iva", "tributario-islr", "tributario-igtf"],
  },
  {
    id: "estados-financieros",
    numero: 4,
    nombre: "Estados Financieros",
    descripcion: "VEN-NIF/NIC 1: los 4 estados y cómo se relacionan entre sí.",
    leccionesIds: ["ef-cuatro-estados", "ef-relacion-estados"],
  },
  {
    id: "auditoria",
    numero: 5,
    nombre: "Auditoría e Inventario",
    descripcion: "Conciliaciones, arqueos, control de inventario.",
    leccionesIds: ["auditoria-conciliacion-bancaria", "auditoria-inventario"],
  },
];
