import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente de Supabase para Server Components / Route Handlers. Respeta
 * RLS con la sesión del usuario autenticado (a diferencia de un cliente
 * con la service_role key, que se reserva para tareas administrativas
 * puntuales y nunca se expone al bundle del cliente).
 */
export async function crearClienteServidor() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Se ignora cuando setAll se invoca desde un Server Component:
            // el middleware es responsable de refrescar la sesión en ese caso.
          }
        },
      },
    },
  );
}
