/**
 * Guests must open an Amazon.com *wedding registry* link so shipping goes to
 * the couple’s registry address. A plain product page does not do that.
 *
 * Host: amazon.com only (US wedding registry / group gifting). Not amazon.es,
 * amazon.co.uk, or other country sites.
 *
 * Path shapes confirmed from live Amazon.com wedding pages / share flows:
 * - https://www.amazon.com/wedding/share/{slug}
 * - https://www.amazon.com/wedding/registry/{id}
 * - https://www.amazon.com/wedding/{custom-slug}  (Share link style)
 * - https://www.amazon.com/registry/wedding/{id}  (older / alternate share form)
 */

const AMAZON_COM_HOST = /^(www\.)?amazon\.com$/i

/**
 * Marketing / non-registry first segments under /wedding/…
 * (hub pages, not a couple’s shareable list).
 */
const WEDDING_HUB_SEGMENTS = new Set([
  'find',
  'benefits',
  'help',
  'create',
  'home',
  'about',
  'gifts',
])

const PLAIN_PRODUCT_PATH = /\/(dp|gp\/product|gp\/aw\/d)\/[A-Z0-9]{8,}/i

export function isAmazonComHost(url: string): boolean {
  try {
    return AMAZON_COM_HOST.test(new URL(url).hostname)
  } catch {
    return false
  }
}

/** @deprecated Use isAmazonComHost — only amazon.com is accepted. */
export function isAmazonHost(url: string): boolean {
  return isAmazonComHost(url)
}

/** True when the URL looks like an Amazon.com wedding-registry share/list link. */
export function isLikelyAmazonRegistryUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (!AMAZON_COM_HOST.test(parsed.hostname)) return false

    const path = parsed.pathname.replace(/\/+$/, '') || '/'

    // Live share / registry id forms
    if (/^\/wedding\/share\/[^/]+$/i.test(path)) return true
    if (/^\/wedding\/registry\/[^/]+$/i.test(path)) return true
    if (/^\/registry\/wedding\/[^/]+$/i.test(path)) return true

    // Custom share slug: /wedding/{names} (Wedibox / Amazon Share examples)
    const custom = path.match(/^\/wedding\/([^/]+)$/i)
    if (custom) {
      const segment = custom[1].toLowerCase()
      if (WEDDING_HUB_SEGMENTS.has(segment)) return false
      if (segment === 'share' || segment === 'registry') return false
      return true
    }

    // Item deep links sometimes keep registryId in the query
    if (/[?&]registryId=/i.test(parsed.search) && /^\/wedding\b/i.test(path)) {
      return true
    }

    return false
  } catch {
    return false
  }
}

/** True when this is clearly a normal product page, not the registry. */
export function isPlainAmazonProductUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (!AMAZON_COM_HOST.test(parsed.hostname)) return false
    if (isLikelyAmazonRegistryUrl(url)) return false
    return PLAIN_PRODUCT_PATH.test(parsed.pathname)
  } catch {
    return false
  }
}

/**
 * Returns an error message when the Amazon gift link should be rejected,
 * or null when empty / acceptable.
 */
export function amazonRegistryUrlError(url: string | null): string | null {
  if (!url) return null
  if (!isAmazonComHost(url)) {
    return 'Only amazon.com links are allowed. Do not use amazon.es, amazon.co.uk, or any other Amazon site.'
  }
  if (isPlainAmazonProductUrl(url)) {
    return 'Do not use a regular product link such as amazon.com/dp/…. Open this gift on your amazon.com wedding registry and copy that link instead.'
  }
  if (!isLikelyAmazonRegistryUrl(url)) {
    return 'This is not a wedding registry link. On amazon.com, open your wedding list, use Share or open the gift there, then paste that amazon.com link.'
  }
  return null
}
