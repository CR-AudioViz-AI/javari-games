// app/play/harmonic/engine.ts — HARMONIC
//
// You are a tone. Surfaces are solid only when they are in harmonic ratio with
// your current pitch. Retune and the world rearranges.
//
// THE CORE RULE, AND IT IS ONE FUNCTION. consonance(a, b) returns how close two
// frequencies are to a simple integer ratio. Above the threshold, that surface
// catches you. Below it, you pass through. Every level is authored by choosing
// which faces sit at which intervals from which key.
//
// WHY IT IS NOT A GIMMICK: the player's pitch is a continuous value, not a
// switch between two states. Sliding through a glide changes what is solid
// progressively, so a fast retune can drop you through a floor mid-stride. The
// skill is holding a pitch under pressure.
//
// AUDIO IS THE STATE, NOT A LAYER ON TOP. The frequency driving the oscillator
// is the same number driving the physics. They cannot desynchronise because
// there is only one of them.
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026

export interface Vec3 { x: number; y: number; z: number }

/** Just-intonation ratios, in order of consonance. */
const RATIOS = [1, 2, 1.5, 4 / 3, 5 / 4, 5 / 3, 3, 8 / 5, 6 / 5, 4]

/**
 * How consonant are two frequencies? 1 is a perfect simple ratio, 0 is
 * maximally dissonant. Octave-reduced so a fifth two octaves up still counts.
 */
export function consonance(a: number, b: number): number {
  if (a <= 0 || b <= 0) return 0
  let r = Math.max(a, b) / Math.min(a, b)
  // Fold into a single octave, keeping octave relationships perfect.
  while (r > 2.001) r /= 2
  let best = 0
  for (const target of RATIOS) {
    let t = target
    while (t > 2.001) t /= 2
    // Cents distance, because pitch perception is logarithmic. A tolerance in
    // raw Hz would make high notes absurdly forgiving.
    const cents = Math.abs(1200 * Math.log2(r / t))
    const score = Math.max(0, 1 - cents / 55)
    if (score > best) best = score
  }
  return best
}

export type FaceKind = 'tuned' | 'anchor' | 'hazard' | 'gate' | 'source'

export interface Face {
  /** Centre in world space. */
  c: Vec3
  /** Half-extents. One axis is always ~0 — it is a plane. */
  h: Vec3
  /** The frequency this surface rings at. */
  freq: number
  kind: FaceKind
  /** Ring animation, 0..1, set when struck. */
  ring: number
  /** Cached solidity for the current player pitch, for the renderer. */
  solid: number
}

export interface Level {
  name: string
  key: number             // root frequency
  hint: string
  faces: Face[]
  start: Vec3
  goal: Vec3
  /** Pitches the player can reach on this level, as ratios of the key. */
  palette: number[]
  par: number
}

export interface State {
  level: number
  levels: Level[]
  faces: Face[]
  pos: Vec3
  vel: Vec3
  /** Current pitch in Hz. Continuous — this is the whole game. */
  pitch: number
  targetPitch: number
  paletteIndex: number
  grounded: boolean
  coyote: number
  phase: 'briefing' | 'playing' | 'won' | 'lost' | 'complete'
  time: number
  deaths: number
  best: Record<number, number>
  message: string
  shake: number
  /** Struck surfaces this frame, for audio and particles. */
  strikes: { freq: number; at: Vec3; force: number }[]
}

const GRAVITY = -26
const MOVE = 22
const JUMP = 11.5
const DRAG = 0.86
/** A face catches you above this consonance. Tuned so a third is marginal. */
export const SOLID_THRESHOLD = 0.42

const F = (c: Vec3, h: Vec3, freq: number, kind: FaceKind = 'tuned'): Face =>
  ({ c, h, freq, kind, ring: 0, solid: 0 })

const v = (x: number, y: number, z: number): Vec3 => ({ x, y, z })

