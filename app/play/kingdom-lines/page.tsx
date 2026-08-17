'use client'
// app/play/kingdom-lines/page.tsx — Kingdom Lines
//
// Game six of twenty-five, opening the Strategy set. Built on the WebGL bloom
// chain from the start rather than retrofitted.
//
// The AI's read of the board is shown in the HUD. Most strategy games hide
// what the opponent thinks, which makes a good counter feel like luck. Showing
// it turns the match into a conversation: it sees three archers, so it is about
// to buy cavalry, so I should buy spears.
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026
import { useCallback, useEffect, useRef, useState } from 'react'
import { BloomRenderer, makeBloom } from '@/lib/gfx/bloom'
import {
  LEVEL_COUNT, LEVEL_NAMES, ORDER, State, UNITS, UnitType,
  canAfford, deploy, newState, nextLevel, retryLevel, start, step,
} from './engine'

export default function KingdomLines() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const sceneRef = useRef<HTMLCanvasElement | null>(null)
  const bloomRef = useRef<BloomRenderer | null>(null)
  const ref = useRef<State | null>(null)
  const [ui, setUi] = useState({
    phase: 'briefing', level: 0, gold: 90, keep: 400, foeKeep: 400,
    lane: 1, time: 0, msg: '', best: 0,
    read: { spear: 0, cavalry: 0, archer: 0, shield: 0, mage: 0 } as Record<UnitType, number>,
  })

  const sync = useCallback(() => {
    const s = ref.current
    if (!s) return
    setUi({ phase: s.phase, level: s.level, gold: Math.floor(s.gold), keep: Math.max(0, Math.round(s.keep)),
            foeKeep: Math.max(0, Math.round(s.foeKeep)), lane: s.selectedLane,
            time: s.time, msg: s.message, best: s.best[s.level] ?? 0, read: { ...s.read } })
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!sceneRef.current) sceneRef.current = document.createElement('canvas')
    const scene = sceneRef.current
    const ctx = scene.getContext('2d', { alpha: false })
    if (!ctx) return
    bloomRef.current = makeBloom(canvas, { intensity: 1.0, threshold: 0.60, aberration: 0.007, vignette: 0.40 })

    let W = 900, H = 500, DPR = 1
    const resize = () => {
      const r = canvas.parentElement?.getBoundingClientRect()
      W = Math.min(1100, r ? r.width - 8 : 900)
      H = Math.round(W * 0.52)
      DPR = Math.min(window.devicePixelRatio || 1, 2)
      scene.width = W * DPR; scene.height = H * DPR
      bloomRef.current?.resize(W * DPR, H * DPR)
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
      if (!ref.current) {
        let best: Record<number, number> = {}
        try { best = JSON.parse(window.localStorage?.getItem('klines.best') ?? '{}') } catch { best = {} }
        ref.current = newState(0, best)
      }
      sync()
    }
    resize()
    window.addEventListener('resize', resize)

    const pick = (e: PointerEvent) => {
      const s = ref.current
      if (!s) return
      const r = canvas.getBoundingClientRect()
      const y = (e.clientY - r.top) / (r.height || 1)
      s.selectedLane = Math.max(0, Math.min(2, Math.floor(y * 3)))
      sync()
    }
    canvas.addEventListener('pointerdown', pick)

    const kd = (e: KeyboardEvent) => {
      const s = ref.current
      if (!s) return
      const n = parseInt(e.key, 10)
      if (n >= 1 && n <= 5) { deploy(s, ORDER[n - 1], s.selectedLane); sync() }
      if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') { s.selectedLane = Math.max(0, s.selectedLane - 1); sync() }
      if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') { s.selectedLane = Math.min(2, s.selectedLane + 1); sync() }
    }
    window.addEventListener('keydown', kd)

    let raf = 0, last = performance.now(), acc = 0
    const STEP = 1 / 60
    const frame = (now: number) => {
      const s = ref.current
      if (!s) { raf = requestAnimationFrame(frame); return }
      acc += Math.min(0.25, (now - last) / 1000)
      last = now
      const before = s.phase
      while (acc >= STEP) { step(s, STEP); acc -= STEP }
      draw(ctx, s, W, H)
      bloomRef.current?.present(scene, now)
      if (s.phase !== before) sync()
      else if (Math.random() < 0.25) sync()
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      bloomRef.current?.dispose()
      window.removeEventListener('resize', resize)
      window.removeEventListener('keydown', kd)
      canvas.removeEventListener('pointerdown', pick)
    }
  }, [sync])

  useEffect(() => {
    const s = ref.current
    if (!s) return
    try { window.localStorage?.setItem('klines.best', JSON.stringify(s.best)) } catch { /* private mode */ }
  }, [ui.phase])

  const begin = () => { const s = ref.current; if (s) { start(s); sync() } }
  const onward = () => { const s = ref.current; if (s) { nextLevel(s); sync() } }
  const again = () => { const s = ref.current; if (s) { retryLevel(s); sync() } }
  const buy = (t: UnitType) => { const s = ref.current; if (s) { deploy(s, t, s.selectedLane); sync() } }

  const s = ref.current

  return (
    <div style={{ minHeight: '100vh', background: '#060509', color: '#EDE7F5',
                  fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 8, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>
            KINGDOM<span style={{ color: '#C9A6FF' }}>LINES</span>
          </h1>
          <span style={{ color: 'rgba(237,231,245,0.55)', fontSize: 13 }}>
            It reads your board every second and answers it.
          </span>
        </header>

        <div style={{ display: 'flex', gap: 18, fontSize: 13, marginBottom: 8, flexWrap: 'wrap' }}>
          <Stat label="FIELD" value={`${ui.level + 1}. ${LEVEL_NAMES[ui.level]}`} />
          <Stat label="GOLD" value={String(ui.gold)} tone="#F5C542" />
          <Stat label="YOUR KEEP" value={String(ui.keep)} tone="#7BE495" />
          <Stat label="ENEMY KEEP" value={String(ui.foeKeep)} tone="#FF6B6B" />
          <Stat label="LANE" value={['Top', 'Middle', 'Bottom'][ui.lane]} tone="#C9A6FF" />
          <Stat label="BEST" value={ui.best ? `${ui.best}s` : '—'} />
        </div>

        <div style={{ position: 'relative' }}>
          <canvas ref={canvasRef} style={{ display: 'block', borderRadius: 12,
            border: '1px solid rgba(201,166,255,0.18)', background: '#060509', cursor: 'pointer' }} />

          {ui.phase === 'briefing' && (
            <Overlay>
              <h2 style={{ fontSize: 26, margin: '0 0 4px' }}>{LEVEL_NAMES[ui.level]}</h2>
              <p style={{ color: 'rgba(237,231,245,0.7)', maxWidth: 470, margin: '0 0 6px' }}>{ui.msg}</p>
              <p style={{ color: 'rgba(237,231,245,0.45)', maxWidth: 470, margin: '0 0 18px', fontSize: 13 }}>
                Click a lane or use <b>W</b>/<b>S</b> to choose it. Press <b>1–5</b> or click a card to deploy.
                The opponent sees only your units — no extra gold, no hidden information.
              </p>
              <Button onClick={begin}>Take the field</Button>
            </Overlay>
          )}

          {ui.phase === 'won' && (
            <Overlay>
              <h2 style={{ fontSize: 26, margin: '0 0 4px' }}>The line held</h2>
              <p style={{ color: 'rgba(237,231,245,0.7)', margin: '0 0 18px' }}>{ui.msg}</p>
              <Button onClick={ui.level >= LEVEL_COUNT - 1 ? again : onward}>
                {ui.level >= LEVEL_COUNT - 1 ? 'Play again' : 'Next field'}
              </Button>
            </Overlay>
          )}

          {ui.phase === 'lost' && (
            <Overlay>
              <h2 style={{ fontSize: 24, margin: '0 0 6px' }}>{ui.msg}</h2>
              <p style={{ color: 'rgba(237,231,245,0.55)', maxWidth: 430, margin: '0 0 18px', fontSize: 13 }}>
                Watch the READ panel — it shows what the opponent believes it is facing.
                Change what it sees and its next purchase changes with it.
              </p>
              <Button onClick={again}>Again</Button>
            </Overlay>
          )}
        </div>

        {/* Deployment cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(178px,1fr))',
                      gap: 8, marginTop: 10 }}>
          {ORDER.map((t, i) => {
            const d = UNITS[t]
            const ok = s ? canAfford(s, t) && ui.phase === 'battle' : false
            return (
              <button key={t} onClick={() => buy(t)} disabled={!ok}
                style={{ textAlign: 'left', padding: '9px 11px', borderRadius: 10,
                  background: ok ? `hsla(${d.hue},70%,22%,0.55)` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${ok ? `hsla(${d.hue},80%,58%,0.55)` : 'rgba(255,255,255,0.08)'}`,
                  color: '#EDE7F5', cursor: ok ? 'pointer' : 'default', opacity: ok ? 1 : 0.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 13.5 }}>
                  <span>{i + 1}. {d.name}</span>
                  <span style={{ color: '#F5C542' }}>{d.cost}g</span>
                </div>
                <div style={{ fontSize: 11.5, color: 'rgba(237,231,245,0.62)', marginTop: 2 }}>{d.blurb}</div>
                <div style={{ fontSize: 11, color: `hsla(${d.hue},80%,70%,0.9)`, marginTop: 3 }}>
                  {d.hp} hp · {d.dmg} dmg · {d.range > 80 ? 'ranged' : 'melee'}
                </div>
              </button>
            )
          })}
        </div>

        {/* The opponent's read — deliberately visible */}
        <div style={{ marginTop: 10, padding: '9px 12px', borderRadius: 10,
                      background: 'rgba(255,107,107,0.07)', border: '1px solid rgba(255,107,107,0.2)' }}>
          <div style={{ fontSize: 10, letterSpacing: 1.3, color: 'rgba(255,107,107,0.8)', marginBottom: 4 }}>
            WHAT THE OPPONENT SEES
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12.5 }}>
            {ORDER.map(t => (
              <span key={t} style={{ color: ui.read[t] > 0.6 ? `hsl(${UNITS[t].hue},80%,68%)` : 'rgba(237,231,245,0.32)' }}>
                {UNITS[t].name}: {ui.read[t].toFixed(1)}
              </span>
            ))}
          </div>
        </div>

        <p style={{ color: 'rgba(237,231,245,0.3)', fontSize: 12, marginTop: 10 }}>
          The opponent scores every affordable purchase against a threat model built only from
          visible units. No extra gold, no lookahead, no hidden information ·
          CR AudioViz AI · EIN 39-3646201
        </p>
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: 1.2, color: 'rgba(237,231,245,0.4)' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: tone ?? '#EDE7F5' }}>{value}</div>
    </div>
  )
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                  background: 'rgba(6,5,9,0.88)', borderRadius: 12, padding: 20 }}>
      {children}
    </div>
  )
}

