// lib/supabase/client.ts
// SINGLE shared Supabase browser client — module-level singleton.
//
// 2026-09-04: replaced the @supabase/ssr cookie browser client, which is
// FORBIDDEN on this platform.
//
// Why, and it was learned the hard way: a Discord session carrying provider
// tokens exceeds 4KB and chunks into three cookies. Multiple client instances
// then race and clobber chunk .1, and the session silently becomes unreadable.
// The symptom is a user who appears signed in and is not, which is close to
// impossible to reproduce on demand.
//
// localStorage holds the session instead. PKCE plus detectSessionInUrl handles
// every OAuth code exchange, and the module-level singleton means there is only
// ever one instance to race.
//
// This file is a copy of the core platform's canonical client, self-contained
// because this repository has no lib/supabase/keys.ts. The two NEXT_PUBLIC names
// are spelled out literally: Next only inlines process.env.NEXT_PUBLIC_* into the
// browser bundle when the text matches exactly, so a computed key name silently
// becomes undefined at runtime.
//
// CR AudioViz AI, LLC · EIN 39-3646201
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

function url(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
}

function key(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ''
  );
}

export function createClient(): SupabaseClient {
  if (_client) return _client;
  _client = createSupabaseClient(url(), key(), {
    auth: {
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });
  return _client;
}

/** Kept so existing imports keep working. Same singleton. */
export const createBrowserClient = createClient;

export const supabase = createClient();
export default createClient;
