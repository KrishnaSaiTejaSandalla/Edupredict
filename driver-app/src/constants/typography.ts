// ============================================================
// EduPredict Driver App — Typography System
// Uses premium native system fonts (SF Pro on iOS, Roboto on Android)
// ============================================================

import { Platform } from 'react-native';

export const FONT_FAMILY = {
  heading:     Platform.select({ web: "'Space Grotesk', sans-serif", default: 'sans-serif-bold' }),
  regular:     Platform.select({ web: "'Inter', sans-serif", default: 'sans-serif' }),
  medium:      Platform.select({ web: "'Inter', sans-serif", default: 'sans-serif-medium' }),
  semiBold:    Platform.select({ web: "'Inter', sans-serif", default: 'sans-serif-medium' }),
  bold:        Platform.select({ web: "'Space Grotesk', sans-serif", default: 'sans-serif-bold' }),
  mono:        Platform.select({ web: "'JetBrains Mono', monospace", default: 'monospace' }),
  systemSans:  "'Inter', sans-serif",
} as const;

export const FONT_SIZE = {
  xs:   11,
  sm:   12,
  base: 14,
  md:   15,
  lg:   16,
  xl:   18,
  '2xl': 20,
  '3xl': 24,
  '4xl': 28,
  '5xl': 32,
  '6xl': 36,
  '7xl': 42,
} as const;

export const LINE_HEIGHT = {
  tight:   1.2,
  snug:    1.35,
  normal:  1.5,
  relaxed: 1.65,
} as const;

export const LETTER_SPACING = {
  tighter: -0.5,
  tight:   -0.25,
  normal:  0,
  wide:    0.25,
  wider:   0.5,
  widest:  1.0,
} as const;

// Pre-composed text style presets
export const TEXT_STYLES = {
  displayLarge: {
    fontFamily: FONT_FAMILY.bold,
    fontWeight: '700' as const,
    fontSize:   FONT_SIZE['7xl'],
    lineHeight: FONT_SIZE['7xl'] * LINE_HEIGHT.tight,
    letterSpacing: LETTER_SPACING.tight,
  },
  displayMedium: {
    fontFamily: FONT_FAMILY.bold,
    fontWeight: '700' as const,
    fontSize:   FONT_SIZE['5xl'],
    lineHeight: FONT_SIZE['5xl'] * LINE_HEIGHT.tight,
    letterSpacing: LETTER_SPACING.tight,
  },
  h1: {
    fontFamily: FONT_FAMILY.bold,
    fontWeight: '700' as const,
    fontSize:   FONT_SIZE['4xl'],
    lineHeight: FONT_SIZE['4xl'] * LINE_HEIGHT.snug,
    letterSpacing: LETTER_SPACING.tight,
  },
  h2: {
    fontFamily: FONT_FAMILY.bold,
    fontWeight: '700' as const,
    fontSize:   FONT_SIZE['3xl'],
    lineHeight: FONT_SIZE['3xl'] * LINE_HEIGHT.snug,
    letterSpacing: LETTER_SPACING.tight,
  },
  h3: {
    fontFamily: FONT_FAMILY.semiBold,
    fontWeight: '600' as const,
    fontSize:   FONT_SIZE['2xl'],
    lineHeight: FONT_SIZE['2xl'] * LINE_HEIGHT.snug,
    letterSpacing: LETTER_SPACING.normal,
  },
  h4: {
    fontFamily: FONT_FAMILY.semiBold,
    fontWeight: '600' as const,
    fontSize:   FONT_SIZE.xl,
    lineHeight: FONT_SIZE.xl * LINE_HEIGHT.normal,
    letterSpacing: LETTER_SPACING.normal,
  },
  bodyLarge: {
    fontFamily: FONT_FAMILY.regular,
    fontWeight: '400' as const,
    fontSize:   FONT_SIZE.lg,
    lineHeight: FONT_SIZE.lg * LINE_HEIGHT.relaxed,
    letterSpacing: LETTER_SPACING.normal,
  },
  bodyMedium: {
    fontFamily: FONT_FAMILY.regular,
    fontWeight: '400' as const,
    fontSize:   FONT_SIZE.base,
    lineHeight: FONT_SIZE.base * LINE_HEIGHT.relaxed,
    letterSpacing: LETTER_SPACING.normal,
  },
  bodySmall: {
    fontFamily: FONT_FAMILY.regular,
    fontWeight: '400' as const,
    fontSize:   FONT_SIZE.sm,
    lineHeight: FONT_SIZE.sm * LINE_HEIGHT.relaxed,
    letterSpacing: LETTER_SPACING.normal,
  },
  labelLarge: {
    fontFamily: FONT_FAMILY.semiBold,
    fontWeight: '600' as const,
    fontSize:   FONT_SIZE.base,
    lineHeight: FONT_SIZE.base * LINE_HEIGHT.normal,
    letterSpacing: LETTER_SPACING.wide,
  },
  labelMedium: {
    fontFamily: FONT_FAMILY.medium,
    fontWeight: '500' as const,
    fontSize:   FONT_SIZE.sm,
    lineHeight: FONT_SIZE.sm * LINE_HEIGHT.normal,
    letterSpacing: LETTER_SPACING.wide,
  },
  labelSmall: {
    fontFamily: FONT_FAMILY.medium,
    fontWeight: '500' as const,
    fontSize:   FONT_SIZE.xs,
    lineHeight: FONT_SIZE.xs * LINE_HEIGHT.normal,
    letterSpacing: LETTER_SPACING.wider,
  },
  caption: {
    fontFamily: FONT_FAMILY.regular,
    fontWeight: '400' as const,
    fontSize:   FONT_SIZE.xs,
    lineHeight: FONT_SIZE.xs * LINE_HEIGHT.relaxed,
    letterSpacing: LETTER_SPACING.normal,
  },
  button: {
    fontFamily: FONT_FAMILY.semiBold,
    fontWeight: '600' as const,
    fontSize:   FONT_SIZE.base,
    lineHeight: FONT_SIZE.base * LINE_HEIGHT.normal,
    letterSpacing: LETTER_SPACING.wide,
  },
  buttonSmall: {
    fontFamily: FONT_FAMILY.semiBold,
    fontWeight: '600' as const,
    fontSize:   FONT_SIZE.sm,
    lineHeight: FONT_SIZE.sm * LINE_HEIGHT.normal,
    letterSpacing: LETTER_SPACING.wide,
  },
} as const;
