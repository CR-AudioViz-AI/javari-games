// components/JavariHelp.tsx
// Context-sensitive AI help widget for every Javari app
// Floats bottom-right, knows which app the user is on
// Connects to javariai.com for real AI responses
// May 17, 2026 — CR AudioViz AI, LLC
'use client'
import { useState, useEffect, useRef } from 'react'

const JAV_AI = 'https://javariai.com'
const PLATFORM = 'https://craudiovizai.com'

interface HelpProps {
  appName?: string
  appColor?: string
  appContext?: string
  quickQuestions?: string[]
  docsUrl?: string
}

interface Msg { role: 'user'|'assistant'; content: string; ts: number }

export default function JavariHelp({
  appName = 'Javari',
  appColor = '#6366f1',
  appContext = '',
  quickQuestions = [],
  docsUrl = `${PLATFORM}/docs`,
}: HelpProps) {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'chat'|'docs'|'shortcuts'>('chat')
  const bottom = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const defaultQs = quickQuestions.length > 0 ? quickQuestions : [
    `How do I get started with ${appName}?`,
    `What can ${appName} do?`,
    'How do credits work?',
    'How do I upgrade my plan?',
  ]

  useEffect(() => {
    if (open && msgs.length === 0) {
      setMsgs([{
        role: 'assistant',
        content: `Hi! I'm Javari, your AI assistant for ${appName}. I can answer questions, walk you through features, and help you get the most out of the platform. What do you need?`,
        ts: Date.now(),
      }])
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 200)
  }, [open])

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  const send = async (message: string) => {
    const text = message || input.trim()
    if (!text || loading) return
    setInput('')
    const newMsgs: Msg[] = [...msgs, { role: 'user', content: text, ts: Date.now() }]
    setMsgs(newMsgs)
    setLoading(true)

    try {
      const res = await fetch(`${JAV_AI}/api/javari/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context: `The user is using ${appName}. ${appContext} Help them with this specific question about ${appName}. Be concise and practical.`,
        }),
      })
      if (res.ok) {
        const d = await res.json() as { content?: string; response?: string }
        const reply = d.content ?? d.response ?? 'I had trouble connecting — please try again.'
        setMsgs([...newMsgs, { role: 'assistant', content: reply, ts: Date.now() }])
      } else {
        setMsgs([...newMsgs, { role: 'assistant', content: 'Connection issue — the full Javari AI is at javariai.com/javari', ts: Date.now() }])
      }
    } catch {
      setMsgs([...newMsgs, { role: 'assistant', content: `Try the full Javari AI at javariai.com for help with ${appName}.`, ts: Date.now() }])
    } finally { setLoading(false) }
  }

  const C = appColor

  return (
    <>
      {/* ── HELP BUTTON ── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title={`Get help with ${appName}`}
          aria-label="Open help"
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 9995,
            background: `linear-gradient(135deg, ${C}, #8b5cf6)`,
            color: 'white', border: 'none', borderRadius: 28,
            padding: '0 20px', height: 52, fontSize: 14, fontWeight: 700,
            cursor: 'pointer', boxShadow: `0 4px 20px ${C}50`,
            display: 'flex', alignItems: 'center', gap: 8,
            fontFamily: 'Inter, system-ui, sans-serif', transition: 'transform 0.2s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'none' }}
        >
          <span style={{ fontSize: 18 }}>🤖</span>
          <span>Help</span>
        </button>
      )}

      {/* ── HELP PANEL ── */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 9996,
          width: 380, height: 560, background: '#0d0d1a',
          border: `1px solid ${C}30`, borderRadius: 18,
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          fontFamily: 'Inter, system-ui, sans-serif',
          animation: 'helpSlide 0.25s ease',
        }}>
          <style>{`@keyframes helpSlide { from { transform: translateY(20px); opacity:0 } to { transform: translateY(0); opacity:1 } }`}</style>

          {/* Header */}
          <div style={{ background: `linear-gradient(135deg, ${C}, #8b5cf6)`, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>🤖</span>
              <div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>Javari Help</div>
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>{appName} · AI-powered support</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <a href={`${JAV_AI}/javari`} target="_blank" rel="noopener" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, textDecoration: 'none' }}>Full AI →</a>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, background: '#111118', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {([['chat','💬 Chat'],['docs','📚 Docs'],['shortcuts','⚡ Quick']] as const).map(([t,l]) => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: '9px 0', background: tab===t?`${C}20`:'none',
                border: 'none', borderBottom: tab===t?`2px solid ${C}`:'2px solid transparent',
                color: tab===t?C:'#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>{l}</button>
            ))}
          </div>

          {/* Chat tab */}
          {tab === 'chat' && (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {msgs.map((m, i) => (
                  <div key={i} style={{ alignSelf: m.role==='user'?'flex-end':'flex-start', maxWidth: '88%' }}>
                    <div style={{
                      background: m.role==='user' ? `linear-gradient(135deg, ${C}, #8b5cf6)` : '#1a1a2e',
                      color: 'white', padding: '9px 12px', fontSize: 13, lineHeight: 1.55,
                      borderRadius: m.role==='user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      whiteSpace: 'pre-wrap',
                    }}>{m.content}</div>
                  </div>
                ))}
                {loading && (
                  <div style={{ alignSelf: 'flex-start', background: '#1a1a2e', padding: '9px 12px', borderRadius: '12px 12px 12px 2px', color: '#6b7280', fontSize: 13 }}>
                    Thinking…
                  </div>
                )}
                <div ref={bottom} />
              </div>

              {/* Quick questions */}
              <div style={{ padding: '6px 12px', display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0 }}>
                {defaultQs.slice(0, 3).map(q => (
                  <button key={q} onClick={() => send(q)} style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '4px 10px', fontSize: 11, color: '#6b7280', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                    {q.length > 30 ? q.slice(0, 28) + '…' : q}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 8 }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && !e.shiftKey && (e.preventDefault(), send(''))}
                  placeholder="Ask anything about this app..."
                  style={{ flex: 1, background: '#1a1a2e', border: `1px solid ${C}20`, borderRadius: 8, padding: '8px 12px', color: 'white', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
                />
                <button onClick={() => send('')} disabled={!input.trim()||loading} style={{
                  background: input.trim() ? `linear-gradient(135deg, ${C}, #8b5cf6)` : '#1a1a2e',
                  border: 'none', borderRadius: 8, padding: '8px 12px', color: 'white', cursor: input.trim() ? 'pointer' : 'default', fontSize: 14, fontWeight: 700,
                }}>→</button>
              </div>
            </>
          )}

          {/* Docs tab */}
          {tab === 'docs' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              <a href={docsUrl} target="_blank" rel="noopener" style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#1a1a2e', border: `1px solid ${C}20`, borderRadius: 12, padding: '14px', textDecoration: 'none', marginBottom: 12 }}>
                <span style={{ fontSize: 24 }}>📚</span>
                <div>
                  <div style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>{appName} Documentation</div>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>Full guide, API reference, examples</div>
                </div>
              </a>
              {[
                { e:'🚀', t:'Getting Started', u:`${PLATFORM}/docs/getting-started` },
                { e:'💳', t:'Credits & Billing', u:`${PLATFORM}/docs/billing` },
                { e:'🔑', t:'API Reference', u:`${PLATFORM}/docs/api` },
                { e:'🔒', t:'Privacy & Security', u:`${PLATFORM}/privacy` },
                { e:'📞', t:'Contact Support', u:`${PLATFORM}/support` },
              ].map(({ e,t,u }) => (
                <a key={t} href={u} target="_blank" rel="noopener" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', color: '#d1d5db', textDecoration: 'none', borderRadius: 8, marginBottom: 4 }}
                   onMouseEnter={ev => { (ev.currentTarget as HTMLAnchorElement).style.background = `${C}15` }}
                   onMouseLeave={ev => { (ev.currentTarget as HTMLAnchorElement).style.background = 'none' }}>
                  <span>{e}</span><span style={{ fontSize: 14 }}>{t}</span>
                  <span style={{ marginLeft: 'auto', color: '#374151', fontSize: 12 }}>→</span>
                </a>
              ))}
            </div>
          )}

          {/* Quick shortcuts tab */}
          {tab === 'shortcuts' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 12 }}>Tap to ask instantly:</div>
              {defaultQs.map(q => (
                <button key={q} onClick={() => { setTab('chat'); setTimeout(() => send(q), 100) }}
                  style={{ display: 'block', width: '100%', background: '#1a1a2e', border: `1px solid ${C}15`, borderRadius: 10, padding: '12px 14px', color: '#d1d5db', textAlign: 'left', cursor: 'pointer', marginBottom: 8, fontSize: 13, fontFamily: 'inherit', fontWeight: 500 }}>
                  {q}
                </button>
              ))}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <a href={`${JAV_AI}/javari`} style={{ display: 'flex', alignItems: 'center', gap: 8, color: C, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                  <span style={{ fontSize: 18 }}>🤖</span> Open full Javari AI →
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
