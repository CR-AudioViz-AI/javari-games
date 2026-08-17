'use client'
// app/play/deep-space-fleet/page.tsx — Deep Space Fleet
//
// Game ten of twenty-five, closing Strategy. The first game to use the baked
// sprite pipeline: ships are drawn once at high detail into offscreen canvases
// with hull plating, panel lines, turrets, canopies and engine bells, then
// blitted. Planets get a lit limb, a terminator and banded surfaces.
//
// That is the answer to "these are shapes with glow" — detail costs nothing per
// frame when it is baked once at load.
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026
import { useCallback, useEffect, useRef, useState } from 'react'
import { BloomRenderer, makeBloom } from '@/lib/gfx/bloom'
import {
  Sprite, bakeCarrier, bakeCruiser, bakeFighter, bakePlanet, bakeStation, drawSprite,
} from '@/lib/gfx/sprites'
import {
  SHIPS, SHIP_ORDER, ShipKind, State, build, dist, empty, endTurn, fleetPower,
  newState, send, startGame, step,
} from './engine'

export default function DeepSpaceFleet() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const sceneRef = useRef<HTMLCanvasElement | null>(null)
  const bloomRef = useRef<BloomRenderer | null>(null)
  const ref = useRef<State | null>(null)
  const art = useRef<{
    ships: Record<'player' | 'foe', Record<ShipKind, Sprite>>
    station: Record<'player' | 'foe' | 'neutral', Sprite>
    planets: Map<number, HTMLCanvasElement>
  } | null>(null)
  const [ui, setUi] = useState({ phase: 'briefing', turn: 1, credits: 60, mine: 0,
                                 theirs: 0, sel: -1, msg: '', best: 0, log: [] as string[],
                                 sending: empty() })

  const sync = useCallback(() => {
    const s = ref.current
    if (!s) return
    setUi({ phase: s.phase, turn: s.turn, credits: Math.floor(s.credits),
            mine: s.worlds.filter(w => w.owner === 'player').length,
            theirs: s.worlds.filter(w => w.owner === 'foe').length,
            sel: s.selected ?? -1, msg: s.message, best: s.best,
            log: [...s.log], sending: { ...s.sending } })
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!sceneRef.current) sceneRef.current = document.createElement('canvas')
    const scene = sceneRef.current
    const ctx = scene.getContext('2d', { alpha: false })
    if (!ctx) return
    bloomRef.current = makeBloom(canvas, { intensity: 1.05, threshold: 0.60, aberration: 0.008, vignette: 0.46 })

    // Bake every sprite once. This is the whole point — detail is free per frame.
    if (!art.current) {
      art.current = {
        ships: {
          player: { fighter: bakeFighter(190), cruiser: bakeCruiser(200), carrier: bakeCarrier(205) },
          foe:    { fighter: bakeFighter(350), cruiser: bakeCruiser(355), carrier: bakeCarrier(0) },
        },
        station: { player: bakeStation(190), foe: bakeStation(350), neutral: bakeStation(210) },
        planets: new Map(),
      }
    }

    let W = 900, H = 560, DPR = 1
    const resize = () => {
      const r = canvas.parentElement?.getBoundingClientRect()
      W = Math.min(1100, r ? r.width - 8 : 900)
      H = Math.round(W * 0.62)
      DPR = Math.min(window.devicePixelRatio || 1, 2)
      scene.width = W * DPR; scene.height = H * DPR
      bloomRef.current?.resize(W * DPR, H * DPR)
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
      if (!ref.current) {
        const best = Number(window.localStorage?.getItem('dsf.best') ?? 0)
        ref.current = newState(7, best)
      }
      // Planet art is sized in pixels, so bake per world once W is known.
      const s = ref.current
      const a = art.current!
      for (const w of s.worlds) {
        if (!a.planets.has(w.id)) {
          a.planets.set(w.id, bakePlanet(w.hue, Math.round(w.radius * W * 3.6)))
        }
      }
      sync()
    }
    resize()
    window.addEventListener('resize', resize)

    const click = (e: PointerEvent) => {
      const s = ref.current
      if (!s || s.phase !== 'playing') return
      const r = canvas.getBoundingClientRect()
      const mx = (e.clientX - r.left) / r.width
      const my = (e.clientY - r.top) / r.height
      let hit: number | null = null
      for (const w of s.worlds) {
        if (Math.hypot(w.x - mx, (w.y - my) * (H / W)) < w.radius * 1.9) { hit = w.id; break }
      }
      if (hit === null) { s.selected = null; sync(); return }
      if (s.selected !== null && s.selected !== hit) {
        const total = SHIP_ORDER.reduce((n, k) => n + s.sending[k], 0)
        if (total > 0) {
          send(s, s.selected, hit, s.sending, 'player')
          s.sending = empty()
          s.selected = null
          sync()
          return
        }
      }
      const w = s.worlds.find(x => x.id === hit)!
      s.selected = w.owner === 'player' ? hit : hit
      sync()
    }
    canvas.addEventListener('pointerdown', click)

    let raf = 0, last = performance.now()
    const frame = (now: number) => {
      const s = ref.current
      if (!s || !art.current) { raf = requestAnimationFrame(frame); return }
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      step(s, dt)
      draw(ctx, s, W, H, art.current, now)
      bloomRef.current?.present(scene, now)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      bloomRef.current?.dispose()
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('pointerdown', click)
    }
  }, [sync])

  useEffect(() => {
    const s = ref.current
    if (s) { try { window.localStorage?.setItem('dsf.best', String(s.best)) } catch { /* private */ } }
  }, [ui.phase])

  const s = ref.current
  const sel = s && s.selected !== null ? s.worlds.find(w => w.id === s.selected) : null

  const begin = () => { const st = ref.current; if (st) { startGame(st); sync() } }
  const next = () => { const st = ref.current; if (st) { endTurn(st); sync() } }
  const make = (k: ShipKind) => {
    const st = ref.current
    if (st && st.selected !== null) { build(st, k, st.selected); sync() }
  }
  const adjust = (k: ShipKind, d: number) => {
    const st = ref.current
    if (!st || st.selected === null) return
    const w = st.worlds.find(x => x.id === st.selected)!
    st.sending[k] = Math.max(0, Math.min(w.garrison[k], st.sending[k] + d))
    sync()
  }
  const restart = () => {
    const st = ref.current
    if (!st) return
    ref.current = newState(Math.floor(Math.random() * 9999), st.best)
    art.current!.planets.clear()
    window.dispatchEvent(new Event('resize'))
    sync()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#03040A', color: '#DCE6F5',
                  fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 8, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>
            DEEP SPACE<span style={{ color: '#6EC6FF' }}> FLEET</span>
          </h1>
          <span style={{ color: 'rgba(220,230,245,0.55)', fontSize: 13 }}>
            It saves toward a plan instead of spending every credit it has.
          </span>
        </header>

        <div style={{ display: 'flex', gap: 18, fontSize: 13, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Stat label="TURN" value={String(ui.turn)} />
          <Stat label="CREDITS" value={String(ui.credits)} tone="#F5C542" />
          <Stat label="YOURS" value={String(ui.mine)} tone="#6EC6FF" />
          <Stat label="THEIRS" value={String(ui.theirs)} tone="#FF6B6B" />
          <Stat label="BEST" value={ui.best ? `${ui.best} turns` : '—'} />
          {ui.phase === 'playing' && (
            <button onClick={next} style={{ background: '#FF0800', color: '#fff', border: 'none',
              borderRadius: 8, padding: '8px 20px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
              End turn
            </button>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <canvas ref={canvasRef} style={{ display: 'block', borderRadius: 12,
            border: '1px solid rgba(110,198,255,0.16)', background: '#03040A',
            cursor: 'pointer', touchAction: 'none' }} />

          {ui.phase === 'briefing' && (
            <Overlay>
              <h2 style={{ fontSize: 26, margin: '0 0 6px' }}>Deep Space Fleet</h2>
              <p style={{ color: 'rgba(220,230,245,0.68)', maxWidth: 480, margin: '0 0 4px' }}>
                Click a world you own to build and select. Choose ships, then click a
                destination to launch.
              </p>
              <p style={{ color: 'rgba(220,230,245,0.45)', maxWidth: 480, margin: '0 0 18px', fontSize: 13 }}>
                Production compounds, so early expansion decides the game. Neutral worlds
                fortify slowly while you leave them alone. The opponent projects how defended
                a world will be by the time its fleet arrives — not how defended it is now.
              </p>
              <Button onClick={begin}>Launch</Button>
            </Overlay>
          )}

          {(ui.phase === 'won' || ui.phase === 'lost') && (
            <Overlay>
              <h2 style={{ fontSize: 26, margin: '0 0 4px' }}>
                {ui.phase === 'won' ? 'Sector secured' : 'Fleet lost'}
              </h2>
              <p style={{ color: 'rgba(220,230,245,0.7)', margin: '0 0 18px' }}>{ui.msg}</p>
              <Button onClick={restart}>New sector</Button>
            </Overlay>
          )}
        </div>

        {sel && ui.phase === 'playing' && (
          <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10,
                        background: 'rgba(110,198,255,0.06)', border: '1px solid rgba(110,198,255,0.2)' }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>
              {sel.name}
              <span style={{ color: 'rgba(220,230,245,0.5)', fontWeight: 500, fontSize: 12.5 }}>
                {' '}· {sel.owner === 'player' ? 'yours' : sel.owner === 'foe' ? 'hostile' : 'unclaimed'}
                {' '}· production {sel.production}
                {sel.owner === 'neutral' ? ` · defence ${Math.round(sel.defence)}` : ''}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 8 }}>
              {SHIP_ORDER.map(k => {
                const d = SHIPS[k]
                return (
                  <div key={k} style={{ padding: '7px 9px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 12.5 }}>
                      <span>{d.name}</span>
                      <span style={{ color: 'rgba(220,230,245,0.6)' }}>
                        here: {sel.garrison[k]}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(220,230,245,0.55)', margin: '2px 0 5px' }}>
                      {d.blurb}
                    </div>
                    {sel.owner === 'player' && (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button onClick={() => make(k)} disabled={ui.credits < d.cost}
                          style={miniBtn(ui.credits >= d.cost)}>Build {d.cost}c</button>
                        <button onClick={() => adjust(k, -1)} style={miniBtn(true)}>−</button>
                        <span style={{ minWidth: 18, textAlign: 'center', fontSize: 12.5 }}>{ui.sending[k]}</span>
                        <button onClick={() => adjust(k, 1)} style={miniBtn(true)}>+</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {sel.owner === 'player' && SHIP_ORDER.some(k => ui.sending[k] > 0) && (
              <div style={{ marginTop: 7, fontSize: 12.5, color: '#6EC6FF' }}>
                Force selected — power {fleetPower(ui.sending)}. Now click a destination world.
              </div>
            )}
          </div>
        )}

        {ui.log.length > 0 && (
          <div style={{ marginTop: 9, fontSize: 12, color: 'rgba(220,230,245,0.5)' }}>
            {ui.log.map((l, i) => <div key={i} style={{ opacity: 1 - i * 0.14 }}>{l}</div>)}
          </div>
        )}

        <p style={{ color: 'rgba(220,230,245,0.3)', fontSize: 12, marginTop: 10 }}>
          Ships and planets are procedurally baked sprites — hull plating, panel lines, turrets,
          engine bells, lit limbs — drawn once at load and blitted per frame ·
          CR AudioViz AI · EIN 39-3646201
        </p>
      </div>
    </div>
  )
}

const miniBtn = (on: boolean): React.CSSProperties => ({
  background: on ? 'rgba(110,198,255,0.16)' : 'rgba(255,255,255,0.04)',
  border: `1px solid ${on ? 'rgba(110,198,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
  color: on ? '#DCE6F5' : 'rgba(220,230,245,0.4)',
  borderRadius: 6, padding: '3px 8px', fontSize: 11.5, cursor: on ? 'pointer' : 'default',
})

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: 1.2, color: 'rgba(220,230,245,0.4)' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: tone ?? '#DCE6F5' }}>{value}</div>
    </div>
  )
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                  background: 'rgba(3,4,10,0.88)', borderRadius: 12, padding: 20 }}>
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

interface Art {
  ships: Record<'player' | 'foe', Record<ShipKind, Sprite>>
  station: Record<'player' | 'foe' | 'neutral', Sprite>
  planets: Map<number, HTMLCanvasElement>
}

function draw(ctx: CanvasRenderingContext2D, s: State, W: number, H: number,
              art: Art, now: number) {
  ctx.fillStyle = '#03040A'
  ctx.fillRect(0, 0, W, H)

  // Deterministic starfield with three depths, so it reads as space not noise.
  for (let layer = 0; layer < 3; layer++) {
    const n = 60 - layer * 14
    const a = 0.5 - layer * 0.14
    const sz = 1.6 - layer * 0.4
    ctx.fillStyle = `rgba(255,255,255,${a})`
    for (let i = 0; i < n; i++) {
      const x = ((i * (7919 + layer * 131)) % 1000) / 1000 * W
      const y = ((i * (104729 + layer * 313)) % 1000) / 1000 * H
      ctx.fillRect(x, y, sz, sz)
    }
  }

  const PX = (w: { x: number }) => w.x * W
  const PY = (w: { y: number }) => w.y * H

  // Supply lines between owned worlds, faint.
  ctx.strokeStyle = 'rgba(110,198,255,0.07)'
  ctx.lineWidth = 1
  for (const a of s.worlds) {
    for (const b of s.worlds) {
      if (a.id >= b.id || a.owner === 'neutral' || a.owner !== b.owner) continue
      if (dist(a, b) > 0.34) continue
      ctx.beginPath(); ctx.moveTo(PX(a), PY(a)); ctx.lineTo(PX(b), PY(b)); ctx.stroke()
    }
  }

  // Worlds: baked planet art, then a station ring for owned ones.
  for (const w of s.worlds) {
    const art2 = art.planets.get(w.id)
    const x = PX(w), y = PY(w)
    if (art2) ctx.drawImage(art2, x - art2.width / 2, y - art2.height / 2)
    if (w.owner !== 'neutral') {
      const sp = art.station[w.owner]
      const spin = now / 6000
      drawSprite(ctx, sp, x, y, spin, (w.radius * W * 3.0) / sp.size)
    }
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.font = '600 11px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(w.name, x, y + w.radius * W * 1.9 + 12)
    ctx.fillStyle = w.owner === 'player' ? 'rgba(110,198,255,0.9)'
                  : w.owner === 'foe' ? 'rgba(255,107,107,0.9)' : 'rgba(200,210,225,0.5)'
    const g = w.garrison
    const total = g.fighter + g.cruiser + g.carrier
    const label = w.owner === 'neutral' ? `def ${Math.round(w.defence)}` : `${total} ships`
    ctx.fillText(label, x, y + w.radius * W * 1.9 + 24)
    ctx.globalCompositeOperation = 'source-over'
  }

  // Fleets in transit, drawn as their actual ships with engine trails.
  for (const f of s.fleets) {
    const a = s.worlds.find(w => w.id === f.from)!
    const b = s.worlds.find(w => w.id === f.to)!
    const x = PX(a) + (PX(b) - PX(a)) * f.progress
    const y = PY(a) + (PY(b) - PY(a)) * f.progress
    const ang = Math.atan2(PY(b) - PY(a), PX(b) - PX(a))
    const side = f.owner === 'player' ? 'player' : 'foe'

    ctx.globalCompositeOperation = 'lighter'
    // course line
    ctx.strokeStyle = f.owner === 'player' ? 'rgba(110,198,255,0.22)' : 'rgba(255,107,107,0.22)'
    ctx.lineWidth = 1.2
    ctx.setLineDash([5, 7])
    ctx.beginPath(); ctx.moveTo(PX(a), PY(a)); ctx.lineTo(PX(b), PY(b)); ctx.stroke()
    ctx.setLineDash([])

    // Arrange the ships in a small formation rather than one blob.
    let slot = 0
    for (const k of SHIP_ORDER) {
      for (let i = 0; i < Math.min(f.ships[k], 5); i++) {
        const off = (slot % 3 - 1) * 12
        const back = Math.floor(slot / 3) * 13
        const ox = x - Math.cos(ang) * back - Math.sin(ang) * off
        const oy = y - Math.sin(ang) * back + Math.cos(ang) * off
        // engine trail
        const tg = ctx.createLinearGradient(
          ox - Math.cos(ang) * 26, oy - Math.sin(ang) * 26, ox, oy)
        tg.addColorStop(0, 'rgba(110,198,255,0)')
        tg.addColorStop(1, f.owner === 'player' ? 'rgba(110,220,255,0.45)' : 'rgba(255,150,120,0.45)')
        ctx.strokeStyle = tg
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(ox - Math.cos(ang) * 26, oy - Math.sin(ang) * 26)
        ctx.lineTo(ox, oy)
        ctx.stroke()
        ctx.globalCompositeOperation = 'source-over'
        drawSprite(ctx, art.ships[side][k], ox, oy, ang, k === 'fighter' ? 0.8 : 1)
        ctx.globalCompositeOperation = 'lighter'
        slot += 1
      }
    }
    ctx.globalCompositeOperation = 'source-over'
  }

  // Battle flashes
  ctx.globalCompositeOperation = 'lighter'
  for (const fl of s.flashes) {
    const x = fl.x * W, y = fl.y * H
    ctx.strokeStyle = `hsla(${fl.hue},100%,70%,${(1 - fl.t) * 0.85})`
    ctx.lineWidth = 3 * (1 - fl.t)
    ctx.beginPath(); ctx.arc(x, y, 20 + fl.t * 60, 0, Math.PI * 2); ctx.stroke()
  }
  ctx.globalCompositeOperation = 'source-over'

  if (s.selected !== null) {
    const w = s.worlds.find(x => x.id === s.selected)
    if (w) {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 4])
      ctx.beginPath(); ctx.arc(PX(w), PY(w), w.radius * W * 2.1, 0, Math.PI * 2); ctx.stroke()
      ctx.setLineDash([])
    }
  }
}
