'use client'

import { useState } from 'react'
import {
  Play, Pause, Maximize, Minimize, Volume2, VolumeX, Settings,
  Heart, Share2, Flag, MessageSquare, Trophy, Star, Users,
  ChevronLeft, ChevronRight, Zap, Clock, Award, ThumbsUp
} from 'lucide-react'

interface GameData {
  id: string
  title: string
  developer: string
  category: string
  rating: number
  totalRatings: number
  plays: number
  favorites: number
  description: string
  controls: string[]
  tags: string[]
  multiplayer: boolean
  achievements: Achievement[]
  leaderboard: LeaderboardEntry[]
  relatedGames: RelatedGame[]
}

interface Achievement {
  id: string
  name: string
  icon: string
  description: string
  unlocked: boolean
  progress?: number
  total?: number
}

interface LeaderboardEntry {
  rank: number
  player: string
  avatar: string
  score: number
  date: string
}

interface RelatedGame {
  id: string
  title: string
  thumbnail: string
  rating: number
}

const SAMPLE_GAME: GameData = {
  id: '1',
  title: 'Neon Runner',
  developer: 'CRAV Studios',
  category: 'Action',
  rating: 4.8,
  totalRatings: 12500,
  plays: 125000,
  favorites: 8900,
  description: 'Fast-paced endless runner set in a neon-lit cyberpunk city. Dodge obstacles, collect power-ups, and compete for the highest score on the global leaderboard.',
  controls: ['Arrow Keys or WASD to move', 'Space to jump', 'Shift to slide', 'P to pause'],
  tags: ['endless runner', 'arcade', 'cyberpunk', 'fast-paced'],
  multiplayer: false,
  achievements: [
    { id: '1', name: 'First Steps', icon: '👟', description: 'Complete your first run', unlocked: true },
    { id: '2', name: 'Speed Demon', icon: '⚡', description: 'Reach 100 km/h', unlocked: true },
    { id: '3', name: 'Collector', icon: '💎', description: 'Collect 1000 gems', unlocked: false, progress: 650, total: 1000 },
    { id: '4', name: 'Marathon', icon: '🏃', description: 'Run 10km total', unlocked: false, progress: 7200, total: 10000 },
    { id: '5', name: 'Perfect Run', icon: '🌟', description: 'Complete a run without hitting obstacles', unlocked: false },
  ],
  leaderboard: [
    { rank: 1, player: 'NeonMaster', avatar: '🥇', score: 2456789, date: '2 hours ago' },
    { rank: 2, player: 'CyberRunner', avatar: '🥈', score: 2345678, date: '5 hours ago' },
    { rank: 3, player: 'SpeedKing', avatar: '🥉', score: 2234567, date: '1 day ago' },
    { rank: 4, player: 'PixelPro', avatar: '👤', score: 2123456, date: '1 day ago' },
    { rank: 5, player: 'GameWizard', avatar: '👤', score: 2012345, date: '2 days ago' },
  ],
  relatedGames: [
    { id: '2', title: 'Cyber Dash', thumbnail: '🏃', rating: 4.6 },
    { id: '3', title: 'Neon Drift', thumbnail: '🏎️', rating: 4.7 },
    { id: '4', title: 'Pixel Runner', thumbnail: '👾', rating: 4.4 },
  ]
}

