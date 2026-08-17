'use client'
// app/play/hexbreaker/page.tsx — Hexbreaker
//
// Game four of twenty-five. Eight levels of destructible hex terrain: break the
// lattice, free the cores, and let the collapse do the work you did not have
// charges for.
//
// Hover highlighting uses cube rounding to pick a hex from a pixel. Rounding
// the two axial coordinates independently lands on the wrong cell near the
// boundaries — the classic hex-picking bug, visible as a highlight that snaps
// to a neighbour when you move along an edge.
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026
import { useCallback, useEffect, useRef, useState } from 'react'
import { BloomRenderer, makeBloom } from '@/lib/gfx/bloom'
import {
  Hex, LEVEL_COUNT, State, axialToPixel, fit, key, newState, nextLevel,
  pixelToAxial, retry, shoot, step,
} from './engine'

export default function Hexbreaker() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  // The 2D work happens on an offscreen canvas; the visible one is WebGL and
  // only ever receives the post-processed result.
  const sceneRef = useRef<HTMLCanvasElement | null>(null)
  const bloomRef = useRef<BloomRenderer | null>(null)
  const ref = useRef<State | null>(null)
  const hover = useRef<{ q: number; r: number } | null>(null)
  const [ui, setUi] = useState({ phase: 'aim', level: 0, charges: 6, score: 0,
                                 cores: 1, freed: 0, combo: 0, best: 0, msg: '' })

  const sync = useCallback(() => {
    const s = ref.current
    if (!s) return
    setUi({ phase: s.phase, level: s.level, charges: s.charges, score: s.score,
            cores: s.cores, freed: s.coresFreed, combo: s.bestCombo,
            best: s.best[s.level] ?? 0, msg: s.message })
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!sceneRef.current) sceneRef.current = document.createElement('canvas')
    const scene = sceneRef.current
    const ctx = scene.getContext('2d', { alpha: false })
    if (!ctx) return
    bloomRef.current = makeBloom(canvas, { intensity: 1.05, threshold: 0.58, aberration: 0.008, vignette: 0.38 })

    const resize = () => {
      const r = canvas.parentElement?.getBoundingClientRect()
      const w = Math.min(1100, r ? r.width - 8 : 900)
      const h = Math.round(w * 0.62)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      scene.width = w * dpr; scene.height = h * dpr
      bloomRef.current?.resize(w * dpr, h * dpr)
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (!ref.current) {
        let best: Record<number, number> = {}
        try { best = JSON.parse(window.localStorage?.getItem('hexb.best') ?? '{}') } catch { best = {} }
        ref.current = newState(w, h, best)
      } else {
        fit(ref.current, w, h)
      }
      sync()
    }
    resize()
    window.addEventListener('resize', resize)

    const at = (e: PointerEvent) => {
      const s = ref.current
      if (!s) return null
      const r = canvas.getBoundingClientRect()
      return pixelToAxial(e.clientX - r.left - s.originX, e.clientY - r.top - s.originY, s.size)
    }
    const move = (e: PointerEvent) => { hover.current = at(e) }
    const leave = () => { hover.current = null }
    const click = (e: PointerEvent) => {
      const s = ref.current
      const a = at(e)
      if (!s || !a) return
      shoot(s, a.q, a.r)
      sync()
    }
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerleave', leave)
    canvas.addEventListener('pointerdown', click)

    let raf = 0, last = performance.now(), acc = 0
    const STEP = 1 / 60
    const frame = (now: number) => {
      const s = ref.current
      if (!s) { raf = requestAnimationFrame(frame); return }
      acc += Math.min(0.25, (now - last) / 1000)
      last = now
      const before = s.phase
      while (acc >= STEP) { step(s, STEP); acc -= STEP }
      draw(ctx, s, hover.current)
      // One blit through bright-pass, separable blur and composite.
      bloomRef.current?.present(scene, now)
      if (s.phase !== before) sync()
      else if (s.phase === 'resolving' && Math.random() < 0.3) sync()
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      bloomRef.current?.dispose()
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerleave', leave)
      canvas.removeEventListener('pointerdown', click)
    }
  }, [sync])

  useEffect(() => {
    const s = ref.current
    if (!s) return
    try { window.localStorage?.setItem('hexb.best', JSON.stringify(s.best)) } catch { /* private mode */ }
  }, [ui.phase])

  const size = () => {
    const c = canvasRef.current
    const r = c?.parentElement?.getBoundingClientRect()
    const w = Math.min(1100, r ? r.width - 8 : 900)
    return { w, h: Math.round(w * 0.62) }
  }
  const again = () => { const s = ref.current; if (s) { const d = size(); retry(s, d.w, d.h); sync() } }
  const onward = () => { const s = ref.current; if (s) { const d = size(); nextLevel(s, d.w, d.h); sync() } }
  const restart = () => {
    const s = ref.current
    if (!s) return
    const d = size()
    s.level = -1
    nextLevel(s, d.w, d.h)
    s.score = 0
    sync()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#05070D', color: '#E8F1FA',
                  fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 8, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>
            HEX<span style={{ color: '#7BE495' }}>BREAKER</span>
          </h1>
          <span style={{ color: 'rgba(232,241,250,0.55)', fontSize: 13 }}>
            Break the lattice. Let the collapse free the cores.
          </span>
        </header>

        <div style={{ display: 'flex', gap: 18, fontSize: 13, marginBottom: 8, flexWrap: 'wrap' }}>
          <Stat label="SEAM" value={`${ui.level + 1} / ${LEVEL_COUNT}`} />
          <Stat label="CHARGES" value={'◈'.repeat(ui.charges) || '—'} tone="#F5C542" />
          <Stat label="CORES" value={`${ui.freed} / ${ui.cores}`} tone="#7BE495" />
          <Stat label="SCORE" value={ui.score.toLocaleString()} />
          <Stat label="BEST CHAIN" value={`x${ui.combo}`} tone="#FF8C4F" />
          <Stat label="SEAM BEST" value={ui.best ? ui.best.toLocaleString() : '—'} />
        </div>

        <div style={{ position: 'relative' }}>
          <canvas ref={canvasRef} style={{ display: 'block', borderRadius: 12,
            border: '1px solid rgba(123,228,149,0.16)', background: '#05070D',
            cursor: ui.phase === 'aim' ? 'crosshair' : 'default', touchAction: 'none' }} />

          {ui.phase === 'won' && (
            <Overlay>
              <h2 style={{ fontSize: 26, margin: '0 0 4px' }}>{ui.msg}</h2>
              <p style={{ color: 'rgba(232,241,250,0.7)', margin: '0 0 4px' }}>
                {ui.score.toLocaleString()} points · best chain x{ui.combo}
              </p>
              <p style={{ color: '#F5C542', margin: '0 0 18px', fontSize: 13 }}>
                Unused charges banked
              </p>
              <Button onClick={onward}>Next seam</Button>
            </Overlay>
          )}

          {ui.phase === 'lost' && (
            <Overlay>
              <h2 style={{ fontSize: 24, margin: '0 0 6px' }}>Out of charges</h2>
              <p style={{ color: 'rgba(232,241,250,0.6)', margin: '0 0 18px', fontSize: 13, maxWidth: 420 }}>
                {ui.msg} Orange cells detonate and take their neighbours with them —
                one well-placed charge can bring down half a seam.
              </p>
              <Button onClick={again}>Retry seam</Button>
            </Overlay>
          )}

          {ui.phase === 'complete' && (
            <Overlay>
              <h2 style={{ fontSize: 28, margin: '0 0 4px' }}>Every seam cleared</h2>
              <p style={{ color: '#7BE495', margin: '0 0 18px' }}>{ui.score.toLocaleString()} points</p>
              <Button onClick={restart}>Start over</Button>
            </Overlay>
          )}
        </div>

        <p style={{ color: 'rgba(232,241,250,0.42)', fontSize: 12.5, marginTop: 10 }}>
          Blue stone breaks easily · purple crystal takes four hits · orange detonates ·
          green cores are the objective · the bottom row is bedrock and cannot be broken.
        </p>
        <p style={{ color: 'rgba(232,241,250,0.3)', fontSize: 12, marginTop: 4 }}>
          Axial hex coordinates · support resolved by breadth-first search from bedrock ·
          CR AudioViz AI · EIN 39-3646201
        </p>
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: 1.2, color: 'rgba(232,241,250,0.4)' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: tone ?? '#E8F1FA' }}>{value}</div>
    </div>
  )
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                  background: 'rgba(5,7,13,0.87)', borderRadius: 12, padding: 20 }}>
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
    // Pointy-top orientation: start at 90 degrees so flat sides face left/right.
    const a = (Math.PI / 180) * (60 * i + 30)
    const px = x + size * Math.cos(a), py = y + size * Math.sin(a)
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

