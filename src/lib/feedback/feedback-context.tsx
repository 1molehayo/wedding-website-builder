import { createContext, useContext } from 'react'
import type { FeedbackCategoryId } from '@/lib/feedback/categories'

export type FeedbackOpenDefaults = {
  category?: FeedbackCategoryId
  message?: string
}

type FeedbackContextValue = {
  openFeedback: (defaults?: FeedbackOpenDefaults) => void
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null)

export function FeedbackProvider({
  value,
  children,
}: {
  value: FeedbackContextValue
  children: React.ReactNode
}) {
  return (
    <FeedbackContext.Provider value={value}>
      {children}
    </FeedbackContext.Provider>
  )
}

export function useOpenFeedback(): FeedbackContextValue['openFeedback'] {
  const context = useContext(FeedbackContext)
  if (!context) {
    return () => {
      // Outside admin shell (e.g. tests) — no-op.
    }
  }
  return context.openFeedback
}
