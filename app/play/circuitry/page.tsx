'use client'
// app/play/circuitry/page.tsx — Circuitry, drawn in real 3D
//
// Built on lib/g3d/stage: WebGL2, PBR materials, shadow-mapped three-point
// lighting, ACES filmic tone mapping and a GPU particle field. The board is a
// physical object — a milled substrate with raised copper traces that catch the
// key light, bridges that genuinely pass over one another, and current that
// travels as emissive material plus particle flow.
//
// The simulation in engine.ts has no idea any of this exists. It is handed
// clicks and time; everything below decides how that looks.
//
// Input is pointer or keyboard. The keyboard cursor is not a courtesy: a puzzle
// that can only be played by aiming a mouse at small targets is not WCAG 2.2 AA.
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026
import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { ParticleField, Stage, glowMaterial, makeGlowTexture, metalMaterial } from '@/lib/g3d/stage'
import {
  COLOURS, COLOUR_NAMES, LEVEL_COUNT, SHORT_COLOUR, State,
  newState, rotate, sinkLit, startLevel, step,
} from './engine'

/** World units per board cell. */
const CELL = 2.6
const BEST_KEY = 'circuitry.best'

interface Arm {
  mesh: THREE.Mesh
  /** Direction index at rotation zero. */
  dir: number
}

interface CellView {
  idx: number
  group: THREE.Group
  pad: THREE.Mesh
  arms: Arm[]
  hub: THREE.Mesh | null
  marker: THREE.Mesh | null
}

interface UiState {
  phase: State['phase']
  level: number
  moves: number
  par: number
  elapsed: number
  score: number
  best: number
  lit: number
  sinks: number
}

