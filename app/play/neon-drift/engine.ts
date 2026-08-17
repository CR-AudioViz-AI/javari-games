// app/play/neon-drift/engine.ts — Neon Drift
//
// Game three of twenty-five. Ionstorm showed a real-time loop, Gravity Well
// showed integration; this shows PROCEDURAL GENERATION and a real vehicle model.
//
// TRACKS ARE GENERATED, NOT DRAWN. A seeded PRNG lays control points on a
// distorted circle, a Catmull-Rom spline smooths them into a closed racing
// line, and the surface is the area within a width of that line. The same seed
// always produces the same track, so a leaderboard time means something.
//
// THE CAR HAS A SLIP ANGLE. Grip is not a single number: lateral velocity is
// separated from forward velocity and each is damped differently. Exceed the
// lateral limit and the rear steps out — that is the drift, and it emerges from
// the model rather than being a special case bolted on.
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026

export interface Vec { x: number; y: number }

export interface Car {
  pos: Vec
  vel: Vec
  heading: number      // radians, where the nose points
  angVel: number
  speed: number
  drifting: boolean
  slip: number
  boost: number
  lap: number
  checkpoint: number
  lapStart: number
  bestLap: number
  offTrack: number
}

export interface Track {
  seed: number
  name: string
  points: Vec[]        // the smoothed centre line, closed
  width: number
  start: Vec
  startHeading: number
  length: number
}

export interface Skid { pos: Vec; life: number; a: number }

export interface State {
  w: number
  h: number
  track: Track
  car: Car
  ghost: Vec[] | null      // the best run's path, replayed alongside
  recording: Vec[]
  skids: Skid[]
  particles: { pos: Vec; vel: Vec; life: number; hue: number; size: number }[]
  phase: 'ready' | 'racing' | 'finished'
  time: number
  laps: number
  bestTotal: Record<number, number>
  trackIndex: number
  message: string
}

/** Mulberry32 — small, fast, and identical across machines. A track seeded 7
 *  is the same track for everyone, which is what makes a time comparable. */
function prng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Catmull-Rom through the control points, so the racing line is smooth and
 *  actually passes through them — a Bezier would only approximate. */
function spline(pts: Vec[], perSegment = 14): Vec[] {
  const out: Vec[] = []
  const n = pts.length
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i]
    const p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n]
    for (let t = 0; t < perSegment; t++) {
      const s = t / perSegment, s2 = s * s, s3 = s2 * s
      out.push({
        x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * s +
             (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * s2 +
             (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * s3),
        y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * s +
             (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * s2 +
             (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * s3),
      })
    }
  }
  return out
}

const NAMES = ['Ember Loop', 'Nightfall', 'Copper Run', 'Voltage', 'Meridian',
               'Ashfall', 'Silverline', 'Deep Cut', 'Nova Bend', 'Terminal Rush']

export function makeTrack(seed: number, w: number, h: number): Track {
  const r = prng(seed)
  const cx = w / 2, cy = h / 2
  const rx = w * 0.36, ry = h * 0.34
  const lobes = 7 + Math.floor(r() * 4)
  const ctrl: Vec[] = []
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * Math.PI * 2
    // Vary the radius per point: that variance is what makes corners.
    const k = 0.58 + r() * 0.52
    ctrl.push({ x: cx + Math.cos(a) * rx * k, y: cy + Math.sin(a) * ry * k })
  }
  const points = spline(ctrl, 16)
  let length = 0
  for (let i = 0; i < points.length; i++) {
    const p = points[i], q = points[(i + 1) % points.length]
    length += Math.hypot(q.x - p.x, q.y - p.y)
  }
  const s0 = points[0], s1 = points[1]
  return {
    seed, name: NAMES[seed % NAMES.length],
    points, width: Math.max(52, Math.min(w, h) * 0.075),
    start: { ...s0 },
    startHeading: Math.atan2(s1.y - s0.y, s1.x - s0.x),
    length,
  }
}

export function newState(w: number, h: number, trackIndex = 0,
                         bestTotal: Record<number, number> = {}): State {
  const track = makeTrack(trackIndex + 1, w, h)
  return {
    w, h, track,
    car: freshCar(track),
    ghost: null, recording: [], skids: [], particles: [],
    phase: 'ready', time: 0, laps: 3, bestTotal, trackIndex,
    message: 'Arrows or WASD. Hold SHIFT to handbrake into a corner.',
  }
}

function freshCar(t: Track): Car {
  return {
    pos: { ...t.start }, vel: { x: 0, y: 0 }, heading: t.startHeading,
    angVel: 0, speed: 0, drifting: false, slip: 0, boost: 0,
    lap: 0, checkpoint: 0, lapStart: 0, bestLap: 0, offTrack: 0,
  }
}

export function loadTrack(s: State, index: number): void {
  s.trackIndex = ((index % 10) + 10) % 10
  s.track = makeTrack(s.trackIndex + 1, s.w, s.h)
  s.car = freshCar(s.track)
  s.recording = []
  s.skids = []
  s.particles = []
  s.time = 0
  s.phase = 'ready'
}

/** Nearest point on the centre line, and how far along it we are. */
function nearest(t: Track, p: Vec): { index: number; dist: number } {
  let bi = 0, bd = Infinity
  for (let i = 0; i < t.points.length; i++) {
    const q = t.points[i]
    const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2
    if (d < bd) { bd = d; bi = i }
  }
  return { index: bi, dist: Math.sqrt(bd) }
}

export interface Input { throttle: number; steer: number; handbrake: boolean }

