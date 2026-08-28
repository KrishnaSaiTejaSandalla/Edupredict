// ============================================================
// EduPredict Driver App — Combined Theme Object
// Single export used everywhere via useTheme()
// ============================================================

import { DARK_COLORS, LIGHT_COLORS, ColorScheme } from './colors';
import { FONT_FAMILY, FONT_SIZE, TEXT_STYLES } from './typography';
import { SPACING, RADIUS, ELEVATION, ICON_SIZE, TOUCH_TARGET } from './spacing';
import { DURATION, SPRING, SKELETON } from './animations';

export interface AppTheme {
  colors: ColorScheme;
  fonts: typeof FONT_FAMILY;
  fontSizes: typeof FONT_SIZE;
  textStyles: typeof TEXT_STYLES;
  spacing: typeof SPACING;
  radius: typeof RADIUS;
  elevation: typeof ELEVATION;
  iconSize: typeof ICON_SIZE;
  touchTarget: number;
  duration: typeof DURATION;
  spring: typeof SPRING;
  skeleton: typeof SKELETON;
  isDark: boolean;
}

const shared = {
  fonts:       FONT_FAMILY,
  fontSizes:   FONT_SIZE,
  textStyles:  TEXT_STYLES,
  spacing:     SPACING,
  radius:      RADIUS,
  elevation:   ELEVATION,
  iconSize:    ICON_SIZE,
  touchTarget: TOUCH_TARGET,
  duration:    DURATION,
  spring:      SPRING,
  skeleton:    SKELETON,
};

export const DARK_THEME: AppTheme = {
  ...shared,
  colors: DARK_COLORS,
  isDark: true,
};

export const LIGHT_THEME: AppTheme = {
  ...shared,
  colors: LIGHT_COLORS,
  isDark: false,
};
