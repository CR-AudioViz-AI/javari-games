// @auth-reviewed: this module exists solely for the OAuth callback, which is
// the ONE place a cookie client is correct - exchangeCodeForSession WRITES the
// session and needs cookie set/remove access.
//
// Verified 2026-08-20: app/api/auth/callback/route.ts is its only importer.
// Do not use it anywhere else. Every other cookie client on this platform was
// READING a session that nothing writes - sessions live in localStorage - which
// is why dozens of routes answered 401 to everyone, signed in or not.
// lib/supabase/server.ts
// javari-games — Supabase server client (platform standard)
// Matches craudiovizai pattern exactly
// Saturday, March 14, 2026

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { secretKey, publishableKey, supabaseUrl } from "@craudioviz/platform-sdk";

export async function createClient() {
  const cookieStore = (await cookies())
  return createServerClient(
    supabaseUrl(),
    publishableKey(),
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          try { cookieStore.set({ name, value, ...options }) } catch {}
        },
        remove(name: string, options: CookieOptions) {
          try { cookieStore.set({ name, value: '', ...options }) } catch {}
        },
      },
    }
  )
}

// 2026-09-01: async, because it awaits cookies(). My previous edit added the await
// and only made the FIRST exported function async — this one kept the await without
// the keyword, which is a syntax error rather than a subtle bug, and the build
// caught it immediately.
export async function createServiceClient() {
  const cookieStore = (await cookies())
  return createServerClient(
    supabaseUrl(),
    secretKey(),
    {
      cookies: {
        get: (n: string) => cookieStore.get(n)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  )
}
