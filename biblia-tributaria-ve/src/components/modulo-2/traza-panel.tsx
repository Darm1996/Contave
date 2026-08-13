import type { TrazaCalculo } from "@/lib/motores/tipos";

/**
 * Muestra la traza de un cálculo (§1: "Trazabilidad, no cajas negras").
 * Cualquier motor de cálculo del sistema devuelve un objeto TrazaCalculo
 * y este componente sabe renderizarlo de forma genérica, sin acoplarse
 * a un módulo en particular.
 */
export function TrazaPanel({ traza }: { traza: TrazaCalculo }) {
  return (
    <div className="rounded-lg border border-[var(--borde)] bg-[var(--bg-panel)] p-4 text-sm">
      <p className="mb-3 font-medium text-gris-700 dark:text-gris-300">
        Traza del cálculo
      </p>

      <p className="cifra mb-3 text-xs text-gris-600 dark:text-gris-400">
        {traza.formula}
      </p>

      <div className="mb-3">
        <p className="mb-1 text-xs font-medium text-gris-500 uppercase">
          Parámetros usados
        </p>
        <ul className="space-y-1">
          {traza.parametrosUsados.map((p, i) => (
            <li key={i} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-gris-600 dark:text-gris-400">
                {p.nombre} ({p.fecha})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="cifra">{p.valor}</span>
                {p.verificado ? (
                  <span className="text-exito" title={p.fuenteOficial}>
                    verificado
                  </span>
                ) : (
                  <span className="text-alerta" title={p.fuenteOficial}>
                    ⚠️ verificar en fuente oficial
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-gris-500 uppercase">
          Resultado
        </p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
          {Object.entries(traza.resultado).map(([clave, valor]) => (
            <div key={clave} className="flex items-baseline justify-between gap-2">
              <dt className="text-xs text-gris-500">{clave}</dt>
              <dd className="cifra text-xs font-medium">
                {typeof valor === "number" ? valor.toFixed(4) : valor}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