export default function GamePlayerInterface() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const [activeTab, setActiveTab] = useState<'about' | 'achievements' | 'leaderboard'>('about')
  const [userRating, setUserRating] = useState(0)

  const game = SAMPLE_GAME

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <button className="flex items-center gap-2 text-gray-400 hover:text-white">
        <ChevronLeft className="w-5 h-5" /> Back to Games
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Player Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Game Canvas */}
          <div className={`relative bg-gray-900 rounded-xl overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : 'aspect-video'}`}>
            {/* Game iframe/canvas would go here */}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-pink-900/50">
              {!isPlaying ? (
                <button
                  onClick={() => setIsPlaying(true)}
                  className="px-8 py-4 bg-purple-600 hover:bg-purple-700 rounded-xl font-bold text-lg flex items-center gap-3 transition-transform hover:scale-105"
                >
                  <Play className="w-6 h-6" /> Play Now
                </button>
              ) : (
                <div className="text-center">
                  <p className="text-6xl mb-4">🎮</p>
                  <p className="text-gray-400">Game is running...</p>
                </div>
              )}
            </div>

            {/* Game Controls Overlay */}
            {isPlaying && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPlaying(false)}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-lg"
                    >
                      <Pause className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-lg"
                    >
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                  </div>
                  <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg"
                  >
                    {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Game Info Bar */}
          <div className="flex items-center justify-between bg-gray-900 rounded-xl border border-gray-700 p-4">
            <div>
              <h1 className="text-xl font-bold">{game.title}</h1>
              <p className="text-sm text-gray-400">by {game.developer}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsFavorited(!isFavorited)}
                className={`p-2 rounded-lg ${isFavorited ? 'bg-red-500/20 text-red-400' : 'bg-gray-800 text-gray-400'}`}
              >
                <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
              </button>
              <button className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg">
                <Share2 className="w-5 h-5 text-gray-400" />
              </button>
              <button className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg">
                <Flag className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {[
              { id: 'about', label: 'About', icon: MessageSquare },
              { id: 'achievements', label: 'Achievements', icon: Trophy },
              { id: 'leaderboard', label: 'Leaderboard', icon: Award },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  activeTab === tab.id ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'about' && (
            <div className="bg-gray-900 rounded-xl border border-gray-700 p-4 space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-gray-400">{game.description}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Controls</h3>
                <ul className="space-y-1">
                  {game.controls.map((control, i) => (
                    <li key={i} className="text-sm text-gray-400 flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full" />
                      {control}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {game.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-gray-800 text-sm rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'achievements' && (
            <div className="bg-gray-900 rounded-xl border border-gray-700 p-4">
              <div className="space-y-3">
                {game.achievements.map(achievement => (
                  <div
                    key={achievement.id}
                    className={`p-3 rounded-lg flex items-center gap-4 ${
                      achievement.unlocked ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-gray-800'
                    }`}
                  >
                    <span className="text-3xl">{achievement.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{achievement.name}</h4>
                        {achievement.unlocked && <span className="text-green-400 text-xs">✓ Unlocked</span>}
                      </div>
                      <p className="text-sm text-gray-400">{achievement.description}</p>
                      {achievement.progress !== undefined && !achievement.unlocked && (
                        <div className="mt-2">
                          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full"
                              style={{ width: `${(achievement.progress / (achievement.total || 1)) * 100}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{achievement.progress} / {achievement.total}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="text-left p-4">Rank</th>
                    <th className="text-left p-4">Player</th>
                    <th className="text-right p-4">Score</th>
                    <th className="text-right p-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {game.leaderboard.map(entry => (
                    <tr key={entry.rank} className="hover:bg-gray-800/50">
                      <td className="p-4">
                        <span className="text-2xl">{entry.avatar}</span>
                      </td>
                      <td className="p-4 font-medium">{entry.player}</td>
                      <td className="p-4 text-right font-mono text-purple-400">{entry.score.toLocaleString()}</td>
                      <td className="p-4 text-right text-sm text-gray-400">{entry.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Stats */}
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-4">
            <h3 className="font-semibold mb-4">Game Stats</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" /> Rating
                </span>
                <span className="font-medium">{game.rating} ({(game.totalRatings / 1000).toFixed(1)}K)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 flex items-center gap-2">
                  <Play className="w-4 h-4" /> Plays
                </span>
                <span className="font-medium">{(game.plays / 1000).toFixed(0)}K</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 flex items-center gap-2">
                  <Heart className="w-4 h-4" /> Favorites
                </span>
                <span className="font-medium">{(game.favorites / 1000).toFixed(1)}K</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Category
                </span>
                <span className="font-medium">{game.category}</span>
              </div>
            </div>
          </div>

          {/* Rate This Game */}
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-4">
            <h3 className="font-semibold mb-3">Rate This Game</h3>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setUserRating(star)}
                  className="p-1"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= userRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'
                    }`}
                  />
                </button>
              ))}
            </div>
            {userRating > 0 && (
              <p className="text-sm text-green-400 mt-2">Thanks for rating!</p>
            )}
          </div>

          {/* Related Games */}
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-4">
            <h3 className="font-semibold mb-4">Related Games</h3>
            <div className="space-y-3">
              {game.relatedGames.map(related => (
                <div key={related.id} className="flex items-center gap-3 p-2 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700">
                  <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center text-2xl">
                    {related.thumbnail}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{related.title}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> {related.rating}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
