import { describe, expect, it } from 'vitest'
import {
  sanitizeTextBlockHtml,
  textBlockHasContent,
} from '@/lib/page-blocks/sanitize-html'

describe('sanitizeTextBlockHtml', () => {
  it('keeps allowed markup', () => {
    expect(
      sanitizeTextBlockHtml(
        '<p style="text-align: center">Hello <strong>world</strong></p>',
      ),
    ).toBe('<p style="text-align: center">Hello <strong>world</strong></p>')
  })

  it('strips scripts and event handlers', () => {
    expect(
      sanitizeTextBlockHtml(
        '<p onclick="alert(1)">Hi</p><script>alert(2)</script>',
      ),
    ).toBe('<p>Hi</p>')
  })

  it('keeps safe links and drops javascript hrefs', () => {
    expect(
      sanitizeTextBlockHtml(
        '<a href="https://example.com" target="_blank">x</a>',
      ),
    ).toBe('<a href="https://example.com" target="_blank">x</a>')
    expect(sanitizeTextBlockHtml('<a href="javascript:alert(1)">x</a>')).toBe(
      '<a>x</a>',
    )
  })

  it('detects empty content', () => {
    expect(textBlockHasContent('<p></p>')).toBe(false)
    expect(textBlockHasContent('<p>Hi</p>')).toBe(true)
  })
})
