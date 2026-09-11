import { describe, expect, it } from 'vitest'
import { deriveAdminStatus } from '@/lib/auth/types'

describe('deriveAdminStatus', () => {
  it('marks cancelled invites', () => {
    expect(
      deriveAdminStatus({
        cancelled_at: '2026-01-01',
        deletion_requested_at: null,
        invite_accepted_at: null,
        last_sign_in_at: null,
      }),
    ).toBe('cancelled')
  })

  it('marks pending until accepted', () => {
    expect(
      deriveAdminStatus({
        cancelled_at: null,
        deletion_requested_at: null,
        invite_accepted_at: null,
        last_sign_in_at: null,
      }),
    ).toBe('pending')
  })

  it('marks active after accept', () => {
    expect(
      deriveAdminStatus({
        cancelled_at: null,
        deletion_requested_at: null,
        invite_accepted_at: '2026-01-02',
        last_sign_in_at: '2026-01-02',
      }),
    ).toBe('active')
  })
})
