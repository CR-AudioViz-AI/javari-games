'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'

// =============================================================================
// CR AUDIOVIZ AI - PROFESSIONAL GAMES HUB
// 100 Games: 10 Categories × 10 Games Each
// Features: Real graphics, professional gameplay, external resources
// =============================================================================

// ============ SPACE SHOOTER GAME ============
function SpaceShooterGame({ onScore, onGameOver }: { onScore: (s: number) => void, onGameOver: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [level, setLevel] = useState(1)
  
  interface Enemy { x: number; y: number; speed: number; health: number; type: string }
  interface Bullet { x: number; y: number; vy: number; damage: number }
  interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string }
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    let animationId: number
    let playerX = canvas.width / 2
    const playerY = canvas.height - 60
    let bullets: Bullet[] = []
    let enemies: Enemy[] = []
    let particles: Particle[] = []
    let gameScore = 0
    let currentLevel = 1
    let isGameOver = false
    let lastShot = 0
    let frame = 0
    const keys = new Set<string>()
    
    const createExplosion = (x: number, y: number, color: string, count: number) => {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count
        const speed = 2 + Math.random() * 3
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 30,
          color
        })
      }
    }
    
    const spawnEnemy = () => {
      if (isGameOver) return
      const types = ['scout', 'fighter', 'bomber']
      const type = types[Math.floor(Math.random() * Math.min(types.length, currentLevel))]
      const configs: Record<string, { health: number; speed: number }> = {
        scout: { health: 1, speed: 3 + currentLevel * 0.2 },
        fighter: { health: 2, speed: 2 + currentLevel * 0.15 },
        bomber: { health: 4, speed: 1 + currentLevel * 0.1 }
      }
      enemies.push({
        x: Math.random() * (canvas.width - 40) + 20,
        y: -30,
        speed: configs[type].speed,
        health: configs[type].health,
        type
      })
    }
    
    const enemyInterval = setInterval(spawnEnemy, 1200 - Math.min(currentLevel * 50, 600))
    
    const handleKeyDown = (e: KeyboardEvent) => {
      keys.add(e.key.toLowerCase())
      if ([' ', 'arrowleft', 'arrowright', 'a', 'd'].includes(e.key.toLowerCase())) {
        e.preventDefault()
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase())
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    const drawSpaceship = (x: number, y: number) => {
      // Engine glow
      const glowGradient = ctx.createRadialGradient(x, y + 25, 0, x, y + 25, 20)
      glowGradient.addColorStop(0, `rgba(0, 200, 255, ${0.8 + Math.sin(frame * 0.2) * 0.2})`)
      glowGradient.addColorStop(0.5, 'rgba(0, 100, 255, 0.4)')
      glowGradient.addColorStop(1, 'rgba(0, 50, 255, 0)')
      ctx.fillStyle = glowGradient
      ctx.beginPath()
      ctx.ellipse(x, y + 22, 10, 15 + Math.sin(frame * 0.3) * 3, 0, 0, Math.PI * 2)
      ctx.fill()
      
      // Ship body
      const bodyGradient = ctx.createLinearGradient(x - 20, y, x + 20, y)
      bodyGradient.addColorStop(0, '#1a1a3e')
      bodyGradient.addColorStop(0.3, '#4a4a8e')
      bodyGradient.addColorStop(0.5, '#6a6abe')
      bodyGradient.addColorStop(0.7, '#4a4a8e')
      bodyGradient.addColorStop(1, '#1a1a3e')
      ctx.fillStyle = bodyGradient
      ctx.beginPath()
      ctx.moveTo(x, y - 20)
      ctx.lineTo(x + 18, y + 15)
      ctx.lineTo(x + 8, y + 12)
      ctx.lineTo(x + 8, y + 20)
      ctx.lineTo(x - 8, y + 20)
      ctx.lineTo(x - 8, y + 12)
      ctx.lineTo(x - 18, y + 15)
      ctx.closePath()
      ctx.fill()
      
      // Cockpit
      const cockpitGradient = ctx.createRadialGradient(x, y - 3, 0, x, y - 3, 8)
      cockpitGradient.addColorStop(0, '#00ffff')
      cockpitGradient.addColorStop(0.5, '#0088aa')
      cockpitGradient.addColorStop(1, '#004466')
      ctx.fillStyle = cockpitGradient
      ctx.beginPath()
      ctx.ellipse(x, y - 3, 5, 8, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    
    const drawEnemy = (enemy: Enemy) => {
      const colors: Record<string, string> = { scout: '#ff4444', fighter: '#aa44aa', bomber: '#4444aa' }
      const sizes: Record<string, number> = { scout: 12, fighter: 18, bomber: 25 }
      
      const gradient = ctx.createRadialGradient(enemy.x, enemy.y, 0, enemy.x, enemy.y, sizes[enemy.type])
      gradient.addColorStop(0, colors[enemy.type])
      gradient.addColorStop(1, '#000')
      ctx.fillStyle = gradient
      
      if (enemy.type === 'scout') {
        ctx.beginPath()
        ctx.moveTo(enemy.x, enemy.y + 12)
        ctx.lineTo(enemy.x - 10, enemy.y - 8)
        ctx.lineTo(enemy.x, enemy.y - 3)
        ctx.lineTo(enemy.x + 10, enemy.y - 8)
        ctx.closePath()
        ctx.fill()
      } else if (enemy.type === 'fighter') {
        ctx.beginPath()
        ctx.moveTo(enemy.x, enemy.y + 18)
        ctx.lineTo(enemy.x - 15, enemy.y - 5)
        ctx.lineTo(enemy.x - 22, enemy.y - 12)
        ctx.lineTo(enemy.x - 8, enemy.y - 8)
        ctx.lineTo(enemy.x, enemy.y - 15)
        ctx.lineTo(enemy.x + 8, enemy.y - 8)
        ctx.lineTo(enemy.x + 22, enemy.y - 12)
        ctx.lineTo(enemy.x + 15, enemy.y - 5)
        ctx.closePath()
        ctx.fill()
      } else {
        ctx.beginPath()
        ctx.arc(enemy.x, enemy.y, sizes[enemy.type], 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#6666ff'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(enemy.x, enemy.y, 20, frame * 0.05, frame * 0.05 + Math.PI * 1.5)
        ctx.stroke()
      }
      
      // Health bar
      if (enemy.health > 1) {
        ctx.fillStyle = '#333'
        ctx.fillRect(enemy.x - 15, enemy.y - 25, 30, 4)
        ctx.fillStyle = '#0f0'
        ctx.fillRect(enemy.x - 15, enemy.y - 25, (enemy.health / 4) * 30, 4)
      }
    }
    
    const gameLoop = () => {
      if (isGameOver) return
      frame++
      
      // Background
      const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      bgGradient.addColorStop(0, '#0a0a1a')
      bgGradient.addColorStop(0.5, '#0a1a2a')
      bgGradient.addColorStop(1, '#1a0a2a')
      ctx.fillStyle = bgGradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Stars
      ctx.fillStyle = '#fff'
      for (let i = 0; i < 80; i++) {
        const starX = (i * 73 + frame * 0.5) % canvas.width
        const starY = (i * 37 + frame * (0.2 + (i % 3) * 0.1)) % canvas.height
        ctx.globalAlpha = 0.3 + (i % 5) * 0.15
        ctx.fillRect(starX, starY, 1 + (i % 2), 1 + (i % 2))
      }
      ctx.globalAlpha = 1
      
      // Player movement
      if (keys.has('arrowleft') || keys.has('a')) playerX = Math.max(20, playerX - 6)
      if (keys.has('arrowright') || keys.has('d')) playerX = Math.min(canvas.width - 20, playerX + 6)
      
      // Shooting
      if (keys.has(' ') && Date.now() - lastShot > 150) {
        lastShot = Date.now()
        bullets.push({ x: playerX, y: playerY - 20, vy: -10, damage: 1 })
      }
      
      // Update bullets
      bullets = bullets.filter(b => {
        b.y += b.vy
        ctx.fillStyle = '#0ff'
        ctx.shadowColor = '#0ff'
        ctx.shadowBlur = 8
        ctx.fillRect(b.x - 2, b.y, 4, 12)
        ctx.shadowBlur = 0
        return b.y > -20
      })
      
      // Update enemies
      enemies = enemies.filter(e => {
        e.y += e.speed
        
        // Bullet collision
        bullets = bullets.filter(b => {
          const dx = b.x - e.x
          const dy = b.y - e.y
          if (Math.sqrt(dx * dx + dy * dy) < 20) {
            e.health -= b.damage
            createExplosion(b.x, b.y, '#ff0', 5)
            if (e.health <= 0) {
              gameScore += e.type === 'bomber' ? 30 : e.type === 'fighter' ? 20 : 10
              setScore(gameScore)
              onScore(gameScore)
              createExplosion(e.x, e.y, '#f40', 15)
              if (gameScore > currentLevel * 200) {
                currentLevel++
                setLevel(currentLevel)
              }
            }
            return false
          }
          return true
        })
        
        // Player collision
        const pdx = e.x - playerX
        const pdy = e.y - playerY
        if (Math.sqrt(pdx * pdx + pdy * pdy) < 25 && e.health > 0) {
          isGameOver = true
          setGameOver(true)
          onGameOver()
          createExplosion(playerX, playerY, '#f00', 30)
        }
        
        if (e.health > 0) drawEnemy(e)
        return e.y < canvas.height + 30 && e.health > 0
      })
      
      // Update particles
      particles = particles.filter(p => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.1
        p.life--
        ctx.globalAlpha = p.life / 30
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3 * (p.life / 30), 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
        return p.life > 0
      })
      
      // Draw player
      if (!isGameOver) drawSpaceship(playerX, playerY)
      
      // HUD
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 18px Arial'
      ctx.textAlign = 'left'
      ctx.fillText(`SCORE: ${gameScore}`, 10, 25)
      ctx.fillText(`LEVEL: ${currentLevel}`, 10, 50)
      
      animationId = requestAnimationFrame(gameLoop)
    }
    
    gameLoop()
    
    return () => {
      clearInterval(enemyInterval)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      cancelAnimationFrame(animationId)
    }
  }, [onScore, onGameOver])
  
  return (
    <div className="relative">
      <canvas ref={canvasRef} width={450} height={550} className="rounded-xl border-2 border-cyan-500/50 shadow-lg shadow-cyan-500/20" />
      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-red-500 mb-2">GAME OVER</h2>
            <p className="text-xl text-white mb-1">Score: {score}</p>
            <p className="text-lg text-cyan-400 mb-4">Level: {level}</p>
            <button onClick={() => window.location.reload()} className="px-6 py-2 bg-cyan-600 rounded-lg text-white font-bold hover:bg-cyan-500">
              🚀 PLAY AGAIN
            </button>
          </div>
        </div>
      )}
      <p className="text-center text-gray-400 text-sm mt-2">Arrow Keys/WASD to move • SPACE to shoot</p>
    </div>
  )
}

