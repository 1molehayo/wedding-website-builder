import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import {
  isRegularLocalSupabaseUrl,
  parseEnvFile as parseEnv,
  sqlStatements,
} from './env/local-supabase.mjs'

/**
 * Apply `supabase/seed.sql` to the Regular local Supabase stack only (:54321).
 * Cloud is never seeded. Idempotent if a wedding already exists.
 */

function parseEnvFile(filePath) {
  return parseEnv(filePath, existsSync, readFileSync)
}

const root = resolve(import.meta.dirname, '..')
const env = {
  ...parseEnvFile(resolve(root, '.env')),
  ...parseEnvFile(resolve(root, '.env.local')),
}

if (!isRegularLocalSupabaseUrl(env.VITE_SUPABASE_URL)) {
  throw new Error(
    'pnpm db:seed only runs against the Regular local Supabase API (http://127.0.0.1:54321). ' +
      'Set VITE_SUPABASE_URL in .env.local from `pnpm status`. Cloud and Demo (:54331) are refused.',
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
  `Seeding Regular local Supabase from supabase/seed.sql (${statements.length} statements). ` +
    'Existing weddings are left unchanged (INSERT … WHERE NOT EXISTS).',
)

for (const [index, statement] of statements.entries()) {
  const result = spawnSync('npx', ['supabase', 'db', 'query', '--local'], {
    cwd: root,
    input: `${statement};`,
    stdio: ['pipe', 'inherit', 'inherit'],
    shell: process.platform === 'win32',
  })
  if (result.status !== 0) {
    console.error(
      `Seed failed on statement ${index + 1} of ${statements.length}.`,
    )
    process.exit(result.status ?? 1)
  }
}

console.log(
  'Regular local seed complete (fictional sample wedding if none existed).',
)
