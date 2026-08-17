// app/play/signal-war/engine.ts — Signal War
//
// Game seven of twenty-five. Kingdom Lines showed an opponent that reads a
// visible board. This one shows the harder problem: an opponent operating under
// FOG OF WAR, reasoning from memory and inference rather than from the truth.
//
// THE AI HAS ITS OWN FOG. It keeps a separate belief map — what it last saw in
// each territory and how long ago — and plans against that. It genuinely does
// not know what you moved into a hidden tile. That is why it can be baited: a
// feint into its vision draws a response, and the tile it stops watching is the
// one to take.
//
// TERRITORY VALUE IS PROPAGATED, NOT HAND-TUNED. Each tile's worth is its own
// yield plus a decayed share of its neighbours', computed by relaxation until
// it settles. A tile beside three rich tiles becomes valuable without anyone
// writing that rule, and chokepoints emerge from the map rather than from
// annotations.
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026

export type Owner = 'player' | 'foe' | 'neutral'

export interface Tile {
  q: number
  r: number
  owner: Owner
  units: number
  yield: number          // signal produced per turn
  terrain: 'plain' | 'ridge' | 'relay' | 'waste'
  value: number          // computed strategic worth
  /** Last turn the player observed this tile; -1 means never. */
  seen: number
  /** Last turn the AI observed it, and what it believed then. */
  foeSeen: number
  foeBelief: { owner: Owner; units: number }
}

export interface State {
  radius: number
  tiles: Map<string, Tile>
  turn: number
  phase: 'briefing' | 'player' | 'resolving' | 'foe' | 'won' | 'lost'
  selected: string | null
  signal: number
  foeSignal: number
  level: number
  message: string
  best: Record<number, number>
  moves: { from: string; to: string; count: number; t: number; owner: Owner }[]
  flashes: { q: number; r: number; t: number; hue: number }[]
  log: string[]
}

export const key = (q: number, r: number): string => `${q},${r}`
const DIRS: [number, number][] = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]]

export function axialToPixel(q: number, r: number, size: number): { x: number; y: number } {
  return { x: size * Math.sqrt(3) * (q + r / 2), y: size * 1.5 * r }
}

export function pixelToAxial(x: number, y: number, size: number): { q: number; r: number } {
  const r = (2 / 3) * y / size
  const q = (Math.sqrt(3) / 3 * x - y / 3) / size
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
  { name: 'Cold Start', radius: 3, foeSkill: 0.30, hint: 'Take relays. They see further and pay more.' },
  { name: 'Static',     radius: 4, foeSkill: 0.50, hint: 'Ridges cost more to cross but see two tiles.' },
  { name: 'Interference', radius: 4, foeSkill: 0.68, hint: 'It plans from memory. Move where it stopped looking.' },
  { name: 'Blackout',   radius: 5, foeSkill: 0.85, hint: 'Feint into its vision. Take what it turns away from.' },
]
export const LEVEL_COUNT = LEVELS.length
export const LEVEL_NAMES = LEVELS.map(l => l.name)

export function newState(level = 0, best: Record<number, number> = {}): State {
  const s: State = {
    radius: 3, tiles: new Map(), turn: 1, phase: 'briefing', selected: null,
    signal: 0, foeSignal: 0, level, message: '', best, moves: [], flashes: [], log: [],
  }
  build(s, level)
  return s
}

export function build(s: State, level: number): void {
  const cfg = LEVELS[Math.min(level, LEVELS.length - 1)]
  const rnd = prng(level * 7717 + 41)
  s.level = level
  s.radius = cfg.radius
  s.tiles = new Map()
  s.turn = 1
  s.selected = null
  s.signal = 0
  s.foeSignal = 0
  s.moves = []
  s.flashes = []
  s.log = []
  s.message = cfg.hint
  s.phase = 'briefing'

  const R = cfg.radius
  for (let q = -R; q <= R; q++) {
    for (let r = Math.max(-R, -q - R); r <= Math.min(R, -q + R); r++) {
      const roll = rnd()
      let terrain: Tile['terrain'] = 'plain'
      let yieldV = 2
      if (roll < 0.12) { terrain = 'relay'; yieldV = 5 }
      else if (roll < 0.30) { terrain = 'ridge'; yieldV = 1 }
      else if (roll < 0.38) { terrain = 'waste'; yieldV = 0 }
      s.tiles.set(key(q, r), {
        q, r, owner: 'neutral', units: terrain === 'waste' ? 0 : 1 + Math.floor(rnd() * 3),
        yield: yieldV, terrain, value: 0, seen: -1, foeSeen: -1,
        foeBelief: { owner: 'neutral', units: 0 },
      })
    }
  }
  // Home tiles at opposite corners.
  const home = s.tiles.get(key(-R, R))!
  home.owner = 'player'; home.units = 12; home.terrain = 'relay'; home.yield = 5
  const foeHome = s.tiles.get(key(R, -R))!
  foeHome.owner = 'foe'; foeHome.units = 12; foeHome.terrain = 'relay'; foeHome.yield = 5

  computeValues(s)
  observe(s, 'player')
  observe(s, 'foe')
}

