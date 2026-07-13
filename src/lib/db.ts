import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Forzamos los parámetros del pooler para evitar conflictos de inicialización en Vercel
const baseDbUrl = process.env.DATABASE_URL || "";
const pooledDbUrl = baseDbUrl.includes('?') 
  ? `${baseDbUrl}&pgbouncer=true&connection_limit=1` 
  : `${baseDbUrl}?pgbouncer=true&connection_limit=1`;

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
    datasources: {
      db: {
        url: pooledDbUrl,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
