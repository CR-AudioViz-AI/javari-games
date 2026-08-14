'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Trophy, Star, Timer, BookOpen, Check, X, Lightbulb } from 'lucide-react'

// =============================================================================
// SPIRITS HISTORY TRIVIA
// CR AudioViz AI Games - Alcohol History & Knowledge
// Features: Prohibition era, distilling history, spirits knowledge
// Can be embedded in: games.craudiovizai.com AND Javari Spirits app
// =============================================================================

interface TriviaQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: string
  category: 'prohibition' | 'distilling' | 'spirits' | 'cocktails' | 'culture'
  difficulty: 'easy' | 'medium' | 'hard'
  funFact: string
}

const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  // Prohibition Era
  {
    id: 'p1',
    question: 'What year did Prohibition begin in the United States?',
    options: ['1918', '1920', '1922', '1925'],
    correctAnswer: '1920',
    category: 'prohibition',
    difficulty: 'easy',
    funFact: 'The 18th Amendment was ratified in 1919 but took effect on January 17, 1920.'
  },
  {
    id: 'p2',
    question: 'What was the name of the Amendment that ended Prohibition?',
    options: ['19th Amendment', '20th Amendment', '21st Amendment', '22nd Amendment'],
    correctAnswer: '21st Amendment',
    category: 'prohibition',
    difficulty: 'easy',
    funFact: 'The 21st Amendment is the only constitutional amendment to repeal another amendment.'
  },
  {
    id: 'p3',
    question: 'Which famous gangster was known for bootlegging during Prohibition?',
    options: ['John Dillinger', 'Al Capone', 'Bugsy Siegel', 'Lucky Luciano'],
    correctAnswer: 'Al Capone',
    category: 'prohibition',
    difficulty: 'easy',
    funFact: 'Al Capone made an estimated $60 million per year from bootlegging operations.'
  },
  {
    id: 'p4',
    question: 'What were illegal bars during Prohibition commonly called?',
    options: ['Blind Pigs', 'Speakeasies', 'Rum Rooms', 'All of the above'],
    correctAnswer: 'All of the above',
    category: 'prohibition',
    difficulty: 'medium',
    funFact: 'There were an estimated 100,000 speakeasies in New York City alone during Prohibition.'
  },
  {
    id: 'p5',
    question: 'What was "bathtub gin"?',
    options: ['Gin made in England', 'Illegally produced gin during Prohibition', 'A cocktail recipe', 'A brand name'],
    correctAnswer: 'Illegally produced gin during Prohibition',
    category: 'prohibition',
    difficulty: 'medium',
    funFact: 'The term comes from the fact that the bottles were too tall to fill from a sink, so bathtub faucets were used.'
  },
  // Distilling History
  {
    id: 'd1',
    question: 'What is the oldest known distilled spirit?',
    options: ['Whiskey', 'Vodka', 'Arrack', 'Brandy'],
    correctAnswer: 'Arrack',
    category: 'distilling',
    difficulty: 'hard',
    funFact: 'Arrack has been produced in Asia for over 800 years, making it one of the oldest distilled spirits.'
  },
  {
    id: 'd2',
    question: 'Which country is credited with inventing whiskey?',
    options: ['Scotland', 'Ireland', 'America', 'Both Scotland and Ireland claim it'],
    correctAnswer: 'Both Scotland and Ireland claim it',
    category: 'distilling',
    difficulty: 'medium',
    funFact: 'The word "whiskey" comes from the Gaelic "uisce beatha" meaning "water of life."'
  },
  {
    id: 'd3',
    question: 'What gives bourbon its characteristic flavor?',
    options: ['The water', 'New charred oak barrels', 'The yeast', 'Corn mash'],
    correctAnswer: 'New charred oak barrels',
    category: 'distilling',
    difficulty: 'medium',
    funFact: 'By law, bourbon must be aged in new charred oak barrels, which is why bourbon barrels are often sold to scotch and rum producers.'
  },
  {
    id: 'd4',
    question: 'What is the "angel\'s share" in whiskey production?',
    options: ['The first pour', 'Alcohol lost to evaporation', 'The best barrel', 'A tasting ceremony'],
    correctAnswer: 'Alcohol lost to evaporation',
    category: 'distilling',
    difficulty: 'medium',
    funFact: 'In Scotland, about 2% of maturing whisky evaporates each year. In hotter climates like Kentucky, it can be 4-5%.'
  },
  // Spirits Knowledge
  {
    id: 's1',
    question: 'What spirit is made from the blue agave plant?',
    options: ['Mezcal', 'Tequila', 'Pulque', 'Raicilla'],
    correctAnswer: 'Tequila',
    category: 'spirits',
    difficulty: 'easy',
    funFact: 'Tequila can only be produced in specific regions of Mexico, primarily Jalisco.'
  },
  {
    id: 's2',
    question: 'What is the main ingredient in rum?',
    options: ['Wheat', 'Sugarcane', 'Corn', 'Barley'],
    correctAnswer: 'Sugarcane',
    category: 'spirits',
    difficulty: 'easy',
    funFact: 'Rum can be made from fresh sugarcane juice (rhum agricole) or molasses.'
  },
  {
    id: 's3',
    question: 'Which spirit must be made from at least 51% corn?',
    options: ['Tennessee Whiskey', 'Bourbon', 'Rye Whiskey', 'Corn Whiskey'],
    correctAnswer: 'Bourbon',
    category: 'spirits',
    difficulty: 'medium',
    funFact: 'Despite what many think, bourbon can be made anywhere in the United States, not just Kentucky.'
  },
  {
    id: 's4',
    question: 'What is the traditional base ingredient for vodka in Russia?',
    options: ['Potatoes', 'Wheat', 'Rye', 'Corn'],
    correctAnswer: 'Wheat',
    category: 'spirits',
    difficulty: 'hard',
    funFact: 'While potato vodka is famous, most Russian vodka is actually made from wheat or rye.'
  },
  {
    id: 's5',
    question: 'What gives gin its distinctive flavor?',
    options: ['Botanicals', 'Aging in oak', 'Sugar', 'Yeast'],
    correctAnswer: 'Botanicals',
    category: 'spirits',
    difficulty: 'easy',
    funFact: 'Juniper berries are the only required botanical in gin, but most gins use 10-15 different botanicals.'
  },
  // Cocktails
  {
    id: 'c1',
    question: 'What cocktail was allegedly invented at the Raffles Hotel in Singapore?',
    options: ['Mai Tai', 'Singapore Sling', 'Zombie', 'Pina Colada'],
    correctAnswer: 'Singapore Sling',
    category: 'cocktails',
    difficulty: 'medium',
    funFact: 'The Singapore Sling was created by bartender Ngiam Tong Boon around 1915.'
  },
  {
    id: 'c2',
    question: 'Which cocktail is traditionally made with bourbon, sugar, water, and mint?',
    options: ['Old Fashioned', 'Mint Julep', 'Whiskey Sour', 'Manhattan'],
    correctAnswer: 'Mint Julep',
    category: 'cocktails',
    difficulty: 'easy',
    funFact: 'The Mint Julep has been the official drink of the Kentucky Derby since 1938.'
  },
  {
    id: 'c3',
    question: 'What does "on the rocks" mean?',
    options: ['Shaken hard', 'Served with ice', 'With salt', 'Chilled without ice'],
    correctAnswer: 'Served with ice',
    category: 'cocktails',
    difficulty: 'easy',
    funFact: 'The term dates back to the 1940s in American bar culture.'
  },
  // Culture
  {
    id: 'cu1',
    question: 'What is a "dram" in whisky terminology?',
    options: ['A type of glass', 'A small drink', 'A distillery', 'A region'],
    correctAnswer: 'A small drink',
    category: 'culture',
    difficulty: 'easy',
    funFact: 'Dram is a Scottish term that traditionally meant a small amount of whisky, usually about 1.5 oz.'
  },
  {
    id: 'cu2',
    question: 'What is the proper way to taste whisky?',
    options: ['Shoot it quickly', 'Add ice first', 'Nose, sip, evaluate', 'Mix with cola'],
    correctAnswer: 'Nose, sip, evaluate',
    category: 'culture',
    difficulty: 'medium',
    funFact: 'Professional tasters often add a few drops of water to open up the whisky\'s flavors.'
  },
  {
    id: 'cu3',
    question: 'What is "cask strength" whisky?',
    options: ['Aged 20+ years', 'Bottled at barrel proof', 'Made from single barrel', 'Double distilled'],
    correctAnswer: 'Bottled at barrel proof',
    category: 'culture',
    difficulty: 'medium',
    funFact: 'Most whisky is diluted before bottling. Cask strength can be 50-65% ABV or higher.'
  }
]

