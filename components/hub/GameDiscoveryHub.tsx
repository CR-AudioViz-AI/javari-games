'use client'

import { useState } from 'react'
import {
  Gamepad2, Search, Filter, Star, Clock, Users, TrendingUp,
  Play, Heart, Share2, Grid, List, Zap, Trophy, Crown,
  Sparkles, ChevronRight, ExternalLink, Volume2, VolumeX
} from 'lucide-react'

interface Game {
  id: string
  title: string
  thumbnail: string
  category: string
  tags: string[]
  rating: number
  plays: number
  featured: boolean
  new: boolean
  multiplayer: boolean
  description: string
}

interface Category {
  id: string
  name: string
  icon: string
  count: number
  color: string
}

const CATEGORIES: Category[] = [
  { id: 'action', name: 'Action', icon: '⚔️', count: 0, color: 'from-red-500 to-orange-500' },
  { id: 'puzzle', name: 'Puzzle', icon: '🧩', count: 0, color: 'from-blue-500 to-cyan-500' },
  { id: 'arcade', name: 'Arcade', icon: '👾', count: 0, color: 'from-purple-500 to-pink-500' },
  { id: 'sports', name: 'Sports', icon: '⚽', count: 0, color: 'from-green-500 to-emerald-500' },
  { id: 'racing', name: 'Racing', icon: '🏎️', count: 0, color: 'from-yellow-500 to-amber-500' },
  { id: 'strategy', name: 'Strategy', icon: '♟️', count: 0, color: 'from-indigo-500 to-violet-500' },
  { id: 'adventure', name: 'Adventure', icon: '🗺️', count: 0, color: 'from-teal-500 to-cyan-500' },
  { id: 'casual', name: 'Casual', icon: '🎮', count: 0, color: 'from-pink-500 to-rose-500' },
]

const SAMPLE_GAMES: Game[] = [
  { id: '1', title: 'Neon Runner', thumbnail: '🏃', category: 'action', tags: ['endless', 'runner'], rating: 4.8, plays: 125000, featured: true, new: false, multiplayer: false, description: 'Fast-paced endless runner with neon aesthetics' },
  { id: '2', title: 'Block Puzzle Master', thumbnail: '🧱', category: 'puzzle', tags: ['tetris', 'blocks'], rating: 4.6, plays: 89000, featured: true, new: false, multiplayer: false, description: 'Classic block-matching puzzle game' },
  { id: '3', title: 'Space Blaster', thumbnail: '🚀', category: 'arcade', tags: ['shooter', 'space'], rating: 4.5, plays: 67000, featured: false, new: true, multiplayer: true, description: 'Retro-style space shooter with multiplayer' },
  { id: '4', title: 'Soccer Champions', thumbnail: '⚽', category: 'sports', tags: ['football', 'soccer'], rating: 4.4, plays: 54000, featured: false, new: false, multiplayer: true, description: 'Realistic soccer simulation' },
  { id: '5', title: 'Turbo Drift', thumbnail: '🏎️', category: 'racing', tags: ['cars', 'drift'], rating: 4.7, plays: 78000, featured: true, new: false, multiplayer: true, description: 'High-speed drifting action' },
  { id: '6', title: 'Kingdom Builder', thumbnail: '🏰', category: 'strategy', tags: ['building', 'medieval'], rating: 4.3, plays: 45000, featured: false, new: true, multiplayer: false, description: 'Build and manage your medieval kingdom' },
  { id: '7', title: 'Treasure Quest', thumbnail: '💎', category: 'adventure', tags: ['exploration', 'treasure'], rating: 4.5, plays: 56000, featured: false, new: false, multiplayer: false, description: 'Explore dungeons and find treasure' },
  { id: '8', title: 'Bubble Pop', thumbnail: '🫧', category: 'casual', tags: ['bubbles', 'match3'], rating: 4.2, plays: 98000, featured: false, new: false, multiplayer: false, description: 'Relaxing bubble popping fun' },
]