function Button({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ background: '#FF0800', color: '#fff', border: 'none',
      borderRadius: 10, padding: '12px 30px', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
      {children}
    </button>
  )
}

function draw(ctx: CanvasRenderingContext2D, s: State, W: number, H: number) {
  const laneH = H / 3
  const laneY = (l: number) => laneH * l + laneH / 2
  const px = (x: number) => 60 + x * (W - 120)

  const sky = ctx.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, '#0B0714')
  sky.addColorStop(1, '#060509')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)

  // Lanes
  for (let l = 0; l < 3; l++) {
    const sel = l === s.selectedLane
    ctx.fillStyle = sel ? 'rgba(201,166,255,0.055)' : 'rgba(255,255,255,0.015)'
    ctx.fillRect(0, laneH * l + 3, W, laneH - 6)
    ctx.strokeStyle = sel ? 'rgba(201,166,255,0.4)' : 'rgba(255,255,255,0.06)'
    ctx.lineWidth = sel ? 1.6 : 1
    ctx.strokeRect(0.5, laneH * l + 3.5, W - 1, laneH - 7)
  }

  ctx.globalCompositeOperation = 'lighter'

  // Keeps
  const keepBar = (x: number, hp: number, hue: number) => {
    const frac = Math.max(0, hp / 400)
    const g = ctx.createLinearGradient(x - 26, 0, x + 26, 0)
    g.addColorStop(0, `hsla(${hue},90%,55%,0)`)
    g.addColorStop(0.5, `hsla(${hue},90%,60%,0.5)`)
    g.addColorStop(1, `hsla(${hue},90%,55%,0)`)
    ctx.fillStyle = g
    ctx.fillRect(x - 26, 0, 52, H)
    ctx.fillStyle = `hsla(${hue},90%,64%,0.95)`
    ctx.fillRect(x - 5, H * (1 - frac) * 0.5 + 8, 10, (H - 16) * frac)
  }
  keepBar(30, s.keep, 150)
  keepBar(W - 30, s.foeKeep, 350)

  // Attack bolts
  for (const b of s.bolts) {
    const x1 = px(b.from.x), y1 = laneY(b.from.lane)
    const x2 = px(b.to.x), y2 = laneY(b.to.lane)
    const t = b.t
    ctx.strokeStyle = `hsla(${b.hue},100%,70%,${(1 - t) * 0.9})`
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.moveTo(x1 + (x2 - x1) * Math.max(0, t - 0.25), y1 + (y2 - y1) * Math.max(0, t - 0.25))
    ctx.lineTo(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)
    ctx.stroke()
  }

  for (const p of s.particles) {
    ctx.fillStyle = `hsla(${p.hue},95%,66%,${Math.min(1, p.life * 2)})`
    ctx.beginPath(); ctx.arc(px(p.x), laneY(p.lane) + p.vy * 0.1, p.size, 0, Math.PI * 2); ctx.fill()
  }

  // Units
  for (const u of s.units) {
    const d = UNITS[u.type]
    const x = px(u.x), y = laneY(u.lane)
    const foe = u.side === 'foe'
    const hue = foe ? 350 : d.hue
    const r = u.type === 'shield' ? 15 : u.type === 'mage' ? 12 : 11

    // Range band, faint, so positioning is legible.
    if (u.target === null && d.range > 80) {
      ctx.strokeStyle = `hsla(${hue},80%,60%,0.10)`
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.arc(x, y, d.range * 0.55, 0, Math.PI * 2); ctx.stroke()
    }

    ctx.fillStyle = u.hitFlash > 0
      ? `hsla(0,0%,100%,${0.55 + u.hitFlash * 0.4})`
      : `hsla(${hue},80%,${foe ? 46 : 56}%,0.95)`
    ctx.strokeStyle = `hsla(${hue},95%,76%,0.95)`
    ctx.lineWidth = 1.6
    ctx.beginPath()
    if (u.type === 'cavalry') {
      // forward wedge
      const dir = foe ? -1 : 1
      ctx.moveTo(x + r * 1.4 * dir, y)
      ctx.lineTo(x - r * 0.7 * dir, y - r * 0.85)
      ctx.lineTo(x - r * 0.7 * dir, y + r * 0.85)
      ctx.closePath()
    } else if (u.type === 'shield') {
      ctx.rect(x - r * 0.7, y - r, r * 1.4, r * 2)
    } else if (u.type === 'mage') {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + s.time
        const fn = i === 0 ? 'moveTo' : 'lineTo'
        ctx[fn](x + Math.cos(a) * r, y + Math.sin(a) * r)
      }
      ctx.closePath()
    } else {
      ctx.arc(x, y, r, 0, Math.PI * 2)
    }
    ctx.fill(); ctx.stroke()

    // Health pip
    const frac = u.hp / u.maxHp
    if (frac < 1) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(x - r, y - r - 7, r * 2, 3)
      ctx.fillStyle = frac > 0.5 ? 'hsla(140,90%,58%,0.95)' : 'hsla(20,95%,58%,0.95)'
      ctx.fillRect(x - r, y - r - 7, r * 2 * frac, 3)
    }
  }

  ctx.globalCompositeOperation = 'source-over'
}
