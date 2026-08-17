'use client'
// app/play/emberfall/page.tsx — EMBERFALL
//
// Game two, built to VISUAL-STANDARD.md. The Vault proved the standard on
// exploration; this proves it on a scene with a threat in it.
//
// WHAT IS NEW HERE, AND WHY IT MATTERS
//
//   CHARACTERS. Raiders are articulated figures — torso, hood, two arms, two
//   legs — on a real walk cycle with counter-swinging arms and a torso bob. A
//   capsule sliding across the ground is the tell that nothing is animated.
//   They read as people at a hundred paces because of the silhouette: hood,
//   shoulders, a weapon held out from the body.
//
//   THE LIGHT IS THE MECHANIC. Braziers are point lights inside the geometry,
//   and they are also the defence — a raider inside the ring of a burning
//   brazier takes damage. Raiders douse them. So the scene going dark is not a
//   lighting effect, it is you losing.
//
//   THREE CACHES, REAL GEOMETRY. A cellar under the tavern, a roof reached off
//   the crates behind the smithy, a crypt behind the chapel altar. None is a
//   trigger volume. Each exists from the first frame and you simply have to
//   get to it.
//
//   IN-WORLD ADVERTISING, HONEST. Two screens in the tavern, one on the market
//   stall. An impression accrues only while a surface is inside the camera
//   frustum AND close enough to read, sampled four times a second — billing is
//   in seconds, so testing more often costs frames and buys nothing.
//
// New surfaces added to lib/g3d/tex.ts for this build and available to every
// game after it: cobble, plaster, iron.
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026
import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import {
  cobbleSurface, ironSurface, plasterSurface, roofSurface,
  stoneSurface, surfaced, woodSurface,
} from '@/lib/g3d/tex'

/** Five nights, each harder in a different way rather than just "more". */
interface Night { n: number; count: number; hp: number; speed: number; gap: number; note: string }
const NIGHTS: Night[] = [
  { n: 1, count: 6,  hp: 34, speed: 1.9, gap: 2.6, note: 'A probing raid. Few, slow, and they come straight down the road.' },
  { n: 2, count: 10, hp: 42, speed: 2.2, gap: 2.1, note: 'More of them, and they start going for the braziers.' },
  { n: 3, count: 15, hp: 52, speed: 2.5, gap: 1.7, note: 'They split. Watch the east lane as well as the gate.' },
  { n: 4, count: 21, hp: 64, speed: 2.8, gap: 1.35, note: 'Armoured. Two bolts each unless you hit the hood.' },
  { n: 5, count: 30, hp: 80, speed: 3.1, gap: 1.0, note: 'Everything they have left. Keep the fire lit or it ends here.' },
]

interface AdSlot { id: string; label: string; body: string; cta: string; bg: string; fg: string; kind: 'own' | 'affiliate' }
const AD_CREATIVE: AdSlot[] = [
  { id: 'javari-ai', label: 'JAVARI AI', body: 'Your creative studio.\nWriting, images, audio, code.',
    cta: 'craudiovizai.com', bg: '#0d2340', fg: '#4fd1ff', kind: 'own' },
  { id: 'spirits', label: 'JAVARI SPIRITS', body: 'Catalogue your collection.\nBourbon to sake.',
    cta: 'javarispirits.com', bg: '#2a1608', fg: '#f5b942', kind: 'own' },
  { id: 'zoyzy', label: 'ZOYZY', body: 'Find your home.\nKeep your agent\'s commission.',
    cta: 'zoyzy.com', bg: '#12301c', fg: '#7be495', kind: 'own' },
  { id: 'market', label: 'JAVARI MARKET', body: 'A million products.\nOne honest search.',
    cta: 'craudiovizai.com/market', bg: '#1c1030', fg: '#c9a6ff', kind: 'affiliate' },
  { id: 'veterans', label: 'JAVARI VETERANS', body: 'Benefits, resumes, business plans.\nFree, always.',
    cta: 'veterans.craudiovizai.com', bg: '#0f1c2e', fg: '#ffc23c', kind: 'own' },
]

interface Cache { id: string; name: string; effect: string; pos: [number, number, number] }
const CACHES: Cache[] = [
  { id: 'cellar', name: 'Fletcher\'s Cellar', effect: 'Quiver doubled — 24 bolts instead of 12.',
    pos: [-13.5, -3.2, 9.0] },
  { id: 'loft',   name: 'Smith\'s Roof Cache', effect: 'Bolts punch armour — full damage through plate.',
    pos: [13.4, 4.9, -8.0] },
  { id: 'crypt',  name: 'Chapel Crypt', effect: 'Braziers burn twice as long before they gutter.',
    pos: [0.0, 1.0, -19.4] },
]

/** Three escalating nudges each. A hint, a push, then the answer. */
const HINTS: Record<string, string[]> = {
  cellar: ['The tavern has more floor than it has room.',
           'Behind the bar, the boards are newer than the rest.',
           'Walk onto the open hatch behind the tavern bar. You drop in. Press E to climb out.'],
  loft:   ['The smith stacks his crates against the wall for a reason.',
           'Three crates behind the smithy, each a step higher than the last.',
           'Jump the crate stack behind the smithy and walk onto the roof.'],
  crypt:  ['A chapel altar stands away from the wall. Ask why.',
           'There is a gap behind the altar you can only see from the side.',
           'Walk round the back of the chapel altar and press E at the slab.'],
}

interface UiState {
  phase: 'title' | 'night' | 'dawn' | 'lost' | 'won'
  night: number
  beacon: number
  left: number
  bolts: number
  maxBolts: number
  reloading: boolean
  lit: number
  near: string
  caches: string[]
  impressions: Record<string, number>
  kills: number
}

