import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  buildDemoProcessEnv,
  requireKeys,
  summarizeEnv,
} from './env/load-env.mjs'

const root = resolve(import.meta.dirname, '..')
const workdir = resolve(root, 'demo-stack')
const REQUIRED = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
]

function ensureDemoSupabase() {
  const status = spawnSync(
    'npx',
    ['supabase', 'status', '--workdir', workdir],
    { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' },
  )
  if (status.status === 0) return

  console.info('[dev:demo] Demo local Supabase is not running. Starting stack…')
  const start = spawnSync('npx', ['supabase', 'start', '--workdir', workdir], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (start.status !== 0) {
    throw new Error(
      'Failed to start Demo Supabase. Run `pnpm supabase:demo:start` and check Docker.',
    )
  }
}

function main() {
  if (!existsSync(resolve(root, '.env.demo'))) {
    throw new Error(
      'Missing .env.demo. Copy .env.demo.example → .env.demo and fill demo credentials. Demo mode never reads .env or .env.local.',
    )
  }

  const { env, loadedFrom } = buildDemoProcessEnv(root, ['.env.demo'])

  // Safe demo defaults (never override explicit values)
  if (!env.EMAIL_DELIVERY_ENABLED?.trim()) {
    env.EMAIL_DELIVERY_ENABLED = 'false'
  }
  if (!env.APP_URL?.trim()) {
    env.APP_URL = 'http://localhost:3001'
  }

  requireKeys(env, REQUIRED, 'Demo')

  console.info(
    '[dev:demo] Loading env from:',
    loadedFrom.join(', ') || '(none)',
  )
  console.info(
    '[dev:demo] Config check:',
    summarizeEnv(env, [
      ...REQUIRED,
      'PRODUCTION_SUPER_ADMIN_EMAIL',
      'APP_URL',
      'EMAIL_DELIVERY_ENABLED',
    ]).join(', '),
  )

  // Local demo API is on 54331 — start stack when pointing at it
  const url = env.VITE_SUPABASE_URL
  if (url.includes('127.0.0.1:54331') || url.includes('localhost:54331')) {
    ensureDemoSupabase()
  }

  const child = spawn(
    'pnpm',
    ['exec', 'vite', 'dev', '--mode', 'demo', '--port', '3001'],
    {
      cwd: root,
      env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    },
  )

  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal)
    process.exit(code ?? 1)
  })
}

try {
  main()
} catch (error) {
  console.error(`[dev:demo] ${error instanceof Error ? error.message : error}`)
  process.exit(1)
}
