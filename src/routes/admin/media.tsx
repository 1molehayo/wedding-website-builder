import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import {
  CopySimpleIcon,
  EnvelopeSimpleIcon,
  InfoIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PhotoDropzone } from '@/components/ui/photo-dropzone'
import { SideDrawer } from '@/components/ui/side-drawer'
import { toast } from '@/components/ui/toaster'
import { Tooltip } from '@/components/ui/tooltip'
import {
  createMediaUpload,
  deleteMediaAsset,
  finalizeMediaUpload,
  listMediaAssets,
} from '@/lib/media/media'
import {
  ALLOWED_MEDIA_MIME_TYPES,
  MAX_MEDIA_UPLOAD_BYTES,
} from '@/lib/media/constants'
import { uploadFileToSignedUrl } from '@/lib/media/upload-client'
import {
  createPhotoShareGroup,
  deletePhotoShareGroup,
  listPhotoShareGroups,
  sendPhotoShareEmails,
  updatePhotoShareGroup,
} from '@/lib/photo-shares/photo-shares'
import type {
  PhotoShareGroupListItem,
  PhotoShareGuestOption,
} from '@/lib/photo-shares/photo-shares'
import { cn } from '@/lib/utils'
import { guestFullName } from '@/lib/guests/schema'

export const Route = createFileRoute('/admin/media')({
  beforeLoad: ({ context }) => {
    if (!context.session?.wedding) {
      throw redirect({ to: '/admin/onboarding' })
    }
  },
  loader: async () => {
    const [assets, shares] = await Promise.all([
      listMediaAssets(),
      listPhotoShareGroups(),
    ])
    return { assets, ...shares }
  },
  component: AdminMediaPage,
})

type TabId = 'library' | 'shares'

const UPLOAD_CONCURRENCY = 3
const ALLOWED_MIME = new Set<string>(ALLOWED_MEDIA_MIME_TYPES)

type UploadJob = {
  id: string
  file: File
  previewUrl: string
  status: 'queued' | 'uploading' | 'finalizing' | 'error'
  progress: number
  error: string | null
}

