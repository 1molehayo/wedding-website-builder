import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { buildDemoProcessEnv, requireKeys } from './env/load-env.mjs'
import { parseEnvFile } from './env/local-supabase.mjs'
import {
  assertDemoRefDistinctFromRegular,
  resolveDemoCloudProjectRef,
  tryRegularCloudProjectRef,
} from './env/supabase-project-ref.mjs'

/**
 * Link the Supabase CLI to the **Demo cloud** project only.
 * - Reads `.env.demo` only (never `.env` / `.env.local`)
 * - Always uses `--workdir demo-stack` (isolated from Regular)
 * - Target ref: `DEMO_SUPABASE_PROJECT_REF` or cloud `VITE_SUPABASE_URL`
 */

const root = resolve(import.meta.dirname, '..')
const workdir = resolve(root, 'demo-stack')

if (!existsSync(resolve(root, '.env.demo'))) {
  console.error('Missing .env.demo — refuse to link (would not use .env).')
  process.exit(1)
}

if (!existsSync(resolve(workdir, 'supabase', 'config.toml'))) {
  console.error('Missing demo-stack/supabase/config.toml')
  process.exit(1)
}

const { env } = buildDemoProcessEnv(root, ['.env.demo'])
requireKeys(env, ['VITE_SUPABASE_URL'], 'Demo db:link')

const projectRef = resolveDemoCloudProjectRef(env)
const regularEnv = parseEnvFile(
  resolve(root, '.env'),
  existsSync,
  readFileSync,
)
assertDemoRefDistinctFromRegular(
  projectRef,
  tryRegularCloudProjectRef(regularEnv),
)

console.log(
  `Linking Demo stack (--workdir demo-stack) to cloud project ref: ${projectRef}`,
)

if (!env.SUPABASE_ACCESS_TOKEN?.trim()) {
  console.info(
    'Tip: cloud link needs a personal access token. Run `npx supabase login` once, ' +
      'or set SUPABASE_ACCESS_TOKEN in the shell (not in committed files).',
  )
}

const result = spawnSync(
  'npx',
  [
    'supabase',
    'link',
    '--workdir',
    workdir,
    '--project-ref',
    projectRef,
    ...process.argv.slice(2),
  ],
  {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env,
  },
)

if ((result.status ?? 1) !== 0) {
  console.error(
    'Demo link failed. If the CLI said “Access token not provided”, run:\n' +
      '  npx supabase login\n' +
      'then retry `pnpm db:demo:link`.',
  )
}

process.exit(result.status ?? 1)
