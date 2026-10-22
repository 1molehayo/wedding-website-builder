import { afterEach, describe, expect, it } from 'vitest'
import {
  LOCAL_ADMIN_EMAIL,
  LOCAL_SUPER_ADMIN_EMAIL,
  getLocalBootstrapRole,
  getProductionSuperAdminEmail,
  getSuperAdminEmail,
  isLocalAllowedEmail,
  isReservedSuperAdminEmail,
  isSuperAdminEmail,
  isSuperAdminProfile,
  normalizeAdminEmail,
} from './roles'

const DEMO_PRODUCTION_SUPER_ADMIN = 'owner@example.com'

describe('admin roles', () => {
  afterEach(() => {
    delete process.env.PRODUCTION_SUPER_ADMIN_EMAIL
  })

  it('resolves super admin email by environment', () => {
    process.env.PRODUCTION_SUPER_ADMIN_EMAIL = DEMO_PRODUCTION_SUPER_ADMIN
    expect(getProductionSuperAdminEmail()).toBe(DEMO_PRODUCTION_SUPER_ADMIN)
    expect(getSuperAdminEmail(false)).toBe(DEMO_PRODUCTION_SUPER_ADMIN)
    expect(getSuperAdminEmail(true)).toBe(LOCAL_SUPER_ADMIN_EMAIL)
    expect(isSuperAdminEmail(DEMO_PRODUCTION_SUPER_ADMIN, false)).toBe(true)
    expect(isSuperAdminEmail(LOCAL_SUPER_ADMIN_EMAIL, true)).toBe(true)
    expect(isSuperAdminEmail(DEMO_PRODUCTION_SUPER_ADMIN, true)).toBe(false)
    expect(isSuperAdminEmail(null)).toBe(false)
  })

  it('requires PRODUCTION_SUPER_ADMIN_EMAIL for non-local resolution', () => {
    expect(() => getProductionSuperAdminEmail()).toThrow(
      /Missing PRODUCTION_SUPER_ADMIN_EMAIL/,
    )
    expect(() => getSuperAdminEmail(false)).toThrow(
      /Missing PRODUCTION_SUPER_ADMIN_EMAIL/,
    )
  })

  it('whitelists only the two local test emails', () => {
    process.env.PRODUCTION_SUPER_ADMIN_EMAIL = DEMO_PRODUCTION_SUPER_ADMIN
    expect(isLocalAllowedEmail(LOCAL_SUPER_ADMIN_EMAIL)).toBe(true)
    expect(isLocalAllowedEmail(LOCAL_ADMIN_EMAIL)).toBe(true)
    expect(isLocalAllowedEmail(DEMO_PRODUCTION_SUPER_ADMIN)).toBe(false)
    expect(isLocalAllowedEmail('other@example.com')).toBe(false)
  })

  it('bootstraps local roles for the designated test emails', () => {
    expect(getLocalBootstrapRole(LOCAL_SUPER_ADMIN_EMAIL)).toBe('super_admin')
    expect(getLocalBootstrapRole(LOCAL_ADMIN_EMAIL)).toBe('admin')
    expect(getLocalBootstrapRole('other@example.com')).toBeNull()
  })

  it('protects both reserved super admin addresses', () => {
    process.env.PRODUCTION_SUPER_ADMIN_EMAIL = DEMO_PRODUCTION_SUPER_ADMIN
    expect(isReservedSuperAdminEmail(DEMO_PRODUCTION_SUPER_ADMIN)).toBe(true)
    expect(isReservedSuperAdminEmail(LOCAL_SUPER_ADMIN_EMAIL)).toBe(true)
    expect(isReservedSuperAdminEmail(LOCAL_ADMIN_EMAIL)).toBe(false)
  })

  it('does not reserve a production email when env is unset', () => {
    expect(isReservedSuperAdminEmail('owner@example.com')).toBe(false)
    expect(isReservedSuperAdminEmail(LOCAL_SUPER_ADMIN_EMAIL)).toBe(true)
  })

  it('normalizes emails for comparison', () => {
    expect(normalizeAdminEmail('  Ada@Example.COM ')).toBe('ada@example.com')
  })

  it('treats profile role as the source of truth after bootstrap', () => {
    expect(isSuperAdminProfile({ role: 'super_admin' })).toBe(true)
    expect(isSuperAdminProfile({ role: 'admin' })).toBe(false)
  })
})
