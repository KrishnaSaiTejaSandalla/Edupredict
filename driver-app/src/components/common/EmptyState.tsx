import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionButton?: React.ReactNode;
  style?: ViewStyle;
}

export function EmptyState({
  title,
  description,
  icon,
  actionButton,
  style,
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text
        style={[
          styles.title,
          {
            fontFamily: theme.fonts.semiBold,
            fontSize: theme.fontSizes.lg,
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
      {actionButton && <View style={styles.actionContainer}>{actionButton}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    textAlign: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    textAlign: 'center',
    marginBottom: 24,
  },
  actionContainer: {
    width: '100%',
    maxWidth: 200,
  },
});
