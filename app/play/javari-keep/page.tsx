'use client'
// app/play/javari-keep/page.tsx — JAVARI KEEP
//
// The Clash of Clans / Age of Empires look, proven. Bright saturated palette,
// chunky rounded silhouettes, ink outlines, warm key with a cool rim, contact
// shadows, isometric camera.
//
// Deploy troops around a walled keep and break it before the timer. Towers
// shoot back. Every unit and building is built from the stylised kit — the
// point of this build is that it LOOKS like a game people want to play.
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026
import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import {
  PALETTE, chunk, contactShadow, inked, rocks, stylisedGround, stylisedLights,
  stylisedSky, toon, tree,
} from '@/lib/g3d/stylised'

type UnitKind = 'grunt' | 'archer' | 'ram' | 'mage'

interface UnitDef {
  kind: UnitKind; name: string; cost: number; hp: number; dmg: number
  range: number; speed: number; colour: number; blurb: string
}
const UNITS: Record<UnitKind, UnitDef> = {
  grunt:  { kind: 'grunt',  name: 'Grunt',  cost: 3, hp: 90,  dmg: 12, range: 1.1, speed: 2.2, colour: 0x3fa9f5,
            blurb: 'Cheap and sturdy. Send a wall of them.' },
  archer: { kind: 'archer', name: 'Archer', cost: 4, hp: 45,  dmg: 9,  range: 6.5, speed: 2.0, colour: 0x6fdc7a,
            blurb: 'Outranges the towers if you place her right.' },
  ram:    { kind: 'ram',    name: 'Ram',    cost: 7, hp: 260, dmg: 46, range: 1.4, speed: 1.4, colour: 0xc79a5b,
            blurb: 'Triple damage to walls and buildings.' },
  mage:   { kind: 'mage',   name: 'Mage',   cost: 9, hp: 60,  dmg: 26, range: 5.0, speed: 1.7, colour: 0xb07df5,
            blurb: 'Splash damage. Clears a cluster in seconds.' },
}
const ORDER: UnitKind[] = ['grunt', 'archer', 'ram', 'mage']

interface Ent {
  id: number; team: 'atk' | 'def'; kind: string
  x: number; z: number; hp: number; maxHp: number
  cd: number; g: THREE.Group; bar: THREE.Sprite
  target: number | null; isBuilding: boolean
  dmg: number; range: number; speed: number
}

