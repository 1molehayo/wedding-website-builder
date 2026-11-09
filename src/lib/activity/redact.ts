/**
 * Prepares activity-log fields before they are stored.
 * "Redact" means remove or mask sensitive text in a record that people will read later.
 * This file does not talk to the database. activity.server.ts calls it, then inserts the row.
 */

/**
 * Allowed shape for activity_logs.action: area.verb
 * Examples: guest.invited, registry.contribution_received
 * Letters, digits, and underscores only, one dot in the middle.
 * Rejects sentences so the log stays filterable.
 */
const ACTION_PATTERN = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/

/**
 * Metadata keys that must not be stored at all.
 * Matched against the key name, not the value.
 * "token" drops confirm_token. "password" drops password.
 * Account numbers are handled first, below, and kept as the last four characters.
 */
const SENSITIVE_KEY =
  /token|secret|password|routing|cookie|authorization|account_number|accountnumber/i

export function assertActivityAction(action: string): string {
  if (action.length > 80 || !ACTION_PATTERN.test(action)) {
    throw new Error('Activity action must look like area.verb.')
  }
  return action
}

/** Last four characters only. A short value is fully hidden. */
export function maskAccountNumber(value: string): string {
  const compact = value.trim()
  if (compact.length <= 4) return '••••'
  return `••••${compact.slice(-4)}`
}

function isAccountNumberKey(key: string): boolean {
  const normalized = key.replace(/[_-]/g, '').toLowerCase()
  return normalized === 'accountnumber'
}

/**
 * Copy metadata into a safe shape for activity_logs.metadata.
 * Drops secret keys, masks account numbers, caps strings at 500 characters,
 * caps lists at 20 items, and stops walking nested objects after 4 levels.
 */
export function redactActivityMetadata(value: unknown, depth = 0): unknown {
  if (depth > 4) return null
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value.slice(0, 500)
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === 'boolean') return value
  if (Array.isArray(value)) {
    return value
      .slice(0, 20)
      .map((item) => redactActivityMetadata(item, depth + 1))
  }
  if (typeof value === 'object') {
    const output: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value)) {
      if (isAccountNumberKey(key)) {
        output[key] =
          typeof child === 'string' ? maskAccountNumber(child) : null
        continue
      }
      if (SENSITIVE_KEY.test(key)) continue
      output[key] = redactActivityMetadata(child, depth + 1)
    }
    return output
  }
  return null
}
