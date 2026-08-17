// app/play/gravity-well/engine.ts — Gravity Well
//
// Game two of twenty-five. Where Ionstorm showed a real-time action loop, this
// shows PHYSICS: n-body gravitational attraction integrated properly, with
// trajectory prediction that runs the same integrator the simulation does.
//
// VERLET INTEGRATION, not Euler. Euler adds energy on every step, so an orbit
// that should be stable spirals outward and the game slowly breaks. Velocity
// Verlet conserves energy well enough that a satellite stays in orbit for
// minutes. This is the difference between a physics toy and a physics game.
//
// The prediction line is the same function as the simulation, run forward on a
// copy. If they were separate implementations they would drift apart and the
// aim line would lie — which is the classic bug in this genre.
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026

export interface Vec { x: number; y: number }

export interface Body {
  pos: Vec
  vel: Vec
  acc: Vec
  mass: number
  radius: number
  kind: 'star' | 'planet' | 'target' | 'hazard' | 'wormhole'
  hue: number
  /** For orbiting scenery: the body it circles and how fast. */
  orbits?: number
  orbitR?: number
  orbitA?: number
  orbitSpeed?: number
  linked?: number
}

export interface Probe {
  pos: Vec
  vel: Vec
  acc: Vec
  alive: boolean
  trail: Vec[]
  fuel: number
}

export interface Level {
  name: string
  hint: string
  bodies: Body[]
  launch: Vec
  par: number
}

export interface State {
  w: number
  h: number
  level: number
  levels: Level[]
  bodies: Body[]
  probe: Probe | null
  shots: number
  phase: 'aim' | 'flying' | 'won' | 'lost' | 'complete'
  aim: Vec | null
  power: number
  best: Record<number, number>
  totalShots: number
  message: string
}

const G = 2600          // gravitational constant, tuned for a 900px playfield
const DT = 1 / 120      // physics runs at double the frame rate for stability
const MAX_TRAIL = 320

