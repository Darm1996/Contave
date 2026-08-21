import { describe, it, expect } from 'vitest'
import {
  PERMISOS,
  PERMISOS_POR_ROL,
  ROLES,
  TODOS_LOS_PERMISOS,
  CAMPOS_DE_COSTO,
  permisosDeRol,
  rolTienePermiso,
  filtrarCostos,
  seleccionExistencia,
  exigirSucursal,
  ErrorPermiso,
  type ContextoOperacion,
  type Rol,
} from '@/lib/nucleo/permisos'

/** Contexto sintético con el rol indicado, para probar sin base de datos. */
function contextoDe(rol: Rol, sucursalesPermitidas: string[] = []): ContextoOperacion {
  const permisos = permisosDeRol(rol)
  return {
    usuarioId: 'u1',
    email: 'prueba@adminhub.test',
    nombre: 'Prueba',
    organizacionId: 'org1',
    rol,
    permisos,
    sucursalesPermitidas,
    puede: (p) => permisos.includes(p),
  }
}

describe('permisos: catálogo y roles', () => {
  it('todo permiso otorgado a un rol existe en el catálogo', () => {
    for (const rol of ROLES) {
      for (const permiso of PERMISOS_POR_ROL[rol]) {
        expect(TODOS_LOS_PERMISOS).toContain(permiso)
      }
    }
  })

  it('el propietario tiene todos los permisos', () => {
    expect(permisosDeRol('PROPIETARIO')).toHaveLength(TODOS_LOS_PERMISOS.length)
  })

  it('todos los roles del requisito están definidos', () => {
    expect(ROLES).toEqual(['PROPIETARIO', 'ADMINISTRADOR', 'SUPERVISOR', 'CAJERO', 'ALMACENISTA', 'CONTADOR'])
  })

  it('un rol desconocido no recibe ningún permiso', () => {
    expect(permisosDeRol('INVENTADO')).toEqual([])
  })

  it('cada permiso del catálogo tiene descripción legible', () => {
    for (const permiso of TODOS_LOS_PERMISOS) {
      expect(PERMISOS[permiso].length).toBeGreaterThan(3)
    }
  })
})

describe('permisos: criterio de aceptación — el cajero no puede ver costos', () => {
  it('el cajero no tiene el permiso de ver costos', () => {
    expect(rolTienePermiso('CAJERO', 'producto.ver_costo')).toBe(false)
  })

  it('el cajero tampoco puede ver rentabilidad ni valorización', () => {
    // Son las dos vías indirectas por las que un costo se puede deducir.
    expect(rolTienePermiso('CAJERO', 'reporte.rentabilidad')).toBe(false)
    expect(rolTienePermiso('CAJERO', 'inventario.ver_valorizacion')).toBe(false)
  })

  it('el cajero sí puede vender y ver precios', () => {
    expect(rolTienePermiso('CAJERO', 'venta.crear')).toBe(true)
    expect(rolTienePermiso('CAJERO', 'precio.ver')).toBe(true)
    expect(rolTienePermiso('CAJERO', 'producto.ver')).toBe(true)
  })

  it('el cajero no puede anular ventas ni autorizar descuentos', () => {
    expect(rolTienePermiso('CAJERO', 'venta.anular')).toBe(false)
    expect(rolTienePermiso('CAJERO', 'venta.autorizar_descuento')).toBe(false)
  })

  it('filtra los campos de costo de una respuesta plana', () => {
    const producto = { id: 'p1', nombre: 'Coca-Cola 2L', precio: '2.50', costoPromedio: '1.10', margen: '1.40' }
    const filtrado = filtrarCostos(producto, contextoDe('CAJERO'))

    expect(filtrado).toEqual({ id: 'p1', nombre: 'Coca-Cola 2L', precio: '2.50' })
    expect(filtrado).not.toHaveProperty('costoPromedio')
    expect(filtrado).not.toHaveProperty('margen')
  })

  it('filtra los costos ANIDADOS, que es donde se escapan', () => {
    const producto = {
      id: 'p1',
      nombre: 'Camisa',
      variantes: [
        {
          sku: 'CAM-M-AZ',
          existencias: [{ almacenId: 'a1', cantidad: '10', costoPromedio: '8.50', ultimoCosto: '9.00' }],
        },
      ],
    }
    const filtrado = filtrarCostos(producto, contextoDe('CAJERO'))

    expect(filtrado.variantes[0].existencias[0]).toEqual({ almacenId: 'a1', cantidad: '10' })
    expect(JSON.stringify(filtrado)).not.toContain('costoPromedio')
    expect(JSON.stringify(filtrado)).not.toContain('ultimoCosto')
  })

  it('filtra dentro de listas de listas', () => {
    const reporte = [[{ costoTotal: '100', cantidad: '2' }], [{ costoUnitario: '50', cantidad: '1' }]]
    const filtrado = filtrarCostos(reporte, contextoDe('CAJERO'))
    expect(JSON.stringify(filtrado)).not.toMatch(/costo/i)
  })

  it('no filtra nada para quien sí puede ver costos', () => {
    const producto = { id: 'p1', costoPromedio: '1.10', margen: '1.40' }
    expect(filtrarCostos(producto, contextoDe('ADMINISTRADOR'))).toEqual(producto)
    expect(filtrarCostos(producto, contextoDe('ALMACENISTA'))).toEqual(producto)
    expect(filtrarCostos(producto, contextoDe('CONTADOR'))).toEqual(producto)
    expect(filtrarCostos(producto, contextoDe('PROPIETARIO'))).toEqual(producto)
  })

  it('la consulta a la base de datos tampoco trae costos para un cajero', () => {
    // Segunda barrera: el dato no sale de Postgres.
    const seleccion = seleccionExistencia(contextoDe('CAJERO'))
    expect(seleccion).not.toHaveProperty('costoPromedio')
    expect(seleccion).not.toHaveProperty('ultimoCosto')
    expect(seleccion).toHaveProperty('cantidad')
  })

  it('la consulta sí trae costos para un almacenista', () => {
    const seleccion = seleccionExistencia(contextoDe('ALMACENISTA'))
    expect(seleccion).toHaveProperty('costoPromedio')
  })

  it('conserva valores que no son objetos al filtrar', () => {
    expect(filtrarCostos('texto', contextoDe('CAJERO'))).toBe('texto')
    expect(filtrarCostos(42, contextoDe('CAJERO'))).toBe(42)
    expect(filtrarCostos(null, contextoDe('CAJERO'))).toBe(null)
  })

  it('la lista de campos de costo cubre los nombres usados en el esquema', () => {
    for (const campo of ['costoPromedio', 'costoUnitario', 'costoTotal', 'ultimoCosto', 'costoPromedioSaldo']) {
      expect(CAMPOS_DE_COSTO as readonly string[]).toContain(campo)
    }
  })
})

