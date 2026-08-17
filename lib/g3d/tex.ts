// lib/g3d/tex.ts — procedural material textures
//
// The last build was flat grey boxes and that is exactly why it read as 1999.
// Untextured MeshStandardMaterial is the single biggest tell of an amateur 3D
// scene: real surfaces have grain, dirt, variation and edge wear.
//
// Everything here is drawn to a canvas at load. No downloads, no licensing, and
// each material gets a COLOUR map, a ROUGHNESS map and a NORMAL map — the three
// that matter. Roughness variation is what makes a stone wall look weathered
// rather than plastic; the normal map is what gives it depth under a moving
// light without adding a single polygon.
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026
import * as THREE from 'three'

function cv(size = 256): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = size; c.height = size
  return [c, c.getContext('2d')!]
}

function tex(c: HTMLCanvasElement, repeat = 1, srgb = true): THREE.Texture {
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat, repeat)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

/** Derive a normal map from a height canvas by Sobel. Cheap and convincing. */
function normalFrom(height: HTMLCanvasElement, strength = 2.2): THREE.Texture {
  const s = height.width
  const src = height.getContext('2d')!.getImageData(0, 0, s, s).data
  const [c, g] = cv(s)
  const out = g.createImageData(s, s)
  const at = (x: number, y: number) => {
    const xx = (x + s) % s, yy = (y + s) % s
    return src[(yy * s + xx) * 4] / 255
  }
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength
      const len = Math.hypot(dx, dy, 1)
      const i = (y * s + x) * 4
      out.data[i] = ((-dx / len) * 0.5 + 0.5) * 255
      out.data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255
      out.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255
      out.data[i + 3] = 255
    }
  }
  g.putImageData(out, 0, 0)
  return tex(c, 1, false)
}

export interface Surface {
  map: THREE.Texture
  normalMap: THREE.Texture
  roughnessMap: THREE.Texture
}

/** Cut stone blocks with mortar, chipped edges and damp patches. */
export function stoneSurface(tint = '#b8b2a4'): Surface {
  const [c, g] = cv(256)
  g.fillStyle = '#6d675c'
  g.fillRect(0, 0, 256, 256)
  const [h, hg] = cv(256)
  hg.fillStyle = '#404040'
  hg.fillRect(0, 0, 256, 256)
  const [r, rg] = cv(256)
  rg.fillStyle = '#c8c8c8'
  rg.fillRect(0, 0, 256, 256)

  const rows = 6
  const bh = 256 / rows
  for (let row = 0; row < rows; row++) {
    const off = (row % 2) * bh * 0.9
    for (let x = -bh; x < 256; x += bh * 1.8) {
      const bx = x + off + 2, by = row * bh + 2
      const bw = bh * 1.8 - 4, bhh = bh - 4
      // Colour: each block a slightly different value.
      const v = 0.82 + Math.random() * 0.3
      g.fillStyle = shade(tint, v)
      g.fillRect(bx, by, bw, bhh)
      // Grain speckle so it is not a flat rectangle.
      for (let i = 0; i < 90; i++) {
        g.fillStyle = `rgba(0,0,0,${Math.random() * 0.09})`
        g.fillRect(bx + Math.random() * bw, by + Math.random() * bhh, 2, 2)
      }
      // Edge wear: a lighter chip on a corner.
      if (Math.random() < 0.4) {
        g.fillStyle = shade(tint, 1.18)
        g.beginPath()
        g.moveTo(bx, by)
        g.lineTo(bx + 6 + Math.random() * 8, by)
        g.lineTo(bx, by + 5 + Math.random() * 7)
        g.fill()
      }
      // Height: blocks proud, mortar recessed.
      hg.fillStyle = `rgb(${Math.round(150 + Math.random() * 60)},0,0)`
      hg.fillRect(bx, by, bw, bhh)
      // Roughness: damp patches are smoother.
      rg.fillStyle = Math.random() < 0.25 ? '#8a8a8a' : '#d6d6d6'
      rg.fillRect(bx, by, bw, bhh)
    }
  }
  // Global grime toward the bottom.
  const grime = g.createLinearGradient(0, 140, 0, 256)
  grime.addColorStop(0, 'rgba(40,50,30,0)')
  grime.addColorStop(1, 'rgba(40,50,30,0.35)')
  g.fillStyle = grime
  g.fillRect(0, 0, 256, 256)

  return { map: tex(c, 1), normalMap: normalFrom(h, 2.6), roughnessMap: tex(r, 1, false) }
}

