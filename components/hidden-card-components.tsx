'use client';

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// TYPES
// ============================================================================

interface HiddenCard {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
  category: string;
  series: string;
  imageUrl: string;
  backgroundGradient: string;
  glowColor: string;
  xpReward: number;
  creditReward: number;
  isSecret: boolean;
  discoveryHint?: string;
  unlockCondition?: string;
  maxSupply?: number;
  currentSupply?: number;
}

interface UserCardProgress {
  discoveredCards: string[];
  totalXP: number;
  totalCredits: number;
  discoveryHistory: Array<{
    cardId: string;
    discoveredAt: string;
    location: string;
  }>;
}

interface CardDiscoveryContextType {
  userProgress: UserCardProgress;
  discoverCard: (cardId: string, location: string) => Promise<boolean>;
  hasDiscovered: (cardId: string) => boolean;
  showDiscoveryModal: boolean;
  discoveredCard: HiddenCard | null;
  closeModal: () => void;
}

// ============================================================================
// RARITY STYLES - Gaming/Arcade Theme
// ============================================================================

const RARITY_STYLES = {
  common: {
    border: 'border-gray-500',
    bg: 'bg-gray-800/50',
    glow: '',
    text: 'text-gray-400',
    badge: 'bg-gray-700 text-gray-300'
  },
  uncommon: {
    border: 'border-green-500',
    bg: 'bg-green-900/40',
    glow: 'shadow-[0_0_15px_rgba(34,197,94,0.4)]',
    text: 'text-green-400',
    badge: 'bg-green-900 text-green-300'
  },
  rare: {
    border: 'border-blue-500',
    bg: 'bg-blue-900/40',
    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.5)]',
    text: 'text-blue-400',
    badge: 'bg-blue-900 text-blue-300'
  },
  epic: {
    border: 'border-purple-500',
    bg: 'bg-purple-900/40',
    glow: 'shadow-[0_0_25px_rgba(168,85,247,0.6)]',
    text: 'text-purple-400',
    badge: 'bg-purple-900 text-purple-300'
  },
  legendary: {
    border: 'border-yellow-400',
    bg: 'bg-yellow-900/40',
    glow: 'shadow-[0_0_30px_rgba(250,204,21,0.7)]',
    text: 'text-yellow-400',
    badge: 'bg-yellow-900 text-yellow-300'
  },
  mythic: {
    border: 'border-pink-400',
    bg: 'bg-gradient-to-br from-pink-900/50 via-purple-900/50 to-cyan-900/50',
    glow: 'shadow-[0_0_40px_rgba(236,72,153,0.8)] animate-pulse',
    text: 'text-pink-300',
    badge: 'bg-gradient-to-r from-pink-900 to-purple-900 text-pink-200'
  }
};

// ============================================================================
// HIDDEN CARDS DATABASE - Gaming/Arcade Theme
// ============================================================================

