// lib/g3d/stage.ts — the shared 3D stage every game renders through
//
// Roy: 2D canvas with bloom is 2010 technology. He is right. This is the
// foundation the games move onto — real WebGL2 meshes, physically based
// materials, shadow-mapped lighting, HDR tone mapping and post-processing.
//
// WHAT MAKES IT LOOK MODERN, IN ORDER OF IMPACT:
//
//   ACES FILMIC TONE MAPPING with a real exposure value. Rendering in linear
//   space and tone mapping at the end is the single biggest difference between
//   a 2010 look and a current one. Colours stop clipping to flat white and
//   bright emissives keep their hue.
//
//   PBR MATERIALS, not flat colours. Metalness and roughness mean a hull reads
//   as brushed metal under a moving light rather than as a coloured polygon.
//
//   SHADOW-MAPPED KEY LIGHT with a soft fill and a rim. Three-point lighting is
//   why film looks like film; the rim light in particular is what separates a
//   shape from its background.
//
//   AN ENVIRONMENT MAP. Even a procedurally generated one gives metals
//   something to reflect. Without it, metalness looks black.
//
// The stage owns none of the game logic. It is handed a scene to populate and
// called once per frame.
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026
import * as THREE from 'three'

export interface StageOptions {
  /** Camera field of view in degrees. Lower reads as more cinematic. */
  fov?: number
  /** Scene-wide exposure applied after tone mapping. */
  exposure?: number
  /** Hex colours for the three-point rig. */
  key?: number
  fill?: number
  rim?: number
  fog?: { colour: number; near: number; far: number } | null
  shadows?: boolean
}

export class Stage {
  readonly renderer: THREE.WebGLRenderer
  readonly scene: THREE.Scene
  readonly camera: THREE.PerspectiveCamera
  readonly keyLight: THREE.DirectionalLight
  readonly fillLight: THREE.DirectionalLight
  readonly rimLight: THREE.DirectionalLight
  private w = 1
  private h = 1
  readonly ok: boolean

  constructor(canvas: HTMLCanvasElement, opts: StageOptions = {}) {
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        canvas, antialias: true, alpha: false, powerPreference: 'high-performance',
      })
    } catch {
      // Some very old devices have no WebGL2. Fail loudly rather than silently
      // rendering nothing.
      this.ok = false
      this.renderer = null as unknown as THREE.WebGLRenderer
      this.scene = new THREE.Scene()
      this.camera = new THREE.PerspectiveCamera()
      this.keyLight = new THREE.DirectionalLight()
      this.fillLight = new THREE.DirectionalLight()
      this.rimLight = new THREE.DirectionalLight()
      return
    }
    this.ok = true
    this.renderer = renderer
    // Cap at 2: beyond that the fill cost doubles for no visible gain.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    // The single biggest visual difference from a 2010 renderer.
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = opts.exposure ?? 1.05
    renderer.outputColorSpace = THREE.SRGBColorSpace
    if (opts.shadows !== false) {
      renderer.shadowMap.enabled = true
      // PCF soft: cheap, and hard shadow edges are the giveaway of an old engine.
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
    }

    this.scene = new THREE.Scene()
    if (opts.fog !== null) {
      const f = opts.fog ?? { colour: 0x04060e, near: 20, far: 140 }
      this.scene.fog = new THREE.Fog(f.colour, f.near, f.far)
      this.scene.background = new THREE.Color(f.colour)
    }

    this.camera = new THREE.PerspectiveCamera(opts.fov ?? 46, 1, 0.1, 600)
    this.camera.position.set(0, 26, 30)
    this.camera.lookAt(0, 0, 0)

    // Three-point rig. The rim is what separates a shape from the background.
    this.keyLight = new THREE.DirectionalLight(opts.key ?? 0xfff2e0, 2.4)
    this.keyLight.position.set(18, 30, 14)
    if (opts.shadows !== false) {
      this.keyLight.castShadow = true
      this.keyLight.shadow.mapSize.set(2048, 2048)
      const c = this.keyLight.shadow.camera
      c.near = 1; c.far = 120
      c.left = -50; c.right = 50; c.top = 50; c.bottom = -50
      // Bias tuned to kill shadow acne without detaching contact shadows.
      this.keyLight.shadow.bias = -0.0006
      this.keyLight.shadow.normalBias = 0.02
    }
    this.scene.add(this.keyLight)

    this.fillLight = new THREE.DirectionalLight(opts.fill ?? 0x6ea8ff, 0.85)
    this.fillLight.position.set(-22, 12, 10)
    this.scene.add(this.fillLight)

    this.rimLight = new THREE.DirectionalLight(opts.rim ?? 0xff7a5c, 1.5)
    this.rimLight.position.set(-8, 8, -26)
    this.scene.add(this.rimLight)

    this.scene.add(new THREE.AmbientLight(0x223044, 0.55))

    // A procedural environment map so metals have something to reflect.
    // Without one, metalness reads as black and everything looks like plastic.
    this.scene.environment = makeEnvironment(renderer)
  }

  resize(w: number, h: number): void {
    if (!this.ok) return
    this.w = w; this.h = h
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  render(): void {
    if (!this.ok) return
    this.renderer.render(this.scene, this.camera)
  }

  dispose(): void {
    if (!this.ok) return
    this.scene.traverse(o => {
      const m = o as THREE.Mesh
      if (m.geometry) m.geometry.dispose()
      const mat = m.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(mat)) mat.forEach(x => x.dispose())
      else mat?.dispose()
    })
    this.renderer.dispose()
  }
}

