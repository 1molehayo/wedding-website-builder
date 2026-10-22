import { resolve } from 'node:path'
import {
  buildDemoProcessEnv,
  parseEnvFile,
  requireKeys,
  summarizeEnv,
} from './env/load-env.mjs'

const root = resolve(import.meta.dirname, '..')
const target = process.argv[2] || 'regular'

const KEYS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
  'PRODUCTION_SUPER_ADMIN_EMAIL',
  'APP_URL',
  'EMAIL_DELIVERY_ENABLED',
]

if (target === 'demo') {
  const { env, loadedFrom } = buildDemoProcessEnv(root, ['.env.demo'])
  console.info('Environment: demo (isolated; .env.demo only)')
  console.info('Files:', loadedFrom.join(', ') || '(none found)')
  console.info(summarizeEnv(env, KEYS).join('\n'))
  try {
    requireKeys(
      env,
      [
        'VITE_SUPABASE_URL',
        'VITE_SUPABASE_PUBLISHABLE_KEY',
        'SUPABASE_SECRET_KEY',
      ],
      'Demo',
    )
    console.info('Required keys: OK')
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
} else {
  // Regular: mirror Vite priority (.env then .env.local) for inspection only.
  // Intended day-to-day file is `.env.local`; `.env` is still loaded by Vite today.
  const env = {
    ...parseEnvFile(resolve(root, '.env')),
    ...parseEnvFile(resolve(root, '.env.local')),
  }
  console.info('Environment: regular (Vite loads .env then .env.local)')
  console.info(summarizeEnv(env, KEYS).join('\n'))
}
