'use client'
// app/play/neon-drift/page.tsx — Neon Drift
//
// Game three of twenty-five. Ten procedurally generated tracks, three laps
// each, with a ghost of your best run replayed alongside you.
//
// The track is drawn once to an offscreen canvas and blitted each frame. A
// spline of 160 points redrawn 60 times a second is wasted work when the track
// never changes — this is the standard trick and it is why the game holds 60fps
// while also drawing skid marks and particles.
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026
import { useCallback, useEffect, useRef, useState } from 'react'
import { State, fmt, loadTrack, newState, start, step } from './engine'

export default function NeonDrift() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ref = useRef<State | null>(null)
  const bg = useRef<HTMLCanvasElement | null>(null)
  const keys = useRef<Record<string, boolean>>({})
  const [ui, setUi] = useState({ phase: 'ready', track: '', index: 0, time: 0,
                                 lap: 0, laps: 3, best: 0, bestLap: 0,
                                 boost: 0, drifting: false, msg: '' })

  const sync = useCallback(() => {
    const s = ref.current
    if (!s) return
    setUi({ phase: s.phase, track: s.track.name, index: s.trackIndex, time: s.time,
            lap: s.car.lap, laps: s.laps, best: s.bestTotal[s.trackIndex] ?? 0,
            bestLap: s.car.bestLap, boost: s.car.boost, drifting: s.car.drifting,
            msg: s.message })
  }, [])

  /** Redraw the static track layer. Called on load and resize, not per frame. */
  const bake = useCallback(() => {
    const s = ref.current
    if (!s) return
    const c = document.createElement('canvas')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    c.width = s.w * dpr; c.height = s.h * dpr
    const g = c.getContext('2d')
    if (!g) return
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.fillStyle = '#05060B'
    g.fillRect(0, 0, s.w, s.h)
    // Faint grid for a sense of scale.
    g.strokeStyle = 'rgba(120,200,255,0.04)'
    for (let x = 0; x < s.w; x += 50) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, s.h); g.stroke() }
    for (let y = 0; y < s.h; y += 50) { g.beginPath(); g.moveTo(0, y); g.lineTo(s.w, y); g.stroke() }

    const pts = s.track.points
    const line = (width: number, style: string, dash?: number[]) => {
      g.strokeStyle = style
      g.lineWidth = width
      g.lineCap = 'round'
      g.lineJoin = 'round'
      if (dash) g.setLineDash(dash); else g.setLineDash([])
      g.beginPath()
      pts.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)))
      g.closePath()
      g.stroke()
    }
    line(s.track.width + 10, 'rgba(79,209,255,0.16)')     // outer glow
    line(s.track.width, '#12161F')                         // asphalt
    line(s.track.width - 8, '#0C1017')                     // inner shade
    line(2, 'rgba(255,255,255,0.16)', [14, 20])            // centre dashes

    // Start line, drawn across the track at the first point.
    const p0 = pts[0], p1 = pts[1]
    const a = Math.atan2(p1.y - p0.y, p1.x - p0.x) + Math.PI / 2
    g.setLineDash([])
    g.strokeStyle = 'rgba(255,255,255,0.7)'
    g.lineWidth = 4
    g.beginPath()
    g.moveTo(p0.x + Math.cos(a) * s.track.width / 2, p0.y + Math.sin(a) * s.track.width / 2)
    g.lineTo(p0.x - Math.cos(a) * s.track.width / 2, p0.y - Math.sin(a) * s.track.width / 2)
    g.stroke()
    bg.current = c
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const r = canvas.parentElement?.getBoundingClientRect()
      const w = Math.min(1100, r ? r.width - 8 : 900)
      const h = Math.round(w * 0.60)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = w * dpr; canvas.height = h * dpr
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      let best: Record<number, number> = {}
      try { best = JSON.parse(window.localStorage?.getItem('ndrift.best') ?? '{}') } catch { best = {} }
      const idx = ref.current?.trackIndex ?? 0
      ref.current = newState(w, h, idx, ref.current?.bestTotal ?? best)
      bake()
      sync()
    }
    resize()
    window.addEventListener('resize', resize)

    const kd = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true
      if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())) e.preventDefault()
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
      while (acc >= STEP) {
        const k = keys.current
        step(s, STEP, {
          throttle: (k['w'] || k['arrowup'] ? 1 : 0) + (k['s'] || k['arrowdown'] ? -1 : 0),
          steer: (k['d'] || k['arrowright'] ? 1 : 0) + (k['a'] || k['arrowleft'] ? -1 : 0),
          handbrake: !!(k['shift'] || k[' ']),
        })
        acc -= STEP
      }
      draw(ctx, s, bg.current)
      if (s.phase !== 'racing' || Math.random() < 0.2) sync()
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
    }
  }, [sync, bake])

  useEffect(() => {
    const s = ref.current
    if (!s) return
    try { window.localStorage?.setItem('ndrift.best', JSON.stringify(s.bestTotal)) } catch { /* private mode */ }
  }, [ui.phase])

  const go = () => { const s = ref.current; if (s) { start(s); sync() } }
  const change = (d: number) => {
    const s = ref.current
    if (!s) return
    loadTrack(s, s.trackIndex + d)
    bake(); sync()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#05060B', color: '#E8F1FA',
                  fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 8, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>
            NEON<span style={{ color: '#4FD1FF' }}>DRIFT</span>
          </h1>
          <span style={{ color: 'rgba(232,241,250,0.55)', fontSize: 13 }}>
            Ten generated tracks. Three laps. Drift to build boost.
          </span>
        </header>

        <div style={{ display: 'flex', gap: 16, fontSize: 13, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => change(-1)} style={navStyle}>‹</button>
          <Stat label="TRACK" value={`${ui.index + 1}. ${ui.track}`} />
          <button onClick={() => change(1)} style={navStyle}>›</button>
          <Stat label="LAP" value={`${Math.min(ui.lap, ui.laps)} / ${ui.laps}`} />
          <Stat label="TIME" value={fmt(ui.time)} />
          <Stat label="BEST LAP" value={fmt(ui.bestLap)} tone="#4FD1FF" />
          <Stat label="RECORD" value={fmt(ui.best)} tone="#7BE495" />
          <div>
            <div style={{ fontSize: 10, letterSpacing: 1.2, color: 'rgba(232,241,250,0.4)' }}>BOOST</div>
            <div style={{ width: 92, height: 9, background: 'rgba(255,255,255,0.08)',
                          borderRadius: 5, overflow: 'hidden', marginTop: 3 }}>
              <div style={{ width: `${ui.boost}%`, height: '100%',
                            background: ui.drifting ? '#F5C542' : '#4FD1FF', transition: 'width .1s' }} />
            </div>
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <canvas ref={canvasRef} style={{ display: 'block', borderRadius: 12,
            border: '1px solid rgba(79,209,255,0.18)', background: '#05060B' }} />

          {ui.phase === 'ready' && (
            <Overlay>
              <h2 style={{ fontSize: 26, margin: '0 0 4px' }}>{ui.track}</h2>
              <p style={{ color: 'rgba(232,241,250,0.65)', maxWidth: 460, margin: '0 0 4px' }}>
                <b>WASD</b> or arrows to drive. Hold <b>SHIFT</b> to break traction into a corner.
              </p>
              <p style={{ color: 'rgba(232,241,250,0.45)', maxWidth: 460, margin: '0 0 18px', fontSize: 13 }}>
                Drifting fills the boost bar. Boost is spent automatically on throttle.
                Leave the surface and you lose most of your grip.
              </p>
              <Button onClick={go}>Green light</Button>
            </Overlay>
          )}

          {ui.phase === 'finished' && (
            <Overlay>
              <h2 style={{ fontSize: 26, margin: '0 0 4px' }}>{ui.msg}</h2>
              <p style={{ color: 'rgba(232,241,250,0.7)', margin: '0 0 2px' }}>
                Total {fmt(ui.time)} · best lap {fmt(ui.bestLap)}
              </p>
              <p style={{ color: '#7BE495', margin: '0 0 18px', fontSize: 13 }}>
                Track record {fmt(ui.best)}
              </p>
              <Button onClick={go}>Run it again</Button>
            </Overlay>
          )}
        </div>

        <p style={{ color: 'rgba(232,241,250,0.3)', fontSize: 12, marginTop: 10 }}>
          Tracks generated from a seed with a Catmull-Rom spline · lateral and forward velocity
          modelled separately, so the drift emerges from the physics ·
          CR AudioViz AI · EIN 39-3646201
        </p>
      </div>
    </div>
  )
}