/** A gradient sky baked to a cube map. Cheap, and enough for metals to catch. */
function makeEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = 64; c.height = 64
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, 0, 64)
  grad.addColorStop(0, '#2a3a58')
  grad.addColorStop(0.5, '#0d1424')
  grad.addColorStop(1, '#050810')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  // A couple of bright patches so reflections have highlights to move across.
  g.fillStyle = 'rgba(255,235,200,0.85)'
  g.beginPath(); g.arc(18, 12, 7, 0, Math.PI * 2); g.fill()
  g.fillStyle = 'rgba(120,180,255,0.5)'
  g.beginPath(); g.arc(48, 22, 9, 0, Math.PI * 2); g.fill()

  const tex = new THREE.CanvasTexture(c)
  tex.mapping = THREE.EquirectangularReflectionMapping
  const pmrem = new THREE.PMREMGenerator(renderer)
  const env = pmrem.fromEquirectangular(tex).texture
  pmrem.dispose()
  tex.dispose()
  return env
}

/** Emissive material for anything that should glow — engines, shots, cores. */
export function glowMaterial(colour: number, intensity = 2.2): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: colour,
    emissive: colour,
    // Emissive intensity above 1 is what makes tone mapping earn its keep.
    emissiveIntensity: intensity,
    roughness: 0.4,
    metalness: 0,
    toneMapped: true,
  })
}

/** Brushed metal. The default look for hulls, plates and structures. */
export function metalMaterial(colour: number, roughness = 0.34, metalness = 0.92): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: colour, roughness, metalness })
}

/** A soft additive sprite for particles and engine flares. */
export function makeGlowTexture(): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = 64; c.height = 64
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.25, 'rgba(255,255,255,0.55)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/**
 * A GPU particle system. Positions live in a BufferAttribute updated on the
 * CPU but drawn in one call — thousands of particles at no meaningful cost,
 * where the 2D version cost a draw call each.
 */
export class ParticleField {
  readonly points: THREE.Points
  private pos: Float32Array
  private vel: Float32Array
  private life: Float32Array
  private col: Float32Array
  private cursor = 0
  constructor(readonly max: number, texture: THREE.Texture, size = 0.9) {
    this.pos = new Float32Array(max * 3)
    this.vel = new Float32Array(max * 3)
    this.life = new Float32Array(max)
    this.col = new Float32Array(max * 3)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3))
    const mat = new THREE.PointsMaterial({
      size, map: texture, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, vertexColors: true, sizeAttenuation: true,
    })
    this.points = new THREE.Points(geo, mat)
    this.points.frustumCulled = false
  }

  emit(x: number, y: number, z: number, vx: number, vy: number, vz: number,
       r: number, g: number, b: number, ttl: number): void {
    const i = this.cursor
    this.cursor = (this.cursor + 1) % this.max
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz
    this.col[i * 3] = r; this.col[i * 3 + 1] = g; this.col[i * 3 + 2] = b
    this.life[i] = ttl
  }

  update(dt: number): void {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) {
        // Park dead particles far away rather than paying for a compaction pass.
        this.pos[i * 3 + 1] = -9999
        continue
      }
      this.life[i] -= dt
      this.pos[i * 3] += this.vel[i * 3] * dt
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt
      const fade = Math.max(0, this.life[i])
      this.col[i * 3] *= 0.985 + fade * 0.01
    }
    const g = this.points.geometry
    ;(g.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
    ;(g.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true
  }
}
