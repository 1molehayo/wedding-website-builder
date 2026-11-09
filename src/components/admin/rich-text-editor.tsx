import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { sanitizeTextBlockHtml } from '@/lib/page-blocks/sanitize-html'
import { cn } from '@/lib/utils'

type RichTextEditorProps = {
  value: string
  onChange: (html: string) => void
  invalid?: boolean
  placeholder?: string
}

export function RichTextEditor({
  value,
  onChange,
  invalid,
  placeholder = 'Write your content…',
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [4, 5, 6] },
        horizontalRule: false,
        code: false,
        codeBlock: false,
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class:
          'prose prose-sm md:prose-base max-w-none min-h-40 px-3 py-2 focus:outline-none',
      },
    },
    onUpdate: ({ editor: next }) => {
      onChange(sanitizeTextBlockHtml(next.getHTML()))
    },
  })

  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    const next = value || ''
    if (sanitizeTextBlockHtml(current) === sanitizeTextBlockHtml(next)) return
    editor.commands.setContent(next, { emitUpdate: false })
  }, [editor, value])

  if (!editor) return null

  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL', previous ?? 'https://')
    if (url === null) return
    const trimmed = url.trim()
    if (!trimmed) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: trimmed })
      .run()
  }

  return (
    <div
      className={cn(
        'border-border bg-surface overflow-hidden rounded-xl border',
        invalid && 'border-error',
      )}
    >
      <div className="border-border flex flex-wrap gap-1 border-b p-2">
        <ToolbarButton
          label="H4"
          active={editor.isActive('heading', { level: 4 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 4 }).run()
          }
        />
        <ToolbarButton
          label="H5"
          active={editor.isActive('heading', { level: 5 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 5 }).run()
          }
        />
        <ToolbarButton
          label="H6"
          active={editor.isActive('heading', { level: 6 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 6 }).run()
          }
        />
        <ToolbarButton
          label="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          label="Italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          label="Underline"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <ToolbarButton
          label="List"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          label="Numbered"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          label="Quote"
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <ToolbarButton
          label="Link"
          active={editor.isActive('link')}
          onClick={setLink}
        />
        <ToolbarButton
          label="Left"
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        />
        <ToolbarButton
          label="Center"
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        />
        <ToolbarButton
          label="Right"
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}

function ToolbarButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      size="xs"
      variant={active ? 'primary' : 'outline'}
      onClick={onClick}
    >
      {label}
    </Button>
  )
}