export default function Emberfall() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const api = useRef<{ start: () => void; next: () => void } | null>(null)
  const [panel, setPanel] = useState<'' | 'help' | 'hints' | 'map'>('')
  const [revealed, setRevealed] = useState<Record<string, number>>({})
  const [ui, setUi] = useState<UiState>({
    phase: 'title', night: 1, beacon: 100, left: 0, bolts: 12, maxBolts: 12,
    reloading: false, lit: 0, near: '', caches: [], impressions: {}, kills: 0,
  })

  const sync = useCallback((u: Partial<UiState>) => { setUi(prev => ({ ...prev, ...u })) }, [])

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
    renderer.toneMappingExposure = 1.26
    renderer.outputColorSpace = THREE.SRGBColorSpace

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x0a1424, 0.026)
    const camera = new THREE.PerspectiveCamera(74, 1, 0.1, 300)

    // ── Surfaces ────────────────────────────────────────────────────────────
    const matCobble = surfaced(cobbleSurface('#7a7469'), 14)
    const matPlaster = surfaced(plasterSurface('#d6cdb6'), 2)
    const matStone = surfaced(stoneSurface('#9a9184'), 2)
    const matWood = surfaced(woodSurface('#6f4724'), 1)
    const matBeam = surfaced(woodSurface('#4a3018'), 1)
    const matRoof = surfaced(roofSurface('#7c3a2c'), 2)
    const matIron = surfaced(ironSurface('#5d6068'), 1, { metalness: 0.85, roughness: 0.6 })
    const matDirt = surfaced(cobbleSurface('#5a5044'), 30)

    // ── Night sky ───────────────────────────────────────────────────────────
    {
      const c = document.createElement('canvas'); c.width = 8; c.height = 256
      const g = c.getContext('2d')!
      const grad = g.createLinearGradient(0, 0, 0, 256)
      grad.addColorStop(0, '#03060f')
      grad.addColorStop(0.5, '#0b1730')
      grad.addColorStop(0.82, '#23304e')
      grad.addColorStop(1, '#4a3a44')
      g.fillStyle = grad; g.fillRect(0, 0, 8, 256)
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
      scene.add(new THREE.Mesh(new THREE.SphereGeometry(180, 32, 20),
        new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false })))
      // Stars, so the sky is not a flat gradient dome.
      const sp = new Float32Array(700 * 3)
      for (let i = 0; i < 700; i++) {
        const a = Math.random() * Math.PI * 2
        const y = Math.random() * 0.85 + 0.12
        const rr = Math.sqrt(1 - y * y) * 160
        sp[i * 3] = Math.cos(a) * rr; sp[i * 3 + 1] = y * 160; sp[i * 3 + 2] = Math.sin(a) * rr
      }
      const sg = new THREE.BufferGeometry()
      sg.setAttribute('position', new THREE.BufferAttribute(sp, 3))
      const stars = new THREE.Points(sg, new THREE.PointsMaterial({
        size: 0.7, color: 0xcfe0ff, fog: false, transparent: true, opacity: 0.85 }))
      scene.add(stars)
    }

    // Moonlight is the ONLY light from outside, and it is deliberately weak.
    // Everything readable in this scene is lit by something standing in it.
    const moon = new THREE.DirectionalLight(0x7d95cc, 0.55)
    moon.position.set(28, 40, 22)
    moon.castShadow = true
    moon.shadow.mapSize.set(2048, 2048)
    const mc = moon.shadow.camera
    mc.near = 1; mc.far = 140; mc.left = -42; mc.right = 42; mc.top = 42; mc.bottom = -42
    moon.shadow.bias = -0.0008; moon.shadow.normalBias = 0.04
    scene.add(moon)
    scene.add(new THREE.HemisphereLight(0x35507e, 0x140f0a, 0.34))

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), matDirt)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    scene.add(ground)

    const square = new THREE.Mesh(new THREE.PlaneGeometry(46, 46), matCobble)
    square.rotation.x = -Math.PI / 2
    square.position.y = 0.02
    square.receiveShadow = true
    scene.add(square)

    // ── Collision ───────────────────────────────────────────────────────────
    interface Box { x: number; z: number; hx: number; hz: number; top: number }
    const boxes: Box[] = []
    const solid = (x: number, z: number, hx: number, hz: number, top = 99) => {
      boxes.push({ x, z, hx, hz, top })
    }
    /** Blocked at a given height — a low crate is walkable if you are above it. */
    const blocked = (x: number, z: number, y: number, r: number) =>
      boxes.some(b => y < b.top - 0.05 && Math.abs(x - b.x) < b.hx + r && Math.abs(z - b.z) < b.hz + r)
    /** Highest surface under a point, so crates and roofs can be stood on. */
    const groundAt = (x: number, z: number, y: number) => {
      let h = 0
      for (const b of boxes) {
        if (b.top > 20) continue
        if (Math.abs(x - b.x) < b.hx + 0.2 && Math.abs(z - b.z) < b.hz + 0.2) {
          if (b.top <= y + 0.6 && b.top > h) h = b.top
        }
      }
      return h
    }

    // ── Fire sprite, shared ─────────────────────────────────────────────────
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

    // ── Braziers: the light AND the weapon ──────────────────────────────────
    interface Brazier {
      x: number; z: number; light: THREE.PointLight; flame: THREE.Sprite
      fuel: number; seed: number
    }
    const braziers: Brazier[] = []
    const BRAZIER_FUEL = 150
    const addBrazier = (x: number, z: number) => {
      const g = new THREE.Group()
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.5, 8), matIron)
      leg.position.y = 0.75; leg.castShadow = true; g.add(leg)
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.42, 0.5, 14), matIron)
      bowl.position.y = 1.7; bowl.castShadow = true; g.add(bowl)
      // A ring of tines around the bowl — silhouette detail, cheap.
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        const t = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.42, 0.07), matIron)
        t.position.set(Math.cos(a) * 0.68, 2.06, Math.sin(a) * 0.68)
        t.rotation.z = Math.cos(a) * 0.22; t.rotation.x = -Math.sin(a) * 0.22
        t.castShadow = true; g.add(t)
      }
      const flame = new THREE.Sprite(new THREE.SpriteMaterial({
        map: flameTex, blending: THREE.AdditiveBlending, depthWrite: false,
        transparent: true, color: 0xffb055 }))
      flame.scale.setScalar(2.2); flame.position.y = 2.4
      g.add(flame)
      const light = new THREE.PointLight(0xffa04a, 9, 17, 1.85)
      light.position.y = 2.3
      g.add(light)
      g.position.set(x, 0, z)
      scene.add(g)
      solid(x, z, 0.5, 0.5, 1.2)
      braziers.push({ x, z, light, flame, fuel: BRAZIER_FUEL, seed: Math.random() * 10 })
    }

    // ── Buildings ───────────────────────────────────────────────────────────
    /** Timber-framed house: plaster panels, exposed beams, tiled roof, lit window. */
    const house = (x: number, z: number, w: number, d: number, h: number, ry: number, window = true) => {
      const g = new THREE.Group()
      const shell = (sw: number, sh: number, sd: number, sx: number, sy: number, sz: number) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), matPlaster)
        m.position.set(sx, sy, sz); m.castShadow = true; m.receiveShadow = true
        g.add(m)
      }
      shell(w, h, 0.5, 0, h / 2, -d / 2)
      shell(w, h, 0.5, 0, h / 2, d / 2)
      shell(0.5, h, d, -w / 2, h / 2, 0)
      shell(0.5, h, d, w / 2, h / 2, 0)
      // Exposed framing. Without these it is a plastered box.
      for (const [bx, bz] of [[-w / 2, 0], [w / 2, 0]] as const) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.26, h, 0.26), matBeam)
        post.position.set(bx, h / 2, -d / 2); post.castShadow = true; g.add(post)
        const post2 = post.clone(); post2.position.z = d / 2; g.add(post2)
      }
      for (const yy of [h * 0.52, h - 0.2]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.22, 0.26), matBeam)
        rail.position.set(0, yy, -d / 2); rail.castShadow = true; g.add(rail)
        const rail2 = rail.clone(); rail2.position.z = d / 2; g.add(rail2)
      }
      const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.86, h * 0.6, 4), matRoof)
      roof.rotation.y = Math.PI / 4
      roof.position.y = h + h * 0.28
      roof.castShadow = true
      g.add(roof)
      if (window) {
        // A lit window is a light source inside the geometry, which is the
        // whole point — it puts a warm patch on the street outside.
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.1),
          new THREE.MeshStandardMaterial({ color: 0xffcf8a, emissive: 0xffb45a,
            emissiveIntensity: 2.4, roughness: 0.6 }))
        pane.position.set(0, h * 0.55, d / 2 + 0.27)
        g.add(pane)
        const wl = new THREE.PointLight(0xffb45a, 2.6, 9, 2)
        wl.position.set(0, h * 0.55, d / 2 + 1.1)
        g.add(wl)
      }
      g.position.set(x, 0, z)
      g.rotation.y = ry
      scene.add(g)
      // Collider uses the unrotated footprint; every house here sits on an axis.
      solid(x, z, w / 2, d / 2)
      return g
    }

    // The square, ringed with houses, gaps left for two lanes.
    house(-16, -6, 7, 6, 4.4, 0)
    house(-16, 2, 6, 5, 4.0, 0)
    house(-8, -17, 6, 5, 4.2, 0)
    house(8, -17, 6, 5, 4.6, 0)
    house(17, 2, 6, 6, 4.2, 0)
    house(17, 10, 6, 5, 4.0, 0)
    house(-8, 18, 6, 5, 4.2, 0)
    house(8, 18, 7, 5, 4.4, 0)

    // ── The beacon: what you are defending ──────────────────────────────────
    const beaconGroup = new THREE.Group()
    let beaconHp = 100
    const beaconLight = new THREE.PointLight(0xffd07a, 16, 34, 1.7)
    {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 1.0, 16), matStone)
      base.position.y = 0.5; base.castShadow = true; base.receiveShadow = true
      beaconGroup.add(base)
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3.4, 0.24), matIron)
        leg.position.set(Math.cos(a) * 1.15, 2.6, Math.sin(a) * 1.15)
        leg.rotation.z = -Math.cos(a) * 0.16
        leg.rotation.x = Math.sin(a) * 0.16
        leg.castShadow = true
        beaconGroup.add(leg)
      }
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 0.9, 0.9, 18), matIron)
      bowl.position.y = 4.5; bowl.castShadow = true
      beaconGroup.add(bowl)
      const fire = new THREE.Sprite(new THREE.SpriteMaterial({
        map: flameTex, blending: THREE.AdditiveBlending, depthWrite: false,
        transparent: true, color: 0xffc070 }))
      fire.scale.setScalar(5.4); fire.position.y = 5.6
      beaconGroup.add(fire)
      beaconLight.position.y = 5.2
      beaconGroup.add(beaconLight)
      scene.add(beaconGroup)
      solid(0, 0, 2.4, 2.4)
    }

    for (const [bx, bz] of [[-9, -9], [9, -9], [-9, 9], [9, 9], [0, -13], [0, 13]] as const) {
      addBrazier(bx, bz)
    }

    // ── The tavern, with a cellar under it ──────────────────────────────────
    const TAV = { x: -13.5, z: 9 }
    {
      const g = new THREE.Group()
      const wall = (w: number, h: number, d: number, x: number, y: number, z: number) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matPlaster)
        m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true
        g.add(m); solid(TAV.x + x, TAV.z + z, w / 2, d / 2)
      }
      wall(11, 4.6, 0.5, 0, 2.3, -4.5)
      wall(0.5, 4.6, 9, -5.5, 2.3, 0)
      wall(0.5, 4.6, 9, 5.5, 2.3, 0)
      wall(3.6, 4.6, 0.5, -3.7, 2.3, 4.5)
      wall(3.6, 4.6, 0.5, 3.7, 2.3, 4.5)
      const roof = new THREE.Mesh(new THREE.ConeGeometry(8.6, 3.4, 4), matRoof)
      roof.rotation.y = Math.PI / 4; roof.position.y = 6.2; roof.castShadow = true
      g.add(roof)
      const bar = new THREE.Mesh(new THREE.BoxGeometry(8, 1.15, 1.0), matWood)
      bar.position.set(0, 0.58, -2.2); bar.castShadow = true; bar.receiveShadow = true
      g.add(bar); solid(TAV.x, TAV.z - 2.2, 3.0, 0.5, 1.05)
      // The hatch: newer boards behind the bar. That is the only tell.
      const hatch = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7),
        surfaced(woodSurface('#9a6a34'), 1))
      hatch.rotation.x = -Math.PI / 2
      hatch.position.set(0, 0.04, -3.5)
      g.add(hatch)
      g.position.set(TAV.x, 0, TAV.z)
      scene.add(g)
      addBrazier(TAV.x - 6.4, TAV.z + 5.0)
      // The cellar itself, real geometry from the first frame.
      const cf = new THREE.Mesh(new THREE.BoxGeometry(9, 0.4, 8), matStone)
      cf.position.set(TAV.x, -4.0, TAV.z); cf.receiveShadow = true
      scene.add(cf)
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 4.2, 12, 1, true),
        new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 0.95, side: THREE.BackSide }))
      shaft.position.set(TAV.x, -1.9, TAV.z - 3.5)
      scene.add(shaft)
      const cl = new THREE.PointLight(0xffa04a, 5, 12, 2)
      cl.position.set(TAV.x + 2.6, -2.6, TAV.z)
      scene.add(cl)
    }

    // ── The smithy, with crates you can climb ───────────────────────────────
    const SMI = { x: 13.4, z: -8 }
    {
      const g = new THREE.Group()
      const wall = (w: number, h: number, d: number, x: number, y: number, z: number) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matStone)
        m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true
        g.add(m); solid(SMI.x + x, SMI.z + z, w / 2, d / 2, 4.6)
      }
      wall(8, 4.6, 0.5, 0, 2.3, -3.5)
      wall(0.5, 4.6, 7, -4, 2.3, 0)
      wall(0.5, 4.6, 7, 4, 2.3, 0)
      wall(8, 4.6, 0.5, 0, 2.3, 3.5)
      // Flat roof — that is what makes it reachable, and it is visibly flat.
      const roof = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.35, 7.6), matWood)
      roof.position.y = 4.75; roof.castShadow = true; roof.receiveShadow = true
      g.add(roof)
      solid(SMI.x, SMI.z, 4.3, 3.8, 4.95)
      // Forge, lighting the inside orange.
      const forge = new THREE.Mesh(new THREE.BoxGeometry(2, 1.2, 1.4), matStone)
      forge.position.set(-2, 0.6, -2.2); forge.castShadow = true; g.add(forge)
      const coals = new THREE.Sprite(new THREE.SpriteMaterial({
        map: flameTex, blending: THREE.AdditiveBlending, depthWrite: false,
        transparent: true, color: 0xff7a30 }))
      coals.scale.setScalar(1.5); coals.position.set(-2, 1.5, -2.2); g.add(coals)
      const fl = new THREE.PointLight(0xff6a28, 6, 11, 2)
      fl.position.set(-2, 1.6, -2.2); g.add(fl)
      const anvil = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 0.5), matIron)
      anvil.position.set(1.4, 1.0, -0.5); anvil.castShadow = true; g.add(anvil)
      const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.75, 10), matWood)
      stump.position.set(1.4, 0.38, -0.5); g.add(stump)
      g.position.set(SMI.x, 0, SMI.z)
      scene.add(g)
      // The staircase of crates. Three, each a step.
      const crate = (cx: number, cz: number, h: number) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(1.5, h, 1.5), matWood)
        m.position.set(cx, h / 2, cz); m.castShadow = true; m.receiveShadow = true
        scene.add(m); solid(cx, cz, 0.75, 0.75, h)
      }
      crate(SMI.x + 5.4, SMI.z + 2.2, 1.2)
      crate(SMI.x + 5.4, SMI.z + 0.6, 2.5)
      crate(SMI.x + 5.0, SMI.z - 0.9, 3.9)
      addBrazier(SMI.x - 5.6, SMI.z + 3.0)
    }

    // ── The chapel, with a crypt behind the altar ───────────────────────────
    {
      const g = new THREE.Group()
      const wall = (w: number, h: number, d: number, x: number, y: number, z: number) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matStone)
        m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true
        g.add(m); solid(x, -18 + z, w / 2, d / 2)
      }
      wall(10, 6, 0.6, 0, 3, -3.5)
      wall(0.6, 6, 7, -5, 3, 0)
      wall(0.6, 6, 7, 5, 3, 0)
      wall(3.2, 6, 0.6, -3.4, 3, 3.5)
      wall(3.2, 6, 0.6, 3.4, 3, 3.5)
      const roof = new THREE.Mesh(new THREE.ConeGeometry(8, 4.4, 4), matRoof)
      roof.rotation.y = Math.PI / 4; roof.position.y = 7.6; roof.castShadow = true
      g.add(roof)
      // A spire, for silhouette.
      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.7, 4.2, 8), matRoof)
      spire.position.set(0, 11.2, 0); spire.castShadow = true; g.add(spire)
      for (const sy of [3.6, 4.4]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(sy === 3.6 ? 0.22 : 1.1, sy === 3.6 ? 2.2 : 0.22, 0.22), matIron)
        arm.position.set(0, 13.6 + (sy === 3.6 ? 0 : 0.4), 0); g.add(arm)
      }
      // The altar stands away from the wall. That gap is the crypt.
      const altar = new THREE.Mesh(new THREE.BoxGeometry(3, 1.2, 1.2), matStone)
      altar.position.set(0, 0.6, -1.4); altar.castShadow = true; altar.receiveShadow = true
      g.add(altar); solid(0, -19.4, 1.5, 0.6, 1.25)
      const candles = new THREE.PointLight(0xffd9a0, 3.4, 9, 2)
      candles.position.set(0, 1.9, -1.4); g.add(candles)
      const cflame = new THREE.Sprite(new THREE.SpriteMaterial({
        map: flameTex, blending: THREE.AdditiveBlending, depthWrite: false,
        transparent: true, color: 0xffd9a0 }))
      cflame.scale.setScalar(0.9); cflame.position.set(0, 1.6, -1.4); g.add(cflame)
      g.position.set(0, 0, -18)
      scene.add(g)
      addBrazier(0, -13.2)
    }

    // ── The gate the raiders come through ───────────────────────────────────
    {
      for (const sx of [-4.6, 4.6]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(2.2, 8, 2.2), matStone)
        post.position.set(sx, 4, 26); post.castShadow = true; post.receiveShadow = true
        scene.add(post); solid(sx, 26, 1.1, 1.1)
        for (let i = 0; i < 3; i++) {
          const m = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 2.2), matStone)
          m.position.set(sx - 0.8 + i * 0.8, 8.4, 26); m.castShadow = true
          scene.add(m)
        }
      }
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(11.4, 1.4, 2.2), matStone)
      lintel.position.set(0, 8.7, 26); lintel.castShadow = true
      scene.add(lintel)
      // Curtain wall either side, with a broken stretch you can see through.
      for (const dir of [-1, 1]) {
        for (let i = 0; i < 9; i++) {
          if (dir === 1 && i === 4) continue
          const x = dir * (7 + i * 2.4)
          const m = new THREE.Mesh(new THREE.BoxGeometry(2.4, 5.2, 1.4), matStone)
          m.position.set(x, 2.6, 26); m.castShadow = true; m.receiveShadow = true
          scene.add(m); solid(x, 26, 1.2, 0.7)
          if (i % 2 === 0) {
            const cr = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 1.4), matStone)
            cr.position.set(x, 5.6, 26); cr.castShadow = true
            scene.add(cr)
          }
        }
      }
    }

    // ── In-world advertising ────────────────────────────────────────────────
    interface Screen { mesh: THREE.Mesh; ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture
                       slot: number; timer: number }
    const screens: Screen[] = []
    const impressions: Record<string, number> = {}

    const drawAd = (s: Screen) => {
      const a = AD_CREATIVE[s.slot % AD_CREATIVE.length]
      const g = s.ctx
      g.fillStyle = a.bg; g.fillRect(0, 0, 512, 288)
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
      g.strokeStyle = a.fg; g.lineWidth = 3
      g.strokeRect(6, 6, 500, 276)
      s.tex.needsUpdate = true
    }

    const addScreen = (x: number, y: number, z: number, ry: number) => {
      const c = document.createElement('canvas'); c.width = 512; c.height = 288
      const t = new THREE.CanvasTexture(c)
      t.colorSpace = THREE.SRGBColorSpace
      const m = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.8),
        new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff,
          emissiveIntensity: 0.9, roughness: 0.4 }))
      m.position.set(x, y, z); m.rotation.y = ry
      scene.add(m)
      const frame = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.1, 0.12), matWood)
      frame.position.set(x - 0.09 * Math.sin(ry), y, z - 0.09 * Math.cos(ry))
      frame.rotation.y = ry
      scene.add(frame)
      const gl = new THREE.PointLight(0x88bbff, 2.0, 7, 2)
      gl.position.set(x + 0.7 * Math.sin(ry), y, z + 0.7 * Math.cos(ry))
      scene.add(gl)
      const s: Screen = { mesh: m, ctx: c.getContext('2d')!, tex: t,
                          slot: Math.floor(Math.random() * AD_CREATIVE.length), timer: 0 }
      drawAd(s); screens.push(s)
    }
    addScreen(TAV.x - 5.2, 2.9, TAV.z - 1.2, Math.PI / 2)
    addScreen(TAV.x + 5.2, 2.9, TAV.z - 1.2, -Math.PI / 2)

    // Market stall, with the third screen above it.
    {
      const g = new THREE.Group()
      for (const sx of [-2.2, 2.2]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.6, 0.18), matWood)
        post.position.set(sx, 1.3, 0); post.castShadow = true; g.add(post)
      }
      const awn = new THREE.Mesh(new THREE.BoxGeometry(5, 0.12, 2.4), matWood)
      awn.position.y = 2.6; awn.rotation.x = 0.14; awn.castShadow = true; g.add(awn)
      const counter = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.0, 1.4), matWood)
      counter.position.y = 0.5; counter.castShadow = true; counter.receiveShadow = true
      g.add(counter)
      g.position.set(9.5, 0, 13.5)
      scene.add(g)
      solid(9.5, 13.5, 2.4, 0.8, 1.1)
      addScreen(9.5, 3.5, 12.6, 0)
    }

    // ── Raiders ─────────────────────────────────────────────────────────────
    // An articulated figure, not a capsule. Hood, shoulders, a weapon held out.
    interface Raider {
      g: THREE.Group
      hips: THREE.Group
      legL: THREE.Mesh; legR: THREE.Mesh
      armL: THREE.Mesh; armR: THREE.Mesh
      hood: THREE.Mesh
      alive: boolean
      hp: number
      maxHp: number
      x: number; z: number
      phase: number
      speed: number
      armoured: boolean
      dying: number
      target: Brazier | null
      swing: number
    }
    const matCloth = new THREE.MeshStandardMaterial({ color: 0x2e2a33, roughness: 0.94 })
    const matCloth2 = new THREE.MeshStandardMaterial({ color: 0x3a3128, roughness: 0.92 })
    const matSkin = new THREE.MeshStandardMaterial({ color: 0x8a6a52, roughness: 0.8 })
    const matPlate = new THREE.MeshStandardMaterial({ color: 0x53575f, roughness: 0.5, metalness: 0.75 })
    // Its own instance: setting side on the shared cloth would flip every panel.
    const matCape = new THREE.MeshStandardMaterial({ color: 0x2e2a33, roughness: 0.94, side: THREE.DoubleSide })

    const MAXR = 34
    const raiders: Raider[] = []
    const makeRaider = (): Raider => {
      const g = new THREE.Group()
      const hips = new THREE.Group()
      hips.position.y = 0.92
      g.add(hips)
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.78, 0.34), matCloth)
      torso.position.y = 0.39; torso.castShadow = true
      hips.add(torso)
      const belt = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.38), matCloth2)
      belt.position.y = 0.04; belt.castShadow = true; hips.add(belt)
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), matSkin)
      head.position.y = 0.94; hips.add(head)
      // The hood is what makes the silhouette read at distance.
      const hood = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.46, 8), matCloth)
      hood.position.y = 1.0; hood.castShadow = true
      hips.add(hood)
      const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.8), matCape)
      cape.position.set(0, 0.36, -0.2); cape.rotation.x = 0.12
      hips.add(cape)
      const mkArm = (sx: number) => {
        const a = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.66, 0.16), matCloth)
        a.geometry.translate(0, -0.33, 0)
        a.position.set(sx * 0.37, 0.72, 0)
        a.castShadow = true
        hips.add(a)
        return a
      }
      const armL = mkArm(-1)
      const armR = mkArm(1)
      // A cleaver in the right hand, held out from the body.
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.62, 0.03), matPlate)
      blade.position.set(0, -0.62, 0.1)
      armR.add(blade)
      const mkLeg = (sx: number) => {
        const l = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.86, 0.19), matCloth2)
        l.geometry.translate(0, -0.43, 0)
        l.position.set(sx * 0.16, 0, 0)
        l.castShadow = true
        hips.add(l)
        return l
      }
      const legL = mkLeg(-1)
      const legR = mkLeg(1)
      g.visible = false
      scene.add(g)
      return { g, hips, legL, legR, armL, armR, hood, alive: false, hp: 0, maxHp: 1,
               x: 0, z: 0, phase: Math.random() * 6, speed: 2, armoured: false,
               dying: 0, target: null, swing: 0 }
    }
    for (let i = 0; i < MAXR; i++) raiders.push(makeRaider())

    // ── Bolts ───────────────────────────────────────────────────────────────
    interface Bolt { m: THREE.Mesh; vx: number; vy: number; vz: number; life: number }
    const boltGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.7, 6)
    boltGeo.rotateX(Math.PI / 2)
    const boltMat = new THREE.MeshStandardMaterial({ color: 0xd8c9a4, roughness: 0.7 })
    const bolts: Bolt[] = []
    for (let i = 0; i < 24; i++) {
      const m = new THREE.Mesh(boltGeo, boltMat)
      m.visible = false
      scene.add(m)
      bolts.push({ m, vx: 0, vy: 0, vz: 0, life: 0 })
    }

    // ── Embers in the air ───────────────────────────────────────────────────
    const EN = 340
    const epos = new Float32Array(EN * 3)
    for (let i = 0; i < EN; i++) {
      epos[i * 3] = (Math.random() - 0.5) * 56
      epos[i * 3 + 1] = Math.random() * 16
      epos[i * 3 + 2] = (Math.random() - 0.5) * 56
    }
    const eg = new THREE.BufferGeometry()
    eg.setAttribute('position', new THREE.BufferAttribute(epos, 3))
    const embers = new THREE.Points(eg, new THREE.PointsMaterial({
      size: 0.13, map: flameTex, color: 0xff9a4a, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false }))
    embers.frustumCulled = false
    scene.add(embers)

    // ── Player ──────────────────────────────────────────────────────────────
    const P = { x: 0, y: 1.7, z: 14, yaw: 0, pitch: -0.04, vy: 0, below: false }
    const keys: Record<string, boolean> = {}
    const foundCaches = new Set<string>()
    let phase: UiState['phase'] = 'title'
    let nightIndex = 0
    let spawned = 0
    let spawnTimer = 0
    let kills = 0
    let killsTonight = 0
    let clock = 0
    let boltsLeft = 12
    let maxBolts = 12
    let reload = 0
    let pierce = false
    let longBurn = false

    const spawnPoints: [number, number][] = [[0, 27], [-2.5, 27], [2.5, 27], [16.6, 26]]

    const fire = () => {
      if (phase !== 'night' || reload > 0 || boltsLeft <= 0) return
      boltsLeft--
      reload = 0.85
      const b = bolts.find(x => x.life <= 0)
      if (!b) return
      const dir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation).normalize()
      b.m.position.copy(camera.position).addScaledVector(dir, 0.8)
      b.m.visible = true
      b.m.lookAt(b.m.position.clone().add(dir))
      b.vx = dir.x * 62; b.vy = dir.y * 62; b.vz = dir.z * 62
      b.life = 2.2
    }

    const relight = () => {
      for (const br of braziers) {
        if (Math.hypot(br.x - P.x, br.z - P.z) < 3.2 && br.fuel < BRAZIER_FUEL) {
          br.fuel = BRAZIER_FUEL * (longBurn ? 2 : 1)
        }
      }
    }

    const interact = () => {
      relight()
      // Climb out of the cellar.
      if (P.below && Math.hypot(P.x - TAV.x, P.z - (TAV.z - 3.5)) < 1.8) {
        P.below = false; P.y = 1.7
      }
      for (const c of CACHES) {
        if (foundCaches.has(c.id)) continue
        const d = Math.hypot(P.x - c.pos[0], P.z - c.pos[2], (P.y - c.pos[1]) * 0.55)
        if (d > 2.6) continue
        foundCaches.add(c.id)
        if (c.id === 'cellar') { maxBolts = 24; boltsLeft = 24 }
        if (c.id === 'loft') pierce = true
        if (c.id === 'crypt') {
          longBurn = true
          for (const br of braziers) br.fuel = BRAZIER_FUEL * 2
        }
      }
    }

    const kd = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      keys[k] = true
      if ([' ', 'w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault()
      if (k === 'e') interact()
      if (k === 'r' && boltsLeft < maxBolts && phase === 'night') { boltsLeft = maxBolts; reload = 1.6 }
    }
    const ku = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)

    // Look control three ways — locked mouse, click-drag, or arrow keys.
    let dragging = false
    let lastX = 0, lastY = 0
    let downAt = 0
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
    const onDown = (e: MouseEvent) => {
      dragging = true; lastX = e.clientX; lastY = e.clientY; downAt = performance.now()
    }
    const onUp = () => {
      // A short press is a shot; a drag is a look. Otherwise aiming fires.
      if (dragging && performance.now() - downAt < 220) fire()
      dragging = false
    }
    document.addEventListener('mousemove', onMove)
    canvas.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
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

    const beginNight = () => {
      const spec = NIGHTS[nightIndex]
      spawned = 0
      killsTonight = 0
      spawnTimer = 0.8
      boltsLeft = maxBolts
      for (const br of braziers) br.fuel = BRAZIER_FUEL * (longBurn ? 2 : 1)
      phase = 'night'
      sync({ phase: 'night', night: spec.n, left: spec.count, bolts: boltsLeft, maxBolts })
    }

    api.current = {
      start: () => { nightIndex = 0; beaconHp = 100; kills = 0; beginNight(); lock() },
      next: () => { nightIndex++; if (nightIndex < NIGHTS.length) beginNight() },
    }

    const frustum = new THREE.Frustum()
    const projScreen = new THREE.Matrix4()
    const tmpV = new THREE.Vector3()
    let raf = 0, last = performance.now(), uiTimer = 0, adTimer = 0

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      clock += dt
      const playing = phase === 'night' || phase === 'dawn'

      if (playing) {
        if (keys['arrowleft']) P.yaw += 1.8 * dt
        if (keys['arrowright']) P.yaw -= 1.8 * dt
        if (keys['arrowup']) P.pitch = Math.min(1.0, P.pitch + 1.2 * dt)
        if (keys['arrowdown']) P.pitch = Math.max(-1.2, P.pitch - 1.2 * dt)

        const sp = (keys['shift'] ? 8.4 : 5.0) * dt
        const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw)
        let dx = 0, dz = 0
        if (keys['w']) { dx -= fx * sp; dz -= fz * sp }
        if (keys['s']) { dx += fx * sp; dz += fz * sp }
        if (keys['a']) { dx -= fz * sp; dz += fx * sp }
        if (keys['d']) { dx += fz * sp; dz -= fx * sp }
        const feet = P.y - 1.7
        if (!blocked(P.x + dx, P.z, feet, 0.4)) P.x += dx
        if (!blocked(P.x, P.z + dz, feet, 0.4)) P.z += dz

        // Down the tavern hatch.
        if (!P.below && Math.hypot(P.x - TAV.x, P.z - (TAV.z - 3.5)) < 1.0) P.below = true

        const floorY = P.below ? -2.1 : groundAt(P.x, P.z, P.y - 1.7) + 1.7
        if (keys[' '] && Math.abs(P.y - floorY) < 0.14) P.vy = 6.9
        P.vy -= 22 * dt
        P.y += P.vy * dt
        if (P.y <= floorY) { P.y = floorY; P.vy = 0 }

        if (reload > 0) reload -= dt
      }

      camera.position.set(P.x, P.y, P.z)
      camera.rotation.set(0, 0, 0)
      camera.rotateY(P.yaw)
      camera.rotateX(P.pitch)

      // ── Braziers burn down and go dark ──
      let litCount = 0
      for (const b of braziers) {
        if (phase === 'night' && b.fuel > 0) b.fuel -= dt
        if (b.fuel > 0) {
          litCount++
          const f = 0.74 + Math.sin(clock * 10 + b.seed) * 0.14 + Math.random() * 0.06
          const dim = Math.min(1, b.fuel / 22)
          b.light.intensity = 9.5 * f * dim
          b.flame.scale.setScalar(2.2 * (0.9 + f * 0.35) * dim)
          b.flame.visible = true
        } else {
          b.light.intensity = 0
          b.flame.visible = false
        }
      }

      // ── Spawning ──
      if (phase === 'night') {
        const spec = NIGHTS[nightIndex]
        spawnTimer -= dt
        if (spawnTimer <= 0 && spawned < spec.count) {
          const slot = raiders.find(r => !r.alive && r.dying <= 0)
          if (slot) {
            const [sx, sz] = spawnPoints[spawned % (nightIndex >= 2 ? spawnPoints.length : 3)]
            slot.alive = true
            slot.maxHp = spec.hp
            slot.hp = spec.hp
            slot.speed = spec.speed * (0.88 + Math.random() * 0.26)
            slot.armoured = nightIndex >= 3 && Math.random() < 0.6
            slot.x = sx + (Math.random() - 0.5) * 3
            slot.z = sz + Math.random() * 2
            slot.dying = 0
            slot.swing = 0
            slot.target = null
            slot.g.visible = true
            slot.g.rotation.z = 0
            slot.hips.rotation.x = 0
            const body = slot.hips.children[0] as THREE.Mesh
            body.material = slot.armoured ? matPlate : matCloth
            spawned++
            spawnTimer = spec.gap
          }
        }
      }

      // ── Raiders ──
      let aliveCount = 0
      for (const r of raiders) {
        if (r.dying > 0) {
          r.dying -= dt
          r.g.rotation.z = Math.min(Math.PI / 2, r.g.rotation.z + dt * 4)
          r.g.position.y = Math.max(-1.2, r.g.position.y - dt * 0.5)
          if (r.dying <= 0) r.g.visible = false
          continue
        }
        if (!r.alive) continue
        aliveCount++

        // Target the nearest burning brazier if one is close, else the beacon.
        if (!r.target || r.target.fuel <= 0) {
          r.target = null
          let bestD = 15
          for (const b of braziers) {
            if (b.fuel <= 0) continue
            const d = Math.hypot(b.x - r.x, b.z - r.z)
            if (d < bestD) { bestD = d; r.target = b }
          }
        }
        const tx = r.target ? r.target.x : 0
        const tz = r.target ? r.target.z : 0
        const dist = Math.hypot(tx - r.x, tz - r.z)
        const stop = r.target ? 1.5 : 3.2

        if (dist > stop) {
          const ux = (tx - r.x) / dist, uz = (tz - r.z) / dist
          const step = r.speed * dt
          // Slide along walls rather than pressing into them.
          if (!blocked(r.x + ux * step, r.z, 0, 0.45)) r.x += ux * step
          else if (!blocked(r.x, r.z + uz * step * 1.4, 0, 0.45)) r.z += uz * step * 1.4
          if (!blocked(r.x, r.z + uz * step, 0, 0.45)) r.z += uz * step
          else if (!blocked(r.x + ux * step * 1.4, r.z, 0, 0.45)) r.x += ux * step * 1.4
          r.phase += dt * r.speed * 3.4
          // Walk cycle: legs opposed, arms counter-swinging, torso bobbing.
          const s = Math.sin(r.phase)
          r.legL.rotation.x = s * 0.72
          r.legR.rotation.x = -s * 0.72
          r.armL.rotation.x = -s * 0.5
          r.armR.rotation.x = s * 0.5 - 0.35
          r.hips.position.y = 0.92 + Math.abs(Math.cos(r.phase)) * 0.055
          r.hips.rotation.z = s * 0.05
        } else {
          // In range: swing.
          r.swing += dt * 4.2
          const s = Math.sin(r.swing)
          r.armR.rotation.x = -1.1 + s * 0.9
          r.armL.rotation.x = 0.2
          r.legL.rotation.x = 0; r.legR.rotation.x = 0
          if (s > 0.94) {
            if (r.target) r.target.fuel -= 34 * dt * 3
            else if (phase === 'night') beaconHp -= 5.5 * dt * 3
          }
        }
        r.g.position.set(r.x, 0, r.z)
        r.g.rotation.y = Math.atan2(tx - r.x, tz - r.z)

        // Standing in fire hurts.
        for (const b of braziers) {
          if (b.fuel <= 0) continue
          if (Math.hypot(b.x - r.x, b.z - r.z) < 4.2) r.hp -= 15 * dt
        }
        if (r.hp <= 0) {
          r.alive = false
          r.dying = 1.6
          kills++
          killsTonight++
          for (let i = 0; i < 6; i++) {
            const idx = Math.floor(Math.random() * EN)
            epos[idx * 3] = r.x; epos[idx * 3 + 1] = 0.9; epos[idx * 3 + 2] = r.z
          }
        }
      }

      // ── Bolts ──
      for (const b of bolts) {
        if (b.life <= 0) continue
        b.life -= dt
        b.vy -= 9 * dt
        b.m.position.x += b.vx * dt
        b.m.position.y += b.vy * dt
        b.m.position.z += b.vz * dt
        b.m.lookAt(b.m.position.x + b.vx, b.m.position.y + b.vy, b.m.position.z + b.vz)
        if (b.m.position.y < 0.05 || b.life <= 0) { b.life = 0; b.m.visible = false; continue }
        for (const r of raiders) {
          if (!r.alive) continue
          const dx = b.m.position.x - r.x
          const dz = b.m.position.z - r.z
          const dy = b.m.position.y - 1.35
          if (Math.abs(dx) < 0.45 && Math.abs(dz) < 0.45 && Math.abs(dy) < 0.95) {
            // A hood hit is a headshot. Armour halves everything else unless
            // the smith's cache has been found.
            const head = b.m.position.y > 1.72
            let dmg = head ? 90 : 40
            if (r.armoured && !head && !pierce) dmg *= 0.5
            r.hp -= dmg
            b.life = 0; b.m.visible = false
            break
          }
        }
      }

      // ── Phase transitions ──
      if (phase === 'night') {
        const spec = NIGHTS[nightIndex]
        if (beaconHp <= 0) {
          beaconHp = 0
          phase = 'lost'
          sync({ phase: 'lost', beacon: 0, kills })
        } else if (spawned >= spec.count && aliveCount === 0) {
          if (nightIndex >= NIGHTS.length - 1) {
            phase = 'won'
            sync({ phase: 'won', kills })
          } else {
            phase = 'dawn'
            sync({ phase: 'dawn', kills })
          }
        }
      }

      beaconLight.intensity = 5 + (beaconHp / 100) * 13 + Math.sin(clock * 6) * 0.9

      // ── Ads: rotate, and count only what is genuinely on screen ──
      adTimer += dt
      const testAds = adTimer > 0.25
      if (testAds) {
        adTimer = 0
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
        s.mesh.getWorldPosition(tmpV)
        if (tmpV.distanceTo(camera.position) < 14 && frustum.containsPoint(tmpV)) {
          const id = AD_CREATIVE[s.slot % AD_CREATIVE.length].id
          impressions[id] = (impressions[id] ?? 0) + 0.25
        }
      }

      // ── Embers ──
      const pa = eg.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < EN; i++) {
        epos[i * 3 + 1] += (0.45 + (i % 5) * 0.15) * dt
        epos[i * 3] += Math.sin(clock + i) * 0.006
        if (epos[i * 3 + 1] > 17) {
          epos[i * 3] = (Math.random() - 0.5) * 54
          epos[i * 3 + 1] = 0.4
          epos[i * 3 + 2] = (Math.random() - 0.5) * 54
        }
      }
      pa.needsUpdate = true

      // ── UI ──
      uiTimer += dt
      if (uiTimer > 0.2) {
        uiTimer = 0
        let near = ''
        for (const b of braziers) {
          if (Math.hypot(b.x - P.x, b.z - P.z) < 3.2 && b.fuel < BRAZIER_FUEL * 0.6) {
            near = 'Press E to feed the brazier'
          }
        }
        for (const c of CACHES) {
          if (foundCaches.has(c.id)) continue
          if (Math.hypot(P.x - c.pos[0], P.z - c.pos[2], (P.y - c.pos[1]) * 0.55) < 2.6) {
            near = `Press E — ${c.name}`
          }
        }
        const spec = NIGHTS[nightIndex]
        sync({
          beacon: Math.max(0, Math.round(beaconHp)),
          left: Math.max(0, spec.count - killsTonight),
          bolts: boltsLeft, maxBolts, reloading: reload > 0, lit: litCount,
          near, caches: Array.from(foundCaches), kills,
          impressions: Object.fromEntries(
            Object.entries(impressions).map(([k, v]) => [k, Math.round(v)])),
        })
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
      window.removeEventListener('mouseup', onUp)
      canvas.removeEventListener('mousedown', onDown)
      canvas.removeEventListener('dblclick', lock)
      renderer.dispose()
    }
  }, [sync])

  const begin = () => { api.current?.start() }
  const nextNight = () => { api.current?.next() }
  const spec = NIGHTS[Math.min(NIGHTS.length - 1, ui.night - 1)]

  return (
    <div style={{ minHeight: '100vh', background: '#070c16', color: '#EDE4D6',
                  fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 8, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: '-0.6px' }}>
            EMBER<span style={{ color: '#ffb04a' }}>FALL</span>
          </h1>
          <span style={{ color: 'rgba(237,228,214,0.6)', fontSize: 13 }}>
            Five nights. Keep the fire lit, or there is nothing to come back to.
          </span>
        </header>

        <div style={{ display: 'flex', gap: 20, fontSize: 13, marginBottom: 8, flexWrap: 'wrap' }}>
          <Stat label="NIGHT" value={`${ui.night} / ${NIGHTS.length}`} tone="#ffc06a" />
          <Stat label="BEACON" value={`${ui.beacon}%`} tone={ui.beacon > 40 ? '#7be495' : '#ff6b6b'} />
          <Stat label="BRAZIERS LIT" value={`${ui.lit} / 9`} tone="#ffa04a" />
          <Stat label="BOLTS" value={ui.reloading ? '—' : `${ui.bolts} / ${ui.maxBolts}`} tone="#6fd8ff" />
          <Stat label="FELLED" value={String(ui.kills)} />
          <Stat label="CACHES" value={`${ui.caches.length} / 3`} tone="#c9a6ff" />
        </div>

        <div style={{ position: 'relative' }}>
          <canvas ref={canvasRef} style={{ display: 'block', borderRadius: 12,
            border: '1px solid rgba(255,176,74,0.22)', boxShadow: '0 18px 50px rgba(0,0,0,0.6)',
            cursor: ui.phase === 'night' ? 'crosshair' : 'pointer' }} />

          {/* Always one click away, exactly as the Vault does it. */}
          {(ui.phase === 'night' || ui.phase === 'dawn') && (
            <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 7 }}>
              <IconBtn on={panel === 'help'} label="?" title="Controls and rules"
                       onClick={() => setPanel(p => p === 'help' ? '' : 'help')} />
              <IconBtn on={panel === 'hints'} label="!" title="Hints toward the caches"
                       onClick={() => setPanel(p => p === 'hints' ? '' : 'hints')} />
              <IconBtn on={panel === 'map'} label="◱" title="Town map"
                       onClick={() => setPanel(p => p === 'map' ? '' : 'map')} />
            </div>
          )}

          {ui.phase === 'night' && (
            <div style={{ position: 'absolute', left: '50%', top: '50%', width: 18, height: 18,
                          marginLeft: -9, marginTop: -9, pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', left: 8, top: 0, width: 2, height: 6,
                            background: 'rgba(255,255,255,0.65)' }} />
              <div style={{ position: 'absolute', left: 8, bottom: 0, width: 2, height: 6,
                            background: 'rgba(255,255,255,0.65)' }} />
              <div style={{ position: 'absolute', top: 8, left: 0, height: 2, width: 6,
                            background: 'rgba(255,255,255,0.65)' }} />
              <div style={{ position: 'absolute', top: 8, right: 0, height: 2, width: 6,
                            background: 'rgba(255,255,255,0.65)' }} />
            </div>
          )}

          {ui.near && (ui.phase === 'night' || ui.phase === 'dawn') && (
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 22, textAlign: 'center',
                          pointerEvents: 'none' }}>
              <span style={{ display: 'inline-block', background: 'rgba(10,14,26,0.84)',
                             border: '1px solid rgba(255,176,74,0.35)', borderRadius: 10,
                             padding: '8px 16px', color: '#ffc06a', fontWeight: 700, fontSize: 13.5 }}>
                {ui.near}
              </span>
            </div>
          )}

          {panel === 'help' && (
            <Panel title="How Emberfall works" onClose={() => setPanel('')}>
              <Row k="Move" v="W A S D · shift to run · space to jump" />
              <Row k="Look" v="Drag the view, arrow keys, or double-click to lock the mouse" />
              <Row k="Shoot" v="Click. A hood hit kills outright." />
              <Row k="Reload" v="R, or wait — you reload automatically each night" />
              <Row k="Interact" v="E — feed a brazier, open a cache, climb out of the cellar" />
              <p style={{ fontSize: 12.5, color: 'rgba(237,228,214,0.72)', marginTop: 10, lineHeight: 1.6 }}>
                Braziers are your defence. A raider standing inside the firelight burns.
                They know that, so they go for the braziers first — feed one with E before
                it gutters. If the beacon in the square falls, the night is lost.
              </p>
            </Panel>
          )}

          {panel === 'hints' && (
            <Panel title="Three caches" onClose={() => setPanel('')}>
              {CACHES.map(c => {
                const got = ui.caches.includes(c.id)
                const step = revealed[c.id] ?? 0
                return (
                  <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ fontWeight: 800, fontSize: 13,
                                  color: got ? '#7be495' : '#ffc06a' }}>
                      {got ? c.name : 'Unfound cache'}
                    </div>
                    {got ? (
                      <div style={{ fontSize: 12, color: 'rgba(237,228,214,0.7)' }}>{c.effect}</div>
                    ) : (
                      <>
                        {HINTS[c.id].slice(0, step).map((h, i) => (
                          <div key={i} style={{ fontSize: 12, color: 'rgba(237,228,214,0.66)', marginTop: 3 }}>
                            {h}
                          </div>
                        ))}
                        {step < 3 && (
                          <button onClick={() => setRevealed(r => ({ ...r, [c.id]: step + 1 }))}
                            style={{ marginTop: 5, background: 'rgba(255,176,74,0.12)',
                              border: '1px solid rgba(255,176,74,0.4)', color: '#ffc06a',
                              borderRadius: 7, padding: '4px 10px', fontSize: 11.5, cursor: 'pointer' }}>
                            {step === 0 ? 'A nudge' : step === 1 ? 'More' : 'Just tell me'}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </Panel>
          )}

          {panel === 'map' && (
            <Panel title="The town" onClose={() => setPanel('')}>
              <pre style={{ fontSize: 11, lineHeight: 1.45, color: 'rgba(237,228,214,0.82)',
                            margin: 0, fontFamily: 'ui-monospace, monospace' }}>{`        C H A P E L
             |
   [ ]     brazier     [ ]
        \\     |     /
  TAVERN --- BEACON --- SMITHY
   (cellar)   |      (crates→roof)
        /     |     \\
   [ ]     brazier   STALL
             |
        T H E   G A T E
        raiders come here`}</pre>
              <p style={{ fontSize: 12, color: 'rgba(237,228,214,0.62)', marginTop: 8 }}>
                Nine braziers ring the square. From night three they also come down the
                east lane, past the smithy.
              </p>
            </Panel>
          )}

          {ui.phase === 'title' && (
            <Overlay>
              <h2 style={{ fontSize: 32, margin: '0 0 6px', color: '#fff' }}>Emberfall</h2>
              <p style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 540, margin: '0 0 8px' }}>
                <b>WASD</b> walk · <b>drag</b> or <b>arrows</b> to look · <b>click</b> to shoot ·
                <b> E</b> to feed a brazier · <b>shift</b> run · <b>space</b> jump
              </p>
              <p style={{ color: 'rgba(255,255,255,0.55)', maxWidth: 540, margin: '0 0 20px', fontSize: 13 }}>
                Five nights of raiders come through the gate for the beacon in the square.
                The braziers are your walls — anything standing in the firelight burns, which
                is why they go for the braziers first. Three caches are hidden in the town,
                and none of them is marked.
              </p>
              <Button onClick={begin}>Hold the square</Button>
            </Overlay>
          )}

          {ui.phase === 'dawn' && (
            <Overlay>
              <h2 style={{ fontSize: 28, margin: '0 0 4px', color: '#ffc06a' }}>
                Night {ui.night} held
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.78)', maxWidth: 500, margin: '0 0 6px' }}>
                Beacon at {ui.beacon}% · {ui.kills} felled · {ui.caches.length} of 3 caches found
              </p>
              <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: 500, margin: '0 0 20px', fontSize: 13 }}>
                {NIGHTS[Math.min(NIGHTS.length - 1, ui.night)]?.note}
              </p>
              <Button onClick={nextNight}>Night {ui.night + 1}</Button>
            </Overlay>
          )}

          {ui.phase === 'lost' && (
            <Overlay>
              <h2 style={{ fontSize: 30, margin: '0 0 6px', color: '#ff6b6b' }}>The beacon is out</h2>
              <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0 0 20px' }}>
                Night {ui.night} · {ui.kills} felled
              </p>
              <Button onClick={() => window.location.reload()}>Again</Button>
            </Overlay>
          )}

          {ui.phase === 'won' && (
            <Overlay>
              <h2 style={{ fontSize: 30, margin: '0 0 6px', color: '#ffc06a' }}>Five nights held</h2>
              <p style={{ color: 'rgba(255,255,255,0.85)', margin: '0 0 20px' }}>
                {ui.kills} felled · beacon at {ui.beacon}% · {ui.caches.length} of 3 caches
              </p>
              <Button onClick={() => window.location.reload()}>Again</Button>
            </Overlay>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
                      gap: 7, marginTop: 12 }}>
          {NIGHTS.map(n => {
            const done = ui.night > n.n || ui.phase === 'won'
            const now = ui.night === n.n && ui.phase !== 'won'
            return (
              <div key={n.n} style={{ padding: '8px 11px', borderRadius: 9,
                background: now ? 'rgba(255,176,74,0.14)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${now ? 'rgba(255,176,74,0.5)' : 'rgba(255,255,255,0.08)'}` }}>
                <div style={{ fontWeight: 800, fontSize: 13,
                              color: done ? '#7be495' : now ? '#ffc06a' : 'rgba(237,228,214,0.45)' }}>
                  Night {n.n}{done ? ' · held' : ''}
                </div>
                <div style={{ fontSize: 11.5, color: 'rgba(237,228,214,0.5)', marginTop: 2 }}>{n.note}</div>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: 14, padding: '11px 14px', borderRadius: 11,
                      background: 'rgba(79,209,255,0.06)', border: '1px solid rgba(79,209,255,0.22)' }}>
          <div style={{ fontSize: 10.5, letterSpacing: 1.3, color: 'rgba(79,209,255,0.85)',
                        fontWeight: 800, marginBottom: 5 }}>
            IN-WORLD AD SURFACES — LIVE IMPRESSION LOG
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(237,228,214,0.72)', marginBottom: 7 }}>
            Two screens in the tavern, one over the market stall. Creative rotates every nine
            seconds. An impression accrues only while a screen is inside the camera frustum
            AND within reading distance — the difference between an honest CPM and a
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
          {spec.note} · Raiders are articulated figures on a real walk cycle, not sliding
          capsules · the caches exist as geometry from the first frame · new cobble, plaster
          and iron surfaces added to lib/g3d/tex.ts for every game after this one ·
          Built to VISUAL-STANDARD.md · CR AudioViz AI · EIN 39-3646201
        </p>
      </div>
    </div>
  )
}

function IconBtn({ on, label, title, onClick }:
  { on: boolean; label: string; title: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={title} aria-label={title}
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
        <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none',
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
