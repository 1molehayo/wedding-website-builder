import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useState } from 'react'
import { PageActionBar } from '@/components/admin/page-action-bar'
import { PhoneField } from '@/components/phone-field'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'
import { isSuperAdminProfile } from '@/lib/auth/roles'
import {
  requestAccountDeletion,
  updateProfile,
} from '@/lib/auth/profile'
import {
  deletionReasonSchema,
  profileFormSchema,
  profileFormSchemaAdmin,
} from '@/lib/auth/profile-schema'
import { parseStoredPhone } from '@/lib/auth/phone'
import {
  adminFirstName,
  hasCompleteAdminName,
} from '@/lib/auth/types'
import { fieldErrorMessage } from '@/lib/forms/field-error'
import { zodFormFieldErrors } from '@/lib/forms/zod-form-errors'
import { Route as AdminRoute } from './route'

export const Route = createFileRoute('/admin/profile')({
  component: AdminProfilePage,
})

function AdminProfilePage() {
  const { session } = AdminRoute.useRouteContext()
  const router = useRouter()

  if (!session) return null

  const isSuper = isSuperAdminProfile(session.profile)
  const needsName = !hasCompleteAdminName(session.profile)
  const initialPhone = parseStoredPhone(session.profile.phone)

  const [isSaving, setIsSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleteReasonError, setDeleteReasonError] = useState<string | null>(
    null,
  )
  const [isDeleting, setIsDeleting] = useState(false)

  const form = useForm({
    defaultValues: {
      firstName: session.profile.first_name ?? '',
      lastName: session.profile.last_name ?? '',
      email: session.profile.email ?? session.user.email ?? '',
      phoneCountry: initialPhone.country,
      phoneNational: initialPhone.nationalNumber,
    },
    validators: {
      onSubmit: ({ value }) => {
        const schema = isSuper ? profileFormSchema : profileFormSchemaAdmin
        const parsed = schema.safeParse(value)
        if (parsed.success) return undefined
        return zodFormFieldErrors(parsed.error)
      },
    },
    onSubmit: async ({ value }) => {
      setIsSaving(true)
      try {
        await updateProfile({
          data: {
            first_name: value.firstName,
            last_name: value.lastName,
            phone_country: value.phoneCountry,
            phone_national: value.phoneNational,
            ...(isSuper ? { email: value.email } : {}),
          },
        })
        toast.success('Profile updated.')
        await router.invalidate()
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Unable to save profile.',
        )
      } finally {
        setIsSaving(false)
      }
    },
  })

  const onRequestDeletion = async () => {
    const parsed = deletionReasonSchema.safeParse(deleteReason)
    if (!parsed.success) {
      setDeleteReasonError(
        parsed.error.issues[0]?.message ?? 'Reason is required.',
      )
      return
    }
    setDeleteReasonError(null)
    setIsDeleting(true)
    try {
      await requestAccountDeletion({ data: { reason: parsed.data } })
      toast.success(
        'Deletion request sent. A super admin will review it from Admins.',
      )
      setDeleteOpen(false)
      setDeleteReason('')
      await router.invalidate()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Unable to request deletion.',
      )
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="admin-page-title">Profile</h1>
        <p className="text-foreground-secondary mt-2 text-sm">
          {needsName && !isSuper
            ? 'Add your first and last name to continue. This comes before wedding setup.'
            : `Hi ${adminFirstName(session.profile)}. Update how you appear in admin.`}
        </p>
      </div>

      <form
        className="bg-surface border-border space-y-4 rounded-xl border p-5"
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void form.handleSubmit()
        }}
      >
        <form.Subscribe
          selector={(state) => state.submissionAttempts > 0}
        >
          {(submitted) => (
            <>
              <div className="grid items-start gap-4 md:grid-cols-2">
                <form.Field name="firstName">
                  {(field) => {
                    const error = fieldErrorMessage(field.state.meta.errors)
                    const invalid =
                      !!error && (field.state.meta.isTouched || submitted)
                    return (
                      <Field invalid={invalid}>
                        <Field.Label required>First name</Field.Label>
                        <Field.Control>
                          <Input
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            invalid={invalid}
                            autoComplete="given-name"
                          />
                        </Field.Control>
                        <Field.Error>{invalid ? error : null}</Field.Error>
                      </Field>
                    )
                  }}
                </form.Field>
                <form.Field name="lastName">
                  {(field) => {
                    const error = fieldErrorMessage(field.state.meta.errors)
                    const invalid =
                      !!error && (field.state.meta.isTouched || submitted)
                    return (
                      <Field invalid={invalid}>
                        <Field.Label required>Last name</Field.Label>
                        <Field.Control>
                          <Input
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            invalid={invalid}
                            autoComplete="family-name"
                          />
                        </Field.Control>
                        <Field.Error>{invalid ? error : null}</Field.Error>
                      </Field>
                    )
                  }}
                </form.Field>
              </div>

              <form.Field name="email">
                {(field) => {
                  const error = fieldErrorMessage(field.state.meta.errors)
                  const invalid =
                    isSuper &&
                    !!error &&
                    (field.state.meta.isTouched || submitted)
                  return (
                    <Field invalid={invalid}>
                      <Field.Label required={isSuper}>Email</Field.Label>
                      <Field.Control>
                        <Input
                          type="email"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          invalid={invalid}
                          readOnly={!isSuper}
                          disabled={!isSuper}
                          autoComplete="email"
                        />
                      </Field.Control>
                      {invalid ? <Field.Error>{error}</Field.Error> : null}
                      <Field.Description>
                        {isSuper
                          ? 'Changing email updates your sign-in address.'
                          : 'Email is managed by the super admin. Use Support if you need it changed.'}
                      </Field.Description>
                    </Field>
                  )
                }}
              </form.Field>

              <form.Field name="phoneCountry">
                {(countryField) => (
                  <form.Field name="phoneNational">
                    {(phoneField) => {
                      const error = fieldErrorMessage(phoneField.state.meta.errors)
                      const invalid =
                        !!error &&
                        (phoneField.state.meta.isTouched || submitted)
                      return (
                        <PhoneField
                          country={countryField.state.value}
                          nationalNumber={phoneField.state.value}
                          invalid={invalid}
                          error={invalid ? error : undefined}
                          onChange={({ country, nationalNumber }) => {
                            countryField.handleChange(country)
                            phoneField.handleChange(nationalNumber)
                          }}
                        />
                      )
                    }}
                  </form.Field>
                )}
              </form.Field>
            </>
          )}
        </form.Subscribe>

        <PageActionBar>
          <Button type="submit" size="sm" isLoading={isSaving}>
            Save profile
          </Button>
        </PageActionBar>
      </form>

      {!isSuper ? (
        <div className="bg-surface border-border space-y-4 rounded-xl border p-5">
          <p className="text-foreground-secondary text-xs tracking-[0.16em] uppercase">
            Help & account
          </p>
          <p className="text-sm leading-relaxed">
            Need an email change or something else we can&apos;t edit here?{' '}
            <Link to="/admin/support" className="text-accent underline">
              Contact support
            </Link>
            .
          </p>

          {session.profile.deletion_requested_at ? (
            <p className="text-foreground-secondary text-sm">
              Deletion requested on{' '}
              {new Date(session.profile.deletion_requested_at).toLocaleString()}
              . A super admin still needs to remove the account.
            </p>
          ) : (
            <Button
              type="button"
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              Request account deletion
            </Button>
          )}
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        title="Request account deletion?"
        description="This cannot be undone from your side. A super admin will review the request and may permanently remove your access."
        confirmLabel="Send request"
        tone="destructive"
        isConfirming={isDeleting}
        onOpenChange={setDeleteOpen}
        onConfirm={onRequestDeletion}
      >
        <Field invalid={!!deleteReasonError}>
          <Field.Label required>Reason</Field.Label>
          <Field.Control>
            <Textarea
              rows={4}
              value={deleteReason}
              onChange={(event) => {
                setDeleteReason(event.target.value)
                setDeleteReasonError(null)
              }}
              invalid={!!deleteReasonError}
              placeholder="Tell the super admin why you need this account removed."
            />
          </Field.Control>
          {deleteReasonError ? (
            <Field.Error>{deleteReasonError}</Field.Error>
          ) : null}
        </Field>
      </ConfirmDialog>
    </div>
  )
}
