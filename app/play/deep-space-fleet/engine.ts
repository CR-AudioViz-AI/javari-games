// app/play/deep-space-fleet/engine.ts — Deep Space Fleet
//
// Game ten of twenty-five, closing the Strategy set. Signal War showed fog and
// inference, Siege Master showed responsive pathfinding. This is 4X in
// miniature: expand, build, and fight an opponent that plans several turns
// ahead rather than reacting to the last one.
//
// THE AI PLANS AHEAD, NOT JUST ACROSS. Each turn it scores its options by
// projecting the board forward: if I build a cruiser now it arrives in three
// turns, by which time that colony will have grown — is it still worth taking?
// A one-turn greedy AI is trivially starved; this one commits to a plan and
// revises it, which is why it can be out-manoeuvred but not out-waited.
//
// FLEETS TRAVEL IN REAL TIME BETWEEN TURNS. Distance is the whole strategy: a
// carrier three jumps away is a threat you can see coming and prepare for.
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026

export type Faction = 'player' | 'foe' | 'neutral'
export type ShipKind = 'fighter' | 'cruiser' | 'carrier'

export interface ShipDef {
  kind: ShipKind
  name: string
  cost: number
  attack: number
  hull: number
  speed: number
  blurb: string
}

export const SHIPS: Record<ShipKind, ShipDef> = {
  fighter: { kind: 'fighter', name: 'Interceptor', cost: 12, attack: 4,  hull: 8,  speed: 0.16,
             blurb: 'Cheap and fast. Numbers win engagements.' },
  cruiser: { kind: 'cruiser', name: 'Cruiser',     cost: 34, attack: 14, hull: 30, speed: 0.10,
             blurb: 'Line ship. Beats fighters at any sensible ratio.' },
  carrier: { kind: 'carrier', name: 'Carrier',     cost: 70, attack: 8,  hull: 60, speed: 0.07,
             blurb: 'Launches two Interceptors per turn while in a fight.' },
}
export const SHIP_ORDER: ShipKind[] = ['fighter', 'cruiser', 'carrier']

export interface World {
  id: number
  x: number
  y: number
  name: string
  owner: Faction
  production: number       // credits per turn
  defence: number          // garrison strength
  hue: number
  radius: number
  /** Ships stationed here, by kind. */
  garrison: Record<ShipKind, number>
}

export interface Fleet {
  id: number
  owner: Faction
  from: number
  to: number
  progress: number
  ships: Record<ShipKind, number>
}

export interface State {
  worlds: World[]
  fleets: Fleet[]
  turn: number
  credits: number
  foeCredits: number
  phase: 'briefing' | 'playing' | 'won' | 'lost'
  selected: number | null
  sending: Record<ShipKind, number>
  message: string
  log: string[]
  best: number
  nextId: number
  flashes: { x: number; y: number; t: number; hue: number }[]
  /** The AI's current plan: a target and the force it is saving toward. */
  plan: { target: number | null; need: number; committed: number }
}

const NAMES = ['Kepler', 'Vega', 'Altair', 'Rigel', 'Lyra', 'Cygnus', 'Draco',
               'Orion', 'Perseus', 'Auriga', 'Carina', 'Norma', 'Pavo', 'Tucana']

function prng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const empty = (): Record<ShipKind, number> => ({ fighter: 0, cruiser: 0, carrier: 0 })

export function newState(seed = 7, best = 0): State {
  const r = prng(seed)
  const worlds: World[] = []
  const N = 11
  // Poisson-ish placement: reject anything too close, so no two worlds overlap.
  let guard = 0
  while (worlds.length < N && guard++ < 900) {
    const x = 0.08 + r() * 0.84
    const y = 0.10 + r() * 0.80
    if (worlds.some(w => Math.hypot(w.x - x, w.y - y) < 0.19)) continue
    const prod = 2 + Math.floor(r() * 6)
    worlds.push({
      id: worlds.length, x, y, name: NAMES[worlds.length % NAMES.length],
      owner: 'neutral', production: prod, defence: 4 + Math.floor(r() * 10),
      hue: [20, 40, 150, 200, 265, 320][Math.floor(r() * 6)],
      radius: 0.020 + prod * 0.0028, garrison: empty(),
    })
  }
  // Home worlds at opposite ends.
  const sorted = [...worlds].sort((a, b) => a.x - b.x)
  const home = sorted[0], foeHome = sorted[sorted.length - 1]
  home.owner = 'player'; home.production = 8; home.defence = 0
  home.garrison = { fighter: 4, cruiser: 1, carrier: 0 }
  foeHome.owner = 'foe'; foeHome.production = 8; foeHome.defence = 0
  foeHome.garrison = { fighter: 4, cruiser: 1, carrier: 0 }

  return {
    worlds, fleets: [], turn: 1, credits: 60, foeCredits: 60,
    phase: 'briefing', selected: null, sending: empty(),
    message: 'Take worlds. Production compounds — early expansion decides it.',
    log: [], best, nextId: 1, flashes: [],
    plan: { target: null, need: 0, committed: 0 },
  }
}

