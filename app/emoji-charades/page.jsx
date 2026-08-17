'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Star, Trophy, Chrome as Home, RotateCcw } from 'lucide-react';
import { metrics } from '@/lib/metrics';

import AdSlot from '@/components/games/AdSlot';
import UpsellSidebar from '@/components/games/UpsellSidebar';
import PaywallGate from '@/components/games/PaywallGate';
import Leaderboard from '@/components/games/Leaderboard';
import { toast } from 'sonner';

const EMOJI_PUZZLES = [
  { id: 1, emojis: '🎬🦁👑', answer: 'lion king', category: 'movie' },
  { id: 2, emojis: '🏠🔥🐉', answer: 'house of dragon', category: 'tv' },
  { id: 3, emojis: '⭐🔥', answer: 'star fire', category: 'phrase' },
  { id: 4, emojis: '🌧️🌈', answer: 'rainbow', category: 'nature' },
  { id: 5, emojis: '🍎📱', answer: 'apple phone', category: 'tech' },
  { id: 6, emojis: '🎵🎤👑', answer: 'music king', category: 'phrase' },
  { id: 7, emojis: '🌙⭐', answer: 'moonstar', category: 'phrase' },
  { id: 8, emojis: '🔥🏔️', answer: 'fire mountain', category: 'nature' },
  { id: 9, emojis: '🎯🏹', answer: 'target arrow', category: 'game' },
  { id: 10, emojis: '🌊🏄', answer: 'wave surfing', category: 'sport' }
];

