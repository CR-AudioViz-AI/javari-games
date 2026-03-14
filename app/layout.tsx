// app/layout.tsx
// javari-games — Root layout with Javari platform integration
// Saturday, March 14, 2026

import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Javari Games | CR AudioViz AI',
  description: 'Comprehensive games platform — part of the CR AudioViz AI ecosystem. Browse, play, and compete across an extensive collection of games.',
  keywords: ['games', 'online games', 'CR AudioViz AI', 'Javari', 'browser games'],
  openGraph: {
    title: 'Javari Games',
    description: 'Comprehensive games platform by CR AudioViz AI',
    siteName: 'CR AudioViz AI',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className={`${inter.className} min-h-screen bg-background`}>
        {children}
        {/* Javari AI widget — platform standard */}
        <Script src="https://javariai.com/embed.js" strategy="lazyOnload" />
      </body>
    </html>
  )
}