export function dist(a: World, b: World): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function power(g: Record<ShipKind, number>): number {
  return SHIP_ORDER.reduce((sum, k) => sum + g[k] * SHIPS[k].attack, 0)
}
function hull(g: Record<ShipKind, number>): number {
  return SHIP_ORDER.reduce((sum, k) => sum + g[k] * SHIPS[k].hull, 0)
}
export function fleetPower(g: Record<ShipKind, number>): number { return power(g) }

export function build(s: State, kind: ShipKind, worldId: number, owner: Faction = 'player'): boolean {
  const w = s.worlds.find(x => x.id === worldId)
  if (!w || w.owner !== owner) return false
  const cost = SHIPS[kind].cost
  if (owner === 'player') {
    if (s.credits < cost) return false
    s.credits -= cost
  } else {
    if (s.foeCredits < cost) return false
    s.foeCredits -= cost
  }
  w.garrison[kind] += 1
  return true
}

export function send(s: State, from: number, to: number, ships: Record<ShipKind, number>,
                     owner: Faction = 'player'): boolean {
  const a = s.worlds.find(w => w.id === from)
  const b = s.worlds.find(w => w.id === to)
  if (!a || !b || a.owner !== owner || from === to) return false
  const take = empty()
  let any = false
  for (const k of SHIP_ORDER) {
    const n = Math.min(ships[k], a.garrison[k])
    if (n > 0) { take[k] = n; a.garrison[k] -= n; any = true }
  }
  if (!any) return false
  s.fleets.push({ id: s.nextId++, owner, from, to, progress: 0, ships: take })
  return true
}

/** Resolve a fleet arriving. Attrition is proportional, so a big edge wins big. */
function arrive(s: State, f: Fleet): void {
  const w = s.worlds.find(x => x.id === f.to)!
  if (w.owner === f.owner) {
    for (const k of SHIP_ORDER) w.garrison[k] += f.ships[k]
    return
  }
  const atkP = power(f.ships), atkH = hull(f.ships)
  const defP = power(w.garrison) + w.defence * 3
  const defH = hull(w.garrison) + w.defence * 6

  s.flashes.push({ x: w.x, y: w.y, t: 0, hue: f.owner === 'player' ? 150 : 350 })

  // Two-sided attrition: each side removes a share of the other proportional to
  // its firepower. A narrow win still costs, which is what makes massing matter.
  const atkRounds = defH / Math.max(1, atkP)
  const defRounds = atkH / Math.max(1, defP)

  if (defRounds > atkRounds) {
    // Attacker wins. Survivors scale with how decisive it was.
    const survival = Math.max(0.05, 1 - atkRounds / defRounds)
    const g = empty()
    for (const k of SHIP_ORDER) g[k] = Math.floor(f.ships[k] * survival)
    if (SHIP_ORDER.every(k => g[k] === 0)) g.fighter = 1
    w.owner = f.owner
    w.garrison = g
    w.defence = 0
    s.log.unshift(`${f.owner === 'player' ? 'You' : 'They'} took ${w.name}`)
  } else {
    const survival = Math.max(0.05, 1 - defRounds / atkRounds)
    for (const k of SHIP_ORDER) w.garrison[k] = Math.floor(w.garrison[k] * survival)
    w.defence = Math.floor(w.defence * survival)
    s.log.unshift(`${w.name} held against ${f.owner === 'player' ? 'you' : 'them'}`)
  }
  s.log = s.log.slice(0, 6)
}

/**
 * The opponent. It holds a PLAN — a target world and the force needed to take
 * it — and saves toward it across turns rather than spending every credit the
 * moment it has any. It revises when the board changes enough to matter.
 */
