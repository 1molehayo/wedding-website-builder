export const FEEDBACK_CATEGORIES = [
  { id: 'general', label: 'General' },
  { id: 'bug', label: 'Bug / issue' },
  { id: 'idea', label: 'Idea / suggestion' },
  { id: 'currency', label: 'Add a currency' },
  { id: 'praise', label: 'Praise' },
] as const

export type FeedbackCategoryId = (typeof FEEDBACK_CATEGORIES)[number]['id']

export const FEEDBACK_STATUSES = [
  'new',
  'planned',
  'done',
  'dismissed',
] as const

export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number]

export function feedbackCategoryLabel(id: string): string {
  return FEEDBACK_CATEGORIES.find((item) => item.id === id)?.label ?? id
}

export function feedbackStatusLabel(status: FeedbackStatus): string {
  switch (status) {
    case 'new':
      return 'New'
    case 'planned':
      return 'Planned'
    case 'done':
      return 'Done'
    case 'dismissed':
      return 'Dismissed'
  }
}
