import { useId, useRef, useState } from 'react'
import { ImageIcon } from '@phosphor-icons/react'
import { Spinner } from '@/components/ui/spinner'
import {
  ALLOWED_MEDIA_MIME_TYPES,
  MAX_MEDIA_UPLOAD_BYTES,
  mediaMaxSizeLabel,
  mediaTypeListLabel,
} from '@/lib/media/constants'
import { cn } from '@/lib/utils'

export function PhotoDropzone({
  id,
  className,
  hint,
  error,
  accept = ALLOWED_MEDIA_MIME_TYPES,
  maxBytes = MAX_MEDIA_UPLOAD_BYTES,
  multiple = false,
  disabled = false,
  isUploading = false,
  replaceLabel,
  onFiles,
}: {
  id?: string
  className?: string
  hint?: string
  error?: string
  accept?: readonly string[]
  maxBytes?: number
  multiple?: boolean
  disabled?: boolean
  isUploading?: boolean
  replaceLabel?: string
  onFiles: (files: File[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const generatedId = useId()
  const hintId = useId()
  const errorId = useId()
  const [dragging, setDragging] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const acceptSet = new Set(accept)
  const typeLabel = mediaTypeListLabel(accept)
  const sizeLabel = mediaMaxSizeLabel(maxBytes)
  const isDisabled = disabled || isUploading
  const shownError = error ?? localError

  const takeFiles = (list: FileList | File[] | null) => {
    if (!list || isDisabled) return
    const files = Array.from(list)
    if (files.length === 0) return

    const accepted: File[] = []
    let badType = 0
    let badSize = 0
    for (const file of files) {
      if (!acceptSet.has(file.type)) {
        badType += 1
        continue
      }
      if (file.size > maxBytes) {
        badSize += 1
        continue
      }
      accepted.push(file)
    }

    if (accepted.length === 0) {
      setLocalError(
        badSize
          ? `File is over ${sizeLabel}.`
          : `Use ${typeLabel}.`,
      )
      return
    }

    if (badType || badSize) {
      setLocalError(
        `${badType + badSize} file${badType + badSize === 1 ? '' : 's'} skipped. ${typeLabel} · up to ${sizeLabel}.`,
      )
    } else {
      setLocalError(null)
    }

    onFiles(multiple ? accepted : accepted.slice(0, 1))
  }

  return (
    <div
      id={id ?? generatedId}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-disabled={isDisabled || undefined}
      aria-busy={isUploading || undefined}
      aria-invalid={shownError ? true : undefined}
      aria-describedby={
        [hint ? hintId : null, shownError ? errorId : null]
          .filter(Boolean)
          .join(' ') || undefined
      }
      className={cn(
        'border-border bg-background flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center transition',
        dragging && 'border-accent bg-accent/5',
        shownError && 'border-error',
        isDisabled && 'cursor-not-allowed opacity-60',
        className,
      )}
      onClick={() => {
        if (isDisabled) return
        inputRef.current?.click()
      }}
      onKeyDown={(event) => {
        if (isDisabled) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          inputRef.current?.click()
        }
      }}
      onDragEnter={(event) => {
        event.preventDefault()
        if (!isDisabled) setDragging(true)
      }}
      onDragOver={(event) => {
        event.preventDefault()
        if (!isDisabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        takeFiles(event.dataTransfer.files)
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept.join(',')}
        multiple={multiple}
        disabled={isDisabled}
        className="sr-only pointer-events-none"
        tabIndex={-1}
        onChange={(event) => {
          takeFiles(event.target.files)
          event.target.value = ''
        }}
      />
      {isUploading ? (
        <Spinner size="lg" className="text-foreground-secondary" />
      ) : (
        <ImageIcon className="text-foreground-secondary size-8" />
      )}
      <p className="mt-3 text-sm font-medium">
        {isUploading
          ? 'Uploading…'
          : replaceLabel ??
            (multiple
              ? 'Drop photos here, or click to browse'
              : 'Drop a photo here, or click to browse')}
      </p>
      <p className="text-foreground-secondary mt-1 text-xs">
        {typeLabel} · up to {sizeLabel}
      </p>
      {hint ? (
        <p id={hintId} className="text-foreground-secondary mt-2 max-w-sm text-xs">
          {hint}
        </p>
      ) : null}
      {shownError ? (
        <p id={errorId} role="alert" className="text-error mt-2 text-xs">
          {shownError}
        </p>
      ) : null}
    </div>
  )
}