export default function Circuitry3D() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ref = useRef<State | null>(null)
  const cursor = useRef({ x: 0, y: 0 })
  const [ui, setUi] = useState<UiState>({
    phase: 'ready', level: 1, moves: 0, par: 0, elapsed: 0,
    score: 0, best: 0, lit: 0, sinks: 0,
  })

  const sync = useCallback(() => {
    const s = ref.current
    if (!s) return
    let lit = 0
    for (let i = 0; i < s.sinkIdx.length; i++) if (sinkLit(s.tiles[s.sinkIdx[i]])) lit++
    setUi({
      phase: s.phase, level: s.level, moves: s.moves, par: s.par,
      elapsed: s.elapsed, score: s.score, best: s.best,
      lit, sinks: s.sinkIdx.length,
    })
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let best = 0
    try { best = Number(window.localStorage.getItem(BEST_KEY) ?? 0) || 0 } catch { best = 0 }
    ref.current = newState(best)

    const stage = new Stage(canvas, {
      fov: 40,
      exposure: 1.12,
      key: 0xfff0dc,
      fill: 0x5fd2ff,
      rim: 0x2bffb0,
      fog: { colour: 0x030a0d, near: 34, far: 130 },
    })
    if (!stage.ok) { setUi(u => ({ ...u, phase: 'ready' })); return }

    const reduceMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // ── Shared materials. One instance each, swapped by reference per frame ──
    const substrate = new THREE.MeshStandardMaterial({ color: 0x08251c, roughness: 0.58, metalness: 0.5 })
    const padMat = metalMaterial(0x123a30, 0.5, 0.75)
    const padLockMat = metalMaterial(0x3a2a12, 0.45, 0.85)
    const padHoverMat = metalMaterial(0x1d5c4c, 0.34, 0.85)
    const traceDead = metalMaterial(0x35525c, 0.42, 0.95)
    const traceShort = glowMaterial(SHORT_COLOUR, 3.2)
    const traceLive = COLOURS.map(c => glowMaterial(c, 2.7))
    const coreLive = COLOURS.map(c => glowMaterial(c, 4.2))
    const boltMat = metalMaterial(0xc9a227, 0.3, 1)

    // ── Geometry, shared across every cell ──────────────────────────────────
    const padGeo = new THREE.BoxGeometry(2.3, 0.14, 2.3)
    const armNS = new THREE.BoxGeometry(0.34, 0.17, 1.32)
    const armEW = new THREE.BoxGeometry(1.32, 0.17, 0.34)
    const hubGeo = new THREE.CylinderGeometry(0.36, 0.4, 0.24, 18)
    const bridgeHigh = new THREE.BoxGeometry(0.34, 0.18, 2.62)
    const bridgeLow = new THREE.BoxGeometry(2.62, 0.18, 0.34)
    const pillarGeo = new THREE.BoxGeometry(0.26, 0.34, 0.26)
    const sourceGeo = new THREE.IcosahedronGeometry(0.46, 1)
    const sourceRing = new THREE.TorusGeometry(0.72, 0.09, 10, 26)
    const sinkGeo = new THREE.TorusGeometry(0.62, 0.13, 12, 28)
    const sinkCore = new THREE.CylinderGeometry(0.42, 0.42, 0.1, 20)
    const ampGeo = new THREE.OctahedronGeometry(0.5, 0)
    const boltGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.16, 8)

    const glowTex = makeGlowTexture()
    const particles = new ParticleField(2200, glowTex, 0.62)
    stage.scene.add(particles.points)

    // Selection ring, moved to whichever cell has focus.
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.18, 0.05, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0x7bffd8, transparent: true, opacity: 0.85 }),
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.42
    ring.visible = false
    stage.scene.add(ring)

    const boardRoot = new THREE.Group()
    stage.scene.add(boardRoot)

    let views: CellView[] = []
    let builtFor: State['tiles'] | null = null
    let boardW = 0
    let boardH = 0

    const cellX = (cx: number, cols: number) => (cx - (cols - 1) / 2) * CELL
    const cellZ = (cy: number, rows: number) => (cy - (rows - 1) / 2) * CELL

    /** Direction index to a local offset. North is negative z. */
    const offset = (d: number, dist: number): [number, number] => {
      if (d === 0) return [0, -dist]
      if (d === 1) return [dist, 0]
      if (d === 2) return [0, dist]
      return [-dist, 0]
    }

    // Geometry and materials are shared and disposed once at teardown, so a
    // level change only has to detach the previous board's nodes.
    function clearBoard(): void {
      while (boardRoot.children.length > 0) boardRoot.remove(boardRoot.children[0])
      views = []
    }

    function buildBoard(s: State): void {
      clearBoard()
      const { cols, rows, tiles } = s
      boardW = cols * CELL
      boardH = rows * CELL

      const slab = new THREE.Mesh(new THREE.BoxGeometry(boardW + 1.6, 0.7, boardH + 1.6), substrate)
      slab.position.y = -0.36
      slab.receiveShadow = true
      boardRoot.add(slab)

      // A bright lip around the substrate so the board reads as an object with
      // a thickness rather than a texture floating in fog.
      const lipMat = new THREE.MeshStandardMaterial({
        color: 0x0d6b57, emissive: 0x0a4437, emissiveIntensity: 1.4,
        roughness: 0.5, metalness: 0.4,
      })
      for (const spec of [
        [boardW + 1.8, 0.1, 0.16, 0, (boardH + 1.7) / 2],
        [boardW + 1.8, 0.1, 0.16, 0, -(boardH + 1.7) / 2],
        [0.16, 0.1, boardH + 1.8, (boardW + 1.7) / 2, 0],
        [0.16, 0.1, boardH + 1.8, -(boardW + 1.7) / 2, 0],
      ]) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(spec[0], spec[1], spec[2]), lipMat)
        bar.position.set(spec[3], -0.04, spec[4])
        boardRoot.add(bar)
      }

      for (let idx = 0; idx < tiles.length; idx++) {
        const t = tiles[idx]
        if (t.kind === 'blank') continue
        const cx = idx % cols
        const cy = (idx / cols) | 0
        const g = new THREE.Group()
        g.position.set(cellX(cx, cols), 0, cellZ(cy, rows))

        const pad = new THREE.Mesh(padGeo, t.locked ? padLockMat : padMat)
        pad.position.y = 0.07
        pad.receiveShadow = true
        pad.castShadow = true
        g.add(pad)

        const arms: Arm[] = []
        let hub: THREE.Mesh | null = null
        let marker: THREE.Mesh | null = null

        if (t.kind === 'bridge') {
          // Two independent runs, one physically above the other.
          const high = new THREE.Mesh(bridgeHigh, traceDead)
          high.position.y = 0.5
          high.castShadow = true
          g.add(high)
          arms.push({ mesh: high, dir: 0 })

          const low = new THREE.Mesh(bridgeLow, traceDead)
          low.position.y = 0.19
          low.castShadow = true
          g.add(low)
          arms.push({ mesh: low, dir: 1 })

          for (const sx of [-1, 1]) {
            const pillar = new THREE.Mesh(pillarGeo, metalMaterial(0x2a4650, 0.5, 0.9))
            pillar.position.set(0, 0.31, sx * 1.05)
            pillar.castShadow = true
            g.add(pillar)
          }
        } else {
          for (let d = 0; d < 4; d++) {
            if ((t.base & (1 << d)) === 0) continue
            const mesh = new THREE.Mesh(d % 2 === 0 ? armNS : armEW, traceDead)
            const [ox, oz] = offset(d, 0.66)
            mesh.position.set(ox, 0.19, oz)
            mesh.castShadow = true
            g.add(mesh)
            arms.push({ mesh, dir: d })
          }
          hub = new THREE.Mesh(hubGeo, traceDead)
          hub.position.y = 0.22
          hub.castShadow = true
          g.add(hub)
        }

        if (t.kind === 'source') {
          const core = new THREE.Mesh(sourceGeo, coreLive[t.colour])
          core.position.y = 0.82
          g.add(core)
          const halo = new THREE.Mesh(sourceRing, traceLive[t.colour])
          halo.rotation.x = -Math.PI / 2
          halo.position.y = 0.5
          g.add(halo)
          marker = core
        } else if (t.kind === 'sink') {
          const socket = new THREE.Mesh(sinkGeo, traceDead)
          socket.rotation.x = -Math.PI / 2
          socket.position.y = 0.42
          socket.castShadow = true
          g.add(socket)
          const disc = new THREE.Mesh(sinkCore, traceDead)
          disc.position.y = 0.34
          g.add(disc)
          marker = socket
        } else if (t.kind === 'amp') {
          const node = new THREE.Mesh(ampGeo, traceDead)
          node.position.y = 0.78
          node.castShadow = true
          g.add(node)
          marker = node
        }

        if (t.locked && t.kind !== 'bridge') {
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
            const bolt = new THREE.Mesh(boltGeo, boltMat)
            bolt.position.set(sx * 0.94, 0.16, sz * 0.94)
            g.add(bolt)
          }
        }

        boardRoot.add(g)
        views.push({ idx, group: g, pad, arms, hub, marker })
      }

      builtFor = tiles
      // Frame the board: pull back far enough that the widest row still fits.
      const span = Math.max(boardW, boardH)
      stage.camera.position.set(0, span * 1.02 + 6, span * 0.82 + 5)
      stage.camera.lookAt(0, 0, 0)
      cursor.current = { x: (cols / 2) | 0, y: (rows / 2) | 0 }
    }

    buildBoard(ref.current)

    // ── Sizing ──────────────────────────────────────────────────────────────
    let W = 900
    let H = 560
    const resize = () => {
      const r = canvas.parentElement?.getBoundingClientRect()
      W = Math.min(1100, r ? Math.max(280, r.width - 8) : 900)
      H = Math.round(W * 0.62)
      canvas.style.width = `${W}px`
      canvas.style.height = `${H}px`
      stage.resize(W, H)
    }
    resize()
    window.addEventListener('resize', resize)

    // ── Input ───────────────────────────────────────────────────────────────
    const ndc = new THREE.Vector2()
    const ray = new THREE.Raycaster()
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const hit = new THREE.Vector3()
    let hover = -1
    let parallaxX = 0
    let parallaxY = 0

    const cellAt = (clientX: number, clientY: number): number => {
      const s = ref.current
      if (!s) return -1
      const r = canvas.getBoundingClientRect()
      ndc.x = ((clientX - r.left) / r.width) * 2 - 1
      ndc.y = -((clientY - r.top) / r.height) * 2 + 1
      ray.setFromCamera(ndc, stage.camera)
      if (!ray.ray.intersectPlane(plane, hit)) return -1
      const cx = Math.round(hit.x / CELL + (s.cols - 1) / 2)
      const cy = Math.round(hit.z / CELL + (s.rows - 1) / 2)
      if (cx < 0 || cy < 0 || cx >= s.cols || cy >= s.rows) return -1
      const idx = cy * s.cols + cx
      return s.tiles[idx].kind === 'blank' ? -1 : idx
    }

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      parallaxX = ((e.clientX - r.left) / r.width - 0.5) * 2
      parallaxY = ((e.clientY - r.top) / r.height - 0.5) * 2
      hover = cellAt(e.clientX, e.clientY)
      const s = ref.current
      if (hover >= 0 && s) {
        cursor.current = { x: hover % s.cols, y: (hover / s.cols) | 0 }
      }
      canvas.style.cursor = hover >= 0 && s && !s.tiles[hover].locked ? 'pointer' : 'default'
    }
    const onLeave = () => { hover = -1; parallaxX = 0; parallaxY = 0 }
    const onDown = (e: PointerEvent) => {
      const s = ref.current
      if (!s) return
      const idx = cellAt(e.clientX, e.clientY)
      if (idx < 0) return
      if (rotate(s, idx)) {
        burstAt(idx, s, 12)
        sync()
      }
      canvas.focus()
    }

    const onKey = (e: KeyboardEvent) => {
      const s = ref.current
      if (!s) return
      const k = e.key.toLowerCase()
      let handled = true
      if (k === 'arrowup' || k === 'w') cursor.current.y = Math.max(0, cursor.current.y - 1)
      else if (k === 'arrowdown' || k === 's') cursor.current.y = Math.min(s.rows - 1, cursor.current.y + 1)
      else if (k === 'arrowleft' || k === 'a') cursor.current.x = Math.max(0, cursor.current.x - 1)
      else if (k === 'arrowright' || k === 'd') cursor.current.x = Math.min(s.cols - 1, cursor.current.x + 1)
      else if (k === ' ' || k === 'enter') {
        const idx = cursor.current.y * s.cols + cursor.current.x
        if (rotate(s, idx)) { burstAt(idx, s, 12); sync() }
      } else handled = false
      if (handled) e.preventDefault()
    }

    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerleave', onLeave)
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('keydown', onKey)

    // ── Particle helpers ────────────────────────────────────────────────────
    const tmpColour = new THREE.Color()

    function burstAt(idx: number, s: State, count: number, colourIdx = -1): void {
      const cx = idx % s.cols
      const cy = (idx / s.cols) | 0
      const x = cellX(cx, s.cols)
      const z = cellZ(cy, s.rows)
      tmpColour.setHex(colourIdx >= 0 ? COLOURS[colourIdx] : 0x9fe8ff)
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2
        const sp = 1.4 + Math.random() * 3.4
        particles.emit(
          x, 0.5, z,
          Math.cos(a) * sp, 1.2 + Math.random() * 2.6, Math.sin(a) * sp,
          tmpColour.r, tmpColour.g, tmpColour.b, 0.5 + Math.random() * 0.5,
        )
      }
    }

    // ── Frame loop ──────────────────────────────────────────────────────────
    let raf = 0
    let last = performance.now()
    let uiClock = 0

    const frame = (now: number) => {
      const s = ref.current
      if (!s) { raf = requestAnimationFrame(frame); return }
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      if (s.tiles !== builtFor) buildBoard(s)

      // step() clears the flag, so read it first.
      const celebrate = s.justSolved
      step(s, dt)

      for (let v = 0; v < views.length; v++) {
        const view = views[v]
        const t = s.tiles[view.idx]

        // Logical rotation, with the spin lag easing the mesh into place.
        view.group.rotation.y = -t.rot * (Math.PI / 2) + t.spin

        const focused = cursor.current.y * s.cols + cursor.current.x === view.idx
        view.pad.material = t.locked ? padLockMat : (focused ? padHoverMat : padMat)

        for (let a = 0; a < view.arms.length; a++) {
          const arm = view.arms[a]
          const dir = (arm.dir + t.rot) % 4
          const grp = t.kind === 'bridge' ? dir % 2 : 0
          const lv = grp === 0 ? t.live : t.liveB
          arm.mesh.material = lv >= 0 ? traceLive[lv] : (t.shorted ? traceShort : traceDead)
        }
        if (view.hub) {
          view.hub.material = t.live >= 0 ? traceLive[t.live] : (t.shorted ? traceShort : traceDead)
        }

        if (view.marker) {
          if (t.kind === 'source') {
            view.marker.rotation.y += dt * 1.1
            view.marker.rotation.x += dt * 0.6
            const p = 1 + Math.sin(s.flow * 3 + view.idx) * 0.07
            view.marker.scale.setScalar(p)
          } else if (t.kind === 'sink') {
            const lit = sinkLit(t)
            view.marker.material = lit ? traceLive[t.colour] : (t.shorted ? traceShort : traceDead)
            view.marker.scale.setScalar(lit ? 1 + Math.sin(s.flow * 5) * 0.06 : 1)
          } else if (t.kind === 'amp') {
            view.marker.rotation.y += dt * (t.live >= 0 ? 2.2 : 0.5)
            view.marker.material = t.live >= 0 ? coreLive[t.live] : (t.shorted ? traceShort : traceDead)
          }
        }

        // Current flow: sparks drifting along energised traces.
        if (t.live >= 0 && Math.random() < dt * 3.2) {
          burstAt(view.idx, s, 1, t.live)
        }
      }

      // Selection ring tracks the focused cell.
      ring.visible = s.phase === 'playing'
      ring.position.x = cellX(cursor.current.x, s.cols)
      ring.position.z = cellZ(cursor.current.y, s.rows)
      ring.rotation.z = s.flow * 0.8

      if (celebrate) {
        for (let i = 0; i < s.sinkIdx.length; i++) {
          const idx = s.sinkIdx[i]
          burstAt(idx, s, 70, s.tiles[idx].colour)
        }
      }

      particles.update(dt)

      // Camera: a slow parallax lean, damped when the visitor asks for less
      // motion. The board itself never moves, so the puzzle stays readable.
      const span = Math.max(boardW, boardH)
      const amp = reduceMotion ? 0 : 1
      const tx = parallaxX * 2.6 * amp
      const ty = span * 1.02 + 6 - parallaxY * 1.4 * amp
      stage.camera.position.x += (tx - stage.camera.position.x) * Math.min(1, dt * 2.4)
      stage.camera.position.y += (ty - stage.camera.position.y) * Math.min(1, dt * 2.4)
      stage.camera.position.z = span * 0.82 + 5
      stage.camera.lookAt(0, 0, 0)

      stage.render()

      uiClock += dt
      if (uiClock > 0.25) { uiClock = 0; sync() }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    sync()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('keydown', onKey)
      for (const geo of [padGeo, armNS, armEW, hubGeo, bridgeHigh, bridgeLow, pillarGeo,
                         sourceGeo, sourceRing, sinkGeo, sinkCore, ampGeo, boltGeo]) {
        geo.dispose()
      }
      glowTex.dispose()
      stage.dispose()
    }
  }, [sync])

  // ── Controls ──────────────────────────────────────────────────────────────
  const begin = () => {
    const s = ref.current
    if (!s) return
    ref.current = startLevel(s, 1)
    ref.current.score = 0
    sync()
  }

  const next = () => {
    const s = ref.current
    if (!s) return
    ref.current = startLevel(s, Math.min(LEVEL_COUNT, s.level + 1))
    sync()
  }

  const again = () => {
    const s = ref.current
    if (!s) return
    try { window.localStorage.setItem(BEST_KEY, String(s.best)) } catch { /* storage blocked */ }
    ref.current = startLevel(s, 1)
    ref.current.score = 0
    sync()
  }

  const retry = () => {
    const s = ref.current
    if (!s) return
    ref.current = startLevel(s, s.level)
    sync()
  }

  useEffect(() => {
    if (ui.phase !== 'complete') return
    try { window.localStorage.setItem(BEST_KEY, String(ui.best)) } catch { /* storage blocked */ }
  }, [ui.phase, ui.best])

  const mins = Math.floor(ui.elapsed / 60)
  const secs = Math.floor(ui.elapsed % 60)

  return (
    <div style={{ minHeight: '100vh', background: '#030a0d', color: '#E6F5F0',
                  fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 8, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>
            CIRCUIT<span style={{ color: '#4FD1FF' }}>RY</span>
            <span style={{ fontSize: 13, color: '#7BE495', marginLeft: 8 }}>3D</span>
          </h1>
          <span style={{ color: 'rgba(230,245,240,0.55)', fontSize: 13 }}>
            WebGL2 · PBR materials · shadow-mapped lighting · ACES tone mapping
          </span>
        </header>

        <div style={{ display: 'flex', gap: 18, fontSize: 13, marginBottom: 8, flexWrap: 'wrap' }}>
          <Stat label="BOARD" value={`${ui.level} / ${LEVEL_COUNT}`} />
          <Stat label="CONNECTED" value={`${ui.lit} / ${ui.sinks || '—'}`} tone="#7BE495" />
          <Stat label="TURNS" value={`${ui.moves} · par ${ui.par}`} />
          <Stat label="TIME" value={`${mins}:${String(secs).padStart(2, '0')}`} />
          <Stat label="SCORE" value={ui.score.toLocaleString()} tone="#F5C542" />
          <Stat label="BEST" value={ui.best.toLocaleString()} />
        </div>

        <div style={{ position: 'relative' }}>
          <canvas
            ref={canvasRef}
            tabIndex={0}
            role="application"
            aria-label="Circuitry board. Arrow keys move the cursor, space rotates the selected tile."
            style={{ display: 'block', borderRadius: 12, outlineOffset: 3,
                     border: '1px solid rgba(79,209,255,0.18)' }}
          />

          <p aria-live="polite" style={srOnly}>
            Board {ui.level}. {ui.lit} of {ui.sinks} circuits connected.
            {ui.phase === 'solved' ? ' Board complete.' : ''}
            {ui.phase === 'complete' ? ' All boards complete.' : ''}
          </p>

          {ui.phase === 'ready' && (
            <Overlay>
              <h2 style={{ fontSize: 30, margin: '0 0 6px' }}>Circuitry</h2>
              <p style={{ color: 'rgba(230,245,240,0.72)', maxWidth: 470, margin: '0 0 8px', lineHeight: 1.5 }}>
                Turn the traces so each source reaches the socket of its own colour.
                Two colours meeting on one trace short it out, and a bridge lets one
                circuit pass over another untouched.
              </p>
              <p style={{ color: 'rgba(230,245,240,0.45)', fontSize: 13, margin: '0 0 18px' }}>
                Click a tile to turn it, or use the arrow keys and space.
              </p>
              <Button onClick={begin}>Power up</Button>
            </Overlay>
          )}

          {ui.phase === 'solved' && (
            <Overlay>
              <h2 style={{ fontSize: 26, margin: '0 0 4px' }}>Board {ui.level} live</h2>
              <p style={{ color: 'rgba(230,245,240,0.7)', margin: '0 0 18px' }}>
                {ui.moves} turns against a par of {ui.par} · {ui.score.toLocaleString()} points
              </p>
              <Button onClick={next}>Board {ui.level + 1}</Button>
            </Overlay>
          )}

          {ui.phase === 'complete' && (
            <Overlay>
              <h2 style={{ fontSize: 28, margin: '0 0 4px' }}>Every board live</h2>
              <p style={{ color: 'rgba(230,245,240,0.7)', margin: '0 0 18px' }}>
                {ui.score.toLocaleString()} points across {LEVEL_COUNT} boards
              </p>
              <Button onClick={again}>Run it again</Button>
            </Overlay>
          )}
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
          {COLOURS.map((c, i) => (
            <span key={c} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5,
                                   color: 'rgba(230,245,240,0.6)' }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: `#${c.toString(16).padStart(6, '0')}` }} />
              {COLOUR_NAMES[i]}
            </span>
          ))}
          <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5,
                         color: 'rgba(230,245,240,0.6)' }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: `#${SHORT_COLOUR.toString(16)}` }} />
            Shorted
          </span>
          {ui.phase === 'playing' && (
            <button onClick={retry} style={{ background: 'transparent', color: 'rgba(230,245,240,0.7)',
              border: '1px solid rgba(230,245,240,0.22)', borderRadius: 8, padding: '6px 14px',
              fontSize: 12.5, cursor: 'pointer' }}>
              New board
            </button>
          )}
        </div>

        <p style={{ color: 'rgba(230,245,240,0.32)', fontSize: 12, marginTop: 10 }}>
          Simulation in engine.ts knows nothing about rendering · every board verified
          solvable before it is served · pooled geometry, GPU particle field, procedural
          environment map · CR AudioViz AI · EIN 39-3646201
        </p>
      </div>
    </div>
  )
}

const srOnly: React.CSSProperties = {
  position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
  overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: 1.2, color: 'rgba(230,245,240,0.4)' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: tone ?? '#E6F5F0' }}>{value}</div>
    </div>
  )
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                  background: 'rgba(3,10,13,0.88)', borderRadius: 12, padding: 20 }}>
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
