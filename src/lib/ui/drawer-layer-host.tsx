import { useEffect, useState } from 'react'

/**
 * Active SideDrawer content nodes (Vaul dialog). FeedbackModal lives in the
 * admin shell (outside the drawer tree), so React context cannot reach it.
 * A small host stack lets page-level modals portal into the open drawer and
 * stay interactive without flipping Vaul's `modal` prop mid-open (that crash
 * is what produced the registry 500).
 */
const hosts: HTMLElement[] = []
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

export function registerDrawerLayerHost(node: HTMLElement): () => void {
  hosts.push(node)
  notify()
  return () => {
    const index = hosts.lastIndexOf(node)
    if (index >= 0) hosts.splice(index, 1)
    notify()
  }
}

export function getActiveDrawerLayerHost(): HTMLElement | null {
  return hosts.length > 0 ? (hosts[hosts.length - 1] ?? null) : null
}

/** Subscribe to the topmost open drawer host (for Modal / ConfirmDialog). */
export function useActiveDrawerLayerHost(): HTMLElement | null {
  const [host, setHost] = useState<HTMLElement | null>(() =>
    getActiveDrawerLayerHost(),
  )

  useEffect(() => {
    const sync = () => setHost(getActiveDrawerLayerHost())
    listeners.add(sync)
    sync()
    return () => {
      listeners.delete(sync)
    }
  }, [])

  return host
}