/** Twelve levels, each a lesson written in intervals. */
export function buildLevels(): Level[] {
  const A = 220            // the root the whole game is tuned to
  const oct = (n: number) => A * Math.pow(2, n)
  const fifth = A * 1.5
  const fourth = A * (4 / 3)
  const third = A * 1.25

  const floor = (x: number, z: number, freq: number, w = 4, d = 4, y = 0, kind: FaceKind = 'tuned') =>
    F(v(x, y, z), v(w / 2, 0.14, d / 2), freq, kind)

  const levels: Level[] = []

  levels.push({
    name: 'Unison', key: A, par: 20,
    hint: 'Every surface here rings at your key. Everything is solid. Walk.',
    palette: [1],
    start: v(0, 2, 0), goal: v(0, 1, -22),
    faces: [
      floor(0, 0, A, 6, 6, 0, 'anchor'),
      floor(0, -6, A), floor(0, -11, A), floor(0, -16, A),
      floor(0, -22, A, 6, 6, 0, 'source'),
    ],
  })

  levels.push({
    name: 'The Fifth', key: A, par: 30,
    hint: 'Blue surfaces ring a fifth above. Retune with 1 and 2 to cross.',
    palette: [1, 1.5],
    start: v(0, 2, 0), goal: v(0, 1, -28),
    faces: [
      floor(0, 0, A, 6, 6, 0, 'anchor'),
      floor(0, -6, A), floor(0, -11, fifth), floor(0, -16, A),
      floor(0, -21, fifth), floor(0, -28, A, 6, 6, 0, 'source'),
    ],
  })

  levels.push({
    name: 'Suspended', key: A, par: 40,
    hint: 'A fourth is consonant too. Three pitches, one path.',
    palette: [1, 4 / 3, 1.5],
    start: v(0, 2, 0), goal: v(6, 1, -26),
    faces: [
      floor(0, 0, A, 6, 6, 0, 'anchor'),
      floor(0, -6, fourth), floor(3, -10, fifth), floor(6, -14, A),
      floor(6, -20, fourth), floor(6, -26, A, 6, 6, 0, 'source'),
      // A dissonant slab you must fall THROUGH — a wall at the wrong pitch.
      floor(3, -18, A * 1.06, 8, 3),
    ],
  })

  levels.push({
    name: 'The Drop', key: A, par: 45,
    hint: 'Retune in mid-air. The floor stops existing when you do.',
    palette: [1, 1.25, 1.5],
    start: v(0, 6, 0), goal: v(0, -8, -24),
    faces: [
      floor(0, 0, A, 6, 6, 4, 'anchor'),
      floor(0, -6, A, 8, 4, 4),
      floor(0, -6, third, 8, 4, -2),
      floor(0, -14, third, 8, 4, -2),
      floor(0, -14, fifth, 8, 4, -8),
      floor(0, -24, A, 6, 6, -8, 'source'),
    ],
  })

  levels.push({
    name: 'Dissonance', key: A, par: 55,
    hint: 'Red surfaces are never solid at any pitch. They only hurt.',
    palette: [1, 1.25, 4 / 3, 1.5],
    start: v(0, 2, 0), goal: v(0, 1, -32),
    faces: [
      floor(0, 0, A, 6, 6, 0, 'anchor'),
      floor(-4, -7, fifth), floor(4, -7, third),
      floor(0, -13, fourth, 6, 4),
      F(v(0, 1.4, -13), v(3, 1.4, 0.14), A * 1.41, 'hazard'),
      floor(-4, -19, third), floor(4, -19, fifth),
      floor(0, -26, fourth, 6, 4),
      floor(0, -32, A, 6, 6, 0, 'source'),
    ],
  })

  levels.push({
    name: 'Octaves', key: A, par: 60,
    hint: 'An octave is perfectly consonant. Height and pitch are the same axis.',
    palette: [0.5, 1, 2],
    start: v(0, 2, 0), goal: v(0, 9, -26),
    faces: [
      floor(0, 0, A, 6, 6, 0, 'anchor'),
      floor(0, -6, oct(-1), 5, 4, 0),
      floor(0, -11, A, 5, 4, 3),
      floor(0, -16, oct(1), 5, 4, 6),
      floor(0, -21, A, 5, 4, 8),
      floor(0, -26, A, 6, 6, 9, 'source'),
    ],
  })

  levels.push({
    name: 'The Wall', key: A, par: 70,
    hint: 'Vertical faces catch you too. Run along a wall that is solid.',
    palette: [1, 1.25, 1.5, 2],
    start: v(0, 3, 0), goal: v(0, 6, -30),
    faces: [
      floor(0, 0, A, 6, 6, 0, 'anchor'),
      F(v(-4, 4, -14), v(0.14, 4, 8), fifth),
      F(v(4, 4, -14), v(0.14, 4, 8), third),
      floor(0, -8, A, 4, 3, 1),
      floor(0, -16, oct(1), 4, 3, 3),
      floor(0, -24, fifth, 4, 3, 5),
      floor(0, -30, A, 6, 6, 6, 'source'),
    ],
  })

  levels.push({
    name: 'Gate', key: A, par: 80,
    hint: 'Gold gates open only at the exact pitch they ring. No approximation.',
    palette: [1, 1.25, 4 / 3, 1.5, 2],
    start: v(0, 2, 0), goal: v(0, 1, -34),
    faces: [
      floor(0, 0, A, 6, 6, 0, 'anchor'),
      floor(0, -7, A, 5, 5),
      F(v(0, 2.2, -12), v(3, 2.2, 0.14), fifth, 'gate'),
      floor(0, -17, fifth, 5, 5),
      F(v(0, 2.2, -22), v(3, 2.2, 0.14), third, 'gate'),
      floor(0, -27, third, 5, 5),
      floor(0, -34, A, 6, 6, 0, 'source'),
    ],
  })

  // Four harder variations that combine everything.
  const advanced: [string, string, number][] = [
    ['Counterpoint', 'Two paths, two keys. Both work. One is faster.', 90],
    ['Modulation', 'The key itself shifts as you descend. Follow it.', 100],
    ['Cluster', 'Everything rings at once. Find the ratio that holds.', 110],
    ['Resolution', 'Everything you have learned, in one descent.', 130],
  ]
  advanced.forEach(([name, hint, par], i) => {
    const k = A * (i === 1 ? 1.5 : 1)
    const faces: Face[] = [floor(0, 0, k, 6, 6, 0, 'anchor')]
    const pal = [1, 1.25, 4 / 3, 1.5, 2]
    for (let n = 1; n <= 7 + i; n++) {
      const ratio = pal[(n * (2 + i)) % pal.length]
      const x = ((n * (i + 2)) % 3 - 1) * 4.2
      const y = -n * (1.1 + i * 0.15)
      faces.push(floor(x, -n * 5.4, k * ratio, 4.6, 3.6, y))
      if (n % 3 === 0) {
        faces.push(F(v(-x, y + 1.6, -n * 5.4), v(2.4, 1.6, 0.14), k * 1.41, 'hazard'))
      }
      if (i >= 2 && n % 4 === 0) {
        faces.push(F(v(x, y + 2.2, -n * 5.4 - 2.6), v(2.6, 2.2, 0.14), k * pal[n % pal.length], 'gate'))
      }
    }
    const last = -(7 + i) * 5.4 - 6
    faces.push(floor(0, last, k, 6, 6, -(7 + i) * (1.1 + i * 0.15) - 1, 'source'))
    levels.push({
      name, key: k, hint, palette: pal, par,
      start: v(0, 2, 0), goal: v(0, -(7 + i) * (1.1 + i * 0.15), last),
      faces,
    })
  })

  return levels
}