function draw(ctx: CanvasRenderingContext2D, s: State, hover: { q: number; r: number } | null) {
  const w = ctx.canvas.width, h = ctx.canvas.height
  ctx.save()
  if (s.shake > 0) ctx.translate((Math.random() - 0.5) * s.shake * 8, (Math.random() - 0.5) * s.shake * 8)
  ctx.fillStyle = '#05070D'
  ctx.fillRect(-20, -20, w + 40, h + 40)

  const r = s.size * 0.92
  for (const c of s.cells.values()) {
    const p = axialToPixel(c.q, c.r, s.size)
    const x = p.x + s.originX, y = p.y + s.originY
    const wear = c.hp / c.maxHp
    if (c.kind === 'bedrock') {
      ctx.fillStyle = 'rgba(60,68,84,0.9)'
      ctx.strokeStyle = 'rgba(120,132,155,0.5)'
    } else if (c.kind === 'core') {
      const pulse = 0.55 + Math.sin(performance.now() / 300 + c.q) * 0.2
      ctx.fillStyle = `hsla(150,80%,${22 + pulse * 14}%,0.95)`
      ctx.strokeStyle = `hsla(150,100%,${60 + pulse * 12}%,1)`
    } else if (c.kind === 'volatile') {
      const pulse = 0.5 + Math.sin(performance.now() / 160 + c.r) * 0.35
      ctx.fillStyle = `hsla(20,95%,${26 + pulse * 16}%,0.95)`
      ctx.strokeStyle = `hsla(28,100%,${60 + pulse * 14}%,1)`
    } else if (c.kind === 'crystal') {
      ctx.fillStyle = `hsla(280,70%,${16 + wear * 16}%,0.92)`
      ctx.strokeStyle = `hsla(280,90%,${52 + wear * 18}%,0.95)`
    } else {
      ctx.fillStyle = `hsla(${c.hue},45%,${12 + wear * 12}%,0.92)`
      ctx.strokeStyle = `hsla(${c.hue},70%,${38 + wear * 20}%,0.85)`
    }
    ctx.lineWidth = c.kind === 'core' || c.kind === 'volatile' ? 2.2 : 1.4
    hexPath(ctx, x, y, r)
    ctx.fill(); ctx.stroke()

    // Damage read as cracks, so hit points are visible without a number.
    if (c.hp < c.maxHp && c.kind !== 'bedrock') {
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'
      ctx.lineWidth = 1
      const cracks = c.maxHp - c.hp
      for (let i = 0; i < cracks; i++) {
        const a = (i / cracks) * Math.PI * 2 + c.q
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8)
        ctx.stroke()
      }
    }
  }

  ctx.globalCompositeOperation = 'lighter'

  for (const b of s.blasts) {
    const p = axialToPixel(b.q, b.r, s.size)
    const a = 1 - b.t / 0.45
    ctx.strokeStyle = `hsla(${b.hue},100%,68%,${a * 0.8})`
    ctx.lineWidth = 3 * a
    ctx.beginPath()
    ctx.arc(p.x + s.originX, p.y + s.originY, s.size * (0.6 + (1 - a) * 3.2 * b.power), 0, Math.PI * 2)
    ctx.stroke()
  }

  for (const p of s.particles) {
    ctx.fillStyle = `hsla(${p.hue},90%,64%,${Math.min(1, p.life * 2)})`
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
  }

  ctx.globalCompositeOperation = 'source-over'

  if (hover && s.phase === 'aim') {
    const c = s.cells.get(key(hover.q, hover.r))
    if (c && c.kind !== 'bedrock') {
      const p = axialToPixel(c.q, c.r, s.size)
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'
      ctx.lineWidth = 2
      hexPath(ctx, p.x + s.originX, p.y + s.originY, r + 2)
      ctx.stroke()
    }
  }
  ctx.restore()
}