// ============ MATCH-3 PUZZLE GAME ============
function Match3Game({ onScore, onGameOver }: { onScore: (s: number) => void, onGameOver: () => void }) {
  const [grid, setGrid] = useState<number[][]>([])
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null)
  const [score, setScore] = useState(0)
  const [moves, setMoves] = useState(30)
  const [combo, setCombo] = useState(1)
  
  const gems = ['💎', '🔴', '🟢', '🔵', '🟡', '🟣', '🟠']
  
  useEffect(() => {
    const newGrid: number[][] = []
    for (let i = 0; i < 8; i++) {
      const row: number[] = []
      for (let j = 0; j < 8; j++) {
        row.push(Math.floor(Math.random() * 7))
      }
      newGrid.push(row)
    }
    setGrid(newGrid)
  }, [])
  
  const findMatches = (g: number[][]) => {
    const matches: Set<string> = new Set()
    
    // Horizontal
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 6; j++) {
        if (g[i][j] === g[i][j + 1] && g[i][j] === g[i][j + 2]) {
          matches.add(`${i},${j}`)
          matches.add(`${i},${j + 1}`)
          matches.add(`${i},${j + 2}`)
        }
      }
    }
    
    // Vertical
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 8; j++) {
        if (g[i][j] === g[i + 1][j] && g[i][j] === g[i + 2][j]) {
          matches.add(`${i},${j}`)
          matches.add(`${i + 1},${j}`)
          matches.add(`${i + 2},${j}`)
        }
      }
    }
    
    return matches
  }
  
  const handleClick = (row: number, col: number) => {
    if (moves <= 0) return
    
    if (!selected) {
      setSelected({ row, col })
    } else {
      const dr = Math.abs(selected.row - row)
      const dc = Math.abs(selected.col - col)
      
      if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
        const newGrid = grid.map(r => [...r])
        const temp = newGrid[row][col]
        newGrid[row][col] = newGrid[selected.row][selected.col]
        newGrid[selected.row][selected.col] = temp
        
        const matches = findMatches(newGrid)
        
        if (matches.size > 0) {
          // Clear matches
          matches.forEach(pos => {
            const [r, c] = pos.split(',').map(Number)
            newGrid[r][c] = Math.floor(Math.random() * 7)
          })
          
          const points = matches.size * 10 * combo
          const newScore = score + points
          setScore(newScore)
          onScore(newScore)
          setCombo(c => Math.min(c + 0.5, 5))
          setMoves(m => m - 1)
          setGrid(newGrid)
        } else {
          setCombo(1)
        }
      }
      setSelected(null)
    }
  }
  
  useEffect(() => {
    if (moves <= 0) onGameOver()
  }, [moves, onGameOver])
  
  return (
    <div className="p-4 bg-gradient-to-b from-purple-900 to-indigo-900 rounded-xl">
      <div className="flex justify-between mb-3 text-white">
        <span className="font-bold">💎 Score: {score}</span>
        <span className="font-bold">🔥 x{combo.toFixed(1)}</span>
        <span className="font-bold">⏱️ Moves: {moves}</span>
      </div>
      <div className="grid grid-cols-8 gap-1 p-2 bg-black/30 rounded-lg">
        {grid.map((row, r) =>
          row.map((gem, c) => (
            <button
              key={`${r}-${c}`}
              onClick={() => handleClick(r, c)}
              className={`w-10 h-10 text-2xl rounded-lg transition-all duration-150 ${
                selected?.row === r && selected?.col === c
                  ? 'ring-2 ring-yellow-400 scale-110 bg-yellow-400/30'
                  : 'hover:scale-105 hover:bg-white/10'
              }`}
            >
              {gems[gem]}
            </button>
          ))
        )}
      </div>
      <p className="text-center text-purple-300 text-sm mt-2">Click gems to swap adjacent pairs</p>
    </div>
  )
}

