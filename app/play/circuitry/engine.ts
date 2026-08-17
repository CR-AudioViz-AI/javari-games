// app/play/circuitry/engine.ts — Circuitry, the simulation
//
// A power-routing puzzle on a printed circuit board. Rotate trace tiles so that
// current runs from each coloured source to its matching sink. Three twists
// keep it from being a pipe-rotation clone:
//
//   COLOURED CURRENT. Up to three independent circuits share one board. A sink
//   only lights for its own colour.
//
//   SHORTS. If two different colours reach the same conductor the tile shorts
//   and stops carrying anything. Routing is therefore about separation as much
//   as connection.
//
//   BRIDGES. A bridge tile carries north-south and east-west independently, so
//   two circuits can cross without touching.
//
// This file knows nothing about three.js, canvases, React or pixels. It is the
// same contract every game in the arcade follows: the simulation is handed time
// and input, and exposes state. How that state is drawn is not its business.
//
// Every generated board is verified solvable before it is handed out: the
// generator builds a solution, confirms the solution actually powers every sink
// with no shorts, and only then scrambles the rotations.
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026

export type Kind = 'blank' | 'wire' | 'bridge' | 'source' | 'sink' | 'amp'

/** Direction bits, in index order north, east, south, west. */
export const N = 1
export const E = 2
export const S = 4
export const W = 8
const BIT = [N, E, S, W]
const DX = [0, 1, 0, -1]
const DY = [-1, 0, 1, 0]

/** Circuit colours as hex. Colour identity is game data, not a render choice. */
export const COLOURS = [0x4fd1ff, 0xf5c542, 0xff5ea8]
export const COLOUR_NAMES = ['Cyan', 'Amber', 'Rose']
export const SHORT_COLOUR = 0xff3b30

export interface Tile {
  kind: Kind
  /** Connection mask at rotation zero. */
  base: number
  /** Current rotation, quarter turns clockwise. */
  rot: number
  /** The rotation the generator intended. Used for par, never shown. */
  sol: number
  /** Circuit colour for sources and sinks, -1 for neutral conductors. */
  colour: number
  locked: boolean
  /** Energised colour of the primary group, -1 if dead. */
  live: number
  /** Energised colour of a bridge's east-west group, -1 if dead. */
  liveB: number
  shorted: boolean
  /** Radians of rotation the renderer still has to catch up on. */
  spin: number
}

export type Phase = 'ready' | 'playing' | 'solved' | 'complete'

export interface State {
  cols: number
  rows: number
  tiles: Tile[]
  level: number
  moves: number
  par: number
  elapsed: number
  score: number
  best: number
  phase: Phase
  /** Monotonic seconds, so the renderer can animate current flow. */
  flow: number
  /** Set for one frame after a successful solve, for celebration effects. */
  justSolved: boolean
  sinkIdx: number[]
  ampIdx: number[]
  sourceIdx: number[]
}

export interface LevelSpec {
  cols: number
  rows: number
  colours: number
  amps: number
  bridges: boolean
  locks: number
  decoys: number
}

/** Twelve boards, widening from a single trace to three crossing circuits. */
export const LEVELS: LevelSpec[] = [
  { cols: 5, rows: 5, colours: 1, amps: 0, bridges: false, locks: 0, decoys: 0 },
  { cols: 5, rows: 5, colours: 1, amps: 1, bridges: false, locks: 0, decoys: 2 },
  { cols: 6, rows: 5, colours: 2, amps: 0, bridges: false, locks: 1, decoys: 2 },
  { cols: 6, rows: 6, colours: 2, amps: 1, bridges: false, locks: 1, decoys: 3 },
  { cols: 7, rows: 6, colours: 2, amps: 1, bridges: true, locks: 1, decoys: 3 },
  { cols: 7, rows: 6, colours: 2, amps: 2, bridges: true, locks: 2, decoys: 4 },
  { cols: 7, rows: 7, colours: 3, amps: 1, bridges: true, locks: 2, decoys: 4 },
  { cols: 8, rows: 7, colours: 3, amps: 2, bridges: true, locks: 2, decoys: 5 },
  { cols: 8, rows: 7, colours: 3, amps: 2, bridges: true, locks: 1, decoys: 6 },
  { cols: 8, rows: 8, colours: 3, amps: 3, bridges: true, locks: 1, decoys: 6 },
  { cols: 9, rows: 8, colours: 3, amps: 3, bridges: true, locks: 0, decoys: 7 },
  { cols: 9, rows: 9, colours: 3, amps: 4, bridges: true, locks: 0, decoys: 8 },
]

