import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import {
  ArrowCounterClockwiseIcon,
  CaretDownIcon,
  CaretUpIcon,
  ClockCounterClockwiseIcon,
  CopySimpleIcon,
  DotsSixVerticalIcon,
  EyeIcon,
  FloppyDiskIcon,
  PlusIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import {
  PageActionBar,
  formatLastUpdated,
} from '@/components/admin/page-action-bar'
import { RichTextEditor } from '@/components/admin/rich-text-editor'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PhotoDropzone } from '@/components/ui/photo-dropzone'
import { Select } from '@/components/ui/select'
import { SideDrawer } from '@/components/ui/side-drawer'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'
import { prepareImageForUpload } from '@/lib/media/compress-image'
import {
  ALLOWED_VIDEO_MIME_TYPES,
  MAX_MEDIA_UPLOAD_BYTES,
  MAX_VIDEO_UPLOAD_BYTES,
} from '@/lib/media/constants'
import { uploadFileToSignedUrl } from '@/lib/media/upload-client'
import {
  confirmPageBlockUpload,
  createPageBlockUpload,
  getSignedPhotoUrl,
  listPageContentVersions,
  publishPageBlocks,
  restorePageContentVersion,
  savePageBlocksDraft,
} from '@/lib/page-blocks/settings'
import { adminQueryKeys, pageBlocksQueryOptions } from '@/lib/query/admin-queries'
import {
  PAGE_BLOCK_TYPES,
  PAGE_BLOCK_TYPE_LABELS,
  NAV_LABEL_MAX_LENGTH,
  createDefaultBlock,
  isPageContentLive,
  pageBlocksEqual,
} from '@/lib/page-blocks/types'
import type {
  BlockNavFields,
  PageBlock,
  PageBlockType,
  PageContentEditorData,
  PageContentVersion,
} from '@/lib/page-blocks/types'
import type { PageBlockFieldErrors } from '@/lib/page-blocks/validation'
import { validatePageBlocksClient } from '@/lib/page-blocks/validation'
import { cn } from '@/lib/utils'
import { Route as AdminRoute } from './route'

export const Route = createFileRoute('/admin/pages')({
  beforeLoad: ({ context }) => {
    if (!context.session?.wedding) {
      throw redirect({ to: '/admin/onboarding' })
    }
  },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(pageBlocksQueryOptions()),
  component: AdminPagesPage,
})

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

function withNavPatch(
  block: Exclude<PageBlock, { type: 'hero' }>,
  patch: Partial<BlockNavFields>,
): PageBlock {
  switch (block.type) {
    case 'story':
      return { ...block, fields: { ...block.fields, ...patch } }
    case 'text':
      return { ...block, fields: { ...block.fields, ...patch } }
    case 'image':
      return { ...block, fields: { ...block.fields, ...patch } }
    case 'details':
      return { ...block, fields: { ...block.fields, ...patch } }
  }
}

function NavLabelFields({
  block,
  onChange,
}: {
  block: Exclude<PageBlock, { type: 'hero' }>
  onChange: (block: PageBlock) => void
}) {
  const useTitle = block.fields.useTitleInNav

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={useTitle}
          onChange={(event) =>
            onChange(
              withNavPatch(block, { useTitleInNav: event.target.checked }),
            )
          }
        />
        Use title in nav
      </label>
      {useTitle ? (
        <p className="text-foreground-secondary text-sm">
          The menu shows this title, and shortens it after{' '}
          {NAV_LABEL_MAX_LENGTH} characters.
        </p>
      ) : (
        <Field>
          <Field.Label>Nav label</Field.Label>
          <Field.Control>
            <Input
              value={block.fields.navLabel ?? ''}
              onChange={(event) =>
                onChange(
                  withNavPatch(block, {
                    navLabel: event.target.value || null,
                  }),
                )
              }
              placeholder="Short name for the menu"
            />
          </Field.Control>
          <Field.Description>
            Shown in the menu instead of the title. Shortened after{' '}
            {NAV_LABEL_MAX_LENGTH} characters.
          </Field.Description>
        </Field>
      )}
    </div>
  )
}

type HeroMediaPathField =
  | 'imagePath'
  | 'mobileImagePath'
  | 'videoPath'
  | 'mobileVideoPath'

