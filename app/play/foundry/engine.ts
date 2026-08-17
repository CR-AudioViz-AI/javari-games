// app/play/foundry/engine.ts — Foundry
//
// Game eight of twenty-five. Kingdom Lines and Signal War showed opponent AI.
// This one shows SYSTEMS SIMULATION: a factory where items physically travel,
// machines starve or back up, and throughput is an emergent property of the
// layout rather than a number on a card.
//
// ITEMS OCCUPY SPACE ON BELTS. The naive approach is a queue per belt with a
// timer. That cannot produce a jam, and a factory game without jams has no
// puzzle in it. Here each item has a position along its belt and cannot pass
// through the one in front, so a slow machine backs its input line up and the
// player can SEE where the bottleneck is.
//
// THE SIMULATION IS ORDER-INDEPENDENT. Belts are advanced back to front — the
// item nearest the end moves first — so a full belt still flows one slot per
// tick. Advancing front to back makes items teleport several slots in one
// frame, which looks like a speed bonus for being at the back of the queue.
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026

export type Item = 'ore' | 'ingot' | 'plate' | 'gear' | 'circuit' | 'engine'

export const ITEM_HUE: Record<Item, number> = {
  ore: 25, ingot: 40, plate: 200, gear: 150, circuit: 280, engine: 330,
}

export type MachineKind = 'miner' | 'smelter' | 'press' | 'assembler' | 'lab' | 'sink'

export interface Recipe {
  inputs: Partial<Record<Item, number>>
  output: Item
  seconds: number
}

export interface MachineDef {
  kind: MachineKind
  name: string
  cost: number
  recipe: Recipe | null
  hue: number
  blurb: string
}

export const MACHINES: Record<MachineKind, MachineDef> = {
  miner:     { kind: 'miner',     name: 'Extractor', cost: 30, hue: 25,
               recipe: { inputs: {}, output: 'ore', seconds: 1.6 },
               blurb: 'Pulls ore from nothing. The start of every line.' },
  smelter:   { kind: 'smelter',   name: 'Smelter',   cost: 45, hue: 40,
               recipe: { inputs: { ore: 2 }, output: 'ingot', seconds: 2.2 },
               blurb: '2 ore to 1 ingot. Slower than one extractor can feed.' },
  press:     { kind: 'press',     name: 'Press',     cost: 55, hue: 200,
               recipe: { inputs: { ingot: 1 }, output: 'plate', seconds: 1.5 },
               blurb: '1 ingot to 1 plate. Fast, so it starves easily.' },
  assembler: { kind: 'assembler', name: 'Assembler', cost: 80, hue: 150,
               recipe: { inputs: { plate: 2, ingot: 1 }, output: 'gear', seconds: 3.0 },
               blurb: '2 plate + 1 ingot to 1 gear. Two input lines needed.' },
  lab:       { kind: 'lab',       name: 'Circuit Lab', cost: 110, hue: 280,
               recipe: { inputs: { plate: 1, gear: 1 }, output: 'circuit', seconds: 4.0 },
               blurb: '1 plate + 1 gear to 1 circuit. The bottleneck by design.' },
  sink:      { kind: 'sink',      name: 'Shipping',  cost: 20, hue: 330,
               recipe: null, blurb: 'Sells whatever arrives. Points per item.' },
}

export const MACHINE_ORDER: MachineKind[] = ['miner', 'smelter', 'press', 'assembler', 'lab', 'sink']

export const ITEM_VALUE: Record<Item, number> = {
  ore: 1, ingot: 3, plate: 6, gear: 18, circuit: 55, engine: 140,
}

export type Dir = 0 | 1 | 2 | 3   // right, down, left, up
const DX = [1, 0, -1, 0]
const DY = [0, 1, 0, -1]

export interface Cell {
  x: number
  y: number
  type: 'empty' | 'belt' | 'machine'
  dir: Dir
  machine?: MachineKind
  /** Machine buffers, and progress toward the current craft. */
  buffer: Partial<Record<Item, number>>
  progress: number
  /** Belt contents: position 0..1 along the belt, back to front. */
  items: { item: Item; pos: number }[]
  starved: boolean
  blocked: boolean
}

