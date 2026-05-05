import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anonKey) throw new Error('Missing Supabase public env vars')
    _client = createClient(url, anonKey)
  }
  return _client
}

// Named export for convenience — same singleton
export const supabase = {
  channel: (...args: Parameters<SupabaseClient['channel']>) => getSupabaseClient().channel(...args),
  removeChannel: (...args: Parameters<SupabaseClient['removeChannel']>) => getSupabaseClient().removeChannel(...args),
  from: (...args: Parameters<SupabaseClient['from']>) => getSupabaseClient().from(...args),
}
