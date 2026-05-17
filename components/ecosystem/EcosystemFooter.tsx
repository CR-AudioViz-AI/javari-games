// components/ecosystem/EcosystemFooter.tsx
// Universal footer for every Javari app
// Full ecosystem links, legal, social, EIN
// May 17, 2026 — CR AudioViz AI, LLC
import React from 'react'

const PLATFORM = process.env.NEXT_PUBLIC_CENTRAL_API_URL ?? 'https://craudiovizai.com'
const YEAR = new Date().getFullYear()

const COLS = [
  {
    heading: 'AI Tools',
    links: [
      { label: 'Javari AI', href: 'https://javariai.com' },
      { label: 'Resume Builder', href: 'https://javari-resume-builder.vercel.app' },
      { label: 'Legal Documents', href: 'https://javari-legal.vercel.app' },
      { label: 'Social Posts', href: 'https://javarisocial.com' },
      { label: 'eBook Creator', href: 'https://javaribooks.com' },
      { label: 'Email Templates', href: 'https://javari-email-templates.vercel.app' },
    ]
  },
  {
    heading: 'Property',
    links: [
      { label: 'Javari Property', href: 'https://javariproperty.com' },
      { label: 'Realtor CRM', href: 'https://javarikeys.com' },
      { label: 'Property Mgmt', href: 'https://javarimanage.com' },
      { label: 'Mortgage Rates', href: 'https://javarimortgage.com' },
    ]
  },
  {
    heading: 'Collectors',
    links: [
      { label: 'Javari Spirits', href: 'https://javarispirits.com' },
      { label: 'Trading Cards', href: 'https://javaricards.com' },
      { label: 'Vinyl Records', href: 'https://javari-vinyl-vault.vercel.app' },
      { label: 'Fine Art', href: 'https://javari-art-archive.vercel.app' },
      { label: 'Watch Works', href: 'https://javari-watch-works.vercel.app' },
    ]
  },
  {
    heading: 'Lifestyle',
    links: [
      { label: 'Javari Travel', href: 'https://javaritravel.com' },
      { label: 'Orlando Deals', href: 'https://orlandotripdeal.com' },
      { label: 'Javari Games', href: 'https://javarigames.com' },
      { label: 'Javariverse', href: 'https://javariverse.com' },
      { label: 'Javari Fitness', href: 'https://javari-fitness.vercel.app' },
      { label: 'Javari Dating', href: 'https://javari-dating.vercel.app' },
    ]
  },
  {
    heading: 'Business',
    links: [
      { label: 'Javari Marketing', href: 'https://javari-marketing.vercel.app' },
      { label: 'HR & Workforce', href: 'https://javari-hr-workforce.vercel.app' },
      { label: 'Business Formation', href: 'https://javari-business-formation.vercel.app' },
      { label: 'Insurance', href: 'https://javari-insurance.vercel.app' },
      { label: 'Javari Health', href: 'https://javari-health.vercel.app' },
    ]
  },
  {
    heading: 'Community',
    links: [
      { label: 'Veterans Connect', href: 'https://javari-veterans-connect.vercel.app' },
      { label: 'First Responders', href: 'https://javari-first-responders.vercel.app' },
      { label: 'Animal Rescue', href: 'https://javari-animal-rescue.vercel.app' },
      { label: 'Faith Communities', href: 'https://javari-faith-communities.vercel.app' },
      { label: 'Education', href: 'https://javari-education.vercel.app' },
    ]
  },
]

const SOCIAL = [
  { label: 'Twitter/X', href: 'https://twitter.com/CRAudioVizAI', icon: '𝕏' },
  { label: 'Instagram', href: 'https://instagram.com/CRAudioVizAI', icon: '📷' },
  { label: 'LinkedIn', href: 'https://linkedin.com/company/cr-audioviz-ai', icon: 'in' },
  { label: 'YouTube', href: 'https://youtube.com/@CRAudioVizAI', icon: '▶' },
  { label: 'TikTok', href: 'https://tiktok.com/@CRAudioVizAI', icon: '♪' },
  { label: 'Discord', href: 'https://discord.gg/javari', icon: '💬' },
]