const navStyle: React.CSSProperties = {
  background: 'rgba(79,209,255,0.12)', border: '1px solid rgba(79,209,255,0.3)',
  color: '#4FD1FF', borderRadius: 7, width: 30, height: 30, fontSize: 16,
  cursor: 'pointer', lineHeight: 1,
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
                  background: 'rgba(5,6,11,0.86)', borderRadius: 12, padding: 20 }}>
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

function draw(ctx: CanvasRenderingContext2D, s: State, bgc: HTMLCanvasElement | null) {
  const { w, h } = s
  if (bgc) ctx.drawImage(bgc, 0, 0, w, h)
  else { ctx.fillStyle = '#05060B'; ctx.fillRect(0, 0, w, h) }

  // Skid marks under everything, fading out.
  for (const k of s.skids) {
    ctx.strokeStyle = `rgba(20,20,26,${(k.life / 3.2) * 0.7})`
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(k.pos.x - Math.cos(k.a) * 5, k.pos.y - Math.sin(k.a) * 5)
    ctx.lineTo(k.pos.x + Math.cos(k.a) * 5, k.pos.y + Math.sin(k.a) * 5)
    ctx.stroke()
  }

  ctx.globalCompositeOperation = 'lighter'

  // Ghost of the record run.
  if (s.ghost && s.ghost.length > 1) {
    const i = Math.min(s.ghost.length - 1, Math.floor(s.time * 20))
    const g = s.ghost[i]
    ctx.fillStyle = 'rgba(123,228,149,0.35)'
    ctx.beginPath(); ctx.arc(g.x, g.y, 7, 0, Math.PI * 2); ctx.fill()
  }

  for (const p of s.particles) {
    ctx.fillStyle = `hsla(${p.hue},100%,66%,${p.life * 1.6})`
    ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.size * p.life * 2, 0, Math.PI * 2); ctx.fill()
  }

  // The car: a wedge pointing along heading, with the body rotated by slip so
  // you can SEE the drift angle rather than only feel it.
  const c = s.car
  const visual = c.heading + Math.atan2(
    c.vel.x * -Math.sin(c.heading) + c.vel.y * Math.cos(c.heading),
    Math.max(40, Math.abs(c.vel.x * Math.cos(c.heading) + c.vel.y * Math.sin(c.heading)))
  ) * 0.55
  ctx.save()
  ctx.translate(c.pos.x, c.pos.y)
  ctx.rotate(visual)
  ctx.fillStyle = c.drifting ? 'hsla(45,100%,62%,1)' : 'hsla(195,100%,66%,1)'
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(15, 0); ctx.lineTo(-9, 8); ctx.lineTo(-5, 0); ctx.lineTo(-9, -8)
  ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.restore()
  ctx.fillStyle = c.drifting ? 'hsla(45,100%,60%,0.20)' : 'hsla(195,100%,60%,0.16)'
  ctx.beginPath(); ctx.arc(c.pos.x, c.pos.y, 22, 0, Math.PI * 2); ctx.fill()

  ctx.globalCompositeOperation = 'source-over'
}
