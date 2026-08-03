import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Forzamos parámetros del pooler y desactivamos el caché de consultas para Supavisor
const baseDbUrl = process.env.DATABASE_URL || "";
const pooledDbUrl = baseDbUrl.includes('?') 
  ? `${baseDbUrl}&pgbouncer=true&connection_limit=1&statement_cache_size=0` 
  : `${baseDbUrl}?pgbouncer=true&connection_limit=1&statement_cache_size=0`;

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? [] : ['query'],
    datasources: {
      db: {
        url: pooledDbUrl,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