const LEGAL = [
  { label: 'Privacy Policy', href: `${PLATFORM}/privacy` },
  { label: 'Terms of Service', href: `${PLATFORM}/terms` },
  { label: 'Cookie Policy', href: `${PLATFORM}/cookies` },
  { label: 'Accessibility', href: `${PLATFORM}/accessibility` },
  { label: 'AI Disclosure', href: `${PLATFORM}/ai-disclosure` },
]

export default function EcosystemFooter() {
  const S = {
    footer: { background: '#070710', borderTop: '1px solid rgba(99,102,241,0.15)', padding: '48px 24px 24px', fontFamily: 'Inter, system-ui, sans-serif', marginTop: 80 },
    inner: { maxWidth: 1280, margin: '0 auto' },
    brand: { marginBottom: 40 },
    brandName: { fontSize: 22, fontWeight: 800, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 4 },
    brandTag: { color: '#6b7280', fontSize: 14, marginBottom: 12 },
    brandDesc: { color: '#4b5563', fontSize: 13, maxWidth: 360, lineHeight: 1.6 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '32px 24px', marginBottom: 40 },
    colHead: { color: '#9ca3af', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 12 },
    link: { display: 'block', color: '#4b5563', fontSize: 13, textDecoration: 'none', marginBottom: 6, transition: 'color 0.15s', cursor: 'pointer' },
    social: { display: 'flex', gap: 8, marginBottom: 32 },
    socialBtn: { width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', textDecoration: 'none', fontSize: 13, transition: 'background 0.15s' },
    bottom: { borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 24, display: 'flex', flexWrap: 'wrap' as const, justifyContent: 'space-between', alignItems: 'center', gap: 16 },
    copy: { color: '#374151', fontSize: 12 },
    legalLinks: { display: 'flex', flexWrap: 'wrap' as const, gap: '8px 16px' },
    legalLink: { color: '#374151', fontSize: 12, textDecoration: 'none' },
    ein: { color: '#1f2937', fontSize: 11, marginTop: 8 },
  }

  return (
    <footer style={S.footer}>
      <div style={S.inner}>
        {/* Brand */}
        <div style={S.brand}>
          <div style={S.brandName}>🤖 Javari by CR AudioViz AI</div>
          <div style={S.brandTag}>Your Story. Our Design. Everyone Connects. Everyone Wins.</div>
          <div style={S.brandDesc}>
            A comprehensive AI-powered platform serving creators, businesses, collectors,
            veterans, first responders, and communities — all from one unified ecosystem.
          </div>
        </div>

        {/* App grid */}
        <div style={S.grid}>
          {COLS.map(col => (
            <div key={col.heading}>
              <div style={S.colHead}>{col.heading}</div>
              {col.links.map(l => (
                <a key={l.label} href={l.href} style={S.link}
                   onMouseEnter={e => { (e.target as HTMLAnchorElement).style.color = '#a5b4fc' }}
                   onMouseLeave={e => { (e.target as HTMLAnchorElement).style.color = '#4b5563' }}>
                  {l.label}
                </a>
              ))}
            </div>
          ))}
        </div>

        {/* Social */}
        <div style={S.social}>
          {SOCIAL.map(s => (
            <a key={s.label} href={s.href} title={s.label} style={S.socialBtn}
               onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(99,102,241,0.15)' }}
               onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.05)' }}>
              {s.icon}
            </a>
          ))}
        </div>

        {/* Bottom legal */}
        <div style={S.bottom}>
          <div>
            <div style={S.copy}>© {YEAR} CR AudioViz AI, LLC — All rights reserved.</div>
            <div style={S.ein}>EIN: 39-3646201 | Fort Myers, Florida, USA | support@craudiovizai.com</div>
          </div>
          <div style={S.legalLinks}>
            {LEGAL.map(l => (
              <a key={l.label} href={l.href} style={S.legalLink}
                 onMouseEnter={e => { (e.target as HTMLAnchorElement).style.color = '#6366f1' }}
                 onMouseLeave={e => { (e.target as HTMLAnchorElement).style.color = '#374151' }}>
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
