import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { buildDemoProcessEnv, requireKeys } from './env/load-env.mjs'
import { parseEnvFile } from './env/local-supabase.mjs'
import {
  assertDemoRefDistinctFromRegular,
  assertSafeDemoPushArgs,
  readLinkedProjectRef,
  resolveDemoCloudProjectRef,
  tryRegularCloudProjectRef,
} from './env/supabase-project-ref.mjs'

/**
 * Push migrations to the **Demo cloud** database only.
 * - `.env.demo` only; `--workdir demo-stack` always
 * - Verifies expected project ref before push
 * - Supports `--dry-run` (and other safe supabase db push flags)
 * - Never includes seed data (cloud stays empty until onboarding)
 *
 * Usage:
 *   pnpm db:demo:push --dry-run
 *   pnpm db:demo:push -- --dry-run
 *   pnpm db:demo:push
 */

const root = resolve(import.meta.dirname, '..')
const workdir = resolve(root, 'demo-stack')
const tempDir = resolve(workdir, 'supabase', '.temp')
// pnpm may forward a literal `--` (`pnpm db:demo:push -- --dry-run`); strip it
// so Supabase does not treat later flags as positional args.
const extraArgs = process.argv.slice(2).filter((arg) => arg !== '--')

if (!existsSync(resolve(root, '.env.demo'))) {
  console.error('Missing .env.demo — refuse to push (would not use .env).')
  process.exit(1)
}

assertSafeDemoPushArgs(extraArgs)

const { env } = buildDemoProcessEnv(root, ['.env.demo'])
requireKeys(env, ['VITE_SUPABASE_URL'], 'Demo db:push')

const expectedRef = resolveDemoCloudProjectRef(env)
const regularEnv = parseEnvFile(
  resolve(root, '.env'),
  existsSync,
  readFileSync,
)
assertDemoRefDistinctFromRegular(
  expectedRef,
  tryRegularCloudProjectRef(regularEnv),
)

const dryRun = extraArgs.includes('--dry-run')

function linkDemo() {
  console.log(
    `Ensuring Demo CLI link (--workdir demo-stack) → project ref ${expectedRef}`,
  )
  const link = spawnSync(
    'npx',
    [
      'supabase',
      'link',
      '--workdir',
      workdir,
      '--project-ref',
      expectedRef,
    ],
    {
      cwd: root,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env,
    },
  )
  if (link.status !== 0) {
    process.exit(link.status ?? 1)
  }
}

const linkedRef = readLinkedProjectRef(tempDir, existsSync, readFileSync)
if (linkedRef !== expectedRef) {
  if (linkedRef) {
    console.warn(
      `Linked Demo ref (${linkedRef}) ≠ expected (${expectedRef}); re-linking.`,
    )
  }
  linkDemo()
}

const verifiedRef = readLinkedProjectRef(tempDir, existsSync, readFileSync)
if (verifiedRef && verifiedRef !== expectedRef) {
  console.error(
    `After link, Demo workdir still points at ${verifiedRef}, expected ${expectedRef}. Aborting.`,
  )
  process.exit(1)
}

console.log(
  dryRun
    ? `Dry-run: listing migrations that would apply to Demo cloud (${expectedRef}) via --workdir demo-stack (no seed).`
    : `Pushing migrations to Demo cloud (${expectedRef}) via --workdir demo-stack (migrations only; no seed → zero weddings until onboarding).`,
)

const pushArgs = [
  'supabase',
  'db',
  'push',
  '--workdir',
  workdir,
  '--linked',
  ...extraArgs,
]

const result = spawnSync('npx', pushArgs, {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env,
})

process.exit(result.status ?? 1)
