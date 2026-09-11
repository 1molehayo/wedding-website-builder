import { XIcon } from '@phosphor-icons/react'
import { Drawer } from 'vaul'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type SideDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

function SideDrawerRoot({ open, onOpenChange, children }: SideDrawerProps) {
  return (
    <Drawer.Root direction="right" open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/30" />
        <Drawer.Content
          className="bg-surface border-border fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-md flex-col border-l outline-none"
          data-vaul-no-drag="true"
        >
          {children}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

function SideDrawerHeader({
  title,
  drawerTitle,
  drawerDescription,
}: {
  title: string
  drawerTitle?: string
  drawerDescription?: string
}) {
  return (
    <>
      <Drawer.Title className="sr-only">{drawerTitle ?? title}</Drawer.Title>
      <Drawer.Description className="sr-only">
        {drawerDescription ?? 'Details panel'}
      </Drawer.Description>
      <div className="border-border flex items-center justify-between border-b px-5 py-4">
        <p className="text-lg font-semibold">{title}</p>
        <Drawer.Close asChild>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            square
            aria-label="Close"
          >
            <XIcon />
          </Button>
        </Drawer.Close>
      </div>
    </>
  )
}

function SideDrawerContent({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex-1 overflow-y-auto p-5', className)}>{children}</div>
  )
}

function SideDrawerFooter({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'border-border mt-auto flex flex-wrap items-center justify-end gap-2 border-t px-5 py-4',
        className,
      )}
    >
      {children}
    </div>
  )
}

const SideDrawer = Object.assign(SideDrawerRoot, {
  Header: SideDrawerHeader,
  Content: SideDrawerContent,
  Footer: SideDrawerFooter,
})

export { SideDrawer }
