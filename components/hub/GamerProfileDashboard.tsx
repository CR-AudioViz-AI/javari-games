'use client'

import { useState } from 'react'
import {
  User, Trophy, Star, Clock, Gamepad2, Heart, Award,
  TrendingUp, Calendar, Settings, Share2, Edit2, ChevronRight,
  Zap, Target, Crown, Medal, Flame
} from 'lucide-react'

interface GamerProfile {
  username: string
  avatar: string
  level: number
  xp: number
  xpToNext: number
  memberSince: string
  totalPlayTime: number
  gamesPlayed: number
  achievements: number
  totalAchievements: number
  rank: string
  rankIcon: string
  streak: number
  favoriteCategory: string
}

interface RecentActivity {
  id: string
  type: 'play' | 'achievement' | 'highscore' | 'level'
  game?: string
  detail: string
  timestamp: string
  icon: string
}

interface GameStats {
  game: string
  thumbnail: string
  playTime: number
  highScore: number
  achievements: number
  totalAchievements: number
  lastPlayed: string
}

const PROFILE: GamerProfile = {
  username: 'NeonPlayer42',
  avatar: '🎮',
  level: 24,
  xp: 7450,
  xpToNext: 10000,
  memberSince: 'March 2024',
  totalPlayTime: 156,
  gamesPlayed: 47,
  achievements: 89,
  totalAchievements: 150,
  rank: 'Gold',
  rankIcon: '🥇',
  streak: 7,
  favoriteCategory: 'Action'
}

const RECENT_ACTIVITY: RecentActivity[] = [
  { id: '1', type: 'achievement', game: 'Neon Runner', detail: 'Unlocked "Speed Demon"', timestamp: '2 hours ago', icon: '🏆' },
  { id: '2', type: 'highscore', game: 'Block Puzzle', detail: 'New high score: 125,000', timestamp: '4 hours ago', icon: '⭐' },
  { id: '3', type: 'play', game: 'Space Blaster', detail: 'Played for 45 minutes', timestamp: 'Yesterday', icon: '🎮' },
  { id: '4', type: 'level', detail: 'Reached Level 24!', timestamp: '2 days ago', icon: '⬆️' },
  { id: '5', type: 'achievement', game: 'Turbo Drift', detail: 'Unlocked "Drift Master"', timestamp: '3 days ago', icon: '🏆' },
]

const GAME_STATS: GameStats[] = [
  { game: 'Neon Runner', thumbnail: '🏃', playTime: 42, highScore: 2456789, achievements: 12, totalAchievements: 15, lastPlayed: '2 hours ago' },
  { game: 'Block Puzzle Master', thumbnail: '🧱', playTime: 28, highScore: 125000, achievements: 8, totalAchievements: 12, lastPlayed: '4 hours ago' },
  { game: 'Space Blaster', thumbnail: '🚀', playTime: 35, highScore: 890000, achievements: 10, totalAchievements: 18, lastPlayed: 'Yesterday' },
  { game: 'Turbo Drift', thumbnail: '🏎️', playTime: 24, highScore: 345678, achievements: 6, totalAchievements: 10, lastPlayed: '3 days ago' },
]

const BADGES = [
  { id: '1', name: 'Early Adopter', icon: '🌟', description: 'Joined in the first month', earned: true },
  { id: '2', name: 'Achievement Hunter', icon: '🏆', description: 'Earn 50 achievements', earned: true },
  { id: '3', name: 'Dedicated Gamer', icon: '🎮', description: 'Play 100 hours total', earned: true },
  { id: '4', name: 'Social Butterfly', icon: '🦋', description: 'Add 10 friends', earned: false },
  { id: '5', name: 'Master Collector', icon: '💎', description: 'Unlock all achievements in 5 games', earned: false },
]

