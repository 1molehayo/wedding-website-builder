import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'
import { saveRegistryThankYouTemplate } from '@/lib/registry/registry'
import {
  REGISTRY_THANK_YOU_PLACEHOLDERS,
  registryThankYouTemplateSchema,
  renderRegistryThankYouTemplate,
} from '@/lib/registry/thank-you-template'

type RegistryThankYouTemplateModalProps = {
  open: boolean
  initialTemplate: string
  coupleLabel: string
  onOpenChange: (open: boolean) => void
  onSaved: (template: string) => void
}

export function RegistryThankYouTemplateModal({
  open,
  initialTemplate,
  coupleLabel,
  onOpenChange,
  onSaved,
}: RegistryThankYouTemplateModalProps) {
  const [template, setTemplate] = useState(initialTemplate)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open) setTemplate(initialTemplate)
  }, [initialTemplate, open])

  const parsed = registryThankYouTemplateSchema.safeParse(template)
  const preview = renderRegistryThankYouTemplate(template, {
    name: 'Jordan',
    amount: '250 USD',
    gift: 'the honeymoon fund',
    couple: coupleLabel,
  })

  const save = async () => {
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Check the template.')
      return
    }
    setIsSaving(true)
    try {
      const result = await saveRegistryThankYouTemplate({
        data: { template: parsed.data },
      })
      onSaved(result.template)
      onOpenChange(false)
      toast.success('Contribution thank-you template saved.')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to save template.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Contribution thank-you"
      description="This is the personal acknowledgement sent after you confirm a contribution was received."
      size="lg"
      onOpenChange={onOpenChange}
      footer={
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isSaving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            isLoading={isSaving}
            onClick={() => void save()}
          >
            Save template
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="border-info/30 bg-info/5 rounded-lg border px-3 py-2.5 text-sm">
          Saving this template does not send an email. It affects future
          confirmed contributions.
        </div>
        <Field invalid={!parsed.success}>
          <Field.Label>Template message</Field.Label>
          <Field.Control>
            <Textarea
              rows={9}
              value={template}
              invalid={!parsed.success}
              onChange={(event) => setTemplate(event.target.value)}
            />
          </Field.Control>
          <Field.Description>
            Available placeholders: {REGISTRY_THANK_YOU_PLACEHOLDERS.join(', ')}
          </Field.Description>
          <Field.Error>
            {parsed.success ? null : parsed.error.issues[0]?.message}
          </Field.Error>
        </Field>
        <div>
          <p className="text-sm font-medium">Live preview</p>
          <div className="border-border bg-background mt-2 whitespace-pre-wrap rounded-lg border p-4 text-sm leading-relaxed">
            {preview}
          </div>
        </div>
      </div>
    </Modal>
  )
}
