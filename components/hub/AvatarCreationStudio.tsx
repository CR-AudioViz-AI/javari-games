'use client'

import { useState } from 'react'
import {
  User, Palette, Shirt, Glasses, Crown, Sparkles, Save,
  RotateCcw, ChevronLeft, ChevronRight, Download, Share2,
  Camera, Wand2, Shuffle, Heart, Lock, Unlock, Zap
} from 'lucide-react'

interface AvatarPart {
  category: string
  options: AvatarOption[]
}

interface AvatarOption {
  id: string
  name: string
  icon: string
  premium: boolean
  color?: string
}

interface AvatarState {
  face: string
  hair: string
  hairColor: string
  skinTone: string
  eyes: string
  eyeColor: string
  outfit: string
  accessory: string
  background: string
}

const AVATAR_PARTS: AvatarPart[] = [
  {
    category: 'Face Shape',
    options: [
      { id: 'round', name: 'Round', icon: '😊', premium: false },
      { id: 'oval', name: 'Oval', icon: '🙂', premium: false },
      { id: 'square', name: 'Square', icon: '😐', premium: false },
      { id: 'heart', name: 'Heart', icon: '😃', premium: false },
      { id: 'robot', name: 'Robot', icon: '🤖', premium: true },
      { id: 'alien', name: 'Alien', icon: '👽', premium: true },
    ]
  },
  {
    category: 'Hair Style',
    options: [
      { id: 'short', name: 'Short', icon: '💇', premium: false },
      { id: 'long', name: 'Long', icon: '💇‍♀️', premium: false },
      { id: 'curly', name: 'Curly', icon: '🦱', premium: false },
      { id: 'bald', name: 'Bald', icon: '👨‍🦲', premium: false },
      { id: 'mohawk', name: 'Mohawk', icon: '🎸', premium: true },
      { id: 'anime', name: 'Anime', icon: '⚡', premium: true },
    ]
  },
  {
    category: 'Eyes',
    options: [
      { id: 'normal', name: 'Normal', icon: '👁️', premium: false },
      { id: 'happy', name: 'Happy', icon: '😊', premium: false },
      { id: 'wink', name: 'Wink', icon: '😉', premium: false },
      { id: 'cool', name: 'Cool', icon: '😎', premium: false },
      { id: 'cyber', name: 'Cyber', icon: '🔮', premium: true },
      { id: 'galaxy', name: 'Galaxy', icon: '🌌', premium: true },
    ]
  },
  {
    category: 'Outfit',
    options: [
      { id: 'casual', name: 'Casual', icon: '👕', premium: false },
      { id: 'formal', name: 'Formal', icon: '👔', premium: false },
      { id: 'sporty', name: 'Sporty', icon: '🏃', premium: false },
      { id: 'hoodie', name: 'Hoodie', icon: '🧥', premium: false },
      { id: 'superhero', name: 'Superhero', icon: '🦸', premium: true },
      { id: 'astronaut', name: 'Astronaut', icon: '👨‍🚀', premium: true },
    ]
  },
  {
    category: 'Accessory',
    options: [
      { id: 'none', name: 'None', icon: '➖', premium: false },
      { id: 'glasses', name: 'Glasses', icon: '👓', premium: false },
      { id: 'sunglasses', name: 'Sunglasses', icon: '🕶️', premium: false },
      { id: 'hat', name: 'Hat', icon: '🎩', premium: false },
      { id: 'crown', name: 'Crown', icon: '👑', premium: true },
      { id: 'headphones', name: 'Headphones', icon: '🎧', premium: true },
    ]
  },
]

