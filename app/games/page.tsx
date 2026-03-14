// app/games/page.tsx
// javari-games — Hub discovery page (server component)
// Saturday, March 14, 2026

import { Suspense } from 'react'
import Link from 'next/link'
import { Gamepad2, Zap, Trophy, Users, TrendingUp, Play } from 'lucide-react'

// Game catalog — all 81 games from the platform
const GAMES = [
  { id: 'anagram-gauntlet',   title: 'Anagram Gauntlet',   category: 'Word',    emoji: '🔤' },
  { id: 'blitz-draw',         title: 'Blitz Draw',         category: 'Creative',emoji: '🎨' },
  { id: 'bluff-tell',         title: 'Bluff & Tell',       category: 'Social',  emoji: '🃏' },
  { id: 'bullet-weave',       title: 'Bullet Weave',       category: 'Action',  emoji: '🚀' },
  { id: 'caption-this',       title: 'Caption This',       category: 'Creative',emoji: '💬' },
  { id: 'circuit-trace',      title: 'Circuit Trace',      category: 'Puzzle',  emoji: '⚡' },
  { id: 'color-match',        title: 'Color Match',        category: 'Puzzle',  emoji: '🎨' },
  { id: 'crypt-raider',       title: 'Crypt Raider',       category: 'Action',  emoji: '🏺' },
  { id: 'cryptic-cross',      title: 'Cryptic Cross',      category: 'Word',    emoji: '✏️' },
  { id: 'deck-duel',          title: 'Deck Duel',          category: 'Strategy',emoji: '🃏' },
  { id: 'definition-duel',    title: 'Definition Duel',    category: 'Word',    emoji: '📚' },
  { id: 'emoji-bingo',        title: 'Emoji Bingo',        category: 'Social',  emoji: '🎯' },
  { id: 'emoji-charades',     title: 'Emoji Charades',     category: 'Social',  emoji: '🎭' },
  { id: 'emoji-heist',        title: 'Emoji Heist',        category: 'Social',  emoji: '💰' },
  { id: 'factory-flow',       title: 'Factory Flow',       category: 'Strategy',emoji: '🏭' },
  { id: 'fast-math',          title: 'Fast Math',          category: 'Brain',   emoji: '🧮' },
  { id: 'finish-quote',       title: 'Finish the Quote',   category: 'Word',    emoji: '💭' },
  { id: 'flag-forge',         title: 'Flag Forge',         category: 'Trivia',  emoji: '🏳️' },
  { id: 'formula-fix',        title: 'Formula Fix',        category: 'Brain',   emoji: '🔬' },
  { id: 'geo-quick',          title: 'Geo Quick',          category: 'Trivia',  emoji: '🌍' },
  { id: 'geo-typo',           title: 'Geo Typo',           category: 'Trivia',  emoji: '🗺️' },
  { id: 'grapple-run',        title: 'Grapple Run',        category: 'Action',  emoji: '🧗' },
  { id: 'hex-conquest',       title: 'Hex Conquest',       category: 'Strategy',emoji: '⬡' },
  { id: 'island-count',       title: 'Island Count',       category: 'Puzzle',  emoji: '🏝️' },
  { id: 'kakuro',             title: 'Kakuro',             category: 'Puzzle',  emoji: '🔢' },
  { id: 'killer-sudoku',      title: 'Killer Sudoku',      category: 'Puzzle',  emoji: '🔢' },
  { id: 'lights-out',         title: 'Lights Out',         category: 'Puzzle',  emoji: '💡' },
  { id: 'memory-flip',        title: 'Memory Flip',        category: 'Brain',   emoji: '🃏' },
  { id: 'memory-labyrinth',   title: 'Memory Labyrinth',   category: 'Brain',   emoji: '🧩' },
  { id: 'micro-crossword',    title: 'Micro Crossword',    category: 'Word',    emoji: '📝' },
  { id: 'mirror-dash',        title: 'Mirror Dash',        category: 'Action',  emoji: '🪞' },
  { id: 'nano-colony',        title: 'Nano Colony',        category: 'Strategy',emoji: '🦠' },
  { id: 'nonogram',           title: 'Nonogram',           category: 'Puzzle',  emoji: '🎨' },
  { id: 'one-click-tag',      title: 'One Click Tag',      category: 'Reaction',emoji: '🎯' },
  { id: 'orbital-catch',      title: 'Orbital Catch',      category: 'Action',  emoji: '🪐' },
  { id: 'palette-pilot',      title: 'Palette Pilot',      category: 'Creative',emoji: '🎨' },
  { id: 'pathfinder',         title: 'Pathfinder',         category: 'Puzzle',  emoji: '🧭' },
  { id: 'pattern-prophet',    title: 'Pattern Prophet',    category: 'Brain',   emoji: '🔮' },
  { id: 'pixel-zoom',         title: 'Pixel Zoom',         category: 'Trivia',  emoji: '🔍' },
  { id: 'portal-putter',      title: 'Portal Putter',      category: 'Action',  emoji: '⛳' },
  { id: 'post-a-pic',         title: 'Post-a-Pic',         category: 'Creative',emoji: '📸' },
  { id: 'quick-poll-duel',    title: 'Quick Poll Duel',    category: 'Social',  emoji: '📊' },
  { id: 'quote-cipher',       title: 'Quote Cipher',       category: 'Word',    emoji: '🔐' },
  { id: 'reaction-streaks',   title: 'Reaction Streaks',   category: 'Reaction',emoji: '⚡' },
  { id: 'reaction-test',      title: 'Reaction Test',      category: 'Reaction',emoji: '⏱️' },
  { id: 'reflex-gauntlet',    title: 'Reflex Gauntlet',    category: 'Reaction',emoji: '🎯' },
  { id: 'relic-run',          title: 'Relic Run',          category: 'Action',  emoji: '🏃' },
  { id: 'rhythm-reactor',     title: 'Rhythm Reactor',     category: 'Music',   emoji: '🎵' },
  { id: 'riddle',             title: 'Riddle',             category: 'Brain',   emoji: '🧩' },
  { id: 'river-crossing',     title: 'River Crossing',     category: 'Puzzle',  emoji: '🌊' },
  { id: 'rogue-riddle',       title: 'Rogue Riddle',       category: 'Brain',   emoji: '🎲' },
  { id: 'rps',                title: 'Rock Paper Scissors',category: 'Social',  emoji: '✂️' },
  { id: 'rush-hour',          title: 'Rush Hour',          category: 'Puzzle',  emoji: '🚗' },
  { id: 'scramble-caption',   title: 'Scramble Caption',   category: 'Word',    emoji: '📝' },
  { id: 'signal-jam',         title: 'Signal Jam',         category: 'Action',  emoji: '📡' },
  { id: 'sound-bite',         title: 'Sound Bite',         category: 'Music',   emoji: '🎵' },
  { id: 'sound-match',        title: 'Sound Match',        category: 'Music',   emoji: '🎶' },
  { id: 'stacksmith',         title: 'Stacksmith',         category: 'Puzzle',  emoji: '🏗️' },
  { id: 'sticker-toss',       title: 'Sticker Toss',       category: 'Action',  emoji: '🎯' },
  { id: 'tap-dueler',         title: 'Tap Dueler',         category: 'Reaction',emoji: '👆' },
  { id: 'tap-race',           title: 'Tap Race',           category: 'Reaction',emoji: '🏎️' },
  { id: 'tetrio-logic',       title: 'Tetrio Logic',       category: 'Puzzle',  emoji: '🟦' },
  { id: 'time-splitter',      title: 'Time Splitter',      category: 'Action',  emoji: '⏰' },
  { id: 'tower-forge',        title: 'Tower Forge',        category: 'Strategy',emoji: '🏰' },
  { id: 'trivia-arena',       title: 'Trivia Arena',       category: 'Trivia',  emoji: '❓' },
  { id: 'trivia-blitz',       title: 'Trivia Blitz',       category: 'Trivia',  emoji: '⚡' },
  { id: 'two-truths',         title: 'Two Truths & a Lie', category: 'Social',  emoji: '🤔' },
  { id: 'vector-drift',       title: 'Vector Drift',       category: 'Action',  emoji: '🎮' },
  { id: 'vector-sniper',      title: 'Vector Sniper',      category: 'Action',  emoji: '🎯' },
  { id: 'wiki-trail',         title: 'Wiki Trail',         category: 'Brain',   emoji: '📖' },
  { id: 'word-ladder',        title: 'Word Ladder',        category: 'Word',    emoji: '🔤' },
  { id: 'word-snap',          title: 'Word Snap',          category: 'Word',    emoji: '⚡' },
  { id: 'word-snipe',         title: 'Word Snipe',         category: 'Word',    emoji: '🎯' },
  { id: 'would-you-rather',   title: 'Would You Rather',   category: 'Social',  emoji: '🤷' },
  { id: 'zoom-id',            title: 'Zoom ID',            category: 'Trivia',  emoji: '🔍' },
]

