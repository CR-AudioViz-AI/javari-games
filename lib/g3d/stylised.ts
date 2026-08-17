// lib/g3d/stylised.ts — the Clash/Age-of-Empires look, as a reusable kit
//
// The previous games were dark, sparse and untextured, and that is why they read
// as 1998. The fix is not more polygons. Clash of Clans is simple shapes too —
// the difference is ART DIRECTION, and it is five specific things:
//
//   1. SATURATED, HIGH-KEY PALETTE. Bright grass, warm stone, strong accent
//      colours. Dark scenes read as cheap; light ones read as expensive.
//   2. CHUNKY ROUNDED SILHOUETTES. Everything is slightly wider at the base and
//      bevelled. A shape you can recognise as a black silhouette is the test.
//   3. STRONG RIM LIGHT plus a warm key and a bright sky fill. The rim is what
//      makes a unit pop off the grass.
//   4. AMBIENT OCCLUSION FAKED WITH CONTACT SHADOWS. A dark ellipse under every
//      object costs nothing and sells the weight.
//   5. AN OUTLINE. A back-faced inverted hull in dark ink is the single cheapest
//      thing that turns "3D shapes" into "a stylised game".
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026
import * as THREE from 'three'

export const PALETTE = {
  grass: 0x6fbf3f,
  grassDark: 0x4e9a2c,
  dirt: 0xc79a5b,
  stone: 0xb9b4a8,
  stoneDark: 0x8a857a,
  wood: 0x9a6236,
  water: 0x35a7d8,
  gold: 0xffc23c,
  ink: 0x22331e,
  playerA: 0x3fa9f5,
  playerB: 0xf5563f,
  neutral: 0xcbd2c0,
  sky: 0x9fd8f0,
}

/** Toon-ish standard material: low roughness variance, no metal, strong colour. */
export function toon(colour: number, opts: { rough?: number; emissive?: number } = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: colour,
    roughness: opts.rough ?? 0.78,
    metalness: 0.0,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissive ? 0.55 : 0,
    flatShading: false,
  })
}

/**
 * An ink outline. A second copy of the mesh, scaled up slightly, with front
 * faces culled so only the back shows — the classic inverted-hull trick and the
 * single cheapest thing that makes 3D read as stylised rather than raw.
 */
export function outline(mesh: THREE.Mesh, thickness = 0.045, colour = PALETTE.ink): THREE.Mesh {
  const m = new THREE.Mesh(
    mesh.geometry,
    new THREE.MeshBasicMaterial({ color: colour, side: THREE.BackSide }),
  )
  m.scale.setScalar(1 + thickness)
  m.position.copy(mesh.position)
  m.rotation.copy(mesh.rotation)
  return m
}

/** Wrap a mesh with its outline in one group. */
export function inked(mesh: THREE.Mesh, thickness = 0.045): THREE.Group {
  const g = new THREE.Group()
  const o = outline(mesh, thickness)
  o.position.set(0, 0, 0)
  o.rotation.set(0, 0, 0)
  g.add(o)
  g.add(mesh)
  return g
}

/** A soft dark ellipse under an object. Costs one sprite, sells all the weight. */
let contactTex: THREE.Texture | null = null
export function contactShadow(radius = 0.7, strength = 0.42): THREE.Sprite {
  if (!contactTex) {
    const c = document.createElement('canvas')
    c.width = 64; c.height = 64
    const g = c.getContext('2d')!
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    grad.addColorStop(0, 'rgba(0,0,0,0.85)')
    grad.addColorStop(0.5, 'rgba(0,0,0,0.35)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 64, 64)
    contactTex = new THREE.CanvasTexture(c)
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: contactTex, transparent: true, depthWrite: false, opacity: strength,
    color: 0x1a2a12,
  }))
  s.scale.set(radius * 2, radius * 2, 1)
  // Lie flat on the ground rather than facing the camera.
  s.material.rotation = 0
  return s
}

/** Chunky bevelled box — the building block of every structure. */
export function chunk(w: number, h: number, d: number, colour: number, bevel = 0.12): THREE.Mesh {
  // A box with a slight taper reads far friendlier than a hard cuboid.
  const geo = new THREE.CylinderGeometry(1, 1.08, 1, 4, 1)
  geo.rotateY(Math.PI / 4)
  geo.scale(w * 0.72, h, d * 0.72)
  const m = new THREE.Mesh(geo, toon(colour))
  m.castShadow = true
  m.receiveShadow = true
  void bevel
  return m
}