// ============ TOWER DEFENSE GAME ============
function TowerDefenseGame({ onScore, onGameOver }: { onScore: (s: number) => void, onGameOver: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [money, setMoney] = useState(150)
  const [lives, setLives] = useState(20)
  const [wave, setWave] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    interface Tower { x: number; y: number; cooldown: number; range: number; damage: number }
    interface Enemy { x: number; y: number; health: number; maxHealth: number; speed: number; pathIndex: number }
    
    const path = [
      { x: 0, y: 150 }, { x: 120, y: 150 }, { x: 120, y: 80 }, { x: 280, y: 80 },
      { x: 280, y: 220 }, { x: 180, y: 220 }, { x: 180, y: 300 }, { x: 350, y: 300 }, { x: 400, y: 300 }
    ]
    
    let towers: Tower[] = []
    let enemies: Enemy[] = []
    let playerMoney = 150
    let playerLives = 20
    let currentWave = 0
    let enemiesSpawned = 0
    let spawnCooldown = 0
    let isGameOver = false
    let frame = 0
    
    const spawnWave = () => {
      currentWave++
      setWave(currentWave)
      enemiesSpawned = 0
    }
    
    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      if (playerMoney >= 50) {
        // Check not on path
        let onPath = false
        for (const p of path) {
          if (Math.sqrt((x - p.x) ** 2 + (y - p.y) ** 2) < 35) onPath = true
        }
        // Check not on other tower
        for (const t of towers) {
          if (Math.sqrt((x - t.x) ** 2 + (y - t.y) ** 2) < 40) onPath = true
        }
        
        if (!onPath) {
          towers.push({ x, y, cooldown: 0, range: 80, damage: 20 })
          playerMoney -= 50
          setMoney(playerMoney)
        }
      }
    }
    
    canvas.addEventListener('click', handleClick)
    
    const gameLoop = () => {
      if (isGameOver) return
      frame++
      
      // Background
      ctx.fillStyle = '#1a2a1a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Grid
      ctx.strokeStyle = '#2a3a2a'
      for (let x = 0; x < canvas.width; x += 30) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke()
      }
      for (let y = 0; y < canvas.height; y += 30) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke()
      }
      
      // Path
      ctx.strokeStyle = '#665544'
      ctx.lineWidth = 30
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(path[0].x, path[0].y)
      for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y)
      ctx.stroke()
      
      // Spawn enemies
      if (enemiesSpawned < 5 + currentWave * 2) {
        spawnCooldown--
        if (spawnCooldown <= 0) {
          enemies.push({
            x: path[0].x, y: path[0].y,
            health: 30 + currentWave * 10,
            maxHealth: 30 + currentWave * 10,
            speed: 1 + currentWave * 0.1,
            pathIndex: 0
          })
          enemiesSpawned++
          spawnCooldown = 40
        }
      } else if (enemies.length === 0) {
        spawnWave()
      }
      
      // Update enemies
      enemies = enemies.filter(e => {
        const target = path[e.pathIndex + 1]
        if (target) {
          const dx = target.x - e.x
          const dy = target.y - e.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < e.speed) e.pathIndex++
          else {
            e.x += (dx / dist) * e.speed
            e.y += (dy / dist) * e.speed
          }
        } else {
          playerLives--
          setLives(playerLives)
          if (playerLives <= 0) {
            isGameOver = true
            setGameOver(true)
            onGameOver()
          }
          return false
        }
        
        // Draw enemy
        ctx.fillStyle = '#44aa44'
        ctx.beginPath()
        ctx.arc(e.x, e.y, 10, 0, Math.PI * 2)
        ctx.fill()
        
        // Health bar
        ctx.fillStyle = '#400'
        ctx.fillRect(e.x - 12, e.y - 18, 24, 4)
        ctx.fillStyle = '#0f0'
        ctx.fillRect(e.x - 12, e.y - 18, (e.health / e.maxHealth) * 24, 4)
        
        return e.health > 0
      })
      
      // Update towers
      for (const tower of towers) {
        // Find target
        let target: Enemy | null = null
        let closestDist = tower.range
        for (const e of enemies) {
          const dist = Math.sqrt((e.x - tower.x) ** 2 + (e.y - tower.y) ** 2)
          if (dist < closestDist) {
            closestDist = dist
            target = e
          }
        }
        
        // Draw tower
        ctx.fillStyle = '#4488ff'
        ctx.beginPath()
        ctx.arc(tower.x, tower.y, 15, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#88aaff'
        ctx.lineWidth = 2
        ctx.stroke()
        
        // Shoot
        tower.cooldown--
        if (tower.cooldown <= 0 && target) {
          tower.cooldown = 30
          target.health -= tower.damage
          
          if (target.health <= 0) {
            playerMoney += 10
            setMoney(playerMoney)
            onScore(currentWave * 100 + playerMoney)
          }
          
          // Laser line
          ctx.strokeStyle = '#ff0'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(tower.x, tower.y)
          ctx.lineTo(target.x, target.y)
          ctx.stroke()
        }
        
        // Range indicator
        if (frame % 60 < 30) {
          ctx.strokeStyle = '#4488ff33'
          ctx.beginPath()
          ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
      
      // HUD
      ctx.fillStyle = 'rgba(0,0,0,0.7)'
      ctx.fillRect(0, 0, canvas.width, 35)
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 14px Arial'
      ctx.textAlign = 'left'
      ctx.fillText(`💰 $${playerMoney}`, 10, 24)
      ctx.fillText(`❤️ ${playerLives}`, 100, 24)
      ctx.fillText(`🌊 Wave: ${currentWave}`, 170, 24)
      ctx.fillText(`🏗️ Tower: $50`, 290, 24)
      
      requestAnimationFrame(gameLoop)
    }
    
    spawnWave()
    gameLoop()
    
    return () => canvas.removeEventListener('click', handleClick)
  }, [onScore, onGameOver])
  
  return (
    <div className="relative">
      <canvas ref={canvasRef} width={400} height={350} className="rounded-xl border-2 border-green-500/50 shadow-lg shadow-green-500/20 cursor-crosshair" />
      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-red-500 mb-2">GAME OVER</h2>
            <p className="text-lg text-white mb-4">Wave Reached: {wave}</p>
            <button onClick={() => window.location.reload()} className="px-6 py-2 bg-green-600 rounded-lg text-white font-bold hover:bg-green-500">
              🔄 TRY AGAIN
            </button>
          </div>
        </div>
      )}
      <p className="text-center text-gray-400 text-sm mt-2">Click to place towers ($50 each)</p>
    </div>
  )
}

