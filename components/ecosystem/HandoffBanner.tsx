// components/ecosystem/HandoffBanner.tsx
// Contextual cross-sell — suggests the right next Javari app
// Based on current app context, shows a dismissible banner
// May 17, 2026 — CR AudioViz AI, LLC
'use client'
import { useState, useEffect } from 'react'

interface HandoffBannerProps {
  currentApp: string
  trigger?: string  // e.g. "resume_created", "cover_needed"
  primaryColor?: string
}

// Handoff map: current app → what to suggest next
const HANDOFFS: Record<string, Array<{ condition?: string; app: string; url: string; emoji: string; pitch: string; cta: string }>> = {
  'javari-resume': [
    { app: 'Javari Cover Letter', url: 'https://javari-cover-letter.vercel.app', emoji: '✉️', pitch: 'Resume ready? Now write a cover letter that gets you hired.', cta: 'Write Cover Letter →' },
    { app: 'Javari Legal', url: 'https://javari-legal.vercel.app', emoji: '📋', pitch: 'Need an employment contract or NDA? We have templates ready.', cta: 'Get Legal Docs →' },
  ],
  'javari-cover-letter': [
    { app: 'Javari Resume', url: 'https://javari-resume-builder.vercel.app', emoji: '📄', pitch: 'Don\'t have a resume yet? Build one in 60 seconds with AI.', cta: 'Build Resume →' },
  ],
  'javari-legal': [
    { app: 'Javari Business Formation', url: 'https://javari-business-formation.vercel.app', emoji: '🏢', pitch: 'Got your legal docs? Now form your LLC or Corporation.', cta: 'Form Your Business →' },
    { app: 'Javari Insurance', url: 'https://javari-insurance.vercel.app', emoji: '🛡️', pitch: 'Protect your new business with the right insurance coverage.', cta: 'Get a Quote →' },
  ],
  'javari-business-formation': [
    { app: 'Javari Legal', url: 'https://javari-legal.vercel.app', emoji: '⚖️', pitch: 'Business formed? Get your operating agreement and contracts sorted.', cta: 'Get Legal Docs →' },
    { app: 'Javari Marketing', url: 'https://javari-marketing.vercel.app', emoji: '📢', pitch: 'Ready to launch? Build your first marketing campaign.', cta: 'Start Marketing →' },
  ],
  'javari-spirits': [
    { app: 'Javari Card Vault', url: 'https://javaricards.com', emoji: '🃏', pitch: 'Collector at heart? Track your trading card collection too.', cta: 'Track Cards →' },
    { app: 'Javari Vinyl Vault', url: 'https://javari-vinyl-vault.vercel.app', emoji: '🎵', pitch: 'Spirits and vinyl — a natural pairing. Track your records.', cta: 'Track Vinyl →' },
  ],
  'javari-property': [
    { app: 'Javari Legal', url: 'https://javari-legal.vercel.app', emoji: '📋', pitch: 'Buying or selling property? Get your contracts and agreements ready.', cta: 'Get Contracts →' },
    { app: 'Javari Insurance', url: 'https://javari-insurance.vercel.app', emoji: '🏠', pitch: 'Protect your property investment with the right coverage.', cta: 'Compare Insurance →' },
  ],
  'javari-travel': [
    { app: 'Orlando Trip Deal', url: 'https://orlandotripdeal.com', emoji: '🏰', pitch: 'Planning a Florida trip? Get the best Orlando deals.', cta: 'Find Orlando Deals →' },
    { app: 'Javari Insurance', url: 'https://javari-insurance.vercel.app', emoji: '✈️', pitch: 'Protect your trip with travel insurance from top carriers.', cta: 'Get Travel Insurance →' },
  ],
  'javari-fitness': [
    { app: 'Javari Health', url: 'https://javari-health.vercel.app', emoji: '🏥', pitch: 'Fitness goals set? Make sure your health coverage keeps up.', cta: 'Check Health Options →' },
  ],
  'javari-marketing': [
    { app: 'Javari Social Posts', url: 'https://javarisocial.com', emoji: '📱', pitch: 'Marketing plan ready? Generate your social posts with AI.', cta: 'Generate Posts →' },
    { app: 'Javari Email Templates', url: 'https://javari-email-templates.vercel.app', emoji: '📧', pitch: 'Don\'t forget email. Build campaigns that convert.', cta: 'Create Emails →' },
  ],
  'javari-social-posts': [
    { app: 'Javari Email Templates', url: 'https://javari-email-templates.vercel.app', emoji: '📧', pitch: 'Social posts done? Complete your campaign with email templates.', cta: 'Build Emails →' },
    { app: 'Javari Marketing', url: 'https://javari-marketing.vercel.app', emoji: '📢', pitch: 'Take your content further with a full marketing strategy.', cta: 'Build Strategy →' },
  ],
  'javari-veterans': [
    { app: 'Javari Legal', url: 'https://javari-legal.vercel.app', emoji: '⚖️', pitch: 'Know your VA rights. Get help with benefits documentation.', cta: 'Get Legal Help →' },
    { app: 'Javari Resume', url: 'https://javari-resume-builder.vercel.app', emoji: '📄', pitch: 'Transitioning to civilian work? Build a resume that translates your service.', cta: 'Build Your Resume →' },
  ],
}

export default function HandoffBanner({ currentApp, trigger, primaryColor = '#6366f1' }: HandoffBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const [suggestion, setSuggestion] = useState<typeof HANDOFFS[string][0] | null>(null)

  useEffect(() => {
    const key = `handoff_dismissed_${currentApp}`
    if (localStorage.getItem(key)) { setDismissed(true); return }

    // Find suggestion
    const appKey = Object.keys(HANDOFFS).find(k => currentApp.includes(k.replace('javari-', '')))
    if (appKey && HANDOFFS[appKey]?.length > 0) {
      // Pick the most relevant one
      const relevant = trigger
        ? HANDOFFS[appKey].find(h => h.condition === trigger) || HANDOFFS[appKey][0]
        : HANDOFFS[appKey][0]
      setSuggestion(relevant)
    }
  }, [currentApp, trigger])

  if (dismissed || !suggestion) return null

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: 16, right: 16,
      maxWidth: 480, margin: '0 auto',
      background: '#111118', border: `1px solid ${primaryColor}40`,
      borderLeft: `3px solid ${primaryColor}`,
      borderRadius: 12, padding: '14px 16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      zIndex: 9990, fontFamily: 'Inter, system-ui, sans-serif',
      display: 'flex', alignItems: 'center', gap: 12,
      animation: 'slideUp 0.3s ease',
    }}>
      <span style={{ fontSize: 24, flexShrink: 0 }}>{suggestion.emoji}</span>
      <div style={{ flex: 1 }}>
        <div style={{ color: '#e5e7eb', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
          {suggestion.pitch}
        </div>
        <a href={suggestion.url}
           style={{ background: `linear-gradient(135deg, ${primaryColor}, #8b5cf6)`, color: 'white', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700, textDecoration: 'none', cursor: 'pointer', display: 'inline-block' }}>
          {suggestion.cta}
        </a>
      </div>
      <button
        onClick={() => { setDismissed(true); localStorage.setItem(`handoff_dismissed_${currentApp}`, '1') }}
        style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4 }}>
        ×
      </button>
      <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  )
}
