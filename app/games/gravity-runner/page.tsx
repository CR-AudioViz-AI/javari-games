'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Play, RotateCcw, Trophy, Star, Volume2, VolumeX } from 'lucide-react'

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 500
const PLAYER_SIZE = 25
const GRAVITY = 0.5
const GROUND_HEIGHT = 60

const LEVEL_CONFIGS = [
  { speed: 5, obstacleFreq: 0.015, name: 'Training' },
  { speed: 6, obstacleFreq: 0.02, name: 'Easy' },
  { speed: 7, obstacleFreq: 0.025, name: 'Normal' },
  { speed: 8, obstacleFreq: 0.03, name: 'Hard' },
  { speed: 9, obstacleFreq: 0.035, name: 'Very Hard' },
  { speed: 10, obstacleFreq: 0.04, name: 'Expert' },
  { speed: 11, obstacleFreq: 0.045, name: 'Master' },
  { speed: 12, obstacleFreq: 0.05, name: 'Insane' },
  { speed: 13, obstacleFreq: 0.055, name: 'Nightmare' },
  { speed: 15, obstacleFreq: 0.06, name: 'IMPOSSIBLE' },
]

const ACHIEVEMENTS = [
  { id: 'first_flip', name: 'First Flip', desc: 'Flip gravity once', icon: '🔄', target: 1 },
  { id: 'flip_100', name: 'Flip Master', desc: 'Flip 100 times total', icon: '🌀', target: 100 },
  { id: 'dist_100', name: 'Century', desc: 'Travel 100m', icon: '📏', target: 100 },
  { id: 'dist_500', name: 'Marathon', desc: 'Travel 500m', icon: '🏃', target: 500 },
  { id: 'dist_1000', name: 'Ultra', desc: 'Travel 1000m', icon: '🚀', target: 1000 },
  { id: 'coins_50', name: 'Collector', desc: 'Get 50 coins', icon: '💰', target: 50 },
  { id: 'level_5', name: 'Expert', desc: 'Reach level 5', icon: '⭐', target: 5 },
  { id: 'level_10', name: 'Master', desc: 'Reach level 10', icon: '👑', target: 10 },
]

class SoundEngine {
  private ctx: AudioContext | null = null
  enabled = true
  init() { if (typeof window !== 'undefined' && !this.ctx) this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)() }
  play(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.1) {
    if (!this.enabled || !this.ctx) return
    const o = this.ctx.createOscillator(), g = this.ctx.createGain()
    o.connect(g); g.connect(this.ctx.destination); o.frequency.value = freq; o.type = type
    g.gain.setValueAtTime(vol, this.ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur)
    o.start(); o.stop(this.ctx.currentTime + dur)
  }
  flip() { this.play(400, 0.1, 'sine', 0.08); setTimeout(() => this.play(600, 0.08, 'sine'), 50) }
  coin() { this.play(800, 0.05, 'sine', 0.06); setTimeout(() => this.play(1000, 0.05, 'sine'), 50) }
  crash() { this.play(150, 0.2, 'sawtooth', 0.12) }
  levelUp() { this.play(523, 0.1, 'sine'); setTimeout(() => this.play(659, 0.1, 'sine'), 100); setTimeout(() => this.play(784, 0.15, 'sine'), 200) }
  achievement() { this.play(600, 0.1, 'sine'); setTimeout(() => this.play(800, 0.1, 'sine'), 100); setTimeout(() => this.play(1000, 0.15, 'sine'), 200) }
}
const sound = new SoundEngine()

