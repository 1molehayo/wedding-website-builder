/**
 * Local Supabase URL helpers for seed / reset scripts.
 * Regular stack API: :54321 — Demo stack API: :54331
 */

export function parseEnvFile(filePath, existsSync, readFileSync) {
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

function parseUrl(url) {
  if (!url?.trim()) return null
  try {
    return new URL(url.trim())
  } catch {
    return null
  }
}

function isLoopback(hostname) {
  return (
    hostname.includes('127.0.0.1') ||
    hostname.includes('localhost') ||
    hostname.includes('0.0.0.0')
  )
}

/** Regular local stack (default supabase start). */
export function isRegularLocalSupabaseUrl(url) {
  const u = parseUrl(url)
  return Boolean(u && isLoopback(u.hostname) && u.port === '54321')
}

/** Demo local stack (`--workdir demo-stack`). */
export function isDemoLocalSupabaseUrl(url) {
  const u = parseUrl(url)
  return Boolean(u && isLoopback(u.hostname) && u.port === '54331')
}

export function sqlStatements(sql) {
  return sql
    .replace(/^\s*--.*$/gm, '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
}
