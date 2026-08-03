// Seed: ContaVE - Plan de cuentas VEN-NIF Pymes + usuario admin + empresa demo + tasa BCV
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { CUENTAS_VEN_NIF } from '../src/lib/contabilidad/plan-cuentas-ven-nif'

const db = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed ContaVE...')

  // 1. Usuario admin demo
  const passwordHash = await bcrypt.hash('admin123', 10)
  const admin = await db.user.upsert({
    where: { email: 'admin@contave.demo' },
    update: {},
    create: {
      email: 'admin@contave.demo',
      name: 'Administrador Demo',
      passwordHash,
      role: 'ADMIN',
    },
  })
  console.log('✓ Usuario admin:', admin.email)

  // 2. Empresa demo
  const empresa = await db.empresa.upsert({
    where: { rif: 'J-12345678-9' },
    update: {},
    create: {
      nombre: 'Empresa Demo C.A.',
      rif: 'J-12345678-9',
      direccion: 'Av. Principal, Caracas, Venezuela',
      telefono: '+58 212-555-0000',
      email: 'info@empresademo.com',
      esAgenteRetencionIVA: true,
      esContribuyenteEspecial: false,
      alicuotaIVA: 16.0,
      monedaFuncional: 'VES',
    },
  })
  console.log('✓ Empresa:', empresa.nombre)

  // 3. Asociar usuario a empresa
  await db.userEmpresa.upsert({
    where: { userId_empresaId: { userId: admin.id, empresaId: empresa.id } },
    update: {},
    create: { userId: admin.id, empresaId: empresa.id, rol: 'ADMIN' },
  })

  // 4. Plan de cuentas VEN-NIF Pymes
  console.log('✓ Cargando plan de cuentas VEN-NIF Pymes...')
  for (const c of CUENTAS_VEN_NIF) {
    await db.cuenta.upsert({
      where: { empresaId_codigo: { empresaId: empresa.id, codigo: c.codigo } },
      update: { nombre: c.nombre, tipo: c.tipo, naturaleza: c.naturaleza, nivel: c.nivel, uso: c.uso || null },
      create: {
        empresaId: empresa.id,
        codigo: c.codigo,
        nombre: c.nombre,
        tipo: c.tipo,
        naturaleza: c.naturaleza,
        nivel: c.nivel,
        imputable: c.imputable ?? true,
        uso: c.uso || null,
      },
    })
  }
  console.log(`✓ ${CUENTAS_VEN_NIF.length} cuentas cargadas`)

  // 5. Tasa BCV inicial (referencial)
  await db.tasaCambio.create({
    data: {
      empresaId: empresa.id,
      fecha: new Date(),
      monedaRef: 'USD',
      tasa: 145.50, // Tasa referencial - actualizar manualmente
      fuente: 'BCV',
    },
  }).catch(() => console.log('⚠ Tasa ya existe para hoy'))

  console.log('🎉 Seed completado!')
  console.log('   Login: admin@contave.demo / admin123')
  console.log('   Empresa: Empresa Demo C.A. (J-12345678-9)')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
