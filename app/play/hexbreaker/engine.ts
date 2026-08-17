// app/play/hexbreaker/engine.ts — Hexbreaker
//
// Game four of twenty-five. Ionstorm showed a real-time loop, Gravity Well
// integration, Neon Drift procedural generation. This one shows GRID ALGORITHMS
// and CASCADING STATE: a hex lattice, flood fill, structural support, and chain
// reactions that resolve over time rather than instantly.
//
// AXIAL COORDINATES. Hex grids are done with two axes (q, r) and a derived
// third; offset rows are the common approach and every neighbour lookup becomes
// a special case for odd and even rows. Axial makes the six neighbours a single
// constant table, and distance a two-line function.
//
// SUPPORT IS A FLOOD FILL. A cell survives if it can reach the bedrock row.
// Break the wrong hex and everything above it that has no other path falls.
// That is the whole game, and it is one breadth-first search.
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026

export interface Hex {
  q: number
  r: number
  hp: number
  maxHp: number
  kind: 'stone' | 'crystal' | 'volatile' | 'bedrock' | 'core'
  charge: number      // volatile cells build to detonation
  falling: number     // >0 while animating a collapse
  hue: number
}

export interface Blast { q: number; r: number; t: number; power: number; hue: number }

export interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; hue: number; size: number
}

export interface State {
  cols: number
  rows: number
  size: number         // hex radius in pixels
  originX: number
  originY: number
  cells: Map<string, Hex>
  level: number
  charges: number      // shots remaining
  score: number
  combo: number
  bestCombo: number
  cores: number        // cores that must be exposed to win
  coresFreed: number
  phase: 'aim' | 'resolving' | 'won' | 'lost' | 'complete'
  blasts: Blast[]
  particles: Particle[]
  pending: { q: number; r: number; power: number; delay: number }[]
  shake: number
  best: Record<number, number>
  message: string
}

export const key = (q: number, r: number): string => `${q},${r}`

/** The six axial neighbours. One table, no odd/even row special cases. */
const DIRS: [number, number][] = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]]

export function axialToPixel(q: number, r: number, size: number): { x: number; y: number } {
  return {
    x: size * Math.sqrt(3) * (q + r / 2),
    y: size * 1.5 * r,
  }
}

export function pixelToAxial(x: number, y: number, size: number): { q: number; r: number } {
  const r = (2 / 3) * y / size
  const q = (Math.sqrt(3) / 3 * x - y / 3) / size
  // Cube rounding — rounding q and r independently lands on the wrong hex
  // near the boundaries, which is the classic hex-picking bug.
  let rq = Math.round(q), rr = Math.round(r), rs = Math.round(-q - r)
  const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - (-q - r))
  if (dq > dr && dq > ds) rq = -rr - rs
  else if (dr > ds) rr = -rq - rs
  return { q: rq, r: rr }
}

function prng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const LEVELS = [
  { rows: 8,  cols: 11, charges: 6,  cores: 1, volatile: 0.00, crystal: 0.10 },
  { rows: 9,  cols: 12, charges: 6,  cores: 2, volatile: 0.04, crystal: 0.12 },
  { rows: 10, cols: 13, charges: 6,  cores: 2, volatile: 0.07, crystal: 0.14 },
  { rows: 11, cols: 13, charges: 5,  cores: 3, volatile: 0.09, crystal: 0.15 },
  { rows: 11, cols: 14, charges: 5,  cores: 3, volatile: 0.11, crystal: 0.16 },
  { rows: 12, cols: 15, charges: 5,  cores: 4, volatile: 0.13, crystal: 0.16 },
  { rows: 12, cols: 15, charges: 4,  cores: 4, volatile: 0.15, crystal: 0.18 },
  { rows: 13, cols: 16, charges: 4,  cores: 5, volatile: 0.17, crystal: 0.18 },
]