export function step(s: State, dt: number, input: Input): void {
  if (s.phase !== 'racing') return
  s.time += dt
  const c = s.car
  const t = s.track

  // Where the nose points, and the axis 90 degrees to it.
  const fx = Math.cos(c.heading), fy = Math.sin(c.heading)
  const rx = -fy, ry = fx

  // Split velocity into forward and lateral components. Everything about the
  // handling comes out of treating these two separately.
  let vf = c.vel.x * fx + c.vel.y * fy
  let vl = c.vel.x * rx + c.vel.y * ry

  const onTrack = nearest(t, c.pos).dist < t.width * 0.5
  const gripMul = onTrack ? 1 : 0.45      // off the surface, far less grip
  const power = onTrack ? 1 : 0.55

  // Engine and brakes act along the forward axis only.
  const ENGINE = 620, BRAKE = 900
  if (input.throttle > 0) vf += ENGINE * power * input.throttle * dt
  else if (input.throttle < 0) vf += (vf > 0 ? -BRAKE : ENGINE * 0.5) * -input.throttle * dt * -1

  // Rolling resistance and drag.
  vf -= vf * 0.55 * dt
  vf -= Math.sign(vf) * Math.min(Math.abs(vf), 22 * dt)

  // Lateral grip. Handbrake collapses it, which is how the drift starts.
  const gripLimit = (input.handbrake ? 90 : 420) * gripMul
  const shed = Math.min(Math.abs(vl), gripLimit * dt * 3.4)
  vl -= Math.sign(vl) * shed

  c.speed = Math.hypot(vf, vl)
  c.slip = Math.abs(vl)
  c.drifting = c.slip > 46

  // Steering authority rises with speed then falls off, so a stationary car
  // cannot spin on the spot and a fast one cannot turn like a go-kart.
  const authority = Math.min(1, c.speed / 130) * (1 - Math.min(0.45, c.speed / 900))
  const turn = 3.0 * authority * (input.handbrake ? 1.55 : 1)
  c.angVel += (input.steer * turn - c.angVel * 6) * dt
  c.heading += c.angVel * dt

  // Recombine into world velocity.
  c.vel.x = fx * vf + rx * vl
  c.vel.y = fy * vf + ry * vl

  // Drifting builds boost; boost is spent as extra forward force.
  if (c.drifting && onTrack) {
    c.boost = Math.min(100, c.boost + dt * 34)
    if (Math.random() < 0.7) {
      s.skids.push({ pos: { x: c.pos.x - fx * 9, y: c.pos.y - fy * 9 }, life: 3.2, a: c.heading })
      s.particles.push({
        pos: { x: c.pos.x - fx * 12, y: c.pos.y - fy * 12 },
        vel: { x: -fx * 40 + (Math.random() - 0.5) * 60, y: -fy * 40 + (Math.random() - 0.5) * 60 },
        life: 0.5, hue: 190 + Math.random() * 40, size: 2 + Math.random() * 3,
      })
    }
  }
  if (input.throttle > 0 && c.boost > 0) {
    const use = Math.min(c.boost, dt * 42)
    c.boost -= use
    c.vel.x += fx * use * 22 * dt
    c.vel.y += fy * use * 22 * dt
  }

  c.pos.x += c.vel.x * dt
  c.pos.y += c.vel.y * dt
  c.pos.x = Math.max(6, Math.min(s.w - 6, c.pos.x))
  c.pos.y = Math.max(6, Math.min(s.h - 6, c.pos.y))
  if (!onTrack) c.offTrack += dt

  // Lap timing by progress around the centre line, split into 8 sectors, so a
  // driver cannot cut the course and still register a lap.
  const near = nearest(t, c.pos)
  const sector = Math.floor((near.index / t.points.length) * 8)
  if (sector === (c.checkpoint + 1) % 8) c.checkpoint = sector
  if (sector === 0 && c.checkpoint === 7) {
    c.checkpoint = 0
    const lapTime = s.time - c.lapStart
    if (c.lap > 0 && (c.bestLap === 0 || lapTime < c.bestLap)) c.bestLap = lapTime
    c.lapStart = s.time
    c.lap += 1
    if (c.lap > s.laps) {
      s.phase = 'finished'
      const prev = s.bestTotal[s.trackIndex]
      if (prev === undefined || s.time < prev) {
        s.bestTotal[s.trackIndex] = s.time
        s.ghost = s.recording.slice()
        s.message = 'New track record.'
      } else {
        s.message = 'Finished.'
      }
    }
  }

  if (Math.floor(s.time * 20) !== Math.floor((s.time - dt) * 20)) {
    s.recording.push({ x: c.pos.x, y: c.pos.y })
  }

  for (const k of s.skids) k.life -= dt
  s.skids = s.skids.filter(k => k.life > 0)
  if (s.skids.length > 600) s.skids.splice(0, s.skids.length - 600)
  for (const p of s.particles) {
    p.pos.x += p.vel.x * dt; p.pos.y += p.vel.y * dt
    p.vel.x *= Math.pow(0.05, dt); p.vel.y *= Math.pow(0.05, dt)
    p.life -= dt
  }
  s.particles = s.particles.filter(p => p.life > 0)
}

export function start(s: State): void {
  s.car = freshCar(s.track)
  s.recording = []
  s.skids = []
  s.time = 0
  s.car.lapStart = 0
  s.car.lap = 1
  s.phase = 'racing'
}

export function fmt(t: number): string {
  if (!t) return '—'
  const m = Math.floor(t / 60)
  const sec = t - m * 60
  return m > 0 ? `${m}:${sec.toFixed(2).padStart(5, '0')}` : sec.toFixed(2)
}