export function newState(best: Record<number, number> = {}): State {
  const levels = buildLevels()
  const s: State = {
    level: 0, levels, faces: [], pos: v(0, 2, 0), vel: v(0, 0, 0),
    pitch: levels[0].key, targetPitch: levels[0].key, paletteIndex: 0,
    grounded: false, coyote: 0, phase: 'briefing', time: 0, deaths: 0,
    best, message: levels[0].hint, shake: 0, strikes: [],
  }
  load(s, 0)
  return s
}

export function load(s: State, i: number): void {
  s.level = Math.max(0, Math.min(s.levels.length - 1, i))
  const l = s.levels[s.level]
  // Deep copy so ring state does not leak between attempts.
  s.faces = l.faces.map(f => ({ ...f, c: { ...f.c }, h: { ...f.h }, ring: 0, solid: 0 }))
  s.pos = { ...l.start }
  s.vel = v(0, 0, 0)
  s.paletteIndex = 0
  s.pitch = l.key * l.palette[0]
  s.targetPitch = s.pitch
  s.time = 0
  s.message = l.hint
  s.phase = 'briefing'
}

export function setPitchIndex(s: State, i: number): void {
  const l = s.levels[s.level]
  if (i < 0 || i >= l.palette.length) return
  s.paletteIndex = i
  s.targetPitch = l.key * l.palette[i]
}

