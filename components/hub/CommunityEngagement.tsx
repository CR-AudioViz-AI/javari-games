'use client'

import { useState } from 'react'
import {
  Users, MessageSquare, Heart, Share2, Award, Trophy,
  Calendar, Star, TrendingUp, Gift, Zap, Crown, Bell,
  ThumbsUp, MessageCircle, Bookmark, Flag, MoreVertical
} from 'lucide-react'

interface Post {
  id: string
  author: {
    name: string
    avatar: string
    level: number
    badge?: string
  }
  content: string
  image?: string
  likes: number
  comments: number
  shares: number
  timestamp: string
  liked: boolean
  bookmarked: boolean
}

interface Challenge {
  id: string
  title: string
  description: string
  icon: string
  reward: number
  participants: number
  deadline: string
  progress: number
  total: number
}

interface LeaderboardEntry {
  rank: number
  user: string
  avatar: string
  score: number
  change: 'up' | 'down' | 'same'
}

const COMMUNITY_POSTS: Post[] = [
  {
    id: '1',
    author: { name: 'CreativeArtist', avatar: '🎨', level: 28, badge: '⭐' },
    content: 'Just finished my latest digital artwork using CRAV tools! The AI assistance made the whole process so smooth. What do you all think? 🎨✨',
    likes: 234,
    comments: 45,
    shares: 12,
    timestamp: '2 hours ago',
    liked: false,
    bookmarked: false
  },
  {
    id: '2',
    author: { name: 'GameMaster', avatar: '🎮', level: 42, badge: '👑' },
    content: 'New high score on Neon Runner! Finally broke the 2M barrier after weeks of practice. Who wants to challenge me? 🏆',
    likes: 567,
    comments: 89,
    shares: 34,
    timestamp: '4 hours ago',
    liked: true,
    bookmarked: true
  },
  {
    id: '3',
    author: { name: 'TechExplorer', avatar: '🚀', level: 19 },
    content: 'The new virtual spaces update is incredible! Spent the whole evening exploring the Gaming Arena. The attention to detail is amazing.',
    likes: 156,
    comments: 28,
    shares: 8,
    timestamp: '6 hours ago',
    liked: false,
    bookmarked: false
  },
]

const WEEKLY_CHALLENGES: Challenge[] = [
  { id: '1', title: 'Social Butterfly', description: 'Make 10 new friends this week', icon: '🦋', reward: 500, participants: 1234, deadline: '3 days left', progress: 7, total: 10 },
  { id: '2', title: 'Content Creator', description: 'Share 5 posts with the community', icon: '📝', reward: 300, participants: 2456, deadline: '5 days left', progress: 3, total: 5 },
  { id: '3', title: 'Game Champion', description: 'Win 3 multiplayer matches', icon: '🏆', reward: 750, participants: 890, deadline: '4 days left', progress: 1, total: 3 },
  { id: '4', title: 'Explorer', description: 'Visit all featured spaces', icon: '🗺️', reward: 400, participants: 3456, deadline: '6 days left', progress: 4, total: 6 },
]

const LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, user: 'MegaStar', avatar: '🌟', score: 125000, change: 'same' },
  { rank: 2, user: 'ProGamer', avatar: '🎮', score: 118500, change: 'up' },
  { rank: 3, user: 'ArtWizard', avatar: '🧙', score: 112300, change: 'down' },
  { rank: 4, user: 'SpeedKing', avatar: '⚡', score: 98700, change: 'up' },
  { rank: 5, user: 'NightOwl', avatar: '🦉', score: 95200, change: 'same' },
]

