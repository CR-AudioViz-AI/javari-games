// app/play/ionstorm/engine.ts — Ionstorm game engine
//
// Game one of twenty-five. Built to show a developer what the platform can
// carry: a real 60fps loop, a particle system, vector physics, adaptive
// difficulty and an upgrade economy — not a description of a game with a
// controls list under it, which is what the previous 100 slugs were.
//
// The engine is deliberately separate from the React component. Rendering and
// simulation do not belong in the same file as JSX, and a developer copying
// this as a template should see that boundary.
//
// FIXED TIMESTEP. The simulation advances in 16.67ms increments regardless of
// frame rate, with leftover time carried. Without it, physics and spawn rates
// change speed on a 144Hz monitor — the single most common mistake in
// browser games.
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026

export interface Vec { x: number; y: number }

export interface Entity {
  pos: Vec
  vel: Vec
  radius: number
  hp: number
  maxHp: number
  kind: string
  hue: number
  age: number
  /** Enemies aim here; the drone orbits it. */
  target?: Vec
  spin?: number
}

export interface Particle {
  pos: Vec
  vel: Vec
  life: number
  maxLife: number
  hue: number
  size: number
}

export interface Upgrade {
  id: string
  name: string
  detail: string
  cost: number
  max: number
}

/** Bought between waves. Cost scales so late picks are real decisions. */
export const UPGRADES: Upgrade[] = [
  { id: 'damage', name: 'Ion Yield', detail: '+25% shot damage', cost: 3, max: 6 },
  { id: 'rate', name: 'Cycle Rate', detail: '+15% fire rate', cost: 3, max: 6 },
  { id: 'speed', name: 'Thrusters', detail: '+12% movement', cost: 2, max: 5 },
  { id: 'shield', name: 'Hull Plating', detail: '+1 maximum shield', cost: 4, max: 5 },
  { id: 'pierce', name: 'Lance Core', detail: 'Shots pierce one more enemy', cost: 6, max: 3 },
  { id: 'drone', name: 'Escort Drone', detail: 'An orbiting drone that fires', cost: 8, max: 3 },
  { id: 'magnet', name: 'Collector Field', detail: '+60% pickup radius', cost: 2, max: 4 },
  { id: 'crit', name: 'Focus Array', detail: '+8% critical chance', cost: 4, max: 5 },
]

export interface State {
  w: number
  h: number
  player: Entity
  enemies: Entity[]
  shots: Entity[]
  drops: Entity[]
  drones: Entity[]
  particles: Particle[]
  wave: number
  waveTimer: number
  spawnCue: number
  score: number
  cores: number
  levels: Record<string, number>
  shield: number
  invuln: number
  cooldown: number
  shake: number
  phase: 'ready' | 'playing' | 'shop' | 'over'
  best: number
  killed: number
  waveTotal: number
}

const TAU = Math.PI * 2
const rnd = (a: number, b: number) => a + Math.random() * (b - a)

export function newState(w: number, h: number, best = 0): State {
  return {
    w, h,
    player: { pos: { x: w / 2, y: h / 2 }, vel: { x: 0, y: 0 }, radius: 13,
              hp: 1, maxHp: 1, kind: 'player', hue: 190, age: 0 },
    enemies: [], shots: [], drops: [], drones: [], particles: [],
    wave: 0, waveTimer: 0, spawnCue: 0, score: 0, cores: 0,
    levels: Object.fromEntries(UPGRADES.map(u => [u.id, 0])),
    shield: 3, invuln: 0, cooldown: 0, shake: 0,
    phase: 'ready', best, killed: 0, waveTotal: 0,
  }
}

function lvl(s: State, id: string): number { return s.levels[id] ?? 0 }

/** Twelve waves, each a different pressure. Enemy mix, not just more of them. */
function waveComposition(wave: number): { kind: string; count: number }[] {
  const n = wave
  const out: { kind: string; count: number }[] = []
  out.push({ kind: 'seeker', count: 4 + n * 2 })
  if (n >= 2) out.push({ kind: 'darter', count: Math.floor(n * 1.5) })
  if (n >= 4) out.push({ kind: 'splitter', count: Math.floor(n / 2) + 1 })
  if (n >= 6) out.push({ kind: 'turret', count: Math.floor(n / 3) })
  if (n % 4 === 0) out.push({ kind: 'warden', count: Math.floor(n / 4) })
  return out
}

