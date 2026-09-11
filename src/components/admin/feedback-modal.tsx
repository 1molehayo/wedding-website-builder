import { useState } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'
import { FEEDBACK_CATEGORIES } from '@/lib/feedback/categories'
import type { FeedbackCategoryId } from '@/lib/feedback/categories'
import { submitProductFeedback } from '@/lib/feedback/feedback'

const MAX_LEN = 4000

export function FeedbackModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [category, setCategory] = useState<FeedbackCategoryId>('general')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const remaining = MAX_LEN - message.length

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      await submitProductFeedback({
        data: {
          category,
          message,
          pagePath: pathname,
        },
      })
      toast.success('Thanks. We received your feedback.')
      setMessage('')
      setCategory('general')
      onOpenChange(false)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Unable to send feedback.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Send feedback"
      description="Tell us what’s working, what isn’t, or what you’d like next. We read every note."
      size="lg"
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field>
          <Field.Label>Category</Field.Label>
          <Field.Control>
            <Select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as FeedbackCategoryId)
              }
            >
              {FEEDBACK_CATEGORIES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field.Control>
        </Field>

        <Field>
          <Field.Label>Feedback</Field.Label>
          <Field.Control>
            <Textarea
              rows={6}
              value={message}
              maxLength={MAX_LEN}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Share a bug, idea, or kind note…"
              required
            />
          </Field.Control>
          <p className="text-foreground-secondary mt-1 text-xs tabular-nums">
            {Math.max(0, remaining)} / {MAX_LEN}
          </p>
        </Field>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Send
          </Button>
        </div>
      </form>
    </Modal>
  )
}