export interface State {
  w: number
  h: number
  grid: Cell[][]
  credits: number
  score: number
  time: number
  tool: MachineKind | 'belt' | 'erase'
  beltDir: Dir
  phase: 'building' | 'running' | 'won'
  level: number
  target: number
  produced: Partial<Record<Item, number>>
  best: Record<number, number>
  message: string
  throughput: number
  recent: number[]
}

const BELT_SPEED = 0.9      // belt lengths per second
const ITEM_GAP = 0.16       // minimum spacing, so a queue can physically jam

const LEVELS = [
  { name: 'First Line', w: 12, h: 8,  credits: 260, target: 240,
    hint: 'Extractor to Smelter to Shipping. Watch where items pile up.' },
  { name: 'Pressing',   w: 14, h: 9,  credits: 420, target: 900,
    hint: 'A Press is faster than a Smelter. Feed it from two.' },
  { name: 'Assembly',   w: 16, h: 10, credits: 620, target: 2600,
    hint: 'Assemblers need two different inputs arriving on the same belt.' },
  { name: 'Circuitry',  w: 18, h: 11, credits: 900, target: 7000,
    hint: 'The Lab is deliberately the bottleneck. Build around it.' },
]
export const LEVEL_COUNT = LEVELS.length
export const LEVEL_NAMES = LEVELS.map(l => l.name)

function blank(x: number, y: number): Cell {
  return { x, y, type: 'empty', dir: 0, buffer: {}, progress: 0, items: [], starved: false, blocked: false }
}

export function newState(level = 0, best: Record<number, number> = {}): State {
  const cfg = LEVELS[Math.min(level, LEVELS.length - 1)]
  const grid: Cell[][] = []
  for (let y = 0; y < cfg.h; y++) {
    const row: Cell[] = []
    for (let x = 0; x < cfg.w; x++) row.push(blank(x, y))
    grid.push(row)
  }
  return {
    w: cfg.w, h: cfg.h, grid, credits: cfg.credits, score: 0, time: 0,
    tool: 'belt', beltDir: 0, phase: 'building', level, target: cfg.target,
    produced: {}, best, message: cfg.hint, throughput: 0, recent: [],
  }
}

export function loadLevel(s: State, level: number): void {
  const n = newState(Math.min(level, LEVELS.length - 1), s.best)
  Object.assign(s, n)
}

export function costOf(tool: State['tool']): number {
  if (tool === 'belt') return 4
  if (tool === 'erase') return 0
  return MACHINES[tool].cost
}

export function place(s: State, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= s.w || y >= s.h) return false
  const c = s.grid[y][x]
  if (s.tool === 'erase') {
    if (c.type === 'empty') return false
    // Refund half — encourages experimenting rather than restarting.
    s.credits += Math.floor((c.type === 'belt' ? 4 : MACHINES[c.machine!].cost) / 2)
    s.grid[y][x] = blank(x, y)
    return true
  }
  const cost = costOf(s.tool)
  if (s.credits < cost) return false
  if (c.type !== 'empty') return false
  s.credits -= cost
  if (s.tool === 'belt') {
    s.grid[y][x] = { ...blank(x, y), type: 'belt', dir: s.beltDir }
  } else {
    s.grid[y][x] = { ...blank(x, y), type: 'machine', machine: s.tool, dir: s.beltDir }
  }
  return true
}

function at(s: State, x: number, y: number): Cell | null {
  if (x < 0 || y < 0 || x >= s.w || y >= s.h) return null
  return s.grid[y][x]
}

function downstream(s: State, c: Cell): Cell | null {
  return at(s, c.x + DX[c.dir], c.y + DY[c.dir])
}

/** Can this cell accept an item right now? Machines check their recipe. */
function accepts(s: State, c: Cell, item: Item): boolean {
  if (c.type === 'belt') {
    // Only if the back of the belt is clear — this is what creates a jam.
    const back = c.items.length ? Math.min(...c.items.map(i => i.pos)) : 1
    return back > ITEM_GAP
  }
  if (c.type !== 'machine' || !c.machine) return false
  const def = MACHINES[c.machine]
  if (def.kind === 'sink') return true
  if (!def.recipe) return false
  const need = def.recipe.inputs[item]
  if (!need) return false
  // Cap buffers at twice the recipe requirement so a machine cannot hoard.
  return (c.buffer[item] ?? 0) < need * 2
}

