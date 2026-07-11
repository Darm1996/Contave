// Crear usuario super admin
// Uso: bun run scripts/crear-super-admin.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  const email = 'superadmin@contave.demo'
  const password = 'ContaVE2026!'
  const name = 'Super Administrador'

  console.log('👑 Creando super administrador...')

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await db.user.upsert({
    where: { email },
    update: {
      role: 'SUPER_ADMIN',
      passwordHash, // Actualizar password también
    },
    create: {
      email,
      name,
      passwordHash,
      role: 'SUPER_ADMIN',
    },
  })

  // Asociar a todas las empresas existentes como admin
  const empresas = await db.empresa.findMany()
  for (const emp of empresas) {
    await db.userEmpresa.upsert({
      where: { userId_empresaId: { userId: user.id, empresaId: emp.id } },
      update: { rol: 'ADMIN' },
      create: { userId: user.id, empresaId: emp.id, rol: 'ADMIN' },
    })
  }

  console.log('✅ Super administrador creado/actualizado:')
  console.log(`   Email: ${user.email}`)
  console.log(`   Nombre: ${user.name}`)
  console.log(`   Rol: ${user.role}`)
  console.log(`   Contraseña: ${password}`)
  console.log(`   Empresas asociadas: ${empresas.length}`)
  console.log('')
  console.log('🔑 CREDENCIALES DE ACCESO:')
  console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`   Email:     ${email}`)
  console.log(`   Password:  ${password}`)
  console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('⚠️  IMPORTANTE: Cambia esta contraseña después del primer login.')
  console.log('   El super admin no tiene límite de empresas (puede crear más de 5).')
}

main()
  .catch((e) => { console.error('Error:', e); process.exit(1) })
  .finally(() => db.$disconnect())
