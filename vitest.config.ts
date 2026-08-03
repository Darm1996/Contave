import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    hookTimeout: 30000,
    testTimeout: 30000,
    // Los tests de integración comparten una única base de datos real y el
    // cliente Prisma fuerza connection_limit=1 (src/lib/db.ts, pensado para el
    // pooler de Supabase). Correr archivos de prueba en paralelo contra ese
    // pool de una sola conexión intercala transacciones entre archivos
    // distintos y produce fallos intermitentes que no son bugs de la app.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
