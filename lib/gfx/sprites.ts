// lib/gfx/sprites.ts — procedural sprite baking
//
// The first nine games drew primitives every frame: a circle is a ship, a
// triangle is a fighter. Bloom flatters that but it is still a shape.
//
// This bakes detailed sprites ONCE into offscreen canvases at load, then blits
// them. Baking buys detail for free: a hull can have plating, panel lines,
// riveted seams, engine housings and a painted stripe, because that cost is
// paid a single time rather than sixty times a second.
//
// EVERY SPRITE IS PROCEDURAL. No image assets to load, no licensing question,
// no network round trip, and a ship class can be recoloured per faction by
// baking a second variant rather than shipping a second file.
//
// SPRITES ARE PRE-ROTATED. Rotating a canvas per draw call forces the browser
// to resample the bitmap every frame. Baking 32 rotations and picking the
// nearest costs a little memory and removes that entirely.
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026

export interface Sprite {
  frames: HTMLCanvasElement[]   // pre-rotated, index 0 = pointing right
  size: number
}

const ROTATIONS = 32

function make(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')!
  return [c, g]
}

/** Bake a drawing function into pre-rotated frames. */
function bake(size: number, paint: (g: CanvasRenderingContext2D, s: number) => void): Sprite {
  const [base, bg] = make(size)
  bg.translate(size / 2, size / 2)
  paint(bg, size)
  const frames: HTMLCanvasElement[] = []
  for (let i = 0; i < ROTATIONS; i++) {
    const [c, g] = make(size)
    g.translate(size / 2, size / 2)
    g.rotate((i / ROTATIONS) * Math.PI * 2)
    g.drawImage(base, -size / 2, -size / 2)
    frames.push(c)
  }
  return { frames, size }
}

/** Draw a baked sprite at a world position and angle. */
export function drawSprite(ctx: CanvasRenderingContext2D, sp: Sprite,
                           x: number, y: number, angle: number, scale = 1): void {
  let i = Math.round((angle / (Math.PI * 2)) * ROTATIONS) % ROTATIONS
  if (i < 0) i += ROTATIONS
  const f = sp.frames[i]
  const s = sp.size * scale
  ctx.drawImage(f, x - s / 2, y - s / 2, s, s)
}

/** Metal panel shading: a gradient plus panel lines, the base of every hull. */
function plate(g: CanvasRenderingContext2D, w: number, h: number, hue: number, sat = 30) {
  const grad = g.createLinearGradient(0, -h / 2, 0, h / 2)
  grad.addColorStop(0, `hsl(${hue},${sat}%,52%)`)
  grad.addColorStop(0.42, `hsl(${hue},${sat}%,34%)`)
  grad.addColorStop(0.5, `hsl(${hue},${sat}%,44%)`)
  grad.addColorStop(1, `hsl(${hue},${sat}%,18%)`)
  g.fillStyle = grad
  g.fill()
  // Panel lines: thin dark strokes that read as construction at any size.
  g.strokeStyle = `hsla(${hue},${sat}%,10%,0.65)`
  g.lineWidth = 1
  for (let i = -w / 2 + 6; i < w / 2; i += 7) {
    g.beginPath(); g.moveTo(i, -h / 2); g.lineTo(i, h / 2); g.stroke()
  }
  // Specular edge along the top.
  g.strokeStyle = `hsla(${hue},${sat + 20}%,78%,0.55)`
  g.lineWidth = 1.4
  g.stroke()
}

/** A fighter: swept wings, a canopy, two engine bells. */
export function bakeFighter(hue: number, size = 34): Sprite {
  return bake(size, (g, s) => {
    const L = s * 0.42, W = s * 0.30
    // wings
    g.beginPath()
    g.moveTo(L * 0.2, 0)
    g.lineTo(-L * 0.5, -W)
    g.lineTo(-L * 0.75, -W * 0.55)
    g.lineTo(-L * 0.3, 0)
    g.lineTo(-L * 0.75, W * 0.55)
    g.lineTo(-L * 0.5, W)
    g.closePath()
    plate(g, L, W * 2, hue, 26)
    // fuselage
    g.beginPath()
    g.moveTo(L, 0)
    g.lineTo(L * 0.1, -W * 0.34)
    g.lineTo(-L * 0.85, -W * 0.24)
    g.lineTo(-L * 0.85, W * 0.24)
    g.lineTo(L * 0.1, W * 0.34)
    g.closePath()
    plate(g, L * 2, W * 0.7, hue, 34)
    // canopy
    g.fillStyle = `hsla(${(hue + 180) % 360},80%,62%,0.85)`
    g.beginPath()
    g.ellipse(L * 0.18, 0, L * 0.2, W * 0.16, 0, 0, Math.PI * 2)
    g.fill()
    // engine bells
    for (const sy of [-1, 1]) {
      g.fillStyle = 'hsl(0,0%,14%)'
      g.fillRect(-L * 0.92, sy * W * 0.30 - W * 0.09, L * 0.16, W * 0.18)
      g.fillStyle = `hsla(${(hue + 160) % 360},100%,66%,0.95)`
      g.fillRect(-L * 0.96, sy * W * 0.30 - W * 0.05, L * 0.06, W * 0.10)
    }
  })
}