/** Twelve levels, each teaching one idea before combining them. */
export function buildLevels(w: number, h: number): Level[] {
  const cx = w / 2, cy = h / 2
  const L = (name: string, hint: string, bodies: Body[], launch: Vec, par: number): Level =>
    ({ name, hint, bodies, launch, par })
  const star = (x: number, y: number, m = 40, r = 26, hue = 42): Body =>
    ({ pos: { x, y }, vel: { x: 0, y: 0 }, acc: { x: 0, y: 0 }, mass: m, radius: r, kind: 'star', hue })
  const target = (x: number, y: number): Body =>
    ({ pos: { x, y }, vel: { x: 0, y: 0 }, acc: { x: 0, y: 0 }, mass: 0, radius: 15, kind: 'target', hue: 150 })
  const hazard = (x: number, y: number, r = 20): Body =>
    ({ pos: { x, y }, vel: { x: 0, y: 0 }, acc: { x: 0, y: 0 }, mass: 12, radius: r, kind: 'hazard', hue: 350 })

  return [
    L('First Light', 'Drag from the probe to aim. Release to launch.',
      [target(w * 0.82, cy)], { x: w * 0.12, y: cy }, 1),

    L('The Well', 'Mass bends your path. Aim past the star, not at it.',
      [star(cx, cy), target(w * 0.85, cy)], { x: w * 0.10, y: cy }, 2),

    L('Slingshot', 'Pass close to gain speed. Too close and you are captured.',
      [star(cx, cy, 55, 30), target(w * 0.86, h * 0.22)], { x: w * 0.10, y: h * 0.80 }, 2),

    L('Twin Stars', 'Two wells. The corridor between them is narrow.',
      [star(cx, h * 0.28, 34, 22), star(cx, h * 0.72, 34, 22), target(w * 0.87, cy)],
      { x: w * 0.09, y: cy }, 3),

    L('Minefield', 'Red bodies pull too, and they end the run.',
      [star(cx, cy, 44, 26), hazard(w * 0.62, h * 0.34), hazard(w * 0.62, h * 0.66),
       target(w * 0.88, cy)], { x: w * 0.09, y: cy }, 3),

    L('Orbit', 'The target is moving. Lead it.',
      [star(cx, cy, 60, 30),
       { pos: { x: cx + 190, y: cy }, vel: { x: 0, y: 0 }, acc: { x: 0, y: 0 }, mass: 0,
         radius: 15, kind: 'target', hue: 150, orbits: 0, orbitR: 190, orbitA: 0, orbitSpeed: 0.42 }],
      { x: w * 0.09, y: h * 0.85 }, 3),

    L('Wormhole', 'Enter one mouth, leave the other. Momentum is preserved.',
      [star(cx, h * 0.75, 40, 24),
       { pos: { x: w * 0.34, y: h * 0.28 }, vel: { x: 0, y: 0 }, acc: { x: 0, y: 0 }, mass: 0,
         radius: 18, kind: 'wormhole', hue: 280, linked: 2 },
       { pos: { x: w * 0.72, y: h * 0.72 }, vel: { x: 0, y: 0 }, acc: { x: 0, y: 0 }, mass: 0,
         radius: 18, kind: 'wormhole', hue: 280, linked: 1 },
       target(w * 0.88, h * 0.30)], { x: w * 0.09, y: h * 0.30 }, 3),

    L('Gauntlet', 'Three wells in a line. Thread them.',
      [star(w * 0.34, cy, 30, 20), star(cx, cy, 30, 20), star(w * 0.66, cy, 30, 20),
       target(w * 0.90, cy)], { x: w * 0.08, y: cy }, 4),

    L('Binary Dance', 'Both stars orbit. The map changes as you fly.',
      [{ pos: { x: cx - 120, y: cy }, vel: { x: 0, y: 0 }, acc: { x: 0, y: 0 }, mass: 38,
         radius: 24, kind: 'star', hue: 42, orbitR: 120, orbitA: 0, orbitSpeed: 0.5 },
       { pos: { x: cx + 120, y: cy }, vel: { x: 0, y: 0 }, acc: { x: 0, y: 0 }, mass: 38,
         radius: 24, kind: 'star', hue: 20, orbitR: 120, orbitA: Math.PI, orbitSpeed: 0.5 },
       target(w * 0.88, h * 0.20)], { x: w * 0.09, y: h * 0.80 }, 4),

    L('Threading', 'Hazards orbit the star. Time your pass.',
      [star(cx, cy, 50, 28),
       { pos: { x: cx + 150, y: cy }, vel: { x: 0, y: 0 }, acc: { x: 0, y: 0 }, mass: 10,
         radius: 16, kind: 'hazard', hue: 350, orbitR: 150, orbitA: 0, orbitSpeed: 0.9 },
       { pos: { x: cx - 150, y: cy }, vel: { x: 0, y: 0 }, acc: { x: 0, y: 0 }, mass: 10,
         radius: 16, kind: 'hazard', hue: 350, orbitR: 150, orbitA: Math.PI, orbitSpeed: 0.9 },
       target(w * 0.89, cy)], { x: w * 0.08, y: cy }, 4),

    L('The Long Way', 'The direct line is blocked. Go around.',
      [star(w * 0.50, cy, 80, 40),
       hazard(w * 0.70, h * 0.50, 26), hazard(w * 0.70, h * 0.30, 22), hazard(w * 0.70, h * 0.70, 22),
       target(w * 0.90, cy)], { x: w * 0.08, y: cy }, 5),

    L('Terminal', 'Everything at once. Good luck.',
      [{ pos: { x: cx, y: cy }, vel: { x: 0, y: 0 }, acc: { x: 0, y: 0 }, mass: 70, radius: 34,
         kind: 'star', hue: 42 },
       { pos: { x: cx + 170, y: cy }, vel: { x: 0, y: 0 }, acc: { x: 0, y: 0 }, mass: 12,
         radius: 15, kind: 'hazard', hue: 350, orbitR: 170, orbitA: 0, orbitSpeed: 0.8 },
       { pos: { x: cx - 170, y: cy }, vel: { x: 0, y: 0 }, acc: { x: 0, y: 0 }, mass: 12,
         radius: 15, kind: 'hazard', hue: 350, orbitR: 170, orbitA: Math.PI, orbitSpeed: 0.8 },
       { pos: { x: w * 0.30, y: h * 0.18 }, vel: { x: 0, y: 0 }, acc: { x: 0, y: 0 }, mass: 0,
         radius: 18, kind: 'wormhole', hue: 280, linked: 4 },
       { pos: { x: w * 0.76, y: h * 0.82 }, vel: { x: 0, y: 0 }, acc: { x: 0, y: 0 }, mass: 0,
         radius: 18, kind: 'wormhole', hue: 280, linked: 3 },
       { pos: { x: w * 0.88, y: h * 0.20 }, vel: { x: 0, y: 0 }, acc: { x: 0, y: 0 }, mass: 0,
         radius: 15, kind: 'target', hue: 150, orbitR: 0, orbitA: 0, orbitSpeed: 0 }],
      { x: w * 0.08, y: h * 0.85 }, 6),
  ]
}

