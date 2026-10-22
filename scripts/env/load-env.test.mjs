import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it, afterEach } from 'vitest'
import {
  APP_ENV_KEYS,
  buildDemoProcessEnv,
  parseEnvFile,
  requireKeys,
} from './load-env.mjs'

const dirs = []

afterEach(() => {
  while (dirs.length) {
    rmSync(dirs.pop(), { recursive: true, force: true })
  }
})

describe('demo env isolation', () => {
  it('does not keep parent app credentials when building demo env', () => {
    const dir = mkdtempSync(join(tmpdir(), 'demo-env-'))
    dirs.push(dir)
    writeFileSync(
      join(dir, '.env.demo'),
      [
        'VITE_SUPABASE_URL=http://127.0.0.1:54331',
        'VITE_SUPABASE_PUBLISHABLE_KEY=demo-publishable',
        'SUPABASE_SECRET_KEY=demo-secret',
      ].join('\n'),
    )

    const previous = {}
    for (const key of APP_ENV_KEYS) {
      previous[key] = process.env[key]
      process.env[key] = `LEAKED_${key}`
    }

    try {
      const { env, loadedFrom } = buildDemoProcessEnv(dir, ['.env.demo'])
      expect(loadedFrom).toEqual(['.env.demo'])
      expect(env.VITE_SUPABASE_URL).toBe('http://127.0.0.1:54331')
      expect(env.VITE_SUPABASE_PUBLISHABLE_KEY).toBe('demo-publishable')
      expect(env.SUPABASE_SECRET_KEY).toBe('demo-secret')
      expect(env.VITE_SUPABASE_URL).not.toContain('LEAKED')
      expect(env.RESEND_API_KEY).toBeUndefined()
    } finally {
      for (const key of APP_ENV_KEYS) {
        if (previous[key] === undefined) delete process.env[key]
        else process.env[key] = previous[key]
      }
    }
  })

  it('requireKeys fails clearly when demo secrets are missing', () => {
    expect(() => requireKeys({}, ['VITE_SUPABASE_URL'], 'Demo')).toThrow(
      /does not read \.env/,
    )
  })

  it('parseEnvFile ignores comments and empty lines', () => {
    const dir = mkdtempSync(join(tmpdir(), 'parse-env-'))
    dirs.push(dir)
    const path = join(dir, '.env')
    writeFileSync(path, '# comment\n\nFOO=bar\n')
    expect(parseEnvFile(path)).toEqual({ FOO: 'bar' })
  })
})
