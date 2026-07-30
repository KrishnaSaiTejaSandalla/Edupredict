import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export type StatusCardType = 'success' | 'warning' | 'danger' | 'info';

interface StatusCardProps {
  title: string;
  description: string;
  type?: StatusCardType;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export function StatusCard({
  title,
  description,
  type = 'info',
  icon,
  style,
}: StatusCardProps) {
  const theme = useTheme();

  const getStatusColor = () => {
    switch (type) {
      case 'success':
        return theme.colors.success;
      case 'warning':
        return theme.colors.warning;
      case 'danger':
        return theme.colors.danger;
      case 'info':
      default:
        return theme.colors.primary;
    }
  };

  const statusColor = getStatusColor();

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
      <View style={[styles.accentBar, { backgroundColor: statusColor }]} />
      <View style={styles.container}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <View style={styles.content}>
          <Text
            style={[
              styles.title,
              {
                fontFamily: theme.fonts.semiBold,
                fontSize: theme.fontSizes.base,
                color: theme.colors.textPrimary,
              },
            ]}
          >
            {title}
          </Text>
          <Text
            style={[
              styles.description,
              {
                fontFamily: theme.fonts.regular,
                fontSize: theme.fontSizes.sm,
                color: theme.colors.textSecondary,
              },
            ]}
          >
            {description}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderWidth: 1,
    overflow: 'hidden',
  },
  accentBar: {
    width: 4,
    height: '100%',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    flex: 1,
  },
  iconContainer: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    marginBottom: 4,
  },
  description: {},
});
