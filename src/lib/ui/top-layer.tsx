import {
  createContext,
  useContext,
  useEffect,
  useId,
  useState,
} from 'react'

type TopLayerContextValue = {
  depth: number
  register: (id: string) => void
  unregister: (id: string) => void
}

const TopLayerContext = createContext<TopLayerContextValue | null>(null)

/**
 * Tracks portaled dialogs (Modal, ConfirmDialog) that must sit above SideDrawer.
 * While depth > 0, drawers drop `modal` so Vaul/Radix stop inerting the page.
 */
export function TopLayerProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([])

  const register = (id: string) => {
    setIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

  const unregister = (id: string) => {
    setIds((prev) => prev.filter((item) => item !== id))
  }

  return (
    <TopLayerContext.Provider value={{ depth: ids.length, register, unregister }}>
      {children}
    </TopLayerContext.Provider>
  )
}

export function useTopLayerActive(): boolean {
  const context = useContext(TopLayerContext)
  return (context?.depth ?? 0) > 0
}

/** Register while `open` so drawers underneath release their dialog trap. */
export function useRegisterTopLayer(open: boolean) {
  const context = useContext(TopLayerContext)
  const id = useId()

  useEffect(() => {
    if (!context || !open) return
    context.register(id)
    return () => context.unregister(id)
  }, [context, open, id])
}
