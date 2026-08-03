import { describe, it, expect } from 'vitest'
import jwt from 'jsonwebtoken'
import { hashPassword, verifyPassword, signToken, verifyToken } from '@/lib/auth'

describe('hashPassword / verifyPassword', () => {
  it('genera un hash distinto del texto plano y lo verifica correctamente', async () => {
    const hash = await hashPassword('mi-clave-secreta')
    expect(hash).not.toBe('mi-clave-secreta')
    expect(await verifyPassword('mi-clave-secreta', hash)).toBe(true)
  })

  it('rechaza una contraseña incorrecta', async () => {
    const hash = await hashPassword('correcta')
    expect(await verifyPassword('incorrecta', hash)).toBe(false)
  })
})

describe('signToken / verifyToken', () => {
  it('firma y verifica un token válido con el mismo payload', () => {
    const token = signToken({ userId: 'u1', email: 'a@b.com', role: 'ADMIN' })
    const decoded = verifyToken(token)
    expect(decoded?.userId).toBe('u1')
    expect(decoded?.role).toBe('ADMIN')
  })

  it('rechaza un token manipulado', () => {
    const token = signToken({ userId: 'u1', email: 'a@b.com', role: 'ADMIN' })
    const manipulado = token.slice(0, -2) + 'xx'
    expect(verifyToken(manipulado)).toBeNull()
  })

  it('rechaza un token con firma de otro secreto', () => {
    // Simula un token forjado con un secreto distinto al configurado.
    const forjado = jwt.sign({ userId: 'atacante', email: 'x@x.com', role: 'SUPER_ADMIN' }, 'otro-secreto-cualquiera')
    expect(verifyToken(forjado)).toBeNull()
  })

  it('rechaza un token vacío o malformado', () => {
    expect(verifyToken('')).toBeNull()
    expect(verifyToken('no.es.un.jwt.valido')).toBeNull()
  })
})
