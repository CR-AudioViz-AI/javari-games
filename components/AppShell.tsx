// components/AppShell.tsx
// Fortune 50 quality — universal app wrapper for every Javari app
// Provides: nav, footer, Javari AI help, CTA injection, consistent branding
// One import in layout.tsx gives you everything
// May 17, 2026 — CR AudioViz AI, LLC
'use client'
import { useState, useEffect, useRef } from 'react'

const PLATFORM = process.env.NEXT_PUBLIC_CENTRAL_API_URL ?? 'https://craudiovizai.com'
const JAV_AI   = process.env.NEXT_PUBLIC_JAVARI_AI_URL   ?? 'https://javariai.com'
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME         ?? 'Javari'
const APP_COLOR= process.env.NEXT_PUBLIC_APP_COLOR        ?? '#6366f1'

// ─── Types ────────────────────────────────────────────────────────────────────
interface User { id: string; email: string; name: string; tier: string; credits: number }
interface Message { role: 'user'|'assistant'; content: string }
interface AppShellProps {
  children: React.ReactNode
  appName?: string
  appColor?: string
  appEmoji?: string
  appDesc?: string
  showCTA?: boolean
  ctaHeadline?: string
  handoffApp?: string
  handoffUrl?: string
  handoffPitch?: string
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'AI Tools',   emoji: '🤖', apps: [
    { n: 'Javari AI',     u: 'https://javariai.com' },
    { n: 'Resume',        u: 'https://javari-resume-builder.vercel.app' },
    { n: 'Legal Docs',    u: 'https://javari-legal.vercel.app' },
    { n: 'Social Posts',  u: 'https://javarisocial.com' },
    { n: 'Email Templates',u:'https://javari-email-templates.vercel.app'},
    { n: 'eBooks',        u: 'https://javaribooks.com' },
  ]},
  { label: 'Property',   emoji: '🏠', apps: [
    { n: 'Javari Property',u: 'https://javariproperty.com' },
    { n: 'Realtor CRM',    u: 'https://javarikeys.com' },
    { n: 'Mortgage Rates', u: 'https://javarimortgage.com' },
  ]},
  { label: 'Collectors', emoji: '🥃', apps: [
    { n: 'Javari Spirits', u: 'https://javarispirits.com' },
    { n: 'Trading Cards',  u: 'https://javaricards.com' },
    { n: 'Vinyl Records',  u: 'https://javari-vinyl-vault.vercel.app' },
    { n: 'Fine Art',       u: 'https://javari-art-archive.vercel.app' },
  ]},
  { label: 'Travel',     emoji: '✈️', apps: [
    { n: 'Javari Travel',  u: 'https://javaritravel.com' },
    { n: 'Orlando Deals',  u: 'https://orlandotripdeal.com' },
  ]},
  { label: 'Business',   emoji: '💼', apps: [
    { n: 'Marketing Tools',u: 'https://javari-marketing.vercel.app' },
    { n: 'Business Formation',u:'https://javari-business-formation.vercel.app'},
    { n: 'HR & Workforce', u: 'https://javari-hr-workforce.vercel.app' },
    { n: 'Insurance',      u: 'https://javari-insurance.vercel.app' },
  ]},
  { label: 'More',       emoji: '⚡', apps: [
    { n: 'Javari Games',   u: 'https://javarigames.com' },
    { n: 'Javariverse',    u: 'https://javariverse.com' },
    { n: 'Javari Health',  u: 'https://javari-health.vercel.app' },
    { n: 'Javari Fitness', u: 'https://javari-fitness.vercel.app' },
  ]},
]

