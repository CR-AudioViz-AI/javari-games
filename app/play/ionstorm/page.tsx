'use client'
// app/play/ionstorm/page.tsx — Ionstorm
//
// The React shell around the engine. Rendering and input live here; simulation
// lives in engine.ts. That boundary is deliberate — a developer copying this as
// a template should see that game logic does not belong beside JSX.
//
// Two things worth copying:
//
//   FIXED TIMESTEP with an accumulator. The simulation advances in 16.67ms
//   increments no matter the frame rate. Without it, a 144Hz monitor runs the
//   game 2.4x faster than a 60Hz one — the most common mistake in browser games.
//
//   RENDER READS, NEVER WRITES. Every draw call reads state and mutates
//   nothing, so a dropped frame costs a frame and never corrupts the game.
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026
import { useCallback, useEffect, useRef, useState } from 'react'
import { BloomRenderer, makeBloom } from '@/lib/gfx/bloom'
import { State, UPGRADES, buy, costOf, newState, startWave, step } from './engine'

const STEP = 1 / 60

export default function Ionstorm() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  // The 2D work happens on an offscreen canvas; the visible one is WebGL and
  // only ever receives the post-processed result.
  const sceneRef = useRef<HTMLCanvasElement | null>(null)
  const bloomRef = useRef<BloomRenderer | null>(null)
  const stateRef = useRef<State | null>(null)
  const keys = useRef<Record<string, boolean>>({})
  const mouse = useRef({ x: 0, y: 0, down: false })
  const [ui, setUi] = useState({ phase: 'ready', wave: 0, score: 0, cores: 0,
                                 shield: 3, best: 0, killed: 0, total: 0 })

  const sync = useCallback(() => {
    const s = stateRef.current
    if (!s) return
    setUi({ phase: s.phase, wave: s.wave, score: s.score, cores: s.cores,
            shield: s.shield, best: s.best, killed: s.killed, total: s.waveTotal })
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!sceneRef.current) sceneRef.current = document.createElement('canvas')
    const scene = sceneRef.current
    const ctx = scene.getContext('2d', { alpha: false })
    if (!ctx) return
    bloomRef.current = makeBloom(canvas, { intensity: 1.25, threshold: 0.50, aberration: 0.014, vignette: 0.44 })

    const resize = () => {
      const r = canvas.parentElement?.getBoundingClientRect()
      const w = Math.min(1100, r ? r.width - 8 : 900)
      const h = Math.round(w * 0.62)
      // Render at device resolution so the neon edges stay crisp on retina.
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      scene.width = w * dpr; scene.height = h * dpr
      bloomRef.current?.resize(w * dpr, h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (!stateRef.current) {
        const best = Number(window.localStorage?.getItem('ionstorm.best') ?? 0)
        stateRef.current = newState(w, h, best)
      } else {
        stateRef.current.w = w
        stateRef.current.h = h
      }
    }
    resize()
    window.addEventListener('resize', resize)

    const kd = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) {
        e.preventDefault()
      }
    }
    const ku = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)

    const move = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      mouse.current.x = e.clientX - r.left
      mouse.current.y = e.clientY - r.top
    }
    const down = (e: PointerEvent) => { move(e); mouse.current.down = true }
    const up = () => { mouse.current.down = false }
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)

    let raf = 0
    let last = performance.now()
    let acc = 0

    const frame = (now: number) => {
      const s = stateRef.current
      if (!s) { raf = requestAnimationFrame(frame); return }
      // Clamp so a backgrounded tab does not run a thousand steps on return.
      const delta = Math.min(0.25, (now - last) / 1000)
      last = now
      acc += delta

      while (acc >= STEP) {
        const k = keys.current
        const mv = { x: 0, y: 0 }
        if (k['a'] || k['arrowleft']) mv.x -= 1
        if (k['d'] || k['arrowright']) mv.x += 1
        if (k['w'] || k['arrowup']) mv.y -= 1
        if (k['s'] || k['arrowdown']) mv.y += 1
        const m = Math.hypot(mv.x, mv.y)
        if (m > 0) { mv.x /= m; mv.y /= m }
        step(s, STEP, {
          move: mv,
          aim: { x: mouse.current.x, y: mouse.current.y },
          firing: mouse.current.down || !!k[' '],
        })
        acc -= STEP
      }

      draw(ctx, s)

      // One blit through bright-pass, separable blur and composite.

      bloomRef.current?.present(scene, now)
      if (s.phase !== 'playing') sync()
      else if (Math.random() < 0.12) sync()
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      bloomRef.current?.dispose()
      window.removeEventListener('resize', resize)
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
    }
  }, [sync])

  useEffect(() => {
    if (ui.phase === 'over' && stateRef.current) {
      try { window.localStorage?.setItem('ionstorm.best', String(stateRef.current.best)) } catch { /* private mode */ }
    }
  }, [ui.phase])

  const begin = () => {
    const s = stateRef.current
    if (!s) return
    if (s.phase === 'over') {
      const best = s.best
      stateRef.current = newState(s.w, s.h, best)
    }
    startWave(stateRef.current!)
    sync()
  }

  const purchase = (id: string) => {
    const s = stateRef.current
    if (!s) return
    buy(s, id)
    sync()
  }

  const s = stateRef.current

  return (
    <div style={{ minHeight: '100vh', background: '#04070E', color: '#E8F1FA',
                  fontFamily: 'system-ui, sans-serif', padding: '16px' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 10, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>
            ION<span style={{ color: '#4FD1FF' }}>STORM</span>
          </h1>
          <span style={{ color: 'rgba(232,241,250,0.55)', fontSize: 13 }}>
            Twelve waves. Survive, collect cores, refit between waves.
          </span>
        </header>

        <div style={{ display: 'flex', gap: 18, fontSize: 13, marginBottom: 8, flexWrap: 'wrap' }}>
          <Stat label="WAVE" value={`${ui.wave || '—'} / 12`} />
          <Stat label="SCORE" value={ui.score.toLocaleString()} />
          <Stat label="CORES" value={String(ui.cores)} tone="#F5C542" />
          <Stat label="SHIELD" value={'▮'.repeat(Math.max(0, ui.shield)) || '—'} tone="#4FD1FF" />
          <Stat label="BEST" value={ui.best.toLocaleString()} />
        </div>

        <div style={{ position: 'relative' }}>
          <canvas ref={canvasRef} style={{ display: 'block', borderRadius: 12,
            border: '1px solid rgba(79,209,255,0.18)', background: '#04070E', cursor: 'crosshair' }} />

          {ui.phase === 'ready' && (
            <Overlay>
              <h2 style={{ fontSize: 30, margin: '0 0 6px' }}>Ionstorm</h2>
              <p style={{ color: 'rgba(232,241,250,0.7)', maxWidth: 460, margin: '0 0 4px' }}>
                <b>WASD</b> or arrows to move. <b>Mouse</b> to aim, <b>click</b> or <b>space</b> to fire.
              </p>
              <p style={{ color: 'rgba(232,241,250,0.5)', maxWidth: 460, margin: '0 0 18px', fontSize: 13 }}>
                Five enemy types, each moving differently. Splitters divide when killed —
                keep your distance. Wardens arrive every fourth wave.
              </p>
              <Button onClick={begin}>Launch</Button>
            </Overlay>
          )}

          {ui.phase === 'shop' && s && (
            <Overlay>
              <h2 style={{ fontSize: 24, margin: '0 0 2px' }}>Wave {ui.wave} cleared</h2>
              <p style={{ color: '#F5C542', margin: '0 0 14px' }}>{ui.cores} cores available</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))',
                            gap: 8, width: 'min(760px, 88vw)', marginBottom: 16 }}>
                {UPGRADES.map(u => {
                  const have = s.levels[u.id] ?? 0
                  const cost = costOf(s, u)
                  const maxed = have >= u.max
                  const afford = s.cores >= cost && !maxed
                  return (
                    <button key={u.id} onClick={() => purchase(u.id)} disabled={!afford}
                      style={{ textAlign: 'left', padding: '9px 11px', borderRadius: 9,
                        background: afford ? 'rgba(79,209,255,0.10)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${afford ? 'rgba(79,209,255,0.35)' : 'rgba(255,255,255,0.08)'}`,
                        color: '#E8F1FA', cursor: afford ? 'pointer' : 'default', opacity: maxed ? 0.45 : 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 13.5 }}>
                        <span>{u.name}</span>
                        <span style={{ color: maxed ? '#7BE495' : '#F5C542' }}>
                          {maxed ? 'MAX' : `${cost}◆`}
                        </span>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'rgba(232,241,250,0.6)' }}>{u.detail}</div>
                      <div style={{ fontSize: 11, color: 'rgba(79,209,255,0.75)', marginTop: 2 }}>
                        {'▮'.repeat(have)}{'▯'.repeat(u.max - have)}
                      </div>
                    </button>
                  )
                })}
              </div>
              <Button onClick={begin}>Wave {ui.wave + 1}</Button>
            </Overlay>
          )}

          {ui.phase === 'over' && (
            <Overlay>
              <h2 style={{ fontSize: 28, margin: '0 0 4px' }}>
                {ui.wave >= 12 ? 'Storm weathered' : 'Hull breached'}
              </h2>
              <p style={{ color: 'rgba(232,241,250,0.7)', margin: '0 0 4px' }}>
                Wave {ui.wave} · {ui.score.toLocaleString()} points
              </p>
              <p style={{ color: '#F5C542', margin: '0 0 18px', fontSize: 13 }}>
                Best {ui.best.toLocaleString()}
              </p>
              <Button onClick={begin}>Again</Button>
            </Overlay>
          )}
        </div>

        <p style={{ color: 'rgba(232,241,250,0.35)', fontSize: 12, marginTop: 12 }}>
          Built on the CR AudioViz AI platform · EIN 39-3646201 · original work, fixed-timestep canvas engine
        </p>
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: 1.2, color: 'rgba(232,241,250,0.4)' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: tone ?? '#E8F1FA' }}>{value}</div>
    </div>
  )
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                  background: 'rgba(4,7,14,0.86)', borderRadius: 12, padding: 20 }}>
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

