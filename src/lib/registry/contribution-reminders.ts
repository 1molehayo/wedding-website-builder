/** One day between reminder emails (“on different days”). */
export const REMINDER_INTERVAL_MS = 24 * 60 * 60 * 1000

export const MAX_CONTRIBUTION_REMINDERS = 3

export type ReminderCandidate = {
  contributionId: string
  reminderCount: number
  lastReminderAt: string | null
  contributionCreatedAt: string
  appliedAt: string | null
}

/**
 * A bank transfer is due a reminder when the guest has not confirmed,
 * fewer than three reminders have gone out, and at least one day has
 * passed since the start (or since the last reminder).
 */
export function isContributionReminderDue(
  candidate: ReminderCandidate,
  now: Date = new Date(),
): boolean {
  if (candidate.appliedAt != null) return false
  if (candidate.reminderCount >= MAX_CONTRIBUTION_REMINDERS) return false
  if (candidate.reminderCount < 0) return false

  const anchorIso = candidate.lastReminderAt ?? candidate.contributionCreatedAt
  const anchorMs = Date.parse(anchorIso)
  if (!Number.isFinite(anchorMs)) return false

  return now.getTime() - anchorMs >= REMINDER_INTERVAL_MS
}

export function nextReminderNumber(reminderCount: number): number {
  return reminderCount + 1
}
