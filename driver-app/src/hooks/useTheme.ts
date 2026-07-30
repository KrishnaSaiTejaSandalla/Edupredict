import { useContext } from 'react';
import { ThemeContext } from '@/lib/theme-context';
import { AppTheme, DARK_THEME } from '@/constants/theme';

export function useTheme(): AppTheme {
  const ctx = useContext(ThemeContext);
  return ctx ? ctx.theme : DARK_THEME;
}
