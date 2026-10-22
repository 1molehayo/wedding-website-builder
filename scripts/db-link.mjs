import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

/**
 * Link the Supabase CLI to the **regular** cloud project from `.env` → VITE_SUPABASE_URL.
 * Does not use `.env.local` (that is usually local Mailpit / 127.0.0.1).
 * For the demo cloud project, use `pnpm db:demo:link` (reads `.env.demo` only).
 */

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {}
  const values = {}
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    values[key] = value
  }
  return values
}

function projectRefFromUrl(url) {
  if (!url) {
    throw new Error(
      'VITE_SUPABASE_URL is missing. Set it in `.env` to your cloud project URL.',
    )
  }

  let hostname
  try {
    hostname = new URL(url).hostname
  } catch {
    throw new Error(`VITE_SUPABASE_URL is not a valid URL: ${url}`)
  }

  if (
    hostname.includes('127.0.0.1') ||
    hostname.includes('localhost') ||
    hostname.includes('0.0.0.0')
  ) {
    throw new Error(
      'VITE_SUPABASE_URL points at local Supabase. Put the cloud URL in `.env` (keep Mailpit in `.env.local`).',
    )
  }

  // https://<project-ref>.supabase.co
  const match = hostname.match(/^([a-z0-9]+)\.supabase\.co$/i)
  if (!match) {
    throw new Error(
      `Could not parse project ref from VITE_SUPABASE_URL host: ${hostname}`,
    )
  }

  return match[1]
}

const root = resolve(import.meta.dirname, '..')
const env = parseEnvFile(resolve(root, '.env'))
const projectRef = projectRefFromUrl(env.VITE_SUPABASE_URL)

console.log(`Linking Supabase CLI to project ref: ${projectRef}`)

const result = spawnSync(
  'npx',
  ['supabase', 'link', '--project-ref', projectRef, ...process.argv.slice(2)],
  {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  },
)

process.exit(result.status ?? 1)
