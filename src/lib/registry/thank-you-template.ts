import { z } from 'zod'

export const REGISTRY_THANK_YOU_PLACEHOLDERS = [
  '{name}',
  '{amount}',
  '{gift}',
  '{couple}',
] as const

export const DEFAULT_REGISTRY_THANK_YOU_TEMPLATE = [
  'Hi {name},',
  '',
  'Thank you for your generous gift of {amount} toward {gift}. It means so much to us.',
  '',
  'With love,',
  '{couple}',
].join('\n')

export const registryThankYouTemplateSchema = z
  .string()
  .trim()
  .min(1, 'Enter a thank-you message.')
  .max(2000, 'Keep the template to 2,000 characters or fewer.')

export const registryThankYouMessageSchema = z
  .string()
  .trim()
  .min(1, 'Enter a thank-you message.')
  .max(5000, 'Keep the message to 5,000 characters or fewer.')

export type RegistryThankYouValues = {
  name: string
  amount: string
  gift: string
  couple: string
}

export function renderRegistryThankYouTemplate(
  template: string,
  values: RegistryThankYouValues,
): string {
  return template.replace(
    /\{(name|amount|gift|couple)\}/g,
    (_, key: keyof RegistryThankYouValues) => values[key],
  )
}
