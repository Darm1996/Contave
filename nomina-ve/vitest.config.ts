import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Configuración propia de PostCSS para no heredar la de un directorio padre.
  css: { postcss: {} },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
})