export default function GameDiscoveryHub() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'new'>('popular')

  const filteredGames = SAMPLE_GAMES
    .filter(g => selectedCategory === 'all' || g.category === selectedCategory)
    .filter(g => !searchQuery || g.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'popular') return b.plays - a.plays
      if (sortBy === 'rating') return b.rating - a.rating
      if (sortBy === 'new') return (b.new ? 1 : 0) - (a.new ? 1 : 0)
      return 0
    })

  const featuredGames = SAMPLE_GAMES.filter(g => g.featured)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
            <Gamepad2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">CRAV Games Hub</h1>
            <p className="text-pink-200">Discover and play an extensive collection of games</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-white/40"
          />
        </div>

        {/* Quick Stats */}
        <div className="flex gap-6 mt-6 text-white/80 text-sm">
          <span className="flex items-center gap-2">
            <Gamepad2 className="w-4 h-4" /> Extensive Game Library
          </span>
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4" /> Active Community
          </span>
          <span className="flex items-center gap-2">
            <Trophy className="w-4 h-4" /> Achievements & Leaderboards
          </span>
        </div>
      </div>

      {/* Featured Games Carousel */}
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" /> Featured Games
          </h2>
          <button className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {featuredGames.map(game => (
            <div key={game.id} className="relative group cursor-pointer">
              <div className="aspect-video bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center text-6xl">
                {game.thumbnail}
              </div>
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium flex items-center gap-2">
                  <Play className="w-5 h-5" /> Play Now
                </button>
              </div>
              <div className="mt-2">
                <h3 className="font-medium">{game.title}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  {game.rating}
                  <span>•</span>
                  {(game.plays / 1000).toFixed(0)}K plays
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`p-3 rounded-xl text-center transition-all ${
            selectedCategory === 'all'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 hover:bg-gray-700'
          }`}
        >
          <span className="text-2xl block mb-1">🎮</span>
          <span className="text-xs">All</span>
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`p-3 rounded-xl text-center transition-all ${
              selectedCategory === cat.id
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            <span className="text-2xl block mb-1">{cat.icon}</span>
            <span className="text-xs">{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Filters & View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {[
            { id: 'popular', label: 'Popular' },
            { id: 'rating', label: 'Top Rated' },
            { id: 'new', label: 'New' },
          ].map(sort => (
            <button
              key={sort.id}
              onClick={() => setSortBy(sort.id as any)}
              className={`px-4 py-2 rounded-lg text-sm ${
                sortBy === sort.id ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'
              }`}
            >
              {sort.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-purple-600' : ''}`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-purple-600' : ''}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Games Grid */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-4 gap-4' : 'space-y-3'}>
        {filteredGames.map(game => (
          viewMode === 'grid' ? (
            <div key={game.id} className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden group cursor-pointer hover:border-purple-500/50 transition-all">
              <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-5xl relative">
                {game.thumbnail}
                {game.new && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-green-500 text-xs rounded font-medium">NEW</span>
                )}
                {game.multiplayer && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 bg-blue-500 text-xs rounded font-medium flex items-center gap-1">
                    <Users className="w-3 h-3" /> MP
                  </span>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium flex items-center gap-2">
                    <Play className="w-4 h-4" /> Play
                  </button>
                </div>
              </div>
              <div className="p-3">
                <h3 className="font-medium truncate">{game.title}</h3>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-1 text-sm text-gray-400">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    {game.rating}
                  </div>
                  <span className="text-xs text-gray-500">{(game.plays / 1000).toFixed(0)}K plays</span>
                </div>
              </div>
            </div>
          ) : (
            <div key={game.id} className="bg-gray-900 rounded-xl border border-gray-700 p-4 flex items-center gap-4 hover:border-purple-500/50 transition-all cursor-pointer">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center text-3xl flex-shrink-0">
                {game.thumbnail}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{game.title}</h3>
                  {game.new && <span className="px-2 py-0.5 bg-green-500 text-xs rounded">NEW</span>}
                  {game.multiplayer && <span className="px-2 py-0.5 bg-blue-500 text-xs rounded">MP</span>}
                </div>
                <p className="text-sm text-gray-400 truncate">{game.description}</p>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> {game.rating}
                  </span>
                  <span>{(game.plays / 1000).toFixed(0)}K plays</span>
                  <span className="capitalize">{game.category}</span>
                </div>
              </div>
              <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium flex items-center gap-2">
                <Play className="w-4 h-4" /> Play
              </button>
            </div>
          )
        ))}
      </div>

      {/* Load More */}
      <div className="text-center">
        <button className="px-8 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl">
          Load More Games
        </button>
      </div>
    </div>
  )
}
