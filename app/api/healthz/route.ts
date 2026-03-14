// app/api/healthz/route.ts
// javari-games — health check
// Saturday, March 14, 2026

import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    ok:        true,
    service:   'javari-games',
    domain:    'games.craudiovizai.com',
    timestamp: new Date().toISOString(),
  })
}
