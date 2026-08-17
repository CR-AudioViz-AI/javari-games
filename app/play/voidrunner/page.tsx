'use client'
// app/play/voidrunner/page.tsx — Voidrunner
//
// Game five of twenty-five, closing the Arcade Action set. An endless runner
// whose difficulty responds to how the player is actually doing rather than to
// the clock.
//
// The pressure value is shown in the HUD deliberately. A game that silently
// adapts feels arbitrary — "why did that suddenly get hard?" — while one that
// shows the dial feels responsive. Same mechanism, opposite impression.
//
// The track is drawn in perspective: three lanes converging toward a vanishing
// point, with obstacles scaled by distance. It is a 2D canvas doing a cheap
// projection, not WebGL, and it holds 60fps on a phone.
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026
import { useCallback, useEffect, useRef, useState } from 'react'
import { BloomRenderer, makeBloom } from '@/lib/gfx/bloom'
import { State, newState, start, step } from './engine'

export default function Voidrunner() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  // The 2D work happens on an offscreen canvas; the visible one is WebGL and
  // only ever receives the post-processed result.
  const sceneRef = useRef<HTMLCanvasElement | null>(null)
  const bloomRef = useRef<BloomRenderer | null>(null)
  const ref = useRef<State | null>(null)
  const keys = useRef<Record<string, boolean>>({})
  const edge = useRef({ lane: 0, jump: false, slide: false })
  const [ui, setUi] = useState({ phase: 'ready', dist: 0, score: 0, best: 0,
                                 shield: 2, shards: 0, tier: 1, pressure: 0.1,
                                 near: 0, msg: '' })

  const sync = useCallback(() => {
    const s = ref.current
    if (!s) return
    setUi({ phase: s.phase, dist: Math.floor(s.dist), score: s.score, best: s.best,
            shield: s.runner.shield, shards: s.shards, tier: s.tier,
            pressure: s.pressure, near: s.nearMisses, msg: s.message })
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!sceneRef.current) sceneRef.current = document.createElement('canvas')
    const scene = sceneRef.current
    const ctx = scene.getContext('2d', { alpha: false })
    if (!ctx) return
    bloomRef.current = makeBloom(canvas, { intensity: 1.30, threshold: 0.48, aberration: 0.018, vignette: 0.46 })

    const resize = () => {
      const r = canvas.parentElement?.getBoundingClientRect()
      const w = Math.min(1100, r ? r.width - 8 : 900)
      const h = Math.round(w * 0.58)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      scene.width = w * dpr; scene.height = h * dpr
      bloomRef.current?.resize(w * dpr, h * dpr)
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (!ref.current) {
        const best = Number(window.localStorage?.getItem('voidrunner.best') ?? 0)
        ref.current = newState(w, h, best)
      } else { ref.current.w = w; ref.current.h = h }
      sync()
    }
    resize()
    window.addEventListener('resize', resize)

    // Edge-triggered: holding a key must not fire every frame.
    const kd = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (['arrowleft','arrowright','arrowup','arrowdown',' '].includes(k)) e.preventDefault()
      if (!keys.current[k]) {
        if (k === 'a' || k === 'arrowleft') edge.current.lane = -1
        if (k === 'd' || k === 'arrowright') edge.current.lane = 1
        if (k === 'w' || k === 'arrowup' || k === ' ') edge.current.jump = true
        if (k === 's' || k === 'arrowdown') edge.current.slide = true
      }
      keys.current[k] = true
    }
    const ku = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)

    let raf = 0, last = performance.now(), acc = 0
    const STEP = 1 / 60
    const frame = (now: number) => {
      const s = ref.current
      if (!s) { raf = requestAnimationFrame(frame); return }
      acc += Math.min(0.25, (now - last) / 1000)
      last = now
      const before = s.phase
      while (acc >= STEP) {
        step(s, STEP, { ...edge.current })
        edge.current = { lane: 0, jump: false, slide: false }
        acc -= STEP
      }
      draw(ctx, s)
      // One blit through bright-pass, separable blur and composite.
      bloomRef.current?.present(scene, now)
      if (s.phase !== before) sync()
      else if (Math.random() < 0.15) sync()
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      bloomRef.current?.dispose()
      window.removeEventListener('resize', resize)
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
    }
  }, [sync])

  useEffect(() => {
    const s = ref.current
    if (s && ui.phase === 'over') {
      try { window.localStorage?.setItem('voidrunner.best', String(s.best)) } catch { /* private mode */ }
    }
  }, [ui.phase])

  const go = () => { const s = ref.current; if (s) { start(s); sync() } }

  return (
    <div style={{ minHeight: '100vh', background: '#04050B', color: '#E8F1FA',
                  fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 8, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>
            VOID<span style={{ color: '#FF8C4F' }}>RUNNER</span>
          </h1>
          <span style={{ color: 'rgba(232,241,250,0.55)', fontSize: 13 }}>
            The track answers back. Run clean and it tightens.
          </span>
        </header>

        <div style={{ display: 'flex', gap: 18, fontSize: 13, marginBottom: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Stat label="DISTANCE" value={`${ui.dist} m`} />
          <Stat label="SCORE" value={ui.score.toLocaleString()} />
          <Stat label="TIER" value={String(ui.tier)} tone="#FF8C4F" />
          <Stat label="SHIELD" value={'▮'.repeat(Math.max(0, ui.shield)) || '—'} tone="#7BE495" />
          <Stat label="SHARDS" value={String(ui.shards)} tone="#F5C542" />
          <Stat label="NEAR MISSES" value={String(ui.near)} />
          <Stat label="BEST" value={ui.best.toLocaleString()} />
          <div>
            <div style={{ fontSize: 10, letterSpacing: 1.2, color: 'rgba(232,241,250,0.4)' }}>PRESSURE</div>
            <div style={{ width: 110, height: 9, background: 'rgba(255,255,255,0.08)',
                          borderRadius: 5, overflow: 'hidden', marginTop: 3 }}>
              <div style={{ width: `${ui.pressure * 100}%`, height: '100%',
                            background: `hsl(${140 - ui.pressure * 140},85%,55%)`,
                            transition: 'width .25s' }} />
            </div>
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <canvas ref={canvasRef} style={{ display: 'block', borderRadius: 12,
            border: '1px solid rgba(255,140,79,0.18)', background: '#04050B' }} />

          {ui.phase === 'ready' && (
            <Overlay>
              <h2 style={{ fontSize: 26, margin: '0 0 6px' }}>Voidrunner</h2>
              <p style={{ color: 'rgba(232,241,250,0.68)', maxWidth: 470, margin: '0 0 4px' }}>
                <b>A / D</b> to change lane · <b>W</b> to jump blocks · <b>S</b> to slide under gates
              </p>
              <p style={{ color: 'rgba(232,241,250,0.45)', maxWidth: 470, margin: '0 0 18px', fontSize: 13 }}>
                The pressure bar is the difficulty. Surviving and passing close to obstacles
                raises it; taking a hit lowers it. The track is built from vetted segments
                chosen to match — so it gets harder because you are doing well, not because
                time passed.
              </p>
              <Button onClick={go}>Run</Button>
            </Overlay>
          )}

          {ui.phase === 'over' && (
            <Overlay>
              <h2 style={{ fontSize: 26, margin: '0 0 4px' }}>Run ended</h2>
              <p style={{ color: 'rgba(232,241,250,0.7)', margin: '0 0 2px' }}>{ui.msg}</p>
              <p style={{ color: '#F5C542', margin: '0 0 18px', fontSize: 13 }}>
                {ui.score.toLocaleString()} points · best {ui.best.toLocaleString()}
              </p>
              <Button onClick={go}>Again</Button>
            </Overlay>
          )}
        </div>

        <p style={{ color: 'rgba(232,241,250,0.3)', fontSize: 12, marginTop: 10 }}>
          Difficulty adapts to a rolling performance signal, not to elapsed time · track assembled
          from vetted segments so it is always clearable · CR AudioViz AI · EIN 39-3646201
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
                  background: 'rgba(4,5,11,0.87)', borderRadius: 12, padding: 20 }}>
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

/** Cheap perspective: everything scales by 1/(1+depth). No WebGL needed. */
function project(s: State, lane: number, worldX: number, y: number) {
  const depth = Math.max(0, (worldX - s.dist) / 900)
  const k = 1 / (1 + depth * 2.2)
  const horizon = s.h * 0.34
  const cx = s.w / 2
  const spread = s.w * 0.30 * k
  return {
    x: cx + (lane - 1) * spread,
    y: horizon + (s.h - horizon) * k + y * k,
    k,
  }
}

function draw(ctx: CanvasRenderingContext2D, s: State) {
  const { w, h } = s
  const horizon = h * 0.34

  const sky = ctx.createLinearGradient(0, 0, 0, horizon)
  sky.addColorStop(0, '#04050B')
  sky.addColorStop(1, '#12102A')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, horizon)
  ctx.fillStyle = '#06070E'
  ctx.fillRect(0, horizon, w, h - horizon)

  // Stars, deterministic.
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  for (let i = 0; i < 60; i++) {
    ctx.fillRect(((i * 7919) % 1000) / 1000 * w, ((i * 104729) % 1000) / 1000 * horizon, 1.3, 1.3)
  }

  // Lane rails converging to the vanishing point.
  ctx.strokeStyle = 'rgba(255,140,79,0.30)'
  ctx.lineWidth = 2
  for (let lane = -0.5; lane <= 2.5; lane += 1) {
    ctx.beginPath()
    const a = project(s, lane, s.dist, 0)
    const b = project(s, lane, s.dist + 2400, 0)
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }
  // Rungs, moving with distance to convey speed.
  for (let d = 0; d < 2400; d += 150) {
    const wx = s.dist + d - (s.dist % 150)
    const l = project(s, -0.5, wx, 0), r = project(s, 2.5, wx, 0)
    ctx.strokeStyle = `rgba(255,140,79,${0.22 * l.k + 0.03})`
    ctx.lineWidth = Math.max(0.5, 2 * l.k)
    ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(r.x, r.y); ctx.stroke()
  }

  ctx.globalCompositeOperation = 'lighter'

  // Far obstacles first so nearer ones overlap correctly.
  const sorted = [...s.obstacles].sort((a, b) => b.x - a.x)
  for (const o of sorted) {
    if (o.hit && (o.kind === 'orb' || o.kind === 'shard')) continue
    if (o.x < s.dist - 120 || o.x > s.dist + 2400) continue
    const p = project(s, o.lane, o.x, 0)
    const sw = o.w * p.k, sh = o.h * p.k
    if (o.kind === 'orb' || o.kind === 'shard') {
      const hue = o.kind === 'shard' ? 45 : 150
      const bob = Math.sin(performance.now() / 300 + o.phase) * 8 * p.k
      ctx.fillStyle = `hsla(${hue},100%,66%,0.95)`
      ctx.beginPath(); ctx.arc(p.x, p.y - 34 * p.k + bob, sw * 0.5, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = `hsla(${hue},100%,70%,0.22)`
      ctx.beginPath(); ctx.arc(p.x, p.y - 34 * p.k + bob, sw * 1.5, 0, Math.PI * 2); ctx.fill()
    } else if (o.kind === 'gate') {
      // Overhead bar — slide under it.
      ctx.fillStyle = 'hsla(300,90%,58%,0.9)'
      ctx.fillRect(p.x - sw * 0.55, p.y - 78 * p.k, sw * 1.1, sh * 0.55)
      ctx.fillStyle = 'hsla(300,90%,60%,0.18)'
      ctx.fillRect(p.x - sw * 0.6, p.y - 82 * p.k, sw * 1.2, sh * 0.7)
    } else if (o.kind === 'spike') {
      ctx.fillStyle = 'hsla(350,95%,58%,0.92)'
      ctx.beginPath()
      ctx.moveTo(p.x, p.y - sh)
      ctx.lineTo(p.x + sw * 0.5, p.y)
      ctx.lineTo(p.x - sw * 0.5, p.y)
      ctx.closePath(); ctx.fill()
    } else {
      ctx.fillStyle = 'hsla(205,85%,52%,0.9)'
      ctx.fillRect(p.x - sw * 0.5, p.y - sh, sw, sh)
      ctx.strokeStyle = 'hsla(195,100%,72%,0.9)'
      ctx.lineWidth = Math.max(0.6, 1.6 * p.k)
      ctx.strokeRect(p.x - sw * 0.5, p.y - sh, sw, sh)
    }
  }

  for (const p of s.particles) {
    ctx.fillStyle = `hsla(${p.hue},95%,64%,${Math.min(1, p.life * 2)})`
    ctx.beginPath(); ctx.arc(w * 0.5 + p.x - w * 0.28, h * 0.80 + p.y, p.size, 0, Math.PI * 2); ctx.fill()
  }

  // The runner, at a fixed point on screen.
  const r = s.runner
  const rp = project(s, r.laneF, s.dist, r.y)
  const vis = r.invuln <= 0 || Math.floor(r.invuln * 14) % 2 === 0
  if (vis) {
    const squash = r.sliding > 0 ? 0.5 : 1
    ctx.fillStyle = r.boost > 0 ? 'hsla(45,100%,66%,1)' : 'hsla(195,100%,70%,1)'
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(rp.x, rp.y - 44 * squash)
    ctx.lineTo(rp.x + 16, rp.y)
    ctx.lineTo(rp.x, rp.y - 10 * squash)
    ctx.lineTo(rp.x - 16, rp.y)
    ctx.closePath(); ctx.fill(); ctx.stroke()
    ctx.fillStyle = r.boost > 0 ? 'hsla(45,100%,60%,0.22)' : 'hsla(195,100%,60%,0.16)'
    ctx.beginPath(); ctx.arc(rp.x, rp.y - 22, 34, 0, Math.PI * 2); ctx.fill()
  }
  // Shadow, so the jump height is readable.
  ctx.globalCompositeOperation = 'source-over'
  const ground = project(s, r.laneF, s.dist, 0)
  ctx.fillStyle = `rgba(0,0,0,${0.42 + r.y / 400})`
  ctx.beginPath()
  ctx.ellipse(ground.x, ground.y + 2, 17, 5, 0, 0, Math.PI * 2)
  ctx.fill()
}