/** Is this face solid right now? Hazards never are; gates need near-exact. */
export function solidity(f: Face, pitch: number): number {
  if (f.kind === 'hazard') return 0
  if (f.kind === 'anchor' || f.kind === 'source') return 1
  const c = consonance(f.freq, pitch)
  if (f.kind === 'gate') return c > 0.9 ? 0 : 1   // a gate is solid until tuned open
  return c
}

function overlaps(p: Vec3, r: number, f: Face): boolean {
  return Math.abs(p.x - f.c.x) < f.h.x + r &&
         Math.abs(p.y - f.c.y) < f.h.y + r &&
         Math.abs(p.z - f.c.z) < f.h.z + r
}

export interface Input { x: number; z: number; jump: boolean }

export function step(s: State, dt: number, input: Input): void {
  if (s.phase !== 'playing') return
  s.time += dt
  s.shake = Math.max(0, s.shake - dt * 3)
  s.strikes = []

  // Pitch glides rather than snapping. A fast retune can drop you mid-stride,
  // and holding a pitch under pressure is the skill.
  const glide = Math.min(1, dt * 9)
  s.pitch += (s.targetPitch - s.pitch) * glide

  for (const f of s.faces) {
    f.solid = solidity(f, s.pitch)
    f.ring = Math.max(0, f.ring - dt * 2.4)
  }

  // Horizontal control with drag.
  s.vel.x += input.x * MOVE * dt
  s.vel.z += input.z * MOVE * dt
  const d = Math.pow(DRAG, dt * 60)
  s.vel.x *= d
  s.vel.z *= d
  s.vel.y += GRAVITY * dt

  s.coyote = Math.max(0, s.coyote - dt)
  if (input.jump && (s.grounded || s.coyote > 0)) {
    s.vel.y = JUMP
    s.grounded = false
    s.coyote = 0
  }

  const R = 0.45
  // Integrate per axis so a corner does not eject the player diagonally.
  const axes: (keyof Vec3)[] = ['x', 'y', 'z']
  s.grounded = false
  for (const ax of axes) {
    const before = s.pos[ax]
    s.pos[ax] += s.vel[ax] * dt
    for (const f of s.faces) {
      if (f.solid < SOLID_THRESHOLD) continue
      if (!overlaps(s.pos, R, f)) continue
      // Resolve on this axis only.
      const dir = Math.sign(s.pos[ax] - f.c[ax]) || 1
      s.pos[ax] = f.c[ax] + dir * (f.h[ax] + R + 0.001)
      if (ax === 'y' && dir > 0) {
        s.grounded = true
        s.coyote = 0.12
        if (s.vel.y < -6) {
          f.ring = 1
          s.strikes.push({ freq: f.freq, at: { ...s.pos }, force: Math.min(1, -s.vel.y / 20) })
        }
      }
      s.vel[ax] = 0
      if (ax !== 'y') { void before }
    }
  }

  // Hazards: contact regardless of pitch.
  for (const f of s.faces) {
    if (f.kind !== 'hazard') continue
    if (overlaps(s.pos, R, f)) {
      s.deaths += 1
      s.shake = 1
      s.phase = 'lost'
      s.message = 'Dissonance. Red never resolves.'
      return
    }
  }

  // Fell out of the world.
  if (s.pos.y < -60) {
    s.deaths += 1
    s.phase = 'lost'
    s.message = 'You retuned under your own feet.'
    return
  }

  const l = s.levels[s.level]
  if (Math.hypot(s.pos.x - l.goal.x, s.pos.z - l.goal.z) < 2.4 &&
      Math.abs(s.pos.y - l.goal.y) < 3) {
    s.phase = 'won'
    const t = Math.round(s.time * 10) / 10
    const prev = s.best[s.level]
    if (prev === undefined || t < prev) s.best[s.level] = t
    s.message = `Resolved in ${t.toFixed(1)}s.`
  }
}

export function start(s: State): void { s.phase = 'playing'; s.time = 0 }
export function retry(s: State): void { const l = s.level; load(s, l); s.phase = 'playing' }
export function next(s: State): void {
  if (s.level >= s.levels.length - 1) { s.phase = 'complete'; return }
  load(s, s.level + 1)
}
