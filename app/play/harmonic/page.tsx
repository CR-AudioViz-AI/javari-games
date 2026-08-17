'use client'
// app/play/harmonic/page.tsx — HARMONIC
//
// Game one of the real twenty-five. You are a tone; surfaces are solid only in
// harmonic ratio with your pitch. Retune and the world rearranges.
//
// THE AUDIO IS THE STATE. A single oscillator is driven by state.pitch — the
// same number the physics uses. They cannot desynchronise because there is only
// one of them. Every surface you land on strikes a partial tuned to its own
// frequency, so the level plays itself as you descend.
//
// SOLIDITY IS RENDERED AS OPACITY AND EMISSION, continuously. A face at 60%
// consonance is visibly translucent and dim — you can see a platform becoming
// real as you glide toward its pitch. That readability is the whole game, and
// it is why it must be lit 3D rather than flat colour.
//
// CR AudioViz AI, LLC · EIN 39-3646201 · August 2026
import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { ParticleField, Stage, makeGlowTexture } from '@/lib/g3d/stage'
import {
  SOLID_THRESHOLD, State, consonance, load, newState, next, retry,
  setPitchIndex, solidity, start, step,
} from './engine'

const STEP = 1 / 60

/** A tiny synth. One voice for the player, a pool of partials for strikes. */
class Voice {
  private ctx: AudioContext | null = null
  private osc: OscillatorNode | null = null
  private gain: GainNode | null = null
  private filter: BiquadFilterNode | null = null
  ready = false

  start(): void {
    if (this.ready) return
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new AC()
      const o = this.ctx.createOscillator()
      // A sawtooth through a resonant lowpass reads as a voice rather than a
      // test tone, and the filter sweep gives the glide something to say.
      o.type = 'sawtooth'
      const f = this.ctx.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.value = 1400
      f.Q.value = 6
      const g = this.ctx.createGain()
      g.gain.value = 0.06
      o.connect(f); f.connect(g); g.connect(this.ctx.destination)
      o.start()
      this.osc = o; this.gain = g; this.filter = f
      this.ready = true
    } catch {
      this.ready = false
    }
  }

  setPitch(hz: number): void {
    if (!this.osc || !this.ctx) return
    // Ramp rather than set: an instant frequency change clicks audibly.
    this.osc.frequency.setTargetAtTime(hz, this.ctx.currentTime, 0.02)
    this.filter?.frequency.setTargetAtTime(hz * 5 + 600, this.ctx.currentTime, 0.05)
  }

  /** A struck surface: a short bell partial at that surface's own frequency. */
  strike(hz: number, force: number): void {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    const o = this.ctx.createOscillator()
    o.type = 'triangle'
    o.frequency.value = hz * 2
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.08 * force + 0.01, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9)
    o.connect(g); g.connect(this.ctx.destination)
    o.start(t)
    o.stop(t + 1)
  }

  stop(): void {
    try { this.osc?.stop(); this.ctx?.close() } catch { /* already closed */ }
    this.ready = false
  }
}

