import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface DashboardCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glass?: boolean;
}

export function DashboardCard({ children, style, glass = false }: DashboardCardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: glass ? theme.colors.glass : theme.colors.cardBackground,
          borderColor: theme.colors.cardBorder,
          shadowColor: theme.colors.cardShadow,
          borderRadius: theme.radius.lg,
        },
        theme.elevation.sm,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
});
