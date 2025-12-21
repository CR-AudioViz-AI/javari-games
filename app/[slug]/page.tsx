'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

// =============================================================================
// CR AUDIOVIZ AI - UNIVERSAL GAME ENGINE
// Handles all 100 games through dynamic routing
// =============================================================================

// All 100 games configuration
const ALL_GAMES: Record<string, GameConfig> = {
  // ACTION/ARCADE (10 games)
  'space-shooter': {
    name: 'Space Shooter',
    category: 'action',
    icon: '🚀',
    difficulty: 1,
    type: 'shooter',
    description: 'Destroy enemy ships and survive waves of attacks!',
    controls: { up: 'W/↑', down: 'S/↓', left: 'A/←', right: 'D/→', shoot: 'SPACE' },
    color: 'from-red-600 to-orange-500'
  },
  'brick-breaker': {
    name: 'Brick Breaker',
    category: 'action',
    icon: '🧱',
    difficulty: 2,
    type: 'breakout',
    description: 'Break all the bricks with your bouncing ball!',
    controls: { left: 'A/←', right: 'D/→', launch: 'SPACE' },
    color: 'from-red-600 to-orange-500'
  },
  'asteroid-dodge': {
    name: 'Asteroid Dodge',
    category: 'action',
    icon: '☄️',
    difficulty: 3,
    type: 'dodge',
    description: 'Navigate through asteroid fields and survive!',
    controls: { move: 'MOUSE/TOUCH' },
    color: 'from-red-600 to-orange-500'
  },
  'ninja-jump': {
    name: 'Ninja Jump',
    category: 'action',
    icon: '🥷',
    difficulty: 4,
    type: 'platformer',
    description: 'Jump between platforms and collect coins!',
    controls: { jump: 'SPACE/TAP', move: 'A/D or ←/→' },
    color: 'from-red-600 to-orange-500'
  },
  'speed-racer': {
    name: 'Speed Racer',
    category: 'action',
    icon: '🏎️',
    difficulty: 5,
    type: 'endless',
    description: 'Race through traffic at high speed!',
    controls: { left: 'A/←', right: 'D/→' },
    color: 'from-red-600 to-orange-500'
  },
  'zombie-wave': {
    name: 'Zombie Wave',
    category: 'action',
    icon: '🧟',
    difficulty: 6,
    type: 'survival',
    description: 'Survive endless waves of zombies!',
    controls: { move: 'WASD', shoot: 'MOUSE CLICK' },
    color: 'from-red-600 to-orange-500'
  },
  'boss-rush': {
    name: 'Boss Rush',
    category: 'action',
    icon: '👹',
    difficulty: 7,
    type: 'boss',
    description: 'Battle through increasingly difficult bosses!',
    controls: { move: 'WASD', attack: 'SPACE', dodge: 'SHIFT' },
    color: 'from-red-600 to-orange-500'
  },
  'bullet-hell': {
    name: 'Bullet Hell',
    category: 'action',
    icon: '💥',
    difficulty: 8,
    type: 'danmaku',
    description: 'Dodge intricate bullet patterns!',
    controls: { move: 'WASD/ARROWS', focus: 'SHIFT', shoot: 'Z' },
    color: 'from-red-600 to-orange-500'
  },
  'combo-master': {
    name: 'Combo Master',
    category: 'action',
    icon: '⚡',
    difficulty: 9,
    type: 'combo',
    description: 'Chain attacks for maximum damage!',
    controls: { attack: 'J/K/L', special: 'SPACE' },
    color: 'from-red-600 to-orange-500'
  },
  'ultimate-arcade': {
    name: 'Ultimate Arcade',
    category: 'action',
    icon: '🏆',
    difficulty: 10,
    type: 'ultimate',
    description: 'The ultimate arcade challenge combining all skills!',
    controls: { move: 'WASD', action: 'SPACE/MOUSE' },
    color: 'from-red-600 to-orange-500'
  },

  // STRATEGY/TACTICAL (10 games)
  'tower-defense-basic': {
    name: 'Tower Defense',
    category: 'strategy',
    icon: '🏰',
    difficulty: 1,
    type: 'tower-defense',
    description: 'Build towers to stop the enemy waves!',
    controls: { place: 'CLICK', upgrade: 'RIGHT CLICK' },
    color: 'from-blue-600 to-indigo-500'
  },
  'chess-lite': {
    name: 'Chess Lite',
    category: 'strategy',
    icon: '♔',
    difficulty: 2,
    type: 'chess',
    description: 'Classic chess with helpful hints!',
    controls: { select: 'CLICK', move: 'DRAG' },
    color: 'from-blue-600 to-indigo-500'
  },
  'resource-manager': {
    name: 'Resource Manager',
    category: 'strategy',
    icon: '📊',
    difficulty: 3,
    type: 'management',
    description: 'Manage resources to build your empire!',
    controls: { interact: 'CLICK' },
    color: 'from-blue-600 to-indigo-500'
  },
  'battle-tactics': {
    name: 'Battle Tactics',
    category: 'strategy',
    icon: '⚔️',
    difficulty: 4,
    type: 'tactical',
    description: 'Command your troops in tactical battles!',
    controls: { select: 'CLICK', command: 'RIGHT CLICK' },
    color: 'from-blue-600 to-indigo-500'
  },
  'kingdom-builder': {
    name: 'Kingdom Builder',
    category: 'strategy',
    icon: '👑',
    difficulty: 5,
    type: 'builder',
    description: 'Build and expand your medieval kingdom!',
    controls: { build: 'CLICK', menu: 'ESC' },
    color: 'from-blue-600 to-indigo-500'
  },
  'war-commander': {
    name: 'War Commander',
    category: 'strategy',
    icon: '🎖️',
    difficulty: 6,
    type: 'rts',
    description: 'Command armies in real-time battles!',
    controls: { select: 'CLICK/DRAG', order: 'RIGHT CLICK' },
    color: 'from-blue-600 to-indigo-500'
  },
  'hex-conquest': {
    name: 'Hex Conquest',
    category: 'strategy',
    icon: '⬡',
    difficulty: 7,
    type: 'hex',
    description: 'Conquer the hexagonal world!',
    controls: { select: 'CLICK', expand: 'ADJACENT HEX' },
    color: 'from-blue-600 to-indigo-500'
  },
  'empire-master': {
    name: 'Empire Master',
    category: 'strategy',
    icon: '🌍',
    difficulty: 8,
    type: 'empire',
    description: 'Build a global empire!',
    controls: { interact: 'CLICK', diplomacy: 'D' },
    color: 'from-blue-600 to-indigo-500'
  },
  'grand-strategy': {
    name: 'Grand Strategy',
    category: 'strategy',
    icon: '📜',
    difficulty: 9,
    type: 'grand',
    description: 'Rule nations across centuries!',
    controls: { pause: 'SPACE', speed: '1-5' },
    color: 'from-blue-600 to-indigo-500'
  },
  'ultimate-tactics': {
    name: 'Ultimate Tactics',
    category: 'strategy',
    icon: '🧠',
    difficulty: 10,
    type: 'ultimate',
    description: 'The ultimate strategic challenge!',
    controls: { think: 'YOUR BRAIN' },
    color: 'from-blue-600 to-indigo-500'
  },

  // PUZZLE/BRAIN (10 games)
  'match-3': {
    name: 'Match 3',
    category: 'puzzle',
    icon: '💎',
    difficulty: 1,
    type: 'match',
    description: 'Match 3 or more gems to score!',
    controls: { swap: 'CLICK & DRAG' },
    color: 'from-purple-600 to-pink-500'
  },
  'sliding-puzzle': {
    name: 'Sliding Puzzle',
    category: 'puzzle',
    icon: '🔢',
    difficulty: 2,
    type: 'sliding',
    description: 'Slide tiles to complete the image!',
    controls: { slide: 'CLICK TILE' },
    color: 'from-purple-600 to-pink-500'
  },
  'word-search': {
    name: 'Word Search',
    category: 'puzzle',
    icon: '🔤',
    difficulty: 3,
    type: 'word',
    description: 'Find hidden words in the grid!',
    controls: { select: 'CLICK & DRAG' },
    color: 'from-purple-600 to-pink-500'
  },
  'sudoku': {
    name: 'Sudoku',
    category: 'puzzle',
    icon: '9️⃣',
    difficulty: 4,
    type: 'sudoku',
    description: 'Fill the grid with numbers 1-9!',
    controls: { place: 'CLICK + NUMBER' },
    color: 'from-purple-600 to-pink-500'
  },
  'logic-gates': {
    name: 'Logic Gates',
    category: 'puzzle',
    icon: '🔌',
    difficulty: 5,
    type: 'logic',
    description: 'Connect logic gates to solve circuits!',
    controls: { connect: 'DRAG WIRE' },
    color: 'from-purple-600 to-pink-500'
  },
  'escape-room': {
    name: 'Escape Room',
    category: 'puzzle',
    icon: '🚪',
    difficulty: 6,
    type: 'escape',
    description: 'Solve puzzles to escape the room!',
    controls: { interact: 'CLICK', inventory: 'I' },
    color: 'from-purple-600 to-pink-500'
  },
  'pattern-master': {
    name: 'Pattern Master',
    category: 'puzzle',
    icon: '🎨',
    difficulty: 7,
    type: 'pattern',
    description: 'Identify and complete patterns!',
    controls: { select: 'CLICK ANSWER' },
    color: 'from-purple-600 to-pink-500'
  },
  'code-breaker': {
    name: 'Code Breaker',
    category: 'puzzle',
    icon: '🔐',
    difficulty: 8,
    type: 'code',
    description: 'Crack the secret code!',
    controls: { guess: 'TYPE CODE' },
    color: 'from-purple-600 to-pink-500'
  },
  'mind-bender': {
    name: 'Mind Bender',
    category: 'puzzle',
    icon: '🌀',
    difficulty: 9,
    type: 'abstract',
    description: 'Solve abstract puzzles that defy logic!',
    controls: { interact: 'CLICK/DRAG' },
    color: 'from-purple-600 to-pink-500'
  },
  'genius-puzzle': {
    name: 'Genius Puzzle',
    category: 'puzzle',
    icon: '💡',
    difficulty: 10,
    type: 'genius',
    description: 'Only geniuses can solve these!',
    controls: { think: 'HARD' },
    color: 'from-purple-600 to-pink-500'
  },

  // RACING/SPORTS (10 games)
  'simple-race': {
    name: 'Simple Race',
    category: 'racing',
    icon: '🚗',
    difficulty: 1,
    type: 'race',
    description: 'A simple racing game to start!',
    controls: { steer: '←/→', accelerate: '↑' },
    color: 'from-green-600 to-emerald-500'
  },
  'bike-sprint': {
    name: 'Bike Sprint',
    category: 'racing',
    icon: '🚴',
    difficulty: 2,
    type: 'sprint',
    description: 'Sprint to the finish line!',
    controls: { pedal: 'SPACE TAP' },
    color: 'from-green-600 to-emerald-500'
  },
  'drag-race': {
    name: 'Drag Race',
    category: 'racing',
    icon: '🏎️',
    difficulty: 3,
    type: 'drag',
    description: 'Perfect timing for maximum speed!',
    controls: { shift: 'SPACE at GREEN' },
    color: 'from-green-600 to-emerald-500'
  },
  'soccer-kick': {
    name: 'Soccer Kick',
    category: 'racing',
    icon: '⚽',
    difficulty: 4,
    type: 'sports',
    description: 'Score goals with precision kicks!',
    controls: { aim: 'MOUSE', kick: 'CLICK' },
    color: 'from-green-600 to-emerald-500'
  },
  'basketball-shoot': {
    name: 'Basketball Shoot',
    category: 'racing',
    icon: '🏀',
    difficulty: 5,
    type: 'sports',
    description: 'Shoot hoops for high scores!',
    controls: { aim: 'MOUSE', shoot: 'CLICK & RELEASE' },
    color: 'from-green-600 to-emerald-500'
  },
  'golf-master': {
    name: 'Golf Master',
    category: 'racing',
    icon: '⛳',
    difficulty: 6,
    type: 'golf',
    description: 'Putt your way to victory!',
    controls: { aim: 'MOUSE', power: 'CLICK & DRAG' },
    color: 'from-green-600 to-emerald-500'
  },
  'circuit-racer': {
    name: 'Circuit Racer',
    category: 'racing',
    icon: '🏆',
    difficulty: 7,
    type: 'circuit',
    description: 'Race on professional circuits!',
    controls: { steer: 'WASD', brake: 'SPACE' },
    color: 'from-green-600 to-emerald-500'
  },
  'extreme-sports': {
    name: 'Extreme Sports',
    category: 'racing',
    icon: '🎿',
    difficulty: 8,
    type: 'extreme',
    description: 'Perform extreme stunts!',
    controls: { move: 'ARROWS', trick: 'SPACE' },
    color: 'from-green-600 to-emerald-500'
  },
  'championship': {
    name: 'Championship',
    category: 'racing',
    icon: '🥇',
    difficulty: 9,
    type: 'championship',
    description: 'Compete in the championship!',
    controls: { full: 'CONTROLLER' },
    color: 'from-green-600 to-emerald-500'
  },
  'ultimate-racing': {
    name: 'Ultimate Racing',
    category: 'racing',
    icon: '🚀',
    difficulty: 10,
    type: 'ultimate',
    description: 'The ultimate racing experience!',
    controls: { master: 'ALL CONTROLS' },
    color: 'from-green-600 to-emerald-500'
  },

  // RPG/ADVENTURE (10 games)
  'hero-quest': {
    name: 'Hero Quest',
    category: 'rpg',
    icon: '🗡️',
    difficulty: 1,
    type: 'quest',
    description: 'Begin your hero journey!',
    controls: { move: 'WASD', interact: 'E' },
    color: 'from-amber-600 to-yellow-500'
  },
  'dungeon-crawl': {
    name: 'Dungeon Crawl',
    category: 'rpg',
    icon: '🏰',
    difficulty: 2,
    type: 'dungeon',
    description: 'Explore dangerous dungeons!',
    controls: { move: 'WASD', attack: 'SPACE' },
    color: 'from-amber-600 to-yellow-500'
  },
  'treasure-hunter': {
    name: 'Treasure Hunter',
    category: 'rpg',
    icon: '💰',
    difficulty: 3,
    type: 'treasure',
    description: 'Find hidden treasures!',
    controls: { move: 'WASD', dig: 'SPACE' },
    color: 'from-amber-600 to-yellow-500'
  },
  'dragon-slayer': {
    name: 'Dragon Slayer',
    category: 'rpg',
    icon: '🐉',
    difficulty: 4,
    type: 'boss',
    description: 'Defeat the mighty dragons!',
    controls: { move: 'WASD', attack: 'CLICK', dodge: 'SHIFT' },
    color: 'from-amber-600 to-yellow-500'
  },
  'magic-quest': {
    name: 'Magic Quest',
    category: 'rpg',
    icon: '🪄',
    difficulty: 5,
    type: 'magic',
    description: 'Master magical abilities!',
    controls: { move: 'WASD', cast: '1-4 SPELLS' },
    color: 'from-amber-600 to-yellow-500'
  },
  'epic-journey': {
    name: 'Epic Journey',
    category: 'rpg',
    icon: '🗺️',
    difficulty: 6,
    type: 'journey',
    description: 'Embark on an epic adventure!',
    controls: { explore: 'WASD', menu: 'ESC' },
    color: 'from-amber-600 to-yellow-500'
  },
  'realm-defender': {
    name: 'Realm Defender',
    category: 'rpg',
    icon: '🛡️',
    difficulty: 7,
    type: 'defense',
    description: 'Defend your realm from invaders!',
    controls: { command: 'CLICK', ability: 'Q/E' },
    color: 'from-amber-600 to-yellow-500'
  },
  'legend-maker': {
    name: 'Legend Maker',
    category: 'rpg',
    icon: '📖',
    difficulty: 8,
    type: 'story',
    description: 'Create your own legend!',
    controls: { choose: 'CLICK OPTIONS' },
    color: 'from-amber-600 to-yellow-500'
  },
  'mythic-hero': {
    name: 'Mythic Hero',
    category: 'rpg',
    icon: '⭐',
    difficulty: 9,
    type: 'mythic',
    description: 'Become a mythic hero!',
    controls: { full: 'RPG CONTROLS' },
    color: 'from-amber-600 to-yellow-500'
  },
  'ultimate-rpg': {
    name: 'Ultimate RPG',
    category: 'rpg',
    icon: '👑',
    difficulty: 10,
    type: 'ultimate',
    description: 'The ultimate RPG experience!',
    controls: { master: 'ALL RPG MECHANICS' },
    color: 'from-amber-600 to-yellow-500'
  },

  // SIMULATION/TYCOON (10 games)
  'lemonade-stand': {
    name: 'Lemonade Stand',
    category: 'simulation',
    icon: '🍋',
    difficulty: 1,
    type: 'business',
    description: 'Run a lemonade business!',
    controls: { click: 'BUTTONS' },
    color: 'from-cyan-600 to-teal-500'
  },
  'pet-shop': {
    name: 'Pet Shop',
    category: 'simulation',
    icon: '🐕',
    difficulty: 2,
    type: 'shop',
    description: 'Manage a pet shop!',
    controls: { interact: 'CLICK' },
    color: 'from-cyan-600 to-teal-500'
  },
  'farm-builder': {
    name: 'Farm Builder',
    category: 'simulation',
    icon: '🌾',
    difficulty: 3,
    type: 'farm',
    description: 'Build and manage your farm!',
    controls: { plant: 'CLICK', harvest: 'CLICK' },
    color: 'from-cyan-600 to-teal-500'
  },
  'restaurant-rush': {
    name: 'Restaurant Rush',
    category: 'simulation',
    icon: '🍕',
    difficulty: 4,
    type: 'restaurant',
    description: 'Run a busy restaurant!',
    controls: { serve: 'CLICK CUSTOMERS' },
    color: 'from-cyan-600 to-teal-500'
  },
  'city-planner': {
    name: 'City Planner',
    category: 'simulation',
    icon: '🏙️',
    difficulty: 5,
    type: 'city',
    description: 'Plan and build a city!',
    controls: { build: 'SELECT & PLACE' },
    color: 'from-cyan-600 to-teal-500'
  },
  'airport-manager': {
    name: 'Airport Manager',
    category: 'simulation',
    icon: '✈️',
    difficulty: 6,
    type: 'airport',
    description: 'Manage airport operations!',
    controls: { direct: 'CLICK PLANES' },
    color: 'from-cyan-600 to-teal-500'
  },
  'theme-park': {
    name: 'Theme Park',
    category: 'simulation',
    icon: '🎢',
    difficulty: 7,
    type: 'park',
    description: 'Build the ultimate theme park!',
    controls: { build: 'MENU + CLICK' },
    color: 'from-cyan-600 to-teal-500'
  },
  'space-station': {
    name: 'Space Station',
    category: 'simulation',
    icon: '🛸',
    difficulty: 8,
    type: 'space',
    description: 'Manage a space station!',
    controls: { manage: 'FULL INTERFACE' },
    color: 'from-cyan-600 to-teal-500'
  },
  'mega-corp': {
    name: 'Mega Corp',
    category: 'simulation',
    icon: '🏢',
    difficulty: 9,
    type: 'corporation',
    description: 'Build a corporate empire!',
    controls: { business: 'STRATEGY' },
    color: 'from-cyan-600 to-teal-500'
  },
  'universe-sim': {
    name: 'Universe Sim',
    category: 'simulation',
    icon: '🌌',
    difficulty: 10,
    type: 'universe',
    description: 'Simulate an entire universe!',
    controls: { god: 'MODE' },
    color: 'from-cyan-600 to-teal-500'
  },

  // SHOOTER/COMBAT (10 games)
  'target-practice': {
    name: 'Target Practice',
    category: 'shooter',
    icon: '🎯',
    difficulty: 1,
    type: 'target',
    description: 'Practice your aim!',
    controls: { aim: 'MOUSE', shoot: 'CLICK' },
    color: 'from-rose-600 to-red-500'
  },
  'alien-blast': {
    name: 'Alien Blast',
    category: 'shooter',
    icon: '👽',
    difficulty: 2,
    type: 'alien',
    description: 'Blast invading aliens!',
    controls: { move: '←/→', shoot: 'SPACE' },
    color: 'from-rose-600 to-red-500'
  },
  'tank-battle': {
    name: 'Tank Battle',
    category: 'shooter',
    icon: '🛡️',
    difficulty: 3,
    type: 'tank',
    description: 'Control tanks in battle!',
    controls: { move: 'WASD', aim: 'MOUSE', fire: 'CLICK' },
    color: 'from-rose-600 to-red-500'
  },
  'sniper-elite': {
    name: 'Sniper Elite',
    category: 'shooter',
    icon: '🔭',
    difficulty: 4,
    type: 'sniper',
    description: 'Take precise sniper shots!',
    controls: { aim: 'MOUSE', zoom: 'RIGHT CLICK', shoot: 'LEFT CLICK' },
    color: 'from-rose-600 to-red-500'
  },
  'arena-combat': {
    name: 'Arena Combat',
    category: 'shooter',
    icon: '🏟️',
    difficulty: 5,
    type: 'arena',
    description: 'Fight in the arena!',
    controls: { move: 'WASD', attack: 'MOUSE' },
    color: 'from-rose-600 to-red-500'
  },
  'mech-warrior': {
    name: 'Mech Warrior',
    category: 'shooter',
    icon: '🤖',
    difficulty: 6,
    type: 'mech',
    description: 'Pilot giant mechs!',
    controls: { move: 'WASD', weapons: '1-4' },
    color: 'from-rose-600 to-red-500'
  },
  'battle-royale': {
    name: 'Battle Royale',
    category: 'shooter',
    icon: '👊',
    difficulty: 7,
    type: 'royale',
    description: 'Last one standing wins!',
    controls: { full: 'FPS CONTROLS' },
    color: 'from-rose-600 to-red-500'
  },
  'war-zone': {
    name: 'War Zone',
    category: 'shooter',
    icon: '💣',
    difficulty: 8,
    type: 'warzone',
    description: 'Survive the war zone!',
    controls: { tactical: 'FULL' },
    color: 'from-rose-600 to-red-500'
  },
  'elite-ops': {
    name: 'Elite Ops',
    category: 'shooter',
    icon: '🎖️',
    difficulty: 9,
    type: 'tactical',
    description: 'Elite tactical operations!',
    controls: { pro: 'CONTROLS' },
    color: 'from-rose-600 to-red-500'
  },
  'ultimate-shooter': {
    name: 'Ultimate Shooter',
    category: 'shooter',
    icon: '⚡',
    difficulty: 10,
    type: 'ultimate',
    description: 'The ultimate shooter!',
    controls: { master: 'ALL' },
    color: 'from-rose-600 to-red-500'
  },

  // CARD/CASINO (10 games)
  'solitaire': {
    name: 'Solitaire',
    category: 'cards',
    icon: '🂡',
    difficulty: 1,
    type: 'solitaire',
    description: 'Classic solitaire card game!',
    controls: { drag: 'CARDS' },
    color: 'from-violet-600 to-purple-500'
  },
  'memory-match': {
    name: 'Memory Match',
    category: 'cards',
    icon: '🧠',
    difficulty: 2,
    type: 'memory',
    description: 'Match pairs of cards!',
    controls: { flip: 'CLICK' },
    color: 'from-violet-600 to-purple-500'
  },
  'blackjack': {
    name: 'Blackjack',
    category: 'cards',
    icon: '🎰',
    difficulty: 3,
    type: 'blackjack',
    description: 'Try to get 21!',
    controls: { hit: 'H', stand: 'S' },
    color: 'from-violet-600 to-purple-500'
  },
  'poker-basic': {
    name: 'Poker Basic',
    category: 'cards',
    icon: '🃏',
    difficulty: 4,
    type: 'poker',
    description: 'Learn poker basics!',
    controls: { bet: 'BUTTONS' },
    color: 'from-violet-600 to-purple-500'
  },
  'uno-style': {
    name: 'Card Battle',
    category: 'cards',
    icon: '🎴',
    difficulty: 5,
    type: 'uno',
    description: 'Match colors and numbers!',
    controls: { play: 'CLICK CARD' },
    color: 'from-violet-600 to-purple-500'
  },
  'rummy': {
    name: 'Rummy',
    category: 'cards',
    icon: '♠️',
    difficulty: 6,
    type: 'rummy',
    description: 'Classic rummy card game!',
    controls: { draw: 'D', discard: 'CLICK' },
    color: 'from-violet-600 to-purple-500'
  },
  'bridge': {
    name: 'Bridge',
    category: 'cards',
    icon: '♥️',
    difficulty: 7,
    type: 'bridge',
    description: 'Strategic bridge game!',
    controls: { bid: 'CLICK', play: 'CLICK' },
    color: 'from-violet-600 to-purple-500'
  },
  'tcg-battle': {
    name: 'TCG Battle',
    category: 'cards',
    icon: '⚔️',
    difficulty: 8,
    type: 'tcg',
    description: 'Trading card battles!',
    controls: { play: 'DRAG', attack: 'CLICK' },
    color: 'from-violet-600 to-purple-500'
  },
  'poker-pro': {
    name: 'Poker Pro',
    category: 'cards',
    icon: '💰',
    difficulty: 9,
    type: 'poker',
    description: 'Professional poker!',
    controls: { full: 'POKER CONTROLS' },
    color: 'from-violet-600 to-purple-500'
  },
  'card-master': {
    name: 'Card Master',
    category: 'cards',
    icon: '👑',
    difficulty: 10,
    type: 'master',
    description: 'Master all card games!',
    controls: { expert: 'LEVEL' },
    color: 'from-violet-600 to-purple-500'
  },

  // MULTIPLAYER/SOCIAL (10 games)
  'tic-tac-toe': {
    name: 'Tic Tac Toe',
    category: 'multiplayer',
    icon: '⭕',
    difficulty: 1,
    type: 'tictactoe',
    description: 'Classic X and O game!',
    controls: { place: 'CLICK' },
    color: 'from-orange-600 to-amber-500'
  },
  'connect-four': {
    name: 'Connect Four',
    category: 'multiplayer',
    icon: '🔴',
    difficulty: 2,
    type: 'connect4',
    description: 'Connect four to win!',
    controls: { drop: 'CLICK COLUMN' },
    color: 'from-orange-600 to-amber-500'
  },
  'checkers': {
    name: 'Checkers',
    category: 'multiplayer',
    icon: '⬛',
    difficulty: 3,
    type: 'checkers',
    description: 'Classic checkers game!',
    controls: { move: 'CLICK & DRAG' },
    color: 'from-orange-600 to-amber-500'
  },
  'battleship': {
    name: 'Battleship',
    category: 'multiplayer',
    icon: '🚢',
    difficulty: 4,
    type: 'battleship',
    description: 'Sink enemy ships!',
    controls: { fire: 'CLICK GRID' },
    color: 'from-orange-600 to-amber-500'
  },
  'trivia-battle': {
    name: 'Trivia Battle',
    category: 'multiplayer',
    icon: '❓',
    difficulty: 5,
    type: 'trivia',
    description: 'Answer trivia to win!',
    controls: { answer: 'CLICK' },
    color: 'from-orange-600 to-amber-500'
  },
  'word-duel': {
    name: 'Word Duel',
    category: 'multiplayer',
    icon: '📝',
    difficulty: 6,
    type: 'word',
    description: 'Word battle competition!',
    controls: { type: 'KEYBOARD' },
    color: 'from-orange-600 to-amber-500'
  },
  'team-tactics': {
    name: 'Team Tactics',
    category: 'multiplayer',
    icon: '🤝',
    difficulty: 7,
    type: 'team',
    description: 'Team-based tactics!',
    controls: { coordinate: 'TEAM' },
    color: 'from-orange-600 to-amber-500'
  },
  'party-games': {
    name: 'Party Games',
    category: 'multiplayer',
    icon: '🎉',
    difficulty: 8,
    type: 'party',
    description: 'Fun party games!',
    controls: { various: 'MINI-GAMES' },
    color: 'from-orange-600 to-amber-500'
  },
  'tournament': {
    name: 'Tournament',
    category: 'multiplayer',
    icon: '🏆',
    difficulty: 9,
    type: 'tournament',
    description: 'Compete in tournaments!',
    controls: { compete: 'VARIOUS' },
    color: 'from-orange-600 to-amber-500'
  },
  'ultimate-mp': {
    name: 'Ultimate MP',
    category: 'multiplayer',
    icon: '🌟',
    difficulty: 10,
    type: 'ultimate',
    description: 'Ultimate multiplayer!',
    controls: { master: 'SOCIAL' },
    color: 'from-orange-600 to-amber-500'
  },

  // AI/CREATIVE (10 games)
  'ai-guess': {
    name: 'AI Guess',
    category: 'ai',
    icon: '🔮',
    difficulty: 1,
    type: 'guess',
    description: 'Can AI guess what you\'re thinking?',
    controls: { think: 'ANSWER YES/NO' },
    color: 'from-fuchsia-600 to-pink-500'
  },
  'draw-ai': {
    name: 'Draw & AI',
    category: 'ai',
    icon: '🎨',
    difficulty: 2,
    type: 'draw',
    description: 'Draw and let AI guess!',
    controls: { draw: 'MOUSE' },
    color: 'from-fuchsia-600 to-pink-500'
  },
  'story-maker': {
    name: 'Story Maker',
    category: 'ai',
    icon: '📚',
    difficulty: 3,
    type: 'story',
    description: 'Create AI-powered stories!',
    controls: { choose: 'OPTIONS' },
    color: 'from-fuchsia-600 to-pink-500'
  },
  'music-creator': {
    name: 'Music Creator',
    category: 'ai',
    icon: '🎵',
    difficulty: 4,
    type: 'music',
    description: 'Create music with AI!',
    controls: { compose: 'INTERFACE' },
    color: 'from-fuchsia-600 to-pink-500'
  },
  'ai-trivia': {
    name: 'AI Trivia',
    category: 'ai',
    icon: '🧠',
    difficulty: 5,
    type: 'trivia',
    description: 'AI-generated trivia!',
    controls: { answer: 'CLICK' },
    color: 'from-fuchsia-600 to-pink-500'
  },
  'prediction-game': {
    name: 'Prediction Game',
    category: 'ai',
    icon: '📈',
    difficulty: 6,
    type: 'prediction',
    description: 'Predict outcomes!',
    controls: { predict: 'CHOOSE' },
    color: 'from-fuchsia-600 to-pink-500'
  },
  'art-battle': {
    name: 'Art Battle',
    category: 'ai',
    icon: '🖼️',
    difficulty: 7,
    type: 'art',
    description: 'Compete in AI art!',
    controls: { create: 'PROMPTS' },
    color: 'from-fuchsia-600 to-pink-500'
  },
  'ai-adventure': {
    name: 'AI Adventure',
    category: 'ai',
    icon: '🗺️',
    difficulty: 8,
    type: 'adventure',
    description: 'AI-generated adventures!',
    controls: { explore: 'CHOICES' },
    color: 'from-fuchsia-600 to-pink-500'
  },
  'neural-network': {
    name: 'Neural Network',
    category: 'ai',
    icon: '🔬',
    difficulty: 9,
    type: 'neural',
    description: 'Train neural networks!',
    controls: { train: 'INTERFACE' },
    color: 'from-fuchsia-600 to-pink-500'
  },
  'ultimate-ai': {
    name: 'Ultimate AI',
    category: 'ai',
    icon: '🤖',
    difficulty: 10,
    type: 'ultimate',
    description: 'The ultimate AI experience!',
    controls: { master: 'AI' },
    color: 'from-fuchsia-600 to-pink-500'
  },
}