export const LEVEL_COUNT = LEVELS.length

// ── Utilities ──────────────────────────────────────────────────────────────

/** Deterministic RNG. A given seed always yields the same board. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Rotate a connection mask by q quarter turns clockwise. */
export function rotateMask(mask: number, q: number): number {
  let m = mask & 15
  for (let i = 0; i < (((q % 4) + 4) % 4); i++) m = ((m << 1) | (m >> 3)) & 15
  return m
}

/** The live connection mask of a tile in its current rotation. */
export function maskOf(t: Tile): number {
  return rotateMask(t.base, t.rot)
}

/** Which conduction group a direction belongs to. Bridges have two. */
function groupOf(t: Tile, dirIndex: number): number {
  if (t.kind !== 'bridge') return 0
  return dirIndex % 2 === 0 ? 0 : 1
}

function blankTile(): Tile {
  return {
    kind: 'blank', base: 0, rot: 0, sol: 0, colour: -1,
    locked: false, live: -1, liveB: -1, shorted: false, spin: 0,
  }
}

// ── Power propagation ──────────────────────────────────────────────────────

/**
 * Flood current outward from every source at once. Colours are advanced in
 * lockstep so that a contested tile is discovered as a short rather than being
 * claimed by whichever colour happened to be processed first.
 */
export function power(s: State): void {
  const { cols, rows, tiles } = s
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i]
    t.live = -1
    t.liveB = -1
    t.shorted = false
  }

  // Node key is cell index * 2 + group. -1 unvisited, -2 shorted.
  const seen = new Int8Array(tiles.length * 2).fill(-1)
  let frontier: number[] = []   // triples: nodeKey, colour
  const queue: number[] = []

  for (let i = 0; i < s.sourceIdx.length; i++) {
    const idx = s.sourceIdx[i]
    queue.push(idx * 2, tiles[idx].colour)
  }

  let guard = 0
  while (queue.length > 0 && guard++ < 40000) {
    frontier = queue.splice(0, queue.length)
    for (let f = 0; f < frontier.length; f += 2) {
      const node = frontier[f]
      const colour = frontier[f + 1]
      const prev = seen[node]
      if (prev === colour) continue
      if (prev !== -1) {
        // A second colour reached this conductor. It shorts and carries nothing.
        seen[node] = -2
        continue
      }
      seen[node] = colour

      const idx = node >> 1
      const group = node & 1
      const t = tiles[idx]
      const mask = maskOf(t)
      const cx = idx % cols
      const cy = (idx / cols) | 0

      for (let d = 0; d < 4; d++) {
        if ((mask & BIT[d]) === 0) continue
        if (groupOf(t, d) !== group) continue
        const nx = cx + DX[d]
        const ny = cy + DY[d]
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
        const nIdx = ny * cols + nx
        const n = tiles[nIdx]
        if (n.kind === 'blank') continue
        const back = (d + 2) % 4
        if ((maskOf(n) & BIT[back]) === 0) continue
        queue.push(nIdx * 2 + groupOf(n, back), colour)
      }
    }
  }

  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i]
    const a = seen[i * 2]
    const b = seen[i * 2 + 1]
    t.live = a >= 0 ? a : -1
    t.liveB = b >= 0 ? b : -1
    t.shorted = a === -2 || b === -2
  }
}

/** A sink is satisfied when its own colour reaches it cleanly. */
export function sinkLit(t: Tile): boolean {
  return !t.shorted && t.live === t.colour && t.colour >= 0
}

