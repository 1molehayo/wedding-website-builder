import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import {
  CaretDownIcon,
  CaretUpIcon,
  CopySimpleIcon,
  DotsSixVerticalIcon,
  PlusIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { PageActionBar } from '@/components/admin/page-action-bar'
import { Button } from '@/components/ui/button'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PhotoDropzone } from '@/components/ui/photo-dropzone'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'
import {
  getPageBlocks,
  getSignedPhotoUrl,
  updatePageBlocks,
  uploadPageBlockImage,
} from '@/lib/page-blocks/settings'
import {
  PAGE_BLOCK_TYPES,
  PAGE_BLOCK_TYPE_LABELS,
  createDefaultBlock,
} from '@/lib/page-blocks/types'
import type { PageBlock, PageBlockType } from '@/lib/page-blocks/types'
import type { PageBlockFieldErrors } from '@/lib/page-blocks/validation'
import { validatePageBlocksClient } from '@/lib/page-blocks/validation'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/admin/pages')({
  beforeLoad: ({ context }) => {
    if (!context.session?.wedding) {
      throw redirect({ to: '/admin/onboarding' })
    }
  },
  loader: () => getPageBlocks(),
  component: AdminPagesPage,
})

async function fileToBase64(file: File) {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

function moveBlock(blocks: PageBlock[], from: number, to: number) {
  if (to < 0 || to >= blocks.length) return blocks
  const next = [...blocks]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

function duplicateBlock(block: PageBlock): PageBlock {
  return {
    ...block,
    id: crypto.randomUUID(),
    fields: structuredClone(block.fields),
  } as PageBlock
}

function BlockEditor({
  block,
  onChange,
  fieldErrors,
}: {
  block: PageBlock
  onChange: (block: PageBlock) => void
  fieldErrors?: Record<string, string>
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadPreview = async () => {
      const imagePath =
        block.type === 'image' || block.type === 'hero'
          ? block.fields.imagePath
          : null
      if (!imagePath) {
        setPreviewUrl(null)
        return
      }
      try {
        const url = await getSignedPhotoUrl({
          data: { imagePath },
        })
        if (!cancelled) setPreviewUrl(url)
      } catch {
        if (!cancelled) setPreviewUrl(null)
      }
    }

    void loadPreview()
    return () => {
      cancelled = true
    }
  }, [block])

  const uploadSelectedFile = async (file: File, successMessage: string) => {
    setUploadError(null)
    setIsUploading(true)
    try {
      const dataBase64 = await fileToBase64(file)
      const uploaded = await uploadPageBlockImage({
        data: {
          name: file.name,
          type: file.type,
          dataBase64,
        },
      })
      onChange({
        ...block,
        fields: {
          ...block.fields,
          imagePath: uploaded.path,
        },
      })
      setPreviewUrl(uploaded.signedUrl)
      toast.success(successMessage)
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Unable to upload image.',
      )
    } finally {
      setIsUploading(false)
    }
  }

  if (block.type === 'hero') {
    return (
      <div className="space-y-4">
        <Field>
          <Field.Label>Title override</Field.Label>
          <Field.Control>
            <Input
              value={block.fields.title ?? ''}
              onChange={(event) =>
                onChange({
                  ...block,
                  fields: {
                    ...block.fields,
                    title: event.target.value || null,
                  },
                })
              }
              placeholder="Leave empty to use groom & bride names"
            />
          </Field.Control>
        </Field>
        <Field>
          <Field.Label>Tagline</Field.Label>
          <Field.Control>
            <Input
              value={block.fields.tagline ?? ''}
              onChange={(event) =>
                onChange({
                  ...block,
                  fields: {
                    ...block.fields,
                    tagline: event.target.value || null,
                  },
                })
              }
            />
          </Field.Control>
        </Field>
        <Field invalid={!!uploadError}>
          <Field.Label>Background photo</Field.Label>
          <PhotoDropzone
            hint="Optional. Skip to keep the theme background."
            error={uploadError ?? undefined}
            isUploading={isUploading}
            replaceLabel={
              block.fields.imagePath ? 'Drop a photo to replace' : undefined
            }
            onFiles={(files) => {
              const file = files[0]
              if (file) void uploadSelectedFile(file, 'Hero background uploaded.')
            }}
          />
        </Field>
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Hero background preview"
            className="border-border max-h-56 w-full rounded-lg border object-cover"
          />
        ) : null}
        {block.fields.imagePath ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-fit"
            onClick={() => {
              onChange({
                ...block,
                fields: { ...block.fields, imagePath: null },
              })
              setPreviewUrl(null)
            }}
          >
            <TrashIcon />
            Remove background photo
          </Button>
        ) : null}
      </div>
    )
  }

  if (block.type === 'story') {
    const titleInvalid = !!fieldErrors?.title
    const bodyInvalid = !!fieldErrors?.body
    return (
      <div className="space-y-4">
        <Field invalid={titleInvalid}>
          <Field.Label required>Title</Field.Label>
          <Field.Control>
            <Input
              value={block.fields.title}
              invalid={titleInvalid}
              onChange={(event) =>
                onChange({
                  ...block,
                  fields: { ...block.fields, title: event.target.value },
                })
              }
            />
          </Field.Control>
          {titleInvalid ? <Field.Error>{fieldErrors.title}</Field.Error> : null}
        </Field>
        <Field invalid={bodyInvalid}>
          <Field.Label required>Body</Field.Label>
          <Field.Control>
            <Textarea
              rows={5}
              value={block.fields.body}
              invalid={bodyInvalid}
              onChange={(event) =>
                onChange({
                  ...block,
                  fields: { ...block.fields, body: event.target.value },
                })
              }
            />
          </Field.Control>
          {bodyInvalid ? <Field.Error>{fieldErrors.body}</Field.Error> : null}
        </Field>
      </div>
    )
  }

  if (block.type === 'image') {
    const imageInvalid = !!fieldErrors?.imagePath
    return (
      <div className="space-y-4">
        <Field invalid={imageInvalid || !!uploadError}>
          <Field.Label required>Image</Field.Label>
          <PhotoDropzone
            error={uploadError ?? fieldErrors?.imagePath}
            isUploading={isUploading}
            replaceLabel={
              block.fields.imagePath ? 'Drop a photo to replace' : undefined
            }
            onFiles={(files) => {
              const file = files[0]
              if (file) void uploadSelectedFile(file, 'Image uploaded.')
            }}
          />
        </Field>
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={block.fields.title ?? 'Block preview'}
            className="border-border max-h-56 w-full rounded-lg border object-cover"
          />
        ) : null}
        <Field>
          <Field.Label>Title</Field.Label>
          <Field.Control>
            <Input
              value={block.fields.title ?? ''}
              onChange={(event) =>
                onChange({
                  ...block,
                  fields: {
                    ...block.fields,
                    title: event.target.value || null,
                  },
                })
              }
            />
          </Field.Control>
        </Field>
        <Field>
          <Field.Label>Description</Field.Label>
          <Field.Control>
            <Textarea
              rows={3}
              value={block.fields.description ?? ''}
              onChange={(event) =>
                onChange({
                  ...block,
                  fields: {
                    ...block.fields,
                    description: event.target.value || null,
                  },
                })
              }
            />
          </Field.Control>
        </Field>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={block.fields.showVenue}
          onChange={(event) =>
            onChange({
              ...block,
              fields: {
                ...block.fields,
                showVenue: event.target.checked,
              },
            })
          }
        />
        Show venue from wedding settings
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={block.fields.showDressCode}
          onChange={(event) =>
            onChange({
              ...block,
              fields: {
                ...block.fields,
                showDressCode: event.target.checked,
              },
            })
          }
        />
        Show dress code from wedding settings
      </label>
    </div>
  )
}

