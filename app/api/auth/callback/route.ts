// @auth-reviewed: the ONE legitimate cookie client here.
// exchangeCodeForSession is the operation that WRITES the session and needs
// cookie set/remove access. Every other cookie client on this platform was
// READING a session that nothing writes - sessions live in localStorage - which
// is why dozens of routes answered 401 to everyone.
//
// Do not 'fix' this to requireUser(): there is no bearer token yet at this point
// in the flow. This route is what creates it.
// app/api/auth/callback/route.ts
// javari-games — Supabase Auth PKCE callback
// Saturday, March 14, 2026

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/games'

  if (code) {
    // 2026-09-01: awaited. createClient reads cookies(), which Next 15 made async, so
    // the function is now async and returns a Promise. Without the await this is the
    // OAuth code exchange calling .auth on a Promise — every sign-in would fail.
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
    console.error('[games/auth/callback]', error.message)
  }

  return NextResponse.redirect(`${origin}/auth/error?message=auth_callback_failed`)
}