export default function AppShell({
  children,
  appName   = APP_NAME,
  appColor  = APP_COLOR,
  appEmoji  = '✨',
  appDesc   = '',
  showCTA   = true,
  ctaHeadline,
  handoffApp,
  handoffUrl,
  handoffPitch,
}: AppShellProps) {
  const [user, setUser]           = useState<User|null>(null)
  const [menuOpen, setMenuOpen]   = useState<string|null>(null)
  const [chatOpen, setChatOpen]   = useState(false)
  const [chatMsgs, setChatMsgs]   = useState<Message[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [handoffDismissed, setHandoffDismissed] = useState(false)
  const chatBottom = useRef<HTMLDivElement>(null)
  const navRef     = useRef<HTMLDivElement>(null)

  // Load user
  useEffect(() => {
    const token = document.cookie.match(/sb-access-token=([^;]+)/)?.[1]
    if (!token) return
    fetch(`${PLATFORM}/api/auth/user`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((d: any) => { if (d?.id) setUser(d) })
      .catch(() => {})
  }, [])

  // Chat welcome
  useEffect(() => {
    if (chatOpen && chatMsgs.length === 0) {
      setChatMsgs([{ role: 'assistant', content: `Hi! I'm Javari, your AI assistant for ${appName}. How can I help you today?` }])
    }
  }, [chatOpen])

  // Scroll chat
  useEffect(() => { chatBottom.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMsgs])

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setMenuOpen(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return
    const msg = chatInput.trim()
    setChatInput('')
    const msgs: Message[] = [...chatMsgs, { role: 'user', content: msg }]
    setChatMsgs(msgs)
    setChatLoading(true)
    try {
      const res = await fetch(`${JAV_AI}/api/javari/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, context: `User is on ${appName}. ${appDesc}`, stream: false }),
      })
      if (res.ok) {
        const d = await res.json() as { content?: string; response?: string }
        const reply = d.content ?? d.response ?? 'Let me help you with that!'
        setChatMsgs([...msgs, { role: 'assistant', content: reply }])
      }
    } catch { setChatMsgs([...msgs, { role: 'assistant', content: 'Having a moment — try again!' }]) }
    finally { setChatLoading(false) }
  }

  const C = appColor
  const isActive = (label: string) => menuOpen === label

  // Styles
  const nav: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
    background: 'rgba(7,7,16,0.97)', backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    fontFamily: 'Inter, system-ui, sans-serif',
  }
  const navInner: React.CSSProperties = {
    maxWidth: 1320, margin: '0 auto', padding: '0 20px',
    height: 58, display: 'flex', alignItems: 'center', gap: 8,
  }

  return (
    <div style={{ background: '#070710', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* ── NAV ── */}
      <nav style={nav} ref={navRef}>
        <div style={navInner}>
          {/* Logo */}
          <a href={PLATFORM} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
            <span style={{ fontSize: 18 }}>🤖</span>
            <span style={{ fontWeight: 800, fontSize: 15, background: `linear-gradient(135deg, ${C}, #8b5cf6)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {appName}
            </span>
          </a>

          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)', margin: '0 8px', flexShrink: 0 }} />

          {/* App categories */}
          <div style={{ display: 'flex', gap: 2, flex: 1, overflow: 'hidden' }}>
            {NAV_ITEMS.map(item => (
              <div key={item.label} style={{ position: 'relative' }}>
                <button
                  style={{ background: 'none', border: 'none', color: isActive(item.label) ? 'white' : '#6b7280', cursor: 'pointer', padding: '5px 10px', borderRadius: 6, fontSize: 13, fontWeight: 500, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
                  onMouseEnter={() => setMenuOpen(item.label)}
                  onClick={() => setMenuOpen(isActive(item.label) ? null : item.label)}
                >
                  <span style={{ fontSize: 13 }}>{item.emoji}</span> {item.label}
                  <span style={{ fontSize: 9, opacity: 0.5 }}>▾</span>
                </button>
                {isActive(item.label) && (
                  <div onMouseLeave={() => setMenuOpen(null)} style={{
                    position: 'absolute', top: '100%', left: 0,
                    background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12, padding: 8, minWidth: 200, zIndex: 1001,
                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)', marginTop: 4,
                  }}>
                    {item.apps.map(app => (
                      <a key={app.n} href={app.u} style={{ display: 'block', padding: '7px 10px', borderRadius: 7, color: '#d1d5db', fontSize: 13, textDecoration: 'none', fontWeight: 500 }}
                         onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = `${C}18`; (e.currentTarget as HTMLAnchorElement).style.color = 'white' }}
                         onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'none'; (e.currentTarget as HTMLAnchorElement).style.color = '#d1d5db' }}>
                        {app.n}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            {user ? (
              <>
                <a href={`${PLATFORM}/dashboard`} style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: '#a5b4fc', textDecoration: 'none' }}>
                  ⚡ {user.credits} credits
                </a>
                <a href={`${PLATFORM}/dashboard`} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '5px 12px', fontSize: 12, color: '#d1d5db', textDecoration: 'none', fontWeight: 600 }}>
                  {user.name?.split(' ')[0] ?? 'Account'}
                </a>
              </>
            ) : (
              <>
                <a href={`${PLATFORM}/auth/signin?return_to=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '/')}`} style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none', padding: '5px 10px' }}>Sign In</a>
                <a href={`${PLATFORM}/auth/signup`} style={{ background: `linear-gradient(135deg, ${C}, #8b5cf6)`, color: 'white', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 700, textDecoration: 'none', cursor: 'pointer' }}>
                  Get Started Free →
                </a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Spacer */}
      <div style={{ height: 58 }} />

      {/* ── HANDOFF BANNER ── */}
      {handoffApp && handoffUrl && !handoffDismissed && (
        <div style={{ background: `${C}10`, borderBottom: `1px solid ${C}20`, padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, fontFamily: 'inherit' }}>
          <span style={{ fontSize: 13, color: '#9ca3af' }}>
            💡 {handoffPitch ?? `Need ${handoffApp}?`}
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <a href={handoffUrl} style={{ background: `linear-gradient(135deg, ${C}, #8b5cf6)`, color: 'white', borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
              Try {handoffApp} →
            </a>
            <button onClick={() => setHandoffDismissed(true)} style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <main>{children}</main>

      {/* ── CTA SECTION ── */}
      {showCTA && (
        <section style={{ background: 'linear-gradient(180deg, #070710 0%, #0d0a1a 100%)', padding: '80px 24px', borderTop: '1px solid rgba(255,255,255,0.04)', fontFamily: 'inherit' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ display: 'inline-block', background: `${C}15`, border: `1px solid ${C}30`, borderRadius: 20, padding: '4px 16px', fontSize: 12, color: C, fontWeight: 700, marginBottom: 20 }}>
              🚀 Part of the Javari Ecosystem
            </div>
            <h2 style={{ color: 'white', fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 800, margin: '0 0 16px', lineHeight: 1.2 }}>
              {ctaHeadline ?? `Get full access to ${appName} and 50+ more apps`}
            </h2>
            <p style={{ color: '#6b7280', fontSize: 16, lineHeight: 1.6, margin: '0 auto 40px', maxWidth: 560 }}>
              One Javari account. One subscription. Access to everything — AI tools, collectors, travel, property, games, and more. Credits never expire.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
              <a href={`${PLATFORM}/auth/signup`} style={{ background: `linear-gradient(135deg, ${C}, #8b5cf6)`, color: 'white', borderRadius: 12, padding: '14px 32px', fontSize: 16, fontWeight: 700, textDecoration: 'none' }}>
                Start Free — No Card Needed →
              </a>
              <a href={`${PLATFORM}/pricing`} style={{ background: 'rgba(255,255,255,0.06)', color: '#d1d5db', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '14px 32px', fontSize: 16, fontWeight: 700, textDecoration: 'none' }}>
                View Pricing
              </a>
            </div>
            <p style={{ color: '#374151', fontSize: 13 }}>✓ 50 free credits/month forever  ✓ 7-day trial on paid plans  ✓ Cancel anytime</p>
          </div>
        </section>
      )}

      {/* ── FOOTER ── */}
      <footer style={{ background: '#030308', borderTop: '1px solid rgba(255,255,255,0.04)', padding: '40px 24px 24px', fontFamily: 'inherit' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '24px 16px', marginBottom: 32 }}>
            {[
              { heading: 'AI Tools', links: [['Javari AI','https://javariai.com'],['Resume','https://javari-resume-builder.vercel.app'],['Legal','https://javari-legal.vercel.app'],['Social Posts','https://javarisocial.com']] },
              { heading: 'Property', links: [['Javari Property','https://javariproperty.com'],['Realtor CRM','https://javarikeys.com'],['Mortgage','https://javarimortgage.com']] },
              { heading: 'Collectors', links: [['Spirits','https://javarispirits.com'],['Cards','https://javaricards.com'],['Vinyl','https://javari-vinyl-vault.vercel.app']] },
              { heading: 'Lifestyle', links: [['Travel','https://javaritravel.com'],['Orlando','https://orlandotripdeal.com'],['Games','https://javarigames.com'],['Fitness','https://javari-fitness.vercel.app']] },
              { heading: 'Business', links: [['Marketing','https://javari-marketing.vercel.app'],['Formation','https://javari-business-formation.vercel.app'],['Insurance','https://javari-insurance.vercel.app']] },
              { heading: 'Legal', links: [['Privacy','https://craudiovizai.com/privacy'],['Terms','https://craudiovizai.com/terms'],['Accessibility','https://craudiovizai.com/accessibility']] },
            ].map(col => (
              <div key={col.heading}>
                <div style={{ color: '#374151', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{col.heading}</div>
                {col.links.map(([label, href]) => (
                  <a key={label} href={href} style={{ display: 'block', color: '#374151', fontSize: 13, textDecoration: 'none', marginBottom: 5 }}
                     onMouseEnter={e => { (e.target as HTMLAnchorElement).style.color = C }}
                     onMouseLeave={e => { (e.target as HTMLAnchorElement).style.color = '#374151' }}>
                    {label}
                  </a>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <span style={{ color: '#1f2937', fontSize: 12 }}>© 2026 CR AudioViz AI, LLC — EIN: 39-3646201 | Fort Myers, Florida</span>
            </div>
            <span style={{ color: '#111827', fontSize: 12 }}>Your Story. Our Design. Everyone Connects. Everyone Wins.</span>
          </div>
        </div>
      </footer>

      {/* ── JAVARI AI CHAT BUTTON ── */}
      {!chatOpen && (
        <button onClick={() => setChatOpen(true)} style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9998,
          width: 54, height: 54, borderRadius: '50%',
          background: `linear-gradient(135deg, ${C}, #8b5cf6)`,
          border: 'none', cursor: 'pointer', fontSize: 22,
          boxShadow: `0 4px 20px ${C}60`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          title="Chat with Javari AI — your free AI assistant"
        >🤖</button>
      )}

      {/* ── JAVARI AI CHAT PANEL ── */}
      {chatOpen && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
          width: 360, height: 520, background: '#0d0d1a',
          border: `1px solid ${C}30`, borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          fontFamily: 'inherit',
        }}>
          {/* Chat header */}
          <div style={{ background: `linear-gradient(135deg, ${C}, #8b5cf6)`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🤖</span>
              <div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>Javari AI</div>
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>Helping you with {appName} · Free</div>
              </div>
            </div>
            <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {chatMsgs.map((msg, i) => (
              <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <div style={{
                  background: msg.role === 'user' ? `linear-gradient(135deg, ${C}, #8b5cf6)` : '#1a1a2e',
                  color: 'white', padding: '9px 12px', fontSize: 13, lineHeight: 1.5,
                  borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  whiteSpace: 'pre-wrap',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ alignSelf: 'flex-start', background: '#1a1a2e', padding: '9px 12px', borderRadius: '12px 12px 12px 2px', color: '#6b7280', fontSize: 13 }}>
                Thinking…
              </div>
            )}
            <div ref={chatBottom} />
          </div>

          {/* Quick suggestions */}
          <div style={{ padding: '6px 14px', display: 'flex', gap: 6, overflowX: 'auto' }}>
            {['How do I get started?', 'What can this do?', 'Help me upgrade'].map(s => (
              <button key={s} onClick={() => { setChatInput(s); }} style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '4px 10px', fontSize: 11, color: '#6b7280', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 8 }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendChat())}
              placeholder={`Ask about ${appName}…`}
              style={{ flex: 1, background: '#1a1a2e', border: `1px solid ${C}20`, borderRadius: 8, padding: '8px 12px', color: 'white', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
            />
            <button onClick={sendChat} disabled={!chatInput.trim() || chatLoading} style={{
              background: chatInput.trim() ? `linear-gradient(135deg, ${C}, #8b5cf6)` : '#1a1a2e',
              border: 'none', borderRadius: 8, padding: '8px 12px', color: 'white',
              cursor: chatInput.trim() ? 'pointer' : 'default', fontSize: 14, fontWeight: 700,
            }}>→</button>
          </div>

          {/* Footer */}
          <div style={{ padding: '4px 14px 8px', textAlign: 'center', fontSize: 10, color: '#1f2937' }}>
            <a href={JAV_AI} style={{ color: '#374151', textDecoration: 'none' }}>Powered by Javari AI</a>
            {' · '}
            <a href={`${PLATFORM}/pricing`} style={{ color: C, textDecoration: 'none' }}>Upgrade →</a>
          </div>
        </div>
      )}
    </div>
  )
}
