import { formatCoupleNames, PRODUCT_NAME } from '@/lib/constants'

/**
 * Admin OTP email subject from wedding state.
 * No wedding → product brand. Wedding present → couple names (not seed fiction).
 */
export function adminOtpEmailSubject(input: {
  groomName?: string | null
  brideName?: string | null
}): string {
  const groom = input.groomName?.trim() ?? ''
  const bride = input.brideName?.trim() ?? ''
  if (!groom || !bride) {
    return PRODUCT_NAME
  }
  return `${formatCoupleNames(groom, bride)} Wedding`
}
