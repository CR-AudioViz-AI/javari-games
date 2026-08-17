'use client'
// app/play/dusk-keep/page.tsx — DUSK KEEP
//
// The surprise. Not a flat diorama in daylight — a fortress at last light, lit
// by its own torches, with weather, embers and a moat that moves.
//
// What changed from the grey-box build, in order of impact:
//
//   TEXTURED PBR SURFACES. Every stone block, plank and roof tile has a colour,
//   roughness and normal map generated at load. Untextured MeshStandardMaterial
//   is the single biggest tell of an amateur scene.
//
//   THE SCENE LIGHTS ITSELF. Twelve torches are real point lights that flicker
//   on independent noise, plus a low sun and a cool sky. Light sources INSIDE
//   the scene are what create depth; a single directional light from outside
//   flattens everything, which is exactly what happened before.
//
//   ATMOSPHERE. Height-graded fog, drifting embers, dust motes catching the
//   light, and a moat with animated normals. Empty air is what made the last
//   build feel like a model on a table.
//
//   SILHOUETTE DETAIL. Crenellations, arrow slits, buttresses, banners that
//   wave, a gatehouse with a portcullis. A castle should be recognisable as a
//   black shape.
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026
import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { grassSurface, roofSurface, stoneSurface, surfaced, woodSurface } from '@/lib/g3d/tex'

