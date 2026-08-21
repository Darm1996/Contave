export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">AdminHub</h1>
      <p className="max-w-md text-muted-foreground">
        Sistema de administración de negocios. La interfaz está en construcción;
        el núcleo (catálogo, inventario, punto de venta y caja) ya funciona a
        través de la API.
      </p>
    </main>
  )
}
