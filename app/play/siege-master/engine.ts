// app/play/siege-master/engine.ts — Siege Master
//
// Game nine of twenty-five. Foundry showed systems simulation; this shows
// PATHFINDING THAT RESPONDS TO CONSTRUCTION — the hard problem in tower defence
// and the one most implementations dodge by using a fixed track.
//
// A* WITH A LIVE FLOW FIELD. Every time a tower is placed the path is
// recomputed from the spawn to the goal. Because dozens of creeps share one
// route, the result is cached as a flow field — a direction per tile — so each
// creep does a single lookup per frame rather than its own search.
//
// MAZING IS ALLOWED BUT NEVER SEALED. Towers block movement, so the player can
// wall a longer route. Before a placement is accepted it is tested: if no path
// remains, the placement is refused. Without that check a player can trap the
// creeps and the game becomes trivial; with it, maze building is the skill.
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026

export type TowerKind = 'arrow' | 'frost' | 'cannon' | 'tesla' | 'beam'

export interface TowerDef {
  kind: TowerKind
  name: string
  cost: number
  range: number
  dps: number
  cadence: number
  hue: number
  blurb: string
  upgrade: { cost: number; dps: number; range: number }
}

export const TOWERS: Record<TowerKind, TowerDef> = {
  arrow:  { kind: 'arrow',  name: 'Arbalest', cost: 55,  range: 2.6, dps: 22, cadence: 0.55, hue: 150,
            blurb: 'Cheap single target. The backbone of any line.',
            upgrade: { cost: 45, dps: 20, range: 0.5 } },
  frost:  { kind: 'frost',  name: 'Rimeworks', cost: 70,  range: 2.2, dps: 6,  cadence: 0.9,  hue: 195,
            blurb: 'Slows everything in range by 45%. Force multiplier.',
            upgrade: { cost: 55, dps: 5,  range: 0.5 } },
  cannon: { kind: 'cannon', name: 'Mortar',   cost: 110, range: 3.0, dps: 40, cadence: 1.5,  hue: 30,
            blurb: 'Splash damage. Wants a corner where they bunch up.',
            upgrade: { cost: 85, dps: 34, range: 0.4 } },
  tesla:  { kind: 'tesla',  name: 'Arc Coil', cost: 140, range: 2.4, dps: 30, cadence: 0.8,  hue: 275,
            blurb: 'Chains to three targets. Best against swarms.',
            upgrade: { cost: 110, dps: 26, range: 0.4 } },
  beam:   { kind: 'beam',   name: 'Lance',    cost: 190, range: 4.2, dps: 85, cadence: 0.1,  hue: 340,
            blurb: 'Continuous beam, huge range. Melts armour.',
            upgrade: { cost: 150, dps: 70, range: 0.6 } },
}

export const TOWER_ORDER: TowerKind[] = ['arrow', 'frost', 'cannon', 'tesla', 'beam']

export type CreepKind = 'runner' | 'brute' | 'swarm' | 'armoured' | 'phase' | 'titan'

interface CreepDef {
  hp: number
  speed: number
  bounty: number
  hue: number
  armour: number      // flat reduction per hit
  /** Phase creeps ignore walls and fly straight, so mazing does not help. */
  flies?: boolean
}

const CREEPS: Record<CreepKind, CreepDef> = {
  runner:   { hp: 55,   speed: 2.4, bounty: 6,  hue: 55,  armour: 0 },
  brute:    { hp: 210,  speed: 1.2, bounty: 14, hue: 20,  armour: 2 },
  swarm:    { hp: 26,   speed: 2.8, bounty: 3,  hue: 100, armour: 0 },
  armoured: { hp: 320,  speed: 1.0, bounty: 22, hue: 210, armour: 9 },
  phase:    { hp: 130,  speed: 1.7, bounty: 18, hue: 300, armour: 1, flies: true },
  titan:    { hp: 1900, speed: 0.75, bounty: 120, hue: 350, armour: 14 },
}

export interface Creep {
  id: number
  kind: CreepKind
  x: number
  y: number
  hp: number
  maxHp: number
  slow: number
  hitFlash: number
}

export interface Tower {
  x: number
  y: number
  kind: TowerKind
  level: number
  cd: number
  angle: number
  firing: number
}

