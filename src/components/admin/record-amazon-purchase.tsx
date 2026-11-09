import { useForm } from '@tanstack/react-form'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { toast } from '@/components/ui/toaster'
import { fieldErrorMessage } from '@/lib/forms/field-error'
import { zodFormFieldErrors } from '@/lib/forms/zod-form-errors'
import { recordExternalContributionSchema } from '@/lib/registry/contribution-schema'
import { recordExternalContribution } from '@/lib/registry/registry'
import type {
  AdminContribution,
  RegistryAdminData,
} from '@/lib/registry/registry'

type AdminGift = RegistryAdminData['items'][number]

type FormValues = {
  giftId: string
  amount: string
  currency: string
  payerName: string
  payerEmail: string
  payerPhone: string
  externalRef: string
}

export function RecordAmazonPurchaseDrawer({
  gifts,
  onClose,
  onSaved,
}: {
  gifts: AdminGift[]
  onClose: () => void
  onSaved: (row: AdminContribution) => void | Promise<void>
}) {
  const amazonGifts = gifts.filter((gift) =>
    gift.listings.some((listing) => listing.provider === 'amazon'),
  )

  const form = useForm({
    defaultValues: {
      giftId: amazonGifts[0]?.id ?? '',
      amount: '',
      currency: amazonGifts[0]?.prices[0]?.currency ?? 'USD',
      payerName: '',
      payerEmail: '',
      payerPhone: '',
      externalRef: '',
    } satisfies FormValues,
    validators: {
      onSubmit: ({ value }) => {
        const parsed = recordExternalContributionSchema.safeParse({
          giftId: value.giftId,
          provider: 'amazon',
          amount: value.amount,
          currency: value.currency,
          payerName: value.payerName,
          payerEmail: value.payerEmail,
          payerPhone: value.payerPhone,
          externalRef: value.externalRef,
        })
        if (parsed.success) return undefined
        return zodFormFieldErrors(parsed.error)
      },
    },
    onSubmit: async ({ value }) => {
      try {
        const row = await recordExternalContribution({
          data: {
            giftId: value.giftId,
            provider: 'amazon',
            amount: value.amount,
            currency: value.currency,
            payerName: value.payerName,
            payerEmail: value.payerEmail,
            payerPhone: value.payerPhone,
            externalRef: value.externalRef,
          },
        })
        toast.success('Amazon purchase recorded.')
        await onSaved(row)
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Unable to record Amazon purchase.',
        )
      }
    },
  })

  if (amazonGifts.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-border border-b px-5 py-4">
          <h2 className="text-base font-medium">Record Amazon purchase</h2>
        </div>
        <div className="flex-1 px-5 py-5">
          <p className="text-foreground-secondary text-sm leading-relaxed">
            Add an Amazon link on a gift first, then record purchases here.
          </p>
        </div>
        <div className="border-border flex justify-end border-t px-5 py-4">
          <Button type="button" size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-border border-b px-5 py-4">
        <h2 className="text-base font-medium">Record Amazon purchase</h2>
        <p className="text-foreground-secondary mt-1 text-sm">
          When someone paid on Amazon, enter it so the gift remaining updates.
        </p>
      </div>

      <form
        className="flex flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void form.handleSubmit()
        }}
      >
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <form.Field name="giftId">
            {(field) => {
              const error = fieldErrorMessage(field.state.meta.errors)
              const invalid = Boolean(error)
              return (
                <Field invalid={invalid}>
                  <Field.Label>Gift</Field.Label>
                  <Field.Control>
                    <Select
                      value={field.state.value}
                      invalid={invalid}
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        const giftId = event.target.value
                        field.handleChange(giftId)
                        const gift = amazonGifts.find(
                          (item) => item.id === giftId,
                        )
                        const currency = gift?.prices[0]?.currency
                        if (currency) form.setFieldValue('currency', currency)
                      }}
                    >
                      {amazonGifts.map((gift) => (
                        <option key={gift.id} value={gift.id}>
                          {gift.title}
                        </option>
                      ))}
                    </Select>
                  </Field.Control>
                  <Field.Error>{invalid ? error : null}</Field.Error>
                </Field>
              )
            }}
          </form.Field>

          <form.Subscribe selector={(state) => state.values.giftId}>
            {(giftId) => {
              const gift = amazonGifts.find((item) => item.id === giftId)
              const currencies = gift?.prices ?? []
              return (
                <div className="grid gap-4 sm:grid-cols-2">
                  <form.Field name="amount">
                    {(field) => {
                      const error = fieldErrorMessage(field.state.meta.errors)
                      const invalid = Boolean(error)
                      return (
                        <Field invalid={invalid}>
                          <Field.Label>Amount</Field.Label>
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
                        </Field>
                      )
                    }}
                  </form.Field>
                  <form.Field name="currency">
                    {(field) => {
                      const error = fieldErrorMessage(field.state.meta.errors)
                      const invalid = Boolean(error)
                      return (
                        <Field invalid={invalid}>
                          <Field.Label>Currency</Field.Label>
                          <Field.Control>
                            <Select
                              value={field.state.value}
                              invalid={invalid}
                              onBlur={field.handleBlur}
                              onChange={(event) =>
                                field.handleChange(event.target.value)
                              }
                            >
                              {currencies.map((price) => (
                                <option
                                  key={price.currency}
                                  value={price.currency}
                                >
                                  {price.currency}
                                </option>
                              ))}
                            </Select>
                          </Field.Control>
                          <Field.Error>{invalid ? error : null}</Field.Error>
                        </Field>
                      )
                    }}
                  </form.Field>
                </div>
              )
            }}
          </form.Subscribe>

          <form.Field name="payerName">
            {(field) => {
              const error = fieldErrorMessage(field.state.meta.errors)
              const invalid = Boolean(error)
              return (
                <Field invalid={invalid}>
                  <Field.Label>Payer name</Field.Label>
                  <Field.Control>
                    <Input
                      value={field.state.value}
                      invalid={invalid}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                    />
                  </Field.Control>
                  <Field.Error>{invalid ? error : null}</Field.Error>
                </Field>
              )
            }}
          </form.Field>

          <form.Field name="payerEmail">
            {(field) => {
              const error = fieldErrorMessage(field.state.meta.errors)
              const invalid = Boolean(error)
              return (
                <Field invalid={invalid}>
                  <Field.Label>Payer email</Field.Label>
                  <Field.Control>
                    <Input
                      type="email"
                      value={field.state.value}
                      invalid={invalid}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                    />
                  </Field.Control>
                  <Field.Error>{invalid ? error : null}</Field.Error>
                </Field>
              )
            }}
          </form.Field>

          <form.Field name="payerPhone">
            {(field) => (
              <Field>
                <Field.Label>Phone (optional)</Field.Label>
                <Field.Control>
                  <Input
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) =>
                      field.handleChange(event.target.value)
                    }
                  />
                </Field.Control>
              </Field>
            )}
          </form.Field>

          <form.Field name="externalRef">
            {(field) => (
              <Field>
                <Field.Label>Order / ref (optional)</Field.Label>
                <Field.Control>
                  <Input
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) =>
                      field.handleChange(event.target.value)
                    }
                  />
                </Field.Control>
              </Field>
            )}
          </form.Field>
        </div>

        <div className="border-border flex justify-end gap-2 border-t px-5 py-4">
          <Button type="button" size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : 'Record purchase'}
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </div>
  )
}