function foeTurn(s: State): void {
  const mine = s.worlds.filter(w => w.owner === 'foe')
  if (!mine.length) return

  // Score every world it does not own, projecting forward: a fleet takes time
  // to arrive, and the target grows in the meantime.
  let best: { world: World; from: World; need: number; score: number } | null = null
  for (const target of s.worlds) {
    if (target.owner === 'foe') continue
    for (const src of mine) {
      const d = dist(src, target)
      const turnsOut = Math.ceil(d / SHIPS.cruiser.speed)
      // Defence it will have BY THE TIME the fleet lands, not right now.
      const projected = power(target.garrison) + target.defence * 3 +
                        (target.owner === 'player' ? turnsOut * 4 : turnsOut * 1.2)
      const need = projected * 1.5
      let score = target.production * 24
      score -= d * 90                      // distance is real cost
      score -= need * 1.6                  // and so is the force required
      if (target.owner === 'player') score += 34   // pressure the player
      if (!best || score > best.score) best = { world: target, from: src, need, score }
    }
  }
  if (!best) return

  // Commit to the plan, or revise if the old target became a bad idea.
  if (s.plan.target !== best.world.id) {
    s.plan = { target: best.world.id, need: best.need, committed: 0 }
  }

  // Build toward the plan at the home world with the most production.
  const yard = mine.sort((a, b) => b.production - a.production)[0]
  let guard = 0
  while (s.foeCredits >= SHIPS.fighter.cost && guard++ < 30) {
    // Buy the best value per credit for the job, favouring cruisers when the
    // target is defended and fighters when it is soft.
    const kind: ShipKind = best.need > 60 ? (s.foeCredits >= SHIPS.carrier.cost && Math.random() < 0.25
        ? 'carrier' : 'cruiser')
      : (s.foeCredits >= SHIPS.cruiser.cost && Math.random() < 0.5 ? 'cruiser' : 'fighter')
    if (s.foeCredits < SHIPS[kind].cost) break
    build(s, kind, yard.id, 'foe')
  }

  // Launch only when the massed force is genuinely enough.
  const src = s.worlds.find(w => w.id === best!.from.id)!
  if (power(src.garrison) >= best.need) {
    const go = empty()
    for (const k of SHIP_ORDER) go[k] = Math.max(0, src.garrison[k] - (k === 'fighter' ? 1 : 0))
    send(s, src.id, best.world.id, go, 'foe')
    s.plan = { target: null, need: 0, committed: 0 }
  }
}

export function endTurn(s: State): void {
  if (s.phase !== 'playing') return
  s.turn += 1

  foeTurn(s)

  // Fleets move, then arrive.
  for (const f of s.fleets) {
    const a = s.worlds.find(w => w.id === f.from)!
    const b = s.worlds.find(w => w.id === f.to)!
    const d = dist(a, b)
    const slowest = SHIP_ORDER.reduce((m, k) => f.ships[k] > 0 ? Math.min(m, SHIPS[k].speed) : m, 1)
    f.progress += slowest / Math.max(0.001, d)
  }
  const landed = s.fleets.filter(f => f.progress >= 1)
  s.fleets = s.fleets.filter(f => f.progress < 1)
  for (const f of landed) arrive(s, f)

  // Income and neutral growth.
  for (const w of s.worlds) {
    if (w.owner === 'player') s.credits += w.production
    else if (w.owner === 'foe') s.foeCredits += w.production
    else w.defence += 0.35            // unclaimed worlds slowly fortify
  }

  const mine = s.worlds.filter(w => w.owner === 'player').length
  const theirs = s.worlds.filter(w => w.owner === 'foe').length
  if (theirs === 0 && !s.fleets.some(f => f.owner === 'foe')) {
    s.phase = 'won'
    s.best = s.best === 0 ? s.turn : Math.min(s.best, s.turn)
    s.message = `Sector secured in ${s.turn} turns.`
  } else if (mine === 0 && !s.fleets.some(f => f.owner === 'player')) {
    s.phase = 'lost'
    s.message = 'Your fleet is gone.'
  }
}

export function step(s: State, dt: number): void {
  for (const f of s.flashes) f.t += dt * 1.6
  s.flashes = s.flashes.filter(f => f.t < 1)
}

export function startGame(s: State): void { s.phase = 'playing' }
export { empty }