export function newState(w: number, h: number, best: Record<number, number> = {}): State {
  const levels = buildLevels(w, h)
  return {
    w, h, level: 0, levels,
    bodies: JSON.parse(JSON.stringify(levels[0].bodies)) as Body[],
    probe: null, shots: 0, phase: 'aim', aim: null, power: 0,
    best, totalShots: 0, message: levels[0].hint,
  }
}

export function loadLevel(s: State, i: number): void {
  s.level = Math.max(0, Math.min(s.levels.length - 1, i))
  s.bodies = JSON.parse(JSON.stringify(s.levels[s.level].bodies)) as Body[]
  s.probe = null
  s.shots = 0
  s.phase = 'aim'
  s.aim = null
  s.message = s.levels[s.level].hint
}

/** Gravitational acceleration on a point from every massive body. */
function gravityAt(p: Vec, bodies: Body[]): Vec {
  let ax = 0, ay = 0
  for (const b of bodies) {
    if (b.mass <= 0) continue
    const dx = b.pos.x - p.x, dy = b.pos.y - p.y
    // Softening term stops the force exploding to infinity at close range,
    // which would fling the probe off-screen in a single step.
    const d2 = dx * dx + dy * dy + 240
    const d = Math.sqrt(d2)
    const f = (G * b.mass) / d2
    ax += (dx / d) * f
    ay += (dy / d) * f
  }
  return { x: ax, y: ay }
}

/** Velocity Verlet. Euler would add energy every step and break every orbit. */
function integrate(p: { pos: Vec; vel: Vec; acc: Vec }, bodies: Body[], dt: number): void {
  p.pos.x += p.vel.x * dt + 0.5 * p.acc.x * dt * dt
  p.pos.y += p.vel.y * dt + 0.5 * p.acc.y * dt * dt
  const a2 = gravityAt(p.pos, bodies)
  p.vel.x += 0.5 * (p.acc.x + a2.x) * dt
  p.vel.y += 0.5 * (p.acc.y + a2.y) * dt
  p.acc = a2
}

function moveScenery(s: State, t: number): void {
  const cx = s.w / 2, cy = s.h / 2
  for (const b of s.bodies) {
    if (b.orbitSpeed && b.orbitR) {
      const a = (b.orbitA ?? 0) + t * b.orbitSpeed
      const anchor = b.orbits !== undefined ? s.bodies[b.orbits].pos : { x: cx, y: cy }
      b.pos.x = anchor.x + Math.cos(a) * b.orbitR
      b.pos.y = anchor.y + Math.sin(a) * b.orbitR
    }
  }
}

