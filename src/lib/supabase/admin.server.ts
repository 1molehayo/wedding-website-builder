import { createClient } from '@supabase/supabase-js'
import { getSupabaseSecretKey, getSupabaseUrl } from '@/lib/supabase/env'

/** Server-only privileged client. Never import from browser code. */
export function createAdminSupabaseClient() {
  const url = getSupabaseUrl()
  const secretKey = getSupabaseSecretKey()

  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      // Ensure PostgREST treats this as the privileged role.
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    },
  })
}
