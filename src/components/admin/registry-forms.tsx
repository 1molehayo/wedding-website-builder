import { QuestionIcon, TrashIcon } from '@phosphor-icons/react'
import { useForm } from '@tanstack/react-form'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CurrencyAmountField } from '@/components/ui/currency-amount-field'
import { CurrencySelect } from '@/components/ui/currency-select'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PhotoDropzone } from '@/components/ui/photo-dropzone'
import { Select } from '@/components/ui/select'
import { SideDrawer } from '@/components/ui/side-drawer'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'
import { DEFAULT_CURRENCY } from '@/lib/currency/currencies'
import { Tooltip } from '@/components/ui/tooltip'
import { fieldErrorMessage } from '@/lib/forms/field-error'
import { zodFormFieldErrors } from '@/lib/forms/zod-form-errors'
import { prepareImageForUpload } from '@/lib/media/compress-image'
import { uploadFileToSignedUrl } from '@/lib/media/upload-client'
import { getSignedPhotoUrl } from '@/lib/page-blocks/settings'
import {
  confirmRegistryPhotoUpload,
  createRegistryAccount,
  createRegistryItem,
  createRegistryPhotoUpload,
  updateRegistryAccount,
  updateRegistryItem,
} from '@/lib/registry/registry'
import type { RegistryAdminData } from '@/lib/registry/registry'
import {
  REGISTRY_ITEM_STATUS_LABELS,
  parseRegistryAccountInput,
  parseRegistryItemInput,
  registryAccountFormSchema,
  registryFormFieldErrors,
  registryItemFormSchema,
} from '@/lib/registry/schema'
import type { RegistryAccount, RegistryItem } from '@/lib/supabase/types'

type AdminGift = RegistryAdminData['items'][number]

type PriceDraft = {
  currency: string
  amount: string
}

type GiftFormValues = {
  title: string
  description: string
  store_url: string
  amazon_url: string
  photo_path: string
  prices: PriceDraft[]
  desired_qty: string
  claimed_qty: string
  status: RegistryItem['status']
  is_visible: boolean
}

type AccountFormValues = {
  label: string
  bank_name: string
  currency: string
  account_name: string
  account_number: string
  routing_number: string
  notes: string
  is_enabled: boolean
}

const emptyPrice = (): PriceDraft => ({
  currency: DEFAULT_CURRENCY,
  amount: '',
})

function emptyGiftForm(): GiftFormValues {
  return {
    title: '',
    description: '',
    store_url: '',
    amazon_url: '',
    photo_path: '',
    prices: [emptyPrice()],
    desired_qty: '1',
    claimed_qty: '0',
    status: 'available',
    is_visible: true,
  }
}

function giftToForm(item: AdminGift): GiftFormValues {
  const amazon = item.listings.find((listing) => listing.provider === 'amazon')
  return {
    title: item.title,
    description: item.description ?? '',
    store_url: item.store_url ?? '',
    amazon_url: amazon?.url ?? '',
    photo_path: item.photo_path ?? '',
    prices: [
      item.prices[0]
        ? {
            currency: item.prices[0].currency,
            amount: String(item.prices[0].amount),
          }
        : emptyPrice(),
    ],
    desired_qty: String(item.desired_qty),
    claimed_qty: String(item.claimed_qty),
    status: item.status,
    is_visible: item.is_visible,
  }
}

function emptyAccountForm(): AccountFormValues {
  return {
    label: '',
    bank_name: '',
    currency: DEFAULT_CURRENCY,
    account_name: '',
    account_number: '',
    routing_number: '',
    notes: '',
    is_enabled: true,
  }
}

function accountToForm(account: RegistryAccount): AccountFormValues {
  return {
    label: account.label,
    bank_name: account.bank_name ?? '',
    currency: account.currency,
    account_name: account.account_name,
    account_number: account.account_number,
    routing_number: account.routing_number ?? '',
    notes: account.notes ?? '',
    is_enabled: account.is_enabled,
  }
}

