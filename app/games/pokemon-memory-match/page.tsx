'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, RotateCcw, Trophy, Star, Timer, Zap } from 'lucide-react'

// =============================================================================
// POKÉMON CARD MEMORY MATCH
// CR AudioViz AI Games - Uses FREE Pokemon TCG API
// Features: Real card images, difficulty levels, scoring, achievements
// Can be embedded in: games.craudiovizai.com AND Javari Cards app
// =============================================================================

interface PokemonCard {
  id: string
  name: string
  images: {
    small: string
    large: string
  }
  set: {
    name: string
  }
  rarity?: string
}

interface GameCard {
  id: string
  uniqueId: string
  name: string
  image: string
  isFlipped: boolean
  isMatched: boolean
}

type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme'

const DIFFICULTY_CONFIG = {
  easy: { pairs: 6, timeBonus: 100, name: 'Easy', gridCols: 4 },
  medium: { pairs: 8, timeBonus: 80, name: 'Medium', gridCols: 4 },
  hard: { pairs: 12, timeBonus: 60, name: 'Hard', gridCols: 6 },
  extreme: { pairs: 18, timeBonus: 40, name: 'Extreme', gridCols: 6 }
}

const ACHIEVEMENTS = [
  { id: 'first_match', name: 'First Match', description: 'Find your first pair', icon: '🎯' },
  { id: 'speed_demon', name: 'Speed Demon', description: 'Complete in under 30 seconds', icon: '⚡' },
  { id: 'perfect_memory', name: 'Perfect Memory', description: 'Win with no mistakes', icon: '🧠' },
  { id: 'collector', name: 'Collector', description: 'Play 10 games', icon: '📦' },
  { id: 'master', name: 'Pokémon Master', description: 'Complete Extreme mode', icon: '👑' }
]

