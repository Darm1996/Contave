/**
 * Renderizador minimalista del markdown simple usado en el contenido de
 * las lecciones (párrafos, ## encabezados, - listas, **negritas**). No
 * se trae una librería completa de markdown para esto — el contenido
 * lo escribimos nosotros mismos con un subconjunto controlado.
 */

function renderizarNegritas(texto: string, keyPrefix: string) {
  const partes = texto.split(/(\*\*[^*]+\*\*)/g);
  return partes.map((parte, i) => {
    if (parte.startsWith("**") && parte.endsWith("**")) {
      return <strong key={`${keyPrefix}-${i}`}>{parte.slice(2, -2)}</strong>;
    }
    return <span key={`${keyPrefix}-${i}`}>{parte}</span>;
  });
}

export function ContenidoLeccion({ markdown }: { markdown: string }) {
  const bloques = markdown.split("\n\n");

  return (
    <div className="prosa-leccion">
      {bloques.map((bloque, i) => {
        const lineas = bloque.split("\n").filter((l) => l.trim().length > 0);

        if (lineas.length === 0) return null;

        if (lineas[0]?.startsWith("## ")) {
          return <h2 key={i}>{lineas[0].slice(3)}</h2>;
        }

        if (lineas.every((l) => l.trim().startsWith("- "))) {
          return (
            <ul key={i}>
              {lineas.map((l, j) => (
                <li key={j}>{renderizarNegritas(l.trim().slice(2), `${i}-${j}`)}</li>
              ))}
            </ul>
          );
        }

        return <p key={i}>{renderizarNegritas(lineas.join(" "), `${i}`)}</p>;
      })}
    </div>
  );
}
