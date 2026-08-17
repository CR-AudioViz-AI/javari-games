'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Star, Trophy, Chrome as Home, RotateCcw, Zap } from 'lucide-react';
import { metrics } from '@/lib/metrics';

import AdSlot from '@/components/games/AdSlot';
import UpsellSidebar from '@/components/games/UpsellSidebar';
import PaywallGate from '@/components/games/PaywallGate';
import Leaderboard from '@/components/games/Leaderboard';
import { toast } from 'sonner';

const generateProblem = (difficulty = 'easy') => {
  const operations = ['+', '-', '*'];
  const operation = operations[Math.floor(Math.random() * operations.length)];
  
  let num1, num2, answer;
  
  switch (difficulty) {
    case 'easy':
      num1 = Math.floor(Math.random() * 20) + 1;
      num2 = Math.floor(Math.random() * 20) + 1;
      break;
    case 'medium':
      num1 = Math.floor(Math.random() * 50) + 1;
      num2 = Math.floor(Math.random() * 50) + 1;
      break;
    case 'hard':
      num1 = Math.floor(Math.random() * 100) + 1;
      num2 = Math.floor(Math.random() * 100) + 1;
      break;
  }
  
  // Ensure subtraction doesn't go negative
  if (operation === '-' && num2 > num1) {
    [num1, num2] = [num2, num1];
  }
  
  switch (operation) {
    case '+':
      answer = num1 + num2;
      break;
    case '-':
      answer = num1 - num2;
      break;
    case '*':
      answer = num1 * num2;
      break;
  }
  
  return {
    question: `${num1} ${operation} ${num2}`,
    answer,
    difficulty
  };
};

export default function FastMath() {
  const [userSession] = useState({ userId: null, plan: "FREE" });
  const [gameState, setGameState] = useState('menu');
  const [currentProblem, setCurrentProblem] = useState(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [userAnswer, setUserAnswer] = useState('');
  const [streak, setStreak] = useState(0);
  const [problemsSolved, setProblemsSolved] = useState(0);
  const [difficulty, setDifficulty] = useState('easy');
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

  const startGame = (premium = false, selectedDifficulty = 'easy') => {
    if (premium && userSession.plan === 'FREE') {
      toast.error('Premium mode requires Pro or Elite plan');
      return;
    }
    
    setIsPremiumMode(premium);
    setDifficulty(selectedDifficulty);
    setGameState('playing');
    setScore(0);
    setTimeLeft(premium ? 90 : 60);
    setUserAnswer('');
    setStreak(0);
    setProblemsSolved(0);
    setCurrentProblem(generateProblem(selectedDifficulty));
    
    metrics.playStarted('fast-math', userSession.userId);
  };

  const submitAnswer = () => {
    const userNum = parseInt(userAnswer);
    const isCorrect = userNum === currentProblem.answer;
    
    if (isCorrect) {
      const basePoints = difficulty === 'easy' ? 50 : difficulty === 'medium' ? 100 : 150;
      const streakBonus = isPremiumMode ? streak * 25 : streak * 10;
      const speedBonus = timeLeft > 50 ? 50 : timeLeft > 30 ? 25 : 10;
      const totalPoints = basePoints + streakBonus + speedBonus;
      
      setScore(score + totalPoints);
      setStreak(streak + 1);
      setProblemsSolved(problemsSolved + 1);
      
      toast.success(`Correct! +${totalPoints} points`);
      
      // Generate next problem
      setCurrentProblem(generateProblem(difficulty));
      setUserAnswer('');
    } else {
      setStreak(0);
      toast.error(`Wrong! Answer was ${currentProblem.answer}`);
      
      // Generate next problem anyway
      setCurrentProblem(generateProblem(difficulty));
      setUserAnswer('');
    }
  };

  const endGame = async () => {
    setGameState('finished');
    
    try {
      await fetch('/api/games/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: 'fast-math',
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
    setCurrentProblem(null);
    setScore(0);
    setTimeLeft(60);
    setUserAnswer('');
    setStreak(0);
    setProblemsSolved(0);
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
                
                <h1 className="text-4xl font-bold mb-2">🧮 Fast Math</h1>
                <p className="text-gray-600">Solve math problems as quickly as possible!</p>
              </div>

              <AdSlot position="banner" gameId="fast-math" className="mb-8" />

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
                      <li>• 60 seconds of math problems</li>
                      <li>• Easy to medium difficulty</li>
                      <li>• Basic scoring system</li>
                      <li>• Local leaderboard</li>
                    </ul>
                    <div className="space-y-2">
                      <Button 
                        onClick={() => startGame(false, 'easy')} 
                        className="w-full"
                        variant="outline"
                      >
                        Easy Mode
                      </Button>
                      <Button 
                        onClick={() => startGame(false, 'medium')} 
                        className="w-full"
                      >
                        Medium Mode
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <PaywallGate 
                  isBlocked={userSession.plan === 'FREE'}
                  requiredPlan="PRO"
                  feature="Premium Fast Math"
                  gameId="fast-math"
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
                        <li>• 90 seconds of problems</li>
                        <li>• Hard difficulty available</li>
                        <li>• 2.5x streak multiplier</li>
                        <li>• Global leaderboard access</li>
                      </ul>
                      <div className="space-y-2">
                        <Button 
                          onClick={() => startGame(true, 'medium')} 
                          className="w-full bg-yellow-600 hover:bg-yellow-700"
                        >
                          Premium Medium
                        </Button>
                        <Button 
                          onClick={() => startGame(true, 'hard')} 
                          className="w-full bg-red-600 hover:bg-red-700"
                        >
                          <Zap className="w-4 h-4 mr-2" />
                          Hard Mode
                        </Button>
                      </div>
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
                      <h4 className="font-semibold mb-2">1. Solve Quickly</h4>
                      <p className="text-gray-600">Answer math problems as fast as possible. Speed gives bonus points!</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">2. Build Streaks</h4>
                      <p className="text-gray-600">Consecutive correct answers multiply your score. Premium mode has higher multipliers!</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">3. Choose Difficulty</h4>
                      <p className="text-gray-600">Harder problems give more points. Premium unlocks the hardest challenges!</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <UpsellSidebar 
                userPlan={userSession.plan}
                gameId="fast-math"
                context="game_page"
              />
              
              <Leaderboard 
                gameId="fast-math"
                userPlan={userSession.plan}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'playing') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold">🧮 Fast Math</h1>
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
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>Problems Solved: {problemsSolved}</span>
              <Badge className={
                difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }>
                {difficulty.toUpperCase()}
              </Badge>
            </div>
          </div>

          <Card className="mb-6">
            <CardContent className="p-8 text-center">
              <div className="text-6xl font-bold mb-6 font-mono">
                {currentProblem?.question}
              </div>
              <div className="max-w-md mx-auto">
                <Input
                  type="number"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && submitAnswer()}
                  placeholder="Enter answer..."
                  className="text-center text-2xl mb-4"
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
              <div className="text-6xl mb-4">🎯</div>
              <CardTitle className="text-3xl">Time&apos;s Up!</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-600 mb-4">
                {score.toLocaleString()} Points
              </div>
              
              <div className="grid md:grid-cols-3 gap-4 mb-8">
                <div>
                  <div className="text-2xl font-bold">{problemsSolved}</div>
                  <div className="text-gray-600">Problems Solved</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{streak}</div>
                  <div className="text-gray-600">Best Streak</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{difficulty}</div>
                  <div className="text-gray-600">Difficulty</div>
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