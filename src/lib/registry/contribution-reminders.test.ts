import { describe, expect, it } from 'vitest'
import {
  MAX_CONTRIBUTION_REMINDERS,
  REMINDER_INTERVAL_MS,
  isContributionReminderDue,
  nextReminderNumber,
} from './contribution-reminders'

const base = {
  contributionId: 'c1',
  reminderCount: 0,
  lastReminderAt: null,
  contributionCreatedAt: '2026-11-07T12:00:00.000Z',
  appliedAt: null,
}

describe('isContributionReminderDue', () => {
  it('is due one day after the contribution starts', () => {
    const now = new Date('2026-11-08T12:00:00.000Z')
    expect(isContributionReminderDue(base, now)).toBe(true)
  })

  it('is not due before a full day has passed', () => {
    const now = new Date(
      Date.parse(base.contributionCreatedAt) + REMINDER_INTERVAL_MS - 1,
    )
    expect(isContributionReminderDue(base, now)).toBe(false)
  })

  it('stops after the guest confirms', () => {
    const now = new Date('2026-11-10T12:00:00.000Z')
    expect(
      isContributionReminderDue(
        { ...base, appliedAt: '2026-11-08T09:00:00.000Z' },
        now,
      ),
    ).toBe(false)
  })

  it('stops after three reminders', () => {
    const now = new Date('2026-11-20T12:00:00.000Z')
    expect(
      isContributionReminderDue(
        {
          ...base,
          reminderCount: MAX_CONTRIBUTION_REMINDERS,
          lastReminderAt: '2026-11-10T12:00:00.000Z',
        },
        now,
      ),
    ).toBe(false)
  })

  it('waits a day after the last reminder', () => {
    const lastReminderAt = '2026-11-08T12:00:00.000Z'
    const almost = new Date(Date.parse(lastReminderAt) + REMINDER_INTERVAL_MS - 1)
    const ready = new Date(Date.parse(lastReminderAt) + REMINDER_INTERVAL_MS)

    expect(
      isContributionReminderDue(
        { ...base, reminderCount: 1, lastReminderAt },
        almost,
      ),
    ).toBe(false)
    expect(
      isContributionReminderDue(
        { ...base, reminderCount: 1, lastReminderAt },
        ready,
      ),
    ).toBe(true)
  })
})

describe('nextReminderNumber', () => {
  it('is one higher than the stored count', () => {
    expect(nextReminderNumber(0)).toBe(1)
    expect(nextReminderNumber(2)).toBe(3)
  })
})
