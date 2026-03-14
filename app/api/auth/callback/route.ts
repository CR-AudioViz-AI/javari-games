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
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
    console.error('[games/auth/callback]', error.message)
  }

  return NextResponse.redirect(`${origin}/auth/error?message=auth_callback_failed`)
}
