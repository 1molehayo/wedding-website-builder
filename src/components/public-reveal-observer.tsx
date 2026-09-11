import { useEffect } from 'react'

/**
 * Marks `.public-reveal` nodes visible when they enter the viewport.
 * CSS also animates them on load so content never stays at opacity 0.
 */
export function PublicRevealObserver() {
  useEffect(() => {
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    const observed = new WeakSet<Element>()

    const revealNow = (node: HTMLElement) => {
      node.classList.add('public-reveal-visible')
    }

    const scan = (observer?: IntersectionObserver) => {
      const nodes = document.querySelectorAll<HTMLElement>('.public-reveal')
      for (const node of nodes) {
        if (observed.has(node)) continue
        observed.add(node)
        if (reduceMotion || !observer) {
          revealNow(node)
        } else {
          observer.observe(node)
        }
      }
    }

    if (reduceMotion) {
      scan()
      const mutations = new MutationObserver(() => scan())
      mutations.observe(document.body, { subtree: true, childList: true })
      return () => mutations.disconnect()
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          revealNow(entry.target as HTMLElement)
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )

    scan(observer)
    const mutations = new MutationObserver(() => scan(observer))
    mutations.observe(document.body, { subtree: true, childList: true })

    return () => {
      mutations.disconnect()
      observer.disconnect()
    }
  }, [])

  return null
}