export const GAMES_HIDDEN_CARDS: HiddenCard[] = [
  // ============================================
  // PLAYER ONE SERIES (10 cards) - First Steps
  // ============================================
  {
    id: 'player-001',
    name: 'Player One',
    description: 'Press START to begin your gaming journey.',
    rarity: 'common',
    category: 'starter',
    series: 'Player One Series',
    imageUrl: '/cards/player-one.png',
    backgroundGradient: 'from-cyan-600 via-blue-500 to-cyan-700',
    glowColor: 'rgba(6,182,212,0.4)',
    xpReward: 50,
    creditReward: 10,
    isSecret: false,
    discoveryHint: 'Start your first game'
  },
  {
    id: 'player-002',
    name: 'Arcade Initiate',
    description: 'You\'ve entered the arcade. The games await.',
    rarity: 'uncommon',
    category: 'starter',
    series: 'Player One Series',
    imageUrl: '/cards/arcade-initiate.png',
    backgroundGradient: 'from-purple-600 via-pink-500 to-purple-700',
    glowColor: 'rgba(168,85,247,0.4)',
    xpReward: 100,
    creditReward: 25,
    isSecret: false,
    discoveryHint: 'Play 5 different games'
  },
  {
    id: 'player-003',
    name: 'Quarter Master',
    description: 'In the old days, this would cost you a fortune.',
    rarity: 'rare',
    category: 'starter',
    series: 'Player One Series',
    imageUrl: '/cards/quarter-master.png',
    backgroundGradient: 'from-amber-600 via-yellow-500 to-amber-700',
    glowColor: 'rgba(245,158,11,0.5)',
    xpReward: 200,
    creditReward: 50,
    isSecret: false,
    discoveryHint: 'Play 25 games total'
  },

  // ============================================
  // HIGH SCORE HEROES (12 cards) - Achievement Based
  // ============================================
  {
    id: 'score-001',
    name: 'Point Collector',
    description: 'Every point counts. You\'re proving it.',
    rarity: 'common',
    category: 'score',
    series: 'High Score Heroes',
    imageUrl: '/cards/point-collector.png',
    backgroundGradient: 'from-green-600 via-emerald-500 to-green-700',
    glowColor: 'rgba(34,197,94,0.4)',
    xpReward: 75,
    creditReward: 20,
    isSecret: false,
    discoveryHint: 'Score 1,000 total points'
  },
  {
    id: 'score-002',
    name: 'Score Warrior',
    description: 'Your scores speak for themselves.',
    rarity: 'uncommon',
    category: 'score',
    series: 'High Score Heroes',
    imageUrl: '/cards/score-warrior.png',
    backgroundGradient: 'from-orange-600 via-red-500 to-orange-700',
    glowColor: 'rgba(249,115,22,0.4)',
    xpReward: 150,
    creditReward: 40,
    isSecret: false,
    discoveryHint: 'Score 10,000 total points'
  },
  {
    id: 'score-003',
    name: 'Leaderboard Legend',
    description: 'Your name is etched in digital glory.',
    rarity: 'epic',
    category: 'score',
    series: 'High Score Heroes',
    imageUrl: '/cards/leaderboard-legend.png',
    backgroundGradient: 'from-yellow-500 via-amber-400 to-yellow-600',
    glowColor: 'rgba(234,179,8,0.6)',
    xpReward: 350,
    creditReward: 85,
    isSecret: false,
    discoveryHint: 'Reach #1 on any leaderboard'
  },
  {
    id: 'score-004',
    name: 'Perfect Game',
    description: 'Flawless execution. Zero mistakes.',
    rarity: 'legendary',
    category: 'score',
    series: 'High Score Heroes',
    imageUrl: '/cards/perfect-game.png',
    backgroundGradient: 'from-rose-500 via-pink-400 to-rose-600',
    glowColor: 'rgba(244,63,94,0.7)',
    xpReward: 500,
    creditReward: 125,
    isSecret: false,
    discoveryHint: 'Complete any game with 100% accuracy'
  },

  // ============================================
  // DAILY GRIND SERIES (10 cards) - Streak Based
  // ============================================
  {
    id: 'daily-001',
    name: 'Daily Gamer',
    description: 'One day down, infinite to go.',
    rarity: 'common',
    category: 'streak',
    series: 'Daily Grind',
    imageUrl: '/cards/daily-gamer.png',
    backgroundGradient: 'from-blue-600 via-indigo-500 to-blue-700',
    glowColor: 'rgba(59,130,246,0.3)',
    xpReward: 25,
    creditReward: 5,
    isSecret: false,
    discoveryHint: 'Play a game today'
  },
  {
    id: 'daily-002',
    name: 'Weekend Warrior',
    description: 'Three days strong. The grind continues.',
    rarity: 'uncommon',
    category: 'streak',
    series: 'Daily Grind',
    imageUrl: '/cards/weekend-warrior.png',
    backgroundGradient: 'from-violet-600 via-purple-500 to-violet-700',
    glowColor: 'rgba(139,92,246,0.4)',
    xpReward: 100,
    creditReward: 25,
    isSecret: false,
    discoveryHint: 'Play for 3 consecutive days'
  },
  {
    id: 'daily-003',
    name: 'Week Streak',
    description: 'Seven days of pure dedication.',
    rarity: 'rare',
    category: 'streak',
    series: 'Daily Grind',
    imageUrl: '/cards/week-streak.png',
    backgroundGradient: 'from-cyan-600 via-teal-500 to-cyan-700',
    glowColor: 'rgba(6,182,212,0.5)',
    xpReward: 200,
    creditReward: 50,
    isSecret: false,
    discoveryHint: 'Play for 7 consecutive days'
  },
  {
    id: 'daily-004',
    name: 'Fortnight Fighter',
    description: 'Two weeks of unwavering commitment.',
    rarity: 'epic',
    category: 'streak',
    series: 'Daily Grind',
    imageUrl: '/cards/fortnight-fighter.png',
    backgroundGradient: 'from-fuchsia-600 via-pink-500 to-fuchsia-700',
    glowColor: 'rgba(217,70,239,0.6)',
    xpReward: 350,
    creditReward: 85,
    isSecret: false,
    discoveryHint: 'Play for 14 consecutive days'
  },
  {
    id: 'daily-005',
    name: 'Monthly Master',
    description: 'A full month of gaming greatness.',
    rarity: 'legendary',
    category: 'streak',
    series: 'Daily Grind',
    imageUrl: '/cards/monthly-master.png',
    backgroundGradient: 'from-amber-500 via-yellow-400 to-amber-600',
    glowColor: 'rgba(245,158,11,0.7)',
    xpReward: 750,
    creditReward: 200,
    isSecret: false,
    discoveryHint: 'Play for 30 consecutive days'
  },

  // ============================================
  // GENRE GURU (15 cards) - Category Mastery
  // ============================================
  {
    id: 'genre-001',
    name: 'Puzzle Pro',
    description: 'Your mind is sharper than the puzzles.',
    rarity: 'uncommon',
    category: 'genre',
    series: 'Genre Guru',
    imageUrl: '/cards/puzzle-pro.png',
    backgroundGradient: 'from-blue-600 via-blue-500 to-blue-700',
    glowColor: 'rgba(59,130,246,0.4)',
    xpReward: 125,
    creditReward: 30,
    isSecret: false,
    discoveryHint: 'Complete 10 puzzle games'
  },
  {
    id: 'genre-002',
    name: 'Arcade Ace',
    description: 'Classic games, classic skills.',
    rarity: 'uncommon',
    category: 'genre',
    series: 'Genre Guru',
    imageUrl: '/cards/arcade-ace.png',
    backgroundGradient: 'from-red-600 via-orange-500 to-red-700',
    glowColor: 'rgba(239,68,68,0.4)',
    xpReward: 125,
    creditReward: 30,
    isSecret: false,
    discoveryHint: 'Complete 10 arcade games'
  },
  {
    id: 'genre-003',
    name: 'Card Shark',
    description: 'Every hand is a winning hand.',
    rarity: 'rare',
    category: 'genre',
    series: 'Genre Guru',
    imageUrl: '/cards/card-shark.png',
    backgroundGradient: 'from-emerald-600 via-green-500 to-emerald-700',
    glowColor: 'rgba(16,185,129,0.5)',
    xpReward: 175,
    creditReward: 45,
    isSecret: false,
    discoveryHint: 'Win 25 card games'
  },
  {
    id: 'genre-004',
    name: 'Word Wizard',
    description: 'Letters bend to your will.',
    rarity: 'rare',
    category: 'genre',
    series: 'Genre Guru',
    imageUrl: '/cards/word-wizard.png',
    backgroundGradient: 'from-violet-600 via-purple-500 to-violet-700',
    glowColor: 'rgba(139,92,246,0.5)',
    xpReward: 175,
    creditReward: 45,
    isSecret: false,
    discoveryHint: 'Complete 15 word games'
  },
  {
    id: 'genre-005',
    name: 'Trivia Titan',
    description: 'Knowledge is power. You have plenty.',
    rarity: 'epic',
    category: 'genre',
    series: 'Genre Guru',
    imageUrl: '/cards/trivia-titan.png',
    backgroundGradient: 'from-amber-600 via-yellow-500 to-amber-700',
    glowColor: 'rgba(245,158,11,0.6)',
    xpReward: 300,
    creditReward: 75,
    isSecret: false,
    discoveryHint: 'Answer 100 trivia questions correctly'
  },

  // ============================================
  // TIME TRAVELER (8 cards) - Time Played
  // ============================================
  {
    id: 'time-001',
    name: 'Casual Gamer',
    description: 'An hour well spent.',
    rarity: 'common',
    category: 'time',
    series: 'Time Traveler',
    imageUrl: '/cards/casual-gamer.png',
    backgroundGradient: 'from-slate-600 via-gray-500 to-slate-700',
    glowColor: 'rgba(100,116,139,0.3)',
    xpReward: 50,
    creditReward: 10,
    isSecret: false,
    discoveryHint: 'Play for 1 hour total'
  },
  {
    id: 'time-002',
    name: 'Dedicated Player',
    description: 'Five hours of focused gaming.',
    rarity: 'uncommon',
    category: 'time',
    series: 'Time Traveler',
    imageUrl: '/cards/dedicated-player.png',
    backgroundGradient: 'from-teal-600 via-cyan-500 to-teal-700',
    glowColor: 'rgba(20,184,166,0.4)',
    xpReward: 150,
    creditReward: 35,
    isSecret: false,
    discoveryHint: 'Play for 5 hours total'
  },
  {
    id: 'time-003',
    name: 'Gaming Enthusiast',
    description: '24 hours of pure entertainment.',
    rarity: 'epic',
    category: 'time',
    series: 'Time Traveler',
    imageUrl: '/cards/gaming-enthusiast.png',
    backgroundGradient: 'from-indigo-600 via-blue-500 to-indigo-700',
    glowColor: 'rgba(99,102,241,0.6)',
    xpReward: 400,
    creditReward: 100,
    isSecret: false,
    discoveryHint: 'Play for 24 hours total'
  },
  {
    id: 'time-004',
    name: 'Gaming Veteran',
    description: '100 hours. You\'ve seen it all.',
    rarity: 'legendary',
    category: 'time',
    series: 'Time Traveler',
    imageUrl: '/cards/gaming-veteran.png',
    backgroundGradient: 'from-rose-600 via-pink-500 to-rose-700',
    glowColor: 'rgba(225,29,72,0.7)',
    xpReward: 1000,
    creditReward: 250,
    isSecret: false,
    discoveryHint: 'Play for 100 hours total'
  },

  // ============================================
  // SECRET LEVEL (5 cards) - Easter Eggs
  // ============================================
  {
    id: 'secret-001',
    name: 'Konami Code Master',
    description: '↑↑↓↓←→←→BA - The legendary code.',
    rarity: 'legendary',
    category: 'secret',
    series: 'Secret Level',
    imageUrl: '/cards/konami-master.png',
    backgroundGradient: 'from-gray-900 via-red-800 to-gray-900',
    glowColor: 'rgba(239,68,68,0.8)',
    xpReward: 500,
    creditReward: 150,
    isSecret: true,
    unlockCondition: 'Enter the Konami code'
  },
  {
    id: 'secret-002',
    name: 'Midnight Gamer',
    description: 'The best games happen after midnight.',
    rarity: 'epic',
    category: 'secret',
    series: 'Secret Level',
    imageUrl: '/cards/midnight-gamer.png',
    backgroundGradient: 'from-indigo-900 via-purple-800 to-indigo-900',
    glowColor: 'rgba(99,102,241,0.6)',
    xpReward: 300,
    creditReward: 75,
    isSecret: true,
    unlockCondition: 'Play between midnight and 3 AM'
  },
  {
    id: 'secret-003',
    name: 'Easter Egg Hunter',
    description: 'You found what others missed.',
    rarity: 'rare',
    category: 'secret',
    series: 'Secret Level',
    imageUrl: '/cards/easter-egg-hunter.png',
    backgroundGradient: 'from-pink-600 via-fuchsia-500 to-pink-700',
    glowColor: 'rgba(236,72,153,0.5)',
    xpReward: 250,
    creditReward: 60,
    isSecret: true,
    unlockCondition: 'Click the hidden joystick icon'
  },
  {
    id: 'secret-004',
    name: 'Speed Demon',
    description: 'Fastest fingers in the arcade.',
    rarity: 'epic',
    category: 'secret',
    series: 'Secret Level',
    imageUrl: '/cards/speed-demon.png',
    backgroundGradient: 'from-orange-600 via-yellow-500 to-orange-700',
    glowColor: 'rgba(249,115,22,0.6)',
    xpReward: 400,
    creditReward: 100,
    isSecret: true,
    unlockCondition: 'Complete a game in under 30 seconds'
  },
  {
    id: 'secret-005',
    name: 'The Completionist',
    description: 'You\'ve collected them all. True mastery achieved.',
    rarity: 'mythic',
    category: 'secret',
    series: 'Secret Level',
    imageUrl: '/cards/completionist.png',
    backgroundGradient: 'from-pink-500 via-purple-500 to-cyan-500',
    glowColor: 'rgba(236,72,153,0.9)',
    xpReward: 2000,
    creditReward: 500,
    isSecret: true,
    unlockCondition: 'Collect all other cards',
    maxSupply: 25
  }
];