export default function GamerProfileDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'games' | 'achievements' | 'badges'>('overview')

  const xpProgress = (PROFILE.xp / PROFILE.xpToNext) * 100
  const achievementProgress = (PROFILE.achievements / PROFILE.totalAchievements) * 100

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center text-5xl">
              {PROFILE.avatar}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{PROFILE.username}</h1>
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm flex items-center gap-1">
                  {PROFILE.rankIcon} {PROFILE.rank}
                </span>
              </div>
              <p className="text-pink-200 mt-1">Level {PROFILE.level} • Member since {PROFILE.memberSince}</p>
              
              {/* XP Bar */}
              <div className="mt-3 w-64">
                <div className="flex items-center justify-between text-xs text-pink-200 mb-1">
                  <span>Level {PROFILE.level}</span>
                  <span>{PROFILE.xp.toLocaleString()} / {PROFILE.xpToNext.toLocaleString()} XP</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="p-2 bg-white/20 hover:bg-white/30 rounded-lg">
              <Share2 className="w-5 h-5" />
            </button>
            <button className="p-2 bg-white/20 hover:bg-white/30 rounded-lg">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <Flame className="w-5 h-5 mx-auto text-orange-300 mb-1" />
            <p className="text-xl font-bold text-white">{PROFILE.streak}</p>
            <p className="text-xs text-pink-200">Day Streak</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <Clock className="w-5 h-5 mx-auto text-blue-300 mb-1" />
            <p className="text-xl font-bold text-white">{PROFILE.totalPlayTime}h</p>
            <p className="text-xs text-pink-200">Play Time</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <Gamepad2 className="w-5 h-5 mx-auto text-green-300 mb-1" />
            <p className="text-xl font-bold text-white">{PROFILE.gamesPlayed}</p>
            <p className="text-xs text-pink-200">Games Played</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <Trophy className="w-5 h-5 mx-auto text-yellow-300 mb-1" />
            <p className="text-xl font-bold text-white">{PROFILE.achievements}</p>
            <p className="text-xs text-pink-200">Achievements</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <Heart className="w-5 h-5 mx-auto text-red-300 mb-1" />
            <p className="text-xl font-bold text-white">{PROFILE.favoriteCategory}</p>
            <p className="text-xs text-pink-200">Favorite</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'overview', label: 'Overview', icon: User },
          { id: 'games', label: 'My Games', icon: Gamepad2 },
          { id: 'achievements', label: 'Achievements', icon: Trophy },
          { id: 'badges', label: 'Badges', icon: Award },
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-4">
            <h3 className="font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {RECENT_ACTIVITY.map(activity => (
                <div key={activity.id} className="flex items-center gap-3 p-2 bg-gray-800 rounded-lg">
                  <span className="text-2xl">{activity.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.detail}</p>
                    {activity.game && <p className="text-xs text-gray-400">{activity.game}</p>}
                  </div>
                  <span className="text-xs text-gray-500">{activity.timestamp}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Achievement Progress */}
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-4">
            <h3 className="font-semibold mb-4">Achievement Progress</h3>
            <div className="text-center mb-4">
              <div className="w-32 h-32 mx-auto relative">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="#374151"
                    strokeWidth="12"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${achievementProgress * 3.52} 352`}
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#9333ea" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-2xl font-bold">{PROFILE.achievements}</span>
                  <span className="text-xs text-gray-400">of {PROFILE.totalAchievements}</span>
                </div>
              </div>
            </div>
            <p className="text-center text-sm text-gray-400">
              {achievementProgress.toFixed(0)}% complete • {PROFILE.totalAchievements - PROFILE.achievements} remaining
            </p>
          </div>
        </div>
      )}

      {/* Games Tab */}
      {activeTab === 'games' && (
        <div className="space-y-4">
          {GAME_STATS.map(game => (
            <div key={game.game} className="bg-gray-900 rounded-xl border border-gray-700 p-4 flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center text-3xl">
                {game.thumbnail}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{game.game}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" /> {game.playTime}h played
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4" /> High: {game.highScore.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Trophy className="w-4 h-4" /> {game.achievements}/{game.totalAchievements}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Last played</p>
                <p className="text-sm">{game.lastPlayed}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          ))}
        </div>
      )}

      {/* Badges Tab */}
      {activeTab === 'badges' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {BADGES.map(badge => (
            <div
              key={badge.id}
              className={`p-4 rounded-xl text-center ${
                badge.earned
                  ? 'bg-purple-500/20 border border-purple-500/30'
                  : 'bg-gray-900 border border-gray-700 opacity-50'
              }`}
            >
              <span className="text-4xl block mb-2">{badge.icon}</span>
              <h4 className="font-medium text-sm">{badge.name}</h4>
              <p className="text-xs text-gray-400 mt-1">{badge.description}</p>
              {badge.earned && (
                <span className="text-xs text-green-400 mt-2 block">✓ Earned</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