export function isSolved(s: State): boolean {
  for (let i = 0; i < s.tiles.length; i++) if (s.tiles[i].shorted) return false
  for (let i = 0; i < s.sinkIdx.length; i++) if (!sinkLit(s.tiles[s.sinkIdx[i]])) return false
  for (let i = 0; i < s.ampIdx.length; i++) if (s.tiles[s.ampIdx[i]].live < 0) return false
  return true
}

// ── Board generation ───────────────────────────────────────────────────────

interface Carve {
  cells: number[]
  bits: number[]
}

/**
 * A randomised depth-first walk from an edge cell to the opposite edge. A step
 * is normally one cell; where bridges are allowed a step may also jump straight
 * over a cell already owned by another circuit, which becomes a bridge.
 */
function carve(
  owner: Int16Array, bits: Int16Array, cols: number, rows: number,
  colour: number, rng: () => number, bridges: boolean,
): Carve | null {
  const total = cols * rows
  const vertical = rng() < 0.5
  const startEdge = rng() < 0.5

  const starts: number[] = []
  const ends: number[] = []
  for (let i = 0; i < (vertical ? cols : rows); i++) {
    const a = vertical ? (startEdge ? i : (rows - 1) * cols + i)
                       : (startEdge ? i * cols : i * cols + cols - 1)
    const b = vertical ? (startEdge ? (rows - 1) * cols + i : i)
                       : (startEdge ? i * cols + cols - 1 : i * cols)
    if (owner[a] === -1) starts.push(a)
    if (owner[b] === -1) ends.push(b)
  }
  if (starts.length === 0 || ends.length === 0) return null

  const start = starts[(rng() * starts.length) | 0]
  const goal = ends[(rng() * ends.length) | 0]
  if (start === goal) return null

  const visited = new Uint8Array(total)
  const path: number[] = [start]
  const stepBits: number[] = []
  visited[start] = 1

  const order = [0, 1, 2, 3]
  let guard = 0
  while (path.length > 0 && guard++ < 20000) {
    const cur = path[path.length - 1]
    if (cur === goal) {
      return { cells: path.slice(), bits: stepBits.slice() }
    }
    // Shuffle the four directions so the walk is not biased.
    for (let i = 3; i > 0; i--) {
      const j = (rng() * (i + 1)) | 0
      const tmp = order[i]; order[i] = order[j]; order[j] = tmp
    }

    let moved = false
    const cx = cur % cols
    const cy = (cur / cols) | 0
    for (let k = 0; k < 4; k++) {
      const d = order[k]
      const nx = cx + DX[d]
      const ny = cy + DY[d]
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
      const nIdx = ny * cols + nx
      if (visited[nIdx]) continue

      if (owner[nIdx] === -1) {
        visited[nIdx] = 1
        path.push(nIdx)
        stepBits.push(d)
        moved = true
        break
      }

      // Occupied. A straight jump over it is legal only if the occupant runs
      // dead straight across our line of travel and no bridge is there already.
      if (!bridges) continue
      const occ = bits[nIdx]
      const perp = d % 2 === 0 ? (E | W) : (N | S)
      if (occ !== perp) continue
      const jx = nx + DX[d]
      const jy = ny + DY[d]
      if (jx < 0 || jy < 0 || jx >= cols || jy >= rows) continue
      const jIdx = jy * cols + jx
      if (owner[jIdx] !== -1 || visited[jIdx]) continue
      visited[nIdx] = 1
      visited[jIdx] = 1
      path.push(nIdx, jIdx)
      stepBits.push(d, d)
      moved = true
      break
    }
    if (!moved) {
      path.pop()
      stepBits.pop()
      // A bridge move pushed two cells at once. Never leave the walk standing
      // on the cell it was only passing through.
      while (path.length > 0 && owner[path[path.length - 1]] !== -1) {
        path.pop()
        stepBits.pop()
      }
    }
  }
  return null
}