// ============ RACING GAME ============
function RacingGame({ onScore, onGameOver }: { onScore: (s: number) => void, onGameOver: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [lap, setLap] = useState(0)
  const [position, setPosition] = useState(1)
  const [finished, setFinished] = useState(false)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    interface Car { x: number; y: number; angle: number; speed: number; checkpoint: number; lap: number; isPlayer: boolean; color: string }
    
    const track = [
      { x: 200, y: 280 }, { x: 80, y: 240 }, { x: 50, y: 150 }, { x: 100, y: 60 },
      { x: 200, y: 40 }, { x: 320, y: 60 }, { x: 380, y: 150 }, { x: 350, y: 240 }
    ]
    
    const player: Car = { x: 200, y: 300, angle: -Math.PI/2, speed: 0, checkpoint: 0, lap: 0, isPlayer: true, color: '#ff4444' }
    const opponents: Car[] = [
      { x: 180, y: 320, angle: -Math.PI/2, speed: 0, checkpoint: 0, lap: 0, isPlayer: false, color: '#4444ff' },
      { x: 220, y: 320, angle: -Math.PI/2, speed: 0, checkpoint: 0, lap: 0, isPlayer: false, color: '#44ff44' }
    ]
    
    const keys = new Set<string>()
    let gameRunning = true
    let countdown = 3
    let raceStarted = false
    
    const countdownInterval = setInterval(() => {
      if (countdown > 0) countdown--
      else raceStarted = true
    }, 1000)
    
    const handleKeyDown = (e: KeyboardEvent) => keys.add(e.key.toLowerCase())
    const handleKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase())
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    const drawCar = (car: Car) => {
      ctx.save()
      ctx.translate(car.x, car.y)
      ctx.rotate(car.angle + Math.PI / 2)
      
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.beginPath()
      ctx.ellipse(2, 2, 12, 8, 0, 0, Math.PI * 2)
      ctx.fill()
      
      // Body
      ctx.fillStyle = car.color
      ctx.beginPath()
      ctx.moveTo(0, -14)
      ctx.lineTo(8, -6)
      ctx.lineTo(10, 10)
      ctx.lineTo(-10, 10)
      ctx.lineTo(-8, -6)
      ctx.closePath()
      ctx.fill()
      
      // Windshield
      ctx.fillStyle = '#224466'
      ctx.fillRect(-5, -8, 10, 6)
      
      ctx.restore()
    }
    
    const checkCheckpoint = (car: Car) => {
      const next = track[car.checkpoint % track.length]
      const dist = Math.sqrt((car.x - next.x) ** 2 + (car.y - next.y) ** 2)
      if (dist < 40) {
        car.checkpoint++
        if (car.checkpoint >= track.length) {
          car.checkpoint = 0
          car.lap++
          if (car.isPlayer) {
            setLap(car.lap)
            if (car.lap >= 3) {
              gameRunning = false
              setFinished(true)
              onScore(10000 - opponents.filter(o => o.lap >= 3).length * 1000)
            }
          }
        }
      }
    }
    
    const gameLoop = () => {
      if (!gameRunning) return
      
      // Background
      ctx.fillStyle = '#1a3a1a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Track
      ctx.strokeStyle = '#555'
      ctx.lineWidth = 50
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(track[0].x, track[0].y)
      for (const p of track) ctx.lineTo(p.x, p.y)
      ctx.lineTo(track[0].x, track[0].y)
      ctx.stroke()
      
      // Track edge
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.setLineDash([10, 10])
      ctx.stroke()
      ctx.setLineDash([])
      
      if (raceStarted) {
        // Player controls
        if (keys.has('arrowup') || keys.has('w')) player.speed = Math.min(player.speed + 0.15, 5)
        else if (keys.has('arrowdown') || keys.has('s')) player.speed = Math.max(player.speed - 0.2, -1)
        else player.speed *= 0.98
        
        if (keys.has('arrowleft') || keys.has('a')) player.angle -= 0.05
        if (keys.has('arrowright') || keys.has('d')) player.angle += 0.05
        
        player.x += Math.cos(player.angle) * player.speed
        player.y += Math.sin(player.angle) * player.speed
        player.x = Math.max(20, Math.min(canvas.width - 20, player.x))
        player.y = Math.max(20, Math.min(canvas.height - 20, player.y))
        checkCheckpoint(player)
        
        // AI
        for (const opp of opponents) {
          const target = track[opp.checkpoint % track.length]
          const targetAngle = Math.atan2(target.y - opp.y, target.x - opp.x)
          let diff = targetAngle - opp.angle
          while (diff > Math.PI) diff -= Math.PI * 2
          while (diff < -Math.PI) diff += Math.PI * 2
          opp.angle += diff * 0.08
          opp.speed = Math.min(opp.speed + 0.1, 3.5 + Math.random())
          opp.x += Math.cos(opp.angle) * opp.speed
          opp.y += Math.sin(opp.angle) * opp.speed
          checkCheckpoint(opp)
        }
        
        // Position calc
        const all = [player, ...opponents].sort((a, b) => (b.lap * 100 + b.checkpoint) - (a.lap * 100 + a.checkpoint))
        setPosition(all.indexOf(player) + 1)
      }
      
      // Draw cars
      for (const opp of opponents) drawCar(opp)
      drawCar(player)
      
      // HUD
      ctx.fillStyle = 'rgba(0,0,0,0.7)'
      ctx.fillRect(0, 0, canvas.width, 30)
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 14px Arial'
      ctx.textAlign = 'left'
      ctx.fillText(`🏁 Lap: ${player.lap + 1}/3`, 10, 20)
      ctx.fillText(`📍 Position: ${position}/3`, 130, 20)
      
      // Countdown
      if (!raceStarted) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = countdown > 0 ? '#f44' : '#4f4'
        ctx.font = 'bold 80px Arial'
        ctx.textAlign = 'center'
        ctx.fillText(countdown > 0 ? countdown.toString() : 'GO!', canvas.width / 2, canvas.height / 2 + 30)
      }
      
      requestAnimationFrame(gameLoop)
    }
    
    gameLoop()
    
    return () => {
      clearInterval(countdownInterval)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [onScore, onGameOver])
  
  return (
    <div className="relative">
      <canvas ref={canvasRef} width={430} height={350} className="rounded-xl border-2 border-yellow-500/50 shadow-lg shadow-yellow-500/20" />
      {finished && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-green-500 mb-2">🏁 RACE COMPLETE!</h2>
            <p className="text-xl text-white mb-4">Position: {position}/3</p>
            <button onClick={() => window.location.reload()} className="px-6 py-2 bg-yellow-600 rounded-lg text-white font-bold hover:bg-yellow-500">
              🏎️ RACE AGAIN
            </button>
          </div>
        </div>
      )}
      <p className="text-center text-gray-400 text-sm mt-2">Arrow Keys/WASD to drive • Complete 3 laps</p>
    </div>
  )
}