/** A cruiser: long spine, hull blisters, turrets, four engines. */
export function bakeCruiser(hue: number, size = 66): Sprite {
  return bake(size, (g, s) => {
    const L = s * 0.46, W = s * 0.16
    // main hull
    g.beginPath()
    g.moveTo(L, 0)
    g.lineTo(L * 0.55, -W)
    g.lineTo(-L * 0.9, -W * 0.9)
    g.lineTo(-L, -W * 0.4)
    g.lineTo(-L, W * 0.4)
    g.lineTo(-L * 0.9, W * 0.9)
    g.lineTo(L * 0.55, W)
    g.closePath()
    plate(g, L * 2, W * 2, hue, 22)
    // dorsal spine
    g.beginPath()
    g.moveTo(L * 0.6, 0); g.lineTo(L * 0.1, -W * 0.42)
    g.lineTo(-L * 0.7, -W * 0.34); g.lineTo(-L * 0.7, W * 0.34)
    g.lineTo(L * 0.1, W * 0.42)
    g.closePath()
    plate(g, L * 1.4, W * 0.8, hue, 30)
    // turrets
    for (const tx of [L * 0.34, -L * 0.05, -L * 0.44]) {
      g.fillStyle = 'hsl(0,0%,22%)'
      g.beginPath(); g.arc(tx, 0, W * 0.30, 0, Math.PI * 2); g.fill()
      g.strokeStyle = 'hsla(0,0%,70%,0.7)'
      g.lineWidth = 1.2
      g.beginPath(); g.moveTo(tx, 0); g.lineTo(tx + W * 0.55, 0); g.stroke()
    }
    // bridge glow
    g.fillStyle = `hsla(${(hue + 190) % 360},90%,68%,0.9)`
    g.fillRect(L * 0.5, -W * 0.12, L * 0.14, W * 0.24)
    // engines
    for (const sy of [-1, -0.34, 0.34, 1]) {
      g.fillStyle = 'hsl(0,0%,12%)'
      g.fillRect(-L * 1.02, sy * W * 0.62 - W * 0.12, L * 0.12, W * 0.24)
      g.fillStyle = `hsla(${(hue + 160) % 360},100%,70%,0.95)`
      g.fillRect(-L * 1.06, sy * W * 0.62 - W * 0.07, L * 0.05, W * 0.14)
    }
  })
}

/** A carrier: broad flight deck, hangar mouth, running lights. */
export function bakeCarrier(hue: number, size = 88): Sprite {
  return bake(size, (g, s) => {
    const L = s * 0.46, W = s * 0.22
    g.beginPath()
    g.moveTo(L, -W * 0.30)
    g.lineTo(L, W * 0.30)
    g.lineTo(L * 0.2, W)
    g.lineTo(-L, W * 0.8)
    g.lineTo(-L, -W * 0.8)
    g.lineTo(L * 0.2, -W)
    g.closePath()
    plate(g, L * 2, W * 2, hue, 18)
    // flight deck stripe
    g.strokeStyle = 'hsla(48,90%,60%,0.55)'
    g.lineWidth = 2
    g.setLineDash([6, 6])
    g.beginPath(); g.moveTo(L * 0.85, 0); g.lineTo(-L * 0.85, 0); g.stroke()
    g.setLineDash([])
    // hangar mouth
    g.fillStyle = 'hsl(0,0%,8%)'
    g.fillRect(L * 0.72, -W * 0.36, L * 0.26, W * 0.72)
    g.fillStyle = `hsla(${(hue + 190) % 360},95%,62%,0.35)`
    g.fillRect(L * 0.74, -W * 0.30, L * 0.20, W * 0.60)
    // running lights
    for (let i = -3; i <= 3; i++) {
      g.fillStyle = i % 2 ? 'hsla(0,90%,60%,0.9)' : 'hsla(140,90%,60%,0.9)'
      g.beginPath(); g.arc(i * L * 0.24, -W * 0.86, 1.6, 0, Math.PI * 2); g.fill()
      g.beginPath(); g.arc(i * L * 0.24, W * 0.86, 1.6, 0, Math.PI * 2); g.fill()
    }
    // engine bank
    for (const sy of [-0.55, 0, 0.55]) {
      g.fillStyle = 'hsl(0,0%,10%)'
      g.fillRect(-L * 1.0, sy * W - W * 0.16, L * 0.1, W * 0.32)
      g.fillStyle = `hsla(${(hue + 160) % 360},100%,70%,0.95)`
      g.fillRect(-L * 1.04, sy * W - W * 0.10, L * 0.05, W * 0.20)
    }
  })
}

