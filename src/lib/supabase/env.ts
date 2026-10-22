/**
 * Env resolution for Vite / TanStack Start.
 *
 * Prefer `import.meta.env` first so `.env.local` correctly overrides `.env`
 * (local Mailpit vs cloud Supabase). Falling back to `process.env` second
 * avoids picking a stale cloud URL from the process environment.
 *
 * Some hosts (e.g. Vercel + Supabase integration) inject `SUPABASE_URL` /
 * `SUPABASE_PUBLISHABLE_KEY`. We accept those as server-side aliases only.
 * Browser bundles still need `VITE_*` set at build/runtime for the client.
 */
function readEnv(name: string): string | undefined {
  const metaEnv = import.meta.env as Record<string, string | undefined>
  if (metaEnv[name]) {
    return metaEnv[name]
  }

  if (typeof process !== 'undefined' && process.env[name]) {
    return process.env[name]
  }

  return undefined
}

export function getSupabaseUrl(): string {
  const value = readEnv('VITE_SUPABASE_URL') ?? readEnv('SUPABASE_URL')
  if (!value) {
    throw new Error('Missing VITE_SUPABASE_URL (or SUPABASE_URL on the server)')
  }
  return value
}

export function getSupabasePublishableKey(): string {
  const value =
    readEnv('VITE_SUPABASE_PUBLISHABLE_KEY') ??
    readEnv('SUPABASE_PUBLISHABLE_KEY')
  if (!value) {
    throw new Error(
      'Missing VITE_SUPABASE_PUBLISHABLE_KEY (or SUPABASE_PUBLISHABLE_KEY on the server)',
    )
  }
  return value
}

export function getSupabaseSecretKey(): string {
  // Prefer the secret key; fall back to legacy service_role JWT (still returned by `pnpm status`).
  const value =
    readEnv('SUPABASE_SECRET_KEY') ?? readEnv('SUPABASE_SERVICE_ROLE_KEY')
  if (!value) {
    throw new Error('Missing SUPABASE_SECRET_KEY')
  }
  return value
}

export function isLocalSupabase(): boolean {
  const url = readEnv('VITE_SUPABASE_URL')
  if (!url) return false
  return (
    url.includes('127.0.0.1') ||
    url.includes('localhost') ||
    url.includes('0.0.0.0')
  )
}

/**
 * Local Mailpit web UI. Supabase places it three ports above the API
 * (Regular 54321→54324, Demo 54331→54334).
 */
export function getLocalMailpitUrl(): string | null {
  if (!isLocalSupabase()) return null
  try {
    const parsed = new URL(getSupabaseUrl())
    const apiPort = Number(parsed.port || '54321')
    if (!Number.isFinite(apiPort)) return null
    return `${parsed.protocol}//${parsed.hostname}:${apiPort + 3}`
  } catch {
    return null
  }
}
