/**
 * Parse / verify Supabase project refs for Regular vs Demo cloud CLI ops.
 * Never logs secrets — refs are public identifiers in the project URL.
 */

export function isLoopbackHostname(hostname) {
  if (!hostname) return false
  return (
    hostname.includes('127.0.0.1') ||
    hostname.includes('localhost') ||
    hostname.includes('0.0.0.0')
  )
}

/** Extract `<ref>` from `https://<ref>.supabase.co`. Rejects local URLs. */
export function projectRefFromSupabaseUrl(url, label = 'VITE_SUPABASE_URL') {
  if (!url?.trim()) {
    throw new Error(`${label} is missing.`)
  }

  let hostname
  try {
    hostname = new URL(url.trim()).hostname
  } catch {
    throw new Error(`${label} is not a valid URL.`)
  }

  if (isLoopbackHostname(hostname)) {
    throw new Error(
      `${label} points at local Supabase. Use the Demo cloud project URL or set DEMO_SUPABASE_PROJECT_REF.`,
    )
  }

  const match = hostname.match(/^([a-z0-9]+)\.supabase\.co$/i)
  if (!match) {
    throw new Error(
      `Could not parse project ref from ${label} host: ${hostname}`,
    )
  }

  return match[1].toLowerCase()
}

/**
 * Accept a bare ref, API host URL, or dashboard project URL.
 * Examples:
 * - rqpnyubvfptmaaopkqik
 * - https://rqpnyubvfptmaaopkqik.supabase.co
 * - https://supabase.com/dashboard/project/rqpnyubvfptmaaopkqik
 */
export function normalizeProjectRef(ref, label = 'project ref') {
  const value = ref?.trim() ?? ''
  if (!value) {
    throw new Error(`${label} is empty.`)
  }

  if (/^[a-z0-9]+$/i.test(value)) {
    return value.toLowerCase()
  }

  const dashboard = value.match(
    /supabase\.com\/dashboard\/project\/([a-z0-9]+)/i,
  )
  if (dashboard) {
    return dashboard[1].toLowerCase()
  }

  try {
    return projectRefFromSupabaseUrl(value, label)
  } catch {
    throw new Error(
      `${label} must be a project ref or Supabase URL ` +
        `(e.g. abcdefghijklmnop or https://supabase.com/dashboard/project/abcdefghijklmnop).`,
    )
  }
}

/**
 * Demo cloud target from `.env.demo`:
 * 1) DEMO_SUPABASE_PROJECT_REF (preferred when VITE_* stays on local :54331)
 * 2) else cloud VITE_SUPABASE_URL host
 */
export function resolveDemoCloudProjectRef(env) {
  const explicit = env.DEMO_SUPABASE_PROJECT_REF?.trim()
  if (explicit) {
    return normalizeProjectRef(explicit, 'DEMO_SUPABASE_PROJECT_REF')
  }
  return projectRefFromSupabaseUrl(
    env.VITE_SUPABASE_URL,
    'VITE_SUPABASE_URL (.env.demo)',
  )
}

/** Best-effort Regular cloud ref from `.env` (ignored if missing/local). */
export function tryRegularCloudProjectRef(env) {
  const url = env.VITE_SUPABASE_URL?.trim()
  if (!url) return null
  try {
    return projectRefFromSupabaseUrl(url, 'VITE_SUPABASE_URL (.env)')
  } catch {
    return null
  }
}

export function assertDemoRefDistinctFromRegular(demoRef, regularRef) {
  if (regularRef && demoRef === regularRef) {
    throw new Error(
      `Demo project ref (${demoRef}) matches the Regular cloud project in .env. ` +
        'Use a separate Demo Supabase project — refusing to link/push.',
    )
  }
}

/** Read CLI link state written under `<workdir>/supabase/.temp/project-ref`. */
export function readLinkedProjectRef(tempDir, existsSync, readFileSync) {
  const filePath = `${tempDir}/project-ref`
  if (!existsSync(filePath)) return null
  const raw = readFileSync(filePath, 'utf8').trim()
  if (!raw) return null
  return normalizeProjectRef(raw, 'linked project-ref')
}

/** Reject seed / wrong-target flags on Demo cloud push. */
export function assertSafeDemoPushArgs(argv) {
  const forbidden = ['--include-seed', '--local', '--db-url']
  for (const flag of forbidden) {
    if (argv.includes(flag)) {
      throw new Error(
        `Refusing ${flag} on Demo cloud push. Use pnpm db:demo:seed only for local Demo, never cloud seed.`,
      )
    }
  }
}