export default function PokemonMemoryMatch() {
  const [gameState, setGameState] = useState<'menu' | 'loading' | 'playing' | 'won'>('menu')
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [cards, setCards] = useState<GameCard[]>([])
  const [flippedCards, setFlippedCards] = useState<string[]>([])
  const [matchedPairs, setMatchedPairs] = useState<number>(0)
  const [moves, setMoves] = useState<number>(0)
  const [score, setScore] = useState<number>(0)
  const [timer, setTimer] = useState<number>(0)
  const [isChecking, setIsChecking] = useState<boolean>(false)
  const [combo, setCombo] = useState<number>(0)
  const [highScores, setHighScores] = useState<Record<Difficulty, number>>({
    easy: 0, medium: 0, hard: 0, extreme: 0
  })
  const [achievements, setAchievements] = useState<string[]>([])
  const [gamesPlayed, setGamesPlayed] = useState<number>(0)
  const [newAchievement, setNewAchievement] = useState<string | null>(null)

  // Load saved data
  useEffect(() => {
    const saved = localStorage.getItem('pokemon-memory-data')
    if (saved) {
      const data = JSON.parse(saved)
      setHighScores(data.highScores || { easy: 0, medium: 0, hard: 0, extreme: 0 })
      setAchievements(data.achievements || [])
      setGamesPlayed(data.gamesPlayed || 0)
    }
  }, [])

  // Save data
  const saveData = useCallback(() => {
    localStorage.setItem('pokemon-memory-data', JSON.stringify({
      highScores, achievements, gamesPlayed
    }))
  }, [highScores, achievements, gamesPlayed])

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (gameState === 'playing') {
      interval = setInterval(() => {
        setTimer(t => t + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [gameState])

  // Fetch Pokémon cards from API
  const fetchCards = async (count: number): Promise<PokemonCard[]> => {
    try {
      // Fetch random cards using the Pokemon TCG API
      const response = await fetch(
        `https://api.pokemontcg.io/v2/cards?pageSize=${count}&orderBy=-set.releaseDate`
      )
      const data = await response.json()
      return data.data.slice(0, count)
    } catch (error) {
      console.error('Error fetching Pokemon cards:', error)
      // Fallback to placeholder cards if API fails
      return Array.from({ length: count }, (_, i) => ({
        id: `fallback-${i}`,
        name: `Pokémon ${i + 1}`,
        images: {
          small: `https://via.placeholder.com/150x200/3b82f6/ffffff?text=Pokemon+${i + 1}`,
          large: `https://via.placeholder.com/300x400/3b82f6/ffffff?text=Pokemon+${i + 1}`
        },
        set: { name: 'Unknown Set' }
      }))
    }
  }

  // Start game
  const startGame = async () => {
    setGameState('loading')
    const config = DIFFICULTY_CONFIG[difficulty]
    
    try {
      const pokemonCards = await fetchCards(config.pairs)
      
      // Create pairs
      const gameCards: GameCard[] = []
      pokemonCards.forEach((card, index) => {
        // Add two of each card for matching
        gameCards.push({
          id: card.id,
          uniqueId: `${card.id}-a`,
          name: card.name,
          image: card.images.small,
          isFlipped: false,
          isMatched: false
        })
        gameCards.push({
          id: card.id,
          uniqueId: `${card.id}-b`,
          name: card.name,
          image: card.images.small,
          isFlipped: false,
          isMatched: false
        })
      })
      
      // Shuffle cards
      const shuffled = gameCards.sort(() => Math.random() - 0.5)
      
      setCards(shuffled)
      setFlippedCards([])
      setMatchedPairs(0)
      setMoves(0)
      setScore(0)
      setTimer(0)
      setCombo(0)
      setGameState('playing')
      setGamesPlayed(g => g + 1)
    } catch (error) {
      console.error('Error starting game:', error)
      setGameState('menu')
    }
  }

  // Handle card click
  const handleCardClick = (uniqueId: string) => {
    if (isChecking) return
    if (flippedCards.length >= 2) return
    if (flippedCards.includes(uniqueId)) return
    
    const card = cards.find(c => c.uniqueId === uniqueId)
    if (!card || card.isMatched) return

    const newFlipped = [...flippedCards, uniqueId]
    setFlippedCards(newFlipped)
    
    // Update card state
    setCards(prev => prev.map(c => 
      c.uniqueId === uniqueId ? { ...c, isFlipped: true } : c
    ))

    // Check for match when 2 cards are flipped
    if (newFlipped.length === 2) {
      setIsChecking(true)
      setMoves(m => m + 1)
      
      const [first, second] = newFlipped
      const card1 = cards.find(c => c.uniqueId === first)
      const card2 = cards.find(c => c.uniqueId === second)

      if (card1 && card2 && card1.id === card2.id) {
        // Match found!
        const newCombo = combo + 1
        setCombo(newCombo)
        const points = 100 * newCombo + DIFFICULTY_CONFIG[difficulty].timeBonus
        setScore(s => s + points)
        
        setTimeout(() => {
          setCards(prev => prev.map(c => 
            c.id === card1.id ? { ...c, isMatched: true } : c
          ))
          setMatchedPairs(p => {
            const newPairs = p + 1
            // Check for win
            if (newPairs === DIFFICULTY_CONFIG[difficulty].pairs) {
              handleWin()
            }
            return newPairs
          })
          setFlippedCards([])
          setIsChecking(false)
          
          // Check first match achievement
          if (!achievements.includes('first_match')) {
            unlockAchievement('first_match')
          }
        }, 500)
      } else {
        // No match
        setCombo(0)
        setTimeout(() => {
          setCards(prev => prev.map(c => 
            newFlipped.includes(c.uniqueId) ? { ...c, isFlipped: false } : c
          ))
          setFlippedCards([])
          setIsChecking(false)
        }, 1000)
      }
    }
  }

  // Handle win
  const handleWin = () => {
    setGameState('won')
    
    // Calculate final score with time bonus
    const timeBonus = Math.max(0, 300 - timer) * 10
    const finalScore = score + timeBonus
    setScore(finalScore)
    
    // Update high score
    if (finalScore > highScores[difficulty]) {
      setHighScores(prev => ({ ...prev, [difficulty]: finalScore }))
    }
    
    // Check achievements
    if (timer < 30 && !achievements.includes('speed_demon')) {
      unlockAchievement('speed_demon')
    }
    if (moves === DIFFICULTY_CONFIG[difficulty].pairs && !achievements.includes('perfect_memory')) {
      unlockAchievement('perfect_memory')
    }
    if (difficulty === 'extreme' && !achievements.includes('master')) {
      unlockAchievement('master')
    }
    if (gamesPlayed >= 10 && !achievements.includes('collector')) {
      unlockAchievement('collector')
    }
    
    saveData()
  }

  // Unlock achievement
  const unlockAchievement = (id: string) => {
    setAchievements(prev => [...prev, id])
    setNewAchievement(id)
    setTimeout(() => setNewAchievement(null), 3000)
  }

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Achievement Popup */}
      {newAchievement && (
        <div className="fixed top-4 right-4 bg-yellow-500 text-black px-6 py-4 rounded-lg shadow-xl animate-bounce z-50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {ACHIEVEMENTS.find(a => a.id === newAchievement)?.icon}
            </span>
            <div>
              <div className="font-bold">Achievement Unlocked!</div>
              <div className="text-sm">
                {ACHIEVEMENTS.find(a => a.id === newAchievement)?.name}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link 
            href="/games" 
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Games</span>
          </Link>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">🎴</span>
            Pokémon Memory Match
          </h1>
          <div className="text-yellow-400 font-bold">
            High Score: {highScores[difficulty].toLocaleString()}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Menu */}
        {gameState === 'menu' && (
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-white">Pokémon Card Memory Match</h2>
              <p className="text-white/70 text-lg">
                Match pairs of Pokémon cards! Uses REAL cards from the Pokémon TCG API.
              </p>
            </div>

            {/* Difficulty Selection */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 max-w-md mx-auto">
              <h3 className="text-white font-bold mb-4">Select Difficulty</h3>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setDifficulty(diff)}
                    className={`px-4 py-3 rounded-lg font-bold transition-all ${
                      difficulty === diff
                        ? 'bg-yellow-500 text-black scale-105'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    {DIFFICULTY_CONFIG[diff].name}
                    <div className="text-xs opacity-80">
                      {DIFFICULTY_CONFIG[diff].pairs} pairs
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={startGame}
              className="px-12 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold text-xl rounded-xl hover:scale-105 transition-transform shadow-lg"
            >
              Start Game
            </button>

            {/* Achievements */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 max-w-2xl mx-auto">
              <h3 className="text-white font-bold mb-4 flex items-center justify-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Achievements ({achievements.length}/{ACHIEVEMENTS.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {ACHIEVEMENTS.map((ach) => (
                  <div
                    key={ach.id}
                    className={`p-3 rounded-lg text-center ${
                      achievements.includes(ach.id)
                        ? 'bg-yellow-500/30 border border-yellow-500'
                        : 'bg-white/5 border border-white/10'
                    }`}
                  >
                    <div className="text-2xl mb-1">{ach.icon}</div>
                    <div className={`text-xs ${achievements.includes(ach.id) ? 'text-white' : 'text-white/50'}`}>
                      {ach.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {gameState === 'loading' && (
          <div className="text-center py-20">
            <div className="animate-spin text-6xl mb-4">🎴</div>
            <p className="text-white text-xl">Loading Pokémon cards...</p>
          </div>
        )}

        {/* Playing */}
        {gameState === 'playing' && (
          <div className="space-y-6">
            {/* Stats Bar */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-blue-400" />
                  <span className="text-white font-mono text-xl">{formatTime(timer)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <span className="text-white font-bold">{score.toLocaleString()}</span>
                </div>
              </div>
              <div className="text-white">
                Matched: {matchedPairs}/{DIFFICULTY_CONFIG[difficulty].pairs}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-white/80">Moves: {moves}</div>
                {combo > 1 && (
                  <div className="flex items-center gap-1 text-orange-400 animate-pulse">
                    <Zap className="w-4 h-4" />
                    <span className="font-bold">{combo}x Combo!</span>
                  </div>
                )}
              </div>
            </div>

            {/* Game Grid */}
            <div 
              className={`grid gap-3 ${
                DIFFICULTY_CONFIG[difficulty].gridCols === 6 
                  ? 'grid-cols-6' 
                  : 'grid-cols-4'
              }`}
            >
              {cards.map((card) => (
                <button
                  key={card.uniqueId}
                  onClick={() => handleCardClick(card.uniqueId)}
                  disabled={card.isMatched || isChecking}
                  className={`aspect-[2/3] rounded-xl transition-all duration-300 transform ${
                    card.isMatched 
                      ? 'opacity-50 scale-95' 
                      : 'hover:scale-105 cursor-pointer'
                  }`}
                  style={{
                    perspective: '1000px'
                  }}
                >
                  <div
                    className={`w-full h-full relative transition-transform duration-500 transform-gpu ${
                      card.isFlipped || card.isMatched ? 'rotate-y-180' : ''
                    }`}
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: card.isFlipped || card.isMatched ? 'rotateY(180deg)' : 'rotateY(0deg)'
                    }}
                  >
                    {/* Card Back */}
                    <div 
                      className="absolute w-full h-full rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 border-4 border-yellow-400 flex items-center justify-center"
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                      <span className="text-4xl">🎴</span>
                    </div>
                    
                    {/* Card Front */}
                    <div 
                      className="absolute w-full h-full rounded-xl overflow-hidden border-4 border-yellow-400"
                      style={{ 
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)'
                      }}
                    >
                      <img 
                        src={card.image} 
                        alt={card.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Won */}
        {gameState === 'won' && (
          <div className="text-center space-y-8 py-12">
            <div className="text-6xl animate-bounce">🎉</div>
            <h2 className="text-4xl font-bold text-white">You Win!</h2>
            
            <div className="bg-white/10 backdrop-blur rounded-xl p-8 max-w-md mx-auto space-y-4">
              <div className="flex justify-between text-white">
                <span>Time:</span>
                <span className="font-bold">{formatTime(timer)}</span>
              </div>
              <div className="flex justify-between text-white">
                <span>Moves:</span>
                <span className="font-bold">{moves}</span>
              </div>
              <div className="flex justify-between text-white">
                <span>Difficulty:</span>
                <span className="font-bold">{DIFFICULTY_CONFIG[difficulty].name}</span>
              </div>
              <div className="border-t border-white/20 pt-4 flex justify-between text-yellow-400 text-xl">
                <span>Final Score:</span>
                <span className="font-bold">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={startGame}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-lg hover:scale-105 transition-transform flex items-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                Play Again
              </button>
              <button
                onClick={() => setGameState('menu')}
                className="px-8 py-3 bg-white/20 text-white font-bold rounded-lg hover:bg-white/30 transition-colors"
              >
                Main Menu
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-black/30 backdrop-blur-sm border-t border-white/10 py-3">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between text-white/60 text-sm">
          <span>Powered by Pokémon TCG API</span>
          <span>CR AudioViz AI Games</span>
        </div>
      </footer>
    </div>
  )
}
