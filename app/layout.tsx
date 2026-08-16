// app/layout.tsx — javari-games
// Universal brand shell — EIN, auth CTA, metadata
// CR AudioViz AI · EIN 39-3646201 · May 2026
import type { Metadata } from 'next'
export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  // 2026-08-16: the icons and share card existed in public/ but nothing pointed
  // at them, so every share rendered as a blank grey rectangle and every tab
  // showed a default globe.
  icons: {
    icon: [{ url: '/favicon.png', sizes: '32x32' }, { url: '/icon-512.png', sizes: '512x512' }],
    apple: '/apple-touch-icon.png',
  },
  openGraph: { images: [{ url: '/og-image.png', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', images: ['/og-image.png'] },
  // 2026-08-16: no metadataBase meant relative og:image paths resolved against
  // the preview hostname, and no canonical meant a trailing slash, a query
  // string and a preview host all competed for the same content.
  metadataBase: new URL('https://games.craudiovizai.com'),
  alternates: { canonical: '/' },
  title: 'Javari Games',
  description: 'Javari Games — powered by Javari AI on the CR AudioViz AI platform',
  openGraph: { title: 'Javari Games', type: 'website' },
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui,sans-serif' }}>
        <div style={{ background: 'rgba(7,8,15,0.95)', backdropFilter: 'blur(8px)', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
          <a href="https://craudiovizai.com" style={{ color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🎲</span>
            <span style={{ color: '#8b5cf6' }}>Javari Games</span>
            <span style={{ color: '#374151', fontSize: 10 }}>· CR AudioViz AI · EIN 39-3646201</span>
          </a>
          <a href="https://craudiovizai.com/auth/signup" style={{ background: '#8b5cf6', color: '#000', borderRadius: 6, padding: '5px 14px', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>Sign Up Free →</a>
        </div>
        <div style={{ paddingTop: 48 }}>{children}</div>
        <footer style={{ background: '#050609', borderTop: '1px solid rgba(255,255,255,0.04)', padding: '16px 20px', textAlign: 'center' }}>
          <p style={{ color: '#1f2937', fontSize: 11, margin: 0 }}>
            © 2026 CR AudioViz AI, LLC — EIN: 39-3646201 · Fort Myers, Florida ·{' '}
            <a href="https://craudiovizai.com" style={{ color: '#8b5cf6', textDecoration: 'none' }}>craudiovizai.com</a>
          </p>
        </footer>
      </body>
    </html>
  )
}
