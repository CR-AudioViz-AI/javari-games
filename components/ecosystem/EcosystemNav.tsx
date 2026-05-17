// components/ecosystem/EcosystemNav.tsx
// Universal navigation for every Javari app
// - Logo + app name
// - Category dropdown menus
// - User credits + account
// - "Get Started Free" CTA
// - Mobile responsive
// May 17, 2026 — CR AudioViz AI, LLC
'use client'
import { useState, useEffect, useRef } from 'react'

const PLATFORM = process.env.NEXT_PUBLIC_CENTRAL_API_URL ?? 'https://craudiovizai.com'
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'Javari'

const ECOSYSTEM = [
  {
    label: '🤖 AI', href: 'https://javariai.com',
    apps: [
      { name: 'Javari AI', desc: 'Your AI assistant', href: 'https://javariai.com' },
      { name: 'Javari Resume', desc: 'AI-powered resumes', href: 'https://javari-resume-builder.vercel.app' },
      { name: 'Javari Legal', desc: 'Legal documents', href: 'https://javari-legal.vercel.app' },
      { name: 'Javari Social', desc: 'Social post generator', href: 'https://javarisocial.com' },
      { name: 'Javari Books', desc: 'eBook creator', href: 'https://javaribooks.com' },
    ]
  },
  {
    label: '🏠 Property', href: 'https://javariproperty.com',
    apps: [
      { name: 'Javari Property', desc: 'Real estate hub', href: 'https://javariproperty.com' },
      { name: 'Javari Keys', desc: 'Realtor CRM', href: 'https://javarikeys.com' },
      { name: 'Javari Manage', desc: 'Property management', href: 'https://javarimanage.com' },
      { name: 'Javari Mortgage', desc: 'Rate comparison', href: 'https://javarimortgage.com' },
    ]
  },
  {
    label: '🥃 Collectors', href: 'https://javarispirits.com',
    apps: [
      { name: 'Javari Spirits', desc: 'Whiskey & spirits', href: 'https://javarispirits.com' },
      { name: 'Javari Cards', desc: 'Trading cards', href: 'https://javaricards.com' },
      { name: 'Javari Vinyl', desc: 'Record collections', href: 'https://javari-vinyl-vault.vercel.app' },
      { name: 'Javari Art', desc: 'Fine art tracker', href: 'https://javari-art-archive.vercel.app' },
    ]
  },
  {
    label: '✈️ Travel', href: 'https://javaritravel.com',
    apps: [
      { name: 'Javari Travel', desc: 'Global travel deals', href: 'https://javaritravel.com' },
      { name: 'Orlando Trip Deal', desc: 'Orlando vacations', href: 'https://orlandotripdeal.com' },
    ]
  },
  {
    label: '🎮 Games', href: 'https://javarigames.com',
    apps: [
      { name: 'Javari Games', desc: 'Game hub', href: 'https://javarigames.com' },
      { name: 'Javariverse', desc: 'Virtual world', href: 'https://javariverse.com' },
    ]
  },
  {
    label: '💼 Business', href: `${PLATFORM}/features`,
    apps: [
      { name: 'Javari Marketing', desc: 'Marketing tools', href: 'https://javari-marketing.vercel.app' },
      { name: 'Javari HR', desc: 'Workforce tools', href: 'https://javari-hr-workforce.vercel.app' },
      { name: 'Javari Formation', desc: 'Start your LLC', href: 'https://javari-business-formation.vercel.app' },
      { name: 'Javari Insurance', desc: 'Insurance quotes', href: 'https://javari-insurance.vercel.app' },
    ]
  },
]

interface NavProps {
  appName?: string
  primaryColor?: string
  showCredits?: boolean
}

