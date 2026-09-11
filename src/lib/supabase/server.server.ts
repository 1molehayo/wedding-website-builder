import { createServerClient } from '@supabase/ssr'
import {
  getCookies,
  setCookie,
  setResponseHeader,
} from '@tanstack/react-start/server'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase/env'

export function createServerSupabaseClient() {
  return createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return Object.entries(getCookies()).map(([name, value]) => ({
          name,
          value,
        }))
      },
      setAll(cookies, headers) {
        cookies.forEach(({ name, value, options }) => {
          setCookie(name, value, options)
        })
        Object.entries(headers).forEach(([name, value]) => {
          setResponseHeader(name, value)
        })
      },
    },
  })
}
