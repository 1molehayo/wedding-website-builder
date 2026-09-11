import { CheckCircleIcon, InfoIcon, WarningIcon, XCircleIcon } from '@phosphor-icons/react'
import { Toaster as SonnerToaster, toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'

const Toaster = ({
  toastOptions,
  icons,
  ...props
}: React.ComponentProps<typeof SonnerToaster>) => {
  return (
    <SonnerToaster
      className="toaster group"
      position="top-right"
      toastOptions={{
        unstyled: true,
        ...toastOptions,
        classNames: {
          toast:
            'bg-surface text-foreground rounded-xl border border-border shadow-md flex items-center gap-2 py-3 px-3.5 text-sm font-medium w-(--width)',
          description: 'text-foreground-secondary',
          icon: 'relative size-4 flex shrink-0 items-center justify-start',
          actionButton:
            'cursor-pointer shrink-0 rounded-lg px-2 text-sm font-medium',
          ...toastOptions?.classNames,
        },
      }}
      icons={{
        success: <CheckCircleIcon weight="bold" className="text-success size-4" />,
        error: <XCircleIcon weight="bold" className="text-error size-4" />,
        loading: <Spinner className="opacity-50" size="sm" />,
        info: <InfoIcon weight="bold" className="text-info size-4" />,
        warning: <WarningIcon weight="bold" className="text-warning size-4" />,
        ...icons,
      }}
      {...props}
    />
  )
}

export { toast, Toaster }
