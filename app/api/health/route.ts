import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    app: process.env.NEXT_PUBLIC_APP_NAME || "CR AudioViz AI",
    version: "1.0.0"
  })
}