export interface State {
  w: number
  h: number
  spawn: { x: number; y: number }
  goal: { x: number; y: number }
  towers: Map<string, Tower>
  creeps: Creep[]
  flow: Int8Array          // direction index per tile, -1 = unreachable
  dist: Int32Array
  bolts: { x1: number; y1: number; x2: number; y2: number; t: number; hue: number }[]
  particles: { x: number; y: number; vx: number; vy: number; life: number; hue: number; size: number }[]
  gold: number
  lives: number
  wave: number
  waveActive: boolean
  spawnQueue: CreepKind[]
  spawnTimer: number
  phase: 'building' | 'wave' | 'won' | 'lost'
  tool: TowerKind | 'sell' | 'upgrade'
  selected: string | null
  time: number
  best: number
  message: string
  nextId: number
}

export const key = (x: number, y: number): string => `${x},${y}`
const DX = [1, 0, -1, 0, 1, 1, -1, -1]
const DY = [0, 1, 0, -1, 1, -1, 1, -1]

const GRID_W = 20, GRID_H = 13
const TOTAL_WAVES = 30

export function newState(best = 0): State {
  const s: State = {
    w: GRID_W, h: GRID_H,
    spawn: { x: 0, y: Math.floor(GRID_H / 2) },
    goal: { x: GRID_W - 1, y: Math.floor(GRID_H / 2) },
    towers: new Map(), creeps: [],
    flow: new Int8Array(GRID_W * GRID_H).fill(-1),
    dist: new Int32Array(GRID_W * GRID_H).fill(-1),
    bolts: [], particles: [],
    gold: 340, lives: 20, wave: 0, waveActive: false,
    spawnQueue: [], spawnTimer: 0, phase: 'building',
    tool: 'arrow', selected: null, time: 0, best,
    message: 'Build a maze. Towers block the path — but you can never seal it.',
    nextId: 1,
  }
  recomputeFlow(s)
  return s
}

const idx = (s: State, x: number, y: number) => y * s.w + x

function passable(s: State, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= s.w || y >= s.h) return false
  return !s.towers.has(key(x, y))
}

/**
 * Dijkstra outward from the goal, producing a distance field and a flow field.
 * Dozens of creeps share one route, so computing it once and having each creep
 * do a single lookup is far cheaper than a search per creep.
 */
export function recomputeFlow(s: State): boolean {
  const n = s.w * s.h
  s.dist = new Int32Array(n).fill(-1)
  s.flow = new Int8Array(n).fill(-1)
  const q: number[] = []
  const gi = idx(s, s.goal.x, s.goal.y)
  s.dist[gi] = 0
  q.push(gi)
  let head = 0
  while (head < q.length) {
    const cur = q[head++]
    const cx = cur % s.w, cy = (cur / s.w) | 0
    // Cardinals only for the distance field: allowing diagonals through tower
    // corners lets creeps clip through a wall that looks solid.
    for (let d = 0; d < 4; d++) {
      const nx = cx + DX[d], ny = cy + DY[d]
      if (!passable(s, nx, ny)) continue
      const ni = idx(s, nx, ny)
      if (s.dist[ni] !== -1) continue
      s.dist[ni] = s.dist[cur] + 1
      // The neighbour's flow points back toward the tile we came from.
      s.flow[ni] = ((d + 2) % 4) as number
      q.push(ni)
    }
  }
  return s.dist[idx(s, s.spawn.x, s.spawn.y)] !== -1
}

/** Refused if it would seal the route. That check is what keeps mazing fair. */
export function placeTower(s: State, x: number, y: number, kind: TowerKind): string | null {
  if (x < 0 || y < 0 || x >= s.w || y >= s.h) return 'off the field'
  if (s.towers.has(key(x, y))) return 'occupied'
  if ((x === s.spawn.x && y === s.spawn.y) || (x === s.goal.x && y === s.goal.y)) return 'reserved'
  const def = TOWERS[kind]
  if (s.gold < def.cost) return 'not enough gold'
  s.towers.set(key(x, y), { x, y, kind, level: 1, cd: 0, angle: 0, firing: 0 })
  if (!recomputeFlow(s)) {
    s.towers.delete(key(x, y))
    recomputeFlow(s)
    return 'that would seal the route'
  }
  s.gold -= def.cost
  return null
}

export function sellTower(s: State, x: number, y: number): void {
  const t = s.towers.get(key(x, y))
  if (!t) return
  const def = TOWERS[t.kind]
  let spent = def.cost
  for (let l = 1; l < t.level; l++) spent += def.upgrade.cost
  s.gold += Math.floor(spent * 0.6)
  s.towers.delete(key(x, y))
  recomputeFlow(s)
}

