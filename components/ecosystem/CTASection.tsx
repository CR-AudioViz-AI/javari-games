// components/ecosystem/CTASection.tsx  
// Bottom CTA section for every Javari app
// Drives signups, shows pricing preview, cross-sells the ecosystem
// May 17, 2026 — CR AudioViz AI, LLC
import React from 'react'

const PLATFORM = process.env.NEXT_PUBLIC_CENTRAL_API_URL ?? 'https://craudiovizai.com'

interface CTASectionProps {
  appName?: string
  headline?: string
  subheadline?: string
  primaryColor?: string
  showPricing?: boolean
}

export default function CTASection({
  appName = 'Javari',
  headline,
  subheadline,
  primaryColor = '#6366f1',
  showPricing = true,
}: CTASectionProps) {
  const h = headline ?? `Start using ${appName} for free`
  const sub = subheadline ?? 'Join thousands of users who replaced 12+ subscriptions with one Javari account. Free to start, no credit card needed.'

  const FEATURES = [
    '✓ 50 free AI credits every month',
    '✓ Access to every Javari app',
    '✓ One login, one subscription',
    '✓ Credits never expire on paid plans',
    '✓ Cancel anytime',
  ]

  const PLANS = [
    { name: 'Free', price: '$0', period: '/mo', credits: '50 credits/mo', cta: 'Start Free', href: `${PLATFORM}/auth/signup`, highlight: false },
    { name: 'Starter', price: '$9', period: '/mo', credits: '500 credits/mo', cta: 'Start 7-Day Trial', href: `${PLATFORM}/auth/signup?plan=starter`, highlight: false },
    { name: 'Pro', price: '$29', period: '/mo', credits: '2,000 credits/mo', cta: 'Start 7-Day Trial', href: `${PLATFORM}/auth/signup?plan=pro`, highlight: true },
    { name: 'Business', price: '$99', period: '/mo', credits: '10,000 credits/mo', cta: 'Start 7-Day Trial', href: `${PLATFORM}/auth/signup?plan=business`, highlight: false },
  ]

  const S = {
    section: { background: 'linear-gradient(180deg, #0a0a0f 0%, #0d0d1a 100%)', padding: '80px 24px', borderTop: '1px solid rgba(99,102,241,0.1)', fontFamily: 'Inter, system-ui, sans-serif' },
    inner: { maxWidth: 960, margin: '0 auto', textAlign: 'center' as const },
    badge: { display: 'inline-block', background: `${primaryColor}20`, border: `1px solid ${primaryColor}40`, borderRadius: 20, padding: '4px 16px', color: primaryColor, fontSize: 13, fontWeight: 600, marginBottom: 20 },
    h2: { color: 'white', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, margin: '0 0 16px', lineHeight: 1.2 },
    sub: { color: '#9ca3af', fontSize: 17, lineHeight: 1.6, maxWidth: 560, margin: '0 auto 40px' },
    features: { display: 'flex', flexWrap: 'wrap' as const, justifyContent: 'center', gap: '8px 24px', marginBottom: 48 },
    feat: { color: '#6b7280', fontSize: 14 },
    plans: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 40 },
    plan: { background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '24px 20px', textAlign: 'center' as const, transition: 'border-color 0.2s' },
    planHighlight: { background: `${primaryColor}10`, border: `1px solid ${primaryColor}40` },
    planName: { color: '#9ca3af', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 8 },
    planPrice: { color: 'white', fontSize: 36, fontWeight: 800, lineHeight: 1 },
    planPeriod: { color: '#6b7280', fontSize: 14 },
    planCredits: { color: '#6b7280', fontSize: 13, margin: '8px 0 20px' },
    planCta: { display: 'block', padding: '10px 16px', borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: 'none', transition: 'opacity 0.15s', cursor: 'pointer' },
    ctaDefault: { background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' },
    ctaHighlight: { background: `linear-gradient(135deg, ${primaryColor}, #8b5cf6)`, color: 'white', border: 'none' },
    guarantee: { color: '#4b5563', fontSize: 13 },
  }

  return (
    <section style={S.section}>
      <div style={S.inner}>
        <div style={S.badge}>🚀 Part of the Javari Ecosystem</div>
        <h2 style={S.h2}>{h}</h2>
        <p style={S.sub}>{sub}</p>

        <div style={S.features}>
          {FEATURES.map(f => <span key={f} style={S.feat}>{f}</span>)}
        </div>

        {showPricing && (
          <div style={S.plans}>
            {PLANS.map(plan => (
              <div key={plan.name} style={{ ...S.plan, ...(plan.highlight ? S.planHighlight : {}) }}>
                {plan.highlight && (
                  <div style={{ color: primaryColor, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>MOST POPULAR</div>
                )}
                <div style={S.planName}>{plan.name}</div>
                <div>
                  <span style={S.planPrice}>{plan.price}</span>
                  <span style={S.planPeriod}>{plan.period}</span>
                </div>
                <div style={S.planCredits}>{plan.credits}</div>
                <a href={plan.href} style={{ ...S.planCta, ...(plan.highlight ? S.ctaHighlight : S.ctaDefault) }}>
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        )}

        {!showPricing && (
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 24 }}>
            <a href={`${PLATFORM}/auth/signup`}
               style={{ background: `linear-gradient(135deg, ${primaryColor}, #8b5cf6)`, color: 'white', border: 'none', borderRadius: 10, padding: '14px 32px', fontSize: 16, fontWeight: 700, textDecoration: 'none', cursor: 'pointer' }}>
              Get Started Free →
            </a>
            <a href={`${PLATFORM}/pricing`}
               style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '14px 32px', fontSize: 16, fontWeight: 700, textDecoration: 'none', cursor: 'pointer' }}>
              View Pricing
            </a>
          </div>
        )}

        <p style={S.guarantee}>🔒 7-day free trial · No credit card required · Cancel anytime</p>
      </div>
    </section>
  )
}
