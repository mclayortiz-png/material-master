import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Testes unitários (sem banco de dados): `yarn test:unit`
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    reporters: ['verbose'],
  },
})