// Game Categories
const GAME_CATEGORIES = [
  {
    id: 'action',
    name: 'Action/Arcade',
    icon: '🎯',
    color: 'from-red-600 to-orange-500',
    description: 'Fast reflexes, retro-modern gameplay',
    games: [
      { id: 'space-shooter', name: 'Space Commander', difficulty: 3, icon: '🚀', playable: true },
      { id: 'brick-breaker', name: 'Brick Breaker', difficulty: 2, icon: '🧱', playable: false },
      { id: 'asteroid-dodge', name: 'Asteroid Dodge', difficulty: 4, icon: '☄️', playable: false },
      { id: 'ninja-jump', name: 'Ninja Jump', difficulty: 5, icon: '🥷', playable: false },
      { id: 'zombie-wave', name: 'Zombie Wave', difficulty: 6, icon: '🧟', playable: false },
    ]
  },
  {
    id: 'strategy',
    name: 'Strategy/Tactical',
    icon: '♟️',
    color: 'from-blue-600 to-indigo-500',
    description: 'Chess-like, tower defense, planning',
    games: [
      { id: 'tower-defense', name: 'Tower Command', difficulty: 4, icon: '🏰', playable: true },
      { id: 'chess-lite', name: 'Chess Lite', difficulty: 3, icon: '♔', playable: false },
      { id: 'hex-conquest', name: 'Hex Conquest', difficulty: 6, icon: '⬡', playable: false },
      { id: 'kingdom-builder', name: 'Kingdom Builder', difficulty: 5, icon: '👑', playable: false },
      { id: 'battle-tactics', name: 'Battle Tactics', difficulty: 7, icon: '⚔️', playable: false },
    ]
  },
  {
    id: 'puzzle',
    name: 'Puzzle/Brain',
    icon: '🧩',
    color: 'from-purple-600 to-pink-500',
    description: 'Logic, matching, escape rooms',
    games: [
      { id: 'match-3', name: 'Gem Crusher', difficulty: 2, icon: '💎', playable: true },
      { id: 'sudoku', name: 'Sudoku Master', difficulty: 4, icon: '9️⃣', playable: false },
      { id: 'word-search', name: 'Word Search', difficulty: 3, icon: '🔤', playable: false },
      { id: 'escape-room', name: 'Escape Room', difficulty: 6, icon: '🚪', playable: false },
      { id: 'code-breaker', name: 'Code Breaker', difficulty: 7, icon: '🔐', playable: false },
    ]
  },
  {
    id: 'racing',
    name: 'Racing/Sports',
    icon: '🏁',
    color: 'from-green-600 to-emerald-500',
    description: 'Speed, competition, athletics',
    games: [
      { id: 'speed-racer', name: 'Speed Rush', difficulty: 3, icon: '🏎️', playable: true },
      { id: 'bike-sprint', name: 'Bike Sprint', difficulty: 2, icon: '🚴', playable: false },
      { id: 'soccer-kick', name: 'Soccer Kick', difficulty: 4, icon: '⚽', playable: false },
      { id: 'basketball-shoot', name: 'Basketball', difficulty: 3, icon: '🏀', playable: false },
      { id: 'golf-master', name: 'Golf Master', difficulty: 5, icon: '⛳', playable: false },
    ]
  },
]

