import { useEffect, useState } from 'react'

/**
 * Active SideDrawer content nodes (Vaul dialog). FeedbackModal lives in the
 * admin shell (outside the drawer tree), so React context cannot reach it.
 * A host stack lets page-level modals portal into the open drawer.
 */
const hosts: HTMLElement[] = []
/** Open page-level overlays that must not dismiss the drawer underneath. */
let blockingOverlayCount = 0
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
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

export function registerDrawerBlockingOverlay(): () => void {
  blockingOverlayCount += 1
  notify()
  return () => {
    blockingOverlayCount = Math.max(0, blockingOverlayCount - 1)
    notify()
  }
}

export function isDrawerBlockingOverlayActive(): boolean {
  return blockingOverlayCount > 0
}

/** Subscribe to the topmost open drawer host (for Modal). */
export function useActiveDrawerLayerHost(): HTMLElement | null {
  const [host, setHost] = useState<HTMLElement | null>(() =>
    getActiveDrawerLayerHost(),
  )

  useEffect(() => subscribe(() => setHost(getActiveDrawerLayerHost())), [])

  return host
}

/** True while a Modal/Confirm overlay should keep the drawer from dismissing. */
export function useDrawerBlockingOverlayActive(): boolean {
  const [active, setActive] = useState(() => isDrawerBlockingOverlayActive())

  useEffect(
    () => subscribe(() => setActive(isDrawerBlockingOverlayActive())),
    [],
  )

  return active
}
