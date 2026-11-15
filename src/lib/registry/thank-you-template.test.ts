import { describe, expect, it } from 'vitest'
import {
  DEFAULT_REGISTRY_THANK_YOU_TEMPLATE,
  renderRegistryThankYouTemplate,
} from '@/lib/registry/thank-you-template'

describe('registry thank-you template', () => {
  it('replaces every supported placeholder, including repeats', () => {
    expect(
      renderRegistryThankYouTemplate(
        '{name}: {amount}, {gift}, {couple}. Thank you, {name}.',
        {
          name: 'Amara',
          amount: '100 USD',
          gift: 'the honeymoon fund',
          couple: 'Lillian & Marvelous',
        },
      ),
    ).toBe(
      'Amara: 100 USD, the honeymoon fund, Lillian & Marvelous. Thank you, Amara.',
    )
  })

  it('renders the default template without unresolved placeholders', () => {
    const result = renderRegistryThankYouTemplate(
      DEFAULT_REGISTRY_THANK_YOU_TEMPLATE,
      {
        name: 'Amara',
        amount: '100 USD',
        gift: 'the honeymoon fund',
        couple: 'Lillian & Marvelous',
      },
    )

    expect(result).toContain('Hi Amara')
    expect(result).toContain('100 USD toward the honeymoon fund')
    expect(result).not.toMatch(/\{(name|amount|gift|couple)\}/)
  })
})
