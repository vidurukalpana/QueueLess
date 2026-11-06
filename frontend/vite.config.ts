import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
    passWithNoTests: true,
  },
})
