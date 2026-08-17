// app/play/voidrunner/engine.ts — Voidrunner
//
// Game five of twenty-five, closing the Arcade Action set. The others showed a
// loop, integration, generation and grid algorithms. This one shows ADAPTIVE
// DIFFICULTY and INFINITE CONTENT — the two things an endless runner lives or
// dies on.
//
// DIFFICULTY ADAPTS TO THE PLAYER, NOT THE CLOCK. Most runners ramp on elapsed
// time, which punishes a weak player for surviving and bores a strong one. This
// tracks a rolling performance signal — near-misses, hits taken, time since the
// last mistake — and moves a pressure value up or down. A player who is
// struggling gets breathing room; one who is cruising gets squeezed. The
// mechanism is visible in the HUD, because hiding it makes the game feel
// arbitrary rather than responsive.
//
// SEGMENTS ARE ASSEMBLED, NOT GENERATED CELL BY CELL. Hand-authored chunks with
// a known difficulty are picked to match current pressure and stitched together.
// Purely random obstacles produce impossible walls and empty stretches; a
// library of vetted pieces is how real runners stay fair at speed.
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026

export interface Obstacle {
  x: number
  lane: number          // 0,1,2 — three lanes
  kind: 'block' | 'spike' | 'gate' | 'orb' | 'shard'
  w: number
  h: number
  hit: boolean
  phase: number
}

export interface Runner {
  lane: number
  laneF: number         // smoothed lane position, so movement is not a snap
  y: number             // vertical offset for the jump arc
  vy: number
  grounded: boolean
  sliding: number
  shield: number
  invuln: number
  boost: number
}

export interface Particle { x: number; y: number; vx: number; vy: number; life: number; hue: number; size: number }

/** A vetted chunk of track. length is in world units. */
interface Segment {
  difficulty: number    // 0..1, what pressure it suits
  length: number
  place: (x: number) => Obstacle[]
}

export interface State {
  w: number
  h: number
  dist: number
  speed: number
  runner: Runner
  obstacles: Obstacle[]
  particles: Particle[]
  score: number
  shards: number
  best: number
  phase: 'ready' | 'running' | 'over'
  /** 0..1. Rises when the player is comfortable, falls when they struggle. */
  pressure: number
  nearMisses: number
  hits: number
  cleanTime: number
  nextSegmentAt: number
  tier: number
  message: string
}

const LANES = 3
const GRAVITY = 2400
const JUMP_V = -760

const ob = (x: number, lane: number, kind: Obstacle['kind'], w = 46, h = 46): Obstacle =>
  ({ x, lane, kind, w, h, hit: false, phase: Math.random() * Math.PI * 2 })

