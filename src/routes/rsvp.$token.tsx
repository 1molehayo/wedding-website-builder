import { createFileRoute } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useState } from 'react'
import { PublicShell } from '@/components/public-shell'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Toaster, toast } from '@/components/ui/toaster'
import { fieldErrorMessage } from '@/lib/forms/field-error'
import { zodFormFieldErrors } from '@/lib/forms/zod-form-errors'
import { getRsvpByToken, submitRsvp } from '@/lib/rsvp/rsvp'
import {
  RSVP_STATUS_LABELS,
  publicRsvpFormSchema,
  toPublicRsvpFormValues,
} from '@/lib/rsvp/schema'
import type { PublicRsvpFormValues, PublicRsvpPageData } from '@/lib/rsvp/schema'

type RsvpLoaderResult =
  | { ok: true; data: PublicRsvpPageData }
  | { ok: false; message: string }

export const Route = createFileRoute('/rsvp/$token')({
  loader: async ({ params }): Promise<RsvpLoaderResult> => {
    try {
      const data = await getRsvpByToken({ data: { token: params.token } })
      return { ok: true, data }
    } catch (cause) {
      return {
        ok: false,
        message:
          cause instanceof Error
            ? cause.message
            : 'This RSVP link is invalid or has expired.',
      }
    }
  },
  head: ({ loaderData }) => {
    if (!loaderData || !loaderData.ok) {
      return { meta: [{ title: 'RSVP' }] }
    }
    return {
      meta: [
        { title: `RSVP: ${loaderData.data.coupleLabel}` },
        {
          name: 'description',
          content: `RSVP for ${loaderData.data.coupleLabel}.`,
        },
        { name: 'robots', content: 'noindex,nofollow' },
      ],
    }
  },
  component: PublicRsvpPage,
})

function PublicRsvpPage() {
  const result = Route.useLoaderData()

  if (!result.ok) {
    return (
      <PublicShell
        coupleLabel="RSVP"
        showWeddingDate={false}
        sectionNav={[]}
        homePath="/"
      >
        <main className="public-section mx-auto max-w-xl px-6 py-16 text-center md:py-24">
          <p className="public-kicker mb-4">RSVP</p>
          <h1 className="public-section-title">Link unavailable</h1>
          <p className="text-foreground-secondary mt-4 text-sm leading-relaxed">
            {result.message}
          </p>
        </main>
      </PublicShell>
    )
  }

  return <RsvpFormView initial={result.data} />
}