interface GameConfig {
  name: string
  category: string
  icon: string
  difficulty: number
  type: string
  description: string
  controls: Record<string, string>
  color: string
}

// Game Engine Components
function SpaceShooterGame({ onScore }: { onScore: (s: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    let animationId: number
    let playerX = canvas.width / 2
    let bullets: {x: number, y: number}[] = []
    let enemies: {x: number, y: number, speed: number}[] = []
    let localScore = 0
    let gameActive = true
    
    const spawnEnemy = () => {
      enemies.push({
        x: Math.random() * (canvas.width - 30),
        y: -30,
        speed: 1 + Math.random() * 2
      })
    }
    
    let spawnTimer = 0
    
    const gameLoop = () => {
      if (!gameActive) return
      
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Draw stars
      for (let i = 0; i < 50; i++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.5})`
        ctx.fillRect(
          (i * 17) % canvas.width,
          ((i * 23 + Date.now() / 50) % canvas.height),
          1, 1
        )
      }
      
      // Draw player
      ctx.fillStyle = '#22c55e'
      ctx.beginPath()
      ctx.moveTo(playerX, canvas.height - 50)
      ctx.lineTo(playerX - 15, canvas.height - 20)
      ctx.lineTo(playerX + 15, canvas.height - 20)
      ctx.fill()
      
      // Update bullets
      bullets = bullets.filter(b => {
        b.y -= 8
        ctx.fillStyle = '#f59e0b'
        ctx.fillRect(b.x - 2, b.y, 4, 10)
        return b.y > 0
      })
      
      // Spawn enemies
      spawnTimer++
      if (spawnTimer > 60) {
        spawnEnemy()
        spawnTimer = 0
      }
      
      // Update enemies
      enemies = enemies.filter(e => {
        e.y += e.speed
        ctx.fillStyle = '#ef4444'
        ctx.fillRect(e.x, e.y, 30, 30)
        
        // Check bullet collision
        bullets = bullets.filter(b => {
          if (b.x > e.x && b.x < e.x + 30 && b.y > e.y && b.y < e.y + 30) {
            localScore += 10
            setScore(localScore)
            onScore(localScore)
            return false
          }
          return true
        })
        
        // Check player collision
        if (e.y > canvas.height - 60 && Math.abs(e.x + 15 - playerX) < 25) {
          gameActive = false
          setGameOver(true)
        }
        
        return e.y < canvas.height
      })
      
      // Score display
      ctx.fillStyle = '#fff'
      ctx.font = '20px monospace'
      ctx.fillText(`Score: ${localScore}`, 10, 30)
      
      animationId = requestAnimationFrame(gameLoop)
    }
    
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') playerX = Math.max(15, playerX - 15)
      if (e.key === 'ArrowRight' || e.key === 'd') playerX = Math.min(canvas.width - 15, playerX + 15)
      if (e.key === ' ') bullets.push({x: playerX, y: canvas.height - 50})
    }
    
    window.addEventListener('keydown', handleKey)
    gameLoop()
    
    return () => {
      window.removeEventListener('keydown', handleKey)
      cancelAnimationFrame(animationId)
    }
  }, [onScore])
  
  return (
    <div className="relative">
      <canvas 
        ref={canvasRef} 
        width={400} 
        height={500}
        className="rounded-lg border border-gray-700 bg-black"
      />
      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-500 mb-2">GAME OVER</p>
            <p className="text-white mb-4">Score: {score}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-green-600 rounded-lg text-white"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Match3Game({ onScore }: { onScore: (s: number) => void }) {
  const [grid, setGrid] = useState<string[][]>([])
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState<{r: number, c: number} | null>(null)
  const gems = ['💎', '🔴', '🟢', '🔵', '🟡', '🟣']
  
  useEffect(() => {
    const newGrid = Array(8).fill(null).map(() => 
      Array(8).fill(null).map(() => gems[Math.floor(Math.random() * gems.length)])
    )
    setGrid(newGrid)
  }, [])
  
  const handleClick = (r: number, c: number) => {
    if (!selected) {
      setSelected({r, c})
    } else {
      const dr = Math.abs(selected.r - r)
      const dc = Math.abs(selected.c - c)
      if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
        const newGrid = grid.map(row => [...row])
        const temp = newGrid[r][c]
        newGrid[r][c] = newGrid[selected.r][selected.c]
        newGrid[selected.r][selected.c] = temp
        setGrid(newGrid)
        const newScore = score + 10
        setScore(newScore)
        onScore(newScore)
      }
      setSelected(null)
    }
  }
  
  return (
    <div className="p-4 bg-gradient-to-b from-purple-900 to-indigo-900 rounded-lg">
      <p className="text-white text-center mb-2 font-bold">Score: {score}</p>
      <div className="grid grid-cols-8 gap-1">
        {grid.map((row, r) => 
          row.map((gem, c) => (
            <button
              key={`${r}-${c}`}
              onClick={() => handleClick(r, c)}
              className={`w-10 h-10 text-2xl rounded transition-all ${
                selected?.r === r && selected?.c === c 
                  ? 'ring-2 ring-yellow-400 scale-110' 
                  : 'hover:scale-105'
              }`}
            >
              {gem}
            </button>
          ))
        )}
      </div>
    </div>
  )
}

function TicTacToeGame({ onScore }: { onScore: (s: number) => void }) {
  const [board, setBoard] = useState(Array(9).fill(null))
  const [isX, setIsX] = useState(true)
  const [winner, setWinner] = useState<string | null>(null)
  
  const checkWinner = (squares: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ]
    for (const [a, b, c] of lines) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a]
      }
    }
    return null
  }
  
  const handleClick = (i: number) => {
    if (board[i] || winner) return
    const newBoard = [...board]
    newBoard[i] = isX ? 'X' : 'O'
    setBoard(newBoard)
    setIsX(!isX)
    const w = checkWinner(newBoard)
    if (w) {
      setWinner(w)
      if (w === 'X') onScore(100)
    }
  }
  
  return (
    <div className="p-4 bg-gradient-to-b from-orange-900 to-amber-900 rounded-lg">
      <p className="text-white text-center mb-4 font-bold">
        {winner ? `${winner} Wins!` : `${isX ? 'X' : 'O'}'s Turn`}
      </p>
      <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto">
        {board.map((cell, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            className="w-16 h-16 bg-white/20 rounded-lg text-3xl font-bold text-white hover:bg-white/30"
          >
            {cell}
          </button>
        ))}
      </div>
    </div>
  )
}

function MemoryMatchGame({ onScore }: { onScore: (s: number) => void }) {
  const emojis = ['🎮', '🎲', '🎯', '🎪', '🎨', '🎭', '🎪', '🎸']
  const [cards, setCards] = useState<{emoji: string, flipped: boolean, matched: boolean}[]>([])
  const [flipped, setFlipped] = useState<number[]>([])
  const [score, setScore] = useState(0)
  
  useEffect(() => {
    const shuffled = [...emojis, ...emojis]
      .sort(() => Math.random() - 0.5)
      .map(emoji => ({ emoji, flipped: false, matched: false }))
    setCards(shuffled)
  }, [])
  
  const handleFlip = (i: number) => {
    if (cards[i].matched || flipped.includes(i) || flipped.length === 2) return
    
    const newFlipped = [...flipped, i]
    setFlipped(newFlipped)
    
    if (newFlipped.length === 2) {
      const [a, b] = newFlipped
      if (cards[a].emoji === cards[b].emoji) {
        const newCards = [...cards]
        newCards[a].matched = true
        newCards[b].matched = true
        setCards(newCards)
        const newScore = score + 20
        setScore(newScore)
        onScore(newScore)
      }
      setTimeout(() => setFlipped([]), 1000)
    }
  }
  
  return (
    <div className="p-4 bg-gradient-to-b from-violet-900 to-purple-900 rounded-lg">
      <p className="text-white text-center mb-4 font-bold">Matches: {score / 20}</p>
      <div className="grid grid-cols-4 gap-2">
        {cards.map((card, i) => (
          <button
            key={i}
            onClick={() => handleFlip(i)}
            className={`w-14 h-14 rounded-lg text-2xl transition-all ${
              card.matched 
                ? 'bg-green-600' 
                : flipped.includes(i) 
                  ? 'bg-blue-600' 
                  : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {(flipped.includes(i) || card.matched) ? card.emoji : '❓'}
          </button>
        ))}
      </div>
    </div>
  )
}

function GenericGame({ game, onScore }: { game: GameConfig, onScore: (s: number) => void }) {
  const [score, setScore] = useState(0)
  const [clicks, setClicks] = useState(0)
  
  const handleAction = () => {
    const points = Math.floor(Math.random() * 10) + 1
    const newScore = score + points
    setScore(newScore)
    setClicks(c => c + 1)
    onScore(newScore)
  }
  
  return (
    <div className={`p-6 bg-gradient-to-b ${game.color} rounded-lg text-center`}>
      <div className="text-6xl mb-4">{game.icon}</div>
      <h3 className="text-2xl font-bold text-white mb-2">{game.name}</h3>
      <p className="text-white/80 mb-4">{game.description}</p>
      <div className="text-3xl font-bold text-white mb-4">Score: {score}</div>
      <button
        onClick={handleAction}
        className="px-8 py-4 bg-white/20 hover:bg-white/30 rounded-xl text-white font-bold text-xl transition-all hover:scale-105 active:scale-95"
      >
        🎮 Play Action ({clicks})
      </button>
      <p className="text-white/60 text-sm mt-4">
        Full gameplay coming soon! This is a preview.
      </p>
    </div>
  )
}

export default function GamePage() {
  const params = useParams()
  const slug = params.slug as string
  const game = ALL_GAMES[slug]
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  
  useEffect(() => {
    const saved = localStorage.getItem(`highscore-${slug}`)
    if (saved) setHighScore(parseInt(saved))
  }, [slug])
  
  const handleScore = (newScore: number) => {
    setScore(newScore)
    if (newScore > highScore) {
      setHighScore(newScore)
      localStorage.setItem(`highscore-${slug}`, newScore.toString())
    }
  }
  
  if (!game) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-950 to-stone-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl mb-4">🎮</p>
          <h1 className="text-2xl font-bold text-white mb-4">Game Not Found</h1>
          <Link href="/" className="text-amber-500 hover:underline">
            ← Back to Games Hub
          </Link>
        </div>
      </div>
    )
  }
  
  const renderGame = () => {
    switch (slug) {
      case 'space-shooter':
        return <SpaceShooterGame onScore={handleScore} />
      case 'match-3':
        return <Match3Game onScore={handleScore} />
      case 'tic-tac-toe':
        return <TicTacToeGame onScore={handleScore} />
      case 'memory-match':
        return <MemoryMatchGame onScore={handleScore} />
      default:
        return <GenericGame game={game} onScore={handleScore} />
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 to-stone-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="text-amber-500 hover:underline flex items-center gap-2">
            ← Back to Hub
          </Link>
          <div className="text-right">
            <p className="text-stone-400 text-sm">High Score</p>
            <p className="text-2xl font-bold text-amber-500">{highScore}</p>
          </div>
        </div>
        
        {/* Game Info */}
        <div className={`p-6 rounded-2xl bg-gradient-to-r ${game.color} mb-6`}>
          <div className="flex items-center gap-4">
            <span className="text-5xl">{game.icon}</span>
            <div>
              <h1 className="text-3xl font-bold text-white">{game.name}</h1>
              <p className="text-white/80">{game.description}</p>
              <div className="flex gap-2 mt-2">
                <span className="px-2 py-1 bg-white/20 rounded text-sm text-white">
                  Difficulty: {'⭐'.repeat(game.difficulty)}
                </span>
                <span className="px-2 py-1 bg-white/20 rounded text-sm text-white capitalize">
                  {game.category}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Controls */}
        <div className="bg-stone-800 rounded-xl p-4 mb-6">
          <h3 className="text-white font-bold mb-2">🎮 Controls</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(game.controls).map(([key, value]) => (
              <span key={key} className="px-3 py-1 bg-stone-700 rounded text-stone-300 text-sm">
                <span className="text-amber-500">{key}:</span> {value}
              </span>
            ))}
          </div>
        </div>
        
        {/* Game Canvas */}
        <div className="flex justify-center mb-6">
          {renderGame()}
        </div>
        
        {/* Current Score */}
        <div className="text-center">
          <p className="text-stone-400">Current Score</p>
          <p className="text-4xl font-bold text-white">{score}</p>
        </div>
      </div>
    </div>
  )
}