export default function JavariKeep() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const world = useRef<{
    scene: THREE.Scene; camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer; ents: Ent[]; nextId: number
    elixir: number; time: number; phase: 'ready' | 'battle' | 'won' | 'lost'
    destroyed: number; totalBuildings: number; sel: UnitKind
  } | null>(null)
  const [ui, setUi] = useState({ phase: 'ready', elixir: 10, time: 180,
                                 pct: 0, sel: 'grunt' as UnitKind, msg: '' })

  const sync = useCallback(() => {
    const w = world.current
    if (!w) return
    setUi({ phase: w.phase, elixir: Math.floor(w.elixir), time: Math.max(0, Math.ceil(180 - w.time)),
            pct: w.totalBuildings ? Math.round((w.destroyed / w.totalBuildings) * 100) : 0,
            sel: w.sel, msg: w.phase === 'won' ? 'Keep destroyed.' : 'Time ran out.' })
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    } catch { return }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    // Slightly over 1 so the bright palette actually reads as bright.
    renderer.toneMappingExposure = 1.25
    renderer.outputColorSpace = THREE.SRGBColorSpace

    const scene = new THREE.Scene()
    stylisedSky(scene)
    stylisedLights(scene)
    scene.add(stylisedGround(70))

    // Isometric-ish camera. A low FOV flattens perspective, which is what makes
    // Clash read as a diorama rather than a first-person world.
    const camera = new THREE.PerspectiveCamera(28, 1, 0.5, 400)
    camera.position.set(26, 30, 30)
    camera.lookAt(0, 0, 0)

    const ents: Ent[] = []
    let nextId = 1

    /** A health bar sprite that sits above an entity. */
    const barTex = (() => {
      const c = document.createElement('canvas')
      c.width = 32; c.height = 4
      const g = c.getContext('2d')!
      g.fillStyle = '#fff'; g.fillRect(0, 0, 32, 4)
      return new THREE.CanvasTexture(c)
    })()
    const makeBar = () => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: barTex, color: 0x4ade5a, depthTest: false }))
      s.scale.set(1.2, 0.13, 1)
      return s
    }

    const add = (e: Omit<Ent, 'id' | 'bar'>): Ent => {
      const bar = makeBar()
      bar.position.y = e.isBuilding ? 2.6 : 1.5
      e.g.add(bar)
      const ent: Ent = { ...e, id: nextId++, bar }
      ents.push(ent)
      scene.add(e.g)
      return ent
    }

    // ── The keep ────────────────────────────────────────────────────────────
    const buildKeep = () => {
      // Walls
      for (let i = -4; i <= 4; i++) {
        for (const [x, z] of [[i * 1.6, -6.4], [i * 1.6, 6.4], [-6.4, i * 1.6], [6.4, i * 1.6]] as const) {
          if (Math.abs(i) === 0) continue    // leave gateways
          const m = chunk(1.5, 1.5, 1.5, PALETTE.stone)
          const g = inked(m, 0.035)
          g.position.set(x, 0.75, z)
          g.add(contactShadow(0.85, 0.4))
          add({ team: 'def', kind: 'wall', x, z, hp: 120, maxHp: 120, cd: 0, g,
                target: null, isBuilding: true, dmg: 0, range: 0, speed: 0 })
        }
      }
      // Towers at the corners
      for (const [x, z] of [[-6.4, -6.4], [6.4, -6.4], [-6.4, 6.4], [6.4, 6.4]] as const) {
        const grp = new THREE.Group()
        const base = chunk(2.0, 1.4, 2.0, PALETTE.stoneDark)
        base.position.y = 0.7
        grp.add(inked(base, 0.03))
        const shaft = chunk(1.5, 2.2, 1.5, PALETTE.stone)
        shaft.position.y = 2.4
        grp.add(inked(shaft, 0.03))
        const roof = new THREE.Mesh(new THREE.ConeGeometry(1.25, 1.5, 6), toon(PALETTE.playerB))
        roof.position.y = 4.2
        roof.castShadow = true
        grp.add(inked(roof, 0.03))
        grp.position.set(x, 0, z)
        grp.add(contactShadow(1.5, 0.45))
        add({ team: 'def', kind: 'tower', x, z, hp: 340, maxHp: 340, cd: 0, g: grp,
              target: null, isBuilding: true, dmg: 16, range: 8.5, speed: 0 })
      }
      // The keep itself
      const keep = new THREE.Group()
      const k1 = chunk(4.2, 2.4, 4.2, PALETTE.stone); k1.position.y = 1.2
      keep.add(inked(k1, 0.028))
      const k2 = chunk(3.0, 2.0, 3.0, PALETTE.stoneDark); k2.position.y = 3.4
      keep.add(inked(k2, 0.028))
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.4, 2.4, 6), toon(PALETTE.playerB))
      roof.position.y = 5.6; roof.castShadow = true
      keep.add(inked(roof, 0.028))
      const flag = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.06), toon(PALETTE.gold))
      flag.position.set(0.5, 7.1, 0)
      keep.add(flag)
      keep.add(contactShadow(2.8, 0.5))
      add({ team: 'def', kind: 'keep', x: 0, z: 0, hp: 900, maxHp: 900, cd: 0, g: keep,
            target: null, isBuilding: true, dmg: 22, range: 7, speed: 0 })
    }
    buildKeep()

    // Scenery
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * Math.PI * 2
      const r = 13 + Math.random() * 16
      const t = Math.random() < 0.7 ? tree(0.8 + Math.random() * 0.7) : rocks(0.9)
      t.position.set(Math.cos(a) * r, 0, Math.sin(a) * r)
      t.rotation.y = Math.random() * Math.PI
      scene.add(t)
    }

    // ── Unit meshes ─────────────────────────────────────────────────────────
    const makeUnit = (d: UnitDef): THREE.Group => {
      const g = new THREE.Group()
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.42, 4, 8), toon(d.colour))
      body.position.y = 0.55
      body.castShadow = true
      g.add(inked(body, 0.06))
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), toon(0xf3d3a8))
      head.position.y = 1.08
      head.castShadow = true
      g.add(inked(head, 0.06))
      // A hat or weapon so classes read apart at a glance.
      if (d.kind === 'archer') {
        const bow = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 6, 12, Math.PI), toon(PALETTE.wood))
        bow.position.set(0.3, 0.7, 0); bow.rotation.y = Math.PI / 2
        g.add(bow)
      } else if (d.kind === 'mage') {
        const hat = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 8), toon(0x7a4fd6))
        hat.position.y = 1.42
        g.add(inked(hat, 0.06))
      } else if (d.kind === 'ram') {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.5, 8), toon(PALETTE.wood))
        log.rotation.z = Math.PI / 2
        log.position.set(0, 0.6, 0.4)
        g.add(inked(log, 0.05))
      } else {
        const helm = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
          toon(PALETTE.stoneDark))
        helm.position.y = 1.16
        g.add(helm)
      }
      g.add(contactShadow(0.42, 0.4))
      return g
    }

    // Projectiles
    const shots: { m: THREE.Mesh; tx: number; tz: number; from: Ent; life: number }[] = []
    const shotGeo = new THREE.SphereGeometry(0.13, 8, 6)
    const shotMat = toon(PALETTE.gold, { emissive: PALETTE.gold })

    const w = {
      scene, camera, renderer, ents, nextId, elixir: 10, time: 0,
      phase: 'ready' as const, destroyed: 0,
      totalBuildings: ents.filter(e => e.isBuilding).length, sel: 'grunt' as UnitKind,
    }
    world.current = w as unknown as NonNullable<typeof world.current>

    // ── Deploy on click ─────────────────────────────────────────────────────
    const ray = new THREE.Raycaster()
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const click = (e: PointerEvent) => {
      const cur = world.current
      if (!cur || cur.phase !== 'battle') return
      const r = canvas.getBoundingClientRect()
      const ndc = new THREE.Vector2(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -((e.clientY - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      const hit = new THREE.Vector3()
      if (!ray.ray.intersectPlane(ground, hit)) return
      // Deploy only outside the walls — you attack in, you do not spawn inside.
      if (Math.max(Math.abs(hit.x), Math.abs(hit.z)) < 9) return
      const d = UNITS[cur.sel]
      if (cur.elixir < d.cost) return
      cur.elixir -= d.cost
      const g = makeUnit(d)
      g.position.set(hit.x, 0, hit.z)
      const ent = add({ team: 'atk', kind: d.kind, x: hit.x, z: hit.z, hp: d.hp, maxHp: d.hp,
                        cd: 0, g, target: null, isBuilding: false,
                        dmg: d.dmg, range: d.range, speed: d.speed })
      void ent
      sync()
    }
    canvas.addEventListener('pointerdown', click)

    let W = 900, H = 560
    const resize = () => {
      const r = canvas.parentElement?.getBoundingClientRect()
      W = Math.min(1100, r ? r.width - 8 : 900)
      H = Math.round(W * 0.60)
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`
      renderer.setSize(W, H, false)
      camera.aspect = W / H
      camera.updateProjectionMatrix()
    }
    resize()
    window.addEventListener('resize', resize)

    let raf = 0, last = performance.now()
    const frame = (now: number) => {
      const cur = world.current
      if (!cur) { raf = requestAnimationFrame(frame); return }
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      if (cur.phase === 'battle') {
        cur.time += dt
        cur.elixir = Math.min(20, cur.elixir + dt * 1.15)

        for (const e of cur.ents) {
          if (e.hp <= 0) continue
          e.cd = Math.max(0, e.cd - dt)

          // Find a target: attackers want buildings, defenders want attackers.
          let best: Ent | null = null
          let bd = Infinity
          for (const o of cur.ents) {
            if (o.hp <= 0 || o.team === e.team) continue
            const d = Math.hypot(o.x - e.x, o.z - e.z)
            // Attackers ignore walls unless a wall is in the way and close.
            if (e.team === 'atk' && o.kind === 'wall' && d > 2.2) continue
            if (d < bd) { bd = d; best = o }
          }
          if (!best) continue

          if (bd > e.range && e.speed > 0) {
            const dx = best.x - e.x, dz = best.z - e.z
            const m = Math.hypot(dx, dz) || 1
            e.x += (dx / m) * e.speed * dt
            e.z += (dz / m) * e.speed * dt
            e.g.position.set(e.x, 0, e.z)
            // Face the target, and bob while walking so it reads as alive.
            e.g.rotation.y = Math.atan2(dx, dz)
            e.g.position.y = Math.abs(Math.sin(cur.time * 9 + e.id)) * 0.07
          } else if (e.cd <= 0 && e.dmg > 0) {
            e.cd = 0.85
            const mult = (e.kind === 'ram' && best.isBuilding) ? 3 : 1
            best.hp -= e.dmg * mult
            if (e.range > 2) {
              const m = new THREE.Mesh(shotGeo, shotMat)
              m.position.set(e.x, 1.1, e.z)
              scene.add(m)
              shots.push({ m, tx: best.x, tz: best.z, from: e, life: 0.4 })
            }
            if (best.hp <= 0) {
              best.hp = 0
              scene.remove(best.g)
              if (best.team === 'def' && best.isBuilding) cur.destroyed += 1
            }
          }
        }

        for (const s of shots) {
          s.life -= dt
          const t = 1 - Math.max(0, s.life) / 0.4
          s.m.position.x = s.from.x + (s.tx - s.from.x) * t
          s.m.position.z = s.from.z + (s.tz - s.from.z) * t
          s.m.position.y = 1.1 + Math.sin(t * Math.PI) * 1.2
        }
        for (let i = shots.length - 1; i >= 0; i--) {
          if (shots[i].life <= 0) { scene.remove(shots[i].m); shots.splice(i, 1) }
        }

        cur.ents = cur.ents.filter(e => e.hp > 0)

        const keep = cur.ents.find(e => e.kind === 'keep')
        if (!keep) { cur.phase = 'won'; sync() }
        else if (cur.time > 180) { cur.phase = 'lost'; sync() }
      }

      // Health bars
      for (const e of cur.ents) {
        const f = e.hp / e.maxHp
        e.bar.scale.x = (e.isBuilding ? 2.2 : 1.2) * f
        ;(e.bar.material as THREE.SpriteMaterial).color.setHex(
          f > 0.5 ? 0x4ade5a : f > 0.25 ? 0xffc23c : 0xf5563f)
        e.bar.visible = f < 1
      }

      // Slow camera orbit so the diorama reads as three-dimensional.
      const a = 0.35 + Math.sin(now / 22000) * 0.16
      camera.position.set(Math.cos(a) * 40, 31, Math.sin(a) * 40)
      camera.lookAt(0, 1.5, 0)

      renderer.render(scene, camera)
      if (cur.phase === 'battle' && Math.random() < 0.2) sync()
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('pointerdown', click)
      renderer.dispose()
    }
  }, [sync])

  const begin = () => {
    const w = world.current
    if (!w) return
    w.phase = 'battle'
    w.time = 0
    w.elixir = 10
    sync()
  }
  const pick = (k: UnitKind) => { const w = world.current; if (w) { w.sel = k; sync() } }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#8fd3ee,#cfeede)',
                  color: '#173021', fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 8, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: '-0.5px',
                       textShadow: '0 2px 0 rgba(255,255,255,0.5)' }}>
            JAVARI <span style={{ color: '#c0453a' }}>KEEP</span>
          </h1>
          <span style={{ color: 'rgba(23,48,33,0.7)', fontSize: 13 }}>
            Deploy outside the walls. Break the keep before the timer.
          </span>
        </header>

        <div style={{ display: 'flex', gap: 18, fontSize: 13, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Stat label="ELIXIR" value={'◆'.repeat(Math.min(10, ui.elixir))} tone="#a24fd6" />
          <Stat label="TIME" value={`${Math.floor(ui.time / 60)}:${String(ui.time % 60).padStart(2, '0')}`} />
          <Stat label="DESTROYED" value={`${ui.pct}%`} tone="#c0453a" />
        </div>

        <div style={{ position: 'relative' }}>
          <canvas ref={canvasRef} style={{ display: 'block', borderRadius: 14,
            border: '3px solid rgba(255,255,255,0.6)', boxShadow: '0 8px 32px rgba(0,40,20,0.25)',
            cursor: 'pointer' }} />

          {ui.phase === 'ready' && (
            <Overlay>
              <h2 style={{ fontSize: 30, margin: '0 0 6px', color: '#fff' }}>Javari Keep</h2>
              <p style={{ color: 'rgba(255,255,255,0.9)', maxWidth: 470, margin: '0 0 18px' }}>
                Pick a troop, then click the grass outside the walls to deploy.
                Elixir refills over time. Rams do triple damage to stone.
              </p>
              <Button onClick={begin}>Attack</Button>
            </Overlay>
          )}
          {(ui.phase === 'won' || ui.phase === 'lost') && (
            <Overlay>
              <h2 style={{ fontSize: 28, margin: '0 0 6px', color: '#fff' }}>
                {ui.phase === 'won' ? 'Victory' : 'Time'}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.85)', margin: '0 0 18px' }}>
                {ui.msg} {ui.pct}% destroyed.
              </p>
              <Button onClick={() => window.location.reload()}>Again</Button>
            </Overlay>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))',
                      gap: 8, marginTop: 12 }}>
          {ORDER.map(k => {
            const d = UNITS[k]
            const on = ui.sel === k
            const afford = ui.elixir >= d.cost
            return (
              <button key={k} onClick={() => pick(k)}
                style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 12,
                  background: on ? '#fffdf4' : 'rgba(255,255,255,0.55)',
                  border: `3px solid ${on ? '#c0453a' : 'rgba(255,255,255,0.8)'}`,
                  boxShadow: '0 3px 10px rgba(0,40,20,0.15)',
                  color: '#173021', cursor: 'pointer', opacity: afford ? 1 : 0.6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 14 }}>
                  <span>{d.name}</span>
                  <span style={{ color: '#a24fd6' }}>{d.cost}◆</span>
                </div>
                <div style={{ fontSize: 11.5, color: 'rgba(23,48,33,0.7)', marginTop: 2 }}>{d.blurb}</div>
              </button>
            )
          })}
        </div>

        <p style={{ color: 'rgba(23,48,33,0.55)', fontSize: 12, marginTop: 10 }}>
          Stylised kit: saturated palette, chunky tapered silhouettes, inverted-hull ink outlines,
          warm key with a cool rim, contact shadows, low-FOV isometric camera ·
          CR AudioViz AI · EIN 39-3646201
        </p>
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: 1.2, color: 'rgba(23,48,33,0.55)', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 900, color: tone ?? '#173021' }}>{value}</div>
    </div>
  )
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                  background: 'rgba(20,50,30,0.72)', borderRadius: 14, padding: 20 }}>
      {children}
    </div>
  )
}

function Button({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ background: '#ffc23c', color: '#3a2a06', border: '3px solid #fff',
      borderRadius: 14, padding: '14px 38px', fontWeight: 900, fontSize: 17, cursor: 'pointer',
      boxShadow: '0 5px 0 #c98f14, 0 8px 20px rgba(0,0,0,0.3)' }}>
      {children}
    </button>
  )
}
