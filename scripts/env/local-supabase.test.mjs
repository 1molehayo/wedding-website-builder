import { describe, expect, it } from 'vitest'
import {
  isDemoLocalSupabaseUrl,
  isRegularLocalSupabaseUrl,
  sqlStatements,
} from './local-supabase.mjs'

describe('local supabase URL guards', () => {
  it('accepts only Regular API port 54321', () => {
    expect(isRegularLocalSupabaseUrl('http://127.0.0.1:54321')).toBe(true)
    expect(isRegularLocalSupabaseUrl('http://127.0.0.1:54331')).toBe(false)
    expect(isRegularLocalSupabaseUrl('https://abc.supabase.co')).toBe(false)
  })

  it('accepts only Demo API port 54331', () => {
    expect(isDemoLocalSupabaseUrl('http://127.0.0.1:54331')).toBe(true)
    expect(isDemoLocalSupabaseUrl('http://127.0.0.1:54321')).toBe(false)
    expect(isDemoLocalSupabaseUrl('https://abc.supabase.co')).toBe(false)
  })
})

describe('sqlStatements', () => {
  it('strips comments and splits statements', () => {
    const sql = `
-- comment
insert into t values (1);
update t set x = 2;
`
    expect(sqlStatements(sql)).toEqual([
      'insert into t values (1)',
      'update t set x = 2',
    ])
  })
})
