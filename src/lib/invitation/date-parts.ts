export type InvitationDateParts = {
  weekday: string | null
  month: string | null
  day: string | null
  year: string | null
  label: string
}

const ANNOUNCED: InvitationDateParts = {
  weekday: null,
  month: null,
  day: null,
  year: null,
  label: 'Date to be announced',
}

/** Split a stored wedding date into the pieces a card can set in columns. */
export function invitationDateParts(
  isoDate: string | null | undefined,
): InvitationDateParts {
  const trimmed = isoDate?.trim() ?? ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return ANNOUNCED

  const date = new Date(`${trimmed}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ANNOUNCED

  return {
    weekday: date.toLocaleDateString('en-US', { weekday: 'long' }),
    month: date.toLocaleDateString('en-US', { month: 'long' }),
    day: String(date.getDate()),
    year: String(date.getFullYear()),
    label: date.toLocaleDateString('en-US', { dateStyle: 'long' }),
  }
}
