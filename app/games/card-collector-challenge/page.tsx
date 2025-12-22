'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Trophy, Star, Timer, Zap, Target, TrendingUp } from 'lucide-react'

// =============================================================================
// CARD COLLECTOR CHALLENGE
// CR AudioViz AI Games - Uses FREE Scryfall API (Magic: The Gathering)
// Features: Price guessing, rarity challenges, card identification
// Can be embedded in: games.craudiovizai.com AND CravCards app
// =============================================================================

interface MTGCard {
  id: string
  name: string
  image_uris?: {
    normal: string
    small: string
    large: string
  }
  card_faces?: Array<{
    image_uris?: {
      normal: string
      small: string
    }
  }>
  prices: {
    usd: string | null
    usd_foil: string | null
  }
  rarity: string
  set_name: string
  mana_cost: string
  type_line: string
  oracle_text?: string
}

type GameMode = 'price-guess' | 'rarity-match' | 'higher-lower'

const GAME_MODES = {
  'price-guess': { name: 'Price Guesser', description: 'Guess if the card is worth more or less than shown', icon: '💰' },
  'rarity-match': { name: 'Rarity Match', description: 'Identify the card\'s rarity', icon: '💎' },
  'higher-lower': { name: 'Higher or Lower', description: 'Which card is worth more?', icon: '📈' }
}

const RARITIES = ['common', 'uncommon', 'rare', 'mythic']

const ACHIEVEMENTS = [
  { id: 'first_guess', name: 'First Trade', description: 'Make your first guess', icon: '🎯' },
  { id: 'streak_10', name: 'Hot Streak', description: 'Get 10 correct in a row', icon: '🔥' },
  { id: 'price_master', name: 'Price Master', description: 'Score 5000 points in Price Guesser', icon: '💰' },
  { id: 'collector', name: 'Collector', description: 'Play 100 rounds', icon: '📦' },
  { id: 'mythic_eye', name: 'Mythic Eye', description: 'Correctly identify 10 mythic rares', icon: '👁️' }
]

