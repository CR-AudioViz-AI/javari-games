'use client'
// app/play/gravity-well/page.tsx — Gravity Well
//
// Game two of twenty-five. Twelve levels of orbital mechanics: drag to aim,
// release to launch, and let gravity do the rest.
//
// The trajectory preview calls predict(), which runs the SAME integrator the
// simulation does on a copy of the world. Two separate implementations would
// drift apart and the aim line would lie — the classic bug in this genre.
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026
import { useCallback, useEffect, useRef, useState } from 'react'
import { State, launch, loadLevel, newState, nextLevel, predict, step } from './engine'

export default function GravityWell() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ref = useRef<State | null>(null)
  const drag = useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 })
  const [ui, setUi] = useState({ phase: 'aim', level: 0, name: '', hint: '',
                                 shots: 0, par: 1, best: -1, total: 0, msg: '' })

  const sync = useCallback(() => {
    const s = ref.current
    if (!s) return
    const l = s.levels[s.level]
    setUi({ phase: s.phase, level: s.level, name: l.name, hint: l.hint,
            shots: s.shots, par: l.par, best: s.best[s.level] ?? -1,
            total: s.totalShots, msg: s.message })
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
      try { best = JSON.parse(window.localStorage?.getItem('gwell.best') ?? '{}') } catch { best = {} }
      const keep = ref.current?.level ?? 0
      ref.current = newState(w, h, ref.current?.best ?? best)
      if (keep) loadLevel(ref.current, keep)
      sync()
    }
    resize()
    window.addEventListener('resize', resize)

    const at = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const down = (e: PointerEvent) => {
      const s = ref.current
      if (!s || s.phase !== 'aim') return
      const p = at(e)
      drag.current = { active: true, x: p.x, y: p.y }
    }
    const move = (e: PointerEvent) => {
      if (!drag.current.active) return
      const p = at(e)
      drag.current.x = p.x; drag.current.y = p.y
    }
    const up = () => {
      const s = ref.current
      if (!s || !drag.current.active) return
      drag.current.active = false
      if (s.phase !== 'aim') return
      const l = s.levels[s.level]
      const dx = drag.current.x - l.launch.x, dy = drag.current.y - l.launch.y
      const d = Math.hypot(dx, dy)
      if (d < 14) return
      const power = Math.min(1, d / 240)
      launch(s, { x: dx / d, y: dy / d }, power)
      sync()
    }
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)

    let raf = 0, last = performance.now()
    const frame = (now: number) => {
      const s = ref.current
      if (!s) { raf = requestAnimationFrame(frame); return }
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const before = s.phase
      step(s, dt)
      draw(ctx, s, drag.current)
      if (s.phase !== before) sync()
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [sync])

  useEffect(() => {
    const s = ref.current
    if (!s) return
    try { window.localStorage?.setItem('gwell.best', JSON.stringify(s.best)) } catch { /* private mode */ }
  }, [ui.phase, ui.best])

  const retry = () => { const s = ref.current; if (s) { loadLevel(s, s.level); sync() } }
  const advance = () => { const s = ref.current; if (s) { nextLevel(s); sync() } }
  const restart = () => { const s = ref.current; if (s) { loadLevel(s, 0); s.totalShots = 0; sync() } }

  return (
    <div style={{ minHeight: '100vh', background: '#04060C', color: '#E8F1FA',
                  fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 8, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>
            GRAVITY<span style={{ color: '#9F7BFF' }}>WELL</span>
          </h1>
          <span style={{ color: 'rgba(232,241,250,0.55)', fontSize: 13 }}>
            Twelve levels of orbital mechanics. Drag to aim, release to launch.
          </span>
        </header>

        <div style={{ display: 'flex', gap: 18, fontSize: 13, marginBottom: 8, flexWrap: 'wrap' }}>
          <Stat label="LEVEL" value={`${ui.level + 1} / 12`} />
          <Stat label="NAME" value={ui.name} />
          <Stat label="SHOTS" value={String(ui.shots)} />
          <Stat label="PAR" value={String(ui.par)} tone="#9F7BFF" />
          <Stat label="BEST" value={ui.best < 0 ? '—' : String(ui.best)} tone="#7BE495" />
          <Stat label="TOTAL" value={String(ui.total)} />
        </div>

        <div style={{ position: 'relative' }}>
          <canvas ref={canvasRef} style={{ display: 'block', borderRadius: 12,
            border: '1px solid rgba(159,123,255,0.18)', background: '#04060C',
            cursor: ui.phase === 'aim' ? 'crosshair' : 'default', touchAction: 'none' }} />

          {ui.phase === 'won' && (
            <Overlay>
              <h2 style={{ fontSize: 26, margin: '0 0 4px' }}>Contact</h2>
              <p style={{ color: 'rgba(232,241,250,0.7)', margin: '0 0 4px' }}>
                {ui.shots} shot{ui.shots === 1 ? '' : 's'} · par {ui.par}
              </p>
              <p style={{ color: ui.shots <= ui.par ? '#7BE495' : 'rgba(232,241,250,0.5)',
                          margin: '0 0 18px', fontSize: 13 }}>
                {ui.shots <= ui.par ? 'At or under par.' : 'Over par — try a tighter line.'}
              </p>
              <Button onClick={advance}>{ui.level >= 11 ? 'Finish' : 'Next level'}</Button>
            </Overlay>
          )}

          {ui.phase === 'lost' && (
            <Overlay>
              <h2 style={{ fontSize: 24, margin: '0 0 6px' }}>{ui.msg}</h2>
              <p style={{ color: 'rgba(232,241,250,0.55)', margin: '0 0 18px', fontSize: 13,
                          maxWidth: 420 }}>{ui.hint}</p>
              <Button onClick={retry}>Retry</Button>
            </Overlay>
          )}

          {ui.phase === 'complete' && (
            <Overlay>
              <h2 style={{ fontSize: 28, margin: '0 0 4px' }}>All twelve cleared</h2>
              <p style={{ color: '#9F7BFF', margin: '0 0 18px' }}>{ui.total} shots total</p>
              <Button onClick={restart}>Play again</Button>
            </Overlay>
          )}
        </div>

        <p style={{ color: 'rgba(232,241,250,0.4)', fontSize: 12.5, marginTop: 10 }}>
          {ui.hint}
        </p>
        <p style={{ color: 'rgba(232,241,250,0.3)', fontSize: 12, marginTop: 4 }}>
          Velocity Verlet integration · the aim line runs the same integrator as the simulation ·
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
                  background: 'rgba(4,6,12,0.86)', borderRadius: 12, padding: 20 }}>
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

function draw(ctx: CanvasRenderingContext2D, s: State, drag: { active: boolean; x: number; y: number }) {
  const { w, h } = s
  ctx.fillStyle = '#04060C'
  ctx.fillRect(0, 0, w, h)

  // Starfield, deterministic so it does not shimmer between frames.
  ctx.fillStyle = 'rgba(255,255,255,0.30)'
  for (let i = 0; i < 90; i++) {
    const x = ((i * 7919) % 1000) / 1000 * w
    const y = ((i * 104729) % 1000) / 1000 * h
    ctx.fillRect(x, y, 1.2, 1.2)
  }

  ctx.globalCompositeOperation = 'lighter'

  // Gravity field: faint rings showing each well's reach, so the map is readable
  // before launching rather than only after crashing.
  for (const b of s.bodies) {
    if (b.mass <= 0) continue
    for (let r = b.radius + 26; r < b.radius + 150; r += 30) {
      ctx.strokeStyle = `hsla(${b.hue},90%,60%,${0.05 * (1 - (r - b.radius) / 160)})`
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, r, 0, Math.PI * 2); ctx.stroke()
    }
  }

  const l = s.levels[s.level]

  // Aim preview — same integrator as the simulation.
  if (s.phase === 'aim' && drag.active) {
    const dx = drag.x - l.launch.x, dy = drag.y - l.launch.y
    const d = Math.hypot(dx, dy)
    if (d > 14) {
      const power = Math.min(1, d / 240)
      const path = predict(s, { x: dx / d, y: dy / d }, power)
      ctx.strokeStyle = 'rgba(159,123,255,0.55)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 5])
      ctx.beginPath()
      path.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
      ctx.stroke()
      ctx.setLineDash([])
      // power gauge on the drag line
      ctx.strokeStyle = `hsla(${280 - power * 60},100%,66%,0.9)`
      ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(l.launch.x, l.launch.y)
      ctx.lineTo(l.launch.x + (dx / d) * (30 + power * 60), l.launch.y + (dy / d) * (30 + power * 60))
      ctx.stroke()
    }
  }

  // Probe trail. NaN entries mark a wormhole jump and break the line.
  if (s.probe && s.probe.trail.length > 1) {
    ctx.strokeStyle = 'rgba(120,220,255,0.75)'
    ctx.lineWidth = 2
    ctx.beginPath()
    let pen = false
    for (const p of s.probe.trail) {
      if (Number.isNaN(p.x)) { pen = false; continue }
      if (!pen) { ctx.moveTo(p.x, p.y); pen = true } else ctx.lineTo(p.x, p.y)
    }
    ctx.stroke()
  }

  for (const b of s.bodies) {
    if (b.kind === 'star') {
      const g = ctx.createRadialGradient(b.pos.x, b.pos.y, 0, b.pos.x, b.pos.y, b.radius * 3)
      g.addColorStop(0, `hsla(${b.hue},100%,72%,0.95)`)
      g.addColorStop(0.35, `hsla(${b.hue},100%,52%,0.45)`)
      g.addColorStop(1, `hsla(${b.hue},100%,50%,0)`)
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, b.radius * 3, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = `hsla(${b.hue},100%,86%,1)`
      ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI * 2); ctx.fill()
    } else if (b.kind === 'hazard') {
      ctx.strokeStyle = `hsla(${b.hue},100%,62%,0.95)`
      ctx.fillStyle = `hsla(${b.hue},100%,22%,0.8)`
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        const t = (i * Math.PI * 2) / 5 - Math.PI / 2
        const fn = i === 0 ? 'moveTo' : 'lineTo'
        ctx[fn](b.pos.x + Math.cos(t) * b.radius, b.pos.y + Math.sin(t) * b.radius)
      }
      ctx.closePath(); ctx.fill(); ctx.stroke()
    } else if (b.kind === 'wormhole') {
      for (let r = b.radius; r > 2; r -= 4) {
        ctx.strokeStyle = `hsla(${b.hue + r * 2},100%,66%,0.55)`
        ctx.lineWidth = 2
        ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, r, 0, Math.PI * 2); ctx.stroke()
      }
    } else if (b.kind === 'target') {
      const t = performance.now() / 400
      ctx.strokeStyle = 'hsla(150,100%,62%,0.95)'
      ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI * 2); ctx.stroke()
      ctx.beginPath()
      ctx.arc(b.pos.x, b.pos.y, b.radius + 6 + Math.sin(t) * 3, 0, Math.PI * 2)
      ctx.strokeStyle = 'hsla(150,100%,62%,0.35)'
      ctx.stroke()
      ctx.fillStyle = 'hsla(150,100%,62%,0.22)'
      ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, b.radius * 0.5, 0, Math.PI * 2); ctx.fill()
    }
  }

  // Launch pad and probe
  ctx.strokeStyle = 'rgba(120,220,255,0.8)'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(l.launch.x, l.launch.y, 10, 0, Math.PI * 2); ctx.stroke()

  if (s.probe && s.phase === 'flying') {
    ctx.fillStyle = 'hsla(195,100%,80%,1)'
    ctx.beginPath(); ctx.arc(s.probe.pos.x, s.probe.pos.y, 5, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'hsla(195,100%,70%,0.25)'
    ctx.beginPath(); ctx.arc(s.probe.pos.x, s.probe.pos.y, 13, 0, Math.PI * 2); ctx.fill()
  }

  ctx.globalCompositeOperation = 'source-over'
}