/** Build one board. Returns null if this seed produced nothing usable. */
function build(spec: LevelSpec, seed: number): State | null {
  const rng = mulberry32(seed)
  const { cols, rows } = spec
  const total = cols * rows
  const owner = new Int16Array(total).fill(-1)
  const bits = new Int16Array(total)
  const bridged = new Uint8Array(total)
  const routes: Carve[] = []

  for (let c = 0; c < spec.colours; c++) {
    let route: Carve | null = null
    for (let attempt = 0; attempt < 24 && route === null; attempt++) {
      route = carve(owner, bits, cols, rows, c, rng, spec.bridges)
    }
    if (route === null || route.cells.length < 4) return null

    for (let i = 0; i < route.cells.length; i++) {
      const cell = route.cells[i]
      let m = 0
      if (i > 0) m |= BIT[(route.bits[i - 1] + 2) % 4]
      if (i < route.bits.length) m |= BIT[route.bits[i]]
      if (owner[cell] !== -1) {
        bridged[cell] = 1
        bits[cell] = bits[cell] | m
      } else {
        owner[cell] = c
        bits[cell] = m
      }
    }
    routes.push(route)
  }

  const tiles: Tile[] = new Array(total)
  for (let i = 0; i < total; i++) tiles[i] = blankTile()

  const sinkIdx: number[] = []
  const ampIdx: number[] = []
  const sourceIdx: number[] = []

  for (let c = 0; c < routes.length; c++) {
    const route = routes[c]
    for (let i = 0; i < route.cells.length; i++) {
      const cell = route.cells[i]
      const t = tiles[cell]
      if (bridged[cell]) {
        // A crossing is a crossing at any rotation, so a bridge is fixed. Left
        // rotatable it would be a click that never changes the board.
        t.kind = 'bridge'
        t.base = bits[cell]
        t.locked = true
        continue
      }
      t.base = bits[cell]
      if (i === 0) {
        t.kind = 'source'
        t.colour = c
        sourceIdx.push(cell)
      } else if (i === route.cells.length - 1) {
        t.kind = 'sink'
        t.colour = c
        sinkIdx.push(cell)
      } else {
        t.kind = 'wire'
      }
    }
  }

  // Amplifiers sit on interior wire cells and must be energised to finish.
  const candidates: number[] = []
  for (let i = 0; i < total; i++) if (tiles[i].kind === 'wire') candidates.push(i)
  for (let a = 0; a < spec.amps && candidates.length > 0; a++) {
    const pick = (rng() * candidates.length) | 0
    const cell = candidates.splice(pick, 1)[0]
    tiles[cell].kind = 'amp'
    ampIdx.push(cell)
  }

  // Decoys: unused pads carrying a real trace that must be steered away from
  // the live circuits. They are only placed where a safe orientation exists.
  for (let d = 0; d < spec.decoys; d++) {
    const free: number[] = []
    for (let i = 0; i < total; i++) if (tiles[i].kind === 'blank') free.push(i)
    if (free.length === 0) break
    const cell = free[(rng() * free.length) | 0]
    const cx = cell % cols
    const cy = (cell / cols) | 0
    const shapes = [N | E, N | S, N | W, E | S, N | E | S]
    const shape = shapes[(rng() * shapes.length) | 0]
    let placed = false
    for (let q = 0; q < 4 && !placed; q++) {
      const m = rotateMask(shape, q)
      let safe = true
      for (let k = 0; k < 4; k++) {
        if ((m & BIT[k]) === 0) continue
        const nx = cx + DX[k]
        const ny = cy + DY[k]
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
        if (tiles[ny * cols + nx].kind !== 'blank') { safe = false; break }
      }
      if (!safe) continue
      const t = tiles[cell]
      t.kind = 'wire'
      t.base = shape
      t.sol = q
      t.rot = q
      placed = true
    }
  }

  const s: State = {
    cols, rows, tiles,
    level: 1, moves: 0, par: 0, elapsed: 0,
    score: 0, best: 0, phase: 'playing', flow: 0, justSolved: false,
    sinkIdx, ampIdx, sourceIdx,
  }

  // Verify the intended solution really works before anyone sees this board.
  for (let i = 0; i < total; i++) tiles[i].rot = tiles[i].sol
  power(s)
  if (!isSolved(s)) return null

  // Locks pin a few correct tiles in place as a foothold.
  const lockable: number[] = []
  for (let i = 0; i < total; i++) {
    const k = tiles[i].kind
    if (k === 'wire' || k === 'amp') lockable.push(i)
  }
  for (let l = 0; l < spec.locks && lockable.length > 0; l++) {
    const pick = (rng() * lockable.length) | 0
    tiles[lockable.splice(pick, 1)[0]].locked = true
  }

  // Scramble. A bridge is symmetric under a half turn, so only quarter turns
  // change anything there; the loop below simply retries until the board is
  // genuinely unsolved.
  for (let attempt = 0; attempt < 30; attempt++) {
    let par = 0
    for (let i = 0; i < total; i++) {
      const t = tiles[i]
      if (t.kind === 'blank' || t.locked) { t.rot = t.sol; continue }
      t.rot = (rng() * 4) | 0
      const delta = (((t.rot - t.sol) % 4) + 4) % 4
      par += Math.min(delta, 4 - delta)
    }
    power(s)
    if (!isSolved(s)) {
      s.par = Math.max(1, par)
      return s
    }
  }
  return null
}

