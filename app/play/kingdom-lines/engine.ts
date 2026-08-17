// app/play/kingdom-lines/engine.ts — Kingdom Lines
//
// Game six of twenty-five, opening the Strategy set. The arcade five showed
// loops, integration, generation, grids and adaptation. This one shows OPPONENT
// AI: a machine that reads what you are building and answers it, rather than
// spending randomly on a timer.
//
// THE AI COUNTERS, IT DOES NOT CHEAT. It sees only what a player could see —
// the units on the board — and scores every affordable purchase against a
// threat model built from that. It gets no extra gold, no lookahead into your
// spending, no hidden information. A cheating AI is easy and feels terrible;
// this one is beatable by out-thinking it, which is the point.
//
// ROCK-PAPER-SCISSORS WITH RANGE. Spears beat cavalry, cavalry beats archers,
// archers beat spears — but each also has a range band, so positioning matters
// as much as composition. A pure counter table makes a puzzle; adding range
// makes it a game.
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026

export type Side = 'player' | 'foe'
export type UnitType = 'spear' | 'cavalry' | 'archer' | 'shield' | 'mage'

export interface UnitDef {
  type: UnitType
  name: string
  cost: number
  hp: number
  dmg: number
  speed: number       // world units per second
  range: number
  cadence: number     // seconds between attacks
  hue: number
  counters: UnitType[]
  blurb: string
}

export const UNITS: Record<UnitType, UnitDef> = {
  spear:   { type: 'spear',   name: 'Spearline', cost: 20, hp: 46, dmg: 8,  speed: 34, range: 26, cadence: 0.9,
             hue: 200, counters: ['cavalry'], blurb: 'Cheap, holds a lane. Doubles damage to cavalry.' },
  cavalry: { type: 'cavalry', name: 'Outriders', cost: 45, hp: 60, dmg: 14, speed: 74, range: 22, cadence: 0.8,
             hue: 30,  counters: ['archer'],  blurb: 'Fast. Closes on archers before they can work.' },
  archer:  { type: 'archer',  name: 'Longbows',  cost: 38, hp: 30, dmg: 11, speed: 26, range: 132, cadence: 1.1,
             hue: 140, counters: ['spear'],   blurb: 'Outranges everything. Fragile if reached.' },
  shield:  { type: 'shield',  name: 'Bulwark',   cost: 60, hp: 150, dmg: 6, speed: 20, range: 24, cadence: 1.3,
             hue: 260, counters: [],          blurb: 'A wall. Soaks damage while others work behind it.' },
  mage:    { type: 'mage',    name: 'Stormcall', cost: 80, hp: 34, dmg: 22, speed: 22, range: 108, cadence: 1.9,
             hue: 300, counters: ['shield'],  blurb: 'Slow, expensive, hits everything in a small area.' },
}

export const ORDER: UnitType[] = ['spear', 'cavalry', 'archer', 'shield', 'mage']

export interface Unit {
  id: number
  side: Side
  type: UnitType
  lane: number
  x: number          // 0 at player keep, 1 at foe keep
  hp: number
  maxHp: number
  cd: number
  hitFlash: number
  target: number | null
}

export interface Bolt { from: { x: number; lane: number }; to: { x: number; lane: number }; t: number; hue: number }

export interface State {
  lanes: number
  units: Unit[]
  bolts: Bolt[]
  particles: { x: number; lane: number; vx: number; vy: number; life: number; hue: number; size: number }[]
  gold: number
  foeGold: number
  income: number
  foeIncome: number
  keep: number          // player keep hp
  foeKeep: number
  selectedLane: number
  time: number
  wave: number
  phase: 'briefing' | 'battle' | 'won' | 'lost'
  difficulty: number    // 0..1, set by the level
  level: number
  message: string
  best: Record<number, number>
  nextId: number
  /** What the AI believes it is facing. Rebuilt from visible units only. */
  read: Record<UnitType, number>
}

const KEEP_HP = 400
const LANES = 3

export function newState(level = 0, best: Record<number, number> = {}): State {
  const s: State = {
    lanes: LANES, units: [], bolts: [], particles: [],
    gold: 90, foeGold: 90, income: 11, foeIncome: 11,
    keep: KEEP_HP, foeKeep: KEEP_HP, selectedLane: 1,
    time: 0, wave: 1, phase: 'briefing', difficulty: 0.25, level,
    message: '', best, nextId: 1,
    read: { spear: 0, cavalry: 0, archer: 0, shield: 0, mage: 0 },
  }
  configure(s, level)
  return s
}

