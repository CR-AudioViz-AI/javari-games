'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, RotateCcw, Trophy, Star, Timer, Wine, Check, X, HelpCircle } from 'lucide-react'

// =============================================================================
// COCKTAIL MIXOLOGIST
// CR AudioViz AI Games - Uses FREE TheCocktailDB API
// Features: Real cocktail data, ingredient matching, scoring, achievements
// Can be embedded in: games.craudiovizai.com AND CravBarrels app
// =============================================================================

interface Cocktail {
  idDrink: string
  strDrink: string
  strDrinkThumb: string
  strInstructions: string
  strCategory: string
  strGlass: string
  ingredients: string[]
}

interface GameRound {
  cocktail: Cocktail
  options: string[]
  correctIngredients: string[]
  selectedIngredients: string[]
  isComplete: boolean
}

type GameMode = 'ingredients' | 'name' | 'glass'

const GAME_MODES = {
  ingredients: { name: 'Ingredient Match', description: 'Select the correct ingredients', icon: '🧪' },
  name: { name: 'Name That Drink', description: 'Guess the cocktail from the image', icon: '🍸' },
  glass: { name: 'Glass Expert', description: 'Match the drink to its glass', icon: '🥃' }
}

const ACHIEVEMENTS = [
  { id: 'first_mix', name: 'First Mix', description: 'Complete your first round', icon: '🍹' },
  { id: 'perfect_10', name: 'Perfect 10', description: 'Get 10 perfect scores in a row', icon: '💯' },
  { id: 'speed_bartender', name: 'Speed Bartender', description: 'Complete a round in under 5 seconds', icon: '⚡' },
  { id: 'cocktail_master', name: 'Cocktail Master', description: 'Score over 10,000 points', icon: '🏆' },
  { id: 'mixologist', name: 'Mixologist', description: 'Play 50 rounds', icon: '👨‍🍳' }
]

const ALL_INGREDIENTS = [
  'Vodka', 'Rum', 'Gin', 'Tequila', 'Whiskey', 'Bourbon',
  'Triple Sec', 'Cointreau', 'Kahlua', 'Baileys', 'Amaretto',
  'Lime Juice', 'Lemon Juice', 'Orange Juice', 'Cranberry Juice', 'Pineapple Juice',
  'Simple Syrup', 'Grenadine', 'Angostura Bitters', 'Sugar',
  'Coca-Cola', 'Tonic Water', 'Soda Water', 'Ginger Beer',
  'Mint Leaves', 'Salt', 'Ice', 'Cream', 'Milk',
  'Vermouth', 'Campari', 'Aperol', 'Blue Curacao'
]

const GLASS_TYPES = [
  'Cocktail glass', 'Highball glass', 'Old-fashioned glass', 'Collins glass',
  'Martini Glass', 'Shot glass', 'Wine Glass', 'Champagne flute',
  'Hurricane glass', 'Margarita glass', 'Copper Mug', 'Beer mug'
]

