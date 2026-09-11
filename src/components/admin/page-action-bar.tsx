import type { ReactNode } from 'react'

export function PageActionBar({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="h-20" aria-hidden />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 md:left-60">
        <div className="flex justify-end px-6 py-4 md:px-8">
          <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
            {children}
          </div>
        </div>
      </div>
    </>
  )
}
