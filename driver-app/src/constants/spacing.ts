// ============================================================
// EduPredict Driver App — Spacing, Radius & Elevation System
// Based on 4pt grid
// ============================================================

// 4pt grid spacing scale
export const SPACING = {
  0:    0,
  px:   1,
  0.5:  2,
  1:    4,
  1.5:  6,
  2:    8,
  2.5:  10,
  3:    12,
  3.5:  14,
  4:    16,
  5:    20,
  6:    24,
  7:    28,
  8:    32,
  9:    36,
  10:   40,
  12:   48,
  14:   56,
  16:   64,
  20:   80,
  24:   96,
  32:   128,
} as const;

// Touch target minimum (48dp per accessibility guidelines)
export const TOUCH_TARGET = 48;

// Border radius scale
export const RADIUS = {
  none:   0,
  xs:     4,
  sm:     8,
  md:     12,
  lg:     16,
  xl:     20,
  '2xl':  24,
  '3xl':  28,
  full:   9999,
} as const;

// Elevation / Shadow definitions
// Uses boxShadow for web compatibility, native shadow* props for iOS, elevation for Android
export const ELEVATION = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    boxShadow: 'none',
  },
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
    boxShadow: '0px 1px 2px rgba(0,0,0,0.08)',
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 2,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.10)',
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    boxShadow: '0px 4px 8px rgba(0,0,0,0.12)',
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
    boxShadow: '0px 8px 16px rgba(0,0,0,0.16)',
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.20,
    shadowRadius: 24,
    elevation: 16,
    boxShadow: '0px 16px 24px rgba(0,0,0,0.20)',
  },
} as const;

// Icon sizes
export const ICON_SIZE = {
  xs:  14,
  sm:  16,
  md:  20,
  lg:  24,
  xl:  28,
  '2xl': 32,
  '3xl': 40,
} as const;