export function buildLevel(s: State, level: number): void {
  const cfg = LEVELS[Math.min(level, LEVELS.length - 1)]
  const rnd = prng(level * 9176 + 13)
  s.level = level
  s.rows = cfg.rows
  s.cols = cfg.cols
  s.charges = cfg.charges
  s.cores = cfg.cores
  s.coresFreed = 0
  s.combo = 0
  s.phase = 'aim'
  s.blasts = []
  s.particles = []
  s.pending = []
  s.cells = new Map()

  const coreSpots = new Set<string>()
  while (coreSpots.size < cfg.cores) {
    const r = 2 + Math.floor(rnd() * (cfg.rows - 4))
    const q = Math.floor(rnd() * cfg.cols) - Math.floor(r / 2)
    coreSpots.add(key(q, r))
  }

  for (let r = 0; r < cfg.rows; r++) {
    const offset = -Math.floor(r / 2)
    for (let i = 0; i < cfg.cols; i++) {
      const q = i + offset
      const k = key(q, r)
      let kind: Hex['kind'] = 'stone'
      let hp = 2, hue = 210
      if (r === cfg.rows - 1) { kind = 'bedrock'; hp = 999; hue = 220 }
      else if (coreSpots.has(k)) { kind = 'core'; hp = 3; hue = 150 }
      else {
        const roll = rnd()
        if (roll < cfg.volatile) { kind = 'volatile'; hp = 1; hue = 20 }
        else if (roll < cfg.volatile + cfg.crystal) { kind = 'crystal'; hp = 4; hue = 280 }
        else { hp = 1 + Math.floor(rnd() * 3); hue = 200 + hp * 8 }
      }
      s.cells.set(k, { q, r, hp, maxHp: hp, kind, charge: 0, falling: 0, hue })
    }
  }
}

export function newState(w: number, h: number, best: Record<number, number> = {}): State {
  const s: State = {
    cols: 11, rows: 8, size: 20, originX: 0, originY: 0,
    cells: new Map(), level: 0, charges: 6, score: 0, combo: 0, bestCombo: 0,
    cores: 1, coresFreed: 0, phase: 'aim', blasts: [], particles: [], pending: [],
    shake: 0, best, message: 'Break the lattice. Free every green core.',
  }
  buildLevel(s, 0)
  fit(s, w, h)
  return s
}

/** Centre the lattice in the canvas and pick a hex size that fits. */
export function fit(s: State, w: number, h: number): void {
  const byW = w / (Math.sqrt(3) * (s.cols + 1))
  const byH = h / (1.5 * (s.rows + 1))
  s.size = Math.max(12, Math.min(byW, byH))
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const c of s.cells.values()) {
    const p = axialToPixel(c.q, c.r, s.size)
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
  }
  s.originX = (w - (maxX - minX)) / 2 - minX
  s.originY = (h - (maxY - minY)) / 2 - minY
}

/** Breadth-first from bedrock. Anything not reached has lost its support. */
function supported(s: State): Set<string> {
  const seen = new Set<string>()
  const queue: Hex[] = []
  for (const c of s.cells.values()) {
    if (c.kind === 'bedrock') { seen.add(key(c.q, c.r)); queue.push(c) }
  }
  while (queue.length) {
    const c = queue.shift()!
    for (const [dq, dr] of DIRS) {
      const k = key(c.q + dq, c.r + dr)
      if (seen.has(k)) continue
      const n = s.cells.get(k)
      if (!n) continue
      seen.add(k)
      queue.push(n)
    }
  }
  return seen
}

function spawnParticles(s: State, c: Hex, n: number): void {
  const p = axialToPixel(c.q, c.r, s.size)
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2
    const sp = 40 + Math.random() * 180
    s.particles.push({
      x: p.x + s.originX, y: p.y + s.originY,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.3 + Math.random() * 0.5, hue: c.hue + (Math.random() - 0.5) * 24,
      size: 1.5 + Math.random() * 3,
    })
  }
}

