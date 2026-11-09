import { describe, expect, it } from 'vitest'
import {
  amazonRegistryUrlError,
  isLikelyAmazonRegistryUrl,
  isPlainAmazonProductUrl,
} from './amazon-url'

describe('amazon.com wedding registry URL checks', () => {
  it('accepts live amazon.com share and registry paths', () => {
    // From live Amazon.com wedding pages
    expect(
      isLikelyAmazonRegistryUrl(
        'https://www.amazon.com/wedding/share/LisaandEvan',
      ),
    ).toBe(true)
    expect(
      isLikelyAmazonRegistryUrl(
        'https://www.amazon.com/wedding/registry/JUAVTEYXIA5A',
      ),
    ).toBe(true)
    // Documented Share / custom slug style
    expect(
      isLikelyAmazonRegistryUrl('https://www.amazon.com/wedding/your-names'),
    ).toBe(true)
    expect(
      isLikelyAmazonRegistryUrl(
        'https://www.amazon.com/registry/wedding/SmithJones2025',
      ),
    ).toBe(true)
    expect(
      amazonRegistryUrlError(
        'https://www.amazon.com/wedding/registry/JUAVTEYXIA5A',
      ),
    ).toBeNull()
  })

  it('rejects regular product links', () => {
    const product = 'https://www.amazon.com/dp/B0EXAMPLE12'
    expect(isPlainAmazonProductUrl(product)).toBe(true)
    expect(amazonRegistryUrlError(product)).toMatch(/regular product link/i)
  })

  it('rejects non-amazon.com domains including other Amazon countries', () => {
    expect(
      amazonRegistryUrlError(
        'https://www.amazon.es/wedding/registry/ABC123',
      ),
    ).toMatch(/Only amazon\.com links are allowed/i)
    expect(
      amazonRegistryUrlError(
        'https://www.amazon.co.uk/wedding/share/couple',
      ),
    ).toMatch(/Only amazon\.com links are allowed/i)
    expect(
      amazonRegistryUrlError('https://example.com/wedding/registry/x'),
    ).toMatch(/Only amazon\.com links are allowed/i)
  })

  it('rejects the wedding hub page and empty', () => {
    expect(isLikelyAmazonRegistryUrl('https://www.amazon.com/wedding')).toBe(
      false,
    )
    expect(
      isLikelyAmazonRegistryUrl('https://www.amazon.com/wedding/find'),
    ).toBe(false)
    expect(amazonRegistryUrlError(null)).toBeNull()
  })
})