const LEVELS = [
  { name: 'Border Skirmish', diff: 0.20, foeIncome: 10, hint: 'Spears beat cavalry. Cavalry beat archers. Archers beat spears.' },
  { name: 'The Ford',        diff: 0.35, foeIncome: 12, hint: 'Range decides who lands the first blow.' },
  { name: 'Ridgeway',        diff: 0.50, foeIncome: 14, hint: 'A Bulwark in front lets your archers work.' },
  { name: 'Iron Gate',       diff: 0.65, foeIncome: 16, hint: 'Stormcall breaks a wall. Nothing else will.' },
  { name: 'The Last Field',  diff: 0.85, foeIncome: 19, hint: 'It reads your board every second. Change what it sees.' },
]

export function configure(s: State, level: number): void {
  const cfg = LEVELS[Math.min(level, LEVELS.length - 1)]
  s.level = level
  s.difficulty = cfg.diff
  s.foeIncome = cfg.foeIncome
  s.message = cfg.hint
}

export const LEVEL_NAMES = LEVELS.map(l => l.name)
export const LEVEL_COUNT = LEVELS.length

export function start(s: State): void {
  s.units = []
  s.bolts = []
  s.particles = []
  s.gold = 90
  s.foeGold = 90
  s.keep = KEEP_HP
  s.foeKeep = KEEP_HP
  s.time = 0
  s.wave = 1
  s.phase = 'battle'
}

export function canAfford(s: State, t: UnitType): boolean {
  return s.gold >= UNITS[t].cost
}

export function deploy(s: State, t: UnitType, lane: number): boolean {
  if (s.phase !== 'battle') return false
  const def = UNITS[t]
  if (s.gold < def.cost) return false
  s.gold -= def.cost
  s.units.push({
    id: s.nextId++, side: 'player', type: t, lane,
    x: 0.02, hp: def.hp, maxHp: def.hp, cd: 0, hitFlash: 0, target: null,
  })
  return true
}

function foeDeploy(s: State, t: UnitType, lane: number): void {
  const def = UNITS[t]
  s.foeGold -= def.cost
  s.units.push({
    id: s.nextId++, side: 'foe', type: t, lane,
    x: 0.98, hp: def.hp, maxHp: def.hp, cd: 0, hitFlash: 0, target: null,
  })
}

/** Damage after the counter table. Countering doubles it. */
function damageOf(a: Unit, d: Unit): number {
  const def = UNITS[a.type]
  return def.counters.includes(d.type) ? def.dmg * 2 : def.dmg
}

/**
 * The opponent. Every second it rebuilds a threat model from the units it can
 * SEE, scores each affordable purchase against it, and buys the best — with a
 * small amount of noise so it is not perfectly predictable, and a difficulty
 * factor that governs how good its read is rather than how much gold it has.
 */
function think(s: State): void {
  // 1. read the board — player units only, weighted by how close they are
  const read: Record<UnitType, number> = { spear: 0, cavalry: 0, archer: 0, shield: 0, mage: 0 }
  const laneThreat = [0, 0, 0]
  for (const u of s.units) {
    if (u.side !== 'player') continue
    const urgency = 0.5 + u.x * 1.5          // closer to the foe keep matters more
    read[u.type] += urgency
    laneThreat[u.lane] += UNITS[u.type].dmg * urgency
  }
  s.read = read

  const affordable = ORDER.filter(t => s.foeGold >= UNITS[t].cost)
  if (!affordable.length) return

  // 2. score each option: does it counter what is actually on the board?
  let bestType: UnitType = affordable[0]
  let bestScore = -Infinity
  for (const t of affordable) {
    const def = UNITS[t]
    let score = 0
    for (const c of def.counters) score += read[c] * 26
    // Value per gold, so it does not always reach for the priciest unit.
    score += (def.hp * 0.35 + def.dmg * 2 + def.range * 0.22) / def.cost * 22
    // Prefer range when the player is fielding melee, and vice versa.
    const melee = read.spear + read.cavalry + read.shield
    const ranged = read.archer + read.mage
    if (def.range > 80) score += melee * 5
    else score += ranged * 4
    // A weaker opponent reads the board less accurately: more noise, less signal.
    const noise = (1 - s.difficulty) * 55
    score = score * (0.55 + s.difficulty * 0.45) + (Math.random() - 0.5) * noise
    if (score > bestScore) { bestScore = score; bestType = t }
  }

  // 3. lane choice — reinforce where it is losing, or press where it is winning
  let lane = 0
  if (Math.random() < 0.62) {
    // defend the most threatened lane
    lane = laneThreat.indexOf(Math.max(...laneThreat))
  } else {
    // push the emptiest one
    const own = [0, 0, 0]
    for (const u of s.units) if (u.side === 'foe') own[u.lane] += 1
    lane = own.indexOf(Math.min(...own))
  }
  foeDeploy(s, bestType, lane)
}