export default function EcosystemNav({ appName = APP_NAME, primaryColor = '#6366f1', showCredits = true }: NavProps) {
  const [open, setOpen] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [credits, setCredits] = useState<number | null>(null)
  const [user, setUser] = useState<{ name: string; email: string } | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Load user + credits if logged in
  useEffect(() => {
    if (!showCredits) return
    const token = document.cookie.match(/sb-access-token=([^;]+)/)?.[1]
    if (!token) return
    fetch(`${PLATFORM}/api/auth/user`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((d: any) => {
        if (d?.email) { setUser({ name: d.name || d.email, email: d.email }); setCredits(d.credits ?? 0) }
      }).catch(() => {})
  }, [showCredits])

  const S = {
    nav: { position: 'fixed' as const, top: 0, left: 0, right: 0, zIndex: 1000, background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(99,102,241,0.15)', fontFamily: 'Inter, system-ui, sans-serif' },
    inner: { maxWidth: 1280, margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 },
    logo: { display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'white' },
    logoIcon: { fontSize: 20 },
    logoText: { fontWeight: 800, fontSize: 16, background: `linear-gradient(135deg, ${primaryColor}, #8b5cf6)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
    logoSub: { fontSize: 11, color: '#6b7280', marginLeft: 2 },
    navLinks: { display: 'flex', alignItems: 'center', gap: 4 },
    navBtn: { background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '6px 10px', borderRadius: 6, fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit', transition: 'color 0.15s' },
    dropdown: { position: 'absolute' as const, top: '100%', left: 0, background: '#111118', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: 12, minWidth: 220, boxShadow: '0 20px 40px rgba(0,0,0,0.4)', zIndex: 1001 },
    dropItem: { display: 'flex', flexDirection: 'column' as const, padding: '8px 10px', borderRadius: 8, textDecoration: 'none', transition: 'background 0.1s', cursor: 'pointer' },
    dropName: { color: 'white', fontSize: 13, fontWeight: 600 },
    dropDesc: { color: '#6b7280', fontSize: 11 },
    right: { display: 'flex', alignItems: 'center', gap: 8 },
    credits: { background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: '#a5b4fc', cursor: 'pointer' },
    cta: { background: `linear-gradient(135deg, ${primaryColor}, #8b5cf6)`, color: 'white', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 },
    userBtn: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 12px', fontSize: 12, color: '#d1d5db', cursor: 'pointer' },
  }

  return (
    <>
      <nav style={S.nav} ref={ref}>
        <div style={S.inner}>
          {/* Logo */}
          <a href={PLATFORM} style={S.logo}>
            <span style={S.logoIcon}>🤖</span>
            <div>
              <div style={S.logoText}>{appName !== 'Javari' ? appName : 'Javari'}</div>
              {appName !== 'CR AudioViz AI' && <div style={S.logoSub}>by CR AudioViz AI</div>}
            </div>
          </a>

          {/* Desktop nav */}
          <div style={{ ...S.navLinks, display: 'flex' }}>
            {ECOSYSTEM.map(cat => (
              <div key={cat.label} style={{ position: 'relative' }}>
                <button
                  style={{ ...S.navBtn, color: open === cat.label ? 'white' : '#9ca3af' }}
                  onMouseEnter={() => setOpen(cat.label)}
                  onClick={() => setOpen(open === cat.label ? null : cat.label)}
                >
                  {cat.label} <span style={{ fontSize: 10, opacity: 0.6 }}>▾</span>
                </button>
                {open === cat.label && (
                  <div style={S.dropdown} onMouseLeave={() => setOpen(null)}>
                    {cat.apps.map(app => (
                      <a key={app.name} href={app.href} style={S.dropItem}
                         onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.1)')}
                         onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <span style={S.dropName}>{app.name}</span>
                        <span style={S.dropDesc}>{app.desc}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <a href={`${PLATFORM}/pricing`} style={{ ...S.navBtn, color: '#9ca3af', textDecoration: 'none' }}>Pricing</a>
          </div>

          {/* Right side */}
          <div style={S.right}>
            {credits !== null && (
              <a href={`${PLATFORM}/dashboard`} style={S.credits}>⚡ {credits.toLocaleString()} credits</a>
            )}
            {user ? (
              <a href={`${PLATFORM}/dashboard`} style={{ ...S.userBtn, textDecoration: 'none' }}>
                {user.name.split(' ')[0]}
              </a>
            ) : (
              <>
                <a href={`${PLATFORM}/auth/signin?return_to=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '/')}`}
                   style={{ ...S.navBtn, textDecoration: 'none', color: '#9ca3af' }}>Sign In</a>
                <a href={`${PLATFORM}/auth/signup`} style={{ ...S.cta }}>Get Started Free →</a>
              </>
            )}
          </div>
        </div>
      </nav>
      {/* Spacer so content doesn't go under nav */}
      <div style={{ height: 60 }} />
    </>
  )
}