// ============================================================================
// CONTEXT PROVIDER
// ============================================================================

const CardDiscoveryContext = createContext<CardDiscoveryContextType | null>(null);

export function CardDiscoveryProvider({ children }: { children: React.ReactNode }) {
  const [userProgress, setUserProgress] = useState<UserCardProgress>({
    discoveredCards: [],
    totalXP: 0,
    totalCredits: 0,
    discoveryHistory: []
  });
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [discoveredCard, setDiscoveredCard] = useState<HiddenCard | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('javari-games-card-progress');
    if (saved) {
      try {
        setUserProgress(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse card progress:', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('javari-games-card-progress', JSON.stringify(userProgress));
  }, [userProgress]);

  const hasDiscovered = useCallback((cardId: string) => {
    return userProgress.discoveredCards.includes(cardId);
  }, [userProgress.discoveredCards]);

  const discoverCard = useCallback(async (cardId: string, location: string): Promise<boolean> => {
    if (hasDiscovered(cardId)) return false;

    const card = GAMES_HIDDEN_CARDS.find(c => c.id === cardId);
    if (!card) return false;

    setUserProgress(prev => ({
      ...prev,
      discoveredCards: [...prev.discoveredCards, cardId],
      totalXP: prev.totalXP + card.xpReward,
      totalCredits: prev.totalCredits + card.creditReward,
      discoveryHistory: [
        ...prev.discoveryHistory,
        {
          cardId,
          discoveredAt: new Date().toISOString(),
          location
        }
      ]
    }));

    setDiscoveredCard(card);
    setShowDiscoveryModal(true);

    return true;
  }, [hasDiscovered]);

  const closeModal = useCallback(() => {
    setShowDiscoveryModal(false);
    setDiscoveredCard(null);
  }, []);

  return (
    <CardDiscoveryContext.Provider
      value={{
        userProgress,
        discoverCard,
        hasDiscovered,
        showDiscoveryModal,
        discoveredCard,
        closeModal
      }}
    >
      {children}
      <AnimatePresence>
        {showDiscoveryModal && discoveredCard && (
          <CardDiscoveryModal card={discoveredCard} onClose={closeModal} />
        )}
      </AnimatePresence>
    </CardDiscoveryContext.Provider>
  );
}

export function useCardDiscovery() {
  const context = useContext(CardDiscoveryContext);
  if (!context) {
    throw new Error('useCardDiscovery must be used within CardDiscoveryProvider');
  }
  return context;
}

// ============================================================================
// DISCOVERY MODAL - Gaming Theme
// ============================================================================

function CardDiscoveryModal({ card, onClose }: { card: HiddenCard; onClose: () => void }) {
  const style = RARITY_STYLES[card.rarity];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.5, rotateY: 180, opacity: 0 }}
        animate={{ scale: 1, rotateY: 0, opacity: 1 }}
        exit={{ scale: 0.5, rotateY: -180, opacity: 0 }}
        transition={{ type: 'spring', duration: 0.8 }}
        className="relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Pixel particles */}
        <div className="absolute inset-0 -m-20 pointer-events-none">
          {[...Array(25)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                x: 0, 
                y: 0, 
                opacity: 1,
                scale: 0 
              }}
              animate={{ 
                x: (Math.random() - 0.5) * 350,
                y: (Math.random() - 0.5) * 350,
                opacity: 0,
                scale: Math.random() * 2 + 0.5
              }}
              transition={{ 
                duration: 1.5,
                delay: Math.random() * 0.3,
                ease: 'easeOut'
              }}
              className="absolute left-1/2 top-1/2 w-3 h-3"
              style={{ 
                backgroundColor: card.glowColor,
                clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
              }}
            />
          ))}
        </div>

        {/* Card */}
        <div
          className={`
            relative w-80 rounded-xl overflow-hidden
            ${style.border} border-4
            ${style.glow}
            bg-gradient-to-br ${card.backgroundGradient}
          `}
        >
          {/* Scanline effect */}
          <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none" />
          
          <div className="p-6 text-center relative">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: 'spring' }}
              className="text-6xl mb-4"
            >
              🎮
            </motion.div>

            <div className={`text-sm font-medium ${style.text} mb-1 font-mono`}>
              {card.series}
            </div>

            <h2 className="text-2xl font-bold text-white mb-2 font-mono tracking-wide">
              {card.name}
            </h2>

            <span className={`inline-block px-3 py-1 rounded text-xs font-bold uppercase ${style.badge} font-mono`}>
              {card.rarity}
            </span>

            <p className="text-white/80 text-sm my-4 font-mono">
              {card.description}
            </p>

            <div className="flex justify-center gap-6 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400 font-mono">+{card.xpReward}</div>
                <div className="text-xs text-white/60 font-mono">XP</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400 font-mono">+{card.creditReward}</div>
                <div className="text-xs text-white/60 font-mono">CREDITS</div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-lg transition-all font-mono uppercase tracking-wider"
            >
              COLLECT CARD
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// CARD DISPLAY COMPONENT
// ============================================================================