const KIND = {
  seeker:   { hp: 2,  r: 12, speed: 52,  hue: 350, score: 10, cores: 1 },
  darter:   { hp: 1,  r: 9,  speed: 128, hue: 40,  score: 15, cores: 1 },
  splitter: { hp: 4,  r: 17, speed: 40,  hue: 280, score: 25, cores: 2 },
  turret:   { hp: 6,  r: 15, speed: 18,  hue: 150, score: 30, cores: 2 },
  warden:   { hp: 22, r: 28, speed: 30,  hue: 15,  score: 120, cores: 8 },
} as const

function spawnEnemy(s: State, kind: keyof typeof KIND, at?: Vec): void {
  const k = KIND[kind]
  // Spawn off-screen on a random edge so nothing appears on top of the player.
  const edge = Math.floor(rnd(0, 4))
  const p = at ?? (
    edge === 0 ? { x: rnd(0, s.w), y: -30 } :
    edge === 1 ? { x: s.w + 30, y: rnd(0, s.h) } :
    edge === 2 ? { x: rnd(0, s.w), y: s.h + 30 } :
                 { x: -30, y: rnd(0, s.h) })
  const scale = 1 + s.wave * 0.08
  s.enemies.push({
    pos: { ...p }, vel: { x: 0, y: 0 }, radius: k.r,
    hp: Math.ceil(k.hp * scale), maxHp: Math.ceil(k.hp * scale),
    kind, hue: k.hue, age: 0, spin: rnd(0, TAU),
  })
}

export function startWave(s: State): void {
  s.wave += 1
  s.phase = 'playing'
  s.killed = 0
  const comp = waveComposition(s.wave)
  s.waveTotal = comp.reduce((a, c) => a + c.count, 0)
  s.spawnCue = 0
  s.waveTimer = 0
  ;(s as State & { _queue?: string[] })._queue =
    comp.flatMap(c => Array<string>(c.count).fill(c.kind))
  // Shuffle so the pressure is mixed rather than arriving in blocks.
  const q = (s as State & { _queue?: string[] })._queue!
  for (let i = q.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[q[i], q[j]] = [q[j], q[i]]
  }
}

function burst(s: State, at: Vec, hue: number, n: number, power = 1): void {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, TAU), sp = rnd(30, 220) * power
    s.particles.push({
      pos: { ...at }, vel: { x: Math.cos(a) * sp, y: Math.sin(a) * sp },
      life: rnd(0.25, 0.8), maxLife: 0.8, hue: hue + rnd(-18, 18), size: rnd(1.5, 4),
    })
  }
}

export function fire(s: State, aim: Vec): void {
  if (s.cooldown > 0 || s.phase !== 'playing') return
  const rate = 0.26 / (1 + lvl(s, 'rate') * 0.15)
  s.cooldown = rate
  const d = Math.hypot(aim.x - s.player.pos.x, aim.y - s.player.pos.y) || 1
  const dir = { x: (aim.x - s.player.pos.x) / d, y: (aim.y - s.player.pos.y) / d }
  const crit = Math.random() < lvl(s, 'crit') * 0.08
  const dmg = (1 + lvl(s, 'damage') * 0.25) * (crit ? 2.5 : 1)
  s.shots.push({
    pos: { x: s.player.pos.x + dir.x * 16, y: s.player.pos.y + dir.y * 16 },
    vel: { x: dir.x * 620, y: dir.y * 620 },
    radius: crit ? 6 : 4, hp: dmg, maxHp: 1 + lvl(s, 'pierce'),
    kind: crit ? 'crit' : 'shot', hue: crit ? 55 : 190, age: 0,
  })
}

