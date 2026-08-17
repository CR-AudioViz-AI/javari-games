'use client'
// app/play/siege-master/page.tsx — Siege Master
//
// Game nine of twenty-five. Thirty waves, five towers, four upgrade levels
// each, and a path that recomputes every time you build.
//
// The flow field is drawn faintly as arrows. Most tower defence games hide the
// route, so a player mazes by trial and error; showing it turns maze building
// into a readable craft — you can see the corner you just created before the
// wave arrives.
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026
import { useCallback, useEffect, useRef, useState } from 'react'
import { BloomRenderer, makeBloom } from '@/lib/gfx/bloom'
import {
  CREEPS, State, TOWERS, TOWER_ORDER, TowerKind, WAVES, key, newState,
  placeTower, sellTower, startWave, step, towerStats, upgradeTower,
} from './engine'

export default function SiegeMaster() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const sceneRef = useRef<HTMLCanvasElement | null>(null)
  const bloomRef = useRef<BloomRenderer | null>(null)
  const ref = useRef<State | null>(null)
  const cell = useRef(44)
  const hover = useRef<{ x: number; y: number } | null>(null)
  const [ui, setUi] = useState({ phase: 'building', wave: 0, gold: 340, lives: 20,
                                 tool: 'arrow' as State['tool'], sel: '', best: 0,
                                 msg: '', creeps: 0, err: '' })

  const sync = useCallback((err = '') => {
    const s = ref.current
    if (!s) return
    setUi({ phase: s.phase, wave: s.wave, gold: Math.floor(s.gold), lives: s.lives,
            tool: s.tool, sel: s.selected ?? '', best: s.best, msg: s.message,
            creeps: s.creeps.length, err })
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!sceneRef.current) sceneRef.current = document.createElement('canvas')
    const scene = sceneRef.current
    const ctx = scene.getContext('2d', { alpha: false })
    if (!ctx) return
    bloomRef.current = makeBloom(canvas, { intensity: 1.05, threshold: 0.58, aberration: 0.007, vignette: 0.40 })

    let W = 900, H = 585, DPR = 1
    const resize = () => {
      const r = canvas.parentElement?.getBoundingClientRect()
      W = Math.min(1100, r ? r.width - 8 : 900)
      if (!ref.current) {
        const best = Number(window.localStorage?.getItem('siege.best') ?? 0)
        ref.current = newState(best)
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
      return { x: Math.floor((e.clientX - r.left) / cell.current),
               y: Math.floor((e.clientY - r.top) / cell.current) }
    }
    const move = (e: PointerEvent) => { hover.current = at(e) }
    const click = (e: PointerEvent) => {
      const s = ref.current
      if (!s) return
      const p = at(e)
      const k = key(p.x, p.y)
      if (s.tool === 'sell') { sellTower(s, p.x, p.y); sync(); return }
      if (s.tool === 'upgrade') {
        const ok = upgradeTower(s, p.x, p.y)
        sync(ok ? '' : 'cannot upgrade that')
        return
      }
      if (s.towers.has(k)) { s.selected = k; sync(); return }
      const err = placeTower(s, p.x, p.y, s.tool as TowerKind)
      sync(err ?? '')
    }
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerdown', click)

    const kd = (e: KeyboardEvent) => {
      const s = ref.current
      if (!s) return
      const k = e.key.toLowerCase()
      const n = parseInt(k, 10)
      if (n >= 1 && n <= TOWER_ORDER.length) { s.tool = TOWER_ORDER[n - 1]; sync() }
      if (k === 'u') { s.tool = 'upgrade'; sync() }
      if (k === 'x') { s.tool = 'sell'; sync() }
      if (k === ' ') { e.preventDefault(); startWave(s); sync() }
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
      else if (s.phase === 'wave' && Math.random() < 0.2) sync()
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      bloomRef.current?.dispose()
      window.removeEventListener('resize', resize)
      window.removeEventListener('keydown', kd)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerdown', click)
    }
  }, [sync])

  useEffect(() => {
    const s = ref.current
    if (s) { try { window.localStorage?.setItem('siege.best', String(s.best)) } catch { /* private */ } }
  }, [ui.phase, ui.best])

  const setTool = (t: State['tool']) => { const s = ref.current; if (s) { s.tool = t; sync() } }
  const go = () => { const s = ref.current; if (s) { startWave(s); sync() } }
  const restart = () => {
    const s = ref.current
    if (!s) return
    ref.current = newState(s.best)
    window.dispatchEvent(new Event('resize'))
    sync()
  }

  const s = ref.current
  const sel = s && s.selected ? s.towers.get(s.selected) : null

  return (
    <div style={{ minHeight: '100vh', background: '#060810', color: '#E4ECF5',
                  fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 8, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>
            SIEGE<span style={{ color: '#7BE495' }}>MASTER</span>
          </h1>
          <span style={{ color: 'rgba(228,236,245,0.55)', fontSize: 13 }}>
            Towers block the path. Build a maze — you can never seal it.
          </span>
        </header>

        <div style={{ display: 'flex', gap: 18, fontSize: 13, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Stat label="WAVE" value={`${ui.wave} / ${WAVES}`} />
          <Stat label="GOLD" value={String(ui.gold)} tone="#F5C542" />
          <Stat label="LIVES" value={String(ui.lives)} tone={ui.lives > 6 ? '#7BE495' : '#FF6B6B'} />
          <Stat label="ON FIELD" value={String(ui.creeps)} />
          <Stat label="BEST WAVE" value={String(ui.best)} />
          {ui.phase === 'building' && (
            <button onClick={go} style={{ background: '#FF0800', color: '#fff', border: 'none',
              borderRadius: 8, padding: '8px 20px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
              Send wave {ui.wave + 1} (space)
            </button>
          )}
          {ui.err && <span style={{ color: '#FF8C4F', fontSize: 12.5 }}>{ui.err}</span>}
        </div>

        <div style={{ position: 'relative' }}>
          <canvas ref={canvasRef} style={{ display: 'block', borderRadius: 10,
            border: '1px solid rgba(123,228,149,0.16)', background: '#060810',
            cursor: 'crosshair', touchAction: 'none' }} />

          {(ui.phase === 'won' || ui.phase === 'lost') && (
            <Overlay>
              <h2 style={{ fontSize: 26, margin: '0 0 4px' }}>
                {ui.phase === 'won' ? 'The line held' : 'Overrun'}
              </h2>
              <p style={{ color: 'rgba(228,236,245,0.7)', margin: '0 0 18px' }}>{ui.msg}</p>
              <Button onClick={restart}>Again</Button>
            </Overlay>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
                      gap: 7, marginTop: 10 }}>
          {TOWER_ORDER.map((t, i) => {
            const d = TOWERS[t]
            const active = ui.tool === t
            const afford = ui.gold >= d.cost
            return (
              <button key={t} onClick={() => setTool(t)}
                style={{ textAlign: 'left', padding: '8px 10px', borderRadius: 9,
                  background: active ? `hsla(${d.hue},70%,24%,0.6)` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? `hsla(${d.hue},85%,60%,0.7)` : 'rgba(255,255,255,0.08)'}`,
                  color: '#E4ECF5', cursor: 'pointer', opacity: afford ? 1 : 0.55 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 13 }}>
                  <span>{i + 1}. {d.name}</span>
                  <span style={{ color: '#F5C542' }}>{d.cost}</span>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(228,236,245,0.6)', marginTop: 2 }}>{d.blurb}</div>
              </button>
            )
          })}
          <button onClick={() => setTool('upgrade')}
            style={{ textAlign: 'left', padding: '8px 10px', borderRadius: 9,
              background: ui.tool === 'upgrade' ? 'rgba(245,197,66,0.22)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${ui.tool === 'upgrade' ? 'rgba(245,197,66,0.6)' : 'rgba(255,255,255,0.08)'}`,
              color: '#E4ECF5', cursor: 'pointer' }}>
            <div style={{ fontWeight: 800, fontSize: 13 }}>U. Upgrade</div>
            <div style={{ fontSize: 11, color: 'rgba(228,236,245,0.6)' }}>Four levels. More damage and range.</div>
          </button>
          <button onClick={() => setTool('sell')}
            style={{ textAlign: 'left', padding: '8px 10px', borderRadius: 9,
              background: ui.tool === 'sell' ? 'rgba(255,107,107,0.2)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${ui.tool === 'sell' ? 'rgba(255,107,107,0.55)' : 'rgba(255,255,255,0.08)'}`,
              color: '#E4ECF5', cursor: 'pointer' }}>
            <div style={{ fontWeight: 800, fontSize: 13 }}>X. Sell</div>
            <div style={{ fontSize: 11, color: 'rgba(228,236,245,0.6)' }}>60% refund. Reshape the maze freely.</div>
          </button>
        </div>

        {sel && (
          <div style={{ marginTop: 9, fontSize: 12.5, color: 'rgba(228,236,245,0.7)' }}>
            {TOWERS[sel.kind].name} · level {sel.level}/4 ·{' '}
            {towerStats(sel).dps.toFixed(0)} dps · range {towerStats(sel).range.toFixed(1)}
          </div>
        )}

        <p style={{ color: 'rgba(228,236,245,0.45)', fontSize: 12.5, marginTop: 8 }}>
          {ui.msg} Purple creeps fly and ignore the maze entirely. Armoured ones reduce every hit
          by a flat amount, so many small shots do less than a few large ones.
        </p>
        <p style={{ color: 'rgba(228,236,245,0.3)', fontSize: 12, marginTop: 4 }}>
          Dijkstra flow field recomputed on every placement · a placement that would seal the route
          is refused · CR AudioViz AI · EIN 39-3646201
        </p>
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: 1.2, color: 'rgba(228,236,245,0.4)' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: tone ?? '#E4ECF5' }}>{value}</div>
    </div>
  )
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                  background: 'rgba(6,8,16,0.88)', borderRadius: 10, padding: 20 }}>
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
  ctx.fillStyle = '#060810'
  ctx.fillRect(0, 0, W, H)

  ctx.strokeStyle = 'rgba(123,228,149,0.05)'
  ctx.lineWidth = 1
  for (let x = 0; x <= s.w; x++) { ctx.beginPath(); ctx.moveTo(x * C, 0); ctx.lineTo(x * C, H); ctx.stroke() }
  for (let y = 0; y <= s.h; y++) { ctx.beginPath(); ctx.moveTo(0, y * C); ctx.lineTo(W, y * C); ctx.stroke() }

  // The flow field, drawn faintly. Most tower defence hides the route and makes
  // mazing trial and error; showing it makes it a craft.
  const DXA = [1, 0, -1, 0], DYA = [0, 1, 0, -1]
  ctx.strokeStyle = 'rgba(123,228,149,0.18)'
  ctx.lineWidth = 1.4
  for (let y = 0; y < s.h; y++) {
    for (let x = 0; x < s.w; x++) {
      const d = s.flow[y * s.w + x]
      if (d < 0) continue
      const cx = x * C + C / 2, cy = y * C + C / 2
      const a = Math.atan2(DYA[d], DXA[d])
      ctx.beginPath()
      ctx.moveTo(cx - Math.cos(a) * C * 0.16, cy - Math.sin(a) * C * 0.16)
      ctx.lineTo(cx + Math.cos(a) * C * 0.16, cy + Math.sin(a) * C * 0.16)
      ctx.stroke()
    }
  }

  // Spawn and goal
  ctx.fillStyle = 'rgba(245,197,66,0.22)'
  ctx.fillRect(s.spawn.x * C, s.spawn.y * C, C, C)
  ctx.fillStyle = 'rgba(255,107,107,0.22)'
  ctx.fillRect(s.goal.x * C, s.goal.y * C, C, C)

  ctx.globalCompositeOperation = 'lighter'

  // Towers
  for (const t of s.towers.values()) {
    const d = TOWERS[t.kind]
    const st = towerStats(t)
    const cx = t.x * C + C / 2, cy = t.y * C + C / 2
    if (s.selected === key(t.x, t.y) || (hover && hover.x === t.x && hover.y === t.y)) {
      ctx.strokeStyle = `hsla(${d.hue},90%,62%,0.30)`
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(cx, cy, st.range * C, 0, Math.PI * 2); ctx.stroke()
    }
    ctx.fillStyle = `hsla(${d.hue},60%,${16 + t.level * 4}%,0.95)`
    ctx.strokeStyle = `hsla(${d.hue},90%,${52 + t.firing * 26}%,0.95)`
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.roundRect(t.x * C + 4, t.y * C + 4, C - 8, C - 8, 5)
    ctx.fill(); ctx.stroke()
    // Barrel points at the target.
    ctx.strokeStyle = `hsla(${d.hue},100%,74%,0.95)`
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(t.angle) * C * 0.34, cy + Math.sin(t.angle) * C * 0.34)
    ctx.stroke()
    // Level pips
    for (let i = 0; i < t.level; i++) {
      ctx.fillStyle = 'hsla(45,100%,66%,0.9)'
      ctx.beginPath(); ctx.arc(t.x * C + 8 + i * 6, t.y * C + C - 8, 2, 0, Math.PI * 2); ctx.fill()
    }
  }

  for (const b of s.bolts) {
    ctx.strokeStyle = `hsla(${b.hue},100%,72%,${(1 - b.t) * 0.9})`
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.moveTo(b.x1 * C, b.y1 * C)
    ctx.lineTo(b.x2 * C, b.y2 * C)
    ctx.stroke()
  }

  for (const c of s.creeps) {
    const d = CREEPS[c.kind]
    const r = c.kind === 'titan' ? C * 0.34 : c.kind === 'swarm' ? C * 0.13 : C * 0.2
    ctx.fillStyle = c.hitFlash > 0
      ? `hsla(0,0%,100%,${0.5 + c.hitFlash * 0.4})`
      : `hsla(${d.hue},85%,${c.slow > 0 ? 40 : 55}%,0.95)`
    ctx.beginPath(); ctx.arc(c.x * C, c.y * C, r, 0, Math.PI * 2); ctx.fill()
    if (d.flies) {
      ctx.strokeStyle = `hsla(${d.hue},100%,72%,0.6)`
      ctx.lineWidth = 1.4
      ctx.beginPath(); ctx.arc(c.x * C, c.y * C, r + 4, 0, Math.PI * 2); ctx.stroke()
    }
    if (c.hp < c.maxHp) {
      const f = c.hp / c.maxHp
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.fillRect(c.x * C - r, c.y * C - r - 6, r * 2, 3)
      ctx.fillStyle = f > 0.5 ? 'hsla(140,90%,58%,0.95)' : 'hsla(20,95%,58%,0.95)'
      ctx.fillRect(c.x * C - r, c.y * C - r - 6, r * 2 * f, 3)
    }
  }

  for (const p of s.particles) {
    ctx.fillStyle = `hsla(${p.hue},95%,64%,${Math.min(1, p.life * 2.5)})`
    ctx.beginPath(); ctx.arc(p.x * C, p.y * C, p.size, 0, Math.PI * 2); ctx.fill()
  }

  ctx.globalCompositeOperation = 'source-over'

  if (hover && hover.x >= 0 && hover.y >= 0 && hover.x < s.w && hover.y < s.h) {
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'
    ctx.lineWidth = 1.6
    ctx.strokeRect(hover.x * C + 2, hover.y * C + 2, C - 4, C - 4)
  }
}