/**
 * Relaxation: a tile's value is its own yield plus a decayed share of its
 * neighbours'. Run to convergence, chokepoints and rich clusters emerge from
 * the map itself instead of being annotated by hand.
 */
function computeValues(s: State): void {
  for (const t of s.tiles.values()) t.value = t.yield
  for (let pass = 0; pass < 12; pass++) {
    const next = new Map<string, number>()
    for (const t of s.tiles.values()) {
      let sum = 0, n = 0
      for (const [dq, dr] of DIRS) {
        const nb = s.tiles.get(key(t.q + dq, t.r + dr))
        if (!nb) continue
        sum += nb.value
        n += 1
      }
      // Edge tiles have fewer neighbours, so they are naturally worth less —
      // which is correct, they are harder to hold.
      next.set(key(t.q, t.r), t.yield + (n ? (sum / n) * 0.45 : 0))
    }
    for (const [k, v] of next) s.tiles.get(k)!.value = v
  }
}

/** Vision radius by terrain. Relays and ridges see further. */
function sight(t: Tile): number {
  return t.terrain === 'relay' ? 3 : t.terrain === 'ridge' ? 2 : 1
}

function hexDistance(a: Tile, b: Tile): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2
}

/** Refresh what a side can see, and for the AI, what it now believes. */
export function observe(s: State, side: Owner): void {
  const sources = [...s.tiles.values()].filter(t => t.owner === side)
  for (const t of s.tiles.values()) {
    let visible = false
    for (const src of sources) {
      if (hexDistance(src, t) <= sight(src)) { visible = true; break }
    }
    if (!visible) continue
    if (side === 'player') t.seen = s.turn
    else {
      t.foeSeen = s.turn
      t.foeBelief = { owner: t.owner, units: t.units }
    }
  }
}

export function visibleToPlayer(s: State, t: Tile): boolean {
  return t.seen >= 0
}
export function currentlyVisible(s: State, t: Tile): boolean {
  return t.seen === s.turn
}

export function neighbours(s: State, t: Tile): Tile[] {
  const out: Tile[] = []
  for (const [dq, dr] of DIRS) {
    const n = s.tiles.get(key(t.q + dq, t.r + dr))
    if (n) out.push(n)
  }
  return out
}

/** Crossing cost. Ridges are slow, waste is cheap and worthless. */
function moveCost(to: Tile): number {
  return to.terrain === 'ridge' ? 2 : 1
}

export function canMove(s: State, from: Tile, to: Tile, side: Owner): boolean {
  if (from.owner !== side || from.units < 2) return false
  return neighbours(s, from).some(n => n.q === to.q && n.r === to.r)
}

/** Resolve a move. Attacker loses one per defender, ties go to the defender. */
export function resolveMove(s: State, from: Tile, to: Tile, count: number, side: Owner): void {
  const send = Math.min(count, from.units - 1)
  if (send <= 0) return
  from.units -= send
  const cost = moveCost(to)
  const arriving = Math.max(0, send - (cost - 1))

  s.moves.push({ from: key(from.q, from.r), to: key(to.q, to.r), count: arriving, t: 0, owner: side })

  if (to.owner === side) {
    to.units += arriving
    return
  }
  if (arriving > to.units) {
    const survivors = arriving - to.units
    to.owner = side
    to.units = survivors
    s.flashes.push({ q: to.q, r: to.r, t: 0, hue: side === 'player' ? 150 : 350 })
    s.log.unshift(`${side === 'player' ? 'You' : 'They'} took ${to.terrain} at ${to.q},${to.r}`)
  } else {
    to.units -= arriving
    s.flashes.push({ q: to.q, r: to.r, t: 0, hue: 40 })
    s.log.unshift(`${side === 'player' ? 'Your' : 'Their'} assault on ${to.q},${to.r} was held`)
  }
  s.log = s.log.slice(0, 6)
}

