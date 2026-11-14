import { ImageIcon, VideoCameraIcon } from '@phosphor-icons/react'
import { Modal } from '@/components/ui/modal'
import {
  PAGE_BLOCK_TYPES,
  PAGE_BLOCK_TYPE_LABELS,
} from '@/lib/page-blocks/types'
import type { PageBlockType } from '@/lib/page-blocks/types'
import { cn } from '@/lib/utils'

export const PAGE_BLOCK_DESCRIPTIONS: Record<PageBlockType, string> = {
  hero: 'The opening banner with names, a tagline, and an image or video background.',
  story: 'A simple titled section for sharing how you met or another short story.',
  text: 'A flexible rich-text section for schedules, travel details, links, and notes.',
  image: 'A responsive photo section with desktop and optional mobile images.',
  video: 'A responsive video section with guest-controlled playback.',
  details: 'Venue and dress-code information pulled from Wedding settings.',
}

function PreviewLines({
  widths = ['w-3/4', 'w-full', 'w-2/3'],
  centered = false,
}: {
  widths?: string[]
  centered?: boolean
}) {
  return (
    <div className={cn('space-y-2', centered && 'flex flex-col items-center')}>
      {widths.map((width, index) => (
        <span
          key={`${width}-${index}`}
          className={cn(
            'bg-foreground/15 block h-1.5 rounded-full',
            width,
          )}
        />
      ))}
    </div>
  )
}

function BlockPreview({ type }: { type: PageBlockType }) {
  const frameClass =
    'bg-background-secondary border-border flex aspect-video overflow-hidden rounded-md border'

  switch (type) {
    case 'hero':
      return (
        <div
          className={cn(
            frameClass,
            'bg-accent/15 items-center justify-center p-5 text-center',
          )}
        >
          <div className="w-full max-w-48">
            <p className="text-foreground-secondary text-xs tracking-widest uppercase">
              We&apos;re getting married
            </p>
            <p className="mt-2 font-serif text-xl italic">Names</p>
            <div className="bg-accent mx-auto mt-3 h-px w-10" />
          </div>
        </div>
      )
    case 'story':
      return (
        <div className={cn(frameClass, 'items-center justify-center p-5')}>
          <div className="w-4/5 text-center">
            <p className="font-serif text-base italic">Our story</p>
            <div className="mt-3">
              <PreviewLines centered />
            </div>
          </div>
        </div>
      )
    case 'text':
      return (
        <div className={cn(frameClass, 'items-center p-5')}>
          <div className="w-full">
            <p className="font-serif text-base italic">A note</p>
            <div className="mt-3">
              <PreviewLines widths={['w-full', 'w-5/6', 'w-3/5']} />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="bg-accent size-1.5 rounded-full" />
              <span className="bg-foreground/15 h-1.5 w-1/2 rounded-full" />
            </div>
          </div>
        </div>
      )
    case 'image':
      return (
        <div className={cn(frameClass, 'items-center justify-center p-4')}>
          <div className="border-border bg-surface flex h-full w-3/4 items-center justify-center rounded-sm border">
            <ImageIcon className="text-foreground-secondary size-9" />
          </div>
        </div>
      )
    case 'video':
      return (
        <div className={cn(frameClass, 'items-center justify-center p-4')}>
          <div className="bg-foreground text-background flex h-full w-3/4 items-center justify-center rounded-sm">
            <VideoCameraIcon className="size-9" />
          </div>
        </div>
      )
    case 'details':
      return (
        <div className={cn(frameClass, 'items-center justify-center p-5')}>
          <div className="grid w-full grid-cols-2 gap-3 text-center">
            <div className="border-border rounded-sm border p-3">
              <p className="text-xs font-medium">Venue</p>
              <div className="mt-2">
                <PreviewLines widths={['w-full', 'w-2/3']} centered />
              </div>
            </div>
            <div className="border-border rounded-sm border p-3">
              <p className="text-xs font-medium">Dress code</p>
              <div className="mt-2">
                <PreviewLines widths={['w-full', 'w-1/2']} centered />
              </div>
            </div>
          </div>
        </div>
      )
  }
}

export function PageBlockPicker({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (type: PageBlockType) => void
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Add block"
      description="Choose a section for the public wedding website."
      size="lg"
      className="max-w-4xl"
    >
      <div className="grid max-h-[70vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
        {PAGE_BLOCK_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            className="border-border bg-background hover:border-accent focus-visible:ring-accent rounded-lg border p-3 text-left transition focus-visible:ring-2 focus-visible:outline-none"
            onClick={() => {
              onSelect(type)
              onOpenChange(false)
            }}
          >
            <BlockPreview type={type} />
            <span className="mt-3 block font-medium">
              {PAGE_BLOCK_TYPE_LABELS[type]}
            </span>
            <span className="text-foreground-secondary mt-1 block text-sm leading-relaxed">
              {PAGE_BLOCK_DESCRIPTIONS[type]}
            </span>
          </button>
        ))}
      </div>
    </Modal>
  )
}