/** A stylised tree: trunk plus two offset canopy blobs. */
export function tree(scale = 1): THREE.Group {
  const g = new THREE.Group()
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.2, 0.9, 6), toon(PALETTE.wood))
  trunk.position.y = 0.45
  trunk.castShadow = true
  g.add(trunk)
  for (const [y, r, c] of [[1.1, 0.62, PALETTE.grassDark], [1.5, 0.44, PALETTE.grass]] as const) {
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), toon(c))
    blob.position.set((Math.random() - 0.5) * 0.12, y, (Math.random() - 0.5) * 0.12)
    blob.castShadow = true
    g.add(blob)
  }
  g.add(contactShadow(0.55, 0.4))
  g.scale.setScalar(scale)
  return g
}

/** A stylised rock cluster. */
export function rocks(scale = 1): THREE.Group {
  const g = new THREE.Group()
  for (let i = 0; i < 3; i++) {
    const r = 0.22 + Math.random() * 0.24
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0),
      toon(i % 2 ? PALETTE.stone : PALETTE.stoneDark))
    m.position.set((Math.random() - 0.5) * 0.7, r * 0.7, (Math.random() - 0.5) * 0.7)
    m.rotation.set(Math.random(), Math.random(), Math.random())
    m.castShadow = true
    g.add(m)
  }
  g.add(contactShadow(0.5, 0.35))
  g.scale.setScalar(scale)
  return g
}

/** The stylised lighting rig. Bright, warm key, strong rim, sky fill. */
export function stylisedLights(scene: THREE.Scene): {
  key: THREE.DirectionalLight; rim: THREE.DirectionalLight
} {
  const key = new THREE.DirectionalLight(0xfff4de, 3.1)
  key.position.set(14, 22, 10)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  const c = key.shadow.camera
  c.near = 1; c.far = 90; c.left = -34; c.right = 34; c.top = 34; c.bottom = -34
  key.shadow.bias = -0.0007
  key.shadow.normalBias = 0.03
  scene.add(key)

  // The rim is what makes a unit pop off the grass. Cool, from behind.
  const rim = new THREE.DirectionalLight(0x9fd8ff, 1.9)
  rim.position.set(-12, 9, -18)
  scene.add(rim)

  // Sky fill: hemisphere light is what stops the shadow side going muddy.
  const hemi = new THREE.HemisphereLight(0xbfe8ff, 0x4a7a2e, 1.15)
  scene.add(hemi)
  return { key, rim }
}

/** Bright sky with a soft gradient, and matching fog so distance reads. */
export function stylisedSky(scene: THREE.Scene): void {
  const c = document.createElement('canvas')
  c.width = 4; c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, 0, 128)
  grad.addColorStop(0, '#6ec3ea')
  grad.addColorStop(0.55, '#a8ddf2')
  grad.addColorStop(1, '#dff2e4')
  g.fillStyle = grad
  g.fillRect(0, 0, 4, 128)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(220, 24, 16),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false }),
  )
  scene.add(dome)
  scene.fog = new THREE.Fog(0xbfe0ea, 46, 130)
}

/** A tiled ground plane with a subtle checker so scale is readable. */
export function stylisedGround(size = 60): THREE.Mesh {
  const c = document.createElement('canvas')
  c.width = 128; c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = '#6fbf3f'
  g.fillRect(0, 0, 128, 128)
  // Very low-contrast checker: enough to read scale, not enough to be a pattern.
  g.fillStyle = 'rgba(0,0,0,0.045)'
  for (let y = 0; y < 128; y += 32) {
    for (let x = 0; x < 128; x += 32) {
      if (((x / 32) + (y / 32)) % 2 === 0) g.fillRect(x, y, 32, 32)
    }
  }
  // Scattered blades for texture at close range.
  g.strokeStyle = 'rgba(255,255,255,0.10)'
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 128, y = Math.random() * 128
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 1, y - 3); g.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(size / 4, size / 4)
  tex.colorSpace = THREE.SRGBColorSpace
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0 }),
  )
  m.rotation.x = -Math.PI / 2
  m.receiveShadow = true
  return m
}