export default function CardCollectorChallenge() {
  const [gameState, setGameState] = useState<'menu' | 'loading' | 'playing' | 'result' | 'gameOver'>('menu')
  const [gameMode, setGameMode] = useState<GameMode>('price-guess')
  const [currentCard, setCurrentCard] = useState<MTGCard | null>(null)
  const [compareCard, setCompareCard] = useState<MTGCard | null>(null)
  const [displayPrice, setDisplayPrice] = useState<number>(0)
  const [score, setScore] = useState<number>(0)
  const [streak, setStreak] = useState<number>(0)
  const [lives, setLives] = useState<number>(3)
  const [round, setRound] = useState<number>(0)
  const [highScore, setHighScore] = useState<number>(0)
  const [totalRounds, setTotalRounds] = useState<number>(0)
  const [mythicCorrect, setMythicCorrect] = useState<number>(0)
  const [achievements, setAchievements] = useState<string[]>([])
  const [newAchievement, setNewAchievement] = useState<string | null>(null)
  const [lastAnswer, setLastAnswer] = useState<{ correct: boolean; actual: string } | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('card-collector-data')
    if (saved) {
      const data = JSON.parse(saved)
      setHighScore(data.highScore || 0)
      setTotalRounds(data.totalRounds || 0)
      setMythicCorrect(data.mythicCorrect || 0)
      setAchievements(data.achievements || [])
    }
  }, [])

  const saveData = useCallback(() => {
    localStorage.setItem('card-collector-data', JSON.stringify({
      highScore, totalRounds, mythicCorrect, achievements
    }))
  }, [highScore, totalRounds, mythicCorrect, achievements])

  const unlockAchievement = (id: string) => {
    if (!achievements.includes(id)) {
      setAchievements(prev => [...prev, id])
      setNewAchievement(id)
      setTimeout(() => setNewAchievement(null), 3000)
    }
  }

  const getCardImage = (card: MTGCard): string => {
    if (card.image_uris?.normal) {
      return card.image_uris.normal
    }
    if (card.card_faces?.[0]?.image_uris?.normal) {
      return card.card_faces[0].image_uris.normal
    }
    return 'https://via.placeholder.com/336x468/1a1a2e/ffffff?text=Card+Image'
  }

  const fetchRandomCard = async (): Promise<MTGCard | null> => {
    try {
      // Fetch random card with a price from Scryfall
      const response = await fetch('https://api.scryfall.com/cards/random?q=usd%3E0.5')
      const card = await response.json()
      return card
    } catch (error) {
      console.error('Error fetching card:', error)
      return null
    }
  }

  const startGame = async () => {
    setGameState('loading')
    setScore(0)
    setStreak(0)
    setLives(3)
    setRound(0)
    setLastAnswer(null)
    await loadNextRound()
  }

  const loadNextRound = async () => {
    setGameState('loading')
    
    if (gameMode === 'higher-lower') {
      const [card1, card2] = await Promise.all([fetchRandomCard(), fetchRandomCard()])
      if (!card1 || !card2) {
        setGameState('menu')
        return
      }
      setCurrentCard(card1)
      setCompareCard(card2)
    } else {
      const card = await fetchRandomCard()
      if (!card) {
        setGameState('menu')
        return
      }
      setCurrentCard(card)
      
      if (gameMode === 'price-guess') {
        const actualPrice = parseFloat(card.prices.usd || '0')
        // Generate a fake price that's randomly higher or lower
        const variance = actualPrice * (Math.random() * 0.8 + 0.2) // 20-100% variance
        const fakePrice = Math.random() > 0.5 
          ? actualPrice + variance 
          : Math.max(0.5, actualPrice - variance)
        setDisplayPrice(Math.round(fakePrice * 100) / 100)
      }
    }
    
    setRound(r => r + 1)
    setLastAnswer(null)
    setGameState('playing')
  }

  const handlePriceGuess = (guess: 'higher' | 'lower') => {
    if (!currentCard) return
    
    const actualPrice = parseFloat(currentCard.prices.usd || '0')
    const isCorrect = guess === 'higher' ? actualPrice > displayPrice : actualPrice < displayPrice
    
    processAnswer(isCorrect, `$${actualPrice.toFixed(2)}`)
  }

  const handleRarityGuess = (guess: string) => {
    if (!currentCard) return
    
    const isCorrect = currentCard.rarity === guess
    
    if (isCorrect && currentCard.rarity === 'mythic') {
      setMythicCorrect(m => {
        const newCount = m + 1
        if (newCount >= 10) unlockAchievement('mythic_eye')
        return newCount
      })
    }
    
    processAnswer(isCorrect, currentCard.rarity)
  }

  const handleHigherLower = (choice: 'first' | 'second') => {
    if (!currentCard || !compareCard) return
    
    const price1 = parseFloat(currentCard.prices.usd || '0')
    const price2 = parseFloat(compareCard.prices.usd || '0')
    
    const isCorrect = choice === 'first' ? price1 >= price2 : price2 >= price1
    
    processAnswer(isCorrect, `$${price1.toFixed(2)} vs $${price2.toFixed(2)}`)
  }

  const processAnswer = (isCorrect: boolean, actual: string) => {
    setLastAnswer({ correct: isCorrect, actual })
    
    if (isCorrect) {
      const basePoints = 100
      const streakBonus = streak * 25
      const points = basePoints + streakBonus
      
      setScore(s => {
        const newScore = s + points
        if (gameMode === 'price-guess' && newScore >= 5000) {
          unlockAchievement('price_master')
        }
        return newScore
      })
      setStreak(s => {
        const newStreak = s + 1
        if (newStreak >= 10) unlockAchievement('streak_10')
        return newStreak
      })
    } else {
      setStreak(0)
      setLives(l => l - 1)
    }
    
    setTotalRounds(t => {
      const newTotal = t + 1
      if (newTotal >= 100) unlockAchievement('collector')
      return newTotal
    })
    
    if (!achievements.includes('first_guess')) {
      unlockAchievement('first_guess')
    }
    
    setGameState('result')
  }

  const continueGame = () => {
    if (lives <= 0) {
      if (score > highScore) {
        setHighScore(score)
      }
      saveData()
      setGameState('gameOver')
    } else {
      loadNextRound()
    }
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'from-gray-500 to-gray-700'
      case 'uncommon': return 'from-gray-400 to-gray-500'
      case 'rare': return 'from-yellow-500 to-yellow-700'
      case 'mythic': return 'from-orange-500 to-red-600'
      default: return 'from-gray-500 to-gray-700'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {newAchievement && (
        <div className="fixed top-4 right-4 bg-yellow-500 text-black px-6 py-4 rounded-lg shadow-xl animate-bounce z-50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{ACHIEVEMENTS.find(a => a.id === newAchievement)?.icon}</span>
            <div>
              <div className="font-bold">Achievement Unlocked!</div>
              <div className="text-sm">{ACHIEVEMENTS.find(a => a.id === newAchievement)?.name}</div>
            </div>
          </div>
        </div>
      )}

      <header className="bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/games" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Games</span>
          </Link>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-purple-400" />
            Card Collector Challenge
          </h1>
          <div className="text-purple-400 font-bold">High Score: {highScore.toLocaleString()}</div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {gameState === 'menu' && (
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-white">🃏 Card Collector Challenge</h2>
              <p className="text-white/70 text-lg">Test your card knowledge with REAL Magic: The Gathering cards!</p>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-xl p-6 max-w-md mx-auto">
              <h3 className="text-white font-bold mb-4">Select Game Mode</h3>
              <div className="space-y-3">
                {(Object.keys(GAME_MODES) as GameMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setGameMode(mode)}
                    className={`w-full px-4 py-4 rounded-lg transition-all flex items-center gap-4 ${
                      gameMode === mode ? 'bg-purple-500 text-white scale-105' : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    <span className="text-2xl">{GAME_MODES[mode].icon}</span>
                    <div className="text-left">
                      <div className="font-bold">{GAME_MODES[mode].name}</div>
                      <div className="text-sm opacity-80">{GAME_MODES[mode].description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={startGame}
              className="px-12 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-xl rounded-xl hover:scale-105 transition-transform shadow-lg"
            >
              Start Challenge
            </button>

            <div className="bg-white/10 backdrop-blur rounded-xl p-6 max-w-md mx-auto">
              <h3 className="text-white font-bold mb-4">Your Stats</h3>
              <div className="grid grid-cols-2 gap-4 text-white">
                <div>
                  <div className="text-2xl font-bold text-purple-400">{totalRounds}</div>
                  <div className="text-sm opacity-70">Cards Seen</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-400">{highScore.toLocaleString()}</div>
                  <div className="text-sm opacity-70">High Score</div>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-xl p-6 max-w-2xl mx-auto">
              <h3 className="text-white font-bold mb-4 flex items-center justify-center gap-2">
                <Trophy className="w-5 h-5 text-purple-400" />
                Achievements ({achievements.length}/{ACHIEVEMENTS.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {ACHIEVEMENTS.map((ach) => (
                  <div
                    key={ach.id}
                    className={`p-3 rounded-lg text-center ${
                      achievements.includes(ach.id) ? 'bg-purple-500/30 border border-purple-500' : 'bg-white/5 border border-white/10'
                    }`}
                  >
                    <div className="text-2xl mb-1">{ach.icon}</div>
                    <div className={`text-xs ${achievements.includes(ach.id) ? 'text-white' : 'text-white/50'}`}>{ach.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {gameState === 'loading' && (
          <div className="text-center py-20">
            <div className="animate-spin text-6xl mb-4">🃏</div>
            <p className="text-white text-xl">Loading card...</p>
          </div>
        )}

        {(gameState === 'playing' || gameState === 'result') && currentCard && (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <span className="text-white font-bold">{score.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <span key={i} className={`text-xl ${i < lives ? 'opacity-100' : 'opacity-30'}`}>❤️</span>
                  ))}
                </div>
              </div>
              <div className="text-white">Round {round}</div>
              <div className="text-purple-400 flex items-center gap-1">
                <Zap className="w-4 h-4" />
                Streak: {streak}
              </div>
            </div>

            {gameMode === 'higher-lower' && compareCard ? (
              <div className="grid grid-cols-2 gap-6">
                {[currentCard, compareCard].map((card, i) => (
                  <div key={card.id} className="bg-white/10 backdrop-blur rounded-xl p-4 space-y-4">
                    <img
                      src={getCardImage(card)}
                      alt={card.name}
                      className="w-full rounded-lg shadow-lg"
                    />
                    {gameState === 'playing' && (
                      <button
                        onClick={() => handleHigherLower(i === 0 ? 'first' : 'second')}
                        className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-lg hover:scale-105 transition-transform"
                      >
                        This One!
                      </button>
                    )}
                    {gameState === 'result' && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">${parseFloat(card.prices.usd || '0').toFixed(2)}</div>
                        <div className="text-white/70 text-sm">{card.name}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/2">
                    <img
                      src={getCardImage(currentCard)}
                      alt={currentCard.name}
                      className="w-full rounded-lg shadow-lg"
                    />
                  </div>
                  <div className="md:w-1/2 space-y-4">
                    <h3 className="text-2xl font-bold text-white">{currentCard.name}</h3>
                    <div className="text-white/70">{currentCard.set_name}</div>
                    
                    {gameMode === 'price-guess' && (
                      <div className="space-y-4">
                        <div className="text-center p-6 bg-white/10 rounded-lg">
                          <div className="text-white/70 mb-2">Is this card worth more or less than:</div>
                          <div className="text-4xl font-bold text-green-400">${displayPrice.toFixed(2)}</div>
                        </div>
                        {gameState === 'playing' && (
                          <div className="grid grid-cols-2 gap-4">
                            <button
                              onClick={() => handlePriceGuess('higher')}
                              className="py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-lg hover:scale-105 transition-transform flex items-center justify-center gap-2"
                            >
                              <TrendingUp className="w-5 h-5" />
                              Higher
                            </button>
                            <button
                              onClick={() => handlePriceGuess('lower')}
                              className="py-4 bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold rounded-lg hover:scale-105 transition-transform flex items-center justify-center gap-2"
                            >
                              <TrendingUp className="w-5 h-5 rotate-180" />
                              Lower
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {gameMode === 'rarity-match' && (
                      <div className="space-y-4">
                        <div className="text-white text-lg">What's this card's rarity?</div>
                        {gameState === 'playing' && (
                          <div className="grid grid-cols-2 gap-3">
                            {RARITIES.map((rarity) => (
                              <button
                                key={rarity}
                                onClick={() => handleRarityGuess(rarity)}
                                className={`py-3 bg-gradient-to-r ${getRarityColor(rarity)} text-white font-bold rounded-lg hover:scale-105 transition-transform capitalize`}
                              >
                                {rarity}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {gameState === 'result' && lastAnswer && (
                      <div className="space-y-4">
                        <div className={`text-center text-2xl font-bold ${lastAnswer.correct ? 'text-green-400' : 'text-red-400'}`}>
                          {lastAnswer.correct ? '✅ Correct!' : '❌ Wrong!'}
                        </div>
                        <div className="text-center text-white">
                          Actual: <span className="font-bold text-purple-400">{lastAnswer.actual}</span>
                        </div>
                        <button
                          onClick={continueGame}
                          className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-lg hover:scale-105 transition-transform"
                        >
                          {lives <= 0 ? 'See Results' : 'Next Card →'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {gameState === 'gameOver' && (
          <div className="text-center space-y-8 py-12">
            <div className="text-6xl">🏆</div>
            <h2 className="text-4xl font-bold text-white">Game Over!</h2>

            <div className="bg-white/10 backdrop-blur rounded-xl p-8 max-w-md mx-auto space-y-4">
              <div className="flex justify-between text-white">
                <span>Rounds:</span>
                <span className="font-bold">{round}</span>
              </div>
              <div className="flex justify-between text-white">
                <span>Best Streak:</span>
                <span className="font-bold">{streak}</span>
              </div>
              <div className="border-t border-white/20 pt-4 flex justify-between text-purple-400 text-xl">
                <span>Final Score:</span>
                <span className="font-bold">{score.toLocaleString()}</span>
              </div>
              {score >= highScore && score > 0 && (
                <div className="text-green-400 font-bold animate-pulse">🎉 New High Score!</div>
              )}
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={startGame}
                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-lg hover:scale-105 transition-transform"
              >
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

      <footer className="fixed bottom-0 left-0 right-0 bg-black/30 backdrop-blur-sm border-t border-white/10 py-3">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between text-white/60 text-sm">
          <span>Powered by Scryfall API</span>
          <span>CR AudioViz AI Games • CRAVCards</span>
        </div>
      </footer>
    </div>
  )
}
