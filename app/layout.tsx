// app/layout.tsx — Javari Games
// Fortune 50 quality — uses AppShell for full ecosystem integration
// May 17, 2026 — CR AudioViz AI, LLC
import type { Metadata } from 'next'
import './globals.css'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Javari Games | Javari by CR AudioViz AI',
  description: 'AI gaming hub and community',
  keywords: 'Javari Games, Javari, AI, CR AudioViz AI',
}

import AppShell from '@/components/AppShell'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        <AppShell
          appName="Javari Games"
          appColor="#a855f7"
          appEmoji="🎮"
          appDesc="AI gaming hub and community"
      handoffApp="Javariverse"
      handoffUrl="https://javariverse.com"
      handoffPitch="Join the Javariverse — our virtual world →"
        >
          {children}
        </AppShell>
      </body>
    </html>
  )
}
