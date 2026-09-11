import { useState } from 'react'
import { HeartIcon } from '@phosphor-icons/react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'
import { DONATE_URL, PRODUCT_NAME } from '@/lib/constants'
import { submitDonationThanks } from '@/lib/donations/donations'

export function DonateModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [donorName, setDonorName] = useState('')
  const [donorEmail, setDonorEmail] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetThanksForm = () => {
    setDonorName('')
    setDonorEmail('')
    setMessage('')
  }

  const onThanksSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      await submitDonationThanks({
        data: { donorName, donorEmail, message },
      })
      toast.success('Thank you. We received your note.')
      resetThanksForm()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Unable to save your note.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) resetThanksForm()
      }}
      title="Donate"
      description={`${PRODUCT_NAME} is free in v1, with no ads. A donation goes toward development and hosting.`}
      size="lg"
    >
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="text-sm leading-relaxed">
            Every contribution helps. Use PayPal when you are ready.
          </p>
          <Button asChild size="md">
            <a href={DONATE_URL} target="_blank" rel="noopener noreferrer">
              <HeartIcon weight="fill" />
              Open PayPal
            </a>
          </Button>
        </div>

        <div className="border-border space-y-3 border-t pt-5">
          <div>
            <p className="text-sm font-medium">Already donated?</p>
            <p className="text-foreground-secondary mt-1 text-sm">
              Optional. Leave your details so we can thank you.
            </p>
          </div>

          <form className="space-y-3" onSubmit={onThanksSubmit}>
            <Field>
              <Field.Label>Name</Field.Label>
              <Field.Control>
                <Input
                  value={donorName}
                  onChange={(event) => setDonorName(event.target.value)}
                  required
                  autoComplete="name"
                />
              </Field.Control>
            </Field>
            <Field>
              <Field.Label>Email</Field.Label>
              <Field.Control>
                <Input
                  type="email"
                  value={donorEmail}
                  onChange={(event) => setDonorEmail(event.target.value)}
                  required
                  autoComplete="email"
                />
              </Field.Control>
            </Field>
            <Field>
              <Field.Label>Message</Field.Label>
              <Field.Control>
                <Textarea
                  rows={3}
                  value={message}
                  maxLength={1000}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Optional note"
                />
              </Field.Control>
            </Field>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              <Button type="submit" variant="outline" isLoading={isSubmitting}>
                Send thank-you note
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  )
}
