import type { TextPageBlock } from '@/lib/page-blocks/types'
import { publicSectionId } from '@/lib/page-blocks/types'
import {
  sanitizeTextBlockHtml,
  textBlockHasContent,
} from '@/lib/page-blocks/sanitize-html'

export function TextBlock({ block }: { block: TextPageBlock }) {
  const title = block.fields.title.trim()
  const html = sanitizeTextBlockHtml(block.fields.content)
  const showContent = textBlockHasContent(html)

  if (!title && !showContent) return null

  return (
    <section
      id={publicSectionId(block)}
      className="public-section mx-auto max-w-3xl scroll-mt-28 px-6 sm:scroll-mt-24"
    >
      <div className="public-reveal">
        {title ? <h2 className="public-section-title">{title}</h2> : null}
        {showContent ? (
          <div
            className="text-content-prose text-foreground-secondary mt-6 text-base leading-relaxed md:text-lg [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:border-border [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:italic [&_h4]:text-foreground [&_h4]:font-serif [&_h4]:text-2xl [&_h4]:italic [&_h5]:text-foreground [&_h5]:font-serif [&_h5]:text-xl [&_h5]:italic [&_h6]:text-foreground [&_h6]:text-sm [&_h6]:font-medium [&_h6]:tracking-[0.12em] [&_h6]:uppercase [&_li]:my-1 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-3 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-5"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : null}
      </div>
    </section>
  )
}