export function launch(s: State, dir: Vec, power: number): void {
  const l = s.levels[s.level]
  const speed = 60 + power * 260
  const probe: Probe = {
    pos: { ...l.launch },
    vel: { x: dir.x * speed, y: dir.y * speed },
    acc: { x: 0, y: 0 },
    alive: true, trail: [], fuel: 0,
  }
  probe.acc = gravityAt(probe.pos, s.bodies)
  s.probe = probe
  s.shots += 1
  s.totalShots += 1
  s.phase = 'flying'
}

/** Runs the SAME integrator forward on a copy, so the line cannot lie. */
export function predict(s: State, dir: Vec, power: number, steps = 900): Vec[] {
  const l = s.levels[s.level]
  const speed = 60 + power * 260
  const p = { pos: { ...l.launch }, vel: { x: dir.x * speed, y: dir.y * speed }, acc: { x: 0, y: 0 } }
  p.acc = gravityAt(p.pos, s.bodies)
  const out: Vec[] = []
  for (let i = 0; i < steps; i++) {
    integrate(p, s.bodies, DT)
    if (i % 4 === 0) out.push({ x: p.pos.x, y: p.pos.y })
    if (p.pos.x < -80 || p.pos.x > s.w + 80 || p.pos.y < -80 || p.pos.y > s.h + 80) break
    let hit = false
    for (const b of s.bodies) {
      if (b.kind === 'target' || b.kind === 'wormhole') continue
      if (Math.hypot(b.pos.x - p.pos.x, b.pos.y - p.pos.y) < b.radius) { hit = true; break }
    }
    if (hit) break
  }
  return out
}

let clock = 0

export function step(s: State, dt: number): void {
  clock += dt
  moveScenery(s, clock)
  if (s.phase !== 'flying' || !s.probe) return
  const p = s.probe

  // Two physics steps per frame: DT is half the frame time, for stability.
  for (let n = 0; n < 2; n++) {
    integrate(p, s.bodies, DT)

    for (let i = 0; i < s.bodies.length; i++) {
      const b = s.bodies[i]
      const d = Math.hypot(b.pos.x - p.pos.x, b.pos.y - p.pos.y)
      if (b.kind === 'target' && d < b.radius + 6) {
        s.phase = 'won'
        const prev = s.best[s.level]
        if (prev === undefined || s.shots < prev) s.best[s.level] = s.shots
        return
      }
      if ((b.kind === 'star' || b.kind === 'hazard') && d < b.radius) {
        p.alive = false
        s.phase = 'lost'
        s.message = b.kind === 'hazard' ? 'Struck a hazard.' : 'Fell into the well.'
        return
      }
      if (b.kind === 'wormhole' && d < b.radius && p.fuel <= 0 && b.linked !== undefined) {
        const other = s.bodies[b.linked]
        // Momentum preserved, position translated — the whole point of the mechanic.
        p.pos.x = other.pos.x + (p.vel.x / (Math.hypot(p.vel.x, p.vel.y) || 1)) * (other.radius + 8)
        p.pos.y = other.pos.y + (p.vel.y / (Math.hypot(p.vel.x, p.vel.y) || 1)) * (other.radius + 8)
        p.fuel = 0.35     // cooldown so it does not ping-pong
        p.trail.push({ x: NaN, y: NaN })   // break the trail across the jump
      }
    }
    p.fuel = Math.max(0, p.fuel - DT)
  }

  p.trail.push({ x: p.pos.x, y: p.pos.y })
  if (p.trail.length > MAX_TRAIL) p.trail.shift()

  if (p.pos.x < -100 || p.pos.x > s.w + 100 || p.pos.y < -100 || p.pos.y > s.h + 100) {
    s.phase = 'lost'
    s.message = 'Lost to open space.'
  }
}

export function nextLevel(s: State): void {
  if (s.level >= s.levels.length - 1) { s.phase = 'complete'; return }
  loadLevel(s, s.level + 1)
}