/** Generate the board for a level, trying seeds until one verifies. */
export function generate(level: number, seed: number): State {
  const spec = LEVELS[Math.min(LEVELS.length - 1, Math.max(0, level - 1))]
  for (let attempt = 0; attempt < 200; attempt++) {
    const s = build(spec, seed + attempt * 7919)
    if (s !== null) {
      s.level = level
      return s
    }
  }
  // Fall back to the simplest specification, which has always verified.
  for (let attempt = 0; attempt < 400; attempt++) {
    const s = build(LEVELS[0], seed + 104729 + attempt * 31)
    if (s !== null) {
      s.level = level
      return s
    }
  }
  throw new Error('circuitry: board generation failed')
}

// ── Public state transitions ───────────────────────────────────────────────

export function newState(best: number): State {
  const s = generate(1, (Math.random() * 0x7fffffff) | 0)
  s.best = best
  s.phase = 'ready'
  s.score = 0
  return s
}

export function startLevel(s: State, level: number): State {
  const next = generate(level, (Math.random() * 0x7fffffff) | 0)
  next.best = s.best
  next.score = s.score
  next.phase = 'playing'
  return next
}

/** Score a completed board: a base, an efficiency bonus and a time bonus. */
export function levelScore(s: State): number {
  const efficiency = Math.max(0, s.par * 3 - s.moves) * 40
  const speed = Math.max(0, 120 - Math.floor(s.elapsed)) * 8
  return 1000 + efficiency + speed
}

/** Rotate one tile. Returns true if the board changed. */
export function rotate(s: State, idx: number): boolean {
  if (s.phase !== 'playing') return false
  if (idx < 0 || idx >= s.tiles.length) return false
  const t = s.tiles[idx]
  if (t.kind === 'blank' || t.locked) return false
  t.rot = (t.rot + 1) % 4
  t.spin += Math.PI / 2
  s.moves++
  power(s)
  if (isSolved(s)) {
    s.score += levelScore(s)
    s.justSolved = true
    s.phase = s.level >= LEVEL_COUNT ? 'complete' : 'solved'
    if (s.score > s.best) s.best = s.score
  }
  return true
}

export function step(s: State, dt: number): void {
  s.flow += dt
  s.justSolved = false
  if (s.phase === 'playing') s.elapsed += dt
  for (let i = 0; i < s.tiles.length; i++) {
    const t = s.tiles[i]
    if (t.spin !== 0) {
      // Ease the visual rotation toward the logical one.
      const decay = Math.exp(-dt * 13)
      t.spin *= decay
      if (Math.abs(t.spin) < 0.0015) t.spin = 0
    }
  }
}
