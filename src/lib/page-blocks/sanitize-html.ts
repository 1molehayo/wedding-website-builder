import DOMPurify from 'isomorphic-dompurify'

/** Allowed tags for the text-content block (H4–H6, no H1–H3 or media). */
const ALLOWED_TAGS = [
  'h4',
  'h5',
  'h6',
  'p',
  'br',
  'strong',
  'em',
  'u',
  'ul',
  'ol',
  'li',
  'blockquote',
  'a',
]

const ALLOWED_ATTR = ['href', 'target', 'rel', 'class', 'style']

/**
 * Strip disallowed markup from TipTap HTML before save and before public render.
 * Alignment may use inline text-align styles only.
 */
export function sanitizeTextBlockHtml(html: string): string {
  const cleaned = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  })

  return cleaned
    .replace(/\sstyle="(?![^"]*text-align)[^"]*"/gi, '')
    .replace(/\sstyle="([^"]*)"/gi, (_match, styles: string) => {
      const allowed = styles
        .split(';')
        .map((part) => part.trim())
        .filter((part) => /^text-align\s*:/i.test(part))
      if (allowed.length === 0) return ''
      return ` style="${allowed.join('; ')}"`
    })
}

export function textBlockHasContent(html: string): boolean {
  const text = sanitizeTextBlockHtml(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .trim()
  return text.length > 0
}
