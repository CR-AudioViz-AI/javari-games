/**
 * CR AudioViz AI Brand System
 * 
 * Export all brand components and configurations.
 * Usage: import { BrandedHeader, ThemeProvider } from '@/components/brand';
 */

// Configuration
export { default as brandConfig, BRAND_COLORS, THEME_CONFIG, TYPOGRAPHY, SPACING, LOGO_SPECS, CREDITS_CONFIG, APP_LOGO_STATUS } from './brand-config';

// Theme
export { ThemeProvider, useTheme } from './ThemeProvider';
export { ThemeToggle } from './ThemeToggle';

// Components
export { BrandedHeader } from './BrandedHeader';
export { BrandedFooter } from './BrandedFooter';
export { CreditsBar } from './CreditsBar';
export { AuthButtons } from './AuthButtons';

// No tailwind.brand.config here: the brand tokens live in brand-config.ts and
// tailwind.config.ts consumes them directly. The old re-export pointed at a
// file that was never written.
