import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, setSessionCookie } from '@/lib/auth'
import { ok, manejarError, ErrorNegocio } from '@/lib/nucleo/respuesta'
import { permisosDeRol, type Rol } from '@/lib/nucleo/permisos'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) throw new ErrorNegocio('Correo y contraseña requeridos', 400)

    const user = await db.user.findUnique({ where: { email: String(email).toLowerCase().trim() } })
    // El mismo mensaje para usuario inexistente y contraseña errada: distinguirlos
    // le diría a un atacante qué correos están registrados.
    if (!user || !user.activo) throw new ErrorNegocio('Credenciales inválidas', 401)
    if (!(await verifyPassword(String(password), user.passwordHash))) {
      throw new ErrorNegocio('Credenciales inválidas', 401)
    }

    // Se activa el primer negocio al que pertenece. Si pertenece a varios,
    // puede cambiar de negocio después.
    const membresia = await db.membresia.findFirst({
      where: { userId: user.id, activo: true, deletedAt: null },
      include: {
        rol: { select: { clave: true, nombre: true } },
        organizacion: { select: { id: true, nombre: true, rubro: true, monedaFuncional: true, activo: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    await setSessionCookie({
      userId: user.id,
      email: user.email,
      role: user.role,
      organizacionId: membresia?.organizacionId,
    })

    return ok({
      user: { id: user.id, email: user.email, name: user.name },
      organizacionActiva: membresia
        ? {
            ...membresia.organizacion,
            rol: membresia.rol.clave,
            permisos: permisosDeRol(membresia.rol.clave as Rol),
          }
        : null,
    })
  } catch (error) {
    return manejarError(error)
  }
}