function qrImageUrl(value: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(value)}`
}

function newUploadId() {
  return crypto.randomUUID()
}

function AdminMediaPage() {
  const initial = Route.useLoaderData()
  const router = useRouter()
  const [tab, setTab] = useState<TabId>('library')
  const [assets, setAssets] = useState(initial.assets)
  const [groups, setGroups] = useState(initial.groups)
  const [guests, setGuests] = useState(initial.guests)
  const [uploads, setUploads] = useState<UploadJob[]>([])
  const uploadQueueRef = useRef<string[]>([])
  const activeUploadsRef = useRef(0)
  const uploadsRef = useRef<UploadJob[]>([])
  const [deleteAssetId, setDeleteAssetId] = useState<string | null>(null)
  const [isDeletingAsset, setIsDeletingAsset] = useState(false)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<PhotoShareGroupListItem | null>(null)
  const [shareName, setShareName] = useState('')
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([])
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([])
  const [isSavingShare, setIsSavingShare] = useState(false)
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null)
  const [isDeletingGroup, setIsDeletingGroup] = useState(false)
  const [emailingGroupId, setEmailingGroupId] = useState<string | null>(null)
  const [emailShareConfirmId, setEmailShareConfirmId] = useState<string | null>(
    null,
  )
  const [showLibraryPicker, setShowLibraryPicker] = useState(false)

  useEffect(() => {
    setAssets(initial.assets)
    setGroups(initial.groups)
    setGuests(initial.guests)
  }, [initial])

  useEffect(() => {
    return () => {
      for (const job of uploadsRef.current) {
        URL.revokeObjectURL(job.previewUrl)
      }
    }
  }, [])

  const patchUpload = (id: string, patch: Partial<UploadJob>) => {
    setUploads((current) => {
      const next = current.map((job) =>
        job.id === id ? { ...job, ...patch } : job,
      )
      uploadsRef.current = next
      return next
    })
  }

  const removeUpload = (id: string) => {
    setUploads((current) => {
      const job = current.find((item) => item.id === id)
      if (job) URL.revokeObjectURL(job.previewUrl)
      const next = current.filter((item) => item.id !== id)
      uploadsRef.current = next
      return next
    })
  }

  const runUploadJob = async (id: string) => {
    const job = uploadsRef.current.find((item) => item.id === id)
    if (!job) return

    patchUpload(id, { status: 'uploading', progress: 0, error: null })
    try {
      const signed = await createMediaUpload({
        data: {
          name: job.file.name,
          type: job.file.type,
          byteSize: job.file.size,
        },
      })

      await uploadFileToSignedUrl(signed.signedUrl, job.file, {
        onProgress: (progress) => {
          patchUpload(id, { progress, status: 'uploading' })
        },
      })

      patchUpload(id, { status: 'finalizing', progress: 100 })
      const asset = await finalizeMediaUpload({
        data: {
          path: signed.path,
          filename: signed.filename,
          contentType: signed.contentType,
          byteSize: signed.byteSize,
        },
      })

      setAssets((current) => [
        asset,
        ...current.filter((a) => a.id !== asset.id),
      ])
      removeUpload(id)
    } catch (err) {
      patchUpload(id, {
        status: 'error',
        error: err instanceof Error ? err.message : 'Unable to upload photo.',
      })
    }
  }

  const pumpUploadQueue = () => {
    while (
      activeUploadsRef.current < UPLOAD_CONCURRENCY &&
      uploadQueueRef.current.length > 0
    ) {
      const nextId = uploadQueueRef.current.shift()
      if (!nextId) break
      activeUploadsRef.current += 1
      void runUploadJob(nextId).finally(() => {
        activeUploadsRef.current -= 1
        pumpUploadQueue()
      })
    }
  }

  const enqueueFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList)
    if (files.length === 0) return

    const accepted: UploadJob[] = []
    let skippedType = 0
    let skippedSize = 0

    for (const file of files) {
      if (!ALLOWED_MIME.has(file.type)) {
        skippedType += 1
        continue
      }
      if (file.size > MAX_MEDIA_UPLOAD_BYTES) {
        skippedSize += 1
        continue
      }
      accepted.push({
        id: newUploadId(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'queued',
        progress: 0,
        error: null,
      })
    }

    if (skippedType > 0) {
      toast.error(
        `${skippedType} file${skippedType === 1 ? '' : 's'} skipped (use JPEG, PNG, WebP, or GIF).`,
      )
    }
    if (skippedSize > 0) {
      toast.error(
        `${skippedSize} file${skippedSize === 1 ? '' : 's'} skipped (over 12MB).`,
      )
    }
    if (accepted.length === 0) return

    setUploads((current) => {
      const next = [...accepted, ...current]
      uploadsRef.current = next
      return next
    })
    uploadQueueRef.current.push(...accepted.map((job) => job.id))
    pumpUploadQueue()
  }

  const retryUpload = (id: string) => {
    const job = uploadsRef.current.find((item) => item.id === id)
    if (!job || job.status !== 'error') return
    patchUpload(id, { status: 'queued', progress: 0, error: null })
    uploadQueueRef.current.push(id)
    pumpUploadQueue()
  }

  const openCreateShare = () => {
    setEditing(null)
    setShareName('')
    setSelectedAssetIds([])
    setSelectedGuestIds([])
    setShowLibraryPicker(false)
    setDrawerOpen(true)
  }

  const openEditShare = (group: PhotoShareGroupListItem) => {
    setEditing(group)
    setShareName(group.name)
    setSelectedAssetIds(group.assetIds)
    setSelectedGuestIds(group.guestIds)
    setShowLibraryPicker(false)
    setDrawerOpen(true)
  }

  const toggleId = (
    id: string,
    list: string[],
    setList: (next: string[]) => void,
  ) => {
    setList(
      list.includes(id) ? list.filter((item) => item !== id) : [...list, id],
    )
  }

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied.`)
    } catch {
      toast.error('Unable to copy to clipboard.')
    }
  }

  const refresh = async () => {
    await router.invalidate()
  }

  const emailShareGuests = async (groupId: string) => {
    setEmailingGroupId(groupId)
    try {
      const result = await sendPhotoShareEmails({ data: { groupId } })
      if (result.sent === 0 && result.failed.length === 0) {
        toast.message(
          result.skipped > 0
            ? 'No guests with email addresses in this share.'
            : 'Add guests to this share before emailing.',
        )
      } else if (result.failed.length === 0) {
        toast.success(
          `Sent ${result.sent} photo email${result.sent === 1 ? '' : 's'}${
            result.skipped ? ` · ${result.skipped} skipped (no email)` : ''
          }.`,
        )
      } else {
        const failedSample = result.failed
          .slice(0, 3)
          .map((item) => item.email)
          .join(', ')
        toast.error(
          `Sent ${result.sent}, failed ${result.failed.length}${
            result.skipped ? `, skipped ${result.skipped}` : ''
          }.${failedSample ? ` Failed: ${failedSample}` : ''}`,
        )
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Unable to send photo emails.',
      )
    } finally {
      setEmailingGroupId(null)
      setEmailShareConfirmId(null)
    }
  }

  const selectedShareAssets = assets.filter((asset) =>
    selectedAssetIds.includes(asset.id),
  )
  const availableShareAssets = assets.filter(
    (asset) => !selectedAssetIds.includes(asset.id),
  )

  const addAssetToShare = (assetId: string) => {
    setSelectedAssetIds((current) =>
      current.includes(assetId) ? current : [...current, assetId],
    )
  }

  const removeAssetFromShare = (assetId: string) => {
    setSelectedAssetIds((current) => current.filter((id) => id !== assetId))
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="admin-page-title">Media</h1>
          <p className="text-foreground-secondary mt-2 text-sm">
            Library photos and private guest shares. Shares never appear on the
            public wedding site.
          </p>
        </div>
        {tab === 'shares' ? (
          <Button type="button" size="sm" onClick={openCreateShare}>
            <PlusIcon />
            New share
          </Button>
        ) : null}
      </div>

      <div className="border-border flex gap-2 border-b">
        {(
          [
            ['library', 'Library'],
            ['shares', 'Shares'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'px-3 py-2 text-sm tracking-wide uppercase transition',
              tab === id
                ? 'border-accent text-foreground border-b-2'
                : 'text-foreground-secondary hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'library' ? (
        <div className="space-y-4">
          <PhotoDropzone
            multiple
            hint="Private guest shares only — not on the public site."
            onFiles={(files) => enqueueFiles(files)}
          />
          {assets.length === 0 && uploads.length === 0 ? null : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {uploads.map((job) => (
              <figure
                key={job.id}
                className="border-border bg-surface overflow-hidden rounded-xl border"
              >
                <div className="bg-background-secondary relative aspect-4/3">
                  <img
                    src={job.previewUrl}
                    alt={job.file.name}
                    className={cn(
                      'h-full w-full object-cover',
                      job.status !== 'error' && 'opacity-70',
                    )}
                  />
                  {job.status !== 'error' ? (
                    <div className="absolute inset-x-0 bottom-0 space-y-1 bg-black/55 px-3 py-2 text-white">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span>
                          {job.status === 'queued'
                            ? 'Waiting…'
                            : job.status === 'finalizing'
                              ? 'Saving…'
                              : `Uploading ${job.progress}%`}
                        </span>
                        <span>{job.progress}%</span>
                      </div>
                      <div
                        className="h-1.5 overflow-hidden rounded-full bg-white/25"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={job.progress}
                      >
                        <div
                          className="h-full rounded-full bg-white transition-[width] duration-150 ease-out"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 px-3 text-center text-white">
                      <p className="text-xs">{job.error ?? 'Upload failed.'}</p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-white/40 bg-transparent text-white hover:bg-white/10"
                          onClick={() => retryUpload(job.id)}
                        >
                          Retry
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-white/40 bg-transparent text-white hover:bg-white/10"
                          onClick={() => removeUpload(job.id)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <figcaption className="space-y-2 p-3">
                  <p className="truncate text-sm font-medium">
                    {job.file.name}
                  </p>
                </figcaption>
              </figure>
            ))}
            {assets.map((asset) => (
              <figure
                key={asset.id}
                className="border-border bg-surface overflow-hidden rounded-xl border"
              >
                <div className="bg-background-secondary aspect-4/3">
                  {asset.signedUrl ? (
                    <img
                      src={asset.signedUrl}
                      alt={asset.filename}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-foreground-secondary flex h-full items-center justify-center text-xs uppercase tracking-wider">
                      Preview unavailable
                    </div>
                  )}
                </div>
                <figcaption className="space-y-2 p-3">
                  <p className="truncate text-sm font-medium">
                    {asset.filename}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void copyText(asset.storage_path, 'Storage path')
                      }
                    >
                      <CopySimpleIcon />
                      Path
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteAssetId(asset.id)}
                    >
                      <TrashIcon />
                      Delete
                    </Button>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
          )}
        </div>
      ) : groups.length === 0 ? (
        <p className="text-foreground-secondary text-sm">
          No private shares yet. Create a share, pick photos and guests, then
          send the link or QR.
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <div
              key={group.id}
              className="border-border bg-surface flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-medium">{group.name}</p>
                <p className="text-foreground-secondary mt-1 text-xs">
                  {group.assetIds.length} photo
                  {group.assetIds.length === 1 ? '' : 's'} ·{' '}
                  {group.guestIds.length} guest
                  {group.guestIds.length === 1 ? '' : 's'} · {group.openCount}{' '}
                  open
                  {group.openCount === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={
                    group.guestIds.length === 0 || emailingGroupId === group.id
                  }
                  isLoading={emailingGroupId === group.id}
                  onClick={() => setEmailShareConfirmId(group.id)}
                >
                  <EnvelopeSimpleIcon />
                  Email guests
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void copyText(group.groupUrl, 'Share link')}
                >
                  <CopySimpleIcon />
                  Copy link
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => openEditShare(group)}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setDeleteGroupId(group.id)}
                >
                  <TrashIcon />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <SideDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open)
          if (!open) setShowLibraryPicker(false)
        }}
      >
        <SideDrawer.Header
          title={editing ? 'Edit photo share' : 'New photo share'}
          drawerDescription="Build a private album, invite guests, then share the link or QR."
        />
        <SideDrawer.Content>
          <form
            id="photo-share-form"
            className="space-y-6"
            onSubmit={async (event) => {
              event.preventDefault()
              setIsSavingShare(true)
              try {
                if (editing) {
                  await updatePhotoShareGroup({
                    data: {
                      groupId: editing.id,
                      name: shareName,
                      assetIds: selectedAssetIds,
                      guestIds: selectedGuestIds,
                    },
                  })
                  toast.success('Share updated.')
                } else {
                  await createPhotoShareGroup({
                    data: {
                      name: shareName,
                      assetIds: selectedAssetIds,
                      guestIds: selectedGuestIds,
                    },
                  })
                  toast.success('Share created.')
                }
                setDrawerOpen(false)
                setShowLibraryPicker(false)
                await refresh()
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : 'Unable to save share.',
                )
              } finally {
                setIsSavingShare(false)
              }
            }}
          >
            <Field>
              <Field.Label>Name</Field.Label>
              <Field.Control>
                <Input
                  value={shareName}
                  onChange={(event) => setShareName(event.target.value)}
                  required
                  placeholder="Family album"
                />
              </Field.Control>
            </Field>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <p className="text-foreground text-base font-medium">
                    Photos
                  </p>
                  <Tooltip delayIn={200}>
                    <Tooltip.Trigger
                      type="button"
                      className="text-foreground-secondary hover:text-foreground inline-flex"
                      aria-label="Photos help"
                    >
                      <InfoIcon className="size-4" />
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      Choose library photos for this private album, then save.
                      Uploading in Library does not add photos here
                      automatically.
                    </Tooltip.Content>
                  </Tooltip>
                </div>
                {selectedShareAssets.length > 0 ? (
                  <p className="text-foreground-secondary text-xs">
                    {selectedShareAssets.length} photo
                    {selectedShareAssets.length === 1 ? '' : 's'}
                  </p>
                ) : null}
              </div>
              {selectedShareAssets.length === 0 ? (
                <p className="text-foreground-secondary text-sm">
                  No photos in this album yet.
                </p>
              ) : null}
              <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto">
                {selectedShareAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="border-border relative aspect-square overflow-hidden rounded-lg border"
                  >
                    {asset.signedUrl ? (
                      <img
                        src={asset.signedUrl}
                        alt={asset.filename}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="bg-background-secondary h-full w-full" />
                    )}
                    <button
                      type="button"
                      aria-label={`Remove ${asset.filename} from album`}
                      onClick={() => removeAssetFromShare(asset.id)}
                      className="absolute top-1 right-1 inline-flex size-7 items-center justify-center rounded-full bg-black/70 text-white"
                    >
                      <XIcon className="size-3.5" weight="bold" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    if (assets.length === 0) {
                      toast.message('Upload photos in the Library tab first.')
                      return
                    }
                    if (availableShareAssets.length === 0) {
                      toast.message(
                        'Every library photo is already in this album.',
                      )
                      return
                    }
                    setShowLibraryPicker(true)
                  }}
                  className="border-border text-foreground-secondary hover:border-accent hover:text-foreground flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-2 text-center text-xs transition"
                >
                  <PlusIcon className="size-5" weight="bold" />
                  Add photos
                </button>
              </div>
              {showLibraryPicker ? (
                <div className="border-border space-y-3 rounded-xl border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Choose from library</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowLibraryPicker(false)}
                    >
                      Done
                    </Button>
                  </div>
                  {availableShareAssets.length === 0 ? (
                    <p className="text-foreground-secondary text-sm">
                      Every library photo is already in this album.
                    </p>
                  ) : (
                    <div className="grid max-h-48 grid-cols-3 gap-2 overflow-y-auto">
                      {availableShareAssets.map((asset) => (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => addAssetToShare(asset.id)}
                          className="border-border relative aspect-square overflow-hidden rounded-lg border"
                        >
                          {asset.signedUrl ? (
                            <img
                              src={asset.signedUrl}
                              alt={asset.filename}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="bg-background-secondary h-full w-full" />
                          )}
                          <span className="absolute inset-x-0 bottom-0 bg-black/55 py-1 text-center text-2xs text-white">
                            Add
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <p className="text-foreground text-base font-medium">Guests</p>
                <Tooltip delayIn={200}>
                  <Tooltip.Trigger
                    type="button"
                    className="text-foreground-secondary hover:text-foreground inline-flex"
                    aria-label="Guests help"
                  >
                    <InfoIcon className="size-4" />
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    Select guests for this album. Each guest can only be in one
                    share. Invite sends their personal tracked link.
                  </Tooltip.Content>
                </Tooltip>
              </div>
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {guests.length === 0 ? (
                  <p className="text-foreground-secondary text-sm">
                    Add guests on the Guests page first.
                  </p>
                ) : (
                  guests.map((guest) => {
                    const blocked =
                      Boolean(guest.assignedGroupId) &&
                      guest.assignedGroupId !== editing?.id
                    const selected = selectedGuestIds.includes(guest.id)
                    return (
                      <label
                        key={guest.id}
                        className={cn(
                          'border-border flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                          blocked && 'opacity-50',
                        )}
                      >
                        <input
                          type="checkbox"
                          disabled={blocked}
                          checked={selected}
                          onChange={() =>
                            toggleId(
                              guest.id,
                              selectedGuestIds,
                              setSelectedGuestIds,
                            )
                          }
                        />
                        <span>
                          {guestFullName(guest)}
                          {blocked ? ' · in another share' : ''}
                        </span>
                      </label>
                    )
                  })
                )}
              </div>
              {editing ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={
                      editing.guestIds.length === 0 ||
                      emailingGroupId === editing.id
                    }
                    isLoading={emailingGroupId === editing.id}
                    onClick={() => void emailShareGuests(editing.id)}
                  >
                    <EnvelopeSimpleIcon />
                    Invite guests
                  </Button>
                  <GuestLinks
                    group={editing}
                    guests={guests}
                    onCopy={copyText}
                  />
                </>
              ) : null}
            </div>

            {editing ? (
              <div className="space-y-3">
                <p className="text-foreground text-base font-medium">
                  Share link & QR
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void copyText(editing.groupUrl, 'Share link')
                    }
                  >
                    <CopySimpleIcon />
                    Copy link
                  </Button>
                </div>
                <img
                  src={qrImageUrl(editing.groupUrl)}
                  alt="QR code for share link"
                  className="border-border rounded-lg border bg-white p-2"
                  width={160}
                  height={160}
                />
              </div>
            ) : null}
          </form>
        </SideDrawer.Content>
        <SideDrawer.Footer>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setDrawerOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            form="photo-share-form"
            isLoading={isSavingShare}
          >
            {editing ? 'Save share' : 'Create share'}
          </Button>
        </SideDrawer.Footer>
      </SideDrawer>

      <ConfirmDialog
        open={Boolean(emailShareConfirmId)}
        onOpenChange={(open) => {
          if (!open && !emailingGroupId) setEmailShareConfirmId(null)
        }}
        title="Email photo share?"
        description="Sends a themed private album link to every guest in this share who has an email address. Guests without email are skipped."
        confirmLabel="Send emails"
        isConfirming={Boolean(emailingGroupId)}
        onConfirm={() => {
          if (emailShareConfirmId) void emailShareGuests(emailShareConfirmId)
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteAssetId)}
        onOpenChange={(open) => {
          if (!open) setDeleteAssetId(null)
        }}
        title="Delete photo?"
        description="This removes the photo from the library and any shares that use it."
        confirmLabel="Delete"
        tone="destructive"
        isConfirming={isDeletingAsset}
        onConfirm={() => {
          if (!deleteAssetId) return
          void (async () => {
            setIsDeletingAsset(true)
            try {
              await deleteMediaAsset({ data: { assetId: deleteAssetId } })
              toast.success('Photo deleted.')
              setDeleteAssetId(null)
              await refresh()
            } catch (err) {
              toast.error(
                err instanceof Error ? err.message : 'Unable to delete photo.',
              )
            } finally {
              setIsDeletingAsset(false)
            }
          })()
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteGroupId)}
        onOpenChange={(open) => {
          if (!open) setDeleteGroupId(null)
        }}
        title="Delete share?"
        description="Guests will no longer be able to open this private album."
        confirmLabel="Delete"
        tone="destructive"
        isConfirming={isDeletingGroup}
        onConfirm={() => {
          if (!deleteGroupId) return
          void (async () => {
            setIsDeletingGroup(true)
            try {
              await deletePhotoShareGroup({ data: { groupId: deleteGroupId } })
              toast.success('Share deleted.')
              setDeleteGroupId(null)
              await refresh()
            } catch (err) {
              toast.error(
                err instanceof Error ? err.message : 'Unable to delete share.',
              )
            } finally {
              setIsDeletingGroup(false)
            }
          })()
        }}
      />
    </div>
  )
}

function GuestLinks({
  group,
  guests,
  onCopy,
}: {
  group: PhotoShareGroupListItem
  guests: PhotoShareGuestOption[]
  onCopy: (value: string, label: string) => Promise<void>
}) {
  const members = guests.filter((guest) => group.guestIds.includes(guest.id))
  if (members.length === 0) {
    return (
      <p className="text-foreground-secondary text-xs">
        Add guests to generate personal links (with open tracking).
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium tracking-wide uppercase">
        Personal guest links
      </p>
      {members.map((guest) => {
        const url = `${group.groupUrl}?g=${encodeURIComponent(guest.rsvp_token)}`
        return (
          <div
            key={guest.id}
            className="flex items-center justify-between gap-2 text-xs"
          >
            <span className="truncate">{guestFullName(guest)}</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void onCopy(url, 'Guest link')}
            >
              <CopySimpleIcon />
              Copy
            </Button>
          </div>
        )
      })}
    </div>
  )
}
