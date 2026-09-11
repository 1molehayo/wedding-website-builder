import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

/**
 * Apply `supabase/seed.sql` to local Supabase only.
 * Cloud is never seeded — production content comes from onboarding / admin.
 *
 * `supabase db query` can only run one statement at a time (prepared
 * statements), so the seed file is split and executed in order.
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

function isLocalSupabaseUrl(url) {
  if (!url) return false
  let hostname
  try {
    hostname = new URL(url).hostname
  } catch {
    return false
  }
  return (
    hostname.includes('127.0.0.1') ||
    hostname.includes('localhost') ||
    hostname.includes('0.0.0.0')
  )
}

function sqlStatements(sql) {
  return sql
    .replace(/^\s*--.*$/gm, '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
}

const root = resolve(import.meta.dirname, '..')
const env = {
  ...parseEnvFile(resolve(root, '.env')),
  ...parseEnvFile(resolve(root, '.env.local')),
}

if (!isLocalSupabaseUrl(env.VITE_SUPABASE_URL)) {
  throw new Error(
    'pnpm db:seed only runs against local Supabase. The app URL is not local. Cloud is never seeded.',
  )
}

const seedPath = resolve(root, 'supabase/seed.sql')
if (!existsSync(seedPath)) {
  throw new Error(`Missing seed file: ${seedPath}`)
}

const statements = sqlStatements(readFileSync(seedPath, 'utf8'))
if (statements.length === 0) {
  throw new Error('supabase/seed.sql has no SQL statements.')
}

console.log(
  `Seeding local Supabase from supabase/seed.sql (${statements.length} statements)`,
)

for (const [index, statement] of statements.entries()) {
  const result = spawnSync('npx', ['supabase', 'db', 'query', '--local'], {
    cwd: root,
    input: `${statement};`,
    stdio: ['pipe', 'inherit', 'inherit'],
    shell: process.platform === 'win32',
  })
  if (result.status !== 0) {
    console.error(`Seed failed on statement ${index + 1} of ${statements.length}.`)
    process.exit(result.status ?? 1)
  }
}

console.log('Local seed complete.')
