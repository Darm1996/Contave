import { describe, expect, it } from "vitest";
import {
  ESTADO_TARJETA_NUEVA,
  actualizarEstadoTarjeta,
  calcularProximaFechaRevision,
  tarjetaPendienteHoy,
} from "@/lib/aprendizaje/repeticion-espaciada";

describe("actualizarEstadoTarjeta", () => {
  it("una tarjeta nueva con calidad alta pasa a intervalo de 1 día", () => {
    const r = actualizarEstadoTarjeta(ESTADO_TARJETA_NUEVA, 5);
    expect(r.repeticiones).toBe(1);
    expect(r.intervaloDias).toBe(1);
  });

  it("la segunda repetición exitosa consecutiva salta a 6 días", () => {
    const primera = actualizarEstadoTarjeta(ESTADO_TARJETA_NUEVA, 5);
    const segunda = actualizarEstadoTarjeta(primera, 5);
    expect(segunda.repeticiones).toBe(2);
    expect(segunda.intervaloDias).toBe(6);
  });

  it("la tercera repetición exitosa multiplica el intervalo anterior por la facilidad", () => {
    const e1 = actualizarEstadoTarjeta(ESTADO_TARJETA_NUEVA, 5);
    const e2 = actualizarEstadoTarjeta(e1, 5);
    const e3 = actualizarEstadoTarjeta(e2, 5);
    expect(e3.repeticiones).toBe(3);
    // El intervalo usa la facilidad recién recalculada en este mismo
    // repaso (e3.facilidad), no la que tenía la tarjeta antes de
    // calificar (e2.facilidad) — así lo define SM-2.
    expect(e3.intervaloDias).toBe(Math.round(e2.intervaloDias * e3.facilidad));
  });

  it("una calidad baja (< 3) reinicia las repeticiones y vuelve a 1 día, sin importar el progreso previo", () => {
    const e1 = actualizarEstadoTarjeta(ESTADO_TARJETA_NUEVA, 5);
    const e2 = actualizarEstadoTarjeta(e1, 5);
    const e3 = actualizarEstadoTarjeta(e2, 1); // "no me acordaba"
    expect(e3.repeticiones).toBe(0);
    expect(e3.intervaloDias).toBe(1);
  });

  it("la facilidad nunca baja de 1.3, incluso con calificaciones muy bajas repetidas", () => {
    let estado = ESTADO_TARJETA_NUEVA;
    for (let i = 0; i < 20; i++) {
      estado = actualizarEstadoTarjeta(estado, 0);
    }
    expect(estado.facilidad).toBeGreaterThanOrEqual(1.3);
  });

  it("una calificación perfecta repetida aumenta la facilidad por encima del valor inicial", () => {
    const r = actualizarEstadoTarjeta(ESTADO_TARJETA_NUEVA, 5);
    expect(r.facilidad).toBeGreaterThan(ESTADO_TARJETA_NUEVA.facilidad);
  });

  it("rechaza una calidad fuera de 0-5", () => {
    // @ts-expect-error - probando el guard en runtime
    expect(() => actualizarEstadoTarjeta(ESTADO_TARJETA_NUEVA, 6)).toThrow(/0 y 5/);
  });
});

describe("calcularProximaFechaRevision", () => {
  it("suma los días de intervalo a la fecha del repaso", () => {
    const estado = { repeticiones: 2, facilidad: 2.5, intervaloDias: 6 };
    const proxima = calcularProximaFechaRevision(estado, new Date("2026-08-01T00:00:00.000Z"));
    expect(proxima).toBe("2026-08-07");
  });
});

describe("tarjetaPendienteHoy", () => {
  it("una tarjeta nunca repasada siempre está pendiente", () => {
    expect(tarjetaPendienteHoy(null, new Date("2026-08-01"))).toBe(true);
  });

  it("una tarjeta con próxima revisión en el pasado está pendiente", () => {
    expect(tarjetaPendienteHoy("2026-07-01", new Date("2026-08-01"))).toBe(true);
  });

  it("una tarjeta con próxima revisión en el futuro no está pendiente", () => {
    expect(tarjetaPendienteHoy("2026-09-01", new Date("2026-08-01"))).toBe(false);
  });

  it("una tarjeta programada exactamente para hoy está pendiente", () => {
    expect(tarjetaPendienteHoy("2026-08-01", new Date("2026-08-01"))).toBe(true);
  });
});