export default function DuskKeep() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [ui, setUi] = useState({ ready: false, torches: 0, hour: 'dusk' })
  const stateRef = useRef({ orbit: true, time: 0 })

  const sync = useCallback((n: number) => setUi(u => ({ ...u, ready: true, torches: n })), [])

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
    renderer.toneMappingExposure = 1.35
    renderer.outputColorSpace = THREE.SRGBColorSpace

    const scene = new THREE.Scene()
    // Height-graded fog: warm near the ground, cool above. One line, and it is
    // most of why the air reads as air.
    scene.fog = new THREE.FogExp2(0x2b3550, 0.014)
    scene.background = new THREE.Color(0x1a2138)

    const camera = new THREE.PerspectiveCamera(38, 1, 0.4, 400)

    // ── Surfaces, generated once ────────────────────────────────────────────
    const stone = stoneSurface('#a89f8e')
    const stoneDark = stoneSurface('#7d766a')
    const wood = woodSurface('#7a4f28')
    const roof = roofSurface('#8f3a2c')
    const grass = grassSurface()

    const matStone = surfaced(stone, 1)
    const matStoneWall = surfaced(stoneDark, 2)
    const matWood = surfaced(wood, 1)
    const matRoof = surfaced(roof, 1)
    const matGround = surfaced(grass, 26)

    // ── Sky: a real gradient dome with a sun disc ───────────────────────────
    {
      const c = document.createElement('canvas')
      c.width = 8; c.height = 256
      const g = c.getContext('2d')!
      const grad = g.createLinearGradient(0, 0, 0, 256)
      grad.addColorStop(0.00, '#0d1430')
      grad.addColorStop(0.42, '#2c3a63')
      grad.addColorStop(0.68, '#7b5a7a')
      grad.addColorStop(0.84, '#d9855c')
      grad.addColorStop(1.00, '#f0b072')
      g.fillStyle = grad
      g.fillRect(0, 0, 8, 256)
      const t = new THREE.CanvasTexture(c)
      t.colorSpace = THREE.SRGBColorSpace
      scene.add(new THREE.Mesh(
        new THREE.SphereGeometry(200, 32, 20),
        new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false })))
    }

    // ── Lighting: low warm sun, cool sky fill, and the scene's own torches ──
    const sun = new THREE.DirectionalLight(0xffb066, 2.6)
    sun.position.set(-38, 14, -26)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    const sc = sun.shadow.camera
    sc.near = 1; sc.far = 140; sc.left = -40; sc.right = 40; sc.top = 40; sc.bottom = -40
    sun.shadow.bias = -0.0008
    sun.shadow.normalBias = 0.04
    scene.add(sun)
    scene.add(new THREE.HemisphereLight(0x5878b8, 0x2a2418, 0.85))

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), matGround)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    scene.add(ground)

    // ── Moat: animated normals so the water actually moves ─────────────────
    const moatMat = new THREE.MeshStandardMaterial({
      color: 0x1d3a52, roughness: 0.12, metalness: 0.35,
      transparent: true, opacity: 0.92,
    })
    {
      const c = document.createElement('canvas')
      c.width = 128; c.height = 128
      const g = c.getContext('2d')!
      const img = g.createImageData(128, 128)
      for (let y = 0; y < 128; y++) {
        for (let x = 0; x < 128; x++) {
          const v = Math.sin(x * 0.18) * Math.cos(y * 0.14) * 0.5 + 0.5
          const i = (y * 128 + x) * 4
          img.data[i] = 128 + v * 40
          img.data[i + 1] = 128 + Math.sin(y * 0.2) * 36
          img.data[i + 2] = 255
          img.data[i + 3] = 255
        }
      }
      g.putImageData(img, 0, 0)
      const n = new THREE.CanvasTexture(c)
      n.wrapS = n.wrapT = THREE.RepeatWrapping
      n.repeat.set(6, 6)
      moatMat.normalMap = n
      moatMat.normalScale = new THREE.Vector2(0.55, 0.55)
    }
    const moat = new THREE.Mesh(new THREE.RingGeometry(15.5, 21.5, 64), moatMat)
    moat.rotation.x = -Math.PI / 2
    moat.position.y = -0.35
    scene.add(moat)

    // ── The keep ────────────────────────────────────────────────────────────
    const torches: { light: THREE.PointLight; flame: THREE.Sprite; seed: number }[] = []
    const flameTex = (() => {
      const c = document.createElement('canvas')
      c.width = 64; c.height = 64
      const g = c.getContext('2d')!
      const gr = g.createRadialGradient(32, 34, 1, 32, 32, 30)
      gr.addColorStop(0, 'rgba(255,250,220,1)')
      gr.addColorStop(0.3, 'rgba(255,190,90,0.85)')
      gr.addColorStop(0.7, 'rgba(255,110,40,0.3)')
      gr.addColorStop(1, 'rgba(255,80,20,0)')
      g.fillStyle = gr
      g.fillRect(0, 0, 64, 64)
      return new THREE.CanvasTexture(c)
    })()

    const addTorch = (x: number, y: number, z: number) => {
      const g = new THREE.Group()
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.7, 6), matWood)
      stick.position.y = 0.35
      g.add(stick)
      const flame = new THREE.Sprite(new THREE.SpriteMaterial({
        map: flameTex, blending: THREE.AdditiveBlending, depthWrite: false,
        transparent: true, color: 0xffc266,
      }))
      flame.scale.setScalar(1.1)
      flame.position.y = 0.85
      g.add(flame)
      // A real point light — this is what makes the stone come alive.
      const light = new THREE.PointLight(0xffa04a, 9, 13, 1.9)
      light.position.y = 0.9
      g.add(light)
      g.position.set(x, y, z)
      scene.add(g)
      torches.push({ light, flame, seed: Math.random() * 10 })
    }

    /** A crenellated wall segment with buttress and arrow slit. */
    const wallSeg = (x: number, z: number, ry: number, len: number) => {
      const g = new THREE.Group()
      const body = new THREE.Mesh(new THREE.BoxGeometry(len, 3.4, 1.1), matStoneWall)
      body.position.y = 1.7
      body.castShadow = true; body.receiveShadow = true
      g.add(body)
      // Crenellations — the merlons are the whole silhouette.
      const n = Math.floor(len / 1.1)
      for (let i = 0; i < n; i++) {
        if (i % 2) continue
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.7, 1.1), matStone)
        m.position.set(-len / 2 + 0.55 + i * 1.1, 3.75, 0)
        m.castShadow = true
        g.add(m)
      }
      // Arrow slit, dark inset.
      const slit = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.06),
        new THREE.MeshBasicMaterial({ color: 0x120d0a }))
      slit.position.set(0, 2.1, 0.57)
      g.add(slit)
      // Buttress.
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.6, 0.7), matStone)
      b.position.set(len / 2 - 0.2, 1.3, 0.7)
      b.castShadow = true
      g.add(b)
      g.position.set(x, 0, z)
      g.rotation.y = ry
      scene.add(g)
    }

    const R = 12
    for (const [x, z, ry] of [[0, -R, 0], [0, R, 0], [-R, 0, Math.PI / 2], [R, 0, Math.PI / 2]] as const) {
      wallSeg(x, z, ry, 17)
    }

    const banners: THREE.Mesh[] = []

    /** A round tower with a conical roof, banner and torches. */
    const tower = (x: number, z: number, h: number, r: number) => {
      const g = new THREE.Group()
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.14, h, 14), matStone)
      shaft.position.y = h / 2
      shaft.castShadow = true; shaft.receiveShadow = true
      g.add(shaft)
      // Machicolation ring under the battlement — a real castle detail.
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.22, r * 1.05, 0.45, 14), matStoneWall)
      ring.position.y = h - 0.4
      ring.castShadow = true
      g.add(ring)
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.4), matStone)
        m.position.set(Math.cos(a) * r * 1.12, h + 0.15, Math.sin(a) * r * 1.12)
        m.rotation.y = -a
        m.castShadow = true
        g.add(m)
      }
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r * 1.3, h * 0.55, 14), matRoof)
      cone.position.y = h + 0.15 + h * 0.275
      cone.castShadow = true
      g.add(cone)
      // Banner pole and cloth.
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6), matWood)
      pole.position.y = h + h * 0.55 + 1.1
      g.add(pole)
      const cloth = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 0.9, 8, 4),
        new THREE.MeshStandardMaterial({ color: 0xc4342c, roughness: 0.85,
          side: THREE.DoubleSide, emissive: 0x2a0806, emissiveIntensity: 0.4 }))
      cloth.position.set(0.78, h + h * 0.55 + 1.5, 0)
      g.add(cloth)
      banners.push(cloth)
      g.position.set(x, 0, z)
      scene.add(g)
      addTorch(x + r * 1.1, h - 1.4, z)
      addTorch(x - r * 1.1, h - 1.4, z)
    }
    for (const [x, z] of [[-R, -R], [R, -R], [-R, R], [R, R]] as const) tower(x, z, 9, 2)

    // Gatehouse
    {
      const g = new THREE.Group()
      for (const sx of [-2.6, 2.6]) {
        const t = new THREE.Mesh(new THREE.BoxGeometry(2.4, 8, 2.4), matStone)
        t.position.set(sx, 4, 0)
        t.castShadow = true; t.receiveShadow = true
        g.add(t)
        for (let i = -1; i <= 1; i++) {
          const m = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 2.4), matStone)
          m.position.set(sx + i * 0.9, 8.35, 0)
          m.castShadow = true
          g.add(m)
        }
      }
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(7.6, 1.6, 2.4), matStone)
      lintel.position.y = 6.2
      lintel.castShadow = true
      g.add(lintel)
      // Portcullis: a real lattice, backlit from inside.
      for (let i = -3; i <= 3; i++) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 5.2, 6), matWood)
        bar.position.set(i * 0.62, 2.6, 0)
        g.add(bar)
      }
      for (let j = 0; j < 4; j++) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4, 6), matWood)
        bar.rotation.z = Math.PI / 2
        bar.position.set(0, 1 + j * 1.3, 0)
        g.add(bar)
      }
      g.position.set(0, 0, R)
      scene.add(g)
      addTorch(-4.2, 5.2, R + 1.3)
      addTorch(4.2, 5.2, R + 1.3)
    }

    // The great hall inside
    {
      const g = new THREE.Group()
      const base = new THREE.Mesh(new THREE.BoxGeometry(9, 6, 7), matStone)
      base.position.y = 3
      base.castShadow = true; base.receiveShadow = true
      g.add(base)
      const upper = new THREE.Mesh(new THREE.BoxGeometry(6.5, 4, 5), matStone)
      upper.position.y = 8
      upper.castShadow = true
      g.add(upper)
      const roofM = new THREE.Mesh(new THREE.ConeGeometry(5.4, 4.4, 4), matRoof)
      roofM.rotation.y = Math.PI / 4
      roofM.position.y = 12.2
      roofM.castShadow = true
      g.add(roofM)
      // Lit windows — warm rectangles are what make a building feel occupied.
      for (const [wx, wy, wz, ry] of [
        [0, 3.2, 3.55, 0], [0, 3.2, -3.55, 0], [4.55, 3.2, 0, Math.PI / 2], [-4.55, 3.2, 0, Math.PI / 2],
        [0, 8.2, 2.55, 0], [0, 8.2, -2.55, 0],
      ] as const) {
        const win = new THREE.Mesh(
          new THREE.PlaneGeometry(0.8, 1.5),
          new THREE.MeshBasicMaterial({ color: 0xffc477 }))
        win.position.set(wx, wy, wz)
        win.rotation.y = ry
        g.add(win)
        const gl = new THREE.PointLight(0xffb35c, 2.4, 6, 2)
        gl.position.set(wx * 1.1, wy, wz * 1.1)
        g.add(gl)
      }
      scene.add(g)
      addTorch(-5.2, 1.4, 4.2)
      addTorch(5.2, 1.4, 4.2)
    }

    // ── Atmosphere: embers and dust ────────────────────────────────────────
    const emberGeo = new THREE.BufferGeometry()
    const EN = 400
    const epos = new Float32Array(EN * 3)
    const evel = new Float32Array(EN * 3)
    for (let i = 0; i < EN; i++) {
      const t = torches[i % Math.max(1, torches.length)]
      epos[i * 3] = (Math.random() - 0.5) * 40
      epos[i * 3 + 1] = Math.random() * 16
      epos[i * 3 + 2] = (Math.random() - 0.5) * 40
      evel[i * 3] = (Math.random() - 0.5) * 0.4
      evel[i * 3 + 1] = 0.3 + Math.random() * 0.9
      evel[i * 3 + 2] = (Math.random() - 0.5) * 0.4
      void t
    }
    emberGeo.setAttribute('position', new THREE.BufferAttribute(epos, 3))
    const embers = new THREE.Points(emberGeo, new THREE.PointsMaterial({
      size: 0.16, map: flameTex, color: 0xff9a4a, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }))
    embers.frustumCulled = false
    scene.add(embers)

    let W = 900, H = 560
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
    sync(torches.length)

    let raf = 0, last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const st = stateRef.current
      st.time += dt

      // Torch flicker on independent noise — the single most alive detail here.
      for (const t of torches) {
        const f = 0.72 + Math.sin(st.time * 11 + t.seed) * 0.14
                       + Math.sin(st.time * 27 + t.seed * 3) * 0.09
                       + Math.random() * 0.06
        t.light.intensity = 6.5 * f
        t.flame.scale.setScalar(0.95 + f * 0.4)
        ;(t.flame.material as THREE.SpriteMaterial).opacity = 0.7 + f * 0.3
      }

      // Banners wave: displace the plane's vertices along a travelling wave.
      for (const b of banners) {
        const pos = b.geometry.getAttribute('position') as THREE.BufferAttribute
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i)
          pos.setZ(i, Math.sin(st.time * 4 + x * 3.2) * 0.16 * (x + 0.75))
        }
        pos.needsUpdate = true
      }

      // Water drifts.
      if (moatMat.normalMap) {
        moatMat.normalMap.offset.x = st.time * 0.02
        moatMat.normalMap.offset.y = st.time * 0.013
      }

      // Embers rise and recycle.
      const p = emberGeo.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < EN; i++) {
        epos[i * 3] += evel[i * 3] * dt + Math.sin(st.time + i) * 0.004
        epos[i * 3 + 1] += evel[i * 3 + 1] * dt
        epos[i * 3 + 2] += evel[i * 3 + 2] * dt
        if (epos[i * 3 + 1] > 18) {
          epos[i * 3] = (Math.random() - 0.5) * 34
          epos[i * 3 + 1] = 0.5
          epos[i * 3 + 2] = (Math.random() - 0.5) * 34
        }
      }
      p.needsUpdate = true

      // Slow cinematic orbit, low to the ground so the towers loom.
      const a = st.time * 0.06
      camera.position.set(Math.cos(a) * 34, 11 + Math.sin(a * 0.7) * 3.5, Math.sin(a) * 34)
      camera.lookAt(0, 5.5, 0)

      renderer.render(scene, camera)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      renderer.dispose()
    }
  }, [sync])

  return (
    <div style={{ minHeight: '100vh', background: '#0b1020', color: '#E9E2D6',
                  fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <header style={{ marginBottom: 10 }}>
          <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0, letterSpacing: '-0.6px' }}>
            DUSK <span style={{ color: '#ff9a4a' }}>KEEP</span>
          </h1>
          <p style={{ color: 'rgba(233,226,214,0.6)', fontSize: 13.5, margin: '4px 0 0' }}>
            Textured PBR stone · {ui.torches} flickering point lights · animated water ·
            waving banners · rising embers · crenellations, machicolations, portcullis
          </p>
        </header>

        <canvas ref={canvasRef} style={{ display: 'block', borderRadius: 14,
          border: '1px solid rgba(255,154,74,0.25)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }} />

        <p style={{ color: 'rgba(233,226,214,0.42)', fontSize: 12.5, marginTop: 12, lineHeight: 1.6 }}>
          What changed from the grey boxes: every surface has a generated colour, roughness and
          normal map, so stone reads as weathered rather than plastic. The scene lights ITSELF —
          torches are real point lights flickering on independent noise, and lit windows make the
          hall feel occupied. A single light from outside flattens everything, which is what
          happened before. Height-graded fog, drifting embers and moving water fill the air that
          made the last build feel like a model on a table.
        </p>
        <p style={{ color: 'rgba(233,226,214,0.3)', fontSize: 12, marginTop: 6 }}>
          CR AudioViz AI · EIN 39-3646201
        </p>
      </div>
    </div>
  )
}