/** Planked wood with grain and knots. */
export function woodSurface(tint = '#8b5a2b'): Surface {
  const [c, g] = cv(256)
  const [h, hg] = cv(256)
  const [r, rg] = cv(256)
  hg.fillStyle = '#606060'; hg.fillRect(0, 0, 256, 256)
  rg.fillStyle = '#b0b0b0'; rg.fillRect(0, 0, 256, 256)
  const planks = 6
  const pw = 256 / planks
  for (let i = 0; i < planks; i++) {
    const v = 0.85 + Math.random() * 0.3
    g.fillStyle = shade(tint, v)
    g.fillRect(i * pw, 0, pw - 2, 256)
    // Grain lines along the plank.
    for (let k = 0; k < 26; k++) {
      g.strokeStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.08})`
      g.lineWidth = 0.5 + Math.random()
      g.beginPath()
      const x = i * pw + Math.random() * pw
      g.moveTo(x, 0)
      g.bezierCurveTo(x + 4, 85, x - 4, 170, x + 2, 256)
      g.stroke()
    }
    // A knot or two.
    if (Math.random() < 0.5) {
      const kx = i * pw + pw / 2, ky = Math.random() * 256
      for (let ring = 7; ring > 0; ring--) {
        g.strokeStyle = `rgba(60,34,12,${0.1 + ring * 0.04})`
        g.lineWidth = 1.4
        g.beginPath(); g.ellipse(kx, ky, ring * 1.8, ring * 1.1, 0, 0, Math.PI * 2); g.stroke()
      }
    }
    hg.fillStyle = `rgb(${Math.round(120 + Math.random() * 70)},0,0)`
    hg.fillRect(i * pw, 0, pw - 2, 256)
  }
  return { map: tex(c, 1), normalMap: normalFrom(h, 1.6), roughnessMap: tex(r, 1, false) }
}

/** Thatch or shingle roofing — rows of overlapping tiles. */
export function roofSurface(tint = '#a8402f'): Surface {
  const [c, g] = cv(256)
  const [h, hg] = cv(256)
  const [r, rg] = cv(256)
  g.fillStyle = shade(tint, 0.7); g.fillRect(0, 0, 256, 256)
  hg.fillStyle = '#404040'; hg.fillRect(0, 0, 256, 256)
  rg.fillStyle = '#cccccc'; rg.fillRect(0, 0, 256, 256)
  const rows = 10, rh = 256 / rows
  for (let row = rows - 1; row >= 0; row--) {
    const y = row * rh
    for (let x = -12; x < 256; x += 26) {
      const off = (row % 2) * 13
      const v = 0.9 + Math.random() * 0.25
      g.fillStyle = shade(tint, v)
      g.beginPath()
      g.moveTo(x + off, y + rh)
      g.lineTo(x + off + 24, y + rh)
      g.lineTo(x + off + 24, y + 4)
      g.quadraticCurveTo(x + off + 12, y - 3, x + off, y + 4)
      g.closePath()
      g.fill()
      g.strokeStyle = 'rgba(0,0,0,0.22)'
      g.lineWidth = 1
      g.stroke()
      hg.fillStyle = `rgb(${Math.round(90 + (rows - row) * 12)},0,0)`
      hg.fillRect(x + off, y, 24, rh)
    }
  }
  return { map: tex(c, 1), normalMap: normalFrom(h, 2.2), roughnessMap: tex(r, 1, false) }
}

/** Grass with clumps, dirt patches and blade detail. */
export function grassSurface(): Surface {
  const [c, g] = cv(256)
  const [h, hg] = cv(256)
  const [r, rg] = cv(256)
  g.fillStyle = '#5f9e39'; g.fillRect(0, 0, 256, 256)
  hg.fillStyle = '#808080'; hg.fillRect(0, 0, 256, 256)
  rg.fillStyle = '#e8e8e8'; rg.fillRect(0, 0, 256, 256)
  // Patch variation first, so blades sit on top of it.
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 256, y = Math.random() * 256
    const rad = 12 + Math.random() * 42
    const gr = g.createRadialGradient(x, y, 0, x, y, rad)
    const light = Math.random() < 0.5
    gr.addColorStop(0, light ? 'rgba(124,176,72,0.5)' : 'rgba(66,110,44,0.5)')
    gr.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = gr
    g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill()
  }
  // Dirt showing through.
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * 256, y = Math.random() * 256
    const gr = g.createRadialGradient(x, y, 0, x, y, 18 + Math.random() * 22)
    gr.addColorStop(0, 'rgba(140,110,70,0.55)')
    gr.addColorStop(1, 'rgba(140,110,70,0)')
    g.fillStyle = gr
    g.beginPath(); g.arc(x, y, 40, 0, Math.PI * 2); g.fill()
  }
  // Blades.
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * 256, y = Math.random() * 256
    const len = 2 + Math.random() * 4
    g.strokeStyle = Math.random() < 0.5
      ? `rgba(150,205,90,${0.25 + Math.random() * 0.4})`
      : `rgba(58,100,36,${0.2 + Math.random() * 0.35})`
    g.lineWidth = 0.8
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 2, y - len); g.stroke()
    hg.fillStyle = `rgba(255,255,255,${Math.random() * 0.5})`
    hg.fillRect(x, y, 1, 1)
  }
  return { map: tex(c, 1), normalMap: normalFrom(h, 0.8), roughnessMap: tex(r, 1, false) }
}

/** Cobbled street — irregular rounded setts with mud in the joints. */
export function cobbleSurface(tint = '#7a7469'): Surface {
  const [c, g] = cv(256)
  const [h, hg] = cv(256)
  const [r, rg] = cv(256)
  g.fillStyle = '#3b352d'; g.fillRect(0, 0, 256, 256)
  hg.fillStyle = '#303030'; hg.fillRect(0, 0, 256, 256)
  rg.fillStyle = '#d0d0d0'; rg.fillRect(0, 0, 256, 256)
  // Setts are laid in offset rows and each one is an irregular blob, not a
  // rectangle — a grid of squares reads as a texture atlas, not a street.
  const rows = 11
  const rh = 256 / rows
  for (let row = 0; row < rows; row++) {
    const off = (row % 2) * rh * 0.6
    for (let x = -rh; x < 256 + rh; x += rh * 1.15) {
      const cx = x + off + rh * 0.55 + (Math.random() - 0.5) * 3
      const cy = row * rh + rh * 0.5 + (Math.random() - 0.5) * 3
      const rx = rh * (0.44 + Math.random() * 0.09)
      const ry = rh * (0.38 + Math.random() * 0.09)
      const v = 0.78 + Math.random() * 0.42
      g.fillStyle = shade(tint, v)
      g.beginPath(); g.ellipse(cx, cy, rx, ry, Math.random() * 0.6 - 0.3, 0, Math.PI * 2); g.fill()
      for (let i = 0; i < 24; i++) {
        g.fillStyle = `rgba(0,0,0,${Math.random() * 0.10})`
        g.fillRect(cx - rx + Math.random() * rx * 2, cy - ry + Math.random() * ry * 2, 2, 2)
      }
      // A wet sett is smoother and reflects the torches.
      const wet = Math.random() < 0.3
      rg.fillStyle = wet ? '#7a7a7a' : '#dcdcdc'
      rg.beginPath(); rg.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); rg.fill()
      hg.fillStyle = `rgb(${Math.round(165 + Math.random() * 70)},0,0)`
      hg.beginPath(); hg.ellipse(cx, cy, rx * 0.94, ry * 0.94, 0, 0, Math.PI * 2); hg.fill()
    }
  }
  // Cart ruts worn down the middle of the road.
  const rut = g.createLinearGradient(96, 0, 160, 0)
  rut.addColorStop(0, 'rgba(30,24,16,0)')
  rut.addColorStop(0.5, 'rgba(30,24,16,0.28)')
  rut.addColorStop(1, 'rgba(30,24,16,0)')
  g.fillStyle = rut; g.fillRect(0, 0, 256, 256)
  return { map: tex(c, 1), normalMap: normalFrom(h, 2.8), roughnessMap: tex(r, 1, false) }
}

/** Lime plaster over timber framing — cracked, stained, patched. */
export function plasterSurface(tint = '#d8cfb8'): Surface {
  const [c, g] = cv(256)
  const [h, hg] = cv(256)
  const [r, rg] = cv(256)
  g.fillStyle = shade(tint, 1); g.fillRect(0, 0, 256, 256)
  hg.fillStyle = '#8a8a8a'; hg.fillRect(0, 0, 256, 256)
  rg.fillStyle = '#ececec'; rg.fillRect(0, 0, 256, 256)
  // Trowel mottling first, so cracks and stains sit on top of it.
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * 256, y = Math.random() * 256
    const rad = 14 + Math.random() * 40
    const gr = g.createRadialGradient(x, y, 0, x, y, rad)
    gr.addColorStop(0, Math.random() < 0.5 ? 'rgba(255,250,235,0.30)' : 'rgba(150,140,120,0.26)')
    gr.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = gr
    g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill()
  }
  // Hairline cracks that branch — a straight line reads as a scratch.
  for (let i = 0; i < 14; i++) {
    let x = Math.random() * 256, y = Math.random() * 256
    let a = Math.random() * Math.PI * 2
    g.strokeStyle = 'rgba(70,60,48,0.42)'
    g.lineWidth = 0.8
    g.beginPath(); g.moveTo(x, y)
    for (let k = 0; k < 16; k++) {
      a += (Math.random() - 0.5) * 0.9
      x += Math.cos(a) * 5; y += Math.sin(a) * 5
      g.lineTo(x, y)
      hg.fillStyle = 'rgba(0,0,0,0.5)'
      hg.fillRect(x, y, 1.5, 1.5)
    }
    g.stroke()
  }
  // Damp rising from the ground, which is where real plaster fails first.
  const damp = g.createLinearGradient(0, 176, 0, 256)
  damp.addColorStop(0, 'rgba(96,104,78,0)')
  damp.addColorStop(1, 'rgba(96,104,78,0.42)')
  g.fillStyle = damp; g.fillRect(0, 0, 256, 256)
  rg.fillStyle = 'rgba(120,120,120,0.55)'
  rg.fillRect(0, 200, 256, 56)
  return { map: tex(c, 1), normalMap: normalFrom(h, 1.1), roughnessMap: tex(r, 1, false) }
}

/** Hammered iron — pitted, rusted at the edges. Use with metalness. */
export function ironSurface(tint = '#5d6068'): Surface {
  const [c, g] = cv(256)
  const [h, hg] = cv(256)
  const [r, rg] = cv(256)
  g.fillStyle = shade(tint, 1); g.fillRect(0, 0, 256, 256)
  hg.fillStyle = '#7a7a7a'; hg.fillRect(0, 0, 256, 256)
  rg.fillStyle = '#6a6a6a'; rg.fillRect(0, 0, 256, 256)
  // Hammer facets: overlapping soft dents catching light at different angles.
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * 256, y = Math.random() * 256
    const rad = 5 + Math.random() * 11
    const gr = g.createRadialGradient(x - rad * 0.3, y - rad * 0.3, 0, x, y, rad)
    gr.addColorStop(0, 'rgba(255,255,255,0.14)')
    gr.addColorStop(1, 'rgba(0,0,0,0.16)')
    g.fillStyle = gr
    g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill()
    hg.fillStyle = `rgba(255,255,255,${0.12 + Math.random() * 0.2})`
    hg.beginPath(); hg.arc(x, y, rad * 0.8, 0, Math.PI * 2); hg.fill()
  }
  // Rust blooms. Rust is rough where the clean metal is not, which is the whole
  // reason this needs a roughness map rather than a single value.
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * 256, y = Math.random() * 256
    const rad = 8 + Math.random() * 26
    const gr = g.createRadialGradient(x, y, 0, x, y, rad)
    gr.addColorStop(0, 'rgba(138,72,32,0.62)')
    gr.addColorStop(0.6, 'rgba(112,58,26,0.34)')
    gr.addColorStop(1, 'rgba(112,58,26,0)')
    g.fillStyle = gr
    g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill()
    const rr = rg.createRadialGradient(x, y, 0, x, y, rad)
    rr.addColorStop(0, 'rgba(235,235,235,0.9)')
    rr.addColorStop(1, 'rgba(235,235,235,0)')
    rg.fillStyle = rr
    rg.beginPath(); rg.arc(x, y, rad, 0, Math.PI * 2); rg.fill()
  }
  return { map: tex(c, 1), normalMap: normalFrom(h, 1.9), roughnessMap: tex(r, 1, false) }
}

/** Apply a Surface to a material with sensible tiling. */
export function surfaced(s: Surface, repeat: number, extra: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
  const map = s.map.clone(); map.needsUpdate = true; map.repeat.set(repeat, repeat)
  const nm = s.normalMap.clone(); nm.needsUpdate = true; nm.repeat.set(repeat, repeat)
  const rm = s.roughnessMap.clone(); rm.needsUpdate = true; rm.repeat.set(repeat, repeat)
  return new THREE.MeshStandardMaterial({
    map, normalMap: nm, roughnessMap: rm,
    normalScale: new THREE.Vector2(1.2, 1.2),
    roughness: 1, metalness: 0,
    ...extra,
  })
}

function shade(hex: string, mul: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, Math.round(((n >> 16) & 255) * mul))
  const g = Math.min(255, Math.round(((n >> 8) & 255) * mul))
  const b = Math.min(255, Math.round((n & 255) * mul))
  return `rgb(${r},${g},${b})`
}
