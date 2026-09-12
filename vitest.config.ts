import { defineConfig } from 'vitest/config'

export default defineConfig({ test: { include: ['src/**/*.test.ts', 'src/**/*.test.tsx'], exclude: ['e2e/**'], environment: 'jsdom', setupFiles: ['./src/test/setup.ts'], coverage: { include: ['src/config/**', 'src/lib/**'] } } })