interface CardDisplayProps {
  card: HiddenCard;
  isDiscovered: boolean;
  showHint?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function HiddenCardDisplay({
  card,
  isDiscovered,
  showHint = false,
  onClick,
  size = 'md'
}: CardDisplayProps) {
  const style = RARITY_STYLES[card.rarity];
  
  const sizeClasses = {
    sm: 'w-32 h-44',
    md: 'w-48 h-64',
    lg: 'w-64 h-80'
  };

  if (!isDiscovered) {
    return (
      <div
        className={`
          ${sizeClasses[size]}
          rounded-lg border-2 border-dashed border-gray-700
          bg-gray-900/50 backdrop-blur-sm
          flex flex-col items-center justify-center
          cursor-pointer hover:border-purple-500/50 transition-all
        `}
        onClick={onClick}
      >
        <div className="text-4xl mb-2 opacity-30">🎮</div>
        <div className="text-gray-500 text-xs text-center px-2 font-mono">
          {card.isSecret ? '???' : 'LOCKED'}
        </div>
        {showHint && !card.isSecret && (
          <div className="mt-2 text-gray-600 text-xs text-center italic px-2 font-mono">
            {card.discoveryHint || 'Keep playing...'}
          </div>
        )}
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.98 }}
      className={`
        ${sizeClasses[size]}
        rounded-lg overflow-hidden
        ${style.border} border-2
        ${style.glow}
        bg-gradient-to-br ${card.backgroundGradient}
        cursor-pointer transition-all relative
      `}
      onClick={onClick}
    >
      {/* Scanline overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.05)_50%)] bg-[length:100%_4px] pointer-events-none" />
      
      <div className="h-full flex flex-col p-3 relative">
        <div className="text-center mb-2">
          <span className={`text-xs font-medium ${style.text} font-mono`}>
            {card.series}
          </span>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <span className="text-4xl">🎮</span>
        </div>
        
        <div className="text-center">
          <h3 className="text-white font-bold text-sm mb-1 line-clamp-2 font-mono">
            {card.name}
          </h3>
          <span className={`inline-block px-2 py-0.5 rounded text-xs ${style.badge} font-mono`}>
            {card.rarity}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// COLLECTION GRID
// ============================================================================

export function CardCollectionGrid() {
  const { userProgress, hasDiscovered } = useCardDiscovery();
  
  const cardsBySeries = GAMES_HIDDEN_CARDS.reduce((acc, card) => {
    if (!acc[card.series]) acc[card.series] = [];
    acc[card.series].push(card);
    return acc;
  }, {} as Record<string, HiddenCard[]>);

  const totalCards = GAMES_HIDDEN_CARDS.length;
  const discoveredCount = userProgress.discoveredCards.length;
  const progressPercent = Math.round((discoveredCount / totalCards) * 100);

  return (
    <div className="space-y-8">
      {/* Stats Header */}
      <div className="bg-gray-900/80 rounded-xl p-6 border border-purple-500/30 backdrop-blur">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-purple-100 font-mono">YOUR COLLECTION</h2>
          <div className="text-right">
            <div className="text-3xl font-bold text-green-400 font-mono">{discoveredCount}/{totalCards}</div>
            <div className="text-purple-400 text-sm font-mono">CARDS UNLOCKED</div>
          </div>
        </div>
        
        <div className="w-full bg-gray-800 rounded-full h-4 mb-2 border border-purple-500/30">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            className="bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 h-4 rounded-full"
          />
        </div>
        <div className="text-purple-300 text-sm text-center font-mono">{progressPercent}% COMPLETE</div>

        <div className="flex gap-6 mt-4 justify-center">
          <div className="text-center">
            <div className="text-xl font-bold text-green-400 font-mono">{userProgress.totalXP}</div>
            <div className="text-xs text-gray-400 font-mono">TOTAL XP</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-yellow-400 font-mono">{userProgress.totalCredits}</div>
            <div className="text-xs text-gray-400 font-mono">CREDITS</div>
          </div>
        </div>
      </div>

      {/* Cards by Series */}
      {Object.entries(cardsBySeries).map(([series, cards]) => {
        const seriesDiscovered = cards.filter(c => hasDiscovered(c.id)).length;
        
        return (
          <div key={series} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-purple-200 font-mono">{series}</h3>
              <span className="text-purple-400 text-sm font-mono">
                {seriesDiscovered}/{cards.length} UNLOCKED
              </span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {cards.map(card => (
                <HiddenCardDisplay
                  key={card.id}
                  card={card}
                  isDiscovered={hasDiscovered(card.id)}
                  showHint={true}
                  size="sm"
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// GAMING STATS TRACKER HOOK
// ============================================================================

export function useGameCardTriggers() {
  const { discoverCard, hasDiscovered } = useCardDiscovery();

  useEffect(() => {
    // Konami code listener
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let konamiIndex = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === konamiCode[konamiIndex]) {
        konamiIndex++;
        if (konamiIndex === konamiCode.length) {
          if (!hasDiscovered('secret-001')) {
            discoverCard('secret-001', 'konami-code');
          }
          konamiIndex = 0;
        }
      } else {
        konamiIndex = 0;
      }
    };

    // Midnight check
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 3 && !hasDiscovered('secret-002')) {
      discoverCard('secret-002', 'midnight-gaming');
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [discoverCard, hasDiscovered]);

  const trackGameStart = useCallback(() => {
    const gamesPlayed = parseInt(localStorage.getItem('javari-games-played') || '0') + 1;
    localStorage.setItem('javari-games-played', gamesPlayed.toString());

    if (gamesPlayed === 1 && !hasDiscovered('player-001')) {
      discoverCard('player-001', 'first-game');
    }
    if (gamesPlayed >= 25 && !hasDiscovered('player-003')) {
      discoverCard('player-003', 'quarter-master');
    }
  }, [discoverCard, hasDiscovered]);

  const trackScore = useCallback((points: number) => {
    const totalScore = parseInt(localStorage.getItem('javari-games-total-score') || '0') + points;
    localStorage.setItem('javari-games-total-score', totalScore.toString());

    if (totalScore >= 1000 && !hasDiscovered('score-001')) {
      discoverCard('score-001', 'score-1000');
    }
    if (totalScore >= 10000 && !hasDiscovered('score-002')) {
      discoverCard('score-002', 'score-10000');
    }
  }, [discoverCard, hasDiscovered]);

  const trackStreak = useCallback(() => {
    const lastPlay = localStorage.getItem('javari-games-last-play');
    const streak = parseInt(localStorage.getItem('javari-games-streak') || '0');
    const today = new Date().toDateString();
    
    if (lastPlay !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastPlay === yesterday.toDateString()) {
        const newStreak = streak + 1;
        localStorage.setItem('javari-games-streak', newStreak.toString());
        
        if (!hasDiscovered('daily-001')) discoverCard('daily-001', 'daily-play');
        if (newStreak >= 3 && !hasDiscovered('daily-002')) discoverCard('daily-002', 'streak-3');
        if (newStreak >= 7 && !hasDiscovered('daily-003')) discoverCard('daily-003', 'streak-7');
        if (newStreak >= 14 && !hasDiscovered('daily-004')) discoverCard('daily-004', 'streak-14');
        if (newStreak >= 30 && !hasDiscovered('daily-005')) discoverCard('daily-005', 'streak-30');
      } else {
        localStorage.setItem('javari-games-streak', '1');
        if (!hasDiscovered('daily-001')) discoverCard('daily-001', 'daily-play');
      }
      localStorage.setItem('javari-games-last-play', today);
    }
  }, [discoverCard, hasDiscovered]);

  return {
    trackGameStart,
    trackScore,
    trackStreak
  };
}

export default CardDiscoveryProvider;
