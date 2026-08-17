'use client'
// app/play/foundry/page.tsx — Foundry
//
// Game eight of twenty-five. Build a production line, run it, watch where it
// jams. Four levels, each introducing one more link in the chain.
//
// Machines show their state as colour rather than text: starved machines pulse
// dim, blocked machines glow amber, working machines fill a progress ring. A
// player should be able to glance at a factory and see the bottleneck without
// reading anything.
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026
import { useCallback, useEffect, useRef, useState } from 'react'
import { BloomRenderer, makeBloom } from '@/lib/gfx/bloom'
import {
  ITEM_HUE, LEVEL_COUNT, LEVEL_NAMES, MACHINES, MACHINE_ORDER, State,
  costOf, loadLevel, newState, pause, place, rotate, run, step,
} from './engine'

const DIR_ARROW = ['→', '↓', '←', '↑']

export default function Foundry() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const sceneRef = useRef<HTMLCanvasElement | null>(null)
  const bloomRef = useRef<BloomRenderer | null>(null)
  const ref = useRef<State | null>(null)
  const cell = useRef(48)
  const painting = useRef(false)
  const hover = useRef<{ x: number; y: number } | null>(null)
  const [ui, setUi] = useState({ phase: 'building', level: 0, credits: 0, score: 0,
                                 target: 0, tool: 'belt' as State['tool'], dir: 0,
                                 time: 0, tput: 0, msg: '', best: 0 })

  const sync = useCallback(() => {
    const s = ref.current
    if (!s) return
    setUi({ phase: s.phase, level: s.level, credits: Math.floor(s.credits), score: Math.floor(s.score),
            target: s.target, tool: s.tool, dir: s.beltDir, time: s.time,
            tput: s.throughput, msg: s.message, best: s.best[s.level] ?? 0 })
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!sceneRef.current) sceneRef.current = document.createElement('canvas')
    const scene = sceneRef.current
    const ctx = scene.getContext('2d', { alpha: false })
    if (!ctx) return
    bloomRef.current = makeBloom(canvas, { intensity: 0.85, threshold: 0.66, aberration: 0.005, vignette: 0.34 })

    let W = 900, H = 520, DPR = 1
    const resize = () => {
      const r = canvas.parentElement?.getBoundingClientRect()
      W = Math.min(1100, r ? r.width - 8 : 900)
      if (!ref.current) {
        let best: Record<number, number> = {}
        try { best = JSON.parse(window.localStorage?.getItem('foundry.best') ?? '{}') } catch { best = {} }
        ref.current = newState(0, best)
      }
      const s = ref.current
      cell.current = Math.floor(W / s.w)
      H = cell.current * s.h
      DPR = Math.min(window.devicePixelRatio || 1, 2)
      scene.width = W * DPR; scene.height = H * DPR
      bloomRef.current?.resize(W * DPR, H * DPR)
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
      sync()
    }
    resize()
    window.addEventListener('resize', resize)

    const at = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      return {
        x: Math.floor((e.clientX - r.left) / cell.current),
        y: Math.floor((e.clientY - r.top) / cell.current),
      }
    }
    const down = (e: PointerEvent) => {
      const s = ref.current
      if (!s) return
      painting.current = true
      const p = at(e)
      if (place(s, p.x, p.y)) sync()
    }
    const move = (e: PointerEvent) => {
      const s = ref.current
      if (!s) return
      const p = at(e)
      hover.current = p
      // Drag-paint belts, which is how these games are actually played.
      if (painting.current && (s.tool === 'belt' || s.tool === 'erase')) {
        if (place(s, p.x, p.y)) sync()
      }
    }
    const up = () => { painting.current = false }
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)

    const kd = (e: KeyboardEvent) => {
      const s = ref.current
      if (!s) return
      const k = e.key.toLowerCase()
      if (k === 'r') { rotate(s); sync() }
      if (k === 'b') { s.tool = 'belt'; sync() }
      if (k === 'x') { s.tool = 'erase'; sync() }
      const n = parseInt(k, 10)
      if (n >= 1 && n <= MACHINE_ORDER.length) { s.tool = MACHINE_ORDER[n - 1]; sync() }
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
      draw(ctx, s, cell.current, hover.current)
      bloomRef.current?.present(scene, now)
      if (s.phase !== before) sync()
      else if (s.phase === 'running' && Math.random() < 0.2) sync()
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      bloomRef.current?.dispose()
      window.removeEventListener('resize', resize)
      window.removeEventListener('keydown', kd)
      window.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
    }
  }, [sync])

  useEffect(() => {
    const s = ref.current
    if (!s) return
    try { window.localStorage?.setItem('foundry.best', JSON.stringify(s.best)) } catch { /* private mode */ }
  }, [ui.phase])

  const setTool = (t: State['tool']) => { const s = ref.current; if (s) { s.tool = t; sync() } }
  const toggle = () => {
    const s = ref.current
    if (!s) return
    if (s.phase === 'running') pause(s); else run(s)
    sync()
  }
  const turn = () => { const s = ref.current; if (s) { rotate(s); sync() } }
  const onward = () => {
    const s = ref.current
    if (!s) return
    loadLevel(s, Math.min(s.level + 1, LEVEL_COUNT - 1))
    const c = canvasRef.current
    c?.dispatchEvent(new Event('resize'))
    window.dispatchEvent(new Event('resize'))
    sync()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#070609', color: '#EAE6DF',
                  fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 8, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>
            FOUND<span style={{ color: '#F5A742' }}>RY</span>
          </h1>
          <span style={{ color: 'rgba(234,230,223,0.55)', fontSize: 13 }}>
            Items take up space. A slow machine backs the line up behind it.
          </span>
        </header>

        <div style={{ display: 'flex', gap: 18, fontSize: 13, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Stat label="LINE" value={`${ui.level + 1}. ${LEVEL_NAMES[ui.level]}`} />
          <Stat label="CREDITS" value={String(ui.credits)} tone="#F5C542" />
          <Stat label="SHIPPED" value={`${ui.score} / ${ui.target}`} tone="#7BE495" />
          <Stat label="RATE" value={`${ui.tput.toFixed(1)}/s`} tone="#F5A742" />
          <Stat label="BEST" value={ui.best ? `${ui.best}s` : '—'} />
          <button onClick={toggle} style={{ background: ui.phase === 'running' ? '#8A6' : '#FF0800',
            color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px',
            fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
            {ui.phase === 'running' ? 'Pause' : 'Run the line'}
          </button>
          <button onClick={turn} style={{ background: 'rgba(245,167,66,0.14)',
            border: '1px solid rgba(245,167,66,0.4)', color: '#F5A742', borderRadius: 8,
            padding: '8px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            Rotate {DIR_ARROW[ui.dir]} (R)
          </button>
        </div>

        <div style={{ position: 'relative' }}>
          <canvas ref={canvasRef} style={{ display: 'block', borderRadius: 10,
            border: '1px solid rgba(245,167,66,0.18)', background: '#070609',
            cursor: 'crosshair', touchAction: 'none' }} />

          {ui.phase === 'won' && (
            <Overlay>
              <h2 style={{ fontSize: 26, margin: '0 0 4px' }}>Quota met</h2>
              <p style={{ color: 'rgba(234,230,223,0.7)', margin: '0 0 18px' }}>{ui.msg}</p>
              <Button onClick={onward}>
                {ui.level >= LEVEL_COUNT - 1 ? 'Play again' : 'Next line'}
              </Button>
            </Overlay>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(168px,1fr))',
                      gap: 7, marginTop: 10 }}>
          <ToolCard active={ui.tool === 'belt'} hue={45} onClick={() => setTool('belt')}
            title="B. Belt" cost={4} blurb="Drag to lay a run. R rotates." />
          {MACHINE_ORDER.map((m, i) => (
            <ToolCard key={m} active={ui.tool === m} hue={MACHINES[m].hue}
              onClick={() => setTool(m)} title={`${i + 1}. ${MACHINES[m].name}`}
              cost={MACHINES[m].cost} blurb={MACHINES[m].blurb} />
          ))}
          <ToolCard active={ui.tool === 'erase'} hue={0} onClick={() => setTool('erase')}
            title="X. Remove" cost={0} blurb="Half refund. Experiment freely." />
        </div>

        <p style={{ color: 'rgba(234,230,223,0.45)', fontSize: 12.5, marginTop: 10 }}>
          {ui.msg} A machine glowing amber is blocked — whatever is downstream cannot take its
          output. A machine pulsing dim is starved.
        </p>
        <p style={{ color: 'rgba(234,230,223,0.3)', fontSize: 12, marginTop: 4 }}>
          Items occupy real positions on belts and cannot pass one another, so throughput is
          emergent rather than declared · CR AudioViz AI · EIN 39-3646201
        </p>
      </div>
    </div>
  )
}

function ToolCard({ active, hue, onClick, title, cost, blurb }:
  { active: boolean; hue: number; onClick: () => void; title: string; cost: number; blurb: string }) {
  return (
    <button onClick={onClick} style={{ textAlign: 'left', padding: '8px 10px', borderRadius: 9,
      background: active ? `hsla(${hue},70%,26%,0.6)` : 'rgba(255,255,255,0.03)',
      border: `1px solid ${active ? `hsla(${hue},85%,60%,0.7)` : 'rgba(255,255,255,0.08)'}`,
      color: '#EAE6DF', cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 13 }}>
        <span>{title}</span>
        {cost > 0 && <span style={{ color: '#F5C542' }}>{cost}</span>}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(234,230,223,0.6)', marginTop: 2 }}>{blurb}</div>
    </button>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: 1.2, color: 'rgba(234,230,223,0.4)' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: tone ?? '#EAE6DF' }}>{value}</div>
    </div>
  )
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                  background: 'rgba(7,6,9,0.88)', borderRadius: 10, padding: 20 }}>
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

function draw(ctx: CanvasRenderingContext2D, s: State, C: number,
              hover: { x: number; y: number } | null) {
  const W = s.w * C, H = s.h * C
  ctx.fillStyle = '#070609'
  ctx.fillRect(0, 0, W, H)

  // Floor grid
  ctx.strokeStyle = 'rgba(245,167,66,0.05)'
  ctx.lineWidth = 1
  for (let x = 0; x <= s.w; x++) { ctx.beginPath(); ctx.moveTo(x * C, 0); ctx.lineTo(x * C, H); ctx.stroke() }
  for (let y = 0; y <= s.h; y++) { ctx.beginPath(); ctx.moveTo(0, y * C); ctx.lineTo(W, y * C); ctx.stroke() }

  const DXA = [1, 0, -1, 0], DYA = [0, 1, 0, -1]

  // Belts
  for (const row of s.grid) for (const c of row) {
    if (c.type !== 'belt') continue
    const x = c.x * C, y = c.y * C
    ctx.fillStyle = c.blocked ? 'rgba(245,120,42,0.18)' : 'rgba(160,150,140,0.10)'
    ctx.fillRect(x + 3, y + 3, C - 6, C - 6)
    // Direction chevrons, animated so a running belt reads as moving.
    ctx.strokeStyle = c.blocked ? 'rgba(255,150,60,0.7)' : 'rgba(200,190,175,0.35)'
    ctx.lineWidth = 2
    const t = (performance.now() / 500) % 1
    for (let k = 0; k < 2; k++) {
      const f = ((t + k * 0.5) % 1)
      const cx = x + C / 2 + DXA[c.dir] * (f - 0.5) * (C - 10)
      const cy = y + C / 2 + DYA[c.dir] * (f - 0.5) * (C - 10)
      const a = (c.dir * Math.PI) / 2
      ctx.beginPath()
      ctx.moveTo(cx - Math.cos(a - 0.7) * 6, cy - Math.sin(a - 0.7) * 6)
      ctx.lineTo(cx, cy)
      ctx.lineTo(cx - Math.cos(a + 0.7) * 6, cy - Math.sin(a + 0.7) * 6)
      ctx.stroke()
    }
  }

  ctx.globalCompositeOperation = 'lighter'

  // Items riding the belts
  for (const row of s.grid) for (const c of row) {
    if (c.type !== 'belt') continue
    for (const it of c.items) {
      const cx = c.x * C + C / 2 + DXA[c.dir] * (it.pos - 0.5) * C
      const cy = c.y * C + C / 2 + DYA[c.dir] * (it.pos - 0.5) * C
      const hue = ITEM_HUE[it.item]
      ctx.fillStyle = `hsla(${hue},95%,62%,0.95)`
      ctx.beginPath(); ctx.arc(cx, cy, C * 0.13, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = `hsla(${hue},95%,66%,0.22)`
      ctx.beginPath(); ctx.arc(cx, cy, C * 0.28, 0, Math.PI * 2); ctx.fill()
    }
  }

  // Machines
  for (const row of s.grid) for (const c of row) {
    if (c.type !== 'machine' || !c.machine) continue
    const def = MACHINES[c.machine]
    const x = c.x * C, y = c.y * C
    const pulse = c.starved ? 0.55 + Math.sin(performance.now() / 260) * 0.18 : 1
    ctx.fillStyle = `hsla(${def.hue},65%,${18 * pulse + 4}%,0.95)`
    ctx.strokeStyle = c.blocked
      ? 'hsla(28,100%,62%,0.95)'
      : `hsla(${def.hue},85%,${58 * pulse}%,0.9)`
    ctx.lineWidth = c.blocked ? 2.6 : 1.8
    ctx.beginPath()
    ctx.roundRect(x + 3, y + 3, C - 6, C - 6, 6)
    ctx.fill(); ctx.stroke()

    // Progress ring
    if (def.recipe && c.progress > 0) {
      ctx.strokeStyle = `hsla(${def.hue},100%,72%,0.95)`
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(x + C / 2, y + C / 2, C * 0.30, -Math.PI / 2, -Math.PI / 2 + c.progress * Math.PI * 2)
      ctx.stroke()
    }

    // Output direction
    ctx.strokeStyle = `hsla(${def.hue},90%,70%,0.55)`
    ctx.lineWidth = 2
    const mx = x + C / 2 + DXA[c.dir] * C * 0.34
    const my = y + C / 2 + DYA[c.dir] * C * 0.34
    ctx.beginPath(); ctx.arc(mx, my, 3, 0, Math.PI * 2); ctx.stroke()

    // Buffer pips
    let i = 0
    for (const [item, n] of Object.entries(c.buffer)) {
      if (!n) continue
      const hue = ITEM_HUE[item as keyof typeof ITEM_HUE]
      for (let k = 0; k < Math.min(n as number, 4); k++) {
        ctx.fillStyle = `hsla(${hue},95%,62%,0.9)`
        ctx.beginPath()
        ctx.arc(x + 9 + k * 7, y + C - 9 - i * 7, 2.4, 0, Math.PI * 2)
        ctx.fill()
      }
      i += 1
    }
  }

  ctx.globalCompositeOperation = 'source-over'

  if (hover && hover.x >= 0 && hover.y >= 0 && hover.x < s.w && hover.y < s.h) {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 1.6
    ctx.strokeRect(hover.x * C + 2, hover.y * C + 2, C - 4, C - 4)
  }
}
