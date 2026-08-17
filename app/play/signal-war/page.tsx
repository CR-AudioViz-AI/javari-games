'use client'
// app/play/signal-war/page.tsx — Signal War
//
// Game seven of twenty-five. Hex conquest under fog of war, against an opponent
// that plans from its own stale intelligence rather than from the truth.
//
// Three fog states are drawn differently, because collapsing them loses the
// whole game: never seen is black, remembered is dimmed and shows the last
// known state, currently visible is lit and live. A player must be able to tell
// "I know this is empty" from "I have not looked recently".
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026
import { useCallback, useEffect, useRef, useState } from 'react'
import { BloomRenderer, makeBloom } from '@/lib/gfx/bloom'
import {
  LEVEL_COUNT, LEVEL_NAMES, State, Tile, axialToPixel, canMove, currentlyVisible,
  endTurn, key, newState, nextLevel, observe, pixelToAxial, resolveMove, retryLevel,
  startBattle, step, visibleToPlayer,
} from './engine'

export default function SignalWar() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const sceneRef = useRef<HTMLCanvasElement | null>(null)
  const bloomRef = useRef<BloomRenderer | null>(null)
  const ref = useRef<State | null>(null)
  const view = useRef({ size: 26, ox: 0, oy: 0 })
  const hover = useRef<string | null>(null)
  const [ui, setUi] = useState({ phase: 'briefing', level: 0, turn: 1, signal: 0,
                                 foeSignal: 0, mine: 0, theirs: 0, sel: '',
                                 msg: '', best: 0, log: [] as string[] })

  const sync = useCallback(() => {
    const s = ref.current
    if (!s) return
    let mine = 0, theirs = 0
    for (const t of s.tiles.values()) {
      if (t.owner === 'player') mine++
      else if (t.owner === 'foe') theirs++
    }
    setUi({ phase: s.phase, level: s.level, turn: s.turn, signal: s.signal,
            foeSignal: s.foeSignal, mine, theirs, sel: s.selected ?? '',
            msg: s.message, best: s.best[s.level] ?? 0, log: [...s.log] })
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!sceneRef.current) sceneRef.current = document.createElement('canvas')
    const scene = sceneRef.current
    const ctx = scene.getContext('2d', { alpha: false })
    if (!ctx) return
    bloomRef.current = makeBloom(canvas, { intensity: 0.95, threshold: 0.62, aberration: 0.006, vignette: 0.44 })

    let W = 900, H = 560, DPR = 1
    const layout = () => {
      const s = ref.current
      if (!s) return
      const span = s.radius * 2 + 1
      view.current.size = Math.min(W / (Math.sqrt(3) * (span + 1)), H / (1.5 * (span + 1)))
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      for (const t of s.tiles.values()) {
        const p = axialToPixel(t.q, t.r, view.current.size)
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
      }
      view.current.ox = (W - (maxX - minX)) / 2 - minX
      view.current.oy = (H - (maxY - minY)) / 2 - minY
    }

    const resize = () => {
      const r = canvas.parentElement?.getBoundingClientRect()
      W = Math.min(1100, r ? r.width - 8 : 900)
      H = Math.round(W * 0.60)
      DPR = Math.min(window.devicePixelRatio || 1, 2)
      scene.width = W * DPR; scene.height = H * DPR
      bloomRef.current?.resize(W * DPR, H * DPR)
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
      if (!ref.current) {
        let best: Record<number, number> = {}
        try { best = JSON.parse(window.localStorage?.getItem('sigwar.best') ?? '{}') } catch { best = {} }
        ref.current = newState(0, best)
      }
      layout()
      sync()
    }
    resize()
    window.addEventListener('resize', resize)

    const at = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      return pixelToAxial(e.clientX - r.left - view.current.ox,
                          e.clientY - r.top - view.current.oy, view.current.size)
    }
    const move = (e: PointerEvent) => {
      const a = at(e)
      hover.current = key(a.q, a.r)
    }
    const click = (e: PointerEvent) => {
      const s = ref.current
      if (!s || s.phase !== 'player') return
      const a = at(e)
      const k = key(a.q, a.r)
      const t = s.tiles.get(k)
      if (!t) return
      if (s.selected && s.selected !== k) {
        const from = s.tiles.get(s.selected)
        if (from && canMove(s, from, t, 'player')) {
          resolveMove(s, from, t, from.units - 1, 'player')
          // Taking ground reveals what it can see.
          observe(s, 'player')
          s.selected = null
          sync()
          return
        }
      }
      s.selected = t.owner === 'player' && t.units >= 2 ? k : null
      sync()
    }
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerdown', click)

    let raf = 0, last = performance.now()
    const frame = (now: number) => {
      const s = ref.current
      if (!s) { raf = requestAnimationFrame(frame); return }
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      step(s, dt)
      draw(ctx, s, W, H, view.current, hover.current)
      bloomRef.current?.present(scene, now)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      bloomRef.current?.dispose()
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerdown', click)
    }
  }, [sync])

  useEffect(() => {
    const s = ref.current
    if (!s) return
    try { window.localStorage?.setItem('sigwar.best', JSON.stringify(s.best)) } catch { /* private mode */ }
  }, [ui.phase])

  const begin = () => { const s = ref.current; if (s) { startBattle(s); sync() } }
  const done = () => { const s = ref.current; if (s) { endTurn(s); sync() } }
  const onward = () => { const s = ref.current; if (s) { nextLevel(s); sync() } }
  const again = () => { const s = ref.current; if (s) { retryLevel(s); sync() } }

  return (
    <div style={{ minHeight: '100vh', background: '#04070A', color: '#DFF0F5',
                  fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 8, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>
            SIGNAL<span style={{ color: '#4FD1FF' }}>WAR</span>
          </h1>
          <span style={{ color: 'rgba(223,240,245,0.55)', fontSize: 13 }}>
            It plans from what it last saw. Move where it stopped looking.
          </span>
        </header>

        <div style={{ display: 'flex', gap: 18, fontSize: 13, marginBottom: 8, flexWrap: 'wrap' }}>
          <Stat label="SECTOR" value={`${ui.level + 1}. ${LEVEL_NAMES[ui.level]}`} />
          <Stat label="TURN" value={String(ui.turn)} />
          <Stat label="YOURS" value={String(ui.mine)} tone="#7BE495" />
          <Stat label="THEIRS" value={String(ui.theirs)} tone="#FF6B6B" />
          <Stat label="SIGNAL" value={String(ui.signal)} tone="#4FD1FF" />
          <Stat label="BEST" value={ui.best ? `${ui.best} turns` : '—'} />
          {ui.phase === 'player' && (
            <button onClick={done} style={{ background: '#FF0800', color: '#fff', border: 'none',
              borderRadius: 8, padding: '8px 18px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
              End turn
            </button>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <canvas ref={canvasRef} style={{ display: 'block', borderRadius: 12,
            border: '1px solid rgba(79,209,255,0.18)', background: '#04070A',
            cursor: ui.phase === 'player' ? 'pointer' : 'default', touchAction: 'none' }} />

          {ui.phase === 'briefing' && (
            <Overlay>
              <h2 style={{ fontSize: 26, margin: '0 0 4px' }}>{LEVEL_NAMES[ui.level]}</h2>
              <p style={{ color: 'rgba(223,240,245,0.7)', maxWidth: 470, margin: '0 0 6px' }}>{ui.msg}</p>
              <p style={{ color: 'rgba(223,240,245,0.45)', maxWidth: 470, margin: '0 0 18px', fontSize: 13 }}>
                Click one of your tiles, then a neighbour, to attack or reinforce. A tile must
                keep one unit behind. Dimmed tiles are remembered, not observed — and the
                opponent has exactly the same problem with your side of the map.
              </p>
              <Button onClick={begin}>Open the channel</Button>
            </Overlay>
          )}

          {ui.phase === 'won' && (
            <Overlay>
              <h2 style={{ fontSize: 26, margin: '0 0 4px' }}>Network secured</h2>
              <p style={{ color: 'rgba(223,240,245,0.7)', margin: '0 0 18px' }}>{ui.msg}</p>
              <Button onClick={ui.level >= LEVEL_COUNT - 1 ? again : onward}>
                {ui.level >= LEVEL_COUNT - 1 ? 'Play again' : 'Next sector'}
              </Button>
            </Overlay>
          )}

          {ui.phase === 'lost' && (
            <Overlay>
              <h2 style={{ fontSize: 24, margin: '0 0 6px' }}>{ui.msg}</h2>
              <p style={{ color: 'rgba(223,240,245,0.55)', maxWidth: 430, margin: '0 0 18px', fontSize: 13 }}>
                Relays reinforce every turn and see three tiles out. Losing yours is usually
                what loses the map.
              </p>
              <Button onClick={again}>Again</Button>
            </Overlay>
          )}
        </div>

        <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap', fontSize: 12 }}>
          <Legend colour="#7BE495" label="Yours" />
          <Legend colour="#FF6B6B" label="Theirs" />
          <Legend colour="#8A97A8" label="Neutral" />
          <Legend colour="#F5C542" label="Relay — sees 3, reinforces" />
          <Legend colour="#9F7BFF" label="Ridge — sees 2, costs 2 to cross" />
        </div>

        {ui.log.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(223,240,245,0.5)' }}>
            {ui.log.map((l, i) => <div key={i} style={{ opacity: 1 - i * 0.14 }}>{l}</div>)}
          </div>
        )}

        <p style={{ color: 'rgba(223,240,245,0.3)', fontSize: 12, marginTop: 10 }}>
          The opponent keeps its own belief map and plans against stale intelligence · territory
          value propagated by relaxation, so chokepoints emerge from the map ·
          CR AudioViz AI · EIN 39-3646201
        </p>
      </div>
    </div>
  )
}

function Legend({ colour, label }: { colour: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'rgba(223,240,245,0.6)' }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: colour, display: 'inline-block' }} />
      {label}
    </span>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: 1.2, color: 'rgba(223,240,245,0.4)' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: tone ?? '#DFF0F5' }}>{value}</div>
    </div>
  )
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                  background: 'rgba(4,7,10,0.88)', borderRadius: 12, padding: 20 }}>
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

