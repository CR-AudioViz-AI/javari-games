'use client'

import { useState } from 'react'
import {
  Globe, Users, MapPin, Building, Sparkles, MessageSquare,
  Calendar, Trophy, Star, ChevronRight, Plus, Search,
  Heart, Share2, Play, Zap, Crown, Lock, Video
} from 'lucide-react'

interface VirtualSpace {
  id: string
  name: string
  icon: string
  type: 'community' | 'business' | 'entertainment' | 'education' | 'social'
  description: string
  members: number
  activeNow: number
  featured: boolean
  premium: boolean
  location?: string
}

interface CommunityEvent {
  id: string
  title: string
  space: string
  startTime: string
  attendees: number
  type: 'meetup' | 'workshop' | 'party' | 'competition' | 'presentation'
  live: boolean
}

interface UserProfile {
  id: string
  name: string
  avatar: string
  level: number
  status: 'online' | 'away' | 'busy' | 'offline'
  currentSpace?: string
}

const VIRTUAL_SPACES: VirtualSpace[] = [
  { id: '1', name: 'Central Plaza', icon: '🏛️', type: 'community', description: 'The main gathering hub of CRAIverse', members: 15420, activeNow: 342, featured: true, premium: false },
  { id: '2', name: 'Creator Studio', icon: '🎨', type: 'business', description: 'Showcase your creative work', members: 8900, activeNow: 156, featured: true, premium: false },
  { id: '3', name: 'Gaming Arena', icon: '🎮', type: 'entertainment', description: 'Competitive gaming tournaments', members: 12300, activeNow: 567, featured: true, premium: false },
  { id: '4', name: 'Learning Center', icon: '📚', type: 'education', description: 'Workshops and skill development', members: 6780, activeNow: 89, featured: false, premium: false },
  { id: '5', name: 'Social Lounge', icon: '☕', type: 'social', description: 'Casual hangouts and conversations', members: 9450, activeNow: 234, featured: false, premium: false },
  { id: '6', name: 'VIP Penthouse', icon: '🌟', type: 'social', description: 'Exclusive space for premium members', members: 1200, activeNow: 45, featured: true, premium: true },
  { id: '7', name: 'Business District', icon: '🏢', type: 'business', description: 'Professional networking space', members: 4560, activeNow: 78, featured: false, premium: false },
  { id: '8', name: 'Music Hall', icon: '🎵', type: 'entertainment', description: 'Live performances and DJ sets', members: 7890, activeNow: 189, featured: false, premium: false },
]

const UPCOMING_EVENTS: CommunityEvent[] = [
  { id: '1', title: 'Weekly Creator Showcase', space: 'Creator Studio', startTime: 'Today 7:00 PM', attendees: 156, type: 'presentation', live: true },
  { id: '2', title: 'Game Night Tournament', space: 'Gaming Arena', startTime: 'Today 9:00 PM', attendees: 342, type: 'competition', live: false },
  { id: '3', title: 'AI Tools Workshop', space: 'Learning Center', startTime: 'Tomorrow 2:00 PM', attendees: 89, type: 'workshop', live: false },
  { id: '4', title: 'Community Town Hall', space: 'Central Plaza', startTime: 'Saturday 3:00 PM', attendees: 567, type: 'meetup', live: false },
]

const ONLINE_FRIENDS: UserProfile[] = [
  { id: '1', name: 'NeonPlayer42', avatar: '🎮', level: 24, status: 'online', currentSpace: 'Gaming Arena' },
  { id: '2', name: 'ArtistPro', avatar: '🎨', level: 18, status: 'online', currentSpace: 'Creator Studio' },
  { id: '3', name: 'TechWizard', avatar: '🧙', level: 32, status: 'away', currentSpace: 'Learning Center' },
  { id: '4', name: 'MusicLover', avatar: '🎵', level: 15, status: 'online', currentSpace: 'Music Hall' },
  { id: '5', name: 'CryptoKing', avatar: '👑', level: 28, status: 'busy' },
]