/**
 * The opponent. It plans ONLY from foeBelief — what it last saw and when — so
 * a tile it has not watched for four turns is planned against as if nothing
 * changed. Stale intelligence is the whole mechanic.
 */
export function foeTurn(s: State): void {
  const cfg = LEVELS[Math.min(s.level, LEVELS.length - 1)]
  const skill = cfg.foeSkill
  const mine = [...s.tiles.values()].filter(t => t.owner === 'foe' && t.units >= 2)

  interface Option { from: Tile; to: Tile; score: number; send: number }
  const options: Option[] = []

  for (const from of mine) {
    for (const to of neighbours(s, from)) {
      // What does it BELIEVE is there? Not what is actually there.
      const staleness = to.foeSeen < 0 ? 99 : s.turn - to.foeSeen
      const belief = to.foeSeen < 0
        ? { owner: 'neutral' as Owner, units: 2 }     // unseen: assume lightly held
        : to.foeBelief
      if (belief.owner === 'foe') continue

      const send = from.units - 1
      // Confidence decays with staleness — it hedges against old information.
      const confidence = Math.max(0.25, 1 - staleness * 0.18)
      const expected = belief.units / confidence
      if (send <= expected) continue

      let score = to.value * 10
      score += (send - expected) * 3                  // margin of victory
      if (to.terrain === 'relay') score += 34         // relays see and pay
      if (to.terrain === 'waste') score -= 26
      score -= staleness * 2.4                        // prefer what it can see
      // A weaker opponent scores worse and gambles more.
      const noise = (1 - skill) * 60
      score = score * (0.5 + skill * 0.5) + (Math.random() - 0.5) * noise
      options.push({ from, to, score, send })
    }
  }

  options.sort((a, b) => b.score - a.score)
  // It takes a few actions per turn, more at higher skill.
  const acts = 1 + Math.floor(skill * 2.6)
  const used = new Set<string>()
  let done = 0
  for (const o of options) {
    if (done >= acts) break
    const fk = key(o.from.q, o.from.r)
    if (used.has(fk)) continue
    if (o.from.units < 2) continue
    used.add(fk)
    resolveMove(s, o.from, o.to, o.from.units - 1, 'foe')
    done += 1
  }
  observe(s, 'foe')
}

export function endTurn(s: State): void {
  if (s.phase !== 'player') return
  s.phase = 'foe'
  foeTurn(s)

  // Income and reinforcement.
  let inc = 0, foeInc = 0
  for (const t of s.tiles.values()) {
    if (t.owner === 'player') inc += t.yield
    else if (t.owner === 'foe') foeInc += t.yield
  }
  s.signal += inc
  s.foeSignal += foeInc
  // Reinforcements land on home relays, so holding them matters.
  for (const t of s.tiles.values()) {
    if (t.terrain !== 'relay') continue
    if (t.owner === 'player') t.units += 2
    else if (t.owner === 'foe') t.units += 2
  }

  s.turn += 1
  observe(s, 'player')
  s.selected = null

  const mine = [...s.tiles.values()].filter(t => t.owner === 'player').length
  const theirs = [...s.tiles.values()].filter(t => t.owner === 'foe').length
  if (theirs === 0) {
    s.phase = 'won'
    const prev = s.best[s.level]
    if (prev === undefined || s.turn < prev) s.best[s.level] = s.turn
    s.message = `Network secured in ${s.turn} turns.`
  } else if (mine === 0) {
    s.phase = 'lost'
    s.message = 'Your network is gone.'
  } else {
    s.phase = 'player'
  }
}

export function step(s: State, dt: number): void {
  for (const m of s.moves) m.t += dt * 2.4
  s.moves = s.moves.filter(m => m.t < 1)
  for (const f of s.flashes) f.t += dt * 1.8
  s.flashes = s.flashes.filter(f => f.t < 1)
}

export function startBattle(s: State): void { s.phase = 'player' }
export function nextLevel(s: State): void { build(s, Math.min(s.level + 1, LEVELS.length - 1)) }
export function retryLevel(s: State): void { build(s, s.level) }
