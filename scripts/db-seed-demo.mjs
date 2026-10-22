import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { buildDemoProcessEnv, requireKeys } from './env/load-env.mjs'
import { isDemoLocalSupabaseUrl, sqlStatements } from './env/local-supabase.mjs'

/**
 * Apply `supabase/seed.sql` to the Demo local stack only (:54331).
 * Never targets production, cloud, or the Regular local stack.
 * Idempotent if a wedding already exists.
 */

const root = resolve(import.meta.dirname, '..')
const workdir = resolve(root, 'demo-stack')

if (!existsSync(resolve(root, '.env.demo'))) {
  console.error('Missing .env.demo')
  process.exit(1)
}

const { env } = buildDemoProcessEnv(root, ['.env.demo'])
requireKeys(env, ['VITE_SUPABASE_URL'], 'Demo db:seed')

if (!isDemoLocalSupabaseUrl(env.VITE_SUPABASE_URL)) {
  throw new Error(
    'pnpm db:demo:seed only runs against Demo local Supabase (port 54331). ' +
      'Refusing cloud or Regular-stack URLs.',
  )
}

const seedPath = resolve(root, 'supabase/seed.sql')
const statements = sqlStatements(readFileSync(seedPath, 'utf8'))
if (statements.length === 0) {
  throw new Error('supabase/seed.sql has no SQL statements.')
}

console.log(
  `Seeding Demo local Supabase (${statements.length} statements) via --workdir demo-stack. ` +
    'Existing weddings are left unchanged (INSERT … WHERE NOT EXISTS).',
)

for (const [index, statement] of statements.entries()) {
  const result = spawnSync(
    'npx',
    ['supabase', 'db', 'query', '--workdir', workdir],
    {
      cwd: root,
      input: `${statement};`,
      stdio: ['pipe', 'inherit', 'inherit'],
      shell: process.platform === 'win32',
      env,
    },
  )
  if (result.status !== 0) {
    console.error(
      `Seed failed on statement ${index + 1} of ${statements.length}.`,
    )
    process.exit(result.status ?? 1)
  }
}

console.log('Demo seed complete (fictional sample wedding if none existed).')