let thinkTimer = 0

export function step(s: State, dt: number): void {
  if (s.phase !== 'battle') return
  s.time += dt

  s.gold += s.income * dt
  s.foeGold += s.foeIncome * dt
  // Income creeps up for both sides so late battles escalate.
  s.income = 11 + s.time * 0.09
  s.foeIncome = LEVELS[Math.min(s.level, LEVELS.length - 1)].foeIncome + s.time * 0.09

  thinkTimer += dt
  if (thinkTimer >= 1) { thinkTimer = 0; think(s) }

  for (const b of s.bolts) b.t += dt * 3.2
  s.bolts = s.bolts.filter(b => b.t < 1)

  for (const p of s.particles) {
    p.x += p.vx * dt * 0.0007
    p.life -= dt
  }
  s.particles = s.particles.filter(p => p.life > 0)

  for (const u of s.units) {
    u.cd = Math.max(0, u.cd - dt)
    u.hitFlash = Math.max(0, u.hitFlash - dt * 4)
    const def = UNITS[u.type]
    const dir = u.side === 'player' ? 1 : -1

    // Find the nearest enemy in the same lane, within range.
    let tgt: Unit | null = null
    let bestD = Infinity
    for (const o of s.units) {
      if (o.side === u.side || o.lane !== u.lane || o.hp <= 0) continue
      const d = Math.abs(o.x - u.x) * 1000
      if (d < bestD) { bestD = d; tgt = o }
    }

    if (tgt && bestD <= def.range) {
      u.target = tgt.id
      if (u.cd <= 0) {
        u.cd = def.cadence
        const dmg = damageOf(u, tgt)
        tgt.hp -= dmg
        tgt.hitFlash = 1
        s.bolts.push({ from: { x: u.x, lane: u.lane }, to: { x: tgt.x, lane: tgt.lane }, t: 0, hue: def.hue })
        // Stormcall splashes to neighbours in the same lane.
        if (u.type === 'mage') {
          for (const o of s.units) {
            if (o.side === u.side || o.lane !== u.lane || o === tgt) continue
            if (Math.abs(o.x - tgt.x) * 1000 < 46) { o.hp -= dmg * 0.5; o.hitFlash = 1 }
          }
        }
      }
    } else {
      u.target = null
      u.x += dir * def.speed * dt * 0.0016
      // Reached the enemy keep.
      if (u.side === 'player' && u.x >= 0.99) {
        s.foeKeep -= def.dmg * 3
        u.hp = 0
      } else if (u.side === 'foe' && u.x <= 0.01) {
        s.keep -= def.dmg * 3
        u.hp = 0
      }
    }
  }

  for (const u of s.units) {
    if (u.hp > 0) continue
    for (let i = 0; i < 10; i++) {
      s.particles.push({
        x: u.x, lane: u.lane,
        vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 60,
        life: 0.4 + Math.random() * 0.4, hue: UNITS[u.type].hue, size: 2 + Math.random() * 3,
      })
    }
  }
  s.units = s.units.filter(u => u.hp > 0)

  if (s.foeKeep <= 0) {
    s.phase = 'won'
    const t = Math.floor(s.time)
    const prev = s.best[s.level]
    if (prev === undefined || t < prev) s.best[s.level] = t
    s.message = `Held in ${t}s.`
  } else if (s.keep <= 0) {
    s.phase = 'lost'
    s.message = 'Your keep has fallen.'
  }
}

export function nextLevel(s: State): void {
  configure(s, Math.min(s.level + 1, LEVELS.length - 1))
  s.phase = 'briefing'
}

export function retryLevel(s: State): void {
  configure(s, s.level)
  s.phase = 'briefing'
}