export default function EmojiCharades() {
  const [userSession] = useState({ userId: null, plan: "FREE" });
  const [gameState, setGameState] = useState('menu'); // menu, playing, finished
  const [currentPuzzle, setCurrentPuzzle] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [userAnswer, setUserAnswer] = useState('');
  const [streak, setStreak] = useState(0);
  const [isPremiumMode, setIsPremiumMode] = useState(false);

  useEffect(() => {
    let timer;
    if (gameState === 'playing' && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && gameState === 'playing') {
      endGame();
    }
    return () => clearTimeout(timer);
  }, [timeLeft, gameState]);

  const startGame = (premium = false) => {
    if (premium && userSession.plan === 'FREE') {
      toast.error('Premium mode requires Pro or Elite plan');
      return;
    }
    
    setIsPremiumMode(premium);
    setGameState('playing');
    setCurrentPuzzle(0);
    setScore(0);
    setTimeLeft(premium ? 90 : 60);
    setUserAnswer('');
    setStreak(0);
    
    metrics.playStarted('emoji-charades', userSession.userId);
  };

  const submitAnswer = () => {
    const puzzle = EMOJI_PUZZLES[currentPuzzle];
    const isCorrect = userAnswer.toLowerCase().trim() === puzzle.answer.toLowerCase();
    
    if (isCorrect) {
      const basePoints = 100;
      const streakBonus = isPremiumMode ? streak * 50 : streak * 25;
      const timeBonus = Math.floor(timeLeft / 10) * 10;
      const totalPoints = basePoints + streakBonus + timeBonus;
      
      setScore(score + totalPoints);
      setStreak(streak + 1);
      
      toast.success(`Correct! +${totalPoints} points`);
      
      if (currentPuzzle < EMOJI_PUZZLES.length - 1) {
        setCurrentPuzzle(currentPuzzle + 1);
        setUserAnswer('');
      } else {
        endGame();
      }
    } else {
      setStreak(0);
      toast.error('Try again!');
    }
  };

  const endGame = async () => {
    setGameState('finished');
    
    // Save score
    try {
      await fetch('/api/games/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: 'emoji-charades',
          score,
          userId: userSession.userId,
          name: 'Player'
        })
      });
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  };

  const resetGame = () => {
    setGameState('menu');
    setCurrentPuzzle(0);
    setScore(0);
    setTimeLeft(60);
    setUserAnswer('');
    setStreak(0);
    setIsPremiumMode(false);
  };

  if (gameState === 'menu') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3">
              <div className="mb-6">
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/games'}
                  className="mb-4"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Back to Games
                </Button>
                
                <h1 className="text-4xl font-bold mb-2">🎭 Emoji Charades</h1>
                <p className="text-gray-600">Guess the phrase, movie, or concept from emoji clues!</p>
              </div>

              <AdSlot position="banner" gameId="emoji-charades" className="mb-8" />

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-blue-600" />
                      Free Mode
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-4 text-sm">
                      <li>• 60 seconds to solve puzzles</li>
                      <li>• Basic scoring system</li>
                      <li>• Local leaderboard</li>
                      <li>• 10 emoji puzzles</li>
                    </ul>
                    <Button onClick={() => startGame(false)} className="w-full">
                      Play Free Mode
                    </Button>
                  </CardContent>
                </Card>

                <PaywallGate 
                  isBlocked={userSession.plan === 'FREE'}
                  requiredPlan="PRO"
                  feature="Premium Emoji Charades"
                  gameId="emoji-charades"
                >
                  <Card className="border-yellow-200 bg-yellow-50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-600" />
                        Premium Mode
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 mb-4 text-sm">
                        <li>• 90 seconds to solve puzzles</li>
                        <li>• 2x streak multiplier bonus</li>
                        <li>• Global leaderboard access</li>
                        <li>• Exclusive puzzle categories</li>
                      </ul>
                      <Button 
                        onClick={() => startGame(true)} 
                        className="w-full bg-yellow-600 hover:bg-yellow-700"
                      >
                        Play Premium Mode
                      </Button>
                    </CardContent>
                  </Card>
                </PaywallGate>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>How to Play</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <h4 className="font-semibold mb-2">1. Read the Emojis</h4>
                      <p className="text-gray-600">Look at the emoji sequence and think about what they represent together.</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">2. Type Your Guess</h4>
                      <p className="text-gray-600">Enter your answer in the text field. Don&apos;t worry about exact spelling!</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">3. Build Streaks</h4>
                      <p className="text-gray-600">Consecutive correct answers give bonus points. Premium mode doubles the bonus!</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <UpsellSidebar 
                userPlan={userSession.plan}
                gameId="emoji-charades"
                context="game_page"
              />
              
              <Leaderboard 
                gameId="emoji-charades"
                userPlan={userSession.plan}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'playing') {
    const puzzle = EMOJI_PUZZLES[currentPuzzle];
    const progress = ((currentPuzzle + 1) / EMOJI_PUZZLES.length) * 100;

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold">🎭 Emoji Charades</h1>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {timeLeft}s
                </Badge>
                <Badge className="bg-blue-600">
                  Score: {score.toLocaleString()}
                </Badge>
                {streak > 0 && (
                  <Badge className="bg-orange-600">
                    Streak: {streak}
                  </Badge>
                )}
              </div>
            </div>
            
            <Progress value={progress} className="mb-2" />
            <p className="text-sm text-gray-600">
              Puzzle {currentPuzzle + 1} of {EMOJI_PUZZLES.length}
            </p>
          </div>

          <Card className="mb-6">
            <CardContent className="p-8 text-center">
              <div className="text-8xl mb-6">{puzzle.emojis}</div>
              <Badge className="mb-4">{puzzle.category}</Badge>
              <div className="max-w-md mx-auto">
                <Input
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && submitAnswer()}
                  placeholder="Type your guess..."
                  className="text-center text-lg mb-4"
                  autoFocus
                />
                <Button onClick={submitAnswer} className="w-full" size="lg">
                  Submit Answer
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <Button variant="outline" onClick={resetGame}>
              <Home className="w-4 h-4 mr-2" />
              Back to Menu
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'finished') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="text-center">
            <CardHeader>
              <div className="text-6xl mb-4">🎉</div>
              <CardTitle className="text-3xl">Game Complete!</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-600 mb-4">
                {score.toLocaleString()} Points
              </div>
              
              <div className="grid md:grid-cols-3 gap-4 mb-8">
                <div>
                  <div className="text-2xl font-bold">{currentPuzzle + 1}</div>
                  <div className="text-gray-600">Puzzles Solved</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{streak}</div>
                  <div className="text-gray-600">Best Streak</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{isPremiumMode ? 'Premium' : 'Free'}</div>
                  <div className="text-gray-600">Mode Played</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button onClick={resetGame} size="lg">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Play Again
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/games'}
                  size="lg"
                >
                  <Home className="w-4 h-4 mr-2" />
                  More Games
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
}