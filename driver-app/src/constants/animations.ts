// ============================================================
// EduPredict Driver App — Animation Constants
// For use with react-native-reanimated
// ============================================================

// Duration in milliseconds
export const DURATION = {
  instant:    0,
  ultraFast:  80,
  faster:     120,
  fast:       200,
  normal:     300,
  slow:       400,
  slower:     500,
  slowest:    700,
  lazy:       1000,
} as const;

// Spring configs for Reanimated withSpring()
export const SPRING = {
  gentle: {
    damping: 15,
    stiffness: 120,
    mass: 1,
  },
  bouncy: {
    damping: 10,
    stiffness: 180,
    mass: 0.8,
  },
  snappy: {
    damping: 20,
    stiffness: 300,
    mass: 0.9,
  },
  stiff: {
    damping: 25,
    stiffness: 400,
    mass: 1,
  },
} as const;

// Easing values (for withTiming)
// Use Easing from 'react-native-reanimated' and pass these configs
export const EASING_CONFIG = {
  easeIn:    { bezier: [0.4, 0, 1, 1] },
  easeOut:   { bezier: [0, 0, 0.2, 1] },
  easeInOut: { bezier: [0.4, 0, 0.2, 1] },
  standard:  { bezier: [0.2, 0, 0, 1] },
} as const;

// Skeleton shimmer config
export const SKELETON = {
  duration:      1200,
  translateRange: 1.5,  // multiplier of component width
} as const;

// Tab press scale feedback
export const TAB_SCALE = {
  pressed:  0.92,
  released: 1.0,
} as const;
