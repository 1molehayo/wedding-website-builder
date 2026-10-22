import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Parse a dotenv-style file into a flat object. Does not print values.
 */
export function parseEnvFile(filePath) {
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

/** App credential keys that must never leak across environments. */
export const APP_ENV_KEYS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_URL',
  'SUPABASE_PUBLISHABLE_KEY',
  'PRODUCTION_SUPER_ADMIN_EMAIL',
  'APP_URL',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'EMAIL_DELIVERY_ENABLED',
  'GOOGLE_MAPS_API_KEY',
]

/**
 * Build a child process env for the Demo environment: strip known app keys
 * from the parent environment, then apply only the listed files (later wins).
 * Never reads `.env` or `.env.local`.
 */
export function buildDemoProcessEnv(root, fileNames) {
  const env = { ...process.env }
  for (const key of APP_ENV_KEYS) {
    delete env[key]
  }

  const loadedFrom = []
  for (const name of fileNames) {
    const path = resolve(root, name)
    if (!existsSync(path)) continue
    Object.assign(env, parseEnvFile(path))
    loadedFrom.push(name)
  }

  return { env, loadedFrom }
}

export function requireKeys(env, keys, label) {
  const missing = keys.filter((key) => !env[key]?.trim())
  if (missing.length === 0) return
  throw new Error(
    `${label} is missing required environment variables: ${missing.join(', ')}. ` +
      `Copy .env.demo.example to .env.demo and fill in demo values ` +
      `(from \`pnpm supabase:demo:status\` for local, or your demo Supabase project for cloud). ` +
      `Demo mode does not read .env or .env.local.`,
  )
}

export function summarizeEnv(env, keys) {
  return keys.map((key) => {
    const value = env[key]?.trim()
    if (!value) return `${key}=MISSING`
    if (key.includes('URL') || key === 'APP_URL') {
      try {
        const host = new URL(value).host
        return `${key}=SET(host=${host})`
      } catch {
        return `${key}=SET(invalid-url)`
      }
    }
    return `${key}=SET(len=${value.length})`
  })
}
