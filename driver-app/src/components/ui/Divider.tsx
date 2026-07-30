import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface DividerProps {
  style?: ViewStyle;
  vertical?: boolean;
  color?: string;
}

export function Divider({ style, vertical = false, color }: DividerProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        vertical ? styles.vertical : styles.horizontal,
        { backgroundColor: color || theme.colors.border },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  horizontal: {
    height: 1,
    width: '100%',
  },
  vertical: {
    width: 1,
    height: '100%',
  },
});
