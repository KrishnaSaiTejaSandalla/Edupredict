// ============================================================
// EduPredict Driver App — Color Palette
// Inspired by: Uber Driver, Rapido Captain, Google Maps
// NEVER hardcode colors elsewhere — always import from here
// ============================================================

const palette = {
  // Brand Blues
  blue50:  '#EFF6FF',
  blue100: '#DBEAFE',
  blue200: '#BFDBFE',
  blue400: '#60A5FA',
  blue500: '#3B82F6',
  blue600: '#2563EB',
  blue700: '#1D4ED8',

  // Electric Accent (Uber-style)
  electric400: '#38BDF8',
  electric500: '#0EA5E9',
  electric600: '#0284C7',

  // Cyan highlight
  cyan400: '#22D3EE',
  cyan500: '#06B6D4',

  // Neutrals — Dark
  dark50:  '#F8FAFC',
  dark100: '#F1F5F9',
  dark200: '#E2E8F0',
  dark300: '#CBD5E1',
  dark400: '#94A3B8',
  dark500: '#64748B',
  dark600: '#475569',
  dark700: '#334155',
  dark800: '#1E293B',
  dark850: '#151D2C',
  dark900: '#0F1117',
  dark950: '#080B12',

  // Success
  green400: '#4ADE80',
  green500: '#22C55E',
  green600: '#16A34A',

  // Warning
  amber400: '#FBBF24',
  amber500: '#F59E0B',
  amber600: '#D97706',

  // Danger
  red400:  '#F87171',
  red500:  '#EF4444',
  red600:  '#DC2626',

  // Pure
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

// ---- Dark Theme Colors ----
export const DARK_COLORS = {
  // Backgrounds
  background:       '#090B14',
  backgroundSecond: '#101323',
  surface:          '#15182C',
  surfaceElevated:  '#202544',
  overlay:          'rgba(9, 11, 20, 0.85)',
  glass:            'rgba(26, 30, 52, 0.72)',

  // Borders
  border:           'rgba(255, 255, 255, 0.08)',
  borderSubtle:     'rgba(255, 255, 255, 0.05)',

  // Text
  textPrimary:      '#FFFFFF',
  textSecondary:    '#C8CCE8',
  textTertiary:     '#8C94C5',
  textDisabled:     '#535A85',
  textInverse:      '#090B14',

  // Brand
  primary:          '#38BDF8',
  primaryLight:     '#7DD3FC',
  primaryDark:      '#0284C7',
  primarySurface:   'rgba(56, 189, 248, 0.15)',
  accent:           '#A78BFA',
  accentSurface:    'rgba(167, 139, 250, 0.15)',

  // Semantic
  success:          '#34D399',
  successSurface:   'rgba(52, 211, 153, 0.15)',
  warning:          '#FBBF24',
  warningSurface:   'rgba(251, 191, 36, 0.15)',
  danger:           '#F87171',
  dangerSurface:    'rgba(248, 113, 113, 0.15)',

  // Tab Bar
  tabActive:        '#38BDF8',
  tabInactive:      '#8C94C5',
  tabBackground:    'rgba(21, 24, 44, 0.88)',
  tabBorder:        'rgba(255, 255, 255, 0.08)',

  // Cards
  cardBackground:   '#15182C',
  cardBorder:       'rgba(255, 255, 255, 0.08)',
  cardShadow:       'rgba(0, 0, 0, 0.45)',

  // Input
  inputBackground:  '#15182C',
  inputBorder:      'rgba(255, 255, 255, 0.08)',
  inputFocusBorder: '#38BDF8',
  inputPlaceholder: '#8C94C5',

  // Skeleton
  skeletonBase:     '#202544',
  skeletonShimmer:  '#15182C',
} as const;

// ---- Light Theme Colors (Aurora Glass Primary) ----
export const LIGHT_COLORS = {
  // Backgrounds
  background:       '#F2F5FC',
  backgroundSecond: '#FFFFFF',
  surface:          '#FFFFFF',
  surfaceElevated:  '#F8FAFC',
  overlay:          'rgba(242, 245, 252, 0.90)',
  glass:            'rgba(255, 255, 255, 0.82)',

  // Borders
  border:           '#E4EBF5',
  borderSubtle:     '#EEF3FB',

  // Text
  textPrimary:      '#12162E',
  textSecondary:    '#3E4260',
  textTertiary:     '#868EAA',
  textDisabled:     '#A4ADC7',
  textInverse:      '#FFFFFF',

  // Brand
  primary:          '#3E6BFF',
  primaryLight:     '#668CFF',
  primaryDark:      '#244ED8',
  primarySurface:   '#E4EBFF',
  accent:           '#8B5CF6',
  accentSurface:    '#F0E8FF',

  // Semantic
  success:          '#0FAF6C',
  successSurface:   '#DEFBEC',
  warning:          '#F2994A',
  warningSurface:   '#FFF1DD',
  danger:           '#FF5A6E',
  dangerSurface:    '#FFE7EA',

  // Tab Bar
  tabActive:        '#3E6BFF',
  tabInactive:      '#868EAA',
  tabBackground:    'rgba(255, 255, 255, 0.92)',
  tabBorder:        '#E4EBF5',

  // Cards
  cardBackground:   '#FFFFFF',
  cardBorder:       '#E4EBF5',
  cardShadow:       'rgba(62, 107, 255, 0.08)',

  // Input
  inputBackground:  '#FFFFFF',
  inputBorder:      '#E4EBF5',
  inputFocusBorder: '#3E6BFF',
  inputPlaceholder: '#868EAA',

  // Skeleton
  skeletonBase:     '#E4EBF5',
  skeletonShimmer:  '#F2F5FC',
} as const;

export type ColorScheme = Record<keyof typeof DARK_COLORS, string>;
export type ColorKey = keyof typeof DARK_COLORS;