export function upgradeTower(s: State, x: number, y: number): boolean {
  const t = s.towers.get(key(x, y))
  if (!t || t.level >= 4) return false
  const def = TOWERS[t.kind]
  const cost = def.upgrade.cost * t.level
  if (s.gold < cost) return false
  s.gold -= cost
  t.level += 1
  return true
}

export function towerStats(t: Tower): { dps: number; range: number } {
  const d = TOWERS[t.kind]
  return {
    dps: d.dps + d.upgrade.dps * (t.level - 1),
    range: d.range + d.upgrade.range * (t.level - 1),
  }
}

/** Wave composition. Titans every tenth, phase creeps from fifteen. */
function composition(wave: number): CreepKind[] {
  const out: CreepKind[] = []
  const n = wave
  const push = (k: CreepKind, c: number) => { for (let i = 0; i < c; i++) out.push(k) }
  push('runner', 5 + Math.floor(n * 1.4))
  if (n >= 3) push('swarm', Math.floor(n * 1.8))
  if (n >= 5) push('brute', Math.floor(n * 0.7))
  if (n >= 9) push('armoured', Math.floor(n * 0.45))
  if (n >= 15) push('phase', Math.floor(n * 0.35))
  if (n % 10 === 0) push('titan', Math.floor(n / 10))
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function startWave(s: State): void {
  if (s.waveActive) return
  s.wave += 1
  s.spawnQueue = composition(s.wave)
  s.spawnTimer = 0
  s.waveActive = true
  s.phase = 'wave'
}

function spawnCreep(s: State, kind: CreepKind): void {
  const d = CREEPS[kind]
  // Scale with wave so late waves are genuinely harder, not just more numerous.
  const scale = 1 + s.wave * 0.16
  s.creeps.push({
    id: s.nextId++, kind,
    x: s.spawn.x + 0.5, y: s.spawn.y + 0.5,
    hp: d.hp * scale, maxHp: d.hp * scale, slow: 0, hitFlash: 0,
  })
}

function damage(s: State, c: Creep, amount: number, hue: number): void {
  const d = CREEPS[c.kind]
  const dealt = Math.max(1, amount - d.armour)
  c.hp -= dealt
  c.hitFlash = 1
  if (c.hp <= 0) {
    s.gold += d.bounty
    for (let i = 0; i < 8; i++) {
      s.particles.push({
        x: c.x, y: c.y,
        vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3,
        life: 0.35 + Math.random() * 0.3, hue: d.hue, size: 1.6 + Math.random() * 2.4,
      })
    }
  }
}

export function step(s: State, dt: number): void {
  s.time += dt
  for (const b of s.bolts) b.t += dt * 6
  s.bolts = s.bolts.filter(b => b.t < 1)
  for (const p of s.particles) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt
  }
  s.particles = s.particles.filter(p => p.life > 0)

  if (s.phase !== 'wave') return

  // Spawning
  if (s.spawnQueue.length) {
    s.spawnTimer -= dt
    if (s.spawnTimer <= 0) {
      spawnCreep(s, s.spawnQueue.shift()!)
      s.spawnTimer = Math.max(0.14, 0.55 - s.wave * 0.008)
    }
  }

  // Creep movement: one flow-field lookup each, not a search.
  for (const c of s.creeps) {
    const d = CREEPS[c.kind]
    c.hitFlash = Math.max(0, c.hitFlash - dt * 4)
    const speed = d.speed * (1 - c.slow) * dt
    c.slow = Math.max(0, c.slow - dt * 0.8)

    if (d.flies) {
      // Phase creeps ignore the maze entirely — the answer to over-mazing.
      const dx = s.goal.x + 0.5 - c.x, dy = s.goal.y + 0.5 - c.y
      const m = Math.hypot(dx, dy) || 1
      c.x += (dx / m) * speed
      c.y += (dy / m) * speed
    } else {
      const gx = Math.floor(c.x), gy = Math.floor(c.y)
      const dir = s.flow[idx(s, Math.max(0, Math.min(s.w - 1, gx)), Math.max(0, Math.min(s.h - 1, gy)))]
      if (dir >= 0) {
        // Steer toward the centre of the next tile so movement is smooth
        // rather than snapping between grid squares.
        const tx = gx + DX[dir] + 0.5, ty = gy + DY[dir] + 0.5
        const dx = tx - c.x, dy = ty - c.y
        const m = Math.hypot(dx, dy) || 1
        c.x += (dx / m) * speed
        c.y += (dy / m) * speed
      } else {
        c.x += speed
      }
    }

    if (Math.hypot(c.x - (s.goal.x + 0.5), c.y - (s.goal.y + 0.5)) < 0.6) {
      s.lives -= c.kind === 'titan' ? 5 : 1
      c.hp = 0
    }
  }
  s.creeps = s.creeps.filter(c => c.hp > 0)

  // Towers
  for (const t of s.towers.values()) {
    const def = TOWERS[t.kind]
    const st = towerStats(t)
    t.cd = Math.max(0, t.cd - dt)
    t.firing = Math.max(0, t.firing - dt * 3)
    const cx = t.x + 0.5, cy = t.y + 0.5

    if (t.kind === 'frost') {
      // Aura, no targeting.
      for (const c of s.creeps) {
        if (Math.hypot(c.x - cx, c.y - cy) <= st.range) {
          c.slow = 0.45
          if (t.cd <= 0) damage(s, c, st.dps * def.cadence, def.hue)
        }
      }
      if (t.cd <= 0) { t.cd = def.cadence; t.firing = 1 }
      continue
    }

    // Target the creep furthest along the path — the one closest to leaking.
    let target: Creep | null = null
    let bestD = Infinity
    for (const c of s.creeps) {
      const dd = Math.hypot(c.x - cx, c.y - cy)
      if (dd > st.range) continue
      const gi = idx(s, Math.max(0, Math.min(s.w - 1, Math.floor(c.x))),
                        Math.max(0, Math.min(s.h - 1, Math.floor(c.y))))
      const progress = s.dist[gi] < 0 ? 9999 : s.dist[gi]
      if (progress < bestD) { bestD = progress; target = c }
    }
    if (!target) continue
    t.angle = Math.atan2(target.y - cy, target.x - cx)

    if (t.kind === 'beam') {
      // Continuous: damage scaled by dt rather than per shot.
      damage(s, target, st.dps * dt, def.hue)
      t.firing = 1
      s.bolts.push({ x1: cx, y1: cy, x2: target.x, y2: target.y, t: 0.6, hue: def.hue })
      continue
    }

    if (t.cd > 0) continue
    t.cd = def.cadence
    t.firing = 1
    const shot = st.dps * def.cadence
    s.bolts.push({ x1: cx, y1: cy, x2: target.x, y2: target.y, t: 0, hue: def.hue })

    if (t.kind === 'cannon') {
      // Splash, which is why corners matter.
      for (const c of s.creeps) {
        const dd = Math.hypot(c.x - target.x, c.y - target.y)
        if (dd < 1.2) damage(s, c, shot * (dd < 0.4 ? 1 : 0.5), def.hue)
      }
    } else if (t.kind === 'tesla') {
      // Chains to the two next-nearest.
      const chain = s.creeps
        .filter(c => c !== target && Math.hypot(c.x - target.x, c.y - target.y) < 2)
        .slice(0, 2)
      damage(s, target, shot, def.hue)
      for (const c of chain) {
        damage(s, c, shot * 0.6, def.hue)
        s.bolts.push({ x1: target.x, y1: target.y, x2: c.x, y2: c.y, t: 0, hue: def.hue })
      }
    } else {
      damage(s, target, shot, def.hue)
    }
  }

  if (s.lives <= 0) {
    s.phase = 'lost'
    s.message = `The line broke at wave ${s.wave}.`
    s.best = Math.max(s.best, s.wave)
    return
  }
  if (s.waveActive && !s.spawnQueue.length && s.creeps.length === 0) {
    s.waveActive = false
    // Interest on held gold rewards saving for a Lance rather than spam.
    s.gold += 40 + s.wave * 6 + Math.floor(s.gold * 0.04)
    s.best = Math.max(s.best, s.wave)
    if (s.wave >= TOTAL_WAVES) {
      s.phase = 'won'
      s.message = `All ${TOTAL_WAVES} waves held.`
    } else {
      s.phase = 'building'
      s.message = `Wave ${s.wave} cleared. Interest paid on held gold.`
    }
  }
}

export const WAVES = TOTAL_WAVES
export { CREEPS }
