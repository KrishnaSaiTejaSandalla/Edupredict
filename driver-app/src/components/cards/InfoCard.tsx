import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface InfoCardProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export function InfoCard({ label, value, icon, style }: InfoCardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.cardBackground,
          borderColor: theme.colors.cardBorder,
          borderRadius: theme.radius.md,
          ...theme.elevation.xs,
        },
        style,
      ]}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <View style={styles.contentContainer}>
        <Text
          style={[
            styles.label,
            {
              fontFamily: theme.fonts.medium,
              fontSize: theme.fontSizes.xs,
              color: theme.colors.textSecondary,
            },
          ]}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.value,
            {
              fontFamily: theme.fonts.bold,
              fontSize: theme.fontSizes.base,
              color: theme.colors.textPrimary,
            },
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
  },
  iconContainer: {
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  label: {
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  value: {},
});
