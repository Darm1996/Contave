// Limpiar datos de prueba para resetear el estado
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function main() {
  console.log('🧹 Limpiando datos de prueba...')
  // Borrar en orden de dependencias
  const delAsientosLineas = await db.asientoLinea.deleteMany({})
  console.log(`  ✓ AsientoLinea: ${delAsientosLineas.count} borrados`)
  const delAsientos = await db.asiento.deleteMany({})
  console.log(`  ✓ Asiento: ${delAsientos.count} borrados`)
  const delFacturas = await db.factura.deleteMany({})
  console.log(`  ✓ Factura: ${delFacturas.count} borrados`)
  console.log('✨ Estado reseteado. Listo para usar.')
}

main().catch(console.error).finally(() => db.$disconnect())