// External Gaming Resources
const EXTERNAL_RESOURCES = [
  {
    category: 'Gaming Challenges',
    links: [
      { name: 'LostGamer.io', url: 'https://lostgamer.io', description: 'GeoGuessr for video games', icon: '🗺️' },
      { name: 'Neal.fun', url: 'https://neal.fun', description: 'Educational games & experiments', icon: '🎮' },
    ]
  },
  {
    category: 'Classic Games Portal',
    links: [
      { name: 'Emupedia.net', url: 'https://emupedia.net', description: 'Windows 95/98 classics', icon: '💾' },
      { name: 'PlayRetroGames', url: 'https://playretrogames.online', description: 'Console classics', icon: '🕹️' },
    ]
  },
  {
    category: 'Browser MMORPG',
    links: [
      { name: 'Hordes.io', url: 'https://hordes.io', description: 'Free 3D browser MMORPG', icon: '⚔️' },
    ]
  },
  {
    category: 'Gaming Resources',
    links: [
      { name: 'Modrinth', url: 'https://modrinth.com', description: 'Minecraft mods', icon: '🔧' },
      { name: 'GrabCraft', url: 'https://grabcraft.com', description: 'Minecraft blueprints', icon: '🏗️' },
      { name: 'CheapShark', url: 'https://cheapshark.com', description: 'PC game deals', icon: '💰' },
    ]
  },
  {
    category: 'Game Dev Assets',
    links: [
      { name: 'Kenney.nl', url: 'https://kenney.nl', description: '40K+ free game assets', icon: '🎨' },
      { name: 'Poly Haven', url: 'https://polyhaven.com', description: 'Free 3D models', icon: '🖼️' },
      { name: 'Freesound', url: 'https://freesound.org', description: '500K+ sound effects', icon: '🔊' },
    ]
  },
]

