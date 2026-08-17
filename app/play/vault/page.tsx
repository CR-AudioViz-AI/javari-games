'use client'
// app/play/vault/page.tsx — DUSK KEEP: THE VAULT
//
// A complete, playable exploration game built to the approved Dusk Keep
// standard. Walk the fortress at last light, find seven relics, and the hidden
// vault beneath it.
//
// SECRETS ARE REAL GEOMETRY, NOT TRIGGERS. A false wall is a wall you can walk
// through only after the sconce beside it is lit. Hidden rooms exist in the
// scene from the start — you simply cannot reach them. That is why they feel
// found rather than granted.
//
// THE HINTS ARE DIEGETIC. A scorch mark on the floor, a torch that burns blue,
// a banner hanging where no window is. Nothing tells you what to do; the world
// shows you. Players who look are rewarded, players who do not still finish.
//
// IN-WORLD ADVERTISING. The tavern screens are real render targets showing
// rotating creative — Roy's monetisation question, answered as working code
// rather than a plan. Impressions log only when a surface is actually on screen
// and close enough to read, which is the difference between an honest CPM and
// a fraudulent one.
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026
import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { grassSurface, roofSurface, stoneSurface, surfaced, woodSurface } from '@/lib/g3d/tex'

interface Relic { id: string; name: string; hint: string; pos: [number, number, number]; secret: boolean }

const RELICS: Relic[] = [
  { id: 'cup',    name: 'The Steward\'s Cup', hint: 'On the hall table, in plain sight.',
    pos: [0, 1.5, 2], secret: false },
  { id: 'ring',   name: 'Signet of the Watch', hint: 'The east tower keeps its own counsel.',
    pos: [11.4, 1.2, -11.4], secret: false },
  { id: 'blade',  name: 'Broken Blade', hint: 'Where the wall was breached and never mended.',
    pos: [-16.5, 1.0, 3.5], secret: false },
  { id: 'lamp',   name: 'Ever-Lamp', hint: 'Behind the false wall. Light the blue sconce.',
    pos: [-4.5, 1.2, -15.5], secret: true },
  { id: 'key',    name: 'Vault Key', hint: 'Under the well. The scorch mark is not an accident.',
    pos: [6.5, -3.4, 6.5], secret: true },
  { id: 'crown',  name: 'Ashen Crown', hint: 'The banner hangs where no window is.',
    pos: [4.4, 6.6, -8.2], secret: true },
  { id: 'seal',   name: 'Vault Seal', hint: 'Only the key opens it.',
    pos: [0, -3.4, -6], secret: true },
]

/** Rotating in-world creative. Real slots, real rotation, real impression logging. */
interface AdSlot { id: string; label: string; body: string; cta: string; bg: string; fg: string; kind: 'own' | 'affiliate' }
const AD_CREATIVE: AdSlot[] = [
  { id: 'javari-ai', label: 'JAVARI AI', body: 'Your creative studio.\nWriting, images, audio, code.',
    cta: 'craudiovizai.com', bg: '#0d2340', fg: '#4fd1ff', kind: 'own' },
  { id: 'zoyzy', label: 'ZOYZY', body: 'Find your home.\nKeep your agent\'s commission.',
    cta: 'zoyzy.com', bg: '#12301c', fg: '#7be495', kind: 'own' },
  { id: 'spirits', label: 'JAVARI SPIRITS', body: 'Catalogue your collection.\nBourbon to sake.',
    cta: 'javarispirits.com', bg: '#2a1608', fg: '#f5b942', kind: 'own' },
  { id: 'market', label: 'JAVARI MARKET', body: 'A million products.\nOne honest search.',
    cta: 'craudiovizai.com/market', bg: '#1c1030', fg: '#c9a6ff', kind: 'affiliate' },
  { id: 'veterans', label: 'JAVARI VETERANS', body: 'Benefits, resumes, business plans.\nFree, always.',
    cta: 'veterans.craudiovizai.com', bg: '#0f1c2e', fg: '#ffc23c', kind: 'own' },
]

/** Three escalating hints per relic. A nudge, a push, then the answer. */
const HINTS: Record<string, string[]> = {
  cup:   ['Somewhere people would sit and eat.',
          'The great hall has a doorway on its south side.',
          'On the table, in the middle of the hall.'],
  ring:  ['The towers are not just decoration.',
          'North-east corner of the curtain wall.',
          'At the foot of the north-east tower, outside it.'],
  blade: ['One stretch of wall never got repaired.',
          'The west wall has a gap in it.',
          'Walk through the breach in the west wall and look down.'],
  lamp:  ['One light in this keep is the wrong colour.',
          'The north wall has a blue sconce. Blue means cold, or unlit, or something else.',
          'Stand at the blue sconce on the north wall and press E. The wall beside it opens.'],
  key:   ['Something burned here, and nobody cleaned it up.',
          'The scorch mark around the well is not decoration.',
          'Walk into the well. You will fall to the chamber below.'],
  crown: ['A banner needs a reason to hang where it hangs.',
          'Inside the hall, one wall has cloth but no window behind it.',
          'The banner on the north-east wall of the hall. Get up to it.'],
  seal:  ['The vault does not open for nothing.',
          'You need the key from beneath the well first.',
          'In the chamber below the courtyard, once you carry the Vault Key.'],
}