const CATEGORY_INFO = {
  prohibition: { name: 'Prohibition Era', icon: '🚫', color: 'from-red-600 to-red-800' },
  distilling: { name: 'Distilling History', icon: '🏭', color: 'from-amber-600 to-amber-800' },
  spirits: { name: 'Spirits Knowledge', icon: '🥃', color: 'from-orange-600 to-orange-800' },
  cocktails: { name: 'Cocktail History', icon: '🍸', color: 'from-purple-600 to-purple-800' },
  culture: { name: 'Drinking Culture', icon: '🎩', color: 'from-emerald-600 to-emerald-800' }
}

const ACHIEVEMENTS = [
  { id: 'first_answer', name: 'First Sip', description: 'Answer your first question', icon: '🍷' },
  { id: 'prohibition_expert', name: 'Prohibition Expert', description: 'Get 5 prohibition questions right', icon: '🚫' },
  { id: 'streak_5', name: 'On Fire', description: 'Get 5 correct in a row', icon: '🔥' },
  { id: 'perfect_round', name: 'Perfect Pour', description: 'Complete a round with 100%', icon: '💯' },
  { id: 'historian', name: 'Spirits Historian', description: 'Answer 50 questions', icon: '📚' }
]

export default function SpiritsHistoryTrivia() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'result' | 'gameOver'>('menu')
  const [currentQuestion, setCurrentQuestion] = useState<TriviaQuestion | null>(null)
  const [questionIndex, setQuestionIndex] = useState<number>(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [score, setScore] = useState<number>(0)
  const [streak, setStreak] = useState<number>(0)
  const [timer, setTimer] = useState<number>(0)
  const [questionsAnswered, setQuestionsAnswered] = useState<number>(0)
  const [correctAnswers, setCorrectAnswers] = useState<number>(0)
  const [prohibitionCorrect, setProhibitionCorrect] = useState<number>(0)
  const [highScore, setHighScore] = useState<number>(0)
  const [achievements, setAchievements] = useState<string[]>([])
  const [newAchievement, setNewAchievement] = useState<string | null>(null)
  const [shuffledQuestions, setShuffledQuestions] = useState<TriviaQuestion[]>([])
  const [showFunFact, setShowFunFact] = useState<boolean>(false)
  const QUESTIONS_PER_ROUND = 10

  useEffect(() => {
    const saved = localStorage.getItem('spirits-trivia-data')
    if (saved) {
      const data = JSON.parse(saved)
      setHighScore(data.highScore || 0)
      setAchievements(data.achievements || [])
      setQuestionsAnswered(data.questionsAnswered || 0)
    }
  }, [])

  const saveData = useCallback(() => {
    localStorage.setItem('spirits-trivia-data', JSON.stringify({
      highScore, achievements, questionsAnswered
    }))
  }, [highScore, achievements, questionsAnswered])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (gameState === 'playing' && !selectedAnswer) {
      interval = setInterval(() => setTimer(t => t + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [gameState, selectedAnswer])

  const unlockAchievement = (id: string) => {
    if (!achievements.includes(id)) {
      setAchievements(prev => [...prev, id])
      setNewAchievement(id)
      setTimeout(() => setNewAchievement(null), 3000)
    }
  }

  const startGame = () => {
    const shuffled = [...TRIVIA_QUESTIONS].sort(() => Math.random() - 0.5)
    setShuffledQuestions(shuffled)
    setQuestionIndex(0)
    setCurrentQuestion(shuffled[0])
    setScore(0)
    setStreak(0)
    setTimer(0)
    setCorrectAnswers(0)
    setProhibitionCorrect(0)
    setSelectedAnswer(null)
    setShowFunFact(false)
    setGameState('playing')
  }

  const handleAnswer = (answer: string) => {
    if (selectedAnswer) return
    
    setSelectedAnswer(answer)
    const isCorrect = answer === currentQuestion?.correctAnswer
    
    if (isCorrect) {
      const timeBonus = Math.max(0, 30 - timer) * 5
      const streakBonus = streak * 20
      const difficultyBonus = currentQuestion?.difficulty === 'hard' ? 50 : currentQuestion?.difficulty === 'medium' ? 25 : 0
      const points = 100 + timeBonus + streakBonus + difficultyBonus
      
      setScore(s => s + points)
      setStreak(s => s + 1)
      setCorrectAnswers(c => c + 1)
      
      if (currentQuestion?.category === 'prohibition') {
        setProhibitionCorrect(p => {
          const newCount = p + 1
          if (newCount >= 5) unlockAchievement('prohibition_expert')
          return newCount
        })
      }
      
      if (streak + 1 >= 5) unlockAchievement('streak_5')
    } else {
      setStreak(0)
    }
    
    setQuestionsAnswered(q => {
      const newCount = q + 1
      if (newCount >= 50) unlockAchievement('historian')
      return newCount
    })
    
    if (!achievements.includes('first_answer')) {
      unlockAchievement('first_answer')
    }
    
    setGameState('result')
  }

  const nextQuestion = () => {
    const nextIndex = questionIndex + 1
    
    if (nextIndex >= QUESTIONS_PER_ROUND || nextIndex >= shuffledQuestions.length) {
      // Game over
      if (correctAnswers === QUESTIONS_PER_ROUND) {
        unlockAchievement('perfect_round')
      }
      if (score > highScore) {
        setHighScore(score)
      }
      saveData()
      setGameState('gameOver')
    } else {
      setQuestionIndex(nextIndex)
      setCurrentQuestion(shuffledQuestions[nextIndex])
      setSelectedAnswer(null)
      setShowFunFact(false)
      setTimer(0)
      setGameState('playing')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-900 via-amber-900 to-stone-900">
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
            <BookOpen className="w-6 h-6 text-amber-400" />
            Spirits History Trivia
          </h1>
          <div className="text-amber-400 font-bold">High Score: {highScore.toLocaleString()}</div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {gameState === 'menu' && (
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-white">🥃 Spirits History Trivia</h2>
              <p className="text-white/70 text-lg">Test your knowledge of alcohol history, from Prohibition to modern craft distilling!</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(CATEGORY_INFO).map(([key, info]) => (
                <div key={key} className={`bg-gradient-to-br ${info.color} rounded-lg p-4 text-center`}>
                  <div className="text-3xl mb-2">{info.icon}</div>
                  <div className="text-white text-xs">{info.name}</div>
                </div>
              ))}
            </div>

            <button
              onClick={startGame}
              className="px-12 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold text-xl rounded-xl hover:scale-105 transition-transform shadow-lg"
            >
              Start Trivia
            </button>

            <div className="bg-white/10 backdrop-blur rounded-xl p-6 max-w-md mx-auto">
              <h3 className="text-white font-bold mb-4">Your Stats</h3>
              <div className="grid grid-cols-2 gap-4 text-white">
                <div>
                  <div className="text-2xl font-bold text-amber-400">{questionsAnswered}</div>
                  <div className="text-sm opacity-70">Questions Answered</div>
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

        {(gameState === 'playing' || gameState === 'result') && currentQuestion && (
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
              <div className="text-white">Question {questionIndex + 1}/{QUESTIONS_PER_ROUND}</div>
              <div className="text-amber-400">🔥 Streak: {streak}</div>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-xl p-6 space-y-6">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${CATEGORY_INFO[currentQuestion.category].color}`}>
                <span>{CATEGORY_INFO[currentQuestion.category].icon}</span>
                <span className="text-white text-sm">{CATEGORY_INFO[currentQuestion.category].name}</span>
                <span className="text-white/70 text-xs">• {currentQuestion.difficulty}</span>
              </div>

              <h2 className="text-2xl font-bold text-white">{currentQuestion.question}</h2>

              <div className="grid grid-cols-1 gap-3">
                {currentQuestion.options.map((option) => {
                  const isSelected = selectedAnswer === option
                  const isCorrect = option === currentQuestion.correctAnswer
                  const showResult = gameState === 'result'
                  
                  return (
                    <button
                      key={option}
                      onClick={() => handleAnswer(option)}
                      disabled={gameState === 'result'}
                      className={`px-6 py-4 rounded-lg font-medium transition-all flex items-center justify-between text-left ${
                        showResult
                          ? isCorrect
                            ? 'bg-green-500 text-white'
                            : isSelected
                              ? 'bg-red-500 text-white'
                              : 'bg-white/10 text-white/50'
                          : 'bg-white/20 text-white hover:bg-white/30 hover:scale-102'
                      }`}
                    >
                      <span>{option}</span>
                      {showResult && isCorrect && <Check className="w-5 h-5" />}
                      {showResult && !isCorrect && isSelected && <X className="w-5 h-5" />}
                    </button>
                  )
                })}
              </div>

              {gameState === 'result' && (
                <div className="space-y-4">
                  <div className={`text-center text-2xl font-bold ${selectedAnswer === currentQuestion.correctAnswer ? 'text-green-400' : 'text-red-400'}`}>
                    {selectedAnswer === currentQuestion.correctAnswer ? '✅ Correct!' : '❌ Incorrect!'}
                  </div>

                  <button
                    onClick={() => setShowFunFact(!showFunFact)}
                    className="w-full py-3 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors flex items-center justify-center gap-2"
                  >
                    <Lightbulb className="w-5 h-5" />
                    {showFunFact ? 'Hide Fun Fact' : 'Show Fun Fact'}
                  </button>

                  {showFunFact && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                      <p className="text-white/90 text-sm italic">💡 {currentQuestion.funFact}</p>
                    </div>
                  )}

                  <button
                    onClick={nextQuestion}
                    className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-lg hover:scale-105 transition-transform"
                  >
                    {questionIndex + 1 >= QUESTIONS_PER_ROUND ? 'See Results' : 'Next Question →'}
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-center gap-2">
              {Array.from({ length: QUESTIONS_PER_ROUND }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    i < questionIndex
                      ? 'bg-amber-500'
                      : i === questionIndex
                        ? 'bg-white'
                        : 'bg-white/30'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {gameState === 'gameOver' && (
          <div className="text-center space-y-8 py-12">
            <div className="text-6xl">🏆</div>
            <h2 className="text-4xl font-bold text-white">Round Complete!</h2>

            <div className="bg-white/10 backdrop-blur rounded-xl p-8 max-w-md mx-auto space-y-4">
              <div className="flex justify-between text-white">
                <span>Correct Answers:</span>
                <span className="font-bold">{correctAnswers}/{QUESTIONS_PER_ROUND}</span>
              </div>
              <div className="flex justify-between text-white">
                <span>Accuracy:</span>
                <span className="font-bold">{Math.round((correctAnswers / QUESTIONS_PER_ROUND) * 100)}%</span>
              </div>
              <div className="border-t border-white/20 pt-4 flex justify-between text-amber-400 text-xl">
                <span>Final Score:</span>
                <span className="font-bold">{score.toLocaleString()}</span>
              </div>
              {score > highScore && (
                <div className="text-green-400 font-bold animate-pulse">🎉 New High Score!</div>
              )}
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={startGame}
                className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-lg hover:scale-105 transition-transform"
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
          <span>Learn while you play!</span>
          <span>CR AudioViz AI Games • Javari Spirits</span>
        </div>
      </footer>
    </div>
  )
}