export default function GravityRunnerGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [distance, setDistance] = useState(0)
  const [coins, setCoins] = useState(0)
  const [flips, setFlips] = useState(0)
  const [level, setLevel] = useState(1)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [achievements, setAchievements] = useState<{[id:string]: boolean}>({})
  const [newAchievement, setNewAchievement] = useState<string | null>(null)
  const [stats, setStats] = useState({ totalDist: 0, totalCoins: 0, totalFlips: 0 })

  const gameRef = useRef({
    player: { x: 150, y: CANVAS_HEIGHT / 2, vy: 0 },
    gravityFlipped: false,
    obstacles: [] as {x:number,y:number,w:number,h:number,type:string}[],
    coins: [] as {x:number,y:number,collected:boolean}[],
    particles: [] as {x:number,y:number,vx:number,vy:number,life:number,color:string}[],
    groundY: CANVAS_HEIGHT - GROUND_HEIGHT,
    ceilingY: GROUND_HEIGHT,
    lastObstacle: CANVAS_WIDTH,
    bgOffset: 0,
  })

  useEffect(() => { sound.init(); sound.enabled = soundEnabled
    const hs = localStorage.getItem('gravRunner_hs'); if (hs) setHighScore(parseInt(hs))
    const st = localStorage.getItem('gravRunner_stats'); if (st) setStats(JSON.parse(st))
    const ach = localStorage.getItem('gravRunner_ach'); if (ach) setAchievements(JSON.parse(ach))
  }, [soundEnabled])

  const createParticles = (x: number, y: number, color: string, count: number) => {
    const g = gameRef.current
    for (let i = 0; i < count; i++) { const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 4
      g.particles.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s, life: 30, color }) }
  }

  const checkAch = useCallback((d: number, c: number, f: number, l: number) => {
    const newAch = { ...achievements }
    const total = { totalDist: stats.totalDist + d, totalCoins: stats.totalCoins + c, totalFlips: stats.totalFlips + f }
    ACHIEVEMENTS.forEach(a => { if (newAch[a.id]) return; let val = 0
      if (a.id === 'first_flip') val = f; else if (a.id === 'flip_100') val = total.totalFlips
      else if (a.id === 'dist_100') val = d; else if (a.id === 'dist_500' || a.id === 'dist_1000') val = total.totalDist
      else if (a.id === 'coins_50') val = total.totalCoins; else if (a.id === 'level_5' || a.id === 'level_10') val = l
      if (val >= a.target) { newAch[a.id] = true; setNewAchievement(a.name); sound.achievement(); setTimeout(() => setNewAchievement(null), 3000) }
    })
    setAchievements(newAch); localStorage.setItem('gravRunner_ach', JSON.stringify(newAch))
  }, [achievements, stats])

  const startGame = () => { const g = gameRef.current
    g.player = { x: 150, y: CANVAS_HEIGHT / 2, vy: 0 }; g.gravityFlipped = false; g.obstacles = []; g.coins = []; g.particles = []; g.lastObstacle = CANVAS_WIDTH; g.bgOffset = 0
    setScore(0); setDistance(0); setCoins(0); setFlips(0); setLevel(1); setIsPlaying(true); setGameOver(false)
  }

  const handleFlip = useCallback(() => { if (!isPlaying || gameOver) return
    gameRef.current.gravityFlipped = !gameRef.current.gravityFlipped; sound.flip()
    createParticles(gameRef.current.player.x, gameRef.current.player.y, '#00ffff', 8); setFlips(f => f + 1)
  }, [isPlaying, gameOver])

  useEffect(() => { if (!isPlaying || gameOver) return
    const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext('2d'); if (!ctx) return
    const g = gameRef.current; let animId: number, frame = 0, currentDist = 0, currentCoins = 0, currentFlips = flips, currentLevel = level

    const onKey = (e: KeyboardEvent) => { if (e.code === 'Space' || e.key === 'w' || e.key === 's' || e.code === 'ArrowUp' || e.code === 'ArrowDown') { e.preventDefault(); handleFlip(); currentFlips++ } }
    const onClick = () => { handleFlip(); currentFlips++ }
    window.addEventListener('keydown', onKey); canvas.addEventListener('click', onClick); canvas.addEventListener('touchstart', onClick)

    const loop = () => { frame++; const config = LEVEL_CONFIGS[Math.min(currentLevel - 1, 9)], speed = config.speed
      ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      g.bgOffset = (g.bgOffset + speed * 0.3) % 40; ctx.strokeStyle = 'rgba(0, 150, 200, 0.1)'
      for (let x = -g.bgOffset; x < CANVAS_WIDTH; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke() }
      ctx.fillStyle = '#1a1a3a'; ctx.fillRect(0, g.groundY, CANVAS_WIDTH, GROUND_HEIGHT); ctx.fillRect(0, 0, CANVAS_WIDTH, g.ceilingY)
      ctx.shadowBlur = 15; ctx.shadowColor = '#00ffff'; ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(0, g.groundY); ctx.lineTo(CANVAS_WIDTH, g.groundY); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, g.ceilingY); ctx.lineTo(CANVAS_WIDTH, g.ceilingY); ctx.stroke(); ctx.shadowBlur = 0

      g.player.vy += g.gravityFlipped ? -GRAVITY : GRAVITY; g.player.y += g.player.vy
      if (g.player.y < g.ceilingY + PLAYER_SIZE/2) { g.player.y = g.ceilingY + PLAYER_SIZE/2; g.player.vy = 0 }
      if (g.player.y > g.groundY - PLAYER_SIZE/2) { g.player.y = g.groundY - PLAYER_SIZE/2; g.player.vy = 0 }

      if (Math.random() < config.obstacleFreq && g.lastObstacle < CANVAS_WIDTH - 200) {
        const onCeil = Math.random() > 0.5, h = 30 + Math.random() * 40
        g.obstacles.push({ x: CANVAS_WIDTH + 50, y: onCeil ? g.ceilingY : g.groundY - h, w: 25 + Math.random() * 20, h, type: Math.random() > 0.7 ? 'moving' : 'spike' })
        g.lastObstacle = CANVAS_WIDTH + 50
      }
      if (Math.random() < 0.01) g.coins.push({ x: CANVAS_WIDTH + 30, y: g.ceilingY + 40 + Math.random() * (g.groundY - g.ceilingY - 80), collected: false })

      g.obstacles = g.obstacles.filter(o => { o.x -= speed
        if (o.type === 'moving') o.y += Math.sin(frame * 0.05) * 2
        ctx.shadowBlur = 10; ctx.shadowColor = '#ff4444'; ctx.fillStyle = '#ff4444'; ctx.beginPath()
        if (o.type === 'spike') { ctx.moveTo(o.x + o.w/2, o.y); ctx.lineTo(o.x, o.y + o.h); ctx.lineTo(o.x + o.w, o.y + o.h) } else ctx.rect(o.x, o.y, o.w, o.h)
        ctx.fill(); ctx.shadowBlur = 0
        const px = g.player.x, py = g.player.y, ps = PLAYER_SIZE * 0.4
        if (px + ps > o.x && px - ps < o.x + o.w && py + ps > o.y && py - ps < o.y + o.h) {
          sound.crash(); createParticles(px, py, '#ff4444', 20)
          const newStats = { totalDist: stats.totalDist + currentDist, totalCoins: stats.totalCoins + currentCoins, totalFlips: stats.totalFlips + currentFlips }
          setStats(newStats); localStorage.setItem('gravRunner_stats', JSON.stringify(newStats))
          const finalScore = Math.floor(currentDist * 10 + currentCoins * 50)
          if (finalScore > highScore) { setHighScore(finalScore); localStorage.setItem('gravRunner_hs', finalScore.toString()) }
          checkAch(currentDist, currentCoins, currentFlips, currentLevel); setGameOver(true); return false
        }
        return o.x > -100
      }); g.lastObstacle -= speed

      g.coins = g.coins.filter(c => { if (c.collected) return false; c.x -= speed
        ctx.shadowBlur = 10; ctx.shadowColor = '#ffff00'; ctx.fillStyle = '#ffff00'; ctx.beginPath(); ctx.arc(c.x, c.y, 12, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.fillText('$', c.x, c.y + 4); ctx.shadowBlur = 0
        if (Math.hypot(c.x - g.player.x, c.y - g.player.y) < PLAYER_SIZE) { c.collected = true; sound.coin(); createParticles(c.x, c.y, '#ffff00', 10); currentCoins++; setCoins(currentCoins); return false }
        return c.x > -30
      })

      g.particles = g.particles.filter(p => { p.x += p.vx; p.y += p.vy; p.vx *= 0.95; p.vy *= 0.95; p.life--
        ctx.globalAlpha = p.life / 30; ctx.fillStyle = p.color; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); ctx.globalAlpha = 1; return p.life > 0
      })

      ctx.save(); ctx.translate(g.player.x, g.player.y); if (g.gravityFlipped) ctx.scale(1, -1)
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, PLAYER_SIZE * 1.5); glow.addColorStop(0, 'rgba(0, 255, 255, 0.3)'); glow.addColorStop(1, 'rgba(0, 255, 255, 0)')
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, PLAYER_SIZE * 1.5, 0, Math.PI * 2); ctx.fill()
      ctx.shadowBlur = 15; ctx.shadowColor = '#00ffff'; ctx.fillStyle = '#00ffff'; ctx.beginPath()
      ctx.moveTo(PLAYER_SIZE, 0); ctx.lineTo(-PLAYER_SIZE/2, -PLAYER_SIZE/2); ctx.lineTo(-PLAYER_SIZE/2, PLAYER_SIZE/2); ctx.closePath(); ctx.fill()
      ctx.fillStyle = 'rgba(0, 255, 255, 0.5)'; ctx.fillRect(-PLAYER_SIZE - 20, -3, 20, 6); ctx.restore(); ctx.shadowBlur = 0

      currentDist += speed * 0.01; setDistance(Math.floor(currentDist)); setScore(Math.floor(currentDist * 10 + currentCoins * 50))
      const newLevel = Math.min(10, Math.floor(currentDist / 100) + 1)
      if (newLevel > currentLevel) { currentLevel = newLevel; setLevel(newLevel); sound.levelUp(); createParticles(g.player.x, g.player.y, '#00ff00', 20) }

      ctx.fillStyle = '#fff'; ctx.font = 'bold 18px Arial'; ctx.textAlign = 'left'
      ctx.fillText(`SCORE: ${Math.floor(currentDist * 10 + currentCoins * 50)}`, 15, 30); ctx.fillText(`DISTANCE: ${Math.floor(currentDist)}m`, 15, 55)
      ctx.fillStyle = '#ffff00'; ctx.fillText(`COINS: ${currentCoins}`, 200, 30)
      ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.fillText(`LEVEL ${currentLevel}`, CANVAS_WIDTH - 15, 30)
      ctx.fillStyle = '#888'; ctx.font = '14px Arial'; ctx.fillText(LEVEL_CONFIGS[Math.min(currentLevel - 1, 9)].name, CANVAS_WIDTH - 15, 50)
      ctx.fillStyle = g.gravityFlipped ? '#ff8800' : '#00ff88'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'
      ctx.fillText(g.gravityFlipped ? '▲ FLIPPED' : '▼ NORMAL', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 20)

      if (!gameOver) animId = requestAnimationFrame(loop)
    }
    animId = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(animId); window.removeEventListener('keydown', onKey); canvas.removeEventListener('click', onClick); canvas.removeEventListener('touchstart', onClick) }
  }, [isPlaying, gameOver, handleFlip, flips, level, highScore, stats, checkAch])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900 text-white">
      <header className="border-b border-cyan-500/30 bg-black/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300"><ArrowLeft className="w-5 h-5" /><span>Back</span></Link>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">GRAVITY RUNNER</h1>
          <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700">{soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}</button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8 flex-col lg:flex-row">
          <div className="flex-shrink-0">
            <div className="relative rounded-lg overflow-hidden border-2 border-cyan-500/50 shadow-2xl shadow-cyan-500/20">
              <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="bg-gray-900" />
              {!isPlaying && !gameOver && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
                  <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">GRAVITY RUNNER</h2>
                  <p className="text-gray-400 mb-2">Flip gravity to avoid obstacles!</p>
                  <p className="text-gray-500 mb-8 text-sm">Press SPACE, W, S or CLICK to flip</p>
                  <button onClick={startGame} className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-bold text-xl hover:from-cyan-400 hover:to-purple-400 flex items-center gap-2"><Play className="w-6 h-6" /> START</button>
                  {highScore > 0 && <p className="mt-4 text-yellow-400"><Trophy className="inline w-5 h-5 mr-2" />High Score: {highScore}</p>}
                </div>
              )}
              {gameOver && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center">
                  <h2 className="text-5xl font-bold mb-4 text-red-500">GAME OVER</h2>
                  <p className="text-2xl mb-2">Score: <span className="text-cyan-400">{score}</span></p>
                  <p className="text-gray-400 mb-2">Distance: {distance}m • Coins: {coins} • Flips: {flips}</p>
                  <p className="text-gray-400 mb-6">Level {level} - {LEVEL_CONFIGS[Math.min(level-1, 9)].name}</p>
                  {score >= highScore && score > 0 && <p className="text-2xl text-yellow-400 mb-4 animate-pulse">🎉 NEW HIGH SCORE! 🎉</p>}
                  <button onClick={startGame} className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-bold text-xl hover:from-cyan-400 hover:to-purple-400 flex items-center gap-2"><RotateCcw className="w-6 h-6" /> PLAY AGAIN</button>
                </div>
              )}
              {newAchievement && <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-600 to-orange-600 px-6 py-3 rounded-lg shadow-2xl animate-bounce"><p className="font-bold">🏆 Achievement: {newAchievement}!</p></div>}
            </div>
            <div className="mt-4 text-center text-gray-400 text-sm"><span className="mr-4">SPACE / W / S: Flip</span><span>CLICK / TAP: Flip</span></div>
          </div>
          <div className="flex-1 space-y-6">
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-400" /> Stats</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-gray-400">High Score</p><p className="text-2xl font-bold text-yellow-400">{highScore}</p></div>
                <div><p className="text-gray-400">Total Distance</p><p className="text-2xl font-bold text-cyan-400">{stats.totalDist}m</p></div>
                <div><p className="text-gray-400">Total Coins</p><p className="text-xl font-bold text-yellow-400">{stats.totalCoins}</p></div>
                <div><p className="text-gray-400">Total Flips</p><p className="text-xl font-bold text-purple-400">{stats.totalFlips}</p></div>
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Star className="w-5 h-5 text-purple-400" /> Achievements ({Object.keys(achievements).filter(k => achievements[k]).length}/{ACHIEVEMENTS.length})</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {ACHIEVEMENTS.map(a => (
                  <div key={a.id} className={`flex items-center gap-3 p-2 rounded ${achievements[a.id] ? 'bg-green-900/30' : 'bg-gray-700/30'}`}>
                    <span className={`text-2xl ${achievements[a.id] ? '' : 'grayscale opacity-50'}`}>{a.icon}</span>
                    <div className="flex-1"><p className={`font-medium ${achievements[a.id] ? 'text-green-400' : 'text-gray-500'}`}>{a.name}</p><p className="text-xs text-gray-500">{a.desc}</p></div>
                    {achievements[a.id] && <span className="text-green-400">✓</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-bold mb-4">Level Progression</h3>
              <div className="space-y-1 text-sm">{LEVEL_CONFIGS.map((c, i) => (
                <div key={i} className={`flex justify-between ${level > i ? 'text-green-400' : level === i + 1 ? 'text-cyan-400 font-bold' : 'text-gray-500'}`}><span>Level {i + 1}</span><span>{c.name}</span></div>
              ))}</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