export default function Harmonic() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ref = useRef<State | null>(null)
  const keys = useRef<Record<string, boolean>>({})
  const voice = useRef<Voice | null>(null)
  const [ui, setUi] = useState({ phase: 'briefing', level: 0, name: '', hint: '',
                                 pitch: 220, palette: [] as number[], pi: 0,
                                 time: 0, best: 0, deaths: 0, msg: '', total: 12 })

  const sync = useCallback(() => {
    const s = ref.current
    if (!s) return
    const l = s.levels[s.level]
    setUi({ phase: s.phase, level: s.level, name: l.name, hint: l.hint,
            pitch: s.pitch, palette: l.palette, pi: s.paletteIndex,
            time: s.time, best: s.best[s.level] ?? 0, deaths: s.deaths,
            msg: s.message, total: s.levels.length })
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const stage = new Stage(canvas, {
      fov: 52, exposure: 1.2,
      fog: { colour: 0x05030c, near: 24, far: 90 },
      key: 0xfff0e6, fill: 0x7aa8ff, rim: 0xff5fa8,
    })
    if (!stage.ok) return

    if (!ref.current) {
      let best: Record<number, number> = {}
      try { best = JSON.parse(window.localStorage?.getItem('harmonic.best') ?? '{}') } catch { best = {} }
      ref.current = newState(best)
    }
    voice.current = new Voice()

    const glowTex = makeGlowTexture()
    const particles = new ParticleField(1800, glowTex, 0.5)
    stage.scene.add(particles.points)

    // The player: a glowing core inside a wireframe shell that pulses at pitch.
    const player = new THREE.Group()
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.32, 2),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff,
        emissiveIntensity: 3.2, roughness: 0.2, metalness: 0 }))
    player.add(core)
    const shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.62, 1),
      new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true,
        transparent: true, opacity: 0.4 }))
    player.add(shell)
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0xffffff, blending: THREE.AdditiveBlending,
      depthWrite: false, transparent: true, opacity: 0.5 }))
    halo.scale.setScalar(2.6)
    player.add(halo)
    stage.scene.add(player)

    // Face meshes are rebuilt per level, so keep a handle to clear them.
    let faceMeshes: THREE.Mesh[] = []
    const rebuild = () => {
      const s = ref.current!
      for (const m of faceMeshes) {
        stage.scene.remove(m)
        m.geometry.dispose()
        ;(m.material as THREE.Material).dispose()
      }
      faceMeshes = []
      for (const f of s.faces) {
        const geo = new THREE.BoxGeometry(
          Math.max(0.12, f.h.x * 2), Math.max(0.12, f.h.y * 2), Math.max(0.12, f.h.z * 2))
        // Hue from the interval relative to the level key, so a fifth is always
        // the same colour on every level. The palette teaches itself.
        const ratio = f.freq / s.levels[s.level].key
        const hue = f.kind === 'hazard' ? 0.99
                  : f.kind === 'gate' ? 0.12
                  : f.kind === 'source' ? 0.42
                  : (Math.log2(ratio) % 1 + 1) % 1
        const col = new THREE.Color().setHSL(hue, f.kind === 'anchor' ? 0.15 : 0.72, 0.55)
        const mat = new THREE.MeshStandardMaterial({
          color: col, emissive: col, emissiveIntensity: 0.4,
          roughness: 0.3, metalness: 0.55, transparent: true, opacity: 1,
        })
        const m = new THREE.Mesh(geo, mat)
        m.position.set(f.c.x, f.c.y, f.c.z)
        m.castShadow = true
        m.receiveShadow = true
        stage.scene.add(m)
        faceMeshes.push(m)
      }
    }
    rebuild()

    let W = 900, H = 560
    const resize = () => {
      const r = canvas.parentElement?.getBoundingClientRect()
      W = Math.min(1100, r ? r.width - 8 : 900)
      H = Math.round(W * 0.60)
      canvas.style.width = `${W}px`
      canvas.style.height = `${H}px`
      stage.resize(W, H)
    }
    resize()
    window.addEventListener('resize', resize)

    const kd = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      keys.current[k] = true
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault()
      const s = ref.current
      if (!s) return
      const n = parseInt(k, 10)
      if (n >= 1 && n <= 9) { setPitchIndex(s, n - 1); sync() }
      if (k === 'q') { setPitchIndex(s, Math.max(0, s.paletteIndex - 1)); sync() }
      if (k === 'e') {
        setPitchIndex(s, Math.min(s.levels[s.level].palette.length - 1, s.paletteIndex + 1))
        sync()
      }
    }
    const ku = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)

    let raf = 0, last = performance.now(), acc = 0
    let lastLevel = -1
    const frame = (now: number) => {
      const s = ref.current
      if (!s) { raf = requestAnimationFrame(frame); return }
      if (s.level !== lastLevel) { lastLevel = s.level; rebuild() }

      acc += Math.min(0.25, (now - last) / 1000)
      last = now
      const before = s.phase
      while (acc >= STEP) {
        const k = keys.current
        step(s, STEP, {
          x: (k['d'] || k['arrowright'] ? 1 : 0) + (k['a'] || k['arrowleft'] ? -1 : 0),
          z: (k['s'] || k['arrowdown'] ? 1 : 0) + (k['w'] || k['arrowup'] ? -1 : 0),
          jump: !!k[' '],
        })
        acc -= STEP
      }

      // Audio follows the same number the physics uses.
      voice.current?.setPitch(s.pitch)
      for (const st of s.strikes) {
        voice.current?.strike(st.freq, st.force)
        const c = new THREE.Color().setHSL(
          (Math.log2(st.freq / s.levels[s.level].key) % 1 + 1) % 1, 0.9, 0.6)
        for (let i = 0; i < 14; i++) {
          particles.emit(st.at.x, st.at.y - 0.3, st.at.z,
            (Math.random() - 0.5) * 6, Math.random() * 4, (Math.random() - 0.5) * 6,
            c.r, c.g, c.b, 0.5 + Math.random() * 0.4)
        }
      }
      particles.update(Math.min(0.05, (now - last) / 1000 + STEP))

      // Solidity drives opacity and emission continuously — you SEE a platform
      // becoming real as you glide toward its pitch.
      for (let i = 0; i < s.faces.length; i++) {
        const f = s.faces[i]
        const m = faceMeshes[i]
        if (!m) continue
        const mat = m.material as THREE.MeshStandardMaterial
        const sol = f.kind === 'hazard' ? 1 : f.solid
        if (f.kind === 'hazard') {
          mat.opacity = 0.9
          mat.emissiveIntensity = 1.4 + Math.sin(now / 160) * 0.5
        } else {
          const on = sol >= SOLID_THRESHOLD
          mat.opacity = 0.10 + sol * 0.9
          mat.emissiveIntensity = 0.12 + sol * 1.5 + f.ring * 3.2
          m.castShadow = on
        }
        // Struck surfaces swell briefly, so the level visibly rings.
        const sw = 1 + f.ring * 0.09
        m.scale.set(sw, 1 + f.ring * 0.35, sw)
      }

      player.position.set(s.pos.x, s.pos.y, s.pos.z)
      const beat = 1 + Math.sin(now / 1000 * (s.pitch / 60)) * 0.09
      core.scale.setScalar(beat)
      shell.rotation.y += 0.012
      shell.rotation.x += 0.007
      const hue = (Math.log2(s.pitch / s.levels[s.level].key) % 1 + 1) % 1
      const pc = new THREE.Color().setHSL(hue, 0.85, 0.62)
      ;(core.material as THREE.MeshStandardMaterial).emissive = pc
      ;(halo.material as THREE.SpriteMaterial).color = pc
      halo.scale.setScalar(2.2 + beat * 0.8)

      // Chase camera, behind and above, easing.
      const camT = new THREE.Vector3(s.pos.x * 0.5, s.pos.y + 8.5, s.pos.z + 13)
      stage.camera.position.lerp(camT, Math.min(1, 0.06 + STEP))
      if (s.shake > 0) {
        stage.camera.position.x += (Math.random() - 0.5) * s.shake
        stage.camera.position.y += (Math.random() - 0.5) * s.shake
      }
      stage.camera.lookAt(s.pos.x * 0.7, s.pos.y + 1, s.pos.z - 5)

      stage.render()
      if (s.phase !== before) sync()
      else if (Math.random() < 0.14) sync()
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
      voice.current?.stop()
      stage.dispose()
    }
  }, [sync])

  useEffect(() => {
    const s = ref.current
    if (!s) return
    try { window.localStorage?.setItem('harmonic.best', JSON.stringify(s.best)) } catch { /* private */ }
  }, [ui.phase])

  const begin = () => {
    const s = ref.current
    if (!s) return
    voice.current?.start()          // must follow a user gesture
    start(s); sync()
  }
  const again = () => { const s = ref.current; if (s) { retry(s); sync() } }
  const onward = () => { const s = ref.current; if (s) { next(s); sync() } }
  const restart = () => { const s = ref.current; if (s) { load(s, 0); sync() } }
  const pick = (i: number) => { const s = ref.current; if (s) { setPitchIndex(s, i); sync() } }

  const s = ref.current
  const l = s?.levels[s.level]

  return (
    <div style={{ minHeight: '100vh', background: '#05030c', color: '#EFE6FF',
                  fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 8, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 27, fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>
            HAR<span style={{ color: '#C9A6FF' }}>MONIC</span>
          </h1>
          <span style={{ color: 'rgba(239,230,255,0.6)', fontSize: 13 }}>
            You are a tone. A surface is solid only in harmony with your pitch.
          </span>
        </header>

        <div style={{ display: 'flex', gap: 18, fontSize: 13, marginBottom: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Stat label="MOVEMENT" value={`${ui.level + 1} / ${ui.total} · ${ui.name}`} />
          <Stat label="PITCH" value={`${ui.pitch.toFixed(1)} Hz`} tone="#C9A6FF" />
          <Stat label="TIME" value={`${ui.time.toFixed(1)}s`} />
          <Stat label="BEST" value={ui.best ? `${ui.best.toFixed(1)}s` : '—'} tone="#7BE495" />
          <Stat label="FALLS" value={String(ui.deaths)} tone="#FF6B6B" />
        </div>

        {/* The palette: what you can retune to on this level */}
        {l && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            {ui.palette.map((r, i) => {
              const hz = l.key * r
              const on = i === ui.pi
              const hue = ((Math.log2(r) % 1) + 1) % 1
              const col = `hsl(${hue * 360},72%,60%)`
              return (
                <button key={i} onClick={() => pick(i)}
                  style={{ padding: '6px 12px', borderRadius: 8, fontWeight: 800, fontSize: 12.5,
                    background: on ? col : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${on ? col : 'rgba(255,255,255,0.12)'}`,
                    color: on ? '#0b0616' : '#EFE6FF', cursor: 'pointer' }}>
                  {i + 1}. {intervalName(r)} · {hz.toFixed(0)}Hz
                </button>
              )
            })}
          </div>
        )}

        <div style={{ position: 'relative' }}>
          <canvas ref={canvasRef} style={{ display: 'block', borderRadius: 12,
            border: '1px solid rgba(201,166,255,0.2)' }} />

          {ui.phase === 'briefing' && (
            <Overlay>
              <h2 style={{ fontSize: 28, margin: '0 0 4px' }}>{ui.name}</h2>
              <p style={{ color: 'rgba(239,230,255,0.75)', maxWidth: 500, margin: '0 0 8px' }}>{ui.hint}</p>
              <p style={{ color: 'rgba(239,230,255,0.5)', maxWidth: 500, margin: '0 0 18px', fontSize: 13 }}>
                <b>WASD</b> to move, <b>space</b> to jump, <b>1–5</b> or <b>Q/E</b> to retune.
                A surface glows and turns solid as your pitch approaches its harmony — and
                fades to nothing as you leave it. Red never resolves. Sound on.
              </p>
              <Button onClick={begin}>Sound the note</Button>
            </Overlay>
          )}

          {ui.phase === 'won' && (
            <Overlay>
              <h2 style={{ fontSize: 26, margin: '0 0 4px' }}>Resolved</h2>
              <p style={{ color: 'rgba(239,230,255,0.72)', margin: '0 0 18px' }}>{ui.msg}</p>
              <Button onClick={onward}>{ui.level >= ui.total - 1 ? 'Finish' : 'Next movement'}</Button>
            </Overlay>
          )}

          {ui.phase === 'lost' && (
            <Overlay>
              <h2 style={{ fontSize: 24, margin: '0 0 6px' }}>{ui.msg}</h2>
              <p style={{ color: 'rgba(239,230,255,0.55)', maxWidth: 440, margin: '0 0 18px', fontSize: 13 }}>
                Pitch glides rather than snapping — a fast retune can drop you through the floor
                mid-stride. Holding a pitch under pressure is the skill.
              </p>
              <Button onClick={again}>Again</Button>
            </Overlay>
          )}

          {ui.phase === 'complete' && (
            <Overlay>
              <h2 style={{ fontSize: 28, margin: '0 0 4px' }}>All twelve movements</h2>
              <p style={{ color: '#C9A6FF', margin: '0 0 18px' }}>{ui.deaths} falls</p>
              <Button onClick={restart}>From the top</Button>
            </Overlay>
          )}
        </div>

        <p style={{ color: 'rgba(239,230,255,0.32)', fontSize: 12, marginTop: 10 }}>
          One oscillator drives both the audio and the physics — the same number, so they cannot
          desynchronise. Solidity is consonance measured in cents, rendered continuously as
          opacity and emission · CR AudioViz AI · EIN 39-3646201
        </p>
      </div>
    </div>
  )
}

function intervalName(r: number): string {
  const names: [number, string][] = [
    [0.5, 'octave down'], [1, 'root'], [1.2, 'minor 3rd'], [1.25, 'major 3rd'],
    [4 / 3, 'fourth'], [1.5, 'fifth'], [1.6, 'minor 6th'], [5 / 3, 'major 6th'], [2, 'octave'],
  ]
  let best = names[0]
  let bd = Infinity
  for (const n of names) {
    const d = Math.abs(n[0] - r)
    if (d < bd) { bd = d; best = n }
  }
  return best[1]
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: 1.2, color: 'rgba(239,230,255,0.42)' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: tone ?? '#EFE6FF' }}>{value}</div>
    </div>
  )
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                  background: 'rgba(5,3,12,0.86)', borderRadius: 12, padding: 20 }}>
      {children}
    </div>
  )
}

function Button({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ background: '#FF0800', color: '#fff', border: 'none',
      borderRadius: 10, padding: '13px 32px', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
      {children}
    </button>
  )
}
