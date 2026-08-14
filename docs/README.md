# CRAudioVizAI Games Pack

A comprehensive collection of 25+ micro-games with premium features, monetization, and extreme challenges. Built with Next.js 14 and designed for both standalone use and integration into larger platforms.

## 🎮 Features

- **25 Micro-Games**: Quick, engaging games across multiple categories
- **1 Extreme Game**: Season-based "Ascension" with advanced mechanics
- **Monetization**: Stripe & PayPal integration with multiple pricing tiers
- **Feature Flags**: Granular control over game availability
- **Leaderboards**: Local and global scoring systems
- **Responsive Design**: Mobile-first with full desktop support
- **Accessibility**: WCAG AA compliant with keyboard navigation

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x or higher
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/craudioviz/javari-games-pack.git
cd javari-games-pack
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── games/             # Games hub page
│   ├── [game]/            # Individual game pages
│   ├── extreme/           # Extreme game section
│   ├── dashboard/         # Admin dashboard
│   └── api/               # API routes
├── components/            # Reusable React components
│   └── games/            # Game-specific components
├── lib/                   # Utility libraries
│   ├── games.ts          # Game definitions
│   ├── entitlements.ts   # User permissions
│   ├── feature-flags.ts  # Feature flag system
│   ├── pricing.ts        # Product definitions
│   └── metrics.ts        # Analytics tracking
├── content/              # Static content files
└── docs/                 # Documentation
```

## 🎯 Game Categories

### Free Games (Always Available)
- **Puzzle**: Emoji Charades, Emoji Bingo, Daily Riddle
- **Brain Training**: Fast Math, Memory Flip
- **Word Games**: Word Snap, Scramble Caption
- **Reflex**: Reaction Test, Tap Race
- **Social**: One Click Tag, Post a Pic, Caption This
- **Classic**: Rock Paper Scissors, Would You Rather

### Premium Games (Pro/Elite Required)
- **Advanced Puzzle**: Pixel Zoom, Micro Crossword
- **Audio**: Sound Bite Guess
- **Knowledge**: Trivia Blitz
- **Arcade**: Sticker Toss
- **Extreme Reflex**: Reaction Streaks

### Extreme Game (Elite Only)
- **Ascension**: Season-based extreme challenge with 7 zones

## 💰 Monetization

### Pricing Tiers

- **Free**: All basic games, local leaderboards
- **Pro ($9.99)**: Premium modes, global leaderboards, streak multipliers
- **Elite ($19.99)**: All Pro features + Extreme games + Season Pass

### Payment Integration

- **Stripe**: Credit card processing with webhooks
- **PayPal**: Alternative payment method
- **Sandbox Mode**: Test payments without real transactions

## 🔧 Configuration

### Environment Variables

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_MODE=sandbox

# Site Configuration
SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Feature Flags

Control game availability through the feature flag system:

```typescript
// lib/feature-flags.ts
export const FEATURE_FLAGS = {
  EMOJI_CHARADES: { enabled: true, rollout: 100 },
  FAST_MATH: { enabled: true, rollout: 100 },
  // ... more flags
};
```

## 🎮 Adding New Games

1. **Define the game** in `lib/games.ts`:
```typescript
{
  id: 'new-game',
  slug: 'new-game',
  name: 'New Game',
  flag: 'NEW_GAME',
  category: 'puzzle',
  difficulty: 'medium',
  isPremium: false
}
```

2. **Add feature flag** in `lib/feature-flags.ts`:
```typescript
NEW_GAME: { key: 'NEW_GAME', enabled: true, rollout: 100 }
```

3. **Create game page** at `app/new-game/page.jsx`:
```jsx
export default function NewGame() {
  // Game implementation
}
```

## 📊 Analytics & Metrics

The system tracks various events:

- `play_started`: Game session begins
- `play_completed`: Game session ends with score
- `upsell_view`: Premium feature promotion shown
- `upsell_convert`: User upgrades plan
- `checkout_started/succeeded/failed`: Payment events

Access metrics through the dashboard at `/dashboard/games`.

## 🔐 Security & Compliance

- **Data Protection**: No personal data stored without consent
- **Payment Security**: PCI DSS compliant through Stripe/PayPal
- **CORS**: Properly configured for cross-origin requests
- **Input Validation**: All user inputs sanitized and validated

## 🚀 Deployment

### Netlify (Recommended)

1. Connect your GitHub repository to Netlify
2. Set environment variables in Netlify dashboard
3. Deploy automatically on push to main branch

### Manual Build

```bash
npm run build
npm run start
```

### Docker

```bash
docker build -t javari-games-pack .
docker run -p 3000:3000 javari-games-pack
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --testNamePattern="Game"

# Run with coverage
npm test -- --coverage
```

## 📈 Performance

- **Lighthouse Scores**: Performance ≥90, Accessibility ≥95, SEO ≥90
- **Bundle Size**: Optimized with Next.js automatic code splitting
- **Image Optimization**: Automatic WebP conversion and lazy loading
- **Caching**: Static assets cached with proper headers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-game`
3. Make your changes and test thoroughly
4. Submit a pull request with detailed description

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `/docs` folder for detailed guides
- **Issues**: Report bugs via GitHub Issues
- **Contact**: support@craudiovizai.com

## 🔄 Updates

- **Version**: 1.0.0
- **Last Updated**: January 2025
- **Next Release**: Q2 2025 (Mobile app, more games)

---

Built with ❤️ by CRAudioVizAI