/** A station: not rotated, so one frame is enough — but bake it the same way. */
export function bakeStation(hue: number, size = 96): Sprite {
  return bake(size, (g, s) => {
    const R = s * 0.36
    // outer ring
    g.beginPath()
    g.arc(0, 0, R, 0, Math.PI * 2)
    g.arc(0, 0, R * 0.74, 0, Math.PI * 2, true)
    g.fillStyle = `hsl(${hue},22%,32%)`
    g.fill()
    g.strokeStyle = `hsla(${hue},30%,68%,0.6)`
    g.lineWidth = 1.4
    g.stroke()
    // spokes
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      g.strokeStyle = `hsl(${hue},22%,42%)`
      g.lineWidth = R * 0.09
      g.beginPath()
      g.moveTo(Math.cos(a) * R * 0.22, Math.sin(a) * R * 0.22)
      g.lineTo(Math.cos(a) * R * 0.76, Math.sin(a) * R * 0.76)
      g.stroke()
    }
    // hub
    g.beginPath(); g.arc(0, 0, R * 0.24, 0, Math.PI * 2)
    g.fillStyle = `hsl(${hue},26%,44%)`
    g.fill()
    g.strokeStyle = `hsla(${hue},40%,76%,0.7)`
    g.lineWidth = 1.2
    g.stroke()
    // window lights around the ring
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2
      g.fillStyle = `hsla(${(hue + 190) % 360},95%,70%,${0.4 + (i % 3) * 0.22})`
      g.beginPath()
      g.arc(Math.cos(a) * R * 0.87, Math.sin(a) * R * 0.87, 1.5, 0, Math.PI * 2)
      g.fill()
    }
  })
}

/** A planet: lit limb, terminator, atmosphere rim, banded surface. */
export function bakePlanet(hue: number, size = 150): HTMLCanvasElement {
  const [c, g] = make(size)
  const R = size * 0.42
  g.translate(size / 2, size / 2)
  // atmosphere
  const atm = g.createRadialGradient(0, 0, R * 0.9, 0, 0, R * 1.16)
  atm.addColorStop(0, `hsla(${hue},80%,60%,0.36)`)
  atm.addColorStop(1, `hsla(${hue},80%,60%,0)`)
  g.fillStyle = atm
  g.beginPath(); g.arc(0, 0, R * 1.16, 0, Math.PI * 2); g.fill()
  // surface, lit from the upper left
  const surf = g.createRadialGradient(-R * 0.35, -R * 0.35, R * 0.1, 0, 0, R)
  surf.addColorStop(0, `hsl(${hue},52%,58%)`)
  surf.addColorStop(0.55, `hsl(${hue},48%,32%)`)
  surf.addColorStop(1, `hsl(${hue},44%,8%)`)
  g.fillStyle = surf
  g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill()
  // bands, clipped to the disc
  g.save()
  g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.clip()
  for (let i = 0; i < 7; i++) {
    const y = -R + (i / 7) * R * 2 + Math.sin(i) * 4
    g.fillStyle = `hsla(${hue + (i % 2 ? 12 : -10)},46%,${i % 2 ? 40 : 26}%,0.42)`
    g.beginPath()
    g.ellipse(0, y, R * 1.1, R * (0.07 + (i % 3) * 0.03), 0, 0, Math.PI * 2)
    g.fill()
  }
  g.restore()
  // rim light on the dark limb
  g.strokeStyle = `hsla(${hue},90%,72%,0.5)`
  g.lineWidth = 1.6
  g.beginPath(); g.arc(0, 0, R, Math.PI * 0.15, Math.PI * 1.1); g.stroke()
  return c
}