function HeroMediaUploadField({
  label,
  path,
  previewUrl,
  mediaKind,
  required,
  isUploading,
  error,
  onUpload,
  onRemove,
}: {
  label: string
  path: string | null
  previewUrl?: string
  mediaKind: 'image' | 'video'
  required?: boolean
  isUploading: boolean
  error?: string
  onUpload: (file: File) => void
  onRemove: () => void
}) {
  return (
    <Field invalid={!!error}>
      <Field.Label required={required}>{label}</Field.Label>
      <PhotoDropzone
        kind={mediaKind === 'video' ? 'video' : 'photo'}
        accept={
          mediaKind === 'video' ? ALLOWED_VIDEO_MIME_TYPES : undefined
        }
        maxBytes={
          mediaKind === 'video'
            ? MAX_VIDEO_UPLOAD_BYTES
            : MAX_MEDIA_UPLOAD_BYTES
        }
        hint={
          mediaKind === 'video'
            ? 'MP4 or WebM. Upload a web-optimised file; videos are not compressed in the browser.'
            : 'Images are resized and compressed before upload.'
        }
        error={error}
        isUploading={isUploading}
        replaceLabel={
          path
            ? `Drop a ${mediaKind} to replace`
            : `Drop a ${mediaKind} here, or click to browse`
        }
        onFiles={(files) => onUpload(files[0])}
      />
      {previewUrl ? (
        mediaKind === 'video' ? (
          <video
            src={previewUrl}
            controls
            muted
            preload="metadata"
            className="border-border mt-3 max-h-56 w-full rounded-lg border object-cover"
          />
        ) : (
          <img
            src={previewUrl}
            alt={`${label} preview`}
            className="border-border mt-3 max-h-56 w-full rounded-lg border object-cover"
          />
        )
      ) : null}
      {path ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-3 w-fit"
          onClick={onRemove}
        >
          <TrashIcon />
          Remove {label.toLowerCase()}
        </Button>
      ) : null}
    </Field>
  )
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
  const [previewUrls, setPreviewUrls] = useState<
    Partial<Record<HeroMediaPathField, string>>
  >({})
  const [uploadingField, setUploadingField] =
    useState<HeroMediaPathField | null>(null)
  const [uploadError, setUploadError] = useState<{
    field: HeroMediaPathField
    message: string
  } | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadPreviews = async () => {
      const paths: Array<[HeroMediaPathField, string | null]> =
        block.type === 'hero'
          ? [
              ['imagePath', block.fields.imagePath],
              ['mobileImagePath', block.fields.mobileImagePath],
              ['videoPath', block.fields.videoPath],
              ['mobileVideoPath', block.fields.mobileVideoPath],
            ]
          : block.type === 'image'
            ? [['imagePath', block.fields.imagePath]]
            : []

      const entries = await Promise.all(
        paths.map(async ([field, path]) => {
          if (!path) return [field, null] as const
          try {
            const url = await getSignedPhotoUrl({
              data: { imagePath: path },
            })
            return [field, url] as const
          } catch {
            return [field, null] as const
          }
        }),
      )
      if (cancelled) return
      setPreviewUrls(
        Object.fromEntries(entries.filter((entry) => Boolean(entry[1]))),
      )
    }

    void loadPreviews()
    return () => {
      cancelled = true
    }
  }, [block])

  const uploadSelectedFile = async (
    file: File,
    successMessage: string,
    field: HeroMediaPathField,
    mediaKind: 'image' | 'video',
  ) => {
    setUploadError(null)
    setUploadingField(field)
    try {
      const prepared =
        mediaKind === 'image' ? await prepareImageForUpload(file) : file
      const maxBytes =
        mediaKind === 'video'
          ? MAX_VIDEO_UPLOAD_BYTES
          : MAX_MEDIA_UPLOAD_BYTES
      if (prepared.size > maxBytes) {
        throw new Error(
          `${mediaKind === 'video' ? 'Video must be 25MB' : 'Image must be 12MB'} or smaller${mediaKind === 'image' ? ' after compression' : ''}.`,
        )
      }
      const signed = await createPageBlockUpload({
        data: {
          name: prepared.name,
          type: prepared.type,
          byteSize: prepared.size,
          mediaKind,
        },
      })
      await uploadFileToSignedUrl(signed.signedUrl, prepared)
      const uploaded = await confirmPageBlockUpload({
        data: { path: signed.path },
      })
      if (block.type === 'hero') {
        onChange({
          ...block,
          fields: { ...block.fields, [field]: uploaded.path },
        })
      } else if (block.type === 'image' && field === 'imagePath') {
        onChange({
          ...block,
          fields: { ...block.fields, imagePath: uploaded.path },
        })
      }
      if (uploaded.signedUrl) {
        setPreviewUrls((current) => ({
          ...current,
          [field]: uploaded.signedUrl!,
        }))
      }
      toast.success(successMessage)
    } catch (err) {
      setUploadError({
        field,
        message:
          err instanceof Error ? err.message : `Unable to upload ${mediaKind}.`,
      })
    } finally {
      setUploadingField(null)
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
        <Field>
          <Field.Label>Background type</Field.Label>
          <Field.Control>
            <Select
              value={block.fields.mediaType}
              onChange={(event) =>
                onChange({
                  ...block,
                  fields: {
                    ...block.fields,
                    mediaType: event.target.value as 'image' | 'video',
                  },
                })
              }
            >
              <option value="image">Image</option>
              <option value="video">Video</option>
            </Select>
          </Field.Control>
          <Field.Description>
            Desktop is the default. Mobile media is optional and falls back to
            desktop.
          </Field.Description>
        </Field>

        {block.fields.mediaType === 'image' ? (
          <>
            <HeroMediaUploadField
              label="Desktop image"
              path={block.fields.imagePath}
              previewUrl={previewUrls.imagePath}
              mediaKind="image"
              isUploading={uploadingField === 'imagePath'}
              error={
                uploadError?.field === 'imagePath'
                  ? uploadError.message
                  : undefined
              }
              onUpload={(file) =>
                void uploadSelectedFile(
                  file,
                  'Desktop hero image uploaded.',
                  'imagePath',
                  'image',
                )
              }
              onRemove={() => {
                onChange({
                  ...block,
                  fields: { ...block.fields, imagePath: null },
                })
                setPreviewUrls((current) => ({
                  ...current,
                  imagePath: undefined,
                }))
              }}
            />
            <HeroMediaUploadField
              label="Mobile image"
              path={block.fields.mobileImagePath}
              previewUrl={previewUrls.mobileImagePath}
              mediaKind="image"
              isUploading={uploadingField === 'mobileImagePath'}
              error={
                uploadError?.field === 'mobileImagePath'
                  ? uploadError.message
                  : undefined
              }
              onUpload={(file) =>
                void uploadSelectedFile(
                  file,
                  'Mobile hero image uploaded.',
                  'mobileImagePath',
                  'image',
                )
              }
              onRemove={() => {
                onChange({
                  ...block,
                  fields: { ...block.fields, mobileImagePath: null },
                })
                setPreviewUrls((current) => ({
                  ...current,
                  mobileImagePath: undefined,
                }))
              }}
            />
          </>
        ) : (
          <>
            <HeroMediaUploadField
              label="Desktop video"
              path={block.fields.videoPath}
              previewUrl={previewUrls.videoPath}
              mediaKind="video"
              required
              isUploading={uploadingField === 'videoPath'}
              error={
                uploadError?.field === 'videoPath'
                  ? uploadError.message
                  : fieldErrors?.videoPath
              }
              onUpload={(file) =>
                void uploadSelectedFile(
                  file,
                  'Desktop hero video uploaded.',
                  'videoPath',
                  'video',
                )
              }
              onRemove={() => {
                onChange({
                  ...block,
                  fields: { ...block.fields, videoPath: null },
                })
                setPreviewUrls((current) => ({
                  ...current,
                  videoPath: undefined,
                }))
              }}
            />
            <HeroMediaUploadField
              label="Mobile video"
              path={block.fields.mobileVideoPath}
              previewUrl={previewUrls.mobileVideoPath}
              mediaKind="video"
              isUploading={uploadingField === 'mobileVideoPath'}
              error={
                uploadError?.field === 'mobileVideoPath'
                  ? uploadError.message
                  : undefined
              }
              onUpload={(file) =>
                void uploadSelectedFile(
                  file,
                  'Mobile hero video uploaded.',
                  'mobileVideoPath',
                  'video',
                )
              }
              onRemove={() => {
                onChange({
                  ...block,
                  fields: { ...block.fields, mobileVideoPath: null },
                })
                setPreviewUrls((current) => ({
                  ...current,
                  mobileVideoPath: undefined,
                }))
              }}
            />
          </>
        )}
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
        <NavLabelFields block={block} onChange={onChange} />
      </div>
    )
  }

  if (block.type === 'text') {
    const titleInvalid = !!fieldErrors?.title
    const contentInvalid = !!fieldErrors?.content
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
        <Field invalid={contentInvalid}>
          <Field.Label required>Content</Field.Label>
          <RichTextEditor
            value={block.fields.content}
            invalid={contentInvalid}
            onChange={(html) =>
              onChange({
                ...block,
                fields: { ...block.fields, content: html },
              })
            }
          />
          {contentInvalid ? (
            <Field.Error>{fieldErrors.content}</Field.Error>
          ) : null}
          <Field.Description>
            Headings 4 to 6, lists, quotes, links, and basic formatting. Theme
            colours and large headings stay off so the wedding look stays
            consistent.
          </Field.Description>
        </Field>
        <NavLabelFields block={block} onChange={onChange} />
      </div>
    )
  }

  if (block.type === 'image') {
    const imageInvalid = !!fieldErrors?.imagePath
    const imageUploadError =
      uploadError?.field === 'imagePath' ? uploadError.message : undefined
    return (
      <div className="space-y-4">
        <Field invalid={imageInvalid || !!imageUploadError}>
          <Field.Label required>Image</Field.Label>
          <PhotoDropzone
            error={imageUploadError ?? fieldErrors?.imagePath}
            isUploading={uploadingField === 'imagePath'}
            replaceLabel={
              block.fields.imagePath ? 'Drop a photo to replace' : undefined
            }
            onFiles={(files) => {
              void uploadSelectedFile(
                files[0],
                'Image uploaded.',
                'imagePath',
                'image',
              )
            }}
          />
        </Field>
        {previewUrls.imagePath ? (
          <img
            src={previewUrls.imagePath}
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
        <NavLabelFields block={block} onChange={onChange} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Field>
        <Field.Label>Title</Field.Label>
        <Field.Control>
          <Input
            value={block.fields.title}
            onChange={(event) =>
              onChange({
                ...block,
                fields: { ...block.fields, title: event.target.value },
              })
            }
            placeholder="Celebrate with us"
          />
        </Field.Control>
        <Field.Description>
          Shown as the section heading. The nav uses it unless you set a shorter
          label below.
        </Field.Description>
      </Field>
      <NavLabelFields block={block} onChange={onChange} />
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

function AddItemMenu({
  onAdd,
  className,
  triggerClassName,
}: {
  onAdd: (type: PageBlockType) => void
  className?: string
  triggerClassName?: string
}) {
  return (
    <DropdownMenu
      label="Add item"
      align="start"
      className={className}
      trigger={
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn('border-dashed', triggerClassName)}
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
  )
}

function AdminPagesPage() {
  const initial = Route.useLoaderData()
  const { session } = AdminRoute.useRouteContext()
  const queryClient = useQueryClient()
  const { data: pagesQueryData = initial } = useQuery(pageBlocksQueryOptions())
  const [blocks, setBlocks] = useState<PageBlock[]>(pagesQueryData.draft)
  const [persistedDraft, setPersistedDraft] = useState<PageBlock[]>(
    pagesQueryData.draft,
  )
  const [published, setPublished] = useState<PageBlock[]>(
    pagesQueryData.published,
  )
  const [draftUpdatedAt, setDraftUpdatedAt] = useState(
    pagesQueryData.draftUpdatedAt,
  )
  const [publishedAt, setPublishedAt] = useState(pagesQueryData.publishedAt)
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set())
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<PageBlockFieldErrors>({})
  const [historyOpen, setHistoryOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [versions, setVersions] = useState<PageContentVersion[]>([])
  const [versionsLoading, setVersionsLoading] = useState(false)
  const dragIdRef = useRef<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragEnabled, setDragEnabled] = useState(false)

  const publicSlug = session?.wedding?.public_slug.trim()
  const isLive = isPageContentLive({
    draft: blocks,
    published,
    draftUpdatedAt,
    publishedAt,
  })
  const canPreviewDraft =
    Boolean(publicSlug) &&
    !isPageContentLive({
      draft: persistedDraft,
      published,
      draftUpdatedAt,
      publishedAt,
    })
  const busy = isSavingDraft || isPublishing || isResetting || isRestoring

  const applyEditor = (data: PageContentEditorData) => {
    setBlocks(data.draft)
    setPersistedDraft(data.draft)
    setPublished(data.published)
    setDraftUpdatedAt(data.draftUpdatedAt)
    setPublishedAt(data.publishedAt)
  }

  useEffect(() => {
    applyEditor(pagesQueryData)
    setFieldErrors({})
  }, [pagesQueryData])

  const refreshPages = async () => {
    await queryClient.invalidateQueries({ queryKey: adminQueryKeys.pages })
  }

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

  const showPublishErrors = (validated: {
    fieldErrors: PageBlockFieldErrors
    message: string
  }) => {
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
  }

  const onSaveDraft = async () => {
    setIsSavingDraft(true)
    try {
      const data = await savePageBlocksDraft({
        data: { page_blocks: blocks },
      })
      applyEditor(data)
      setFieldErrors({})
      toast.success('Draft saved. Preview it, then publish to go live.')
      await refreshPages()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to save draft.')
    } finally {
      setIsSavingDraft(false)
    }
  }

  const onPublish = async () => {
    const validated = validatePageBlocksClient(blocks)
    if (!validated.ok) {
      showPublishErrors(validated)
      return
    }

    setIsPublishing(true)
    try {
      const data = await publishPageBlocks({
        data: { page_blocks: validated.blocks },
      })
      applyEditor(data)
      setFieldErrors({})
      toast.success('Page content published.')
      await refreshPages()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Unable to publish page content.',
      )
    } finally {
      setIsPublishing(false)
    }
  }

  const onOpenHistory = async () => {
    setHistoryOpen(true)
    setVersionsLoading(true)
    try {
      setVersions(await listPageContentVersions())
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Unable to load publish history.',
      )
    } finally {
      setVersionsLoading(false)
    }
  }

  const onRestoreVersion = async (versionId: string) => {
    setIsRestoring(true)
    try {
      const data = await restorePageContentVersion({
        data: { versionId },
      })
      applyEditor(data)
      setFieldErrors({})
      setHistoryOpen(false)
      toast.success('Restored into draft. Publish to make it live.')
      await refreshPages()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Unable to restore that version.',
      )
    } finally {
      setIsRestoring(false)
    }
  }

  const onResetDraft = async () => {
    setIsResetting(true)
    try {
      const data = await savePageBlocksDraft({
        data: { page_blocks: [] },
      })
      applyEditor(data)
      setOpenIds(new Set())
      setFieldErrors({})
      setResetOpen(false)
      toast.success('Draft reset. Publish to replace the live page.')
      await refreshPages()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Unable to reset the draft.',
      )
    } finally {
      setIsResetting(false)
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

  const allOpen =
    blocks.length > 0 && blocks.every((block) => openIds.has(block.id))

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="admin-page-title">Page content</h1>
            <Badge size="sm" variant={isLive ? 'success' : 'draft'}>
              {isLive ? 'Published' : 'Draft'}
            </Badge>
          </div>
          <p className="text-foreground-secondary mt-2 max-w-xl text-sm leading-relaxed">
            Sections on the public home page. Save a draft to preview, then
            publish to go live.
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

      {blocks.length === 0 ? (
        <div className="border-border bg-surface rounded-xl border border-dashed px-6 py-12 text-center">
          <p className="text-lg font-medium">No sections yet</p>
          <p className="text-foreground-secondary mx-auto mt-2 max-w-md text-sm leading-relaxed">
            Add a hero, story, text, photo, or details block. This draft stays
            off the live site until you publish.
          </p>
          <div className="mt-6 flex justify-center">
            <AddItemMenu onAdd={onAdd} triggerClassName="px-4" />
          </div>
        </div>
      ) : (
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
                        if (next.type === 'text') {
                          if (next.fields.title.trim()) {
                            clearBlockFieldError(next.id, 'title')
                          }
                          if (next.fields.content.trim()) {
                            clearBlockFieldError(next.id, 'content')
                          }
                        }
                        if (
                          next.type === 'image' &&
                          next.fields.imagePath.trim()
                        ) {
                          clearBlockFieldError(next.id, 'imagePath')
                        }
                        if (
                          next.type === 'hero' &&
                          (next.fields.mediaType === 'image' ||
                            next.fields.videoPath)
                        ) {
                          clearBlockFieldError(next.id, 'videoPath')
                        }
                      }}
                    />
                  </div>
                ) : null}
              </div>
            )
          })}

          <AddItemMenu
            onAdd={onAdd}
            className="w-full"
            triggerClassName="w-full"
          />
        </div>
      )}

      <PageActionBar lastUpdatedAt={draftUpdatedAt}>
        {canPreviewDraft && publicSlug ? (
          <Button
            asChild
            size="sm"
            variant="outline"
            className="max-md:w-(--button-height) max-md:px-0"
          >
            <Link
              to="/$weddingSlug"
              params={{ weddingSlug: publicSlug }}
              search={{ preview: true }}
              target="_blank"
              rel="noreferrer"
              aria-label="Preview draft"
              title="Preview draft"
            >
              <EyeIcon />
              <span className="hidden md:inline">Preview draft</span>
            </Link>
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="max-md:w-(--button-height) max-md:px-0"
          aria-label="Save draft"
          title="Save draft"
          onClick={() => void onSaveDraft()}
          isLoading={isSavingDraft}
          disabled={busy && !isSavingDraft}
        >
          <FloppyDiskIcon />
          <span className="hidden md:inline">Save draft</span>
        </Button>
        <div className="inline-flex">
          <Button
            type="button"
            size="sm"
            className="rounded-r-none"
            onClick={() => void onPublish()}
            isLoading={isPublishing}
            disabled={busy && !isPublishing}
          >
            Publish
          </Button>
          <DropdownMenu
            label="Publish options"
            side="top"
            trigger={
              <Button
                type="button"
                size="sm"
                square
                className="rounded-l-none"
                aria-label="Publish options"
                disabled={busy}
              >
                <CaretDownIcon />
              </Button>
            }
            items={[
              {
                id: 'history',
                label: 'History',
                icon: <ClockCounterClockwiseIcon />,
                onSelect: () => void onOpenHistory(),
              },
              {
                id: 'reset',
                label: 'Reset draft',
                icon: <ArrowCounterClockwiseIcon />,
                tone: 'destructive',
                onSelect: () => setResetOpen(true),
              },
            ]}
          />
        </div>
      </PageActionBar>

      <SideDrawer open={historyOpen} onOpenChange={setHistoryOpen}>
        <SideDrawer.Header
          title="Publish history"
          drawerDescription="Last 10 published versions. Restore copies one into draft."
        />
        <SideDrawer.Content className="space-y-1">
          {versionsLoading ? (
            <p className="text-foreground-secondary text-sm">Loading…</p>
          ) : versions.length === 0 ? (
            <p className="text-foreground-secondary text-sm">
              No published versions yet.
            </p>
          ) : (
            versions.map((version) => {
              const publishedLabel = formatLastUpdated(version.published_at)
              const isCurrentLive = pageBlocksEqual(
                version.page_blocks,
                published,
              )
              return (
                <div
                  key={version.id}
                  className="border-border flex items-center justify-between gap-3 border-b py-3 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {publishedLabel ?? 'Unknown date'}
                    </p>
                    {isCurrentLive ? (
                      <p className="text-foreground-secondary text-xs">
                        Currently live
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    isLoading={isRestoring}
                    disabled={busy && !isRestoring}
                    onClick={() => void onRestoreVersion(version.id)}
                  >
                    Restore
                  </Button>
                </div>
              )
            })
          )}
        </SideDrawer.Content>
      </SideDrawer>

      <ConfirmDialog
        open={resetOpen}
        title="Reset draft?"
        description="This clears every block from your draft. The live site stays as-is until you publish. If you publish after resetting, guests will see an empty page and the current live content will be replaced."
        confirmLabel="Reset draft"
        tone="destructive"
        isConfirming={isResetting}
        onConfirm={() => void onResetDraft()}
        onOpenChange={setResetOpen}
      />
    </div>
  )
}
