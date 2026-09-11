import { createServerFn } from '@tanstack/react-start'
import type {
  FeedbackCategoryId,
  FeedbackStatus,
} from '@/lib/feedback/categories'
import type { ProductFeedbackRow } from '@/lib/feedback/feedback.server'

export type { ProductFeedbackRow }

export const submitProductFeedback = createServerFn({ method: 'POST' })
  .validator((data: {
    category: FeedbackCategoryId
    message: string
    pagePath?: string
  }) => ({
    category: data.category,
    message: data.message,
    pagePath: data.pagePath,
  }))
  .handler(async ({ data }) => {
    const { submitProductFeedbackHandler } = await import('./feedback.server')
    return submitProductFeedbackHandler(data)
  })

export const listProductFeedback = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { listProductFeedbackHandler } = await import('./feedback.server')
    return listProductFeedbackHandler()
  },
)

export const updateProductFeedbackStatus = createServerFn({ method: 'POST' })
  .validator((data: { feedbackId: string; status: FeedbackStatus }) => ({
    feedbackId: data.feedbackId,
    status: data.status,
  }))
  .handler(async ({ data }) => {
    const { updateProductFeedbackStatusHandler } = await import(
      './feedback.server'
    )
    return updateProductFeedbackStatusHandler(data)
  })
