/**
 * Design tokens for the app: color palette (light/dark), type scale, spacing,
 * radii, and shadows. There are many other ways to style an app — e.g.
 * [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/),
 * [unistyles](https://reactnativeunistyles.vercel.app) — this project keeps a
 * plain token file plus StyleSheet.create per screen.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#12131A',
    textSecondary: '#6B6E7A',
    textMuted: '#9497A3',
    background: '#F6F6FB',
    surface: '#FFFFFF',
    surfaceAlt: '#F0F0F7',
    surfaceSelected: '#EEEEFC',
    border: '#E7E7F1',
    primary: '#6154E8',
    primaryPressed: '#4F42D6',
    onPrimary: '#FFFFFF',
    primaryMuted: '#ECEAFD',
    success: '#12A66E',
    onSuccess: '#FFFFFF',
    successMuted: '#E4F7EE',
    danger: '#E5484D',
    onDanger: '#FFFFFF',
    dangerMuted: '#FDE9EA',
    warning: '#B5750B',
    warningMuted: '#FCF1DA',
    // kept for backwards-compat with any lingering references
    backgroundElement: '#F0F0F7',
    backgroundSelected: '#EEEEFC',
  },
  dark: {
    text: '#F3F3F9',
    textSecondary: '#A6A8B5',
    textMuted: '#82848F',
    background: '#0D0D12',
    surface: '#18181F',
    surfaceAlt: '#1F1F29',
    surfaceSelected: '#26263A',
    border: '#2A2A36',
    primary: '#9C93FF',
    primaryPressed: '#8478FF',
    onPrimary: '#14121F',
    primaryMuted: '#211E3D',
    success: '#3DD68C',
    onSuccess: '#08150F',
    successMuted: '#123324',
    danger: '#FF6B70',
    onDanger: '#210608',
    dangerMuted: '#3A171A',
    warning: '#F0B429',
    warningMuted: '#2E2410',
    backgroundElement: '#1F1F29',
    backgroundSelected: '#26263A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const Shadow = {
  sm: {
    shadowColor: '#12131A',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: '#12131A',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

// Rotating palette for per-person avatar colors, distinct from the brand primary.
export const AvatarPalette = [
  '#6154E8',
  '#EA5B6F',
  '#12A66E',
  '#E08A1E',
  '#3B9FE0',
  '#C24FD1',
  '#4EA88A',
  '#D6636F',
] as const;

export function avatarColorFor(index: number) {
  return AvatarPalette[index % AvatarPalette.length];
}

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