/** Apply damage at a hex. Returns true if it was destroyed. */
function damage(s: State, q: number, r: number, power: number): boolean {
  const c = s.cells.get(key(q, r))
  if (!c || c.kind === 'bedrock') return false
  c.hp -= power
  spawnParticles(s, c, 4)
  if (c.hp > 0) return false

  s.cells.delete(key(q, r))
  s.combo += 1
  s.bestCombo = Math.max(s.bestCombo, s.combo)
  // Score rises with the combo, so a chain is worth far more than the same
  // number of cells broken one at a time.
  s.score += 10 * s.combo
  spawnParticles(s, c, c.kind === 'volatile' ? 26 : 10)
  s.blasts.push({ q, r, t: 0, power: c.kind === 'volatile' ? 2.2 : 1, hue: c.hue })

  if (c.kind === 'core') {
    s.coresFreed += 1
    s.score += 250
  }
  if (c.kind === 'volatile') {
    // Detonation queued with a delay — the cascade unfolds visibly instead of
    // resolving in a single frame, which is what makes a chain satisfying.
    s.shake = Math.min(1.4, s.shake + 0.6)
    for (const [dq, dr] of DIRS) {
      s.pending.push({ q: q + dq, r: r + dr, power: 2, delay: 0.09 })
    }
    for (const [dq, dr] of DIRS) {
      s.pending.push({ q: q + dq * 2, r: r + dr * 2, power: 1, delay: 0.18 })
    }
  }
  return true
}

export function shoot(s: State, q: number, r: number): void {
  if (s.phase !== 'aim' || s.charges <= 0) return
  if (!s.cells.has(key(q, r))) return
  s.charges -= 1
  s.combo = 0
  s.phase = 'resolving'
  s.shake = 0.5
  damage(s, q, r, 3)
}

export function step(s: State, dt: number): void {
  s.shake = Math.max(0, s.shake - dt * 2.6)

  for (const b of s.blasts) b.t += dt
  s.blasts = s.blasts.filter(b => b.t < 0.45)

  for (const p of s.particles) {
    p.x += p.vx * dt; p.y += p.vy * dt
    p.vy += 320 * dt              // debris falls
    p.vx *= Math.pow(0.4, dt)
    p.life -= dt
  }
  s.particles = s.particles.filter(p => p.life > 0)

  if (s.phase !== 'resolving') return

  // Work the queued detonations.
  let fired = false
  for (const p of s.pending) {
    p.delay -= dt
    if (p.delay <= 0) { damage(s, p.q, p.r, p.power); fired = true }
  }
  s.pending = s.pending.filter(p => p.delay > 0)

  // Unsupported cells fall away, which can itself expose a core.
  if (!fired && !s.pending.length) {
    const keep = supported(s)
    const doomed: Hex[] = []
    for (const c of s.cells.values()) {
      if (!keep.has(key(c.q, c.r))) doomed.push(c)
    }
    if (doomed.length) {
      for (const c of doomed) {
        spawnParticles(s, c, 8)
        s.combo += 1
        s.score += 6 * s.combo
        if (c.kind === 'core') { s.coresFreed += 1; s.score += 250 }
        s.cells.delete(key(c.q, c.r))
      }
      s.bestCombo = Math.max(s.bestCombo, s.combo)
      s.shake = Math.min(1.4, s.shake + 0.4)
      return
    }

    // Settled. Decide the outcome.
    if (s.coresFreed >= s.cores) {
      s.score += s.charges * 120        // unused charges are worth banking
      const prev = s.best[s.level]
      if (prev === undefined || s.score > prev) s.best[s.level] = s.score
      s.phase = s.level >= LEVELS.length - 1 ? 'complete' : 'won'
      s.message = s.phase === 'complete' ? 'Every seam cleared.' : 'Cores freed.'
    } else if (s.charges <= 0) {
      s.phase = 'lost'
      s.message = `${s.coresFreed} of ${s.cores} cores freed.`
    } else {
      s.phase = 'aim'
    }
  }
}

export function nextLevel(s: State, w: number, h: number): void {
  buildLevel(s, Math.min(s.level + 1, LEVELS.length - 1))
  fit(s, w, h)
}

export function retry(s: State, w: number, h: number): void {
  buildLevel(s, s.level)
  fit(s, w, h)
}

export const LEVEL_COUNT = LEVELS.length
export { DIRS }