function AdminPagesPage() {
  const initialBlocks = Route.useLoaderData()
  const router = useRouter()
  const [blocks, setBlocks] = useState<PageBlock[]>(initialBlocks)
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<PageBlockFieldErrors>({})
  const dragIdRef = useRef<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragEnabled, setDragEnabled] = useState(false)

  useEffect(() => {
    setBlocks(initialBlocks)
    setFieldErrors({})
  }, [initialBlocks])

  const toggleOpen = (id: string) => {
    setOpenIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearBlockFieldError = (blockId: string, field: string) => {
    setFieldErrors((current) => {
      if (!(blockId in current)) return current
      const block = current[blockId]
      if (!(field in block)) return current
      const nextBlock = { ...block }
      delete nextBlock[field]
      const next = { ...current }
      if (Object.keys(nextBlock).length === 0) delete next[blockId]
      else next[blockId] = nextBlock
      return next
    })
  }

  const onSave = async () => {
    const validated = validatePageBlocksClient(blocks)
    if (!validated.ok) {
      setFieldErrors(validated.fieldErrors)
      const invalidIds = Object.keys(validated.fieldErrors)
      if (invalidIds.length > 0) {
        setOpenIds((current) => {
          const next = new Set(current)
          for (const id of invalidIds) next.add(id)
          return next
        })
      }
      toast.error(validated.message)
      return
    }

    setIsSaving(true)
    try {
      const wedding = await updatePageBlocks({
        data: { page_blocks: validated.blocks },
      })
      setBlocks(wedding.page_blocks)
      setFieldErrors({})
      toast.success('Page content published.')
      await router.invalidate()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Unable to save page content.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const onAdd = (type: PageBlockType) => {
    const block = createDefaultBlock(type)
    setBlocks((current) => [...current, block])
    setOpenIds((current) => new Set(current).add(block.id))
  }

  const onDuplicate = (id: string) => {
    const block = blocks.find((item) => item.id === id)
    if (!block) return
    const copy = duplicateBlock(block)
    setBlocks((current) => {
      const index = current.findIndex((item) => item.id === id)
      const next = [...current]
      next.splice(index + 1, 0, copy)
      return next
    })
    setOpenIds((current) => new Set(current).add(copy.id))
  }

  const onRemove = (id: string) => {
    setBlocks((current) => current.filter((block) => block.id !== id))
    setOpenIds((current) => {
      const next = new Set(current)
      next.delete(id)
      return next
    })
    setFieldErrors((current) => {
      if (!(id in current)) return current
      const next = { ...current }
      delete next[id]
      return next
    })
    toast.success('Block removed.')
  }

  const allOpen = blocks.length > 0 && blocks.every((block) => openIds.has(block.id))

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="admin-page-title">Page content</h1>
          <p className="text-foreground-secondary mt-2 text-sm">
            Sections on the public home page. Drag to reorder, then publish.
          </p>
        </div>
        {blocks.length > 0 ? (
          <button
            type="button"
            className="text-foreground-secondary hover:text-foreground text-sm"
            onClick={() => {
              if (allOpen) setOpenIds(new Set())
              else setOpenIds(new Set(blocks.map((block) => block.id)))
            }}
          >
            {allOpen ? 'Collapse all' : 'Expand all'}
          </button>
        ) : null}
      </div>

      <div className="space-y-2">
        {blocks.map((block) => {
          const open = openIds.has(block.id)
          const hasError = Boolean(fieldErrors[block.id])
          return (
            <div
              key={block.id}
              draggable={dragEnabled}
              onDragStart={(event) => {
                dragIdRef.current = block.id
                setDraggingId(block.id)
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('text/plain', block.id)
              }}
              onDragEnd={() => {
                dragIdRef.current = null
                setDraggingId(null)
                setDragEnabled(false)
              }}
              onDragOver={(event) => {
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
              }}
              onDrop={(event) => {
                event.preventDefault()
                const fromId = dragIdRef.current
                if (!fromId || fromId === block.id) return
                setBlocks((current) => {
                  const from = current.findIndex((item) => item.id === fromId)
                  const to = current.findIndex((item) => item.id === block.id)
                  return moveBlock(current, from, to)
                })
              }}
              className={cn(
                'bg-surface border-border rounded-xl border',
                draggingId === block.id && 'opacity-50',
                hasError && 'border-error',
              )}
            >
              <div className="flex items-center gap-1 px-2 py-2">
                <button
                  type="button"
                  className="text-foreground-secondary hover:text-foreground inline-flex size-8 shrink-0 cursor-grab items-center justify-center rounded-lg active:cursor-grabbing"
                  aria-label="Drag to reorder"
                  onMouseDown={() => setDragEnabled(true)}
                  onTouchStart={() => setDragEnabled(true)}
                >
                  <DotsSixVerticalIcon className="size-4" />
                </button>
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 px-1 py-1 text-left"
                  onClick={() => toggleOpen(block.id)}
                  aria-expanded={open}
                >
                  <span className="truncate font-medium">
                    {PAGE_BLOCK_TYPE_LABELS[block.type]}
                  </span>
                </button>
                <DropdownMenu
                  label="Block actions"
                  items={[
                    {
                      id: 'duplicate',
                      label: 'Duplicate',
                      icon: <CopySimpleIcon />,
                      onSelect: () => onDuplicate(block.id),
                    },
                    {
                      id: 'remove',
                      label: 'Remove',
                      icon: <TrashIcon />,
                      tone: 'destructive',
                      onSelect: () => onRemove(block.id),
                    },
                  ]}
                />
                <button
                  type="button"
                  className="text-foreground-secondary hover:text-foreground inline-flex size-8 shrink-0 items-center justify-center rounded-lg"
                  aria-label={open ? 'Collapse block' : 'Expand block'}
                  onClick={() => toggleOpen(block.id)}
                >
                  {open ? (
                    <CaretUpIcon className="size-4" />
                  ) : (
                    <CaretDownIcon className="size-4" />
                  )}
                </button>
              </div>
              {open ? (
                <div className="border-border border-t px-4 py-4">
                  <BlockEditor
                    block={block}
                    fieldErrors={fieldErrors[block.id]}
                    onChange={(next) => {
                      setBlocks((current) =>
                        current.map((item) =>
                          item.id === next.id ? next : item,
                        ),
                      )
                      if (next.type === 'story') {
                        if (next.fields.title.trim()) {
                          clearBlockFieldError(next.id, 'title')
                        }
                        if (next.fields.body.trim()) {
                          clearBlockFieldError(next.id, 'body')
                        }
                      }
                      if (
                        next.type === 'image' &&
                        next.fields.imagePath.trim()
                      ) {
                        clearBlockFieldError(next.id, 'imagePath')
                      }
                    }}
                  />
                </div>
              ) : null}
            </div>
          )
        })}

        <DropdownMenu
          label="Add item"
          align="start"
          className="w-full"
          trigger={
            <Button
              type="button"
              variant="outline"
              className="w-full border-dashed"
            >
              <PlusIcon />
              Add item
            </Button>
          }
          items={PAGE_BLOCK_TYPES.map((type) => ({
            id: type,
            label: PAGE_BLOCK_TYPE_LABELS[type],
            onSelect: () => onAdd(type),
          }))}
        />
      </div>

      <PageActionBar>
        <Button type="button" size="md" onClick={onSave} isLoading={isSaving}>
          Publish
        </Button>
      </PageActionBar>
    </div>
  )
}