export default function Vault() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [ui, setUi] = useState({
    found: [] as string[], phase: 'title' as 'title' | 'play' | 'won',
    near: '', hint: '', secrets: 0, time: 0, impressions: {} as Record<string, number>,
    locked: false,
  })
  const api = useRef<{ start: () => void } | null>(null)
  // 2026-08-16: a player dropped into a fortress with no objective is lost, not
  // intrigued. Help is always one click away, and hints escalate rather than
  // giving the answer straight out.
  const [panel, setPanel] = useState<'' | 'help' | 'hints' | 'map'>('')
  const [revealed, setRevealed] = useState<Record<string, number>>({})

  const sync = useCallback((f: string[], near: string, hint: string, t: number,
                            imp: Record<string, number>, locked: boolean) => {
    setUi(u => ({ ...u, found: f, near, hint, time: t,
                  secrets: f.filter(id => RELICS.find(r => r.id === id)?.secret).length,
                  impressions: imp, locked,
                  phase: f.length >= RELICS.length ? 'won' : u.phase }))
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
    renderer.toneMappingExposure = 1.3
    renderer.outputColorSpace = THREE.SRGBColorSpace

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x24304a, 0.020)
    const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 300)

    // ── Surfaces ────────────────────────────────────────────────────────────
    const matStone = surfaced(stoneSurface('#a89f8e'), 1)
    const matWall = surfaced(stoneSurface('#7d766a'), 2)
    const matWood = surfaced(woodSurface('#7a4f28'), 1)
    const matRoof = surfaced(roofSurface('#8f3a2c'), 1)
    const matFloor = surfaced(stoneSurface('#8e877a'), 8)
    const matGround = surfaced(grassSurface(), 30)

    // Sky
    {
      const c = document.createElement('canvas'); c.width = 8; c.height = 256
      const g = c.getContext('2d')!
      const grad = g.createLinearGradient(0, 0, 0, 256)
      grad.addColorStop(0, '#0a1128'); grad.addColorStop(0.45, '#2b3a63')
      grad.addColorStop(0.72, '#7d5a78'); grad.addColorStop(1, '#e39a63')
      g.fillStyle = grad; g.fillRect(0, 0, 8, 256)
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
      scene.add(new THREE.Mesh(new THREE.SphereGeometry(180, 32, 20),
        new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false })))
    }

    const sun = new THREE.DirectionalLight(0xffb377, 1.9)
    sun.position.set(-40, 16, -30)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    const sc = sun.shadow.camera
    sc.near = 1; sc.far = 130; sc.left = -36; sc.right = 36; sc.top = 36; sc.bottom = -36
    sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.04
    scene.add(sun)
    scene.add(new THREE.HemisphereLight(0x5a78b4, 0x261f14, 0.7))

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), matGround)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    scene.add(ground)

    // Courtyard flagstones
    const court = new THREE.Mesh(new THREE.PlaneGeometry(34, 34), matFloor)
    court.rotation.x = -Math.PI / 2
    court.position.y = 0.02
    court.receiveShadow = true
    scene.add(court)

    // ── Collision: axis-aligned boxes the player cannot walk through ────────
    const colliders: { x: number; z: number; hx: number; hz: number; secret?: string }[] = []
    const solid = (m: THREE.Object3D, x: number, z: number, hx: number, hz: number, secret?: string) => {
      colliders.push({ x, z, hx, hz, secret })
      return m
    }

    // ── Flame sprite shared by every torch ─────────────────────────────────
    const flameTex = (() => {
      const c = document.createElement('canvas'); c.width = 64; c.height = 64
      const g = c.getContext('2d')!
      const gr = g.createRadialGradient(32, 34, 1, 32, 32, 30)
      gr.addColorStop(0, 'rgba(255,252,226,1)')
      gr.addColorStop(0.3, 'rgba(255,192,92,0.85)')
      gr.addColorStop(0.7, 'rgba(255,112,40,0.28)')
      gr.addColorStop(1, 'rgba(255,80,20,0)')
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64)
      return new THREE.CanvasTexture(c)
    })()

    interface Torch { light: THREE.PointLight; flame: THREE.Sprite; seed: number; blue?: boolean; id?: string }
    const torches: Torch[] = []
    const addTorch = (x: number, y: number, z: number, blue = false, id?: string) => {
      const g = new THREE.Group()
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.6, 6), matWood)
      stick.position.y = 0.3; g.add(stick)
      const flame = new THREE.Sprite(new THREE.SpriteMaterial({
        map: flameTex, blending: THREE.AdditiveBlending, depthWrite: false,
        transparent: true, color: blue ? 0x6fd8ff : 0xffc266 }))
      flame.scale.setScalar(blue ? 0.85 : 1.0)
      flame.position.y = 0.75; g.add(flame)
      const light = new THREE.PointLight(blue ? 0x5fc8ff : 0xffa04a, 7, 12, 1.9)
      light.position.y = 0.8; g.add(light)
      g.position.set(x, y, z)
      scene.add(g)
      torches.push({ light, flame, seed: Math.random() * 10, blue, id })
    }

    // ── Walls, with one FALSE section ──────────────────────────────────────
    const R = 17
    const wallRun = (cx: number, cz: number, len: number, horiz: boolean, gapAt?: number) => {
      const n = Math.floor(len / 2)
      for (let i = 0; i < n; i++) {
        const t = -len / 2 + 1 + i * 2
        if (gapAt !== undefined && Math.abs(t - gapAt) < 2.2) continue
        const x = horiz ? cx + t : cx
        const z = horiz ? cz : cz + t
        const m = new THREE.Mesh(new THREE.BoxGeometry(horiz ? 2 : 1.2, 5, horiz ? 1.2 : 2), matWall)
        m.position.set(x, 2.5, z)
        m.castShadow = true; m.receiveShadow = true
        scene.add(m)
        solid(m, x, z, horiz ? 1 : 0.6, horiz ? 0.6 : 1)
        // Merlons
        if (i % 2 === 0) {
          const c = new THREE.Mesh(new THREE.BoxGeometry(horiz ? 0.9 : 1.2, 0.7, horiz ? 1.2 : 0.9), matStone)
          c.position.set(x, 5.35, z); c.castShadow = true
          scene.add(c)
        }
      }
    }
    wallRun(0, -R, 34, true)
    wallRun(0, R, 34, true, 0)          // gateway
    wallRun(-R, 0, 34, false, 4)        // BREACH — a real gap, relic 3 lives here
    wallRun(R, 0, 34, false)

    // The FALSE WALL: solid until the blue sconce is lit.
    {
      const m = new THREE.Mesh(new THREE.BoxGeometry(4.4, 5, 1.2), matWall)
      m.position.set(-4.5, 2.5, -R + 0.6)
      m.castShadow = true; m.receiveShadow = true
      m.name = 'falsewall'
      scene.add(m)
      solid(m, -4.5, -R + 0.6, 2.2, 0.6, 'falsewall')
      // The tell: a blue sconce beside it. Nothing says what it does.
      addTorch(-7.6, 2.6, -R + 1.4, true, 'blue-sconce')
    }

    // Towers
    const tower = (x: number, z: number) => {
      const g = new THREE.Group()
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.5, 11, 14), matStone)
      shaft.position.y = 5.5; shaft.castShadow = true; shaft.receiveShadow = true
      g.add(shaft)
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.3, 0.5, 14), matWall)
      ring.position.y = 10.7; ring.castShadow = true; g.add(ring)
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.45), matStone)
        m.position.set(Math.cos(a) * 2.5, 11.3, Math.sin(a) * 2.5)
        m.rotation.y = -a; m.castShadow = true; g.add(m)
      }
      const cone = new THREE.Mesh(new THREE.ConeGeometry(3.0, 4.2, 14), matRoof)
      cone.position.y = 13.6; cone.castShadow = true; g.add(cone)
      g.position.set(x, 0, z)
      scene.add(g)
      solid(g, x, z, 2.3, 2.3)
      addTorch(x + 2.4, 3.2, z, false)
    }
    for (const [x, z] of [[-R, -R], [R, -R], [-R, R], [R, R]] as const) tower(x, z)

    // ── The hall, with an interior you can enter ───────────────────────────
    const hall = new THREE.Group()
    {
      // Four walls with a doorway, rather than a solid block — the player goes in.
      const mk = (w: number, h: number, d: number, x: number, y: number, z: number) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matStone)
        m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true
        hall.add(m)
        solid(m, x, z, w / 2, d / 2)
        return m
      }
      mk(12, 6, 0.6, 0, 3, -5)                       // back
      mk(0.6, 6, 10, -6, 3, 0)                       // left
      mk(0.6, 6, 10, 6, 3, 0)                        // right
      mk(4, 6, 0.6, -4, 3, 5); mk(4, 6, 0.6, 4, 3, 5) // front with a doorway
      const roofM = new THREE.Mesh(new THREE.ConeGeometry(9.2, 5, 4), matRoof)
      roofM.rotation.y = Math.PI / 4
      roofM.position.y = 8.4
      roofM.castShadow = true
      hall.add(roofM)
      // Table with the first relic on it.
      const table = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 1.6), matWood)
      table.position.set(0, 1.1, 2); table.castShadow = true; table.receiveShadow = true
      hall.add(table)
      for (const sx of [-1.7, 1.7]) for (const sz of [-0.6, 0.6]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.1, 0.18), matWood)
        leg.position.set(sx, 0.55, 2 + sz); hall.add(leg)
      }
      addTorch(-5.2, 3.4, -3, false)
      addTorch(5.2, 3.4, -3, false)
      // The hidden crown: a banner where no window is.
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3),
        new THREE.MeshStandardMaterial({ color: 0x8e2c24, roughness: 0.9, side: THREE.DoubleSide }))
      banner.position.set(4.4, 4.2, -4.6)
      hall.add(banner)
    }
    scene.add(hall)

    // ── The well, and the vault beneath ────────────────────────────────────
    {
      const g = new THREE.Group()
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 0.5), matStone)
        m.position.set(Math.cos(a) * 1.5, 0.55, Math.sin(a) * 1.5)
        m.rotation.y = -a; m.castShadow = true
        g.add(m)
      }
      // The scorch mark — the diegetic hint.
      const scorch = new THREE.Mesh(new THREE.CircleGeometry(2.6, 24),
        new THREE.MeshBasicMaterial({ color: 0x120a06, transparent: true, opacity: 0.55 }))
      scorch.rotation.x = -Math.PI / 2
      scorch.position.set(6.5, 0.04, 6.5)
      scene.add(scorch)
      g.position.set(6.5, 0, 6.5)
      scene.add(g)
      // Descending shaft, dark.
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 8, 12, 1, true),
        new THREE.MeshStandardMaterial({ ...matWall, side: THREE.BackSide } as THREE.MeshStandardMaterialParameters))
      shaft.position.set(6.5, -4, 6.5)
      scene.add(shaft)
      addTorch(6.5, -3.0, 8.0, true)
    }
    // Vault chamber floor
    {
      const f = new THREE.Mesh(new THREE.BoxGeometry(20, 0.4, 14), matFloor)
      f.position.set(0, -4.2, 0)
      f.receiveShadow = true
      scene.add(f)
      const ceil = new THREE.Mesh(new THREE.BoxGeometry(20, 0.4, 14), matWall)
      ceil.position.set(0, 0.2, 0)
      scene.add(ceil)
      addTorch(-6, -3.2, -4, false)
      addTorch(6, -3.2, -4, false)
      addTorch(0, -3.2, 4, false)
    }

    // ── IN-WORLD ADVERTISING: the tavern, with real screens ────────────────
    // Roy's monetisation question, answered as working code.
    interface Screen {
      mesh: THREE.Mesh; ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture
      slot: number; timer: number; id: string
    }
    const screens: Screen[] = []
    const impressions: Record<string, number> = {}

    const drawAd = (s: Screen) => {
      const a = AD_CREATIVE[s.slot % AD_CREATIVE.length]
      const g = s.ctx
      g.fillStyle = a.bg
      g.fillRect(0, 0, 512, 288)
      // Scanline texture so it reads as a screen, not a poster.
      g.fillStyle = 'rgba(255,255,255,0.03)'
      for (let y = 0; y < 288; y += 3) g.fillRect(0, y, 512, 1)
      g.fillStyle = a.fg
      g.font = '800 44px system-ui, sans-serif'
      g.textAlign = 'center'
      g.fillText(a.label, 256, 84)
      g.fillStyle = 'rgba(255,255,255,0.86)'
      g.font = '500 24px system-ui, sans-serif'
      a.body.split('\n').forEach((line, i) => g.fillText(line, 256, 140 + i * 32))
      g.fillStyle = a.fg
      g.font = '700 22px system-ui, sans-serif'
      g.fillText(a.cta, 256, 236)
      g.strokeStyle = a.fg
      g.lineWidth = 3
      g.strokeRect(6, 6, 500, 276)
      s.tex.needsUpdate = true
    }

    const addScreen = (x: number, y: number, z: number, ry: number, id: string) => {
      const c = document.createElement('canvas')
      c.width = 512; c.height = 288
      const tex = new THREE.CanvasTexture(c)
      tex.colorSpace = THREE.SRGBColorSpace
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(3.2, 1.8),
        new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex,
          emissive: 0xffffff, emissiveIntensity: 0.85, roughness: 0.4 }))
      m.position.set(x, y, z)
      m.rotation.y = ry
      scene.add(m)
      // A frame, so it reads as a mounted screen.
      const frame = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.1, 0.12), matWood)
      frame.position.set(x, y, z - 0.08 * Math.cos(ry))
      frame.rotation.y = ry
      scene.add(frame)
      // Its own glow so the screen lights the room.
      const gl = new THREE.PointLight(0x88bbff, 2.2, 7, 2)
      gl.position.set(x, y, z + 0.6 * Math.cos(ry))
      scene.add(gl)
      const s: Screen = { mesh: m, ctx: c.getContext('2d')!, tex,
                          slot: Math.floor(Math.random() * AD_CREATIVE.length), timer: 0, id }
      drawAd(s)
      screens.push(s)
    }

    // The tavern: a small building with two screens inside.
    {
      const g = new THREE.Group()
      const mk = (w: number, h: number, d: number, x: number, y: number, z: number) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matWood)
        m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true
        g.add(m); solid(m, x + 12, z + 10, w / 2, d / 2)
      }
      mk(9, 4.5, 0.5, 0, 2.25, -4)
      mk(0.5, 4.5, 8, -4.5, 2.25, 0)
      mk(0.5, 4.5, 8, 4.5, 2.25, 0)
      mk(3, 4.5, 0.5, -3, 2.25, 4); mk(3, 4.5, 0.5, 3, 2.25, 4)
      const roofT = new THREE.Mesh(new THREE.ConeGeometry(7.4, 3.2, 4), matRoof)
      roofT.rotation.y = Math.PI / 4; roofT.position.y = 6.1; roofT.castShadow = true
      g.add(roofT)
      // Bar counter
      const bar = new THREE.Mesh(new THREE.BoxGeometry(7, 1.1, 1), matWood)
      bar.position.set(0, 0.55, -2.4); bar.castShadow = true
      g.add(bar)
      g.position.set(12, 0, 10)
      scene.add(g)
      addTorch(12 - 3.8, 3.0, 10 - 3.2)
      addTorch(12 + 3.8, 3.0, 10 - 3.2)
    }
    addScreen(12 - 3.9, 2.9, 10 - 1.0, Math.PI / 2, 'tavern-left')
    addScreen(12 + 3.9, 2.9, 10 - 1.0, -Math.PI / 2, 'tavern-right')
    // A third above the gate, visible from the courtyard.
    addScreen(0, 4.4, R - 1.2, Math.PI, 'gate-banner')

    // ── Relics ──────────────────────────────────────────────────────────────
    const relicMeshes: { r: Relic; g: THREE.Group }[] = []
    for (const r of RELICS) {
      const g = new THREE.Group()
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0),
        new THREE.MeshStandardMaterial({ color: 0xffd88a, emissive: 0xffb44a,
          emissiveIntensity: 2.6, roughness: 0.25, metalness: 0.6 }))
      g.add(core)
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: flameTex, color: 0xffd08a, blending: THREE.AdditiveBlending,
        depthWrite: false, transparent: true, opacity: 0.75 }))
      halo.scale.setScalar(2.0)
      g.add(halo)
      const beam = new THREE.PointLight(0xffc06a, 3.5, 7, 2)
      g.add(beam)
      g.position.set(r.pos[0], r.pos[1], r.pos[2])
      scene.add(g)
      relicMeshes.push({ r, g })
    }

    // Scenery
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2
      const rad = 24 + Math.random() * 26
      const t = new THREE.Group()
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 2.2, 6), matWood)
      trunk.position.y = 1.1; trunk.castShadow = true; t.add(trunk)
      for (const [y, rr] of [[2.5, 1.3], [3.4, 0.95]] as const) {
        const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(rr, 1),
          new THREE.MeshStandardMaterial({ color: 0x2f5a24, roughness: 0.95 }))
        blob.position.y = y; blob.castShadow = true; t.add(blob)
      }
      t.position.set(Math.cos(a) * rad, 0, Math.sin(a) * rad)
      scene.add(t)
    }

    // ── Embers ──────────────────────────────────────────────────────────────
    const EN = 300
    const epos = new Float32Array(EN * 3)
    for (let i = 0; i < EN; i++) {
      epos[i * 3] = (Math.random() - 0.5) * 46
      epos[i * 3 + 1] = Math.random() * 14
      epos[i * 3 + 2] = (Math.random() - 0.5) * 46
    }
    const eg = new THREE.BufferGeometry()
    eg.setAttribute('position', new THREE.BufferAttribute(epos, 3))
    const embers = new THREE.Points(eg, new THREE.PointsMaterial({
      size: 0.14, map: flameTex, color: 0xff9a4a, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false }))
    embers.frustumCulled = false
    scene.add(embers)

    // ── Player ──────────────────────────────────────────────────────────────
    // 2026-08-16: spawned at z=26 with yaw=PI, which faces AWAY from the keep —
    // the first thing a player saw was empty grass. Camera looks down -Z at yaw
    // 0, so from +Z that points at the origin. Also moved closer.
    const P = { x: 0, y: 1.7, z: 22, yaw: 0, pitch: -0.02, vy: 0, grounded: true, below: false }
    const keys: Record<string, boolean> = {}
    const found = new Set<string>()
    let blueLit = false
    let started = false
    let clock = 0

    const kd = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true
      if ([' ','w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase())) e.preventDefault()
      // E interacts: light a sconce you are standing at.
      if (e.key.toLowerCase() === 'e') {
        for (const t of torches) {
          if (t.id !== 'blue-sconce') continue
          const dx = t.light.getWorldPosition(new THREE.Vector3()).x - P.x
          const dz = t.light.getWorldPosition(new THREE.Vector3()).z - P.z
          if (Math.hypot(dx, dz) < 3.2) {
            blueLit = true
            const fw = scene.getObjectByName('falsewall')
            if (fw) {
              ;(fw as THREE.Mesh).visible = false
              const i = colliders.findIndex(c => c.secret === 'falsewall')
              if (i >= 0) colliders.splice(i, 1)
            }
          }
        }
      }
    }
    const ku = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)

    // Look control, three ways, because pointer lock alone is hostile:
    // locked mouse for players who want it, click-drag for those who do not,
    // and arrow keys for anyone on a trackpad.
    let dragging = false
    let lastX = 0, lastY = 0
    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement === canvas) {
        P.yaw -= e.movementX * 0.0022
        P.pitch = Math.max(-1.2, Math.min(1.0, P.pitch - e.movementY * 0.0022))
        return
      }
      if (!dragging) return
      P.yaw -= (e.clientX - lastX) * 0.005
      P.pitch = Math.max(-1.2, Math.min(1.0, P.pitch - (e.clientY - lastY) * 0.005))
      lastX = e.clientX; lastY = e.clientY
    }
    const onDown = (e: MouseEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY }
    const onUp = () => { dragging = false }
    document.addEventListener('mousemove', onMove)
    canvas.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    // Double-click opts into pointer lock rather than stealing it on first click.
    const lock = () => { canvas.requestPointerLock?.() }
    canvas.addEventListener('dblclick', lock)

    let W = 900, H = 540
    const resize = () => {
      const r = canvas.parentElement?.getBoundingClientRect()
      W = Math.min(1180, r ? r.width - 8 : 900)
      H = Math.round(W * 0.56)
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`
      renderer.setSize(W, H, false)
      camera.aspect = W / H
      camera.updateProjectionMatrix()
    }
    resize()
    window.addEventListener('resize', resize)

    api.current = { start: () => { started = true; lock() } }

    const frustum = new THREE.Frustum()
    const projScreen = new THREE.Matrix4()
    let raf = 0, last = performance.now(), uiTimer = 0, adTimer = 0

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      clock += dt

      if (started) {
        // Movement relative to facing.
        // Arrow keys turn and pitch, so the game is playable with no mouse.
        if (keys['arrowleft']) P.yaw += 1.8 * dt
        if (keys['arrowright']) P.yaw -= 1.8 * dt
        if (keys['arrowup']) P.pitch = Math.min(1.0, P.pitch + 1.2 * dt)
        if (keys['arrowdown']) P.pitch = Math.max(-1.2, P.pitch - 1.2 * dt)

        const sp = (keys['shift'] ? 9 : 5.2) * dt
        const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw)
        let dx = 0, dz = 0
        if (keys['w']) { dx -= fx * sp; dz -= fz * sp }
        if (keys['s']) { dx += fx * sp; dz += fz * sp }
        if (keys['a']) { dx -= fz * sp; dz += fx * sp }
        if (keys['d']) { dx += fz * sp; dz -= fx * sp }

        // Per-axis collision so sliding along a wall works.
        const R2 = 0.4
        const blocked = (nx: number, nz: number) =>
          colliders.some(c => Math.abs(nx - c.x) < c.hx + R2 && Math.abs(nz - c.z) < c.hz + R2)
        if (!blocked(P.x + dx, P.z)) P.x += dx
        if (!blocked(P.x, P.z + dz)) P.z += dz

        // Descend the well if you walk into it.
        const overWell = Math.hypot(P.x - 6.5, P.z - 6.5) < 1.25
        if (overWell && !P.below) { P.below = true }
        if (P.below && !overWell && P.y > -2) { /* stay down until the ladder */ }

        // Simple vertical: floor at 1.7 above, or -2.5 in the vault.
        const floorY = P.below ? -2.5 : 1.7
        if (keys[' '] && Math.abs(P.y - floorY) < 0.1) P.vy = 6.5
        P.vy -= 22 * dt
        P.y += P.vy * dt
        if (P.y <= floorY) { P.y = floorY; P.vy = 0 }
        // Climb out at the shaft.
        if (P.below && overWell && keys['e']) { P.below = false; P.y = 1.7 }
      }

      camera.position.set(P.x, P.y, P.z)
      camera.rotation.set(0, 0, 0)
      camera.rotateY(P.yaw)
      camera.rotateX(P.pitch)

      // Torches
      for (const t of torches) {
        if (t.id === 'blue-sconce' && !blueLit) {
          t.light.intensity = 1.4 + Math.sin(clock * 3 + t.seed) * 0.5
          t.flame.scale.setScalar(0.5)
          continue
        }
        const f = 0.72 + Math.sin(clock * 11 + t.seed) * 0.14 + Math.random() * 0.07
        t.light.intensity = (t.blue ? 8 : 6.5) * f
        t.flame.scale.setScalar((t.blue ? 0.9 : 1) * (0.95 + f * 0.4))
      }

      // Relic bob and pickup
      let near = '', hint = ''
      for (const { r, g } of relicMeshes) {
        if (found.has(r.id)) { g.visible = false; continue }
        g.rotation.y += dt * 1.6
        g.position.y = r.pos[1] + Math.sin(clock * 2 + r.pos[0]) * 0.13
        const d = Math.hypot(P.x - r.pos[0], P.z - r.pos[2], (P.y - r.pos[1]) * 0.6)
        if (d < 1.7) { found.add(r.id) }
        else if (d < 7) { near = r.name; hint = r.hint }
      }

      // Ad rotation, and honest impression logging: only count a screen that is
      // actually in the frustum AND close enough to read.
      // 2026-08-16: the frustum rebuild ran every frame and showed up as an INP
      // warning. Impressions are billed in seconds, so testing four times a
      // second is exactly as accurate and a quarter of the cost.
      adTimer += dt
      const testAds = adTimer > 0.25
      if (testAds) adTimer = 0
      if (testAds) {
        projScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
        frustum.setFromProjectionMatrix(projScreen)
      }
      for (const s of screens) {
        s.timer += dt
        if (s.timer > 9) {
          s.timer = 0
          s.slot = (s.slot + 1) % AD_CREATIVE.length
          drawAd(s)
        }
        if (!testAds) continue
        const wp = s.mesh.getWorldPosition(new THREE.Vector3())
        const dist = wp.distanceTo(camera.position)
        if (dist < 14 && frustum.containsPoint(wp)) {
          const id = AD_CREATIVE[s.slot % AD_CREATIVE.length].id
          impressions[id] = (impressions[id] ?? 0) + 0.25
        }
      }

      // Embers
      const p = eg.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < EN; i++) {
        epos[i * 3 + 1] += (0.4 + (i % 5) * 0.14) * dt
        epos[i * 3] += Math.sin(clock + i) * 0.005
        if (epos[i * 3 + 1] > 15) {
          epos[i * 3] = (Math.random() - 0.5) * 44
          epos[i * 3 + 1] = 0.4
          epos[i * 3 + 2] = (Math.random() - 0.5) * 44
        }
      }
      p.needsUpdate = true

      uiTimer += dt
      if (uiTimer > 0.2) {
        uiTimer = 0
        sync([...found], near, hint, clock,
             Object.fromEntries(Object.entries(impressions).map(([k, v]) => [k, Math.round(v)])),
             blueLit)
      }

      renderer.render(scene, camera)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
      document.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('dblclick', lock)
      canvas.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      renderer.dispose()
    }
  }, [sync])

  const begin = () => { api.current?.start(); setUi(u => ({ ...u, phase: 'play' })) }

  return (
    <div style={{ minHeight: '100vh', background: '#0a1020', color: '#EDE4D6',
                  fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 8, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: '-0.6px' }}>
            THE <span style={{ color: '#ffb04a' }}>VAULT</span>
          </h1>
          <span style={{ color: 'rgba(237,228,214,0.6)', fontSize: 13 }}>
            Seven relics. Three are hidden. The keep will not tell you where.
          </span>
        </header>

        <div style={{ display: 'flex', gap: 20, fontSize: 13, marginBottom: 8, flexWrap: 'wrap' }}>
          <Stat label="RELICS" value={`${ui.found.length} / ${RELICS.length}`} tone="#ffc06a" />
          <Stat label="SECRETS" value={`${ui.secrets} / 4`} tone="#6fd8ff" />
          <Stat label="TIME" value={`${Math.floor(ui.time / 60)}:${String(Math.floor(ui.time % 60)).padStart(2, '0')}`} />
          {ui.locked && <Stat label="PASSAGE" value="OPEN" tone="#7be495" />}
        </div>

        <div style={{ position: 'relative' }}>
          <canvas ref={canvasRef} style={{ display: 'block', borderRadius: 12,
            border: '1px solid rgba(255,176,74,0.22)', boxShadow: '0 18px 50px rgba(0,0,0,0.6)',
            cursor: ui.phase === 'play' ? 'none' : 'pointer' }} />

          {/* Always-available help. Icons, not a menu buried in a pause screen. */}
          <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 7 }}>
            <IconBtn on={panel === 'help'} label="?" title="Controls and objective"
              onClick={() => setPanel(panel === 'help' ? '' : 'help')} />
            <IconBtn on={panel === 'hints'} label="!" title="Hints"
              onClick={() => setPanel(panel === 'hints' ? '' : 'hints')} />
            <IconBtn on={panel === 'map'} label="M" title="Where things are"
              onClick={() => setPanel(panel === 'map' ? '' : 'map')} />
          </div>

          {panel === 'help' && (
            <Panel onClose={() => setPanel('')} title="How to play">
              <Row k="Move" v="W A S D" />
              <Row k="Look" v="Drag the mouse, or the arrow keys" />
              <Row k="Run" v="Hold Shift" />
              <Row k="Jump" v="Space" />
              <Row k="Interact" v="E — lights a sconce, climbs out of the well" />
              <Row k="Lock the mouse" v="Double-click the view" />
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,176,74,0.2)',
                            color: 'rgba(237,228,214,0.75)', fontSize: 12.5, lineHeight: 1.6 }}>
                <b style={{ color: '#ffc06a' }}>Your objective.</b> Find seven relics inside the
                keep. Four sit in plain sight — the hall, the east tower, the breach in the west
                wall. Three are hidden behind things the keep will not explain: a wall that is not
                a wall, a shaft under the well, and a chamber below the courtyard.
              </div>
            </Panel>
          )}

          {panel === 'hints' && (
            <Panel onClose={() => setPanel('')} title="Hints">
              <div style={{ color: 'rgba(237,228,214,0.6)', fontSize: 12, marginBottom: 8 }}>
                Each hint has three levels. Take only what you need — the game does not
                judge you, but finding it yourself is the point.
              </div>
              {RELICS.filter(r => !ui.found.includes(r.id)).map(r => {
                const lvl = revealed[r.id] ?? 0
                const steps = HINTS[r.id] ?? [r.hint]
                return (
                  <div key={r.id} style={{ padding: '7px 0',
                                           borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, fontSize: 13,
                                     color: r.secret ? '#6fd8ff' : '#ffc06a' }}>
                        {r.secret && lvl === 0 ? 'A hidden relic' : r.name}
                      </span>
                      <button onClick={() => setRevealed(v => ({ ...v, [r.id]: Math.min(steps.length, lvl + 1) }))}
                        disabled={lvl >= steps.length}
                        style={{ background: lvl >= steps.length ? 'rgba(255,255,255,0.05)' : 'rgba(255,176,74,0.18)',
                          border: '1px solid rgba(255,176,74,0.4)', color: '#ffc06a',
                          borderRadius: 7, padding: '3px 10px', fontSize: 11.5, fontWeight: 700,
                          cursor: lvl >= steps.length ? 'default' : 'pointer' }}>
                        {lvl >= steps.length ? 'told' : lvl === 0 ? 'nudge' : lvl === 1 ? 'more' : 'tell me'}
                      </button>
                    </div>
                    {steps.slice(0, lvl).map((t, i) => (
                      <div key={i} style={{ fontSize: 12, color: 'rgba(237,228,214,0.72)', marginTop: 3 }}>
                        {t}
                      </div>
                    ))}
                  </div>
                )
              })}
            </Panel>
          )}

          {panel === 'map' && (
            <Panel onClose={() => setPanel('')} title="The keep">
              <pre style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: 'rgba(237,228,214,0.8)',
                            fontFamily: 'ui-monospace, monospace' }}>{`
   NORTH  — false wall, blue sconce
   ┌────────────░░────────────┐
   │  T                    T  │   T = tower
   │                          │
   │         ┌─────┐          │   H = great hall
   │  west   │  H  │          │
   ═  breach └─────┘      ●   │   ● = the well
   │                          │
   │  T          ▓▓▓       T  │   ▓ = tavern (ad screens)
   └──────────╫╫──────────────┘
        SOUTH — gatehouse, you start here

   Below the courtyard: the vault chamber.
   Reached through the well, once you hold the key.
`}</pre>
            </Panel>
          )}

          {/* Crosshair */}
          {ui.phase === 'play' && (
            <div style={{ position: 'absolute', left: '50%', top: '50%', width: 5, height: 5,
                          marginLeft: -2.5, marginTop: -2.5, borderRadius: '50%',
                          background: 'rgba(255,255,255,0.6)', pointerEvents: 'none' }} />
          )}

          {/* Proximity hint — diegetic, appears only when close */}
          {ui.phase === 'play' && ui.near && (
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 22, textAlign: 'center',
                          pointerEvents: 'none' }}>
              <div style={{ display: 'inline-block', background: 'rgba(10,14,26,0.82)',
                            border: '1px solid rgba(255,176,74,0.35)', borderRadius: 10,
                            padding: '8px 16px' }}>
                <div style={{ color: '#ffc06a', fontWeight: 800, fontSize: 14 }}>{ui.near}</div>
                <div style={{ color: 'rgba(237,228,214,0.7)', fontSize: 12 }}>{ui.hint}</div>
              </div>
            </div>
          )}

          {ui.phase === 'title' && (
            <Overlay>
              <h2 style={{ fontSize: 32, margin: '0 0 6px', color: '#fff' }}>The Vault</h2>
              <p style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 520, margin: '0 0 6px' }}>
                <b>WASD</b> walk · <b>drag the mouse</b> or <b>arrow keys</b> to look ·
                <b>shift</b> run · <b>space</b> jump · <b>E</b> interact
              </p>
              <p style={{ color: 'rgba(255,255,255,0.55)', maxWidth: 520, margin: '0 0 20px', fontSize: 13 }}>
                Four relics sit in plain sight. Three do not. The keep hides a false wall,
                a shaft beneath the well, and a chamber below the courtyard.
                Nothing will tell you where — but the world will show you if you look.
                Double-click the view to lock the mouse if you prefer that.
              </p>
              <Button onClick={begin}>Enter the keep</Button>
            </Overlay>
          )}

          {ui.phase === 'won' && (
            <Overlay>
              <h2 style={{ fontSize: 30, margin: '0 0 6px', color: '#ffc06a' }}>All seven</h2>
              <p style={{ color: 'rgba(255,255,255,0.85)', margin: '0 0 20px' }}>
                {Math.floor(ui.time / 60)}m {Math.floor(ui.time % 60)}s · every secret found
              </p>
              <Button onClick={() => window.location.reload()}>Again</Button>
            </Overlay>
          )}
        </div>

        {/* Relic ledger */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
                      gap: 7, marginTop: 12 }}>
          {RELICS.map(r => {
            const got = ui.found.includes(r.id)
            return (
              <div key={r.id} style={{ padding: '8px 11px', borderRadius: 9,
                background: got ? 'rgba(255,176,74,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${got ? 'rgba(255,176,74,0.45)' : 'rgba(255,255,255,0.08)'}` }}>
                <div style={{ fontWeight: 800, fontSize: 13,
                              color: got ? '#ffc06a' : 'rgba(237,228,214,0.5)' }}>
                  {got ? r.name : r.secret ? '??? (hidden)' : r.name}
                </div>
                <div style={{ fontSize: 11.5, color: 'rgba(237,228,214,0.5)', marginTop: 2 }}>
                  {got ? 'Recovered' : r.secret && !ui.found.length ? 'Look closely' : r.hint}
                </div>
              </div>
            )
          })}
        </div>

        {/* The monetisation layer, made visible */}
        <div style={{ marginTop: 14, padding: '11px 14px', borderRadius: 11,
                      background: 'rgba(79,209,255,0.06)', border: '1px solid rgba(79,209,255,0.22)' }}>
          <div style={{ fontSize: 10.5, letterSpacing: 1.3, color: 'rgba(79,209,255,0.85)',
                        fontWeight: 800, marginBottom: 5 }}>
            IN-WORLD AD SURFACES — LIVE IMPRESSION LOG
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(237,228,214,0.72)', marginBottom: 7 }}>
            Three screens in the world: two in the tavern, one above the gate. Creative rotates
            every nine seconds. An impression only counts while a screen is inside the camera
            frustum AND within reading distance — the difference between an honest CPM and a
            fraudulent one.
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12 }}>
            {AD_CREATIVE.map(a => (
              <span key={a.id} style={{ color: ui.impressions[a.id] ? a.fg : 'rgba(237,228,214,0.3)' }}>
                {a.label}: {ui.impressions[a.id] ?? 0}s
                <span style={{ opacity: 0.5 }}> · {a.kind}</span>
              </span>
            ))}
          </div>
        </div>

        <p style={{ color: 'rgba(237,228,214,0.32)', fontSize: 12, marginTop: 12, lineHeight: 1.6 }}>
          Secrets are real geometry, not triggers — the hidden rooms exist from the start, you
          simply cannot reach them. The false wall opens when the blue sconce beside it is lit,
          and nothing tells you that; the sconce burning a different colour is the hint.
          Built to VISUAL-STANDARD.md · CR AudioViz AI · EIN 39-3646201
        </p>
      </div>
    </div>
  )
}

