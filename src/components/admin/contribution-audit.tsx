import { useForm } from '@tanstack/react-form'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'
import { fieldErrorMessage } from '@/lib/forms/field-error'
import { zodFormFieldErrors } from '@/lib/forms/zod-form-errors'
import {
  CONTRIBUTION_STATUS_LABELS,
  updateContributionAmountSchema,
} from '@/lib/registry/contribution-schema'
import {
  setContributionStatus,
  updateContributionAmount,
} from '@/lib/registry/registry'
import type { AdminContribution } from '@/lib/registry/registry'
import { renderRegistryThankYouTemplate } from '@/lib/registry/thank-you-template'
import type { RegistryContributionStatus } from '@/lib/supabase/types'

function formatWhen(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function guestConfirmLabel(row: AdminContribution) {
  if (row.channel !== 'bank_transfer') return null
  if (row.applied_at) return `Guest confirmed · ${formatWhen(row.applied_at)}`
  return 'Awaiting guest confirm'
}

function whatsappFollowUpUrl(row: AdminContribution) {
  if (!row.payer_phone) return null
  const digits = row.payer_phone.replace(/\D/g, '')
  if (digits.length < 8) return null
  const amount = `${row.amount} ${row.currency}`
  const gift = row.gift_title ? ` toward ${row.gift_title}` : ''
  const reference = row.bank?.reference
    ? ` Reference ${row.bank.reference}.`
    : ''
  const message = [
    `Hi ${row.payer_name},`,
    '',
    `We’re checking on the ${amount} transfer${gift}.${reference}`,
    'Could you confirm whether it was sent?',
  ].join('\n')
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

function mailtoFollowUpUrl(row: AdminContribution) {
  const amount = `${row.amount} ${row.currency}`
  const gift = row.gift_title ? ` toward ${row.gift_title}` : ''
  const reference = row.bank?.reference ? ` (ref ${row.bank.reference})` : ''
  const subject = encodeURIComponent(`About your ${amount} gift${gift}`)
  const body = encodeURIComponent(
    [
      `Hi ${row.payer_name},`,
      '',
      `We’re checking on the ${amount} transfer${gift}${reference}.`,
      'Could you confirm whether it was sent?',
      '',
      'Thank you.',
    ].join('\n'),
  )
  return `mailto:${encodeURIComponent(row.payer_email)}?subject=${subject}&body=${body}`
}

type ContributionAuditDrawerProps = {
  contribution: AdminContribution
  thankYouTemplate: string
  coupleLabel: string
  onClose: () => void
  onSaved: (row: AdminContribution) => void | Promise<void>
}

export function ContributionAuditDrawer({
  contribution,
  thankYouTemplate,
  coupleLabel,
  onClose,
  onSaved,
}: ContributionAuditDrawerProps) {
  const [statusBusy, setStatusBusy] =
    useState<RegistryContributionStatus | null>(null)
  const [thankYouOpen, setThankYouOpen] = useState(false)
  const [thankYouMessage, setThankYouMessage] = useState('')
  const form = useForm({
    defaultValues: { amount: String(contribution.amount) },
    validators: {
      onSubmit: ({ value }) => {
        const parsed = updateContributionAmountSchema.safeParse({
          contributionId: contribution.id,
          amount: value.amount,
        })
        if (parsed.success) return undefined
        return zodFormFieldErrors(parsed.error)
      },
    },
    onSubmit: async ({ value }) => {
      try {
        const row = await updateContributionAmount({
          data: {
            contributionId: contribution.id,
            amount: value.amount,
          },
        })
        toast.success('Amount updated.')
        await onSaved(row)
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Unable to update amount.',
        )
      }
    },
  })

  useEffect(() => {
    form.reset({ amount: String(contribution.amount) })
  }, [contribution.amount, contribution.id, form])

  const setStatus = async (
    status: RegistryContributionStatus,
    message?: string,
  ) => {
    setStatusBusy(status)
    try {
      const row = await setContributionStatus({
        data: {
          contributionId: contribution.id,
          status,
          thankYouMessage: message,
        },
      })
      await onSaved(row)
      if (row.thank_you_delivery_error) {
        toast.error(
          `Payment marked received, but the thank-you email failed: ${row.thank_you_delivery_error}`,
        )
      } else {
        toast.success(
          status === 'received' && row.thank_you_sent_at
            ? 'Payment marked received and thank-you sent.'
            : `Marked ${CONTRIBUTION_STATUS_LABELS[status].toLowerCase()}.`,
        )
        setThankYouOpen(false)
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to update status.',
      )
    } finally {
      setStatusBusy(null)
    }
  }

  const whatsappUrl = whatsappFollowUpUrl(contribution)
  const mailtoUrl = mailtoFollowUpUrl(contribution)
  const confirmLine = guestConfirmLabel(contribution)
  const openReceivedConfirmation = () => {
    if (contribution.thank_you_sent_at) {
      void setStatus('received')
      return
    }
    setThankYouMessage(
      renderRegistryThankYouTemplate(thankYouTemplate, {
        name: contribution.payer_name,
        amount: `${contribution.amount} ${contribution.currency}`,
        gift: contribution.gift_title ?? 'our wedding celebration',
        couple: coupleLabel,
      }),
    )
    setThankYouOpen(true)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-border border-b px-5 py-4">
        <h2 className="text-base font-medium">Transfer</h2>
        <p className="text-foreground-secondary mt-1 text-sm">
          {contribution.payer_name} · {contribution.amount}{' '}
          {contribution.currency}
          {contribution.currency !== contribution.base_currency
            ? ` · ${contribution.amount_base} ${contribution.base_currency}`
            : null}
        </p>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-foreground-secondary">Status</dt>
            <dd className="mt-0.5 font-medium">
              {CONTRIBUTION_STATUS_LABELS[contribution.status]}
            </dd>
          </div>
          {confirmLine ? (
            <div>
              <dt className="text-foreground-secondary">Guest confirm</dt>
              <dd className="mt-0.5">{confirmLine}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-foreground-secondary">Toward</dt>
            <dd className="mt-0.5">
              {contribution.gift_title ?? 'Direct donation'}
            </dd>
          </div>
          <div>
            <dt className="text-foreground-secondary">Counts as</dt>
            <dd className="mt-0.5">
              {contribution.amount_base} {contribution.base_currency}
              {contribution.currency !== contribution.base_currency ? (
                <span className="text-foreground-secondary">
                  {' '}
                  (locked {contribution.fx_rate} {contribution.currency} per 1{' '}
                  {contribution.base_currency})
                </span>
              ) : null}
            </dd>
          </div>
          {contribution.bank ? (
            <div>
              <dt className="text-foreground-secondary">Reference</dt>
              <dd className="mt-0.5 font-mono text-sm">
                {contribution.bank.reference}
              </dd>
            </div>
          ) : null}
          {contribution.bank && !contribution.applied_at ? (
            <div>
              <dt className="text-foreground-secondary">Reminders</dt>
              <dd className="mt-0.5">
                {contribution.bank.reminder_count} of 3 sent
                {contribution.bank.last_reminder_at
                  ? ` · last ${formatWhen(contribution.bank.last_reminder_at)}`
                  : ''}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-foreground-secondary">Email</dt>
            <dd className="mt-0.5">
              <a
                href={`mailto:${contribution.payer_email}`}
                className="underline-offset-4 hover:underline"
              >
                {contribution.payer_email}
              </a>
            </dd>
          </div>
          {contribution.payer_phone ? (
            <div>
              <dt className="text-foreground-secondary">Phone</dt>
              <dd className="mt-0.5 font-mono">{contribution.payer_phone}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-foreground-secondary">Started</dt>
            <dd className="mt-0.5">{formatWhen(contribution.created_at)}</dd>
          </div>
          {contribution.thank_you_sent_at ? (
            <div>
              <dt className="text-foreground-secondary">Thank-you sent</dt>
              <dd className="mt-0.5">
                {formatWhen(contribution.thank_you_sent_at)}
              </dd>
            </div>
          ) : null}
        </dl>

        {contribution.thank_you_message ? (
          <div>
            <p className="text-sm font-medium">Sent thank-you message</p>
            <div className="border-border bg-background mt-2 whitespace-pre-wrap rounded-lg border p-3 text-sm leading-relaxed">
              {contribution.thank_you_message}
            </div>
          </div>
        ) : null}

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void form.handleSubmit()
          }}
        >
          <form.Field name="amount">
            {(field) => {
              const error = fieldErrorMessage(field.state.meta.errors)
              const invalid = Boolean(error)
              return (
                <Field invalid={invalid}>
                  <Field.Label>Amount ({contribution.currency})</Field.Label>
                  <Field.Control>
                    <Input
                      inputMode="decimal"
                      value={field.state.value}
                      invalid={invalid}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                    />
                  </Field.Control>
                  <Field.Error>{invalid ? error : null}</Field.Error>
                  <Field.Description>
                    Edit only when they sent a different amount. Currency stays
                    as paid; the locked rate recalculates the base amount.
                  </Field.Description>
                </Field>
              )
            }}
          </form.Field>
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : 'Save amount'}
              </Button>
            )}
          </form.Subscribe>
        </form>

        <div className="space-y-2">
          <p className="text-sm font-medium">Audit status</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={
                contribution.status === 'received' ? 'primary' : 'outline'
              }
              disabled={
                statusBusy !== null ||
                (contribution.status === 'received' &&
                  Boolean(contribution.thank_you_sent_at))
              }
              onClick={openReceivedConfirmation}
            >
              {statusBusy === 'received'
                ? 'Saving…'
                : contribution.status === 'received' &&
                    !contribution.thank_you_sent_at
                  ? 'Retry thank-you'
                  : 'Received'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={
                contribution.status === 'not_received' ? 'primary' : 'outline'
              }
              disabled={statusBusy !== null}
              onClick={() => void setStatus('not_received')}
            >
              {statusBusy === 'not_received' ? 'Saving…' : 'Not received'}
            </Button>
            {contribution.status !== 'pending' ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={statusBusy !== null}
                onClick={() => void setStatus('pending')}
              >
                {statusBusy === 'pending' ? 'Saving…' : 'Back to pending'}
              </Button>
            ) : null}
          </div>
          <p className="text-foreground-secondary text-xs leading-relaxed">
            Not received puts that share back on the gift. Received again takes
            it off. Amount left only moves after the guest confirms.
          </p>
        </div>

        {contribution.status === 'not_received' ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Follow up</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" asChild>
                <a href={mailtoUrl}>Email</a>
              </Button>
              {whatsappUrl ? (
                <Button type="button" size="sm" variant="outline" asChild>
                  <a href={whatsappUrl} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-border flex justify-end gap-2 border-t px-5 py-4">
        <Button type="button" size="sm" variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      <Modal
        open={thankYouOpen}
        title="Confirm payment and send thank-you"
        description={`Mark ${contribution.payer_name}’s payment as received and send this one-off acknowledgement.`}
        size="lg"
        onOpenChange={(open) => {
          if (!statusBusy) setThankYouOpen(open)
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={statusBusy !== null}
              onClick={() => setThankYouOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              isLoading={statusBusy === 'received'}
              onClick={() => void setStatus('received', thankYouMessage)}
            >
              Mark received and send
            </Button>
          </div>
        }
      >
        <Field>
          <Field.Label>Message for this contributor</Field.Label>
          <Field.Control>
            <Textarea
              rows={10}
              maxLength={5000}
              value={thankYouMessage}
              onChange={(event) => setThankYouMessage(event.target.value)}
            />
          </Field.Control>
          <Field.Description>
            You can edit this message for this contributor only. The saved
            template will not change.
          </Field.Description>
        </Field>
      </Modal>
    </div>
  )
}
