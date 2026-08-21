import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { ok, manejarError } from '@/lib/nucleo/respuesta'
import { permisosDeRol, type Rol } from '@/lib/nucleo/permisos'

// GET /api/auth/me — quién soy, en qué negocio estoy y qué puedo hacer.
//
// Devuelve los permisos del rol para que la interfaz sepa qué mostrar. Eso es
// solo cosmético: la validación real ocurre en el servidor, en cada motor.
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return ok({ user: null, organizacionActiva: null, organizaciones: [] })

    const membresias = await db.membresia.findMany({
      where: { userId: user.id, activo: true, deletedAt: null },
      include: {
        rol: { select: { clave: true, nombre: true } },
        organizacion: { select: { id: true, nombre: true, rubro: true, monedaFuncional: true, activo: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    const activa = membresias.find((m) => m.organizacionId === user.organizacionId) ?? membresias[0] ?? null

    return ok({
      user: { id: user.id, email: user.email, name: user.name },
      organizacionActiva: activa
        ? {
            ...activa.organizacion,
            rol: activa.rol.clave,
            permisos: permisosDeRol(activa.rol.clave as Rol),
          }
        : null,
      organizaciones: membresias.map((m) => ({ ...m.organizacion, rol: m.rol.clave })),
    })
  } catch (error) {
    return manejarError(error)
  }
}