// Main Hub Component
export default function GamesHub() {
  const [currentGame, setCurrentGame] = useState<{ categoryId: string; gameId: string } | null>(null)
  const [score, setScore] = useState(0)
  const [activeTab, setActiveTab] = useState<'games' | 'resources'>('games')
  
  const handleGameOver = () => {
    // Game over handling
  }
  
  const renderGame = () => {
    if (!currentGame) return null
    
    const gameComponents: Record<string, JSX.Element> = {
      'action-space-shooter': <SpaceShooterGame onScore={setScore} onGameOver={handleGameOver} />,
      'strategy-tower-defense': <TowerDefenseGame onScore={setScore} onGameOver={handleGameOver} />,
      'puzzle-match-3': <Match3Game onScore={setScore} onGameOver={handleGameOver} />,
      'racing-speed-racer': <RacingGame onScore={setScore} onGameOver={handleGameOver} />,
    }
    
    const key = `${currentGame.categoryId}-${currentGame.gameId}`
    return gameComponents[key] || (
      <div className="text-center py-20">
        <p className="text-6xl mb-4">🎮</p>
        <h3 className="text-2xl font-bold text-white mb-2">Coming Soon!</h3>
        <p className="text-gray-400">This game is under development</p>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-3xl">🎮</span>
              <div>
                <h1 className="text-xl font-bold text-white">CR Games Hub</h1>
                <p className="text-xs text-gray-400">100+ Games • Play & Create</p>
              </div>
            </Link>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('games')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'games' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                🎯 Games
              </button>
              <button
                onClick={() => setActiveTab('resources')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'resources' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                🔗 Resources
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'games' ? (
          <>
            {/* Game Display Area */}
            {currentGame && (
              <div className="mb-8 bg-gray-800/50 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Now Playing</h2>
                    <p className="text-gray-400">Score: {score}</p>
                  </div>
                  <button
                    onClick={() => setCurrentGame(null)}
                    className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-all"
                  >
                    ✕ Close Game
                  </button>
                </div>
                <div className="flex justify-center">
                  {renderGame()}
                </div>
              </div>
            )}
            
            {/* Game Categories */}
            <div className="space-y-8">
              {GAME_CATEGORIES.map((category) => (
                <div key={category.id} className="bg-gray-800/30 rounded-2xl p-6">
                  <div className={`flex items-center gap-3 mb-4 bg-gradient-to-r ${category.color} bg-clip-text`}>
                    <span className="text-4xl">{category.icon}</span>
                    <div>
                      <h2 className="text-2xl font-bold text-transparent bg-gradient-to-r from-white to-gray-300 bg-clip-text">
                        {category.name}
                      </h2>
                      <p className="text-gray-400 text-sm">{category.description}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {category.games.map((game) => (
                      <button
                        key={game.id}
                        onClick={() => game.playable && setCurrentGame({ categoryId: category.id, gameId: game.id })}
                        className={`p-4 rounded-xl transition-all ${
                          game.playable
                            ? `bg-gradient-to-br ${category.color} hover:scale-105 hover:shadow-lg cursor-pointer`
                            : 'bg-gray-700/50 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <span className="text-4xl block mb-2">{game.icon}</span>
                        <h3 className="font-bold text-white text-sm">{game.name}</h3>
                        <div className="flex items-center justify-center gap-1 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className={`text-xs ${i < game.difficulty ? 'text-yellow-400' : 'text-gray-600'}`}>★</span>
                          ))}
                        </div>
                        {!game.playable && (
                          <span className="text-xs text-gray-400 mt-1 block">Coming Soon</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* External Resources */
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">🔗 Gaming Resources</h2>
              <p className="text-gray-400">Curated links to gaming sites, assets, and tools</p>
            </div>
            
            {EXTERNAL_RESOURCES.map((section) => (
              <div key={section.category} className="bg-gray-800/30 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">{section.category}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {section.links.map((link) => (
                    <a
                      key={link.name}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-all group"
                    >
                      <span className="text-3xl">{link.icon}</span>
                      <div>
                        <h4 className="font-bold text-white group-hover:text-purple-400 transition-colors">
                          {link.name} ↗
                        </h4>
                        <p className="text-sm text-gray-400">{link.description}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-black/50 border-t border-gray-700 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400">
            🎮 CR AudioViz AI Games Hub • Play, Create, Share
          </p>
          <div className="flex justify-center gap-4 mt-2 text-sm">
            <Link href="/" className="text-gray-500 hover:text-white">Home</Link>
            <Link href="/apps" className="text-gray-500 hover:text-white">Apps</Link>
            <Link href="/pricing" className="text-gray-500 hover:text-white">Pricing</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