const SKIN_TONES = ['🏻', '🏼', '🏽', '🏾', '🏿']
const HAIR_COLORS = ['#2C1810', '#8B4513', '#DAA520', '#FF6B35', '#1A1A2E', '#FF1493', '#00CED1']
const EYE_COLORS = ['#4A90A4', '#2E5E4E', '#8B4513', '#1A1A2E', '#9B59B6', '#E74C3C']
const BACKGROUNDS = [
  { id: 'blue', color: 'from-blue-500 to-cyan-500', premium: false },
  { id: 'purple', color: 'from-purple-500 to-pink-500', premium: false },
  { id: 'green', color: 'from-green-500 to-emerald-500', premium: false },
  { id: 'sunset', color: 'from-orange-500 to-red-500', premium: false },
  { id: 'galaxy', color: 'from-indigo-900 via-purple-900 to-pink-900', premium: true },
  { id: 'neon', color: 'from-cyan-400 via-purple-500 to-pink-500', premium: true },
]

export default function AvatarCreationStudio() {
  const [activeCategory, setActiveCategory] = useState(0)
  const [avatar, setAvatar] = useState<AvatarState>({
    face: 'round',
    hair: 'short',
    hairColor: '#2C1810',
    skinTone: '🏼',
    eyes: 'normal',
    eyeColor: '#4A90A4',
    outfit: 'casual',
    accessory: 'none',
    background: 'blue'
  })
  const [isPremium, setIsPremium] = useState(false)

  const randomizeAvatar = () => {
    const randomFrom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)]
    setAvatar({
      face: randomFrom(AVATAR_PARTS[0].options.filter(o => !o.premium || isPremium)).id,
      hair: randomFrom(AVATAR_PARTS[1].options.filter(o => !o.premium || isPremium)).id,
      hairColor: randomFrom(HAIR_COLORS),
      skinTone: randomFrom(SKIN_TONES),
      eyes: randomFrom(AVATAR_PARTS[2].options.filter(o => !o.premium || isPremium)).id,
      eyeColor: randomFrom(EYE_COLORS),
      outfit: randomFrom(AVATAR_PARTS[3].options.filter(o => !o.premium || isPremium)).id,
      accessory: randomFrom(AVATAR_PARTS[4].options.filter(o => !o.premium || isPremium)).id,
      background: randomFrom(BACKGROUNDS.filter(b => !b.premium || isPremium)).id,
    })
  }

  const currentPart = AVATAR_PARTS[activeCategory]
  const currentBackground = BACKGROUNDS.find(b => b.id === avatar.background)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
            <User className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Avatar Creation Studio</h1>
            <p className="text-violet-200">Design your unique CRAIverse identity</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Avatar Preview */}
        <div className="space-y-4">
          <div className={`aspect-square rounded-2xl bg-gradient-to-br ${currentBackground?.color || 'from-blue-500 to-cyan-500'} p-8 flex items-center justify-center relative overflow-hidden`}>
            {/* Avatar Display */}
            <div className="w-64 h-64 bg-white/20 rounded-full flex items-center justify-center relative">
              {/* Face */}
              <div className="text-8xl">
                {AVATAR_PARTS[0].options.find(o => o.id === avatar.face)?.icon}
              </div>
              {/* Accessory overlay */}
              {avatar.accessory !== 'none' && (
                <div className="absolute top-4 text-4xl">
                  {AVATAR_PARTS[4].options.find(o => o.id === avatar.accessory)?.icon}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-2">
              <button
                onClick={randomizeAvatar}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2 text-sm"
              >
                <Shuffle className="w-4 h-4" /> Randomize
              </button>
              <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2 text-sm">
                <Camera className="w-4 h-4" /> Screenshot
              </button>
            </div>
          </div>

          {/* Background Selector */}
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-4">
            <h3 className="font-semibold mb-3">Background</h3>
            <div className="flex gap-2">
              {BACKGROUNDS.map(bg => (
                <button
                  key={bg.id}
                  onClick={() => (!bg.premium || isPremium) && setAvatar({ ...avatar, background: bg.id })}
                  className={`w-12 h-12 rounded-lg bg-gradient-to-br ${bg.color} relative ${
                    avatar.background === bg.id ? 'ring-2 ring-white' : ''
                  } ${bg.premium && !isPremium ? 'opacity-50' : ''}`}
                >
                  {bg.premium && !isPremium && (
                    <Lock className="w-4 h-4 absolute top-1 right-1 text-white/70" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Color Pickers */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-900 rounded-xl border border-gray-700 p-4">
              <h3 className="font-semibold mb-3">Hair Color</h3>
              <div className="flex flex-wrap gap-2">
                {HAIR_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setAvatar({ ...avatar, hairColor: color })}
                    className={`w-8 h-8 rounded-full ${avatar.hairColor === color ? 'ring-2 ring-white' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="bg-gray-900 rounded-xl border border-gray-700 p-4">
              <h3 className="font-semibold mb-3">Eye Color</h3>
              <div className="flex flex-wrap gap-2">
                {EYE_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setAvatar({ ...avatar, eyeColor: color })}
                    className={`w-8 h-8 rounded-full ${avatar.eyeColor === color ? 'ring-2 ring-white' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Customization Panel */}
        <div className="space-y-4">
          {/* Category Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-2">
            {AVATAR_PARTS.map((part, index) => (
              <button
                key={part.category}
                onClick={() => setActiveCategory(index)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                  activeCategory === index
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400'
                }`}
              >
                {part.category}
              </button>
            ))}
          </div>

          {/* Options Grid */}
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-4">
            <h3 className="font-semibold mb-4">{currentPart.category}</h3>
            <div className="grid grid-cols-3 gap-3">
              {currentPart.options.map(option => {
                const isSelected = 
                  (activeCategory === 0 && avatar.face === option.id) ||
                  (activeCategory === 1 && avatar.hair === option.id) ||
                  (activeCategory === 2 && avatar.eyes === option.id) ||
                  (activeCategory === 3 && avatar.outfit === option.id) ||
                  (activeCategory === 4 && avatar.accessory === option.id)
                
                const isLocked = option.premium && !isPremium

                return (
                  <button
                    key={option.id}
                    onClick={() => {
                      if (isLocked) return
                      const updates: any = {}
                      if (activeCategory === 0) updates.face = option.id
                      if (activeCategory === 1) updates.hair = option.id
                      if (activeCategory === 2) updates.eyes = option.id
                      if (activeCategory === 3) updates.outfit = option.id
                      if (activeCategory === 4) updates.accessory = option.id
                      setAvatar({ ...avatar, ...updates })
                    }}
                    className={`p-4 rounded-xl text-center relative ${
                      isSelected
                        ? 'bg-purple-600 border-2 border-purple-400'
                        : 'bg-gray-800 border border-gray-700 hover:border-purple-500/50'
                    } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className="text-3xl block mb-2">{option.icon}</span>
                    <span className="text-sm">{option.name}</span>
                    {option.premium && (
                      <span className="absolute top-2 right-2">
                        {isLocked ? <Lock className="w-4 h-4 text-yellow-400" /> : <Crown className="w-4 h-4 text-yellow-400" />}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Skin Tone */}
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-4">
            <h3 className="font-semibold mb-3">Skin Tone</h3>
            <div className="flex gap-3">
              {SKIN_TONES.map(tone => (
                <button
                  key={tone}
                  onClick={() => setAvatar({ ...avatar, skinTone: tone })}
                  className={`w-12 h-12 rounded-lg text-2xl flex items-center justify-center ${
                    avatar.skinTone === tone ? 'ring-2 ring-purple-500 bg-gray-700' : 'bg-gray-800'
                  }`}
                >
                  ✋{tone}
                </button>
              ))}
            </div>
          </div>

          {/* Premium Upsell */}
          {!isPremium && (
            <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Crown className="w-8 h-8 text-yellow-400" />
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-400">Unlock Premium Items</h3>
                  <p className="text-sm text-gray-400">Get exclusive faces, outfits, and backgrounds</p>
                </div>
                <button className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded-lg">
                  Upgrade
                </button>
              </div>
            </div>
          )}

          {/* Save Actions */}
          <div className="flex gap-3">
            <button className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-medium flex items-center justify-center gap-2">
              <Save className="w-5 h-5" /> Save Avatar
            </button>
            <button className="px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl">
              <Share2 className="w-5 h-5" />
            </button>
            <button className="px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl">
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