/** Reads state, mutates nothing. A dropped frame costs a frame, never the game. */
function draw(ctx: CanvasRenderingContext2D, s: State) {
  const { w, h } = s
  ctx.save()
  if (s.shake > 0) {
    ctx.translate((Math.random() - 0.5) * s.shake * 9, (Math.random() - 0.5) * s.shake * 9)
  }

  ctx.fillStyle = '#04070E'
  ctx.fillRect(-20, -20, w + 40, h + 40)

  // Grid, faint, for a sense of motion.
  ctx.strokeStyle = 'rgba(79,209,255,0.045)'
  ctx.lineWidth = 1
  for (let x = 0; x < w; x += 44) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
  for (let y = 0; y < h; y += 44) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }

  ctx.globalCompositeOperation = 'lighter'

  for (const p of s.particles) {
    const a = p.life / p.maxLife
    ctx.fillStyle = `hsla(${p.hue},100%,64%,${a * 0.85})`
    ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.size * a, 0, Math.PI * 2); ctx.fill()
  }

  for (const c of s.drops) {
    const pulse = 1 + Math.sin(c.age * 8) * 0.18
    ctx.fillStyle = 'hsla(52,100%,64%,0.9)'
    ctx.beginPath(); ctx.arc(c.pos.x, c.pos.y, c.radius * pulse, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'hsla(52,100%,80%,0.28)'
    ctx.beginPath(); ctx.arc(c.pos.x, c.pos.y, c.radius * 2.6 * pulse, 0, Math.PI * 2); ctx.fill()
  }

  for (const b of s.shots) {
    ctx.strokeStyle = `hsla(${b.hue},100%,68%,0.95)`
    ctx.lineWidth = b.radius
    ctx.beginPath()
    ctx.moveTo(b.pos.x, b.pos.y)
    ctx.lineTo(b.pos.x - b.vel.x * 0.022, b.pos.y - b.vel.y * 0.022)
    ctx.stroke()
  }

  for (const e of s.enemies) {
    const hurt = e.hp / e.maxHp
    ctx.strokeStyle = `hsla(${e.hue},95%,${45 + hurt * 22}%,0.95)`
    ctx.fillStyle = `hsla(${e.hue},95%,${16 + hurt * 12}%,0.85)`
    ctx.lineWidth = e.kind === 'warden' ? 3 : 2
    ctx.beginPath()
    if (e.kind === 'darter') {
      // triangle, pointing where it is going
      const a = Math.atan2(e.vel.y, e.vel.x)
      for (let i = 0; i < 3; i++) {
        const t = a + (i * Math.PI * 2) / 3
        const r = i === 0 ? e.radius * 1.5 : e.radius
        const fn = i === 0 ? 'moveTo' : 'lineTo'
        ctx[fn](e.pos.x + Math.cos(t) * r, e.pos.y + Math.sin(t) * r)
      }
      ctx.closePath()
    } else if (e.kind === 'splitter' || e.kind === 'warden') {
      const sides = e.kind === 'warden' ? 8 : 6
      const spin = (e.spin ?? 0) + e.age * 0.9
      for (let i = 0; i < sides; i++) {
        const t = spin + (i * Math.PI * 2) / sides
        const fn = i === 0 ? 'moveTo' : 'lineTo'
        ctx[fn](e.pos.x + Math.cos(t) * e.radius, e.pos.y + Math.sin(t) * e.radius)
      }
      ctx.closePath()
    } else {
      ctx.arc(e.pos.x, e.pos.y, e.radius, 0, Math.PI * 2)
    }
    ctx.fill(); ctx.stroke()
    if (e.kind === 'warden') {
      ctx.strokeStyle = 'hsla(15,100%,60%,0.35)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(e.pos.x, e.pos.y, e.radius + 8 + Math.sin(e.age * 3) * 3, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  for (const d of s.drones) {
    ctx.fillStyle = 'hsla(165,100%,60%,0.9)'
    ctx.beginPath(); ctx.arc(d.pos.x, d.pos.y, d.radius, 0, Math.PI * 2); ctx.fill()
  }

  // Player, flashing while invulnerable so the state is readable.
  const vis = s.invuln <= 0 || Math.floor(s.invuln * 14) % 2 === 0
  if (vis) {
    const a = Math.atan2(0, 1) + s.player.age * 0.6
    ctx.strokeStyle = 'hsla(190,100%,72%,1)'
    ctx.fillStyle = 'hsla(190,100%,26%,0.9)'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    for (let i = 0; i < 4; i++) {
      const t = a + (i * Math.PI * 2) / 4
      const r = i % 2 === 0 ? s.player.radius : s.player.radius * 0.6
      const fn = i === 0 ? 'moveTo' : 'lineTo'
      ctx[fn](s.player.pos.x + Math.cos(t) * r, s.player.pos.y + Math.sin(t) * r)
    }
    ctx.closePath(); ctx.fill(); ctx.stroke()
    ctx.fillStyle = 'hsla(190,100%,70%,0.16)'
    ctx.beginPath(); ctx.arc(s.player.pos.x, s.player.pos.y, s.player.radius * 2.4, 0, Math.PI * 2); ctx.fill()
  }

  ctx.globalCompositeOperation = 'source-over'

  if (s.phase === 'playing' && s.waveTotal > 0) {
    const frac = Math.min(1, s.killed / s.waveTotal)
    ctx.fillStyle = 'rgba(255,255,255,0.07)'
    ctx.fillRect(14, h - 16, w - 28, 4)
    ctx.fillStyle = 'rgba(79,209,255,0.85)'
    ctx.fillRect(14, h - 16, (w - 28) * frac, 4)
  }
  ctx.restore()
}