function give(s: State, c: Cell, item: Item): void {
  if (c.type === 'belt') {
    c.items.push({ item, pos: 0 })
    return
  }
  if (c.machine === 'sink') {
    s.score += ITEM_VALUE[item]
    s.credits += Math.ceil(ITEM_VALUE[item] * 0.5)
    s.produced[item] = (s.produced[item] ?? 0) + 1
    s.recent.push(ITEM_VALUE[item])
    return
  }
  c.buffer[item] = (c.buffer[item] ?? 0) + 1
}

export function step(s: State, dt: number): void {
  if (s.phase !== 'running') return
  s.time += dt

  // Throughput over a rolling window, so the HUD shows a rate not a total.
  if (s.recent.length > 400) s.recent.splice(0, s.recent.length - 400)

  // ── Belts ────────────────────────────────────────────────────────────────
  // Advance BACK TO FRONT: the item nearest the end moves first, so a full
  // belt still flows one slot per tick. Front to back makes items teleport.
  for (let y = 0; y < s.h; y++) {
    for (let x = 0; x < s.w; x++) {
      const c = s.grid[y][x]
      if (c.type !== 'belt') continue
      c.items.sort((a, b) => b.pos - a.pos)
      const next = downstream(s, c)
      c.blocked = false
      for (let i = 0; i < c.items.length; i++) {
        const it = c.items[i]
        const ahead = i > 0 ? c.items[i - 1].pos : Infinity
        const limit = Math.min(1, ahead - ITEM_GAP)
        const want = it.pos + BELT_SPEED * dt
        if (want >= 1) {
          if (next && accepts(s, next, it.item)) {
            give(s, next, it.item)
            c.items.splice(i, 1)
            i -= 1
            continue
          }
          it.pos = Math.min(1, limit)
          c.blocked = true
        } else {
          it.pos = Math.min(want, limit)
        }
      }
    }
  }

  // ── Machines ─────────────────────────────────────────────────────────────
  for (let y = 0; y < s.h; y++) {
    for (let x = 0; x < s.w; x++) {
      const c = s.grid[y][x]
      if (c.type !== 'machine' || !c.machine) continue
      const def = MACHINES[c.machine]
      if (!def.recipe) continue

      // Does it have what it needs?
      let ready = true
      for (const [k, n] of Object.entries(def.recipe.inputs)) {
        if ((c.buffer[k as Item] ?? 0) < (n as number)) { ready = false; break }
      }
      c.starved = !ready

      if (!ready) { c.progress = 0; continue }

      c.progress += dt / def.recipe.seconds
      if (c.progress < 1) continue

      const out = downstream(s, c)
      if (!out || !accepts(s, out, def.recipe.output)) {
        // Output blocked. Hold at full progress — this is what makes a
        // downstream jam visibly stall the machines feeding it.
        c.progress = 1
        c.blocked = true
        continue
      }
      c.blocked = false
      c.progress = 0
      for (const [k, n] of Object.entries(def.recipe.inputs)) {
        c.buffer[k as Item] = (c.buffer[k as Item] ?? 0) - (n as number)
      }
      give(s, out, def.recipe.output)
    }
  }

  // Rolling throughput: value shipped in the last ~8 seconds.
  const window = Math.min(s.recent.length, Math.floor(8 / Math.max(dt, 0.001)))
  s.throughput = s.recent.slice(-Math.max(1, window)).reduce((a, b) => a + b, 0) / 8

  if (s.score >= s.target) {
    s.phase = 'won'
    const t = Math.floor(s.time)
    const prev = s.best[s.level]
    if (prev === undefined || t < prev) s.best[s.level] = t
    s.message = `Quota met in ${t}s.`
  }
}

export function run(s: State): void { s.phase = 'running' }
export function pause(s: State): void { if (s.phase === 'running') s.phase = 'building' }
export function rotate(s: State): void { s.beltDir = ((s.beltDir + 1) % 4) as Dir }
export { DX, DY }