export default function VirtualWorldHub() {
  const [activeTab, setActiveTab] = useState<'explore' | 'events' | 'friends' | 'myspaces'>('explore')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')

  const filteredSpaces = VIRTUAL_SPACES
    .filter(s => selectedType === 'all' || s.type === selectedType)
    .filter(s => !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'community': return 'bg-blue-500/20 text-blue-400'
      case 'business': return 'bg-green-500/20 text-green-400'
      case 'entertainment': return 'bg-purple-500/20 text-purple-400'
      case 'education': return 'bg-yellow-500/20 text-yellow-400'
      case 'social': return 'bg-pink-500/20 text-pink-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'away': return 'bg-yellow-500'
      case 'busy': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <Globe className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">CRAIverse</h1>
              <p className="text-purple-200">Your virtual world awaits</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-white text-purple-600 rounded-lg font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Space
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-white">{VIRTUAL_SPACES.reduce((s, v) => s + v.activeNow, 0).toLocaleString()}</p>
            <p className="text-xs text-purple-200">Online Now</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-white">{VIRTUAL_SPACES.length}</p>
            <p className="text-xs text-purple-200">Active Spaces</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-white">{UPCOMING_EVENTS.length}</p>
            <p className="text-xs text-purple-200">Upcoming Events</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-white">{ONLINE_FRIENDS.filter(f => f.status === 'online').length}</p>
            <p className="text-xs text-purple-200">Friends Online</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'explore', label: 'Explore', icon: Globe },
          { id: 'events', label: 'Events', icon: Calendar },
          { id: 'friends', label: 'Friends', icon: Users },
          { id: 'myspaces', label: 'My Spaces', icon: Building },
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

      {/* Explore Tab */}
      {activeTab === 'explore' && (
        <>
          {/* Search & Filter */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search spaces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'community', 'business', 'entertainment', 'education', 'social'].map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-2 rounded-lg text-sm capitalize ${
                    selectedType === type ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Featured Spaces */}
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" /> Featured Spaces
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filteredSpaces.filter(s => s.featured).map(space => (
                <div key={space.id} className="relative group cursor-pointer">
                  <div className={`aspect-video bg-gradient-to-br ${
                    space.type === 'community' ? 'from-blue-500/30 to-cyan-500/30' :
                    space.type === 'business' ? 'from-green-500/30 to-emerald-500/30' :
                    space.type === 'entertainment' ? 'from-purple-500/30 to-pink-500/30' :
                    'from-gray-500/30 to-gray-600/30'
                  } rounded-xl flex items-center justify-center text-6xl`}>
                    {space.icon}
                    {space.premium && (
                      <div className="absolute top-2 right-2 px-2 py-1 bg-yellow-500/20 rounded text-yellow-400 text-xs flex items-center gap-1">
                        <Crown className="w-3 h-3" /> VIP
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                    <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium flex items-center gap-2">
                      <Play className="w-5 h-5" /> Enter
                    </button>
                  </div>
                  <div className="mt-2">
                    <h4 className="font-medium">{space.name}</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {space.activeNow} online
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* All Spaces */}
          <div className="space-y-3">
            {filteredSpaces.map(space => (
              <div key={space.id} className="bg-gray-900 rounded-xl border border-gray-700 p-4 flex items-center gap-4 hover:border-purple-500/50 transition-all cursor-pointer">
                <div className="w-16 h-16 bg-gray-800 rounded-xl flex items-center justify-center text-3xl">
                  {space.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{space.name}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs capitalize ${getTypeColor(space.type)}`}>
                      {space.type}
                    </span>
                    {space.premium && (
                      <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs flex items-center gap-1">
                        <Crown className="w-3 h-3" /> VIP
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">{space.description}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                    <span>{space.members.toLocaleString()} members</span>
                    <span className="text-green-400">{space.activeNow} online</span>
                  </div>
                </div>
                <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium">
                  Enter
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          {UPCOMING_EVENTS.map(event => (
            <div key={event.id} className="bg-gray-900 rounded-xl border border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {event.live && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs flex items-center gap-1 animate-pulse">
                      <Video className="w-3 h-3" /> LIVE
                    </span>
                  )}
                  <div>
                    <h3 className="font-semibold">{event.title}</h3>
                    <p className="text-sm text-gray-400">{event.space} • {event.startTime}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-400">{event.attendees} attending</span>
                  <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg">
                    {event.live ? 'Join Now' : 'RSVP'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Friends Tab */}
      {activeTab === 'friends' && (
        <div className="space-y-3">
          {ONLINE_FRIENDS.map(friend => (
            <div key={friend.id} className="bg-gray-900 rounded-xl border border-gray-700 p-4 flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center text-2xl">
                  {friend.avatar}
                </div>
                <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-900 ${getStatusColor(friend.status)}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{friend.name}</h3>
                  <span className="text-xs text-gray-500">Lvl {friend.level}</span>
                </div>
                {friend.currentSpace && (
                  <p className="text-sm text-gray-400">In: {friend.currentSpace}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg">
                  <MessageSquare className="w-4 h-4" />
                </button>
                {friend.currentSpace && (
                  <button className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm">
                    Join
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
