'use client'
// app/play/ionstorm-3d/page.tsx — Ionstorm, rebuilt in real 3D
//
// The 2D version proved the game loop. This proves the renderer: WebGL2 meshes
// with PBR materials, shadow-mapped three-point lighting, ACES tone mapping and
// a GPU particle field.
//
// The engine is UNCHANGED — the same engine.ts drives it. That separation is
// the point of the architecture: simulation does not know or care whether it is
// being drawn as circles or as lit geometry.
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026
import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { ParticleField, Stage, glowMaterial, makeGlowTexture, metalMaterial } from '@/lib/g3d/stage'
import { State, UPGRADES, buy, costOf, newState, startWave, step } from '../ionstorm/engine'

const STEP = 1 / 60
/** World units per pixel of the simulation, so 3D and 2D agree on scale. */
const SCALE = 0.055

export default function Ionstorm3D() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ref = useRef<State | null>(null)
  const keys = useRef<Record<string, boolean>>({})
  const mouse = useRef({ x: 0, y: 0, down: false })
  const [ui, setUi] = useState({ phase: 'ready', wave: 0, score: 0, cores: 0,
                                 shield: 3, best: 0 })

  const sync = useCallback(() => {
    const s = ref.current
    if (!s) return
    setUi({ phase: s.phase, wave: s.wave, score: s.score, cores: s.cores,
            shield: s.shield, best: s.best })
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const stage = new Stage(canvas, {
      fov: 44, exposure: 1.15,
      fog: { colour: 0x03060f, near: 30, far: 120 },
    })
    if (!stage.ok) return

    // ── Static scene ────────────────────────────────────────────────────────
    // A dark reflective deck so ships cast real contact shadows onto something.
    const deck = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x0a1020, roughness: 0.42, metalness: 0.65 }),
    )
    deck.rotation.x = -Math.PI / 2
    deck.receiveShadow = true
    stage.scene.add(deck)

    // Grid lines as thin emissive strips rather than a flat texture, so they
    // pick up the tone mapping and glow at grazing angles.
    const gridMat = new THREE.MeshBasicMaterial({ color: 0x1d4a6b, transparent: true, opacity: 0.5 })
    for (let i = -12; i <= 12; i++) {
      for (const axis of [0, 1]) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(axis ? 0.06 : 100, 0.02, axis ? 100 : 0.06), gridMat)
        bar.position.set(axis ? i * 4 : 0, 0.011, axis ? 0 : i * 4)
        stage.scene.add(bar)
      }
    }

    const glowTex = makeGlowTexture()
    const particles = new ParticleField(2400, glowTex, 0.85)
    stage.scene.add(particles.points)

    // ── Player ship: a real multi-part mesh ─────────────────────────────────
    const ship = new THREE.Group()
    const hullMat = metalMaterial(0x9fd8ff, 0.28, 0.88)
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.1, 6), hullMat)
    body.rotation.x = Math.PI / 2
    body.castShadow = true
    ship.add(body)
    for (const sx of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.12, 0.62), metalMaterial(0x5d90bb, 0.4, 0.8))
      wing.position.set(sx * 0.72, 0, -0.28)
      wing.rotation.z = sx * 0.22
      wing.castShadow = true
      ship.add(wing)
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.5, 8), glowMaterial(0x35d6ff, 3.2))
      pod.rotation.x = Math.PI / 2
      pod.position.set(sx * 0.72, 0, -0.72)
      ship.add(pod)
    }
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshPhysicalMaterial({ color: 0x0a2a3a, roughness: 0.06, metalness: 0.1,
        transmission: 0.7, thickness: 0.4, transparent: true, opacity: 0.85 }))
    canopy.position.set(0, 0.24, 0.28)
    ship.add(canopy)
    ship.position.y = 0.7
    stage.scene.add(ship)

    // Engine flare that reacts to thrust.
    const flare = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0x4fe0ff, blending: THREE.AdditiveBlending,
      depthWrite: false, transparent: true }))
    flare.scale.set(1.6, 1.6, 1)
    ship.add(flare)

    // ── Pooled enemy and projectile meshes ──────────────────────────────────
    // Creating a mesh per enemy per frame is the classic three.js mistake; the
    // allocation churn alone drops frames. Pool and reuse.
    const enemyGeo: Record<string, THREE.BufferGeometry> = {
      seeker: new THREE.IcosahedronGeometry(0.62, 0),
      darter: new THREE.ConeGeometry(0.34, 1.1, 4),
      splitter: new THREE.OctahedronGeometry(0.85, 0),
      turret: new THREE.CylinderGeometry(0.5, 0.7, 0.7, 6),
      warden: new THREE.DodecahedronGeometry(1.5, 0),
      bolt: new THREE.SphereGeometry(0.24, 8, 6),
    }
    const enemyMat: Record<string, THREE.Material> = {
      seeker: metalMaterial(0xff5a6e, 0.35, 0.7),
      darter: glowMaterial(0xffc24a, 1.6),
      splitter: metalMaterial(0xb46bff, 0.3, 0.85),
      turret: metalMaterial(0x4fe0a0, 0.4, 0.8),
      warden: metalMaterial(0xff7a3c, 0.25, 0.95),
      bolt: glowMaterial(0x6effc0, 2.6),
    }
    const pool: THREE.Mesh[] = []
    const shotPool: THREE.Mesh[] = []
    const shotGeo = new THREE.CapsuleGeometry(0.09, 0.5, 4, 6)
    const shotMat = glowMaterial(0x9be9ff, 3.4)
    const critMat = glowMaterial(0xffd24a, 4.0)
    const coreGeo = new THREE.OctahedronGeometry(0.28, 0)
    const coreMat = glowMaterial(0xffd24a, 2.8)
    const corePool: THREE.Mesh[] = []
    const dronePool: THREE.Mesh[] = []
    const droneGeo = new THREE.TetrahedronGeometry(0.3, 0)
    const droneMat = glowMaterial(0x4fffc4, 2.4)

    const take = (arr: THREE.Mesh[], geo: THREE.BufferGeometry, mat: THREE.Material, i: number) => {
      if (!arr[i]) {
        const m = new THREE.Mesh(geo, mat)
        m.castShadow = true
        stage.scene.add(m)
        arr[i] = m
      }
      arr[i].visible = true
      return arr[i]
    }

    let W = 900, H = 560
    const resize = () => {
      const r = canvas.parentElement?.getBoundingClientRect()
      W = Math.min(1100, r ? r.width - 8 : 900)
      H = Math.round(W * 0.60)
      canvas.style.width = `${W}px`
      canvas.style.height = `${H}px`
      stage.resize(W, H)
      if (!ref.current) {
        const best = Number(window.localStorage?.getItem('ionstorm.best') ?? 0)
        ref.current = newState(W, H, best)
      } else { ref.current.w = W; ref.current.h = H }
    }
    resize()
    window.addEventListener('resize', resize)

    const kd = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) e.preventDefault()
    }
    const ku = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    const pm = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      mouse.current.x = e.clientX - r.left
      mouse.current.y = e.clientY - r.top
    }
    const pd = (e: PointerEvent) => { pm(e); mouse.current.down = true }
    const pu = () => { mouse.current.down = false }
    canvas.addEventListener('pointermove', pm)
    canvas.addEventListener('pointerdown', pd)
    window.addEventListener('pointerup', pu)

    // Simulation x,y (pixels, y down) to world x,z (units, z away).
    const wx = (px: number, s: State) => (px - s.w / 2) * SCALE
    const wz = (py: number, s: State) => (py - s.h / 2) * SCALE

    let raf = 0, last = performance.now(), acc = 0
    const frame = (now: number) => {
      const s = ref.current
      if (!s) { raf = requestAnimationFrame(frame); return }
      const dt = Math.min(0.25, (now - last) / 1000)
      last = now
      acc += dt

      while (acc >= STEP) {
        const k = keys.current
        const mv = { x: 0, y: 0 }
        if (k['a'] || k['arrowleft']) mv.x -= 1
        if (k['d'] || k['arrowright']) mv.x += 1
        if (k['w'] || k['arrowup']) mv.y -= 1
        if (k['s'] || k['arrowdown']) mv.y += 1
        const m = Math.hypot(mv.x, mv.y)
        if (m > 0) { mv.x /= m; mv.y /= m }
        step(s, STEP, { move: mv, aim: { x: mouse.current.x, y: mouse.current.y },
                        firing: mouse.current.down || !!k[' '] })
        acc -= STEP
      }

      // ── Sync meshes to simulation ────────────────────────────────────────
      ship.position.set(wx(s.player.pos.x, s), 0.7, wz(s.player.pos.y, s))
      const aimA = Math.atan2(mouse.current.y - s.player.pos.y, mouse.current.x - s.player.pos.x)
      ship.rotation.y = -aimA + Math.PI / 2
      // Bank into the turn — small, but it is what makes a ship feel flown.
      ship.rotation.z = THREE.MathUtils.clamp(-s.player.vel.x * 0.0016, -0.4, 0.4)
      const thrust = Math.min(1, Math.hypot(s.player.vel.x, s.player.vel.y) / 420)
      flare.position.set(0, 0, -1.35)
      flare.scale.setScalar(1.1 + thrust * 1.5)
      ;(flare.material as THREE.SpriteMaterial).opacity = 0.35 + thrust * 0.6
      ship.visible = s.invuln <= 0 || Math.floor(s.invuln * 14) % 2 === 0

      let i = 0
      for (const e of s.enemies) {
        const geo = enemyGeo[e.kind] ?? enemyGeo.seeker
        const mat = enemyMat[e.kind] ?? enemyMat.seeker
        const m = take(pool, geo, mat, i++)
        m.geometry = geo
        m.material = mat
        m.position.set(wx(e.pos.x, s), 0.65, wz(e.pos.y, s))
        m.rotation.y = e.age * 0.9
        m.rotation.x = e.age * 0.5
        const hurt = e.hp / e.maxHp
        m.scale.setScalar(0.7 + hurt * 0.4)
      }
      for (; i < pool.length; i++) pool[i].visible = false

      i = 0
      for (const b of s.shots) {
        const m = take(shotPool, shotGeo, b.kind === 'crit' ? critMat : shotMat, i++)
        m.material = b.kind === 'crit' ? critMat : shotMat
        m.position.set(wx(b.pos.x, s), 0.7, wz(b.pos.y, s))
        m.rotation.z = Math.PI / 2
        m.rotation.y = -Math.atan2(b.vel.y, b.vel.x)
      }
      for (; i < shotPool.length; i++) shotPool[i].visible = false

      i = 0
      for (const c of s.drops) {
        const m = take(corePool, coreGeo, coreMat, i++)
        m.position.set(wx(c.pos.x, s), 0.5 + Math.sin(c.age * 6) * 0.12, wz(c.pos.y, s))
        m.rotation.y = c.age * 2.4
      }
      for (; i < corePool.length; i++) corePool[i].visible = false

      i = 0
      for (const d of s.drones) {
        const m = take(dronePool, droneGeo, droneMat, i++)
        m.position.set(wx(d.pos.x, s), 1.1, wz(d.pos.y, s))
        m.rotation.y = d.age * 3
      }
      for (; i < dronePool.length; i++) dronePool[i].visible = false

      // Feed the 2D particle events into the GPU field.
      for (const p of s.particles) {
        if (p.life > p.maxLife - 0.02) {
          const c = new THREE.Color().setHSL(p.hue / 360, 1, 0.62)
          particles.emit(
            wx(p.pos.x, s), 0.7, wz(p.pos.y, s),
            p.vel.x * SCALE, Math.random() * 2, p.vel.y * SCALE,
            c.r, c.g, c.b, p.life)
        }
      }
      particles.update(dt)

      // Camera: follows loosely with a shake, so hits are felt.
      const camTx = ship.position.x * 0.28
      const camTz = ship.position.z * 0.28 + 26
      stage.camera.position.x += (camTx - stage.camera.position.x) * Math.min(1, dt * 3)
      stage.camera.position.z += (camTz - stage.camera.position.z) * Math.min(1, dt * 3)
      stage.camera.position.y = 24
      if (s.shake > 0) {
        stage.camera.position.x += (Math.random() - 0.5) * s.shake * 1.1
        stage.camera.position.y += (Math.random() - 0.5) * s.shake * 1.1
      }
      stage.camera.lookAt(ship.position.x * 0.4, 0, ship.position.z * 0.4)

      stage.render()
      if (s.phase !== 'playing') sync()
      else if (Math.random() < 0.12) sync()
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
      window.removeEventListener('pointerup', pu)
      canvas.removeEventListener('pointermove', pm)
      canvas.removeEventListener('pointerdown', pd)
      stage.dispose()
    }
  }, [sync])

  const begin = () => {
    const s = ref.current
    if (!s) return
    if (s.phase === 'over') ref.current = newState(s.w, s.h, s.best)
    startWave(ref.current!)
    sync()
  }
  const purchase = (id: string) => { const s = ref.current; if (s) { buy(s, id); sync() } }
  const s = ref.current

  return (
    <div style={{ minHeight: '100vh', background: '#03060f', color: '#E8F1FA',
                  fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 8, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>
            ION<span style={{ color: '#4FD1FF' }}>STORM</span>
            <span style={{ fontSize: 13, color: '#7BE495', marginLeft: 8 }}>3D</span>
          </h1>
          <span style={{ color: 'rgba(232,241,250,0.55)', fontSize: 13 }}>
            WebGL2 · PBR materials · shadow-mapped lighting · ACES tone mapping
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
            border: '1px solid rgba(79,209,255,0.18)', cursor: 'crosshair' }} />

          {ui.phase === 'ready' && (
            <Overlay>
              <h2 style={{ fontSize: 30, margin: '0 0 6px' }}>Ionstorm 3D</h2>
              <p style={{ color: 'rgba(232,241,250,0.7)', maxWidth: 460, margin: '0 0 18px' }}>
                <b>WASD</b> to move, <b>mouse</b> to aim, <b>click</b> or <b>space</b> to fire.
              </p>
              <Button onClick={begin}>Launch</Button>
            </Overlay>
          )}

          {ui.phase === 'shop' && s && (
            <Overlay>
              <h2 style={{ fontSize: 24, margin: '0 0 2px' }}>Wave {ui.wave} cleared</h2>
              <p style={{ color: '#F5C542', margin: '0 0 14px' }}>{ui.cores} cores available</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
                            gap: 8, width: 'min(720px, 88vw)', marginBottom: 16 }}>
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
                        <span style={{ color: maxed ? '#7BE495' : '#F5C542' }}>{maxed ? 'MAX' : `${cost}◆`}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'rgba(232,241,250,0.6)' }}>{u.detail}</div>
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
              <p style={{ color: 'rgba(232,241,250,0.7)', margin: '0 0 18px' }}>
                Wave {ui.wave} · {ui.score.toLocaleString()} points
              </p>
              <Button onClick={begin}>Again</Button>
            </Overlay>
          )}
        </div>

        <p style={{ color: 'rgba(232,241,250,0.32)', fontSize: 12, marginTop: 10 }}>
          Same engine.ts as the 2D build — simulation does not know how it is drawn ·
          pooled meshes, GPU particle field, procedural environment map ·
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
      <div style={{ fontSize: 16, fontWeight: 800, color: tone ?? '#E8F1FA' }}>{value}</div>
    </div>
  )
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                  background: 'rgba(3,6,15,0.86)', borderRadius: 12, padding: 20 }}>
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