function hexPath(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i + 30)
    const px = x + size * Math.cos(a), py = y + size * Math.sin(a)
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

function draw(ctx: CanvasRenderingContext2D, s: State, W: number, H: number,
              view: { size: number; ox: number; oy: number }, hover: string | null) {
  ctx.fillStyle = '#04070A'
  ctx.fillRect(0, 0, W, H)

  const r = view.size * 0.92
  const P = (t: Tile) => {
    const p = axialToPixel(t.q, t.r, view.size)
    return { x: p.x + view.ox, y: p.y + view.oy }
  }

  for (const t of s.tiles.values()) {
    const { x, y } = P(t)
    const known = visibleToPlayer(s, t)
    const live = currentlyVisible(s, t)

    if (!known) {
      // Never observed. Black, with only the faintest outline so the shape of
      // the map is legible without giving anything away.
      ctx.fillStyle = 'rgba(255,255,255,0.018)'
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'
      ctx.lineWidth = 1
      hexPath(ctx, x, y, r); ctx.fill(); ctx.stroke()
      continue
    }

    const hue = t.owner === 'player' ? 150 : t.owner === 'foe' ? 350 : 205
    const sat = t.owner === 'neutral' ? 12 : 70
    // Remembered tiles are dimmed. A player must be able to tell "I know this
    // is empty" from "I have not looked recently".
    const dim = live ? 1 : 0.42
    ctx.fillStyle = `hsla(${hue},${sat}%,${(t.owner === 'neutral' ? 16 : 26) * dim + 4}%,0.95)`
    ctx.strokeStyle = `hsla(${hue},${sat + 20}%,${58 * dim + 8}%,${live ? 0.9 : 0.4})`
    ctx.lineWidth = t.owner === 'neutral' ? 1.2 : 1.8
    hexPath(ctx, x, y, r); ctx.fill(); ctx.stroke()

    // Terrain marks
    ctx.globalCompositeOperation = 'lighter'
    if (t.terrain === 'relay') {
      ctx.fillStyle = `hsla(45,100%,62%,${0.75 * dim})`
      ctx.beginPath(); ctx.arc(x, y - r * 0.42, r * 0.17, 0, Math.PI * 2); ctx.fill()
    } else if (t.terrain === 'ridge') {
      ctx.strokeStyle = `hsla(270,80%,70%,${0.55 * dim})`
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.moveTo(x - r * 0.4, y - r * 0.30)
      ctx.lineTo(x - r * 0.12, y - r * 0.52)
      ctx.lineTo(x + r * 0.16, y - r * 0.28)
      ctx.stroke()
    } else if (t.terrain === 'waste') {
      ctx.strokeStyle = `hsla(0,0%,60%,${0.22 * dim})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x - r * 0.32, y - r * 0.32); ctx.lineTo(x + r * 0.32, y + r * 0.32)
      ctx.moveTo(x + r * 0.32, y - r * 0.32); ctx.lineTo(x - r * 0.32, y + r * 0.32)
      ctx.stroke()
    }
    ctx.globalCompositeOperation = 'source-over'

    if (t.units > 0 && t.owner !== 'neutral') {
      ctx.fillStyle = `rgba(255,255,255,${live ? 0.95 : 0.45})`
      ctx.font = `700 ${Math.round(r * 0.62)}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(t.units), x, y + r * 0.14)
    } else if (t.units > 0) {
      ctx.fillStyle = `rgba(220,235,245,${live ? 0.55 : 0.25})`
      ctx.font = `600 ${Math.round(r * 0.5)}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(t.units), x, y + r * 0.14)
    }
  }

  ctx.globalCompositeOperation = 'lighter'

  for (const m of s.moves) {
    const a = s.tiles.get(m.from), b = s.tiles.get(m.to)
    if (!a || !b) continue
    const pa = P(a), pb = P(b)
    const hue = m.owner === 'player' ? 150 : 350
    ctx.strokeStyle = `hsla(${hue},100%,70%,${(1 - m.t) * 0.85})`
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(pa.x, pa.y)
    ctx.lineTo(pa.x + (pb.x - pa.x) * m.t, pa.y + (pb.y - pa.y) * m.t)
    ctx.stroke()
  }

  for (const f of s.flashes) {
    const t = s.tiles.get(key(f.q, f.r))
    if (!t) continue
    const p = P(t)
    ctx.strokeStyle = `hsla(${f.hue},100%,70%,${(1 - f.t) * 0.9})`
    ctx.lineWidth = 3 * (1 - f.t)
    hexPath(ctx, p.x, p.y, r * (1 + f.t * 0.7))
    ctx.stroke()
  }

  ctx.globalCompositeOperation = 'source-over'

  if (s.selected) {
    const t = s.tiles.get(s.selected)
    if (t) {
      const p = P(t)
      ctx.strokeStyle = 'rgba(255,255,255,0.92)'
      ctx.lineWidth = 2.4
      hexPath(ctx, p.x, p.y, r + 2); ctx.stroke()
      for (const [dq, dr] of [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]] as [number,number][]) {
        const n = s.tiles.get(key(t.q + dq, t.r + dr))
        if (!n) continue
        const q = P(n)
        ctx.strokeStyle = 'rgba(255,255,255,0.30)'
        ctx.lineWidth = 1.4
        hexPath(ctx, q.x, q.y, r); ctx.stroke()
      }
    }
  }

  if (hover && hover !== s.selected) {
    const t = s.tiles.get(hover)
    if (t) {
      const p = P(t)
      ctx.strokeStyle = 'rgba(255,255,255,0.42)'
      ctx.lineWidth = 1.4
      hexPath(ctx, p.x, p.y, r); ctx.stroke()
    }
  }
}