/** One fixed step. dt is always 1/60. */
export function step(s: State, dt: number, input: { move: Vec; aim: Vec; firing: boolean }): void {
  if (s.phase !== 'playing') return
  s.waveTimer += dt
  s.cooldown = Math.max(0, s.cooldown - dt)
  s.invuln = Math.max(0, s.invuln - dt)
  s.shake = Math.max(0, s.shake - dt * 3)

  // Player: acceleration with drag, not teleporting. Feels like a ship.
  const accel = 1500 * (1 + lvl(s, 'speed') * 0.12)
  s.player.vel.x += input.move.x * accel * dt
  s.player.vel.y += input.move.y * accel * dt
  const drag = Math.pow(0.0016, dt)
  s.player.vel.x *= drag; s.player.vel.y *= drag
  s.player.pos.x = Math.max(16, Math.min(s.w - 16, s.player.pos.x + s.player.vel.x * dt))
  s.player.pos.y = Math.max(16, Math.min(s.h - 16, s.player.pos.y + s.player.vel.y * dt))
  s.player.age += dt

  if (input.firing) fire(s, input.aim)

  // Drip enemies in rather than dumping the wave at once.
  const q = (s as State & { _queue?: string[] })._queue ?? []
  const interval = Math.max(0.18, 0.9 - s.wave * 0.05)
  while (q.length && s.waveTimer > s.spawnCue) {
    spawnEnemy(s, q.shift() as keyof typeof KIND)
    s.spawnCue += interval
  }

  // Drones orbit and fire on their own.
  const dcount = lvl(s, 'drone')
  while (s.drones.length < dcount) {
    s.drones.push({ pos: { ...s.player.pos }, vel: { x: 0, y: 0 }, radius: 6,
                    hp: 1, maxHp: 1, kind: 'drone', hue: 165, age: rnd(0, TAU) })
  }
  s.drones.forEach((d, i) => {
    d.age += dt * 1.6
    const a = d.age + (i * TAU) / Math.max(1, s.drones.length)
    d.pos.x = s.player.pos.x + Math.cos(a) * 46
    d.pos.y = s.player.pos.y + Math.sin(a) * 46
    if (Math.floor(s.waveTimer * 2) !== Math.floor((s.waveTimer - dt) * 2)) {
      const near = s.enemies[0]
      if (near) {
        const dd = Math.hypot(near.pos.x - d.pos.x, near.pos.y - d.pos.y) || 1
        s.shots.push({
          pos: { ...d.pos },
          vel: { x: ((near.pos.x - d.pos.x) / dd) * 480, y: ((near.pos.y - d.pos.y) / dd) * 480 },
          radius: 3, hp: 0.6, maxHp: 1, kind: 'shot', hue: 165, age: 0,
        })
      }
    }
  })

  // Enemies. Each kind moves differently — that is what makes waves feel new.
  for (const e of s.enemies) {
    e.age += dt
    const dx = s.player.pos.x - e.pos.x, dy = s.player.pos.y - e.pos.y
    const d = Math.hypot(dx, dy) || 1
    const k = KIND[e.kind as keyof typeof KIND]
    if (e.kind === 'darter') {
      // Charges in bursts with a rest between, so it is dodgeable.
      const burstPhase = Math.sin(e.age * 3) > 0 ? 1.9 : 0.25
      e.vel.x = (dx / d) * k.speed * burstPhase
      e.vel.y = (dy / d) * k.speed * burstPhase
    } else if (e.kind === 'turret') {
      // Keeps its distance and shoots.
      const want = d > 220 ? 1 : -0.6
      e.vel.x = (dx / d) * k.speed * want
      e.vel.y = (dy / d) * k.speed * want
      if (Math.floor(e.age * 1.2) !== Math.floor((e.age - dt) * 1.2)) {
        s.enemies.push({
          pos: { ...e.pos }, vel: { x: (dx / d) * 190, y: (dy / d) * 190 },
          radius: 5, hp: 1, maxHp: 1, kind: 'bolt', hue: 150, age: 0,
        })
      }
    } else if (e.kind === 'bolt') {
      // travels straight, already has velocity
    } else {
      // Seekers, splitters and wardens home with a slight orbit so they do not
      // stack into a single line.
      const orbit = e.kind === 'warden' ? 0.35 : 0.12
      e.vel.x = (dx / d) * k.speed - (dy / d) * k.speed * orbit
      e.vel.y = (dy / d) * k.speed + (dx / d) * k.speed * orbit
    }
    e.pos.x += e.vel.x * dt
    e.pos.y += e.vel.y * dt
  }

  // Shots
  for (const b of s.shots) {
    b.pos.x += b.vel.x * dt; b.pos.y += b.vel.y * dt; b.age += dt
    if (Math.random() < 0.4) {
      s.particles.push({ pos: { ...b.pos }, vel: { x: 0, y: 0 }, life: 0.18,
                         maxLife: 0.18, hue: b.hue, size: b.radius * 0.7 })
    }
  }
  s.shots = s.shots.filter(b =>
    b.age < 2 && b.maxHp > 0 &&
    b.pos.x > -20 && b.pos.x < s.w + 20 && b.pos.y > -20 && b.pos.y < s.h + 20)

  // Shot vs enemy
  for (const b of s.shots) {
    for (const e of s.enemies) {
      if (e.hp <= 0 || e.kind === 'bolt') continue
      if (Math.hypot(b.pos.x - e.pos.x, b.pos.y - e.pos.y) < b.radius + e.radius) {
        e.hp -= b.hp
        b.maxHp -= 1
        burst(s, b.pos, e.hue, 6, 0.6)
        if (e.hp <= 0) {
          const k = KIND[e.kind as keyof typeof KIND]
          s.score += k.score
          s.killed += 1
          burst(s, e.pos, e.hue, e.kind === 'warden' ? 60 : 18, e.kind === 'warden' ? 2 : 1)
          if (e.kind === 'warden') s.shake = 1
          // Splitters split — the reason to keep your distance.
          if (e.kind === 'splitter') {
            for (let i = 0; i < 2; i++) spawnEnemy(s, 'seeker', e.pos)
          }
          for (let i = 0; i < k.cores; i++) {
            s.drops.push({
              pos: { ...e.pos },
              vel: { x: rnd(-60, 60), y: rnd(-60, 60) },
              radius: 5, hp: 1, maxHp: 1, kind: 'core', hue: 55, age: 0,
            })
          }
        }
        if (b.maxHp <= 0) break
      }
    }
  }
  s.enemies = s.enemies.filter(e => e.hp > 0 &&
    (e.kind !== 'bolt' || (e.age < 4 && e.pos.x > -40 && e.pos.x < s.w + 40 &&
                           e.pos.y > -40 && e.pos.y < s.h + 40)))

  // Core pickups drift toward the player once inside the collector field.
  const magnet = 70 * (1 + lvl(s, 'magnet') * 0.6)
  for (const c of s.drops) {
    c.age += dt
    const dx = s.player.pos.x - c.pos.x, dy = s.player.pos.y - c.pos.y
    const d = Math.hypot(dx, dy) || 1
    if (d < magnet) {
      const pull = (1 - d / magnet) * 900
      c.vel.x += (dx / d) * pull * dt
      c.vel.y += (dy / d) * pull * dt
    }
    c.vel.x *= Math.pow(0.02, dt); c.vel.y *= Math.pow(0.02, dt)
    c.pos.x += c.vel.x * dt; c.pos.y += c.vel.y * dt
  }
  s.drops = s.drops.filter(c => {
    if (Math.hypot(c.pos.x - s.player.pos.x, c.pos.y - s.player.pos.y) < 18) {
      s.cores += 1; s.score += 5
      s.particles.push({ pos: { ...c.pos }, vel: { x: 0, y: -40 }, life: 0.4,
                         maxLife: 0.4, hue: 55, size: 3 })
      return false
    }
    return c.age < 12
  })

  // Enemy vs player
  if (s.invuln <= 0) {
    for (const e of s.enemies) {
      if (Math.hypot(e.pos.x - s.player.pos.x, e.pos.y - s.player.pos.y) < e.radius + s.player.radius) {
        s.shield -= 1
        s.invuln = 1.4
        s.shake = 1
        burst(s, s.player.pos, 190, 30, 1.4)
        if (e.kind === 'bolt') e.hp = 0
        if (s.shield <= 0) {
          s.phase = 'over'
          s.best = Math.max(s.best, s.score)
        }
        break
      }
    }
  }

  // Particles
  for (const p of s.particles) {
    p.pos.x += p.vel.x * dt; p.pos.y += p.vel.y * dt
    p.vel.x *= Math.pow(0.12, dt); p.vel.y *= Math.pow(0.12, dt)
    p.life -= dt
  }
  s.particles = s.particles.filter(p => p.life > 0)

  // Wave cleared
  if (!q.length && s.enemies.filter(e => e.kind !== 'bolt').length === 0) {
    s.phase = s.wave >= 12 ? 'over' : 'shop'
    if (s.wave >= 12) s.best = Math.max(s.best, s.score)
  }
}

export function buy(s: State, id: string): boolean {
  const u = UPGRADES.find(x => x.id === id)
  if (!u) return false
  const have = lvl(s, id)
  if (have >= u.max) return false
  // Cost rises with each level so late choices carry weight.
  const cost = u.cost + have * Math.ceil(u.cost * 0.6)
  if (s.cores < cost) return false
  s.cores -= cost
  s.levels[id] = have + 1
  return true
}

export function costOf(s: State, u: Upgrade): number {
  const have = lvl(s, u.id)
  return u.cost + have * Math.ceil(u.cost * 0.6)
}