export default function CocktailMixologist() {
  const [gameState, setGameState] = useState<'menu' | 'loading' | 'playing' | 'roundEnd' | 'gameOver'>('menu')
  const [gameMode, setGameMode] = useState<GameMode>('ingredients')
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null)
  const [round, setRound] = useState<number>(0)
  const [score, setScore] = useState<number>(0)
  const [streak, setStreak] = useState<number>(0)
  const [timer, setTimer] = useState<number>(0)
  const [highScore, setHighScore] = useState<number>(0)
  const [totalRounds, setTotalRounds] = useState<number>(0)
  const [achievements, setAchievements] = useState<string[]>([])
  const [newAchievement, setNewAchievement] = useState<string | null>(null)
  const [roundStartTime, setRoundStartTime] = useState<number>(0)
  const [showHint, setShowHint] = useState<boolean>(false)
  const [lastRoundCorrect, setLastRoundCorrect] = useState<boolean>(false)

  useEffect(() => {
    const saved = localStorage.getItem('cocktail-mixologist-data')
    if (saved) {
      const data = JSON.parse(saved)
      setHighScore(data.highScore || 0)
      setTotalRounds(data.totalRounds || 0)
      setAchievements(data.achievements || [])
    }
  }, [])

  const saveData = useCallback(() => {
    localStorage.setItem('cocktail-mixologist-data', JSON.stringify({
      highScore, totalRounds, achievements
    }))
  }, [highScore, totalRounds, achievements])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (gameState === 'playing') {
      interval = setInterval(() => setTimer(t => t + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [gameState])

  const fetchCocktail = async (): Promise<Cocktail | null> => {
    try {
      const response = await fetch('https://www.thecocktaildb.com/api/json/v1/1/random.php')
      const data = await response.json()
      const drink = data.drinks[0]
      
      const ingredients: string[] = []
      for (let i = 1; i <= 15; i++) {
        const ingredient = drink[`strIngredient${i}`]
        if (ingredient && ingredient.trim()) {
          ingredients.push(ingredient.trim())
        }
      }
      
      return {
        idDrink: drink.idDrink,
        strDrink: drink.strDrink,
        strDrinkThumb: drink.strDrinkThumb,
        strInstructions: drink.strInstructions,
        strCategory: drink.strCategory,
        strGlass: drink.strGlass,
        ingredients
      }
    } catch (error) {
      console.error('Error fetching cocktail:', error)
      return null
    }
  }

  const startGame = () => {
    setRound(0)
    setScore(0)
    setStreak(0)
    setTimer(0)
    setShowHint(false)
    loadNextRound()
  }

  const loadNextRound = async () => {
    setGameState('loading')
    const cocktail = await fetchCocktail()
    
    if (!cocktail) {
      setGameState('menu')
      return
    }

    let options: string[] = []
    let correctAnswers: string[] = []

    if (gameMode === 'ingredients') {
      correctAnswers = cocktail.ingredients.slice(0, 4)
      const wrongOptions = ALL_INGREDIENTS
        .filter(i => !cocktail.ingredients.some(ci => ci.toLowerCase() === i.toLowerCase()))
        .sort(() => Math.random() - 0.5)
        .slice(0, 4)
      options = [...correctAnswers, ...wrongOptions].sort(() => Math.random() - 0.5)
    } else if (gameMode === 'name') {
      correctAnswers = [cocktail.strDrink]
      const wrongNames: string[] = []
      for (let i = 0; i < 3; i++) {
        const wrongCocktail = await fetchCocktail()
        if (wrongCocktail && wrongCocktail.strDrink !== cocktail.strDrink) {
          wrongNames.push(wrongCocktail.strDrink)
        }
      }
      options = [cocktail.strDrink, ...wrongNames].sort(() => Math.random() - 0.5)
    } else if (gameMode === 'glass') {
      correctAnswers = [cocktail.strGlass]
      const wrongGlasses = GLASS_TYPES
        .filter(g => g.toLowerCase() !== cocktail.strGlass.toLowerCase())
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
      options = [cocktail.strGlass, ...wrongGlasses].sort(() => Math.random() - 0.5)
    }

    setCurrentRound({
      cocktail,
      options,
      correctIngredients: correctAnswers,
      selectedIngredients: [],
      isComplete: false
    })
    
    setRound(r => r + 1)
    setRoundStartTime(Date.now())
    setShowHint(false)
    setGameState('playing')
  }

  const handleSelect = (option: string) => {
    if (!currentRound || currentRound.isComplete) return

    if (gameMode === 'ingredients') {
      const newSelected = currentRound.selectedIngredients.includes(option)
        ? currentRound.selectedIngredients.filter(i => i !== option)
        : [...currentRound.selectedIngredients, option]
      setCurrentRound({ ...currentRound, selectedIngredients: newSelected })
    } else {
      const isCorrect = currentRound.correctIngredients.some(
        c => c.toLowerCase() === option.toLowerCase()
      )
      completeRound(isCorrect, [option])
    }
  }

  const submitIngredients = () => {
    if (!currentRound) return
    
    const correctCount = currentRound.correctIngredients.filter(i => 
      currentRound.selectedIngredients.some(s => s.toLowerCase() === i.toLowerCase())
    ).length
    
    const isCorrect = correctCount === currentRound.correctIngredients.length &&
                      currentRound.selectedIngredients.length === currentRound.correctIngredients.length
    
    completeRound(isCorrect, currentRound.selectedIngredients)
  }

  const completeRound = (isCorrect: boolean, selected: string[]) => {
    if (!currentRound) return

    setLastRoundCorrect(isCorrect)
    const roundTime = (Date.now() - roundStartTime) / 1000
    let points = 0
    
    if (isCorrect) {
      const basePoints = 100
      const timeBonus = Math.max(0, Math.floor((30 - roundTime) * 10))
      const streakBonus = streak * 50
      points = basePoints + timeBonus + streakBonus
      setStreak(s => s + 1)
      
      if (!achievements.includes('first_mix')) {
        unlockAchievement('first_mix')
      }
      if (roundTime < 5 && !achievements.includes('speed_bartender')) {
        unlockAchievement('speed_bartender')
      }
      if (streak + 1 >= 10 && !achievements.includes('perfect_10')) {
        unlockAchievement('perfect_10')
      }
    } else {
      setStreak(0)
    }
    
    setScore(s => {
      const newScore = s + points
      if (newScore > highScore) {
        setHighScore(newScore)
      }
      if (newScore > 10000 && !achievements.includes('cocktail_master')) {
        unlockAchievement('cocktail_master')
      }
      return newScore
    })
    
    setTotalRounds(t => {
      const newTotal = t + 1
      if (newTotal >= 50 && !achievements.includes('mixologist')) {
        unlockAchievement('mixologist')
      }
      return newTotal
    })
    
    setCurrentRound({
      ...currentRound,
      selectedIngredients: selected,
      isComplete: true
    })
    
    setGameState('roundEnd')
    saveData()
  }

  const unlockAchievement = (id: string) => {
    setAchievements(prev => [...prev, id])
    setNewAchievement(id)
    setTimeout(() => setNewAchievement(null), 3000)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-900 to-red-900">
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
            <Wine className="w-6 h-6 text-amber-400" />
            Cocktail Mixologist
          </h1>
          <div className="text-amber-400 font-bold">High Score: {highScore.toLocaleString()}</div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {gameState === 'menu' && (
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-white">🍸 Cocktail Mixologist</h2>
              <p className="text-white/70 text-lg">Test your bartending knowledge with REAL cocktails!</p>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-xl p-6 max-w-md mx-auto">
              <h3 className="text-white font-bold mb-4">Select Game Mode</h3>
              <div className="space-y-3">
                {(Object.keys(GAME_MODES) as GameMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setGameMode(mode)}
                    className={`w-full px-4 py-4 rounded-lg transition-all flex items-center gap-4 ${
                      gameMode === mode ? 'bg-amber-500 text-black scale-105' : 'bg-white/20 text-white hover:bg-white/30'
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
              className="px-12 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold text-xl rounded-xl hover:scale-105 transition-transform shadow-lg"
            >
              Start Game
            </button>

            <div className="bg-white/10 backdrop-blur rounded-xl p-6 max-w-md mx-auto">
              <h3 className="text-white font-bold mb-4">Your Stats</h3>
              <div className="grid grid-cols-2 gap-4 text-white">
                <div>
                  <div className="text-2xl font-bold text-amber-400">{totalRounds}</div>
                  <div className="text-sm opacity-70">Rounds Played</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-400">{highScore.toLocaleString()}</div>
                  <div className="text-sm opacity-70">High Score</div>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-xl p-6 max-w-2xl mx-auto">
              <h3 className="text-white font-bold mb-4 flex items-center justify-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                Achievements ({achievements.length}/{ACHIEVEMENTS.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {ACHIEVEMENTS.map((ach) => (
                  <div
                    key={ach.id}
                    className={`p-3 rounded-lg text-center ${
                      achievements.includes(ach.id) ? 'bg-amber-500/30 border border-amber-500' : 'bg-white/5 border border-white/10'
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
            <div className="animate-spin text-6xl mb-4">🍹</div>
            <p className="text-white text-xl">Mixing up a cocktail...</p>
          </div>
        )}

        {(gameState === 'playing' || gameState === 'roundEnd') && currentRound && (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-amber-400" />
                  <span className="text-white font-mono text-xl">{formatTime(timer)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <span className="text-white font-bold">{score.toLocaleString()}</span>
                </div>
              </div>
              <div className="text-white">Round {round}</div>
              <div className="text-amber-400">🔥 Streak: {streak}</div>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-xl p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-1/3">
                  <img
                    src={currentRound.cocktail.strDrinkThumb}
                    alt={gameMode === 'name' ? 'Mystery Cocktail' : currentRound.cocktail.strDrink}
                    className="w-full rounded-xl shadow-lg"
                  />
                  {gameMode !== 'name' && (
                    <h3 className="text-2xl font-bold text-white text-center mt-4">{currentRound.cocktail.strDrink}</h3>
                  )}
                  {gameMode === 'name' && gameState === 'playing' && (
                    <h3 className="text-xl text-white/70 text-center mt-4">What cocktail is this?</h3>
                  )}
                </div>

                <div className="md:w-2/3">
                  {gameMode === 'ingredients' && (
                    <div>
                      <h4 className="text-white font-bold mb-4">
                        Select the {currentRound.correctIngredients.length} correct ingredients:
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {currentRound.options.map((option) => {
                          const isSelected = currentRound.selectedIngredients.includes(option)
                          const isCorrect = currentRound.correctIngredients.some(c => c.toLowerCase() === option.toLowerCase())
                          const showResult = gameState === 'roundEnd'
                          
                          return (
                            <button
                              key={option}
                              onClick={() => handleSelect(option)}
                              disabled={gameState === 'roundEnd'}
                              className={`px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-between ${
                                showResult
                                  ? isCorrect
                                    ? 'bg-green-500 text-white'
                                    : isSelected
                                      ? 'bg-red-500 text-white'
                                      : 'bg-white/10 text-white/50'
                                  : isSelected
                                    ? 'bg-amber-500 text-black'
                                    : 'bg-white/20 text-white hover:bg-white/30'
                              }`}
                            >
                              <span>{option}</span>
                              {showResult && isCorrect && <Check className="w-5 h-5" />}
                              {showResult && !isCorrect && isSelected && <X className="w-5 h-5" />}
                            </button>
                          )
                        })}
                      </div>
                      {gameState === 'playing' && (
                        <button
                          onClick={submitIngredients}
                          disabled={currentRound.selectedIngredients.length !== currentRound.correctIngredients.length}
                          className="mt-6 w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
                        >
                          Submit ({currentRound.selectedIngredients.length}/{currentRound.correctIngredients.length})
                        </button>
                      )}
                    </div>
                  )}

                  {(gameMode === 'name' || gameMode === 'glass') && (
                    <div>
                      <h4 className="text-white font-bold mb-4">
                        {gameMode === 'name' ? 'What is this cocktail?' : 'What glass is this served in?'}
                      </h4>
                      <div className="grid grid-cols-1 gap-3">
                        {currentRound.options.map((option) => {
                          const isSelected = currentRound.selectedIngredients.includes(option)
                          const isCorrect = currentRound.correctIngredients.some(c => c.toLowerCase() === option.toLowerCase())
                          const showResult = gameState === 'roundEnd'
                          
                          return (
                            <button
                              key={option}
                              onClick={() => handleSelect(option)}
                              disabled={gameState === 'roundEnd'}
                              className={`px-6 py-4 rounded-lg font-medium transition-all flex items-center justify-between ${
                                showResult
                                  ? isCorrect
                                    ? 'bg-green-500 text-white'
                                    : isSelected
                                      ? 'bg-red-500 text-white'
                                      : 'bg-white/10 text-white/50'
                                  : 'bg-white/20 text-white hover:bg-white/30'
                              }`}
                            >
                              <span>{option}</span>
                              {showResult && isCorrect && <Check className="w-5 h-5" />}
                              {showResult && !isCorrect && isSelected && <X className="w-5 h-5" />}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {gameState === 'roundEnd' && (
                    <div className="mt-6 space-y-4">
                      <div className={`text-center text-2xl font-bold ${lastRoundCorrect ? 'text-green-400' : 'text-red-400'}`}>
                        {lastRoundCorrect ? '✅ Correct!' : '❌ Incorrect!'}
                      </div>
                      
                      {showHint && (
                        <div className="bg-white/10 rounded-lg p-4">
                          <h5 className="text-amber-400 font-bold mb-2">About this drink:</h5>
                          <p className="text-white/80 text-sm">{currentRound.cocktail.strInstructions}</p>
                          <p className="text-white/60 text-sm mt-2">Category: {currentRound.cocktail.strCategory}</p>
                          <p className="text-white/60 text-sm">Glass: {currentRound.cocktail.strGlass}</p>
                        </div>
                      )}
                      
                      <div className="flex gap-4">
                        <button
                          onClick={() => setShowHint(!showHint)}
                          className="flex-1 py-3 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors flex items-center justify-center gap-2"
                        >
                          <HelpCircle className="w-5 h-5" />
                          {showHint ? 'Hide Details' : 'Show Details'}
                        </button>
                        <button
                          onClick={loadNextRound}
                          className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-lg hover:scale-105 transition-transform"
                        >
                          Next Round →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-black/30 backdrop-blur-sm border-t border-white/10 py-3">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between text-white/60 text-sm">
          <span>Powered by TheCocktailDB API</span>
          <span>CR AudioViz AI Games • CRAVBarrels</span>
        </div>
      </footer>
    </div>
  )
}