/** The segment library. Each is hand-shaped so it is always clearable. */
const SEGMENTS: Segment[] = [
  { difficulty: 0.05, length: 700, place: x => [ob(x + 300, 1, 'orb', 26, 26)] },
  { difficulty: 0.10, length: 760, place: x => [ob(x + 260, 0, 'block'), ob(x + 620, 2, 'block')] },
  { difficulty: 0.18, length: 820, place: x => [
      ob(x + 240, 1, 'block'), ob(x + 540, 0, 'orb', 26, 26), ob(x + 700, 2, 'block')] },
  { difficulty: 0.26, length: 880, place: x => [
      ob(x + 220, 0, 'spike', 40, 34), ob(x + 220, 1, 'spike', 40, 34),
      ob(x + 620, 2, 'orb', 26, 26)] },
  { difficulty: 0.34, length: 900, place: x => [
      ob(x + 200, 0, 'gate', 44, 30), ob(x + 200, 1, 'gate', 44, 30), ob(x + 200, 2, 'gate', 44, 30),
      ob(x + 620, 1, 'shard', 22, 22)] },
  { difficulty: 0.42, length: 940, place: x => [
      ob(x + 200, 1, 'block'), ob(x + 420, 0, 'block'), ob(x + 640, 2, 'block'),
      ob(x + 840, 1, 'orb', 26, 26)] },
  { difficulty: 0.52, length: 980, place: x => [
      ob(x + 180, 0, 'spike', 40, 34), ob(x + 180, 2, 'spike', 40, 34),
      ob(x + 500, 1, 'gate', 44, 30), ob(x + 500, 0, 'gate', 44, 30),
      ob(x + 820, 2, 'shard', 22, 22)] },
  { difficulty: 0.62, length: 1000, place: x => [
      ob(x + 160, 1, 'block'), ob(x + 160, 2, 'block'),
      ob(x + 460, 0, 'block'), ob(x + 460, 1, 'block'),
      ob(x + 760, 1, 'block'), ob(x + 760, 2, 'block')] },
  { difficulty: 0.74, length: 1040, place: x => [
      ob(x + 150, 0, 'spike', 40, 34), ob(x + 150, 1, 'spike', 40, 34),
      ob(x + 400, 1, 'gate', 44, 30), ob(x + 400, 2, 'gate', 44, 30),
      ob(x + 660, 0, 'block'), ob(x + 660, 2, 'block'),
      ob(x + 900, 1, 'shard', 22, 22)] },
  { difficulty: 0.86, length: 1080, place: x => [
      ob(x + 140, 0, 'block'), ob(x + 140, 2, 'block'),
      ob(x + 340, 1, 'spike', 40, 34), ob(x + 340, 2, 'spike', 40, 34),
      ob(x + 560, 0, 'gate', 44, 30), ob(x + 560, 1, 'gate', 44, 30),
      ob(x + 800, 1, 'block'), ob(x + 800, 2, 'block'),
      ob(x + 980, 0, 'shard', 22, 22)] },
  { difficulty: 0.95, length: 1120, place: x => [
      ob(x + 130, 0, 'spike', 40, 34), ob(x + 130, 1, 'spike', 40, 34),
      ob(x + 330, 1, 'block'), ob(x + 330, 2, 'block'),
      ob(x + 530, 0, 'gate', 44, 30), ob(x + 530, 2, 'gate', 44, 30),
      ob(x + 760, 0, 'block'), ob(x + 760, 1, 'block'),
      ob(x + 960, 2, 'shard', 22, 22)] },
]

export function newState(w: number, h: number, best = 0): State {
  return {
    w, h, dist: 0, speed: 340,
    runner: { lane: 1, laneF: 1, y: 0, vy: 0, grounded: true, sliding: 0,
              shield: 2, invuln: 0, boost: 0 },
    obstacles: [], particles: [], score: 0, shards: 0, best,
    phase: 'ready', pressure: 0.12, nearMisses: 0, hits: 0, cleanTime: 0,
    nextSegmentAt: 0, tier: 1,
    message: 'A / D to change lane. W to jump, S to slide.',
  }
}

export function start(s: State): void {
  s.dist = 0
  s.speed = 340
  s.runner = { lane: 1, laneF: 1, y: 0, vy: 0, grounded: true, sliding: 0,
               shield: 2, invuln: 0, boost: 0 }
  s.obstacles = []
  s.particles = []
  s.score = 0
  s.shards = 0
  s.pressure = 0.12
  s.nearMisses = 0
  s.hits = 0
  s.cleanTime = 0
  s.nextSegmentAt = 600
  s.tier = 1
  s.phase = 'running'
}

/** Pick a vetted segment whose difficulty is nearest current pressure. */
function appendSegment(s: State): void {
  let best = SEGMENTS[0], bestD = Infinity
  // Small jitter so the same pressure does not always give the same chunk.
  const want = Math.max(0, Math.min(1, s.pressure + (Math.random() - 0.5) * 0.12))
  for (const seg of SEGMENTS) {
    const d = Math.abs(seg.difficulty - want)
    if (d < bestD) { bestD = d; best = seg }
  }
  s.obstacles.push(...best.place(s.nextSegmentAt))
  s.nextSegmentAt += best.length
}

export interface Input { lane: number; jump: boolean; slide: boolean }

