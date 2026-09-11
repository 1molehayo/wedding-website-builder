import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { PageActionBar } from '@/components/admin/page-action-bar'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { PhotoDropzone } from '@/components/ui/photo-dropzone'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'
import { isSuperAdminProfile } from '@/lib/auth/roles'
import { submitSupport } from '@/lib/auth/profile'
import { SUPPORT_CATEGORIES } from '@/lib/support/categories'
import type { SupportCategoryId } from '@/lib/support/categories'
import { Route as AdminRoute } from './route'

export const Route = createFileRoute('/admin/support')({
  beforeLoad: ({ context }) => {
    if (!context.session || isSuperAdminProfile(context.session.profile)) {
      throw redirect({ to: '/admin' })
    }
  },
  component: AdminSupportPage,
})

async function fileToBase64(file: File) {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

function AdminSupportPage() {
  const { session } = AdminRoute.useRouteContext()
  const [category, setCategory] = useState<SupportCategoryId>(
    SUPPORT_CATEGORIES[0].id,
  )
  const [message, setMessage] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!session) return null

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      const attachment = image
        ? {
            name: image.name,
            type: image.type,
            dataBase64: await fileToBase64(image),
          }
        : null

      await submitSupport({
        data: {
          category,
          message,
          image: attachment,
        },
      })
      toast.success('Message sent to the super admin.')
      setMessage('')
      setImage(null)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Unable to send support message.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="admin-page-title">Support</h1>
        <p className="text-foreground-secondary mt-2 text-sm">
          Send a message to the super admin. You&apos;ll get help by email.
          There is no in-app ticket inbox yet.
        </p>
      </div>

      <form
        className="bg-surface border-border space-y-4 rounded-xl border p-5"
        onSubmit={onSubmit}
      >
        <Field>
          <Field.Label>Subject</Field.Label>
          <Field.Control>
            <Select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as SupportCategoryId)
              }
            >
              {SUPPORT_CATEGORIES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field.Control>
        </Field>

        <Field>
          <Field.Label>Message</Field.Label>
          <Field.Control>
            <Textarea
              rows={6}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              required
            />
          </Field.Control>
        </Field>

        <Field>
          <Field.Label>Image (optional)</Field.Label>
          <PhotoDropzone
            accept={['image/jpeg', 'image/png', 'image/webp']}
            maxBytes={Math.floor(4.5 * 1024 * 1024)}
            hint={
              image
                ? image.name
                : 'Optional screenshot. Attached to the email.'
            }
            replaceLabel={image ? 'Drop a photo to replace' : undefined}
            onFiles={(files) => setImage(files[0] ?? null)}
          />
        </Field>

        <PageActionBar>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            Send to super admin
          </Button>
        </PageActionBar>
      </form>
    </div>
  )
}
