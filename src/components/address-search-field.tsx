import { useEffect, useId, useRef, useState } from 'react'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  createTtlCache,
  normalizeAddressQuery,
} from '@/lib/places/cache'
import type { AddressSuggestion } from '@/lib/places/cache'
import { searchAddresses } from '@/lib/places/search'
import { cn } from '@/lib/utils'

const clientCache = createTtlCache<AddressSuggestion[]>(1000 * 60 * 30, 100)
const clientInflight = new Map<string, Promise<AddressSuggestion[]>>()

async function fetchSuggestions(query: string): Promise<AddressSuggestion[]> {
  const key = normalizeAddressQuery(query)
  if (key.length < 3) return []

  const cached = clientCache.get(key)
  if (cached) return cached

  const existing = clientInflight.get(key)
  if (existing) return existing

  const request = searchAddresses({ data: { query } })
    .then((result) => {
      clientCache.set(key, result.suggestions)
      return result.suggestions
    })
    .finally(() => {
      clientInflight.delete(key)
    })

  clientInflight.set(key, request)
  return request
}

export function AddressSearchField({
  value,
  onChange,
  label = 'Venue location',
  description = 'Search for an address, then pick a suggestion. You can still type a custom location.',
  required,
}: {
  value: string
  onChange: (value: string) => void
  label?: string
  description?: string
  required?: boolean
}) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setIsFocused(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  useEffect(() => {
    const normalized = normalizeAddressQuery(query)
    if (normalized.length < 3) {
      setSuggestions([])
      setIsSearching(false)
      setError(null)
      return
    }

    const cached = clientCache.get(normalized)
    if (cached) {
      setSuggestions(cached)
      // Prefill on page load must not open the list — only while editing.
      if (isFocused) setOpen(true)
      setIsSearching(false)
      setError(null)
      return
    }

    setIsSearching(true)
    const timer = window.setTimeout(() => {
      void fetchSuggestions(query)
        .then((next) => {
          if (normalizeAddressQuery(query) !== normalized) return
          setSuggestions(next)
          if (isFocused) setOpen(true)
          setError(null)
        })
        .catch((err) => {
          if (normalizeAddressQuery(query) !== normalized) return
          setSuggestions([])
          setError(
            err instanceof Error ? err.message : 'Unable to search addresses.',
          )
        })
        .finally(() => {
          if (normalizeAddressQuery(query) === normalized) {
            setIsSearching(false)
          }
        })
    }, 300)

    return () => window.clearTimeout(timer)
  }, [query, isFocused])

  const selectSuggestion = (suggestion: AddressSuggestion) => {
    onChange(suggestion.label)
    setQuery(suggestion.label)
    setSuggestions([])
    setOpen(false)
    setActiveIndex(-1)
    setError(null)
  }

  return (
    <Field>
      <Field.Label required={required}>{label}</Field.Label>
      <Field.Control>
        <div ref={rootRef} className="relative">
          <Input
            value={query}
            autoComplete="off"
            role="combobox"
            aria-expanded={open && suggestions.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
            }
            placeholder="Start typing an address…"
            onChange={(event) => {
              const next = event.target.value
              setQuery(next)
              onChange(next)
              setOpen(true)
              setActiveIndex(-1)
            }}
            onFocus={() => {
              setIsFocused(true)
              if (suggestions.length > 0) setOpen(true)
            }}
            onKeyDown={(event) => {
              if (!open || suggestions.length === 0) return
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setActiveIndex((index) =>
                  index + 1 >= suggestions.length ? 0 : index + 1,
                )
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                setActiveIndex((index) =>
                  index <= 0 ? suggestions.length - 1 : index - 1,
                )
              } else if (event.key === 'Enter' && activeIndex >= 0) {
                event.preventDefault()
                selectSuggestion(suggestions[activeIndex])
              } else if (event.key === 'Escape') {
                setOpen(false)
                setActiveIndex(-1)
              }
            }}
          />
          {open && (suggestions.length > 0 || isSearching) ? (
            <ul
              id={listId}
              role="listbox"
              className="border-border bg-surface absolute top-[calc(100%+0.35rem)] right-0 left-0 z-40 max-h-60 overflow-auto rounded-xl border py-1 shadow-md"
            >
              {isSearching && suggestions.length === 0 ? (
                <li className="text-foreground-secondary px-3 py-2 text-sm">
                  Searching…
                </li>
              ) : (
                suggestions.map((suggestion, index) => (
                  <li key={suggestion.id} role="option" aria-selected={index === activeIndex}>
                    <button
                      type="button"
                      id={`${listId}-option-${index}`}
                      className={cn(
                        'hover:bg-foreground/5 w-full px-3 py-2 text-left text-sm',
                        index === activeIndex && 'bg-foreground/5',
                      )}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => selectSuggestion(suggestion)}
                    >
                      <span className="block font-medium">{suggestion.label}</span>
                      {suggestion.secondary ? (
                        <span className="text-foreground-secondary mt-0.5 block text-xs">
                          {suggestion.secondary}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
      </Field.Control>
      {error ? (
        <Field.Error>{error}</Field.Error>
      ) : (
        <Field.Description>{description}</Field.Description>
      )}
    </Field>
  )
}