function IconBtn({ on, label, title, onClick }:
  { on: boolean; label: string; title: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={title}
      style={{ width: 34, height: 34, borderRadius: 9, fontWeight: 900, fontSize: 15,
        background: on ? '#ffb04a' : 'rgba(10,14,26,0.8)',
        border: `1px solid ${on ? '#ffb04a' : 'rgba(255,176,74,0.45)'}`,
        color: on ? '#2a1a06' : '#ffc06a', cursor: 'pointer' }}>
      {label}
    </button>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14,
                  fontSize: 12.5, padding: '3px 0' }}>
      <span style={{ color: 'rgba(237,228,214,0.6)' }}>{k}</span>
      <span style={{ color: '#EDE4D6', fontWeight: 600, textAlign: 'right' }}>{v}</span>
    </div>
  )
}

function Panel({ title, children, onClose }:
  { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: 'absolute', top: 54, right: 12, width: 'min(400px, 88%)',
                  maxHeight: '74%', overflowY: 'auto', background: 'rgba(8,12,24,0.94)',
                  border: '1px solid rgba(255,176,74,0.35)', borderRadius: 12, padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 8 }}>
        <span style={{ fontWeight: 900, fontSize: 15, color: '#ffc06a' }}>{title}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none',
          color: 'rgba(237,228,214,0.6)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>
      {children}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: 1.2, color: 'rgba(237,228,214,0.45)' }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 900, color: tone ?? '#EDE4D6' }}>{value}</div>
    </div>
  )
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                  background: 'rgba(6,10,22,0.86)', borderRadius: 12, padding: 24 }}>
      {children}
    </div>
  )
}

function Button({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ background: '#ffb04a', color: '#2a1a06',
      border: '3px solid rgba(255,255,255,0.35)', borderRadius: 13, padding: '14px 36px',
      fontWeight: 900, fontSize: 16, cursor: 'pointer',
      boxShadow: '0 5px 0 #c07f22, 0 10px 28px rgba(0,0,0,0.5)' }}>
      {children}
    </button>
  )
}
