import { describe, expect, it } from 'vitest'
import {
  assertDemoRefDistinctFromRegular,
  assertSafeDemoPushArgs,
  normalizeProjectRef,
  projectRefFromSupabaseUrl,
  readLinkedProjectRef,
  resolveDemoCloudProjectRef,
  tryRegularCloudProjectRef,
} from './supabase-project-ref.mjs'

describe('projectRefFromSupabaseUrl', () => {
  it('parses cloud hosts', () => {
    expect(
      projectRefFromSupabaseUrl('https://abcdefghijklmnop.supabase.co'),
    ).toBe('abcdefghijklmnop')
  })

  it('rejects local URLs', () => {
    expect(() =>
      projectRefFromSupabaseUrl('http://127.0.0.1:54331'),
    ).toThrow(/local Supabase/)
  })
})

describe('normalizeProjectRef', () => {
  it('accepts bare refs, API URLs, and dashboard URLs', () => {
    expect(normalizeProjectRef('AbCdEfGh')).toBe('abcdefgh')
    expect(
      normalizeProjectRef('https://abcdefghijklmnop.supabase.co'),
    ).toBe('abcdefghijklmnop')
    expect(
      normalizeProjectRef(
        'https://supabase.com/dashboard/project/rqpnyubvfptmaaopkqik',
      ),
    ).toBe('rqpnyubvfptmaaopkqik')
    expect(
      normalizeProjectRef(
        'https://supabase.com/dashboard/project/rqpnyubvfptmaaopkqik/settings/general',
      ),
    ).toBe('rqpnyubvfptmaaopkqik')
  })
})

describe('resolveDemoCloudProjectRef', () => {
  it('prefers DEMO_SUPABASE_PROJECT_REF over local VITE URL', () => {
    expect(
      resolveDemoCloudProjectRef({
        DEMO_SUPABASE_PROJECT_REF: 'DemoCloudRef123',
        VITE_SUPABASE_URL: 'http://127.0.0.1:54331',
      }),
    ).toBe('democloudref123')
  })

  it('accepts a dashboard URL in DEMO_SUPABASE_PROJECT_REF', () => {
    expect(
      resolveDemoCloudProjectRef({
        DEMO_SUPABASE_PROJECT_REF:
          'https://supabase.com/dashboard/project/rqpnyubvfptmaaopkqik',
        VITE_SUPABASE_URL: 'http://127.0.0.1:54331',
      }),
    ).toBe('rqpnyubvfptmaaopkqik')
  })

  it('falls back to cloud VITE_SUPABASE_URL', () => {
    expect(
      resolveDemoCloudProjectRef({
        VITE_SUPABASE_URL: 'https://demoprojectref.supabase.co',
      }),
    ).toBe('demoprojectref')
  })

  it('errors when only local URL is set', () => {
    expect(() =>
      resolveDemoCloudProjectRef({
        VITE_SUPABASE_URL: 'http://127.0.0.1:54331',
      }),
    ).toThrow(/DEMO_SUPABASE_PROJECT_REF/)
  })
})

describe('assertDemoRefDistinctFromRegular', () => {
  it('blocks identical Regular and Demo refs', () => {
    expect(() =>
      assertDemoRefDistinctFromRegular('sameproject', 'sameproject'),
    ).toThrow(/matches the Regular/)
  })

  it('allows distinct refs', () => {
    expect(() =>
      assertDemoRefDistinctFromRegular('demoref', 'regularref'),
    ).not.toThrow()
  })
})

describe('assertSafeDemoPushArgs', () => {
  it('rejects seed and local-target flags', () => {
    expect(() => assertSafeDemoPushArgs(['--include-seed'])).toThrow(
      /include-seed/,
    )
    expect(() => assertSafeDemoPushArgs(['--local'])).toThrow(/--local/)
  })

  it('allows dry-run', () => {
    expect(() => assertSafeDemoPushArgs(['--dry-run'])).not.toThrow()
  })
})

describe('readLinkedProjectRef', () => {
  it('reads normalized ref from temp file', () => {
    const ref = readLinkedProjectRef(
      '/tmp/fake',
      () => true,
      () => 'AbCdEfGh\n',
    )
    expect(ref).toBe('abcdefgh')
    expect(normalizeProjectRef('XyZ')).toBe('xyz')
  })

  it('returns null when missing', () => {
    expect(
      readLinkedProjectRef('/tmp/fake', () => false, () => ''),
    ).toBeNull()
  })
})

describe('tryRegularCloudProjectRef', () => {
  it('returns null for local Regular env', () => {
    expect(
      tryRegularCloudProjectRef({
        VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      }),
    ).toBeNull()
  })
})
