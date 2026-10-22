import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const srcDir = fileURLToPath(new URL('./src', import.meta.url))

const config = defineConfig(({ mode }) => {
  const isDemo = mode === 'demo'

  return {
    resolve: {
      tsconfigPaths: true,
      alias: {
        '@': srcDir,
      },
    },
    // Demo: disable Vite .env file loading so demo never reads `.env` /
    // `.env.local`. `pnpm dev:demo` injects vars from `.env.demo` only.
    envDir: isDemo ? false : undefined,
    plugins: [nitro(), tailwindcss(), tanstackStart(), viteReact()],
    server: {
      port: isDemo ? 3001 : 3000,
      strictPort: true,
    },
  }
})

export default config
