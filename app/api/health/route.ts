import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// GET /api/health — does this app actually work?
//
// 2026-08-19: this returned a hardcoded {status:"healthy"} and checked NOTHING.
// It would have reported healthy with the database unreachable, the anon key
// revoked, or the whole data layer gone. A health endpoint that cannot fail is
// not a health endpoint - it is a decoration that makes an outage look fine.
//
// rateunlock.com made the same claim the other way round: {status:"healthy",
// checks:{fred_api_key:false}} under an HTTP 503, the body contradicting its own
// status code. Without that key it could not fetch a single mortgage rate.
//
// Now it reaches the database and says which check failed, so a reader knows
// WHAT is wrong rather than only that something is.
export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  const started = Date.now()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const checks: Record<string, boolean> = {
    supabase_url_set: Boolean(url),
    supabase_key_set: Boolean(key),
    database_reachable: false,
  }

  if (url && key) {
    try {
      // A real round trip. head:true fetches no rows, so this costs almost
      // nothing but still proves the connection, the key and RLS all work.
      const db = createClient(url, key, {
        auth: { persistSession: false },
        global: { fetch: (u, o) => fetch(u, { ...o, cache: "no-store" }) },
      })
      const { error } = await db.from("profiles").select("id", { count: "exact", head: true })
      checks.database_reachable = !error
    } catch {
      checks.database_reachable = false
    }
  }

  const failing = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k)
  const healthy = failing.length === 0

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "degraded",
      failing,
      checks,
      latencyMs: Date.now() - started,
      timestamp: new Date().toISOString(),
      app: process.env.NEXT_PUBLIC_APP_NAME || "CR AudioViz AI",
      version: "1.0.0",
    },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  )
}
