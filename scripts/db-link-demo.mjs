import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { buildDemoProcessEnv, requireKeys } from './env/load-env.mjs'

/**
 * Link the Supabase CLI to the demo cloud project using ONLY `.env.demo`.
 * Never reads `.env` / `.env.local`.
 */

function projectRefFromUrl(url) {
  if (!url) {
    throw new Error('VITE_SUPABASE_URL is missing in .env.demo')
  }
  let hostname
  try {
    hostname = new URL(url).hostname
  } catch {
    throw new Error(`VITE_SUPABASE_URL is not a valid URL`)
  }
  if (
    hostname.includes('127.0.0.1') ||
    hostname.includes('localhost') ||
    hostname.includes('0.0.0.0')
  ) {
    throw new Error(
      'VITE_SUPABASE_URL in .env.demo points at local Supabase. Use the demo cloud URL to link.',
    )
  }
  const match = hostname.match(/^([a-z0-9]+)\.supabase.co$/i)
  if (!match) {
    throw new Error(`Could not parse project ref from host: ${hostname}`)
  }
  return match[1]
}

const root = resolve(import.meta.dirname, '..')
if (!existsSync(resolve(root, '.env.demo'))) {
  console.error('Missing .env.demo — refuse to link (would not use .env).')
  process.exit(1)
}

const { env } = buildDemoProcessEnv(root, ['.env.demo'])
requireKeys(env, ['VITE_SUPABASE_URL'], 'Demo db:link')
const projectRef = projectRefFromUrl(env.VITE_SUPABASE_URL)

console.log(`Linking Supabase CLI to demo project ref: ${projectRef}`)

const result = spawnSync(
  'npx',
  ['supabase', 'link', '--project-ref', projectRef, ...process.argv.slice(2)],
  {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env,
  },
)

process.exit(result.status ?? 1)