export function step(s: State, dt: number, input: Input): void {
  if (s.phase !== 'running') return
  const r = s.runner

  // Speed rises with distance but is bounded, so the game stays playable.
  s.speed = Math.min(760, 340 + s.dist * 0.012)
  s.dist += s.speed * dt
  s.score = Math.floor(s.dist / 10) + s.shards * 25
  s.tier = 1 + Math.floor(s.dist / 3000)

  // ── Adaptive difficulty ──────────────────────────────────────────────────
  // Clean running raises pressure slowly; a hit drops it sharply. The player
  // who is struggling is given room, the one cruising is squeezed.
  s.cleanTime += dt
  const target = Math.max(0, Math.min(1,
    0.10 +
    Math.min(0.45, s.cleanTime / 26) +          // reward for surviving
    Math.min(0.30, s.nearMisses * 0.012) +      // reward for playing close
    Math.min(0.25, s.dist / 26000) -            // a slow floor rise
    Math.min(0.45, s.hits * 0.14)))             // relief after mistakes
  // Ease toward the target rather than snapping — a sudden wall feels unfair.
  s.pressure += (target - s.pressure) * Math.min(1, dt * 0.5)

  while (s.nextSegmentAt < s.dist + s.w * 1.6) appendSegment(s)

  // Lane change, smoothed.
  if (input.lane !== 0 && r.grounded) {
    r.lane = Math.max(0, Math.min(LANES - 1, r.lane + input.lane))
  }
  r.laneF += (r.lane - r.laneF) * Math.min(1, dt * 12)

  // Jump and slide.
  if (input.jump && r.grounded) { r.vy = JUMP_V; r.grounded = false }
  if (input.slide && r.grounded) r.sliding = Math.max(r.sliding, 0.42)
  r.sliding = Math.max(0, r.sliding - dt)
  if (!r.grounded) {
    r.vy += GRAVITY * dt
    r.y += r.vy * dt
    if (r.y >= 0) { r.y = 0; r.vy = 0; r.grounded = true }
  }
  r.invuln = Math.max(0, r.invuln - dt)
  r.boost = Math.max(0, r.boost - dt)

  // Collisions and near-misses.
  const rx = s.dist
  for (const o of s.obstacles) {
    if (o.hit) continue
    const dx = o.x - rx
    if (dx > 60 || dx < -60) {
      // Near-miss: passed close in an adjacent lane without contact.
      if (dx < -60 && dx > -110 && Math.abs(o.lane - r.laneF) < 1.2 &&
          (o.kind === 'block' || o.kind === 'spike' || o.kind === 'gate')) {
        o.hit = true
        s.nearMisses += 1
        s.score += 5
      }
      continue
    }
    if (Math.abs(o.lane - r.laneF) > 0.55) continue

    if (o.kind === 'orb' || o.kind === 'shard') {
      o.hit = true
      if (o.kind === 'shard') { s.shards += 1; r.boost = 1.6 }
      else { r.shield = Math.min(3, r.shield + 1) }
      for (let i = 0; i < 12; i++) {
        s.particles.push({ x: s.w * 0.28, y: 0, vx: (Math.random() - 0.5) * 200,
          vy: -Math.random() * 220, life: 0.5, hue: o.kind === 'shard' ? 45 : 150,
          size: 2 + Math.random() * 3 })
      }
      continue
    }
    // Blocks are jumped, gates are slid under, spikes are avoided by lane.
    const cleared =
      (o.kind === 'block' && r.y < -28) ||
      (o.kind === 'gate' && r.sliding > 0) ||
      (o.kind === 'spike' && r.y < -20)
    if (cleared) continue
    if (r.invuln > 0) continue

    o.hit = true
    r.shield -= 1
    r.invuln = 1.1
    s.hits += 1
    s.cleanTime = 0
    for (let i = 0; i < 22; i++) {
      s.particles.push({ x: s.w * 0.28, y: 0, vx: (Math.random() - 0.5) * 320,
        vy: -Math.random() * 300, life: 0.6, hue: 350, size: 2 + Math.random() * 4 })
    }
    if (r.shield <= 0) {
      s.phase = 'over'
      s.best = Math.max(s.best, s.score)
      s.message = `${Math.floor(s.dist)}m · tier ${s.tier}`
      return
    }
  }

  s.obstacles = s.obstacles.filter(o => o.x > rx - 300)

  for (const p of s.particles) {
    p.x += p.vx * dt; p.y += p.vy * dt
    p.vy += 900 * dt
    p.life -= dt
  }
  s.particles = s.particles.filter(p => p.life > 0)
}
