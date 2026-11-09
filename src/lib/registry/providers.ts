/** Allowed external_store provider slugs. New stores are an allow-list entry, not a migration. */
export const REGISTRY_PROVIDERS = ['amazon'] as const

export type RegistryProvider = (typeof REGISTRY_PROVIDERS)[number]

export const REGISTRY_PROVIDER_LABELS: Record<RegistryProvider, string> = {
  amazon: 'Amazon',
}

export function isRegistryProvider(value: string): value is RegistryProvider {
  return (REGISTRY_PROVIDERS as readonly string[]).includes(value)
}

export function registryProviderLabel(provider: string): string {
  if (isRegistryProvider(provider)) return REGISTRY_PROVIDER_LABELS[provider]
  return provider
}