const CATEGORIES = ['All', 'Action', 'Brain', 'Creative', 'Music', 'Puzzle', 'Reaction', 'Social', 'Strategy', 'Trivia', 'Word']

export default function GamesHubPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="https://craudiovizai.com" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
              <span>← CR AudioViz AI</span>
            </a>
            <span className="text-gray-600">|</span>
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-6 h-6 text-purple-400" />
              <span className="text-xl font-bold">Javari Games</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors text-sm font-medium">
              <Trophy className="w-4 h-4" />
              My Stats
            </a>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-b from-purple-900/30 to-gray-950 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-purple-900/40 border border-purple-500/30 rounded-full px-4 py-2 text-purple-300 text-sm mb-6">
            <Zap className="w-4 h-4" />
            {GAMES.length}+ games • No install required
          </div>
          <h1 className="text-5xl font-black mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Play. Compete. Win.
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            An extensive collection of browser games — puzzles, action, trivia, word games and more.
            All free, all instant.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-1"><Play className="w-4 h-4 text-green-400" /> Instant play</span>
            <span className="flex items-center gap-1"><Users className="w-4 h-4 text-blue-400" /> Multiplayer</span>
            <span className="flex items-center gap-1"><TrendingUp className="w-4 h-4 text-purple-400" /> Leaderboards</span>
          </div>
        </div>
      </div>

      {/* Game Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">All Games</h2>
          <span className="text-gray-400 text-sm">{GAMES.length} games</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {GAMES.map(game => (
            <Link
              key={game.id}
              href={`/${game.id}`}
              className="group bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-purple-500/50 hover:bg-gray-800/50 transition-all duration-200 cursor-pointer"
            >
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{game.emoji}</div>
              <h3 className="font-semibold text-sm leading-tight mb-1 group-hover:text-purple-300 transition-colors">
                {game.title}
              </h3>
              <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                {game.category}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800 py-8 px-4 text-center text-sm text-gray-600">
        <p>Javari Games — part of the <a href="https://craudiovizai.com" className="text-purple-400 hover:underline">CR AudioViz AI</a> ecosystem</p>
        <p className="mt-1">© 2026 CR AudioViz AI, LLC · EIN 39-3646201 · Fort Myers, FL</p>
      </div>
    </main>
  )
}
