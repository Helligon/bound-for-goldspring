import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' is required so the build works on itch.io, which serves the
// game from a subpath rather than the domain root.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    // Core logic is DOM-free, so the default node environment is enough.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
