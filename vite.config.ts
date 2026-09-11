import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const srcDir = fileURLToPath(new URL('./src', import.meta.url))

const config = defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      '@': srcDir,
    },
  },
  plugins: [nitro(), tailwindcss(), tanstackStart(), viteReact()],
})

export default config
