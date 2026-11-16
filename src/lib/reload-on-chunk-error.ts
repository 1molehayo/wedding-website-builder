/**
 * After a deploy, an open tab can keep running old JS and then fail when it
 * lazy-loads a chunk that no longer exists. Force one reload so the browser
 * picks up the new HTML entry and hashed assets.
 */
export function installChunkErrorReload() {
  if (typeof window === 'undefined') return () => {}

  const FLAG = 'igbeyawowa:chunk-reload'

  const shouldReload = (message: string) => {
    const normalized = message.toLowerCase()
    return (
      normalized.includes('failed to fetch dynamically imported module') ||
      normalized.includes('error loading dynamically imported module') ||
      normalized.includes('importing a module script failed') ||
      normalized.includes('unable to preload css')
    )
  }

  const reloadOnce = () => {
    try {
      if (sessionStorage.getItem(FLAG) === '1') return
      sessionStorage.setItem(FLAG, '1')
    } catch {
      // sessionStorage can be blocked; still attempt a single reload.
    }
    window.location.reload()
  }

  const onError = (event: ErrorEvent) => {
    if (shouldReload(String(event.message))) reloadOnce()
  }

  const onRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : String(reason ?? '')
    if (shouldReload(message)) reloadOnce()
  }

  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)

  return () => {
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onRejection)
  }
}