describe('permisos: separación de funciones entre roles', () => {
  it('el almacenista mueve inventario pero no vende', () => {
    expect(rolTienePermiso('ALMACENISTA', 'inventario.mover')).toBe(true)
    expect(rolTienePermiso('ALMACENISTA', 'venta.crear')).toBe(false)
    expect(rolTienePermiso('ALMACENISTA', 'caja.abrir')).toBe(false)
  })

  it('el contador es de solo lectura sobre lo operativo, con exportación', () => {
    expect(rolTienePermiso('CONTADOR', 'reporte.exportar')).toBe(true)
    expect(rolTienePermiso('CONTADOR', 'venta.ver')).toBe(true)
    // No modifica operaciones.
    expect(rolTienePermiso('CONTADOR', 'venta.crear')).toBe(false)
    expect(rolTienePermiso('CONTADOR', 'venta.anular')).toBe(false)
    expect(rolTienePermiso('CONTADOR', 'compra.crear')).toBe(false)
    expect(rolTienePermiso('CONTADOR', 'inventario.mover')).toBe(false)
    expect(rolTienePermiso('CONTADOR', 'producto.crear')).toBe(false)
  })

  it('el supervisor autoriza descuentos y anula, el cajero no', () => {
    expect(rolTienePermiso('SUPERVISOR', 'venta.autorizar_descuento')).toBe(true)
    expect(rolTienePermiso('SUPERVISOR', 'venta.anular')).toBe(true)
    expect(rolTienePermiso('CAJERO', 'venta.autorizar_descuento')).toBe(false)
  })

  it('solo propietario y administrador gestionan el equipo', () => {
    expect(rolTienePermiso('PROPIETARIO', 'usuario.gestionar')).toBe(true)
    expect(rolTienePermiso('ADMINISTRADOR', 'usuario.gestionar')).toBe(true)
    for (const rol of ['SUPERVISOR', 'CAJERO', 'ALMACENISTA', 'CONTADOR'] as const) {
      expect(rolTienePermiso(rol, 'usuario.gestionar')).toBe(false)
    }
  })

  it('solo el propietario ve la auditoría además de administrador y contador', () => {
    expect(rolTienePermiso('PROPIETARIO', 'auditoria.ver')).toBe(true)
    expect(rolTienePermiso('CAJERO', 'auditoria.ver')).toBe(false)
    expect(rolTienePermiso('SUPERVISOR', 'auditoria.ver')).toBe(false)
  })
})

describe('permisos: alcance por sucursal', () => {
  it('sin restricciones declaradas, se permite cualquier sucursal', () => {
    expect(() => exigirSucursal(contextoDe('CAJERO'), 'suc-cualquiera')).not.toThrow()
  })

  it('con restricciones, solo se permiten las asignadas', () => {
    const ctx = contextoDe('CAJERO', ['suc1', 'suc2'])
    expect(() => exigirSucursal(ctx, 'suc1')).not.toThrow()
    expect(() => exigirSucursal(ctx, 'suc3')).toThrow(ErrorPermiso)
  })

  it('el error de permiso responde con estado 403', () => {
    const error = new ErrorPermiso('sin acceso')
    expect(error.status).toBe(403)
  })
})