function FieldHint({
  label,
  children,
  contentClassName,
}: {
  label: string
  children: React.ReactNode
  contentClassName?: string
}) {
  return (
    <Tooltip>
      <Tooltip.Trigger
        aria-label={label}
        className="text-foreground-secondary inline-flex"
      >
        <QuestionIcon className="size-3.5" />
      </Tooltip.Trigger>
      <Tooltip.Content className={contentClassName}>{children}</Tooltip.Content>
    </Tooltip>
  )
}

function fieldState(errors: unknown, isTouched: boolean, submitted: boolean) {
  const error = fieldErrorMessage(errors)
  return {
    error,
    invalid: Boolean(error) && (isTouched || submitted),
  }
}

function GiftPhotoPreview({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!path) {
      setUrl(null)
      return
    }
    let cancelled = false
    void getSignedPhotoUrl({ data: { imagePath: path } })
      .then((next) => {
        if (!cancelled) setUrl(next)
      })
      .catch(() => {
        if (!cancelled) setUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [path])

  if (!url) return null

  return (
    <img
      src={url}
      alt="Gift photo preview"
      className="border-border max-h-56 w-full rounded-lg border object-cover"
    />
  )
}

export function GiftItemForm({
  item,
  accountCurrencies,
  onClose,
  onSaved,
}: {
  item: AdminGift | null
  /** Distinct currencies from enabled bank accounts (gift price picker). */
  accountCurrencies: string[]
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const priceCurrencies = [
    ...new Set(
      accountCurrencies
        .map((code) => code.trim().toUpperCase())
        .filter(Boolean),
    ),
  ]
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: item ? giftToForm(item) : emptyGiftForm(),
    validators: {
      onSubmit: ({ value }) => {
        const parsed = registryItemFormSchema.safeParse(value)
        if (parsed.success) return undefined
        return registryFormFieldErrors(parsed.error)
      },
    },
    onSubmit: async ({ value }) => {
      setIsSaving(true)
      try {
        const parsed = parseRegistryItemInput(value)
        if (item) {
          await updateRegistryItem({ data: { itemId: item.id, ...parsed } })
          toast.success('Gift item updated.')
        } else {
          await createRegistryItem({ data: parsed })
          toast.success('Gift item added.')
        }
        await onSaved()
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Unable to save gift item.',
        )
      } finally {
        setIsSaving(false)
      }
    },
  })

  const uploadGiftPhoto = async (file: File) => {
    setUploadError(null)
    setIsUploadingPhoto(true)
    try {
      const prepared = await prepareImageForUpload(file)
      const signed = await createRegistryPhotoUpload({
        data: {
          name: prepared.name,
          type: prepared.type,
          byteSize: prepared.size,
        },
      })
      await uploadFileToSignedUrl(signed.signedUrl, prepared)
      const uploaded = await confirmRegistryPhotoUpload({
        data: { path: signed.path },
      })
      form.setFieldValue('photo_path', uploaded.path)
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Unable to upload the gift photo.',
      )
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  return (
    <>
      <SideDrawer.Header
        title={item ? 'Edit gift' : 'Add gift'}
        drawerDescription="Gift details"
      />
      <form
        className="flex min-h-0 flex-1 flex-col"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void form.handleSubmit()
        }}
      >
        <SideDrawer.Content>
          <form.Subscribe selector={(state) => state.submissionAttempts > 0}>
            {(submitted) => (
              <div className="flex flex-col gap-4">
                <form.Field name="title">
                  {(field) => {
                    const { error, invalid } = fieldState(
                      field.state.meta.errors,
                      field.state.meta.isTouched,
                      submitted,
                    )
                    return (
                      <Field invalid={invalid}>
                        <Field.Label required>Title</Field.Label>
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

                <form.Field name="description">
                  {(field) => (
                    <Field>
                      <Field.Label>Description</Field.Label>
                      <Field.Control>
                        <Textarea
                          rows={3}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                        />
                      </Field.Control>
                      <Field.Description>Optional.</Field.Description>
                    </Field>
                  )}
                </form.Field>

                <form.Field name="store_url">
                  {(field) => {
                    const { error, invalid } = fieldState(
                      field.state.meta.errors,
                      field.state.meta.isTouched,
                      submitted,
                    )
                    return (
                      <Field invalid={invalid}>
                        <div className="flex items-center gap-1.5">
                          <Field.Label>Product link</Field.Label>
                          <FieldHint label="About the product link">
                            Optional browse link. Guests can open the product
                            page. This is not how they pay.
                          </FieldHint>
                        </div>
                        <Field.Control>
                          <Input
                            value={field.state.value}
                            invalid={invalid}
                            placeholder="https://"
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                          />
                        </Field.Control>
                        <Field.Error>{invalid ? error : null}</Field.Error>
                        <Field.Description>Optional.</Field.Description>
                      </Field>
                    )
                  }}
                </form.Field>

                <form.Field name="amazon_url">
                  {(field) => {
                    const { error, invalid } = fieldState(
                      field.state.meta.errors,
                      field.state.meta.isTouched,
                      submitted,
                    )
                    return (
                      <Field invalid={invalid}>
                        <div className="flex items-center gap-1.5">
                          <Field.Label>Amazon link</Field.Label>
                          <FieldHint
                            label="How to add an Amazon wedding registry link"
                            contentClassName="max-w-sm space-y-2 py-2.5"
                          >
                            <p className="font-medium">
                              Optional. Skip this for a normal bank-transfer
                              gift. Only add a link if guests should also buy
                              this item on your amazon.com wedding registry.
                              Use Share, registry, or guest-view — not a regular
                              product page, and not amazon.es / amazon.co.uk.
                            </p>
                            <ol className="list-decimal space-y-1.5 pl-4 text-left leading-relaxed">
                              <li>
                                On <strong>amazon.com</strong>, open your
                                wedding registry and set the shipping address
                                there once. Guests never see it.
                              </li>
                              <li>
                                Copy the Share link, the registry URL, or the
                                guest-view URL for the whole wedding list.
                              </li>
                              <li>
                                Paste that amazon.com link here. Guests click
                                Buy on Amazon, open the list, find this gift by
                                title, then pay on Amazon with shipping to your
                                registry address.
                              </li>
                              <li>
                                After someone buys or contributes, record it
                                under Registry, Transfers, Record Amazon.
                              </li>
                            </ol>
                            <p className="text-background/80">
                              Regular product links such as amazon.com/dp/… are
                              rejected. They do not use your wedding list
                              address.
                            </p>
                          </FieldHint>
                        </div>
                        <Field.Control>
                          <Input
                            value={field.state.value}
                            invalid={invalid}
                            placeholder="https://www.amazon.com/wedding/share/AlexAndSam"
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                          />
                        </Field.Control>
                        <Field.Error>{invalid ? error : null}</Field.Error>
                        <Field.Description>
                          Optional — leave blank unless you want Buy on Amazon.
                          Paste an amazon.com wedding registry Share, registry,
                          or guest-view link only.
                        </Field.Description>
                      </Field>
                    )
                  }}
                </form.Field>

                <form.Subscribe selector={(state) => state.values.photo_path}>
                  {(photoPath) => (
                    <Field invalid={Boolean(uploadError)}>
                      <Field.Label>Photo</Field.Label>
                      <PhotoDropzone
                        hint="Optional."
                        error={uploadError ?? undefined}
                        isUploading={isUploadingPhoto}
                        replaceLabel={
                          photoPath ? 'Drop a photo to replace' : undefined
                        }
                        onFiles={(files) => {
                          void uploadGiftPhoto(files[0])
                        }}
                      />
                      <GiftPhotoPreview path={photoPath} />
                      {photoPath ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="w-fit"
                          onClick={() => form.setFieldValue('photo_path', '')}
                        >
                          <TrashIcon />
                          Remove photo
                        </Button>
                      ) : null}
                    </Field>
                  )}
                </form.Subscribe>

                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium">
                      Price
                      <span className="text-error ms-0.5" aria-hidden="true">
                        *
                      </span>
                    </p>
                    <FieldHint label="About price">
                      Required. List one amount in a currency that matches an
                      enabled bank account. Guests can still pay in another
                      account currency; we convert with a live rate locked when
                      they continue.
                    </FieldHint>
                  </div>
                  <form.Field name="prices">
                    {(field) => {
                      const { error, invalid } = fieldState(
                        field.state.meta.errors,
                        field.state.meta.isTouched,
                        submitted,
                      )
                      return invalid ? (
                        <p className="text-error text-sm" role="alert">
                          {error}
                        </p>
                      ) : null
                    }}
                  </form.Field>
                  <form.Field name="prices[0].currency">
                    {(currencyField) => (
                      <form.Field name="prices[0].amount">
                        {(amountField) => {
                          const currencyState = fieldState(
                            currencyField.state.meta.errors,
                            currencyField.state.meta.isTouched,
                            submitted,
                          )
                          const amountState = fieldState(
                            amountField.state.meta.errors,
                            amountField.state.meta.isTouched,
                            submitted,
                          )
                          const invalid =
                            currencyState.invalid || amountState.invalid
                          const error = amountState.error || currencyState.error
                          return (
                            <CurrencyAmountField
                              currency={currencyField.state.value}
                              amount={amountField.state.value}
                              invalid={invalid}
                              error={
                                invalid
                                  ? error
                                  : priceCurrencies.length === 0
                                    ? 'Add an enabled bank account first so you can pick a gift price currency.'
                                    : undefined
                              }
                              required
                              includeCodes={[
                                currencyField.state.value,
                                ...priceCurrencies,
                              ]}
                              allowedCodes={
                                priceCurrencies.length > 0
                                  ? priceCurrencies
                                  : undefined
                              }
                              onBlur={() => {
                                currencyField.handleBlur()
                                amountField.handleBlur()
                              }}
                              onCurrencyChange={(next) =>
                                currencyField.handleChange(next)
                              }
                              onAmountChange={(next) =>
                                amountField.handleChange(next)
                              }
                            />
                          )
                        }}
                      </form.Field>
                    )}
                  </form.Field>
                </div>

                <div className="grid items-start gap-4 sm:grid-cols-2">
                  <form.Field name="status">
                    {(field) => (
                      <Field>
                        <Field.Label>Status</Field.Label>
                        <Field.Control>
                          <Select
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(
                                event.target.value as RegistryItem['status'],
                              )
                            }
                          >
                            {Object.entries(REGISTRY_ITEM_STATUS_LABELS).map(
                              ([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ),
                            )}
                          </Select>
                        </Field.Control>
                      </Field>
                    )}
                  </form.Field>
                  <form.Field name="desired_qty">
                    {(field) => {
                      const { error, invalid } = fieldState(
                        field.state.meta.errors,
                        field.state.meta.isTouched,
                        submitted,
                      )
                      return (
                        <Field invalid={invalid}>
                          <div className="flex items-center gap-1.5">
                            <Field.Label required>Desired qty</Field.Label>
                            <FieldHint label="About desired quantity">
                              Used by the reserve buttons on the public page.
                            </FieldHint>
                          </div>
                          <Field.Control>
                            <Input
                              type="number"
                              min={1}
                              max={100}
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
                  <form.Field name="claimed_qty">
                    {(field) => {
                      const { error, invalid } = fieldState(
                        field.state.meta.errors,
                        field.state.meta.isTouched,
                        submitted,
                      )
                      return (
                        <Field invalid={invalid}>
                          <Field.Label required>Claimed qty</Field.Label>
                          <Field.Control>
                            <Input
                              type="number"
                              min={0}
                              max={100}
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
                </div>

                <form.Field name="is_visible">
                  {(field) => (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={field.state.value}
                        onChange={(event) =>
                          field.handleChange(event.target.checked)
                        }
                      />
                      Visible on public registry
                    </label>
                  )}
                </form.Field>
              </div>
            )}
          </form.Subscribe>
        </SideDrawer.Content>
        <SideDrawer.Footer>
          <Button type="button" size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSaving}>
            {item ? 'Save gift' : 'Add gift'}
          </Button>
        </SideDrawer.Footer>
      </form>
    </>
  )
}

export function AccountForm({
  account,
  onClose,
  onSaved,
}: {
  account: RegistryAccount | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [isSaving, setIsSaving] = useState(false)
  const form = useForm({
    defaultValues: account ? accountToForm(account) : emptyAccountForm(),
    validators: {
      onSubmit: ({ value }) => {
        const parsed = registryAccountFormSchema.safeParse(value)
        if (parsed.success) return undefined
        return zodFormFieldErrors(parsed.error)
      },
    },
    onSubmit: async ({ value }) => {
      setIsSaving(true)
      try {
        const parsed = parseRegistryAccountInput(value)
        if (account) {
          await updateRegistryAccount({
            data: { accountId: account.id, ...parsed },
          })
          toast.success('Bank account updated.')
        } else {
          await createRegistryAccount({ data: parsed })
          toast.success('Bank account added.')
        }
        await onSaved()
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Unable to save bank account.',
        )
      } finally {
        setIsSaving(false)
      }
    },
  })

  return (
    <>
      <SideDrawer.Header
        title={account ? 'Edit bank account' : 'Add bank account'}
        drawerDescription="Account details"
      />
      <form
        className="flex min-h-0 flex-1 flex-col"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void form.handleSubmit()
        }}
      >
        <SideDrawer.Content>
          <form.Subscribe selector={(state) => state.submissionAttempts > 0}>
            {(submitted) => (
              <div className="flex flex-col gap-4">
                <form.Field name="label">
                  {(field) => {
                    const { error, invalid } = fieldState(
                      field.state.meta.errors,
                      field.state.meta.isTouched,
                      submitted,
                    )
                    return (
                      <Field invalid={invalid}>
                        <Field.Label required>Display label</Field.Label>
                        <Field.Control>
                          <Input
                            value={field.state.value}
                            invalid={invalid}
                            placeholder="e.g. NGN account"
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
                <div className="grid items-start gap-4 sm:grid-cols-2">
                  <form.Field name="bank_name">
                    {(field) => (
                      <Field>
                        <Field.Label>Bank name</Field.Label>
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
                  <form.Field name="currency">
                    {(field) => {
                      const { error, invalid } = fieldState(
                        field.state.meta.errors,
                        field.state.meta.isTouched,
                        submitted,
                      )
                      return (
                        <Field invalid={invalid}>
                          <Field.Label required>Currency</Field.Label>
                          <Field.Control>
                            <CurrencySelect
                              value={field.state.value}
                              invalid={invalid}
                              includeCodes={[field.state.value]}
                              onBlur={field.handleBlur}
                              onChange={(next) => field.handleChange(next)}
                            />
                          </Field.Control>
                          <Field.Error>{invalid ? error : null}</Field.Error>
                        </Field>
                      )
                    }}
                  </form.Field>
                </div>
                <form.Field name="account_name">
                  {(field) => {
                    const { error, invalid } = fieldState(
                      field.state.meta.errors,
                      field.state.meta.isTouched,
                      submitted,
                    )
                    return (
                      <Field invalid={invalid}>
                        <Field.Label required>Account name</Field.Label>
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
                <form.Field name="account_number">
                  {(field) => {
                    const { error, invalid } = fieldState(
                      field.state.meta.errors,
                      field.state.meta.isTouched,
                      submitted,
                    )
                    return (
                      <Field invalid={invalid}>
                        <Field.Label required>Account number</Field.Label>
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
                <form.Field name="routing_number">
                  {(field) => (
                    <Field>
                      <div className="flex items-center gap-1.5">
                        <Field.Label>Routing / sort code</Field.Label>
                        <FieldHint label="About routing">
                          Optional. Add a sort code, routing number, or IBAN
                          note if guests need it.
                        </FieldHint>
                      </div>
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
                <form.Field name="notes">
                  {(field) => (
                    <Field>
                      <div className="flex items-center gap-1.5">
                        <Field.Label>Notes for guests</Field.Label>
                        <FieldHint label="About notes">
                          Optional instructions shown with this account.
                        </FieldHint>
                      </div>
                      <Field.Control>
                        <Textarea
                          rows={3}
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
                <form.Field name="is_enabled">
                  {(field) => (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={field.state.value}
                        onChange={(event) =>
                          field.handleChange(event.target.checked)
                        }
                      />
                      Visible on public registry
                    </label>
                  )}
                </form.Field>
              </div>
            )}
          </form.Subscribe>
        </SideDrawer.Content>
        <SideDrawer.Footer>
          <Button type="button" size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSaving}>
            {account ? 'Save account' : 'Add account'}
          </Button>
        </SideDrawer.Footer>
      </form>
    </>
  )
}
