'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// =============================================================================
// CR AUDIOVIZ AI - PROFESSIONAL GAMES HUB v3.0
// 15+ Playable Games with Real Graphics
// =============================================================================

// ============ SPACE SHOOTER ============
function SpaceShooterGame({ onScore, onGameOver }: { onScore: (s: number) => void, onGameOver: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [level, setLevel] = useState(1)
  
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    let playerX = canvas.width / 2; const playerY = canvas.height - 60
    let bullets: {x:number,y:number}[] = [], enemies: {x:number,y:number,speed:number,health:number,type:string}[] = []
    let particles: {x:number,y:number,vx:number,vy:number,life:number,color:string}[] = []
    let gameScore = 0, currentLevel = 1, isGameOver = false, lastShot = 0, frame = 0
    const keys = new Set<string>()
    
    const createExplosion = (x:number,y:number,color:string,count:number) => {
      for(let i=0;i<count;i++){const angle=(Math.PI*2*i)/count;const speed=2+Math.random()*3;particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:30,color})}
    }
    const spawnEnemy = () => {
      if(isGameOver)return;const types=['scout','fighter','bomber'];const type=types[Math.floor(Math.random()*Math.min(types.length,currentLevel))]
      const configs:{[k:string]:{health:number,speed:number}}={scout:{health:1,speed:3+currentLevel*0.2},fighter:{health:2,speed:2+currentLevel*0.15},bomber:{health:4,speed:1+currentLevel*0.1}}
      enemies.push({x:Math.random()*(canvas.width-40)+20,y:-30,speed:configs[type].speed,health:configs[type].health,type})
    }
    const enemyInterval = setInterval(spawnEnemy,1200-Math.min(currentLevel*50,600))
    const handleKeyDown = (e:KeyboardEvent) => {keys.add(e.key.toLowerCase());if([' ','arrowleft','arrowright'].includes(e.key.toLowerCase()))e.preventDefault()}
    const handleKeyUp = (e:KeyboardEvent) => keys.delete(e.key.toLowerCase())
    window.addEventListener('keydown',handleKeyDown);window.addEventListener('keyup',handleKeyUp)
    
    const gameLoop = () => {
      if(isGameOver)return;frame++
      ctx.fillStyle='#0a0a1a';ctx.fillRect(0,0,canvas.width,canvas.height)
      ctx.fillStyle='#fff';for(let i=0;i<80;i++){const starX=(i*73+frame*0.5)%canvas.width;const starY=(i*37+frame*(0.2+(i%3)*0.1))%canvas.height;ctx.globalAlpha=0.3+(i%5)*0.15;ctx.fillRect(starX,starY,1+(i%2),1+(i%2))};ctx.globalAlpha=1
      if(keys.has('arrowleft')||keys.has('a'))playerX=Math.max(20,playerX-6)
      if(keys.has('arrowright')||keys.has('d'))playerX=Math.min(canvas.width-20,playerX+6)
      if(keys.has(' ')&&Date.now()-lastShot>150){lastShot=Date.now();bullets.push({x:playerX,y:playerY-20})}
      bullets=bullets.filter(b=>{b.y-=10;ctx.fillStyle='#0ff';ctx.shadowColor='#0ff';ctx.shadowBlur=8;ctx.fillRect(b.x-2,b.y,4,12);ctx.shadowBlur=0;return b.y>-20})
      enemies=enemies.filter(e=>{
        e.y+=e.speed
        bullets=bullets.filter(b=>{if(Math.sqrt((b.x-e.x)**2+(b.y-e.y)**2)<20){e.health--;createExplosion(b.x,b.y,'#ff0',5);if(e.health<=0){gameScore+=e.type==='bomber'?30:e.type==='fighter'?20:10;setScore(gameScore);onScore(gameScore);createExplosion(e.x,e.y,'#f40',15);if(gameScore>currentLevel*200){currentLevel++;setLevel(currentLevel)}};return false};return true})
        if(Math.sqrt((e.x-playerX)**2+(e.y-playerY)**2)<25&&e.health>0){isGameOver=true;setGameOver(true);onGameOver();createExplosion(playerX,playerY,'#f00',30)}
        if(e.health>0){const colors:{[k:string]:string}={scout:'#ff4444',fighter:'#aa44aa',bomber:'#4444aa'};ctx.fillStyle=colors[e.type];ctx.beginPath();ctx.arc(e.x,e.y,e.type==='bomber'?20:12,0,Math.PI*2);ctx.fill()}
        return e.y<canvas.height+30&&e.health>0
      })
      particles=particles.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.1;p.life--;ctx.globalAlpha=p.life/30;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,3*(p.life/30),0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;return p.life>0})
      if(!isGameOver){ctx.fillStyle='#4a4a8e';ctx.beginPath();ctx.moveTo(playerX,playerY-20);ctx.lineTo(playerX+18,playerY+15);ctx.lineTo(playerX,playerY+8);ctx.lineTo(playerX-18,playerY+15);ctx.closePath();ctx.fill();ctx.fillStyle='#00ffff';ctx.beginPath();ctx.ellipse(playerX,playerY-3,5,8,0,0,Math.PI*2);ctx.fill()}
      ctx.fillStyle='#fff';ctx.font='bold 18px Arial';ctx.textAlign='left';ctx.fillText(`SCORE: ${gameScore}`,10,25);ctx.fillText(`LEVEL: ${currentLevel}`,10,50)
      requestAnimationFrame(gameLoop)
    }
    gameLoop()
    return()=>{clearInterval(enemyInterval);window.removeEventListener('keydown',handleKeyDown);window.removeEventListener('keyup',handleKeyUp)}
  },[onScore,onGameOver])
  
  return(<div className="relative"><canvas ref={canvasRef} width={420} height={500} className="rounded-xl border-2 border-cyan-500/50"/>{gameOver&&<div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl"><div className="text-center"><h2 className="text-3xl font-bold text-red-500 mb-2">GAME OVER</h2><p className="text-xl text-white mb-4">Score: {score} | Level: {level}</p><button onClick={()=>window.location.reload()} className="px-6 py-2 bg-cyan-600 rounded-lg text-white font-bold">🚀 PLAY AGAIN</button></div></div>}<p className="text-center text-gray-400 text-sm mt-2">Arrow Keys/AD + SPACE</p></div>)
}

// ============ SNAKE ============
function SnakeGame({ onScore, onGameOver }: { onScore: (s: number) => void, onGameOver: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const gridSize = 20, tileCount = canvas.width / gridSize
    let snake = [{x:10,y:10}], food = {x:15,y:15}, dx = 0, dy = 0, gameScore = 0, isGameOver = false, speed = 100
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if(e.key==='ArrowUp'&&dy!==1){dx=0;dy=-1}else if(e.key==='ArrowDown'&&dy!==-1){dx=0;dy=1}
      else if(e.key==='ArrowLeft'&&dx!==1){dx=-1;dy=0}else if(e.key==='ArrowRight'&&dx!==-1){dx=1;dy=0}
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault()
    }
    window.addEventListener('keydown', handleKeyDown)
    
    const gameLoop = () => {
      if(isGameOver)return
      if(dx!==0||dy!==0){
        const head = {x:snake[0].x+dx,y:snake[0].y+dy}
        if(head.x<0||head.x>=tileCount||head.y<0||head.y>=tileCount){isGameOver=true;setGameOver(true);onGameOver();return}
        for(const seg of snake)if(head.x===seg.x&&head.y===seg.y){isGameOver=true;setGameOver(true);onGameOver();return}
        snake.unshift(head)
        if(head.x===food.x&&head.y===food.y){gameScore+=10;setScore(gameScore);onScore(gameScore);food={x:Math.floor(Math.random()*tileCount),y:Math.floor(Math.random()*tileCount)};speed=Math.max(50,speed-2)}else snake.pop()
      }
      ctx.fillStyle='#1a2a1a';ctx.fillRect(0,0,canvas.width,canvas.height)
      snake.forEach((seg,i)=>{ctx.fillStyle=i===0?'#44ff44':'#22aa22';ctx.beginPath();ctx.roundRect(seg.x*gridSize+1,seg.y*gridSize+1,gridSize-2,gridSize-2,4);ctx.fill()})
      ctx.fillStyle='#ff4444';ctx.beginPath();ctx.arc(food.x*gridSize+gridSize/2,food.y*gridSize+gridSize/2,gridSize/2-2,0,Math.PI*2);ctx.fill()
      ctx.fillStyle='#fff';ctx.font='bold 16px Arial';ctx.fillText(`Score: ${gameScore}`,10,25)
      setTimeout(()=>requestAnimationFrame(gameLoop),speed)
    }
    gameLoop()
    return()=>window.removeEventListener('keydown',handleKeyDown)
  },[onScore,onGameOver])
  
  return(<div className="relative"><canvas ref={canvasRef} width={400} height={400} className="rounded-xl border-2 border-green-500/50"/>{gameOver&&<div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl"><div className="text-center"><h2 className="text-3xl font-bold text-red-500 mb-2">GAME OVER</h2><p className="text-xl text-white mb-4">Score: {score}</p><button onClick={()=>window.location.reload()} className="px-6 py-2 bg-green-600 rounded-lg text-white font-bold">🐍 PLAY AGAIN</button></div></div>}<p className="text-center text-gray-400 text-sm mt-2">Arrow Keys to move</p></div>)
}

// ============ FLAPPY BIRD ============
function FlappyBirdGame({ onScore, onGameOver }: { onScore: (s: number) => void, onGameOver: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    let birdY = canvas.height/2, birdVelocity = 0; const birdX = 80, birdSize = 20, gravity = 0.5, jumpStrength = -8
    let pipes: {x:number,gapY:number,passed:boolean}[] = []; const pipeWidth = 50, pipeGap = 150
    let gameScore = 0, isGameOver = false, hasStarted = false, frame = 0
    
    const handleInput = () => {if(!hasStarted)hasStarted=true;if(!isGameOver)birdVelocity=jumpStrength}
    const handleKeyDown = (e:KeyboardEvent) => {if(e.key===' '||e.key==='ArrowUp'){e.preventDefault();handleInput()}}
    window.addEventListener('keydown',handleKeyDown);canvas.addEventListener('click',handleInput)
    
    const gameLoop = () => {
      if(isGameOver)return;frame++
      const skyGradient = ctx.createLinearGradient(0,0,0,canvas.height);skyGradient.addColorStop(0,'#87CEEB');skyGradient.addColorStop(1,'#E0F6FF');ctx.fillStyle=skyGradient;ctx.fillRect(0,0,canvas.width,canvas.height)
      ctx.fillStyle='#8B4513';ctx.fillRect(0,canvas.height-50,canvas.width,50);ctx.fillStyle='#228B22';ctx.fillRect(0,canvas.height-50,canvas.width,15)
      if(hasStarted){
        birdVelocity+=gravity;birdY+=birdVelocity
        if(frame%100===0)pipes.push({x:canvas.width,gapY:100+Math.random()*(canvas.height-250),passed:false})
        pipes=pipes.filter(pipe=>{pipe.x-=3;if(!pipe.passed&&pipe.x+pipeWidth<birdX){pipe.passed=true;gameScore++;setScore(gameScore);onScore(gameScore)};if(birdX+birdSize>pipe.x&&birdX-birdSize<pipe.x+pipeWidth){if(birdY-birdSize<pipe.gapY||birdY+birdSize>pipe.gapY+pipeGap){isGameOver=true;setGameOver(true);onGameOver()}};return pipe.x>-pipeWidth})
        if(birdY+birdSize>canvas.height-50||birdY-birdSize<0){isGameOver=true;setGameOver(true);onGameOver()}
      }
      for(const pipe of pipes){ctx.fillStyle='#228B22';ctx.fillRect(pipe.x,0,pipeWidth,pipe.gapY);ctx.fillRect(pipe.x,pipe.gapY+pipeGap,pipeWidth,canvas.height)}
      ctx.fillStyle='#FFD700';ctx.beginPath();ctx.ellipse(birdX,birdY,birdSize,birdSize*0.8,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(birdX+8,birdY-5,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#000';ctx.beginPath();ctx.arc(birdX+10,birdY-5,3,0,Math.PI*2);ctx.fill()
      ctx.fillStyle='#fff';ctx.font='bold 36px Arial';ctx.textAlign='center';ctx.fillText(gameScore.toString(),canvas.width/2,50)
      if(!hasStarted){ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#fff';ctx.font='bold 24px Arial';ctx.fillText('Click or SPACE',canvas.width/2,canvas.height/2)}
      requestAnimationFrame(gameLoop)
    }
    gameLoop()
    return()=>{window.removeEventListener('keydown',handleKeyDown);canvas.removeEventListener('click',handleInput)}
  },[onScore,onGameOver])
  
  return(<div className="relative"><canvas ref={canvasRef} width={350} height={500} className="rounded-xl border-2 border-yellow-500/50"/>{gameOver&&<div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl"><div className="text-center"><h2 className="text-3xl font-bold text-red-500 mb-2">GAME OVER</h2><p className="text-xl text-white mb-4">Score: {score}</p><button onClick={()=>window.location.reload()} className="px-6 py-2 bg-yellow-600 rounded-lg text-white font-bold">🐦 PLAY AGAIN</button></div></div>}<p className="text-center text-gray-400 text-sm mt-2">Click or SPACE to flap</p></div>)
}

// ============ PONG ============
function PongGame({ onScore, onGameOver }: { onScore: (s: number) => void, onGameOver: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [playerScore, setPlayerScore] = useState(0)
  const [aiScore, setAiScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const paddleW = 10, paddleH = 80; let playerY = canvas.height/2-paddleH/2, aiY = canvas.height/2-paddleH/2
    let ballX = canvas.width/2, ballY = canvas.height/2, ballVX = 5, ballVY = 3; const ballSize = 10
    let pScore = 0, aScore = 0, isGameOver = false
    const keys = new Set<string>()
    
    const handleKeyDown = (e:KeyboardEvent) => {keys.add(e.key);if(['ArrowUp','ArrowDown'].includes(e.key))e.preventDefault()}
    const handleKeyUp = (e:KeyboardEvent) => keys.delete(e.key)
    window.addEventListener('keydown',handleKeyDown);window.addEventListener('keyup',handleKeyUp)
    
    const gameLoop = () => {
      if(isGameOver)return
      ctx.fillStyle='#1a1a2e';ctx.fillRect(0,0,canvas.width,canvas.height)
      if(keys.has('ArrowUp'))playerY=Math.max(0,playerY-7);if(keys.has('ArrowDown'))playerY=Math.min(canvas.height-paddleH,playerY+7)
      const aiCenter=aiY+paddleH/2;if(aiCenter<ballY-10)aiY+=4;else if(aiCenter>ballY+10)aiY-=4
      ballX+=ballVX;ballY+=ballVY;if(ballY<=0||ballY>=canvas.height-ballSize)ballVY=-ballVY
      if(ballX<=30&&ballY+ballSize>=playerY&&ballY<=playerY+paddleH&&ballVX<0){ballVX=-ballVX*1.05}
      if(ballX>=canvas.width-40&&ballY+ballSize>=aiY&&ballY<=aiY+paddleH&&ballVX>0){ballVX=-ballVX*1.05}
      if(ballX<0){aScore++;setAiScore(aScore);ballX=canvas.width/2;ballY=canvas.height/2;ballVX=5}
      if(ballX>canvas.width){pScore++;setPlayerScore(pScore);onScore(pScore*100);ballX=canvas.width/2;ballY=canvas.height/2;ballVX=-5}
      if(pScore>=5||aScore>=5){isGameOver=true;setGameOver(true);onGameOver()}
      ctx.fillStyle='#4488ff';ctx.fillRect(20,playerY,paddleW,paddleH)
      ctx.fillStyle='#ff4444';ctx.fillRect(canvas.width-30,aiY,paddleW,paddleH)
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ballX,ballY,ballSize,0,Math.PI*2);ctx.fill()
      ctx.font='bold 48px Arial';ctx.textAlign='center';ctx.fillText(pScore.toString(),canvas.width/4,60);ctx.fillText(aScore.toString(),(canvas.width*3)/4,60)
      requestAnimationFrame(gameLoop)
    }
    gameLoop()
    return()=>{window.removeEventListener('keydown',handleKeyDown);window.removeEventListener('keyup',handleKeyUp)}
  },[onScore,onGameOver])
  
  return(<div className="relative"><canvas ref={canvasRef} width={500} height={350} className="rounded-xl border-2 border-blue-500/50"/>{gameOver&&<div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl"><div className="text-center"><h2 className={`text-3xl font-bold mb-2 ${playerScore>=5?'text-green-500':'text-red-500'}`}>{playerScore>=5?'🏆 YOU WIN!':'💔 YOU LOSE'}</h2><p className="text-xl text-white mb-4">{playerScore} - {aiScore}</p><button onClick={()=>window.location.reload()} className="px-6 py-2 bg-blue-600 rounded-lg text-white font-bold">🏓 PLAY AGAIN</button></div></div>}<p className="text-center text-gray-400 text-sm mt-2">Arrow Keys to move • First to 5</p></div>)
}

// ============ BRICK BREAKER ============
function BrickBreakerGame({ onScore, onGameOver }: { onScore: (s: number) => void, onGameOver: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [gameOver, setGameOver] = useState(false)
  
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const paddleW = 80, paddleH = 12; let paddleX = (canvas.width-paddleW)/2
    let ballX = canvas.width/2, ballY = canvas.height-50, ballVX = 4, ballVY = -4; const ballR = 8
    let playerLives = 3, gameScore = 0, isGameOver = false
    const bricks: {x:number,y:number,status:number,color:string}[][] = []
    const colors = ['#ff4444','#ff8844','#ffff44','#44ff44','#4444ff']
    for(let r=0;r<5;r++){bricks[r]=[];for(let c=0;c<8;c++){bricks[r][c]={x:c*49+15,y:r*22+50,status:1,color:colors[r]}}}
    const keys = new Set<string>()
    
    const handleKeyDown = (e:KeyboardEvent) => {keys.add(e.key.toLowerCase());if(['arrowleft','arrowright'].includes(e.key.toLowerCase()))e.preventDefault()}
    const handleKeyUp = (e:KeyboardEvent) => keys.delete(e.key.toLowerCase())
    window.addEventListener('keydown',handleKeyDown);window.addEventListener('keyup',handleKeyUp)
    
    const gameLoop = () => {
      if(isGameOver)return
      ctx.fillStyle='#1a1a2e';ctx.fillRect(0,0,canvas.width,canvas.height)
      if(keys.has('arrowleft')||keys.has('a'))paddleX=Math.max(0,paddleX-7)
      if(keys.has('arrowright')||keys.has('d'))paddleX=Math.min(canvas.width-paddleW,paddleX+7)
      ctx.fillStyle='#0088ff';ctx.fillRect(paddleX,canvas.height-30,paddleW,paddleH)
      ballX+=ballVX;ballY+=ballVY
      if(ballX<ballR||ballX>canvas.width-ballR)ballVX=-ballVX
      if(ballY<ballR)ballVY=-ballVY
      if(ballY>canvas.height-ballR){playerLives--;setLives(playerLives);if(playerLives<=0){isGameOver=true;setGameOver(true);onGameOver()}else{ballX=canvas.width/2;ballY=canvas.height-50;ballVY=-4}}
      if(ballY+ballR>canvas.height-30&&ballX>paddleX&&ballX<paddleX+paddleW&&ballVY>0)ballVY=-ballVY
      let bricksRemaining = 0
      for(let r=0;r<5;r++){for(let c=0;c<8;c++){const b=bricks[r][c];if(b.status===1){bricksRemaining++;if(ballX>b.x&&ballX<b.x+45&&ballY>b.y&&ballY<b.y+18){ballVY=-ballVY;b.status=0;gameScore+=10*(5-r);setScore(gameScore);onScore(gameScore)}}}}
      if(bricksRemaining===0){isGameOver=true;setGameOver(true);onGameOver()}
      for(let r=0;r<5;r++){for(let c=0;c<8;c++){const b=bricks[r][c];if(b.status===1){ctx.fillStyle=b.color;ctx.fillRect(b.x,b.y,45,18)}}}
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ballX,ballY,ballR,0,Math.PI*2);ctx.fill()
      ctx.font='bold 16px Arial';ctx.textAlign='left';ctx.fillText(`Score: ${gameScore}`,10,25);ctx.fillText(`Lives: ${'❤️'.repeat(playerLives)}`,10,45)
      requestAnimationFrame(gameLoop)
    }
    gameLoop()
    return()=>{window.removeEventListener('keydown',handleKeyDown);window.removeEventListener('keyup',handleKeyUp)}
  },[onScore,onGameOver])
  
  return(<div className="relative"><canvas ref={canvasRef} width={400} height={450} className="rounded-xl border-2 border-orange-500/50"/>{gameOver&&<div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl"><div className="text-center"><h2 className="text-3xl font-bold text-yellow-500 mb-2">{lives>0?'🎉 YOU WIN!':'💥 GAME OVER'}</h2><p className="text-xl text-white mb-4">Score: {score}</p><button onClick={()=>window.location.reload()} className="px-6 py-2 bg-orange-600 rounded-lg text-white font-bold">🔄 PLAY AGAIN</button></div></div>}<p className="text-center text-gray-400 text-sm mt-2">Arrow Keys/AD to move</p></div>)
}

// ============ WHACK A MOLE ============
function WhackAMoleGame({ onScore, onGameOver }: { onScore: (s: number) => void, onGameOver: () => void }) {
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [moles, setMoles] = useState<boolean[]>(Array(9).fill(false))
  const [gameOver, setGameOver] = useState(false)
  
  useEffect(() => {
    if(timeLeft<=0){setGameOver(true);onGameOver();return}
    const timer = setInterval(()=>setTimeLeft(t=>t-1),1000)
    return()=>clearInterval(timer)
  },[timeLeft,onGameOver])
  
  useEffect(() => {
    if(gameOver)return
    const moleInterval = setInterval(()=>{
      const newMoles = Array(9).fill(false)
      const activeMoles = Math.min(1+Math.floor((30-timeLeft)/10),3)
      for(let i=0;i<activeMoles;i++)newMoles[Math.floor(Math.random()*9)]=true
      setMoles(newMoles)
    },800)
    return()=>clearInterval(moleInterval)
  },[gameOver,timeLeft])
  
  const whack = (index:number) => {
    if(moles[index]){
      const newScore = score+10
      setScore(newScore);onScore(newScore)
      const newMoles = [...moles];newMoles[index]=false;setMoles(newMoles)
    }
  }
  
  return(
    <div className="p-4 bg-gradient-to-b from-amber-800 to-amber-900 rounded-xl">
      <div className="flex justify-between mb-3 text-white"><span className="font-bold text-xl">🔨 {score}</span><span className="font-bold text-xl">⏱️ {timeLeft}s</span></div>
      <div className="grid grid-cols-3 gap-3 p-4 bg-green-800 rounded-xl">{moles.map((hasMole,i)=>(<button key={i} onClick={()=>whack(i)} className={`w-20 h-20 rounded-full transition-all ${hasMole?'bg-amber-600 scale-110':'bg-amber-900'}`}><span className="text-4xl">{hasMole?'🐹':'🕳️'}</span></button>))}</div>
      {gameOver&&<div className="mt-4 text-center"><p className="text-2xl text-yellow-400 font-bold">⏰ Time's Up!</p><p className="text-white text-xl">Score: {score}</p><button onClick={()=>window.location.reload()} className="mt-2 px-4 py-2 bg-amber-600 rounded-lg text-white font-bold">Play Again</button></div>}
    </div>
  )
}

// ============ MEMORY MATCH ============
function MemoryGame({ onScore, onGameOver }: { onScore: (s: number) => void, onGameOver: () => void }) {
  const [cards, setCards] = useState<{id:number,emoji:string,flipped:boolean,matched:boolean}[]>([])
  const [flippedCards, setFlippedCards] = useState<number[]>([])
  const [moves, setMoves] = useState(0)
  const [matches, setMatches] = useState(0)
  const [gameWon, setGameWon] = useState(false)
  
  useEffect(() => {
    const emojis = ['🚀','🎮','🎯','🏆','⭐','💎','🔥','🎪']
    const shuffled = [...emojis,...emojis].sort(()=>Math.random()-0.5).map((emoji,i)=>({id:i,emoji,flipped:false,matched:false}))
    setCards(shuffled)
  },[])
  
  const handleCardClick = (id:number) => {
    if(flippedCards.length>=2)return
    const card = cards.find(c=>c.id===id)
    if(!card||card.flipped||card.matched)return
    const newCards = cards.map(c=>c.id===id?{...c,flipped:true}:c)
    setCards(newCards)
    const newFlipped = [...flippedCards,id]
    setFlippedCards(newFlipped)
    if(newFlipped.length===2){
      setMoves(m=>m+1)
      const [first,second] = newFlipped.map(fid=>newCards.find(c=>c.id===fid)!)
      if(first.emoji===second.emoji){
        setTimeout(()=>{
          setCards(prev=>prev.map(c=>c.id===first.id||c.id===second.id?{...c,matched:true}:c))
          const newMatches = matches+1;setMatches(newMatches);onScore(newMatches*100)
          if(newMatches===8){setGameWon(true);onGameOver()}
          setFlippedCards([])
        },500)
      }else{
        setTimeout(()=>{setCards(prev=>prev.map(c=>c.id===first.id||c.id===second.id?{...c,flipped:false}:c));setFlippedCards([])},1000)
      }
    }
  }
  
  return(
    <div className="p-4 bg-gradient-to-b from-indigo-900 to-purple-900 rounded-xl">
      <div className="flex justify-between mb-3 text-white"><span className="font-bold">🎯 Moves: {moves}</span><span className="font-bold">✨ {matches}/8</span></div>
      <div className="grid grid-cols-4 gap-2">{cards.map(card=>(<button key={card.id} onClick={()=>handleCardClick(card.id)} className={`w-16 h-16 text-3xl rounded-lg transition-all ${card.flipped||card.matched?'bg-white':'bg-indigo-600 hover:bg-indigo-500'} ${card.matched?'opacity-50':''}`}>{card.flipped||card.matched?card.emoji:'❓'}</button>))}</div>
      {gameWon&&<div className="mt-4 text-center"><p className="text-2xl text-green-400 font-bold">🎉 You Won!</p><button onClick={()=>window.location.reload()} className="mt-2 px-4 py-2 bg-purple-600 rounded-lg text-white font-bold">Play Again</button></div>}
    </div>
  )
}

// ============ MATCH 3 ============
function Match3Game({ onScore, onGameOver }: { onScore: (s: number) => void, onGameOver: () => void }) {
  const [grid, setGrid] = useState<number[][]>([])
  const [selected, setSelected] = useState<{row:number,col:number}|null>(null)
  const [score, setScore] = useState(0)
  const [moves, setMoves] = useState(30)
  const gems = ['💎','🔴','🟢','🔵','🟡','🟣','🟠']
  
  useEffect(() => {
    const newGrid: number[][] = []
    for(let i=0;i<8;i++){const row:number[]=[];for(let j=0;j<8;j++)row.push(Math.floor(Math.random()*7));newGrid.push(row)}
    setGrid(newGrid)
  },[])
  
  const findMatches = (g:number[][]) => {
    const matches = new Set<string>()
    for(let i=0;i<8;i++){for(let j=0;j<6;j++){if(g[i][j]===g[i][j+1]&&g[i][j]===g[i][j+2]){matches.add(`${i},${j}`);matches.add(`${i},${j+1}`);matches.add(`${i},${j+2}`)}}}
    for(let i=0;i<6;i++){for(let j=0;j<8;j++){if(g[i][j]===g[i+1][j]&&g[i][j]===g[i+2][j]){matches.add(`${i},${j}`);matches.add(`${i+1},${j}`);matches.add(`${i+2},${j}`)}}}
    return matches
  }
  
  const handleClick = (row:number,col:number) => {
    if(moves<=0)return
    if(!selected){setSelected({row,col})}
    else{
      const dr = Math.abs(selected.row-row), dc = Math.abs(selected.col-col)
      if((dr===1&&dc===0)||(dr===0&&dc===1)){
        const newGrid = grid.map(r=>[...r])
        const temp = newGrid[row][col];newGrid[row][col]=newGrid[selected.row][selected.col];newGrid[selected.row][selected.col]=temp
        const matches = findMatches(newGrid)
        if(matches.size>0){
          matches.forEach(pos=>{const[r,c]=pos.split(',').map(Number);newGrid[r][c]=Math.floor(Math.random()*7)})
          const points = matches.size*10;const newScore=score+points;setScore(newScore);onScore(newScore)
          setMoves(m=>m-1);setGrid(newGrid)
        }
      }
      setSelected(null)
    }
  }
  
  useEffect(()=>{if(moves<=0)onGameOver()},[moves,onGameOver])
  
  return(
    <div className="p-4 bg-gradient-to-b from-purple-900 to-indigo-900 rounded-xl">
      <div className="flex justify-between mb-3 text-white"><span className="font-bold">💎 {score}</span><span className="font-bold">⏱️ {moves}</span></div>
      <div className="grid grid-cols-8 gap-1 p-2 bg-black/30 rounded-lg">{grid.map((row,r)=>row.map((gem,c)=>(<button key={`${r}-${c}`} onClick={()=>handleClick(r,c)} className={`w-9 h-9 text-xl rounded-lg transition-all ${selected?.row===r&&selected?.col===c?'ring-2 ring-yellow-400 scale-110':'hover:scale-105'}`}>{gems[gem]}</button>)))}</div>
    </div>
  )
}

// ============ TOWER DEFENSE ============
function TowerDefenseGame({ onScore, onGameOver }: { onScore: (s: number) => void, onGameOver: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [money, setMoney] = useState(150)
  const [lives, setLives] = useState(20)
  const [wave, setWave] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const path = [{x:0,y:150},{x:120,y:150},{x:120,y:80},{x:280,y:80},{x:280,y:220},{x:180,y:220},{x:180,y:300},{x:350,y:300},{x:400,y:300}]
    let towers: {x:number,y:number,cooldown:number}[] = []
    let enemies: {x:number,y:number,health:number,maxHealth:number,speed:number,pathIndex:number}[] = []
    let playerMoney = 150, playerLives = 20, currentWave = 0, enemiesSpawned = 0, spawnCooldown = 0, isGameOver = false
    
    const handleClick = (e:MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX-rect.left, y = e.clientY-rect.top
      if(playerMoney>=50){
        let valid = true
        for(const p of path)if(Math.sqrt((x-p.x)**2+(y-p.y)**2)<35)valid=false
        for(const t of towers)if(Math.sqrt((x-t.x)**2+(y-t.y)**2)<40)valid=false
        if(valid){towers.push({x,y,cooldown:0});playerMoney-=50;setMoney(playerMoney)}
      }
    }
    canvas.addEventListener('click',handleClick)
    const spawnWave = () => {currentWave++;setWave(currentWave);enemiesSpawned=0}
    
    const gameLoop = () => {
      if(isGameOver)return
      ctx.fillStyle='#1a2a1a';ctx.fillRect(0,0,canvas.width,canvas.height)
      ctx.strokeStyle='#665544';ctx.lineWidth=30;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);for(const p of path)ctx.lineTo(p.x,p.y);ctx.stroke()
      if(enemiesSpawned<5+currentWave*2){spawnCooldown--;if(spawnCooldown<=0){enemies.push({x:path[0].x,y:path[0].y,health:30+currentWave*10,maxHealth:30+currentWave*10,speed:1+currentWave*0.1,pathIndex:0});enemiesSpawned++;spawnCooldown=40}}else if(enemies.length===0)spawnWave()
      enemies=enemies.filter(e=>{const target=path[e.pathIndex+1];if(target){const dx=target.x-e.x,dy=target.y-e.y,dist=Math.sqrt(dx*dx+dy*dy);if(dist<e.speed)e.pathIndex++;else{e.x+=(dx/dist)*e.speed;e.y+=(dy/dist)*e.speed}}else{playerLives--;setLives(playerLives);if(playerLives<=0){isGameOver=true;setGameOver(true);onGameOver()};return false};ctx.fillStyle='#44aa44';ctx.beginPath();ctx.arc(e.x,e.y,10,0,Math.PI*2);ctx.fill();ctx.fillStyle='#400';ctx.fillRect(e.x-12,e.y-18,24,4);ctx.fillStyle='#0f0';ctx.fillRect(e.x-12,e.y-18,(e.health/e.maxHealth)*24,4);return e.health>0})
      for(const tower of towers){let target:typeof enemies[0]|null=null,closestDist=80;for(const e of enemies){const dist=Math.sqrt((e.x-tower.x)**2+(e.y-tower.y)**2);if(dist<closestDist){closestDist=dist;target=e}};ctx.fillStyle='#4488ff';ctx.beginPath();ctx.arc(tower.x,tower.y,15,0,Math.PI*2);ctx.fill();tower.cooldown--;if(tower.cooldown<=0&&target){tower.cooldown=30;target.health-=20;if(target.health<=0){playerMoney+=10;setMoney(playerMoney);onScore(currentWave*100)};ctx.strokeStyle='#ff0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(tower.x,tower.y);ctx.lineTo(target.x,target.y);ctx.stroke()}}
      ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,0,canvas.width,35);ctx.fillStyle='#fff';ctx.font='bold 14px Arial';ctx.textAlign='left';ctx.fillText(`💰 $${playerMoney}`,10,24);ctx.fillText(`❤️ ${playerLives}`,100,24);ctx.fillText(`Wave: ${currentWave}`,200,24)
      requestAnimationFrame(gameLoop)
    }
    spawnWave();gameLoop()
    return()=>canvas.removeEventListener('click',handleClick)
  },[onScore,onGameOver])
  
  return(<div className="relative"><canvas ref={canvasRef} width={400} height={350} className="rounded-xl border-2 border-green-500/50 cursor-crosshair"/>{gameOver&&<div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl"><div className="text-center"><h2 className="text-3xl font-bold text-red-500 mb-2">GAME OVER</h2><p className="text-lg text-white mb-4">Wave: {wave}</p><button onClick={()=>window.location.reload()} className="px-6 py-2 bg-green-600 rounded-lg text-white font-bold">🔄 TRY AGAIN</button></div></div>}<p className="text-center text-gray-400 text-sm mt-2">Click to place towers ($50)</p></div>)
}

// ============ RACING ============
function RacingGame({ onScore, onGameOver }: { onScore: (s: number) => void, onGameOver: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [lap, setLap] = useState(0)
  const [position, setPosition] = useState(1)
  const [finished, setFinished] = useState(false)
  
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const track = [{x:200,y:280},{x:80,y:240},{x:50,y:150},{x:100,y:60},{x:200,y:40},{x:320,y:60},{x:380,y:150},{x:350,y:240}]
    const player = {x:200,y:300,angle:-Math.PI/2,speed:0,checkpoint:0,lap:0}
    const opponents = [{x:180,y:320,angle:-Math.PI/2,speed:0,checkpoint:0,lap:0,color:'#4444ff'},{x:220,y:320,angle:-Math.PI/2,speed:0,checkpoint:0,lap:0,color:'#44ff44'}]
    const keys = new Set<string>(); let gameRunning = true, countdown = 3, raceStarted = false
    const countdownInterval = setInterval(()=>{if(countdown>0)countdown--;else raceStarted=true},1000)
    const handleKeyDown = (e:KeyboardEvent) => keys.add(e.key.toLowerCase())
    const handleKeyUp = (e:KeyboardEvent) => keys.delete(e.key.toLowerCase())
    window.addEventListener('keydown',handleKeyDown);window.addEventListener('keyup',handleKeyUp)
    const checkCheckpoint = (car:typeof player,isPlayer:boolean) => {const next=track[car.checkpoint%track.length];if(Math.sqrt((car.x-next.x)**2+(car.y-next.y)**2)<40){car.checkpoint++;if(car.checkpoint>=track.length){car.checkpoint=0;car.lap++;if(isPlayer){setLap(car.lap);if(car.lap>=3){gameRunning=false;setFinished(true);onScore(10000)}}}}}
    
    const gameLoop = () => {
      if(!gameRunning)return
      ctx.fillStyle='#1a3a1a';ctx.fillRect(0,0,canvas.width,canvas.height)
      ctx.strokeStyle='#555';ctx.lineWidth=50;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(track[0].x,track[0].y);for(const p of track)ctx.lineTo(p.x,p.y);ctx.lineTo(track[0].x,track[0].y);ctx.stroke()
      if(raceStarted){
        if(keys.has('arrowup')||keys.has('w'))player.speed=Math.min(player.speed+0.15,5);else if(keys.has('arrowdown')||keys.has('s'))player.speed=Math.max(player.speed-0.2,-1);else player.speed*=0.98
        if(keys.has('arrowleft')||keys.has('a'))player.angle-=0.05;if(keys.has('arrowright')||keys.has('d'))player.angle+=0.05
        player.x+=Math.cos(player.angle)*player.speed;player.y+=Math.sin(player.angle)*player.speed
        player.x=Math.max(20,Math.min(canvas.width-20,player.x));player.y=Math.max(20,Math.min(canvas.height-20,player.y))
        checkCheckpoint(player,true)
        for(const opp of opponents){const target=track[opp.checkpoint%track.length];const targetAngle=Math.atan2(target.y-opp.y,target.x-opp.x);let diff=targetAngle-opp.angle;while(diff>Math.PI)diff-=Math.PI*2;while(diff<-Math.PI)diff+=Math.PI*2;opp.angle+=diff*0.08;opp.speed=Math.min(opp.speed+0.1,3.5);opp.x+=Math.cos(opp.angle)*opp.speed;opp.y+=Math.sin(opp.angle)*opp.speed;checkCheckpoint(opp,false)}
        const all = [player,...opponents].sort((a,b)=>(b.lap*100+b.checkpoint)-(a.lap*100+a.checkpoint));setPosition(all.indexOf(player)+1)
      }
      const drawCar = (car:typeof player,color:string) => {ctx.save();ctx.translate(car.x,car.y);ctx.rotate(car.angle+Math.PI/2);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,-14);ctx.lineTo(8,10);ctx.lineTo(-8,10);ctx.closePath();ctx.fill();ctx.restore()}
      for(const opp of opponents)drawCar(opp,opp.color);drawCar(player,'#ff4444')
      ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,0,canvas.width,30);ctx.fillStyle='#fff';ctx.font='bold 14px Arial';ctx.textAlign='left';ctx.fillText(`🏁 Lap: ${player.lap+1}/3`,10,20);ctx.fillText(`📍 P${position}/3`,130,20)
      if(!raceStarted){ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle=countdown>0?'#f44':'#4f4';ctx.font='bold 60px Arial';ctx.textAlign='center';ctx.fillText(countdown>0?countdown.toString():'GO!',canvas.width/2,canvas.height/2)}
      requestAnimationFrame(gameLoop)
    }
    gameLoop()
    return()=>{clearInterval(countdownInterval);window.removeEventListener('keydown',handleKeyDown);window.removeEventListener('keyup',handleKeyUp)}
  },[onScore,onGameOver])
  
  return(<div className="relative"><canvas ref={canvasRef} width={430} height={350} className="rounded-xl border-2 border-yellow-500/50"/>{finished&&<div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl"><div className="text-center"><h2 className="text-3xl font-bold text-green-500 mb-2">🏁 FINISHED!</h2><p className="text-xl text-white mb-4">Position: {position}/3</p><button onClick={()=>window.location.reload()} className="px-6 py-2 bg-yellow-600 rounded-lg text-white font-bold">🏎️ RACE AGAIN</button></div></div>}<p className="text-center text-gray-400 text-sm mt-2">Arrow Keys/WASD to drive</p></div>)
}

// ============ TETRIS ============
function TetrisGame({ onScore, onGameOver }: { onScore: (s: number) => void, onGameOver: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [lines, setLines] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const COLS = 10, ROWS = 20, BLOCK = 25
    const SHAPES = [[[1,1,1,1]],[[1,1],[1,1]],[[1,1,1],[0,1,0]],[[1,1,1],[1,0,0]],[[1,1,1],[0,0,1]],[[1,1,0],[0,1,1]],[[0,1,1],[1,1,0]]]
    const COLORS = ['#00ffff','#ffff00','#aa00ff','#ff8800','#0000ff','#00ff00','#ff0000']
    let board: number[][] = Array(ROWS).fill(null).map(()=>Array(COLS).fill(0))
    let current: {shape:number[][],x:number,y:number,color:number}|null = null
    let gameScore = 0, totalLines = 0, isGameOver = false, dropCounter = 0, lastTime = 0
    
    const spawnPiece = () => {const idx=Math.floor(Math.random()*SHAPES.length);current={shape:SHAPES[idx].map(r=>[...r]),x:Math.floor(COLS/2)-1,y:0,color:idx};if(collides()){isGameOver=true;setGameOver(true);onGameOver()}}
    const collides = () => {if(!current)return false;for(let y=0;y<current.shape.length;y++){for(let x=0;x<current.shape[y].length;x++){if(current.shape[y][x]&&(current.y+y>=ROWS||current.x+x<0||current.x+x>=COLS||board[current.y+y]?.[current.x+x]))return true}};return false}
    const merge = () => {if(!current)return;for(let y=0;y<current.shape.length;y++){for(let x=0;x<current.shape[y].length;x++){if(current.shape[y][x])board[current.y+y][current.x+x]=current.color+1}}}
    const clearLines = () => {let cleared=0;for(let y=ROWS-1;y>=0;y--){if(board[y].every(c=>c>0)){board.splice(y,1);board.unshift(Array(COLS).fill(0));cleared++;y++}};if(cleared>0){totalLines+=cleared;setLines(totalLines);gameScore+=cleared*100*cleared;setScore(gameScore);onScore(gameScore)}}
    const rotate = () => {if(!current)return;const rotated=current.shape[0].map((_,i)=>current!.shape.map(row=>row[i]).reverse());const oldShape=current.shape;current.shape=rotated;if(collides())current.shape=oldShape}
    const handleKeyDown = (e:KeyboardEvent) => {if(!current||isGameOver)return;if(e.key==='ArrowLeft'){current.x--;if(collides())current.x++}else if(e.key==='ArrowRight'){current.x++;if(collides())current.x--}else if(e.key==='ArrowDown'){current.y++;if(collides()){current.y--;merge();clearLines();spawnPiece()}}else if(e.key==='ArrowUp')rotate();if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault()}
    window.addEventListener('keydown',handleKeyDown)
    
    const gameLoop = (time:number) => {
      if(isGameOver)return
      const delta=time-lastTime;lastTime=time;dropCounter+=delta
      if(dropCounter>500){dropCounter=0;if(current){current.y++;if(collides()){current.y--;merge();clearLines();spawnPiece()}}}
      ctx.fillStyle='#1a1a2e';ctx.fillRect(0,0,canvas.width,canvas.height)
      for(let y=0;y<ROWS;y++){for(let x=0;x<COLS;x++){if(board[y][x]){ctx.fillStyle=COLORS[board[y][x]-1];ctx.fillRect(x*BLOCK+1,y*BLOCK+1,BLOCK-2,BLOCK-2)}else{ctx.strokeStyle='#333';ctx.strokeRect(x*BLOCK,y*BLOCK,BLOCK,BLOCK)}}}
      if(current){ctx.fillStyle=COLORS[current.color];for(let y=0;y<current.shape.length;y++){for(let x=0;x<current.shape[y].length;x++){if(current.shape[y][x])ctx.fillRect((current.x+x)*BLOCK+1,(current.y+y)*BLOCK+1,BLOCK-2,BLOCK-2)}}}
      ctx.fillStyle='#fff';ctx.font='bold 14px Arial';ctx.textAlign='left';ctx.fillText(`Score: ${gameScore}`,COLS*BLOCK+10,30);ctx.fillText(`Lines: ${totalLines}`,COLS*BLOCK+10,55)
      requestAnimationFrame(gameLoop)
    }
    spawnPiece();requestAnimationFrame(gameLoop)
    return()=>window.removeEventListener('keydown',handleKeyDown)
  },[onScore,onGameOver])
  
  return(<div className="relative"><canvas ref={canvasRef} width={350} height={500} className="rounded-xl border-2 border-purple-500/50"/>{gameOver&&<div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl"><div className="text-center"><h2 className="text-3xl font-bold text-red-500 mb-2">GAME OVER</h2><p className="text-xl text-white mb-2">Score: {score}</p><p className="text-lg text-gray-300 mb-4">Lines: {lines}</p><button onClick={()=>window.location.reload()} className="px-6 py-2 bg-purple-600 rounded-lg text-white font-bold">🧱 PLAY AGAIN</button></div></div>}<p className="text-center text-gray-400 text-sm mt-2">←→ Move • ↑ Rotate • ↓ Drop</p></div>)
}

// ============ DINO RUN ============
function DinoRunGame({ onScore, onGameOver }: { onScore: (s: number) => void, onGameOver: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    let dinoY = canvas.height-80, dinoVY = 0; const dinoX = 60, groundY = canvas.height-40
    let obstacles: {x:number,width:number,height:number}[] = []
    let gameScore = 0, isGameOver = false, frame = 0, speed = 6
    
    const jump = () => {if(dinoY>=groundY-40)dinoVY=-15}
    const handleKeyDown = (e:KeyboardEvent) => {if(e.key===' '||e.key==='ArrowUp'){e.preventDefault();jump()}}
    window.addEventListener('keydown',handleKeyDown);canvas.addEventListener('click',jump)
    
    const gameLoop = () => {
      if(isGameOver)return;frame++
      ctx.fillStyle='#f5f5f5';ctx.fillRect(0,0,canvas.width,canvas.height)
      ctx.fillStyle='#555';ctx.fillRect(0,groundY,canvas.width,2)
      dinoVY+=0.8;dinoY+=dinoVY;if(dinoY>groundY-40){dinoY=groundY-40;dinoVY=0}
      if(frame%80===0)obstacles.push({x:canvas.width,width:20,height:30+Math.random()*20})
      obstacles=obstacles.filter(o=>{o.x-=speed;if(dinoX+30>o.x&&dinoX<o.x+o.width&&dinoY+40>groundY-o.height){isGameOver=true;setGameOver(true);onGameOver();return false};ctx.fillStyle='#228B22';ctx.fillRect(o.x,groundY-o.height,o.width,o.height);return o.x>-50})
      ctx.fillStyle='#535353';ctx.fillRect(dinoX,dinoY,30,40);ctx.fillRect(dinoX+20,dinoY-15,15,20)
      gameScore++;speed=6+Math.floor(gameScore/500);if(frame%10===0){setScore(Math.floor(gameScore/10));onScore(Math.floor(gameScore/10))}
      ctx.fillStyle='#333';ctx.font='bold 20px Arial';ctx.textAlign='right';ctx.fillText(`${Math.floor(gameScore/10)}`,canvas.width-20,30)
      requestAnimationFrame(gameLoop)
    }
    gameLoop()
    return()=>{window.removeEventListener('keydown',handleKeyDown);canvas.removeEventListener('click',jump)}
  },[onScore,onGameOver])
  
  return(<div className="relative"><canvas ref={canvasRef} width={600} height={200} className="rounded-xl border-2 border-gray-500/50"/>{gameOver&&<div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl"><div className="text-center"><h2 className="text-3xl font-bold text-red-500 mb-2">GAME OVER</h2><p className="text-xl text-white mb-4">Score: {score}</p><button onClick={()=>window.location.reload()} className="px-6 py-2 bg-gray-600 rounded-lg text-white font-bold">🦖 PLAY AGAIN</button></div></div>}<p className="text-center text-gray-400 text-sm mt-2">SPACE/Click to jump</p></div>)
}

// ============ ASTEROID DODGE ============
function AsteroidDodgeGame({ onScore, onGameOver }: { onScore: (s: number) => void, onGameOver: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    let playerX = canvas.width/2, playerY = canvas.height-50
    let asteroids: {x:number,y:number,size:number,speed:number}[] = []
    let gameScore = 0, isGameOver = false, frame = 0
    const keys = new Set<string>()
    
    const handleKeyDown = (e:KeyboardEvent) => {keys.add(e.key.toLowerCase());if(['arrowleft','arrowright','arrowup','arrowdown'].includes(e.key.toLowerCase()))e.preventDefault()}
    const handleKeyUp = (e:KeyboardEvent) => keys.delete(e.key.toLowerCase())
    window.addEventListener('keydown',handleKeyDown);window.addEventListener('keyup',handleKeyUp)
    
    const gameLoop = () => {
      if(isGameOver)return;frame++
      ctx.fillStyle='#0a0a1a';ctx.fillRect(0,0,canvas.width,canvas.height)
      if(keys.has('arrowleft')||keys.has('a'))playerX=Math.max(15,playerX-5)
      if(keys.has('arrowright')||keys.has('d'))playerX=Math.min(canvas.width-15,playerX+5)
      if(keys.has('arrowup')||keys.has('w'))playerY=Math.max(15,playerY-5)
      if(keys.has('arrowdown')||keys.has('s'))playerY=Math.min(canvas.height-15,playerY+5)
      if(frame%30===0)asteroids.push({x:Math.random()*canvas.width,y:-30,size:15+Math.random()*25,speed:2+Math.random()*3+gameScore*0.001})
      asteroids=asteroids.filter(a=>{a.y+=a.speed;const dist=Math.sqrt((a.x-playerX)**2+(a.y-playerY)**2);if(dist<a.size+12){isGameOver=true;setGameOver(true);onGameOver();return false};ctx.fillStyle='#666';ctx.beginPath();ctx.arc(a.x,a.y,a.size,0,Math.PI*2);ctx.fill();return a.y<canvas.height+50})
      gameScore++;if(frame%60===0){setScore(Math.floor(gameScore/10));onScore(Math.floor(gameScore/10))}
      ctx.fillStyle='#00aaff';ctx.beginPath();ctx.moveTo(playerX,playerY-15);ctx.lineTo(playerX+12,playerY+12);ctx.lineTo(playerX,playerY+6);ctx.lineTo(playerX-12,playerY+12);ctx.closePath();ctx.fill()
      ctx.fillStyle='#fff';ctx.font='bold 18px Arial';ctx.textAlign='left';ctx.fillText(`Score: ${Math.floor(gameScore/10)}`,10,30)
      requestAnimationFrame(gameLoop)
    }
    gameLoop()
    return()=>{window.removeEventListener('keydown',handleKeyDown);window.removeEventListener('keyup',handleKeyUp)}
  },[onScore,onGameOver])
  
  return(<div className="relative"><canvas ref={canvasRef} width={400} height={500} className="rounded-xl border-2 border-blue-500/50"/>{gameOver&&<div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl"><div className="text-center"><h2 className="text-3xl font-bold text-red-500 mb-2">GAME OVER</h2><p className="text-xl text-white mb-4">Score: {score}</p><button onClick={()=>window.location.reload()} className="px-6 py-2 bg-blue-600 rounded-lg text-white font-bold">☄️ PLAY AGAIN</button></div></div>}<p className="text-center text-gray-400 text-sm mt-2">Arrow Keys/WASD to dodge</p></div>)
}

// ============ CONNECT FOUR ============
function ConnectFourGame({ onScore, onGameOver }: { onScore: (s: number) => void, onGameOver: () => void }) {
  const [board, setBoard] = useState<number[][]>(Array(6).fill(null).map(()=>Array(7).fill(0)))
  const [currentPlayer, setCurrentPlayer] = useState(1)
  const [winner, setWinner] = useState<number|null>(null)
  
  const checkWinner = (b:number[][],player:number) => {
    for(let r=0;r<6;r++){for(let c=0;c<4;c++){if(b[r][c]===player&&b[r][c+1]===player&&b[r][c+2]===player&&b[r][c+3]===player)return true}}
    for(let r=0;r<3;r++){for(let c=0;c<7;c++){if(b[r][c]===player&&b[r+1][c]===player&&b[r+2][c]===player&&b[r+3][c]===player)return true}}
    for(let r=0;r<3;r++){for(let c=0;c<4;c++){if(b[r][c]===player&&b[r+1][c+1]===player&&b[r+2][c+2]===player&&b[r+3][c+3]===player)return true}}
    for(let r=3;r<6;r++){for(let c=0;c<4;c++){if(b[r][c]===player&&b[r-1][c+1]===player&&b[r-2][c+2]===player&&b[r-3][c+3]===player)return true}}
    return false
  }
  
  const dropPiece = (col:number) => {
    if(winner)return
    const newBoard = board.map(r=>[...r])
    for(let row=5;row>=0;row--){
      if(newBoard[row][col]===0){
        newBoard[row][col]=currentPlayer
        setBoard(newBoard)
        if(checkWinner(newBoard,currentPlayer)){setWinner(currentPlayer);onScore(1000);onGameOver()}
        else setCurrentPlayer(currentPlayer===1?2:1)
        break
      }
    }
  }
  
  return(
    <div className="p-4 bg-gradient-to-b from-blue-900 to-blue-950 rounded-xl">
      <div className="mb-3 text-center text-white font-bold">{winner?`🏆 Player ${winner} Wins!`:`Player ${currentPlayer}'s Turn`}</div>
      <div className="bg-blue-700 p-2 rounded-xl">
        <div className="grid grid-cols-7 gap-1">{board.map((row,r)=>row.map((cell,c)=>(<button key={`${r}-${c}`} onClick={()=>dropPiece(c)} className="w-12 h-12 rounded-full bg-blue-900 flex items-center justify-center">{cell>0&&<div className={`w-10 h-10 rounded-full ${cell===1?'bg-red-500':'bg-yellow-400'}`}/>}</button>)))}</div>
      </div>
      {winner&&<button onClick={()=>window.location.reload()} className="mt-4 w-full px-4 py-2 bg-blue-600 rounded-lg text-white font-bold">Play Again</button>}
    </div>
  )
}

// Game categories
const GAME_CATEGORIES = [
  {id:'action',name:'Action/Arcade',icon:'🎯',color:'from-red-600 to-orange-500',games:[
    {id:'space-shooter',name:'Space Commander',icon:'🚀'},
    {id:'brick-breaker',name:'Brick Breaker',icon:'🧱'},
    {id:'flappy-bird',name:'Flappy Bird',icon:'🐦'},
    {id:'whack-a-mole',name:'Whack-a-Mole',icon:'🔨'},
    {id:'asteroid-dodge',name:'Asteroid Dodge',icon:'☄️'},
    {id:'dino-run',name:'Dino Run',icon:'🦖'},
  ]},
  {id:'classic',name:'Classic Games',icon:'🕹️',color:'from-purple-600 to-pink-500',games:[
    {id:'snake',name:'Snake',icon:'🐍'},
    {id:'pong',name:'Pong',icon:'🏓'},
    {id:'tetris',name:'Tetris',icon:'🧱'},
    {id:'memory',name:'Memory Match',icon:'🧠'},
    {id:'connect-four',name:'Connect Four',icon:'🔴'},
  ]},
  {id:'puzzle',name:'Puzzle/Brain',icon:'🧩',color:'from-blue-600 to-cyan-500',games:[
    {id:'match-3',name:'Gem Crusher',icon:'💎'},
  ]},
  {id:'strategy',name:'Strategy',icon:'♟️',color:'from-green-600 to-emerald-500',games:[
    {id:'tower-defense',name:'Tower Command',icon:'🏰'},
  ]},
  {id:'racing',name:'Racing/Sports',icon:'🏁',color:'from-yellow-600 to-amber-500',games:[
    {id:'racing',name:'Speed Rush',icon:'🏎️'},
  ]},
]

// Main Hub
export default function GamesHub() {
  const [currentGame, setCurrentGame] = useState<{categoryId:string,gameId:string}|null>(null)
  const [score, setScore] = useState(0)
  const handleGameOver = () => {}
  
  const renderGame = () => {
    if(!currentGame)return null
    const key = `${currentGame.categoryId}-${currentGame.gameId}`
    const games: Record<string,JSX.Element> = {
      'action-space-shooter':<SpaceShooterGame onScore={setScore} onGameOver={handleGameOver}/>,
      'action-brick-breaker':<BrickBreakerGame onScore={setScore} onGameOver={handleGameOver}/>,
      'action-flappy-bird':<FlappyBirdGame onScore={setScore} onGameOver={handleGameOver}/>,
      'action-whack-a-mole':<WhackAMoleGame onScore={setScore} onGameOver={handleGameOver}/>,
      'action-asteroid-dodge':<AsteroidDodgeGame onScore={setScore} onGameOver={handleGameOver}/>,
      'action-dino-run':<DinoRunGame onScore={setScore} onGameOver={handleGameOver}/>,
      'classic-snake':<SnakeGame onScore={setScore} onGameOver={handleGameOver}/>,
      'classic-pong':<PongGame onScore={setScore} onGameOver={handleGameOver}/>,
      'classic-tetris':<TetrisGame onScore={setScore} onGameOver={handleGameOver}/>,
      'classic-memory':<MemoryGame onScore={setScore} onGameOver={handleGameOver}/>,
      'classic-connect-four':<ConnectFourGame onScore={setScore} onGameOver={handleGameOver}/>,
      'puzzle-match-3':<Match3Game onScore={setScore} onGameOver={handleGameOver}/>,
      'strategy-tower-defense':<TowerDefenseGame onScore={setScore} onGameOver={handleGameOver}/>,
      'racing-racing':<RacingGame onScore={setScore} onGameOver={handleGameOver}/>,
    }
    return games[key]||<div className="text-center py-20"><p className="text-4xl">🎮</p><p className="text-white">Coming Soon</p></div>
  }
  
  return(
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <header className="bg-black/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2"><span className="text-3xl">🎮</span><div><h1 className="text-xl font-bold text-white">CR Games Hub</h1><p className="text-xs text-gray-400">15 Playable Games</p></div></Link>
          {currentGame&&<span className="text-white font-bold">Score: {score}</span>}
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        {currentGame&&<div className="mb-8 bg-gray-800/50 rounded-2xl p-6"><div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-white">Now Playing</h2><button onClick={()=>{setCurrentGame(null);setScore(0)}} className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30">✕ Close</button></div><div className="flex justify-center">{renderGame()}</div></div>}
        <div className="space-y-6">{GAME_CATEGORIES.map(category=>(<div key={category.id} className="bg-gray-800/30 rounded-2xl p-6"><div className="flex items-center gap-3 mb-4"><span className="text-3xl">{category.icon}</span><h2 className="text-xl font-bold text-white">{category.name}</h2></div><div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">{category.games.map(game=>(<button key={game.id} onClick={()=>setCurrentGame({categoryId:category.id,gameId:game.id})} className={`p-4 rounded-xl transition-all bg-gradient-to-br ${category.color} hover:scale-105 cursor-pointer`}><span className="text-4xl block mb-2">{game.icon}</span><h3 className="font-bold text-white text-sm">{game.name}</h3><span className="text-xs text-green-300">▶ Play</span></button>))}</div></div>))}</div>
      </main>
      <footer className="bg-black/50 border-t border-gray-700 py-6 mt-12"><div className="max-w-7xl mx-auto px-4 text-center"><p className="text-gray-400">🎮 CR AudioViz AI Games Hub • 15 Playable Games</p></div></footer>
    </div>
  )
}