export default function CommunityEngagement() {
  const [activeTab, setActiveTab] = useState<'feed' | 'challenges' | 'leaderboard' | 'rewards'>('feed')
  const [posts, setPosts] = useState(COMMUNITY_POSTS)

  const toggleLike = (postId: string) => {
    setPosts(posts.map(p => 
      p.id === postId 
        ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
        : p
    ))
  }

  const toggleBookmark = (postId: string) => {
    setPosts(posts.map(p => 
      p.id === postId 
        ? { ...p, bookmarked: !p.bookmarked }
        : p
    ))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-600 via-rose-600 to-red-600 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
            <Users className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Community Hub</h1>
            <p className="text-pink-200">Connect, compete, and celebrate together</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-white">12.5K</p>
            <p className="text-xs text-pink-200">Members</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-white">2.3K</p>
            <p className="text-xs text-pink-200">Online Now</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-white">856</p>
            <p className="text-xs text-pink-200">Posts Today</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-white">4</p>
            <p className="text-xs text-pink-200">Active Challenges</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'feed', label: 'Community Feed', icon: MessageSquare },
          { id: 'challenges', label: 'Challenges', icon: Trophy },
          { id: 'leaderboard', label: 'Leaderboard', icon: TrendingUp },
          { id: 'rewards', label: 'Rewards', icon: Gift },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              activeTab === tab.id ? 'bg-pink-600 text-white' : 'bg-gray-800 text-gray-400'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Feed Tab */}
      {activeTab === 'feed' && (
        <div className="space-y-4">
          {/* Create Post */}
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-xl">
                🎮
              </div>
              <input
                type="text"
                placeholder="Share something with the community..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2"
              />
              <button className="px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded-lg font-medium">
                Post
              </button>
            </div>
          </div>

          {/* Posts */}
          {posts.map(post => (
            <div key={post.id} className="bg-gray-900 rounded-xl border border-gray-700 p-4">
              {/* Author */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-xl">
                    {post.author.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{post.author.name}</span>
                      {post.author.badge && <span>{post.author.badge}</span>}
                      <span className="text-xs text-gray-500">Lvl {post.author.level}</span>
                    </div>
                    <span className="text-xs text-gray-400">{post.timestamp}</span>
                  </div>
                </div>
                <button className="p-2 hover:bg-gray-800 rounded-lg">
                  <MoreVertical className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <p className="text-gray-300 mb-4">{post.content}</p>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                <div className="flex gap-4">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className={`flex items-center gap-2 ${post.liked ? 'text-pink-400' : 'text-gray-400'} hover:text-pink-400`}
                  >
                    <Heart className={`w-5 h-5 ${post.liked ? 'fill-current' : ''}`} />
                    {post.likes}
                  </button>
                  <button className="flex items-center gap-2 text-gray-400 hover:text-blue-400">
                    <MessageCircle className="w-5 h-5" />
                    {post.comments}
                  </button>
                  <button className="flex items-center gap-2 text-gray-400 hover:text-green-400">
                    <Share2 className="w-5 h-5" />
                    {post.shares}
                  </button>
                </div>
                <button
                  onClick={() => toggleBookmark(post.id)}
                  className={`${post.bookmarked ? 'text-yellow-400' : 'text-gray-400'} hover:text-yellow-400`}
                >
                  <Bookmark className={`w-5 h-5 ${post.bookmarked ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Challenges Tab */}
      {activeTab === 'challenges' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {WEEKLY_CHALLENGES.map(challenge => (
            <div key={challenge.id} className="bg-gray-900 rounded-xl border border-gray-700 p-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-gray-800 rounded-xl flex items-center justify-center text-3xl">
                  {challenge.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{challenge.title}</h3>
                  <p className="text-sm text-gray-400 mb-2">{challenge.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> {challenge.participants.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {challenge.deadline}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-sm flex items-center gap-1">
                    <Zap className="w-3 h-3" /> {challenge.reward}
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Progress</span>
                  <span>{challenge.progress}/{challenge.total}</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full"
                    style={{ width: `${(challenge.progress / challenge.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h3 className="font-semibold">Weekly Leaderboard</h3>
          </div>
          <div className="divide-y divide-gray-800">
            {LEADERBOARD.map(entry => (
              <div key={entry.rank} className="p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                  entry.rank === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                  entry.rank === 2 ? 'bg-gray-400/20 text-gray-300' :
                  entry.rank === 3 ? 'bg-amber-600/20 text-amber-500' :
                  'bg-gray-800 text-gray-400'
                }`}>
                  #{entry.rank}
                </div>
                <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-xl">
                  {entry.avatar}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{entry.user}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{entry.score.toLocaleString()}</p>
                  <p className={`text-xs ${
                    entry.change === 'up' ? 'text-green-400' :
                    entry.change === 'down' ? 'text-red-400' :
                    'text-gray-400'
                  }`}>
                    {entry.change === 'up' ? '↑' : entry.change === 'down' ? '↓' : '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rewards Tab */}
      {activeTab === 'rewards' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: 'Daily Login', icon: '📅', credits: 50, claimed: true },
            { name: 'First Post', icon: '✍️', credits: 100, claimed: true },
            { name: 'Social Starter', icon: '👋', credits: 200, claimed: false },
            { name: 'Challenge Winner', icon: '🏆', credits: 500, claimed: false },
            { name: 'Level Up', icon: '⬆️', credits: 150, claimed: true },
            { name: 'Invite Friend', icon: '📨', credits: 300, claimed: false },
          ].map((reward, i) => (
            <div key={i} className={`p-4 rounded-xl border ${
              reward.claimed 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-gray-900 border-gray-700'
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{reward.icon}</span>
                <div className="flex-1">
                  <h4 className="font-medium">{reward.name}</h4>
                  <p className="text-sm text-yellow-400 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> {reward.credits} credits
                  </p>
                </div>
                {reward.claimed ? (
                  <span className="text-green-400 text-sm">✓ Claimed</span>
                ) : (
                  <button className="px-3 py-1 bg-pink-600 hover:bg-pink-700 rounded text-sm">
                    Claim
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