function RsvpFormView({ initial }: { initial: PublicRsvpPageData }) {
  const [page, setPage] = useState(initial)
  const [isSaving, setIsSaving] = useState(false)
  const defaults = toPublicRsvpFormValues({
    rsvp_status: page.rsvpStatus,
    attending_count: page.attendingCount,
    dietary_notes: page.dietaryNotes,
    rsvp_message: page.message,
    plus_ones: page.plusOnes,
  })

  const form = useForm({
    defaultValues: defaults,
    validators: {
      onSubmit: ({ value }) => {
        const normalized: PublicRsvpFormValues = {
          ...value,
          attendingCount:
            value.status === 'declined' ? 0 : value.attendingCount,
        }
        const parsed = publicRsvpFormSchema.safeParse(normalized)
        if (parsed.success) {
          if (
            parsed.data.status === 'attending' &&
            parsed.data.attendingCount > page.maxAttending
          ) {
            return {
              fields: {
                attendingCount: `You can bring up to ${page.maxAttending} total (including yourself).`,
              },
            }
          }
          return undefined
        }
        return zodFormFieldErrors(parsed.error)
      },
    },
    onSubmit: async ({ value }) => {
      setIsSaving(true)
      try {
        const attendingCount =
          value.status === 'declined' ? 0 : value.attendingCount
        const updated = await submitRsvp({
          data: {
            token: page.token,
            status: value.status,
            attending_count: attendingCount,
            dietary_notes: value.dietaryNotes,
            rsvp_message: value.message,
          },
        })
        setPage(updated)
        form.reset(
          toPublicRsvpFormValues({
            rsvp_status: updated.rsvpStatus,
            attending_count: updated.attendingCount,
            dietary_notes: updated.dietaryNotes,
            rsvp_message: updated.message,
            plus_ones: updated.plusOnes,
          }),
        )
        toast.success('Thank you. Your RSVP was saved.')
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Unable to save your RSVP.',
        )
      } finally {
        setIsSaving(false)
      }
    },
  })

  return (
    <PublicShell
      theme={page.theme}
      coupleLabel={page.coupleLabel}
      weddingDate={page.weddingDate}
      sectionNav={[]}
    >
      <Toaster />
      <main className="public-section mx-auto max-w-xl px-6 py-12 md:py-20">
        <p className="public-kicker mb-4">RSVP</p>
        <h1 className="public-section-title">
          Hello, {page.guestFirstName}
        </h1>
        <p className="text-foreground-secondary mt-4 text-base leading-relaxed">
          You’re invited to celebrate {page.coupleLabel}.
          {page.weddingDateLabel !== 'Date to be announced'
            ? ` The date is ${page.weddingDateLabel}.`
            : ' The date will be shared soon.'}
        </p>
        {page.venueName || page.venueLocation ? (
          <p className="text-foreground-secondary mt-2 text-sm">
            {[page.venueName, page.venueLocation].filter(Boolean).join(' · ')}
          </p>
        ) : null}
        {page.partyName ? (
          <p className="text-foreground-secondary mt-2 text-sm">
            Party: {page.partyName}
          </p>
        ) : null}

        {!page.isOpen ? (
          <p className="border-border bg-surface mt-8 rounded-xl border border-dashed p-4 text-sm leading-relaxed">
            {page.closedReason}
          </p>
        ) : !page.canEdit ? (
          <div className="border-border bg-surface mt-8 space-y-3 rounded-xl border p-5">
            <p className="text-sm font-medium">Your RSVP is submitted</p>
            <p className="text-sm">
              Response:{' '}
              <span className="font-medium">
                {RSVP_STATUS_LABELS[page.rsvpStatus]}
              </span>
              {page.rsvpStatus === 'attending' && page.attendingCount != null
                ? ` · ${page.attendingCount} attending`
                : null}
            </p>
            {page.dietaryNotes ? (
              <p className="text-foreground-secondary text-sm">
                Dietary notes: {page.dietaryNotes}
              </p>
            ) : null}
            {page.message ? (
              <p className="text-foreground-secondary text-sm">
                Message: {page.message}
              </p>
            ) : null}
            <p className="text-foreground-secondary text-xs leading-relaxed">
              Need to change this? Contact {page.coupleLabel} and they can unlock
              your RSVP.
            </p>
          </div>
        ) : (
          <form
            className="mt-10 space-y-5"
            onSubmit={(event) => {
              event.preventDefault()
              event.stopPropagation()
              void form.handleSubmit()
            }}
          >
            {page.rsvpStatus !== 'pending' ? (
              <p className="text-foreground-secondary text-sm">
                You can update your previous response (
                {RSVP_STATUS_LABELS[page.rsvpStatus]}
                ).
              </p>
            ) : null}
            <form.Subscribe selector={(state) => state.submissionAttempts > 0}>
              {(submitted) => (
                <>
                  <form.Field name="status">
                    {(field) => {
                      const error = fieldErrorMessage(field.state.meta.errors)
                      const invalid =
                        !!error && (field.state.meta.isTouched || submitted)
                      return (
                        <Field invalid={invalid}>
                          <Field.Label required>Will you attend?</Field.Label>
                          <Field.Control>
                            <Select
                              value={field.state.value}
                              invalid={invalid}
                              onBlur={field.handleBlur}
                              onChange={(event) => {
                                const next = event.target.value as
                                  | 'attending'
                                  | 'declined'
                                field.handleChange(next)
                                if (next === 'declined') {
                                  form.setFieldValue('attendingCount', 0)
                                } else if (
                                  form.getFieldValue('attendingCount') < 1
                                ) {
                                  form.setFieldValue('attendingCount', 1)
                                }
                              }}
                            >
                              <option value="attending">Joyfully attend</option>
                              <option value="declined">
                                Regretfully decline
                              </option>
                            </Select>
                          </Field.Control>
                          {invalid ? <Field.Error>{error}</Field.Error> : null}
                        </Field>
                      )
                    }}
                  </form.Field>

                  <form.Subscribe selector={(state) => state.values.status}>
                    {(status) =>
                      status === 'attending' ? (
                        <form.Field name="attendingCount">
                          {(field) => {
                            const error = fieldErrorMessage(
                              field.state.meta.errors,
                            )
                            const invalid =
                              !!error &&
                              (field.state.meta.isTouched || submitted)
                            return (
                              <Field invalid={invalid}>
                                <Field.Label required>
                                  Number attending
                                </Field.Label>
                                <Field.Control>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={page.maxAttending}
                                    value={String(field.state.value)}
                                    invalid={invalid}
                                    onBlur={field.handleBlur}
                                    onChange={(event) =>
                                      field.handleChange(
                                        Number(event.target.value || 0),
                                      )
                                    }
                                  />
                                </Field.Control>
                                <Field.Description>
                                  Including yourself. Up to {page.maxAttending}{' '}
                                  total
                                  {page.plusOnes > 0
                                    ? ` (${page.plusOnes} plus-one${page.plusOnes === 1 ? '' : 's'} allowed)`
                                    : ''}
                                  .
                                </Field.Description>
                                {invalid ? (
                                  <Field.Error>{error}</Field.Error>
                                ) : null}
                              </Field>
                            )
                          }}
                        </form.Field>
                      ) : null
                    }
                  </form.Subscribe>

                  <form.Field name="dietaryNotes">
                    {(field) => (
                      <Field>
                        <Field.Label>Dietary notes</Field.Label>
                        <Field.Control>
                          <Textarea
                            rows={3}
                            value={field.state.value ?? ''}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            placeholder="Allergies or meal preferences"
                          />
                        </Field.Control>
                      </Field>
                    )}
                  </form.Field>

                  <form.Field name="message">
                    {(field) => (
                      <Field>
                        <Field.Label>Message to the couple</Field.Label>
                        <Field.Control>
                          <Textarea
                            rows={3}
                            value={field.state.value ?? ''}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                          />
                        </Field.Control>
                      </Field>
                    )}
                  </form.Field>
                </>
              )}
            </form.Subscribe>

            <Button type="submit" size="md" isLoading={isSaving}>
              {page.rsvpStatus === 'pending'
                ? 'Send RSVP'
                : 'Update RSVP'}
            </Button>
          </form>
        )}
      </main>
    </PublicShell>
  )
}
