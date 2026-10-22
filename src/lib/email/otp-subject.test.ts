import { describe, expect, it } from 'vitest'
import { PRODUCT_NAME } from '@/lib/constants'
import { adminOtpEmailSubject } from '@/lib/email/otp-subject'

describe('adminOtpEmailSubject', () => {
  it('uses product name when no wedding names exist', () => {
    expect(adminOtpEmailSubject({})).toBe(PRODUCT_NAME)
    expect(adminOtpEmailSubject({ groomName: '', brideName: '' })).toBe(
      PRODUCT_NAME,
    )
    expect(adminOtpEmailSubject({ groomName: 'Theo', brideName: '' })).toBe(
      PRODUCT_NAME,
    )
  })

  it('uses couple names when both are set', () => {
    expect(adminOtpEmailSubject({ groomName: 'Theo', brideName: 'Ada' })).toBe(
      'Theo & Ada Wedding',
    )
    expect(
      adminOtpEmailSubject({ groomName: '  Kemi ', brideName: ' Tunde ' }),
    ).toBe('Kemi & Tunde Wedding')
  })
})
