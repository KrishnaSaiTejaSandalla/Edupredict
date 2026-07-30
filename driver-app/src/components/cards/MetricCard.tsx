import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface MetricCardProps {
  title: string;
  metric: string;
  subtitle?: string;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export function MetricCard({
  title,
  metric,
  subtitle,
  icon,
  style,
}: MetricCardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.cardBackground,
          borderColor: theme.colors.cardBorder,
          borderRadius: theme.radius.lg,
          ...theme.elevation.sm,
        },
        style,
      ]}
    >
      <View style={styles.header}>
        <Text
          style={[
            styles.title,
            {
              fontFamily: theme.fonts.medium,
              fontSize: theme.fontSizes.sm,
              color: theme.colors.textSecondary,
            },
          ]}
        >
          {title}
        </Text>
        {icon && <View>{icon}</View>}
      </View>
      <Text
        style={[
          styles.metric,
          {
            fontFamily: theme.fonts.bold,
            fontSize: theme.fontSizes['3xl'],
            color: theme.colors.textPrimary,
          },
        ]}
      >
        {metric}
      </Text>
      {subtitle && (
        <Text
          style={[
            styles.subtitle,
            {
              fontFamily: theme.fonts.regular,
              fontSize: theme.fontSizes.xs,
              color: theme.colors.textTertiary,
            },
          ]}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: 1,
    minWidth: 140,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {},
  metric: {
    marginVertical: 4,
  },
  subtitle: {
    marginTop: 4,
  },
});